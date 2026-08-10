"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Loader2 } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PatientsService } from "@/services/patients.service"
import { useListVas } from "@/hooks/query/usePatients"
import { useNotificationsContext } from "@/providers/NotificationsProvider"
import { SelectOrOther } from "@/components/shared/select-or-other"
import { PAYMENT_METHOD_OPTIONS, INSURANCE_PROVIDER_OPTIONS, VISIT_STATUS_OPTIONS } from "@/lib/patient-options"
import { QUERY_KEYS } from "@/constants"
import type { Patient } from "@/types"
import { toast } from "sonner"

const BOOKING_PLATFORMS = [
  { value: "zocdoc", label: "ZocDoc" },
  { value: "klarity", label: "Klarity" },
  { value: "headway", label: "Headway" },
  { value: "grow_therapy", label: "Grow Therapy" },
  { value: "google", label: "Google" },
  { value: "phone", label: "Phone" },
  { value: "walk_in", label: "Walk-in" },
]

interface AddPatientFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  location: string
  appointmentDatetime: string
  bookingPlatform: string
  assignedTo: string
  paymentMethod: string
  insuranceProvider: string
  visitStatus: string
  problemDescription: string
}

const EMPTY_FORM: AddPatientFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  location: "",
  appointmentDatetime: "",
  bookingPlatform: "phone",
  assignedTo: "",
  paymentMethod: "",
  insuranceProvider: "",
  visitStatus: "not_visited",
  problemDescription: "",
}

export function AddPatientDialog() {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<AddPatientFormData>(EMPTY_FORM)
  const [paymentMethodOther, setPaymentMethodOther] = useState(false)
  const [insuranceProviderOther, setInsuranceProviderOther] = useState(false)

  const { data: vaList } = useListVas()
  const { addNotification } = useNotificationsContext()
  const queryClient = useQueryClient()

  const addPatientMutation = useMutation({
    mutationFn: async (data: AddPatientFormData) => {
      const name = `${data.firstName} ${data.lastName}`.trim()
      return await PatientsService.addPatient({
        name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        location: data.location || undefined,
        appointmentDatetime: data.appointmentDatetime
          ? new Date(data.appointmentDatetime).toISOString()
          : undefined,
        bookingPlatform: data.bookingPlatform as any,
        assignedTo: data.assignedTo || undefined,
        paymentMethod: data.paymentMethod || undefined,
        insuranceProvider: data.insuranceProvider || undefined,
        visitStatus: data.visitStatus as any,
        problemDescription: data.problemDescription || undefined,
      })
    },
    onSuccess: (newPatient) => {
      // Merge the server-created patient straight into every cached patients
      // list synchronously, so the board updates instantly and never renders
      // an empty transitional state while waiting on a background refetch to
      // land (a slow/blipped refetch previously meant the whole board — every
      // stage column — looked empty until a manual page reload).
      const cachedPatientLists = queryClient.getQueriesData<Patient[]>({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      for (const [key, old] of cachedPatientLists) {
        if (!old) continue
        // Per-stage-filtered caches (queryKey = ["patients", stage]) should
        // only gain the new patient if it actually belongs to that stage.
        const stageFilter = key[1] as string | undefined
        if (stageFilter && stageFilter !== newPatient.stage) continue
        queryClient.setQueryData<Patient[]>(key, [newPatient, ...old])
      }
      // Still invalidate so the cache reconciles with the server in the
      // background (e.g. picks up anything computed server-side) — this is
      // now a background-consistency refresh, not the thing the UI depends on.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      addNotification(`New patient "${formData.firstName} ${formData.lastName}" added to onboarding`, "onboarding")
      toast.success("Patient added successfully")
      setOpen(false)
      setFormData(EMPTY_FORM)
      setPaymentMethodOther(false)
      setInsuranceProviderOther(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to add patient")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Appointment date/time is intentionally optional — a patient can be added
    // before a slot is scheduled.
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("First name and last name are required")
      return
    }
    addPatientMutation.mutate(formData)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
  //  <div className="fixed opacity-35 inset-0 z-40  w-full h-full bg-blue-800">
     <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setFormData(EMPTY_FORM)
          setPaymentMethodOther(false)
          setInsuranceProviderOther(false)
        }
      }}
      
    >
      <DialogTrigger asChild>
        <Button className="bg-[#036638] hover:bg-[#025030] text-white gap-2" size="sm">
          <Plus className="w-4 h-4" />
          Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white/95 backdrop-blur-md shadow-2xl border-0 animate-in fade-in zoom-in-95 duration-300 p-4 sm:p-6">
        <DialogHeader className="border-b border-[#E5E7EB] pb-4">
          <DialogTitle className="text-2xl font-bold text-[#1A1B1E]">Add Patient</DialogTitle>
          <DialogDescription className="text-sm text-[#6B7280] mt-1">
            Add a new patient to the pipeline. They'll start in the Onboarding stage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1A1B1E]">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="John"
                className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1A1B1E]">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Doe"
                className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1A1B1E]">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="john@example.com"
                className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1A1B1E]">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(555) 123-4567"
                className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1A1B1E]">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="City, State"
                className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1A1B1E]">
                Appointment Date & Time
                <span className="text-[#9CA3AF] font-normal ml-1">(optional)</span>
              </label>
              <input
                type="datetime-local"
                name="appointmentDatetime"
                value={formData.appointmentDatetime}
                onChange={handleInputChange}
                className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1A1B1E]">Source is</label>
              <select
                name="bookingPlatform"
                value={formData.bookingPlatform}
                onChange={handleInputChange}
                className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30 appearance-none cursor-pointer"
              >
                {BOOKING_PLATFORMS.map((platform) => (
                  <option key={platform.value} value={platform.value}>
                    {platform.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1A1B1E]">Assign VA</label>
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleInputChange}
                className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30 appearance-none cursor-pointer"
              >
                <option value="">Auto-assign (by appointment time)</option>
                {vaList?.map((va) => (
                  <option key={va.id} value={va.id}>
                    {va.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1A1B1E]">Payment Type</label>
              <SelectOrOther
                value={formData.paymentMethod}
                onChange={(v) => setFormData((f) => ({ ...f, paymentMethod: v }))}
                otherMode={paymentMethodOther}
                onOtherModeChange={setPaymentMethodOther}
                options={PAYMENT_METHOD_OPTIONS}
                placeholder="Select payment type..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1A1B1E]">Insurance Company</label>
              <SelectOrOther
                value={formData.insuranceProvider}
                onChange={(v) => setFormData((f) => ({ ...f, insuranceProvider: v }))}
                otherMode={insuranceProviderOther}
                onOtherModeChange={setInsuranceProviderOther}
                options={INSURANCE_PROVIDER_OPTIONS}
                placeholder="Select insurance company..."
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-semibold text-[#1A1B1E]">Visit Status</label>
              <select
                name="visitStatus"
                value={formData.visitStatus}
                onChange={handleInputChange}
                className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30 appearance-none cursor-pointer"
              >
                {VISIT_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-semibold text-[#1A1B1E]">
                Reason for Visit <span className="text-[#9CA3AF] font-normal">(optional, operational notes only)</span>
              </label>
              <Textarea
                name="problemDescription"
                value={formData.problemDescription}
                onChange={(e) => setFormData((f) => ({ ...f, problemDescription: e.target.value }))}
                placeholder="e.g. Follow-up visit, medication review..."
                className="text-sm min-h-[60px]"
              />
            </div> */}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-6 border-t border-[#E5E7EB]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={addPatientMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addPatientMutation.isPending || !formData.firstName.trim() || !formData.lastName.trim()}
              className="bg-[#036638] hover:bg-[#025030] text-white"
            >
              {addPatientMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Adding...
                </>
              ) : (
                "Add Patient"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  //  </div>
  )
}
