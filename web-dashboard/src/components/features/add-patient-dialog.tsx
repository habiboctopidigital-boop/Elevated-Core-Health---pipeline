"use client"

import { useState, type FormEvent, type ChangeEvent } from "react"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const addPatientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[+()\-.\s\d]{7,20}$/.test(v), {
      message: "Enter a valid phone number",
    }),
  location: z.string().trim().max(120, "Location is too long").optional(),
  appointmentDatetime: z.string().optional(),
  bookingPlatform: z.string().optional(),
  assignedTo: z.string().optional(),
  paymentMethod: z.string().optional(),
  insuranceProvider: z.string().optional(),
  visitStatus: z.string().optional(),
  problemDescription: z.string().optional(),
})

type AddPatientFormData = z.infer<typeof addPatientSchema>
type FormErrors = Partial<Record<keyof AddPatientFormData, string>>

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AddPatientDialog() {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<AddPatientFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [paymentMethodOther, setPaymentMethodOther] = useState(false)
  const [insuranceProviderOther, setInsuranceProviderOther] = useState(false)
  const { data: vaList } = useListVas()
  const { addNotification } = useNotificationsContext()
  const queryClient = useQueryClient()

  const resetForm = () => {
    setFormData(EMPTY_FORM)
    setErrors({})
    setPaymentMethodOther(false)
    setInsuranceProviderOther(false)
  }

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
      // an empty/transitional state while waiting on a background refetch.
      const cachedPatientLists = queryClient.getQueriesData<Patient[]>({
        queryKey: QUERY_KEYS.PATIENTS.ALL,
      })
      for (const [key, old] of cachedPatientLists) {
        if (!old) continue
        const stageFilter = key[1] as string | undefined
        if (stageFilter && stageFilter !== newPatient.stage) continue
        queryClient.setQueryData<Patient[]>(key, [newPatient, ...old])
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      addNotification(
        `New patient "${formData.firstName} ${formData.lastName}" added to onboarding`,
        "onboarding",
      )
      toast.success("Patient added successfully")
      setOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to add patient")
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const result = addPatientSchema.safeParse(formData)

    if (!result.success) {
      const fieldErrors: FormErrors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof AddPatientFormData
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      toast.error("Please fix the highlighted fields")
      return
    }

    setErrors({})
    addPatientMutation.mutate(result.data)
  }

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear the field's error as soon as the user edits it
    setErrors((prev) => {
      if (!prev[name as keyof AddPatientFormData]) return prev
      const next = { ...prev }
      delete next[name as keyof AddPatientFormData]
      return next
    })
  }

  const clearFieldError = (name: keyof AddPatientFormData) => {
    setErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-[#036638] hover:bg-[#025030] text-white gap-2" size="sm">
          <Plus className="w-4 h-4" />
          Add Patient
        </Button>
      </DialogTrigger>

      {/* Full-screen sheet on mobile (no rounding/margins); centered card from sm up.
          Header + action buttons stay pinned while only the fields scroll, and the
          footer respects iPhone safe-area insets. */}
      <DialogContent className="flex flex-col h-[100dvh] max-h-[100dvh] w-full max-w-full sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl left-0 top-0 sm:left-1/2 sm:top-1/2 translate-x-0 translate-y-0 sm:translate-x-[-50%] sm:translate-y-[-50%] rounded-none sm:rounded-xl p-0 gap-0 overflow-hidden bg-white sm:bg-white/95 backdrop-blur-md shadow-2xl border-0 animate-in fade-in zoom-in-95 duration-300">
        <DialogHeader className="shrink-0 text-left border-b border-[#E5E7EB] px-4 sm:px-6 pt-4 sm:pt-6 pb-3.5 pr-10 sm:pr-14">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-[#1A1B1E]">Add Patient</DialogTitle>
          <DialogDescription className="text-sm text-[#6B7280] mt-1">
            Add a new patient to the pipeline. They&apos;ll start in the Onboarding stage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0" noValidate>
          {/* Scrollable fields */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
              <Field label="First Name" required error={errors.firstName}>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  className={inputClass(!!errors.firstName)}
                  aria-invalid={!!errors.firstName}
                />
              </Field>

              <Field label="Last Name" required error={errors.lastName}>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  className={inputClass(!!errors.lastName)}
                  aria-invalid={!!errors.lastName}
                />
              </Field>

              <Field label="Email" optional error={errors.email}>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  className={inputClass(!!errors.email)}
                  aria-invalid={!!errors.email}
                />
              </Field>

              <Field label="Phone" optional error={errors.phone}>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                  className={inputClass(!!errors.phone)}
                  aria-invalid={!!errors.phone}
                />
              </Field>

              <Field label="Location" optional error={errors.location}>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="City, State"
                  className={inputClass(!!errors.location)}
                  aria-invalid={!!errors.location}
                />
              </Field>

              <Field label="Appointment Date & Time" optional>
                <input
                  type="datetime-local"
                  name="appointmentDatetime"
                  value={formData.appointmentDatetime}
                  onChange={handleInputChange}
                  className={inputClass(false)}
                />
              </Field>

              <Field label="Source is">
                <select
                  name="bookingPlatform"
                  value={formData.bookingPlatform}
                  onChange={handleInputChange}
                  className={`${inputClass(false)} appearance-none cursor-pointer`}
                >
                  {BOOKING_PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Assign VA">
                <select
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleInputChange}
                  className={`${inputClass(false)} appearance-none cursor-pointer`}
                >
                  <option value="">Auto-assign (by appointment time)</option>
                  {vaList?.map((va) => (
                    <option key={va.id} value={va.id}>
                      {va.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Payment Type">
                <SelectOrOther
                  value={formData.paymentMethod ?? ""}
                  onChange={(v) => {
                    setFormData((f) => ({ ...f, paymentMethod: v }))
                    clearFieldError("paymentMethod")
                  }}
                  otherMode={paymentMethodOther}
                  onOtherModeChange={setPaymentMethodOther}
                  options={PAYMENT_METHOD_OPTIONS}
                  placeholder="Select payment type..."
                />
              </Field>

              <Field label="Insurance Company">
                <SelectOrOther
                  value={formData.insuranceProvider ?? ""}
                  onChange={(v) => {
                    setFormData((f) => ({ ...f, insuranceProvider: v }))
                    clearFieldError("insuranceProvider")
                  }}
                  otherMode={insuranceProviderOther}
                  onOtherModeChange={setInsuranceProviderOther}
                  options={INSURANCE_PROVIDER_OPTIONS}
                  placeholder="Select insurance company..."
                />
              </Field>

              <Field label="Visit Status" className="sm:col-span-2">
                <select
                  name="visitStatus"
                  value={formData.visitStatus}
                  onChange={handleInputChange}
                  className={`${inputClass(false)} appearance-none cursor-pointer`}
                >
                  {VISIT_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 flex flex-col sm:flex-row justify-end gap-2.5 px-4 sm:px-6 pt-3.5 sm:pt-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-[#E5E7EB] bg-white">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={addPatientMutation.isPending}
              className="w-full sm:w-auto h-11 sm:h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addPatientMutation.isPending || !formData.firstName.trim() || !formData.lastName.trim()}
              className="w-full sm:w-auto h-11 sm:h-9 bg-[#036638] hover:bg-[#025030] text-white"
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
  )
}

// ---------------------------------------------------------------------------
// Field wrapper — plain block-level label + optional inline error message.
// No absolute/floating positioning, so it can never overlap the input on
// small screens.
// ---------------------------------------------------------------------------
interface FieldProps {
  label: string
  required?: boolean
  optional?: boolean
  error?: string
  className?: string
  children: React.ReactNode
}

export function Field({ label, required, optional, error, className = "", children }: FieldProps) {
  return (
    <div className={`space-y-1.5 min-w-0 ${className}`}>
      <label className="block text-sm font-semibold text-[#1A1B1E]">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {optional && <span className="text-[#9CA3AF] font-normal ml-1">(optional)</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    "w-full h-9 px-3 border rounded-lg text-sm focus:outline-none focus:ring-2",
    hasError
      ? "border-red-400 focus:ring-red-300/40"
      : "border-[#E5E7EB] focus:ring-[#036638]/30",
  ].join(" ")
}