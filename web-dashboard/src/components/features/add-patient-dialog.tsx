"use client"

import { useState, type FormEvent, type ChangeEvent } from "react"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { DateTimePicker, DatePicker, getMinAppointmentDate, getMaxDobDate } from "@/components/ui/date-time-picker"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PatientsService } from "@/services/patients.service"
import { useListVas } from "@/hooks/query/usePatients"
import { useNotificationsContext } from "@/providers/NotificationsProvider"
import { SelectOrOther } from "@/components/shared/select-or-other"
import { PAYMENT_METHOD_OPTIONS, INSURANCE_PROVIDER_OPTIONS, VISIT_STATUS_OPTIONS } from "@/lib/patient-options"
import { isValidUsPhone, formatUsPhone } from "@/lib/us-phone"
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
    .refine((v) => !v || isValidUsPhone(v), {
      message: "Enter a valid US phone number, e.g. (555) 123-4567",
    }),
  location: z.string().trim().max(120, "Location is too long").optional(),
  dateOfBirth: z
    .string()
    .optional()
    .refine((v) => !v || new Date(v).getTime() <= getMaxDobDate().getTime(), {
      message: "Patient must be at least 18 years old",
    }),
  appointmentDatetime: z
    .string()
    .optional()
    .refine((v) => !v || new Date(v).getTime() >= getMinAppointmentDate().getTime(), {
      message: "Appointment date cannot be in the past",
    }),
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
  dateOfBirth: "",
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
      return await PatientsService.addPatient({
        firstName: data.firstName,
        lastName: data.lastName || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        location: data.location || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
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
        <Button
          size="sm"
          className="h-9 rounded-xl px-3 gap-1.5 bg-gradient-to-r from-[#036638] to-emerald-600 text-white shadow-md shadow-emerald-500/25 hover:from-[#025030] hover:to-emerald-700 hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
        >
          <span className="flex items-center justify-center w-4 h-4 rounded-md bg-white/15">
            <Plus className="w-3 h-3" />
          </span>
          <span className="hidden sm:inline">Add Patient</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </DialogTrigger>

      {/* Full-screen sheet on mobile (no rounding/margins); centered card from sm up.
          Header + action buttons stay pinned while only the fields scroll, and the
          footer respects iPhone safe-area insets. */}
      <DialogContent
        hideAccent
        closeButtonClassName="bg-white/15 text-white hover:bg-white/25 hover:text-white"
        className="flex flex-col h-[100dvh] max-h-[100dvh] w-full max-w-full sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl left-0 top-0 sm:left-1/2 sm:top-1/2 translate-x-0 translate-y-0 sm:translate-x-[-50%] sm:translate-y-[-50%] rounded-none sm:rounded-2xl p-0 gap-0 overflow-hidden bg-white sm:bg-white/95 backdrop-blur-md shadow-2xl border-0 animate-in fade-in zoom-in-95 duration-300"
      >
        {/* Gradient brand header band */}
        <div className="shrink-0 relative overflow-hidden bg-gradient-to-r from-[#036638] via-[#0a7a44] to-emerald-600 px-4 sm:px-6 pt-5 sm:pt-6 pb-5 sm:pb-6 pr-12 sm:pr-14">
          {/* Decorative bubbles */}
          <div className="absolute -right-10 -top-12 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -right-2 -top-3 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute right-24 -bottom-16 w-32 h-32 rounded-full bg-black/5 pointer-events-none" />
          <div className="flex items-start gap-3 relative">
            <div className="w-11 h-11 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center shrink-0 shadow-lg shadow-black/5">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-white tracking-tight">Add Patient</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-emerald-50/90 mt-1">
                Add a new patient to the pipeline. They&apos;ll start in the Onboarding stage.
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0" noValidate>
          {/* Scrollable fields */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-[#F6F8F7] px-4 sm:px-6 py-4 sm:py-6">
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

              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-sm font-semibold text-[#1A1B1E]">
                    Phone
                    <span className="text-[#9CA3AF] font-normal ml-1">(optional)</span>
                  </label>
                  <span className="text-xs text-[#9CA3AF] font-medium shrink-0">(555) 123-4567</span>
                </div>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#036638] border-r border-gray-200 pr-2 pointer-events-none select-none"
                    aria-hidden
                  >
                    +1
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, phone: formatUsPhone(e.target.value) }))
                      clearFieldError("phone")
                    }}
                    placeholder="(555) 123-4567"
                    className={`${inputClass(!!errors.phone)} pl-12`}
                    aria-invalid={!!errors.phone}
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-500 mt-0.5">{errors.phone}</p>}
              </div>

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

              <Field label="Date of Birth" optional error={errors.dateOfBirth}>
                <DatePicker
                  value={formData.dateOfBirth ?? ""}
                  onChange={(iso) => {
                    setFormData((f) => ({ ...f, dateOfBirth: iso }))
                    clearFieldError("dateOfBirth")
                  }}
                  maxDate={getMaxDobDate()}
                  placeholder="Select date of birth"
                />
              </Field>

              <Field label="Appointment Date & Time" optional>
                <DateTimePicker
                  value={formData.appointmentDatetime ?? ""}
                  onChange={(iso) => {
                    setFormData((f) => ({ ...f, appointmentDatetime: iso }))
                    clearFieldError("appointmentDatetime")
                  }}
                  minDate={getMinAppointmentDate()}
                  placeholder="Pick a date & time"
                />
              </Field>

              <Field label="Source is">
                <Select
                  value={formData.bookingPlatform ?? ""}
                  onValueChange={(value) => {
                    setFormData((f) => ({ ...f, bookingPlatform: value }))
                    clearFieldError("bookingPlatform")
                  }}
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Select source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKING_PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Assign VA">
                <Select
                  value={formData.assignedTo ?? ""}
                  onValueChange={(value) => {
                    setFormData((f) => ({ ...f, assignedTo: value }))
                    clearFieldError("assignedTo")
                  }}
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Auto-assign (by appointment time)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto-assign (by appointment time)</SelectItem>
                    {vaList?.map((va) => (
                      <SelectItem key={va.id} value={va.id}>
                        {va.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select
                  value={formData.visitStatus ?? ""}
                  onValueChange={(value) => {
                    setFormData((f) => ({ ...f, visitStatus: value }))
                    clearFieldError("visitStatus")
                  }}
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Select visit status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 flex flex-col sm:flex-row justify-end gap-2.5 px-4 sm:px-6 pt-3.5 sm:pt-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-[#EDEFF2] bg-white">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={addPatientMutation.isPending}
              className="w-full sm:w-auto h-11 sm:h-9 rounded-xl border border-[#E5E7EB] text-[#6B7280] hover:bg-gray-50 hover:text-[#1A1B1E]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addPatientMutation.isPending || !formData.firstName.trim() || !formData.lastName.trim()}
              className="w-full sm:w-auto h-11 sm:h-9 rounded-xl bg-gradient-to-r from-[#036638] to-emerald-600 hover:from-[#025030] hover:to-emerald-700 text-white shadow-md shadow-emerald-500/25"
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

// Matches the text inputs (h-10 rounded-lg) so the shadcn selects sit flush
// in the form — the trigger's chevron makes it obvious these are dropdowns.
const selectTriggerClass =
  "w-full h-10 rounded-lg border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] shadow-none focus:ring-2 focus:ring-[#036638]/25 focus:border-[#036638]/50 hover:border-[#D1D5DB] cursor-pointer"

function inputClass(hasError: boolean) {
  return [
    "w-full h-10 px-3.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 transition-all",
    hasError
      ? "border-red-400 focus:ring-red-300/40"
      : "border-[#E5E7EB] focus:ring-[#036638]/25 focus:border-[#036638]/50 hover:border-[#D1D5DB]",
  ].join(" ")
}