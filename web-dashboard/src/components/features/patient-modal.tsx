"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import type { Patient, PatientStage } from "@/types"
import { ROLES, STALE_HOURS } from "@/constants"
import { useStageMeta } from "@/hooks/query/useStages"
import {
  X,
  Flag,
  Check,
  CheckCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  ListX,
  Loader2,
  UserCheck,
  ChevronDown,
  Zap,
  Shield,
  Lock,
  Unlock,
  Ban,
  RefreshCw,
  Calendar,
  Pencil,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/auth/useAuth"
import {
  useMoveStage,
  useToggleChecklist,
  useUpdateNotes,
  useFlagPatient,
  useClearFlag,
  useClaimPatient,
  useAssignPatient,
  useChecklistItems,
  useListVas,
  useCheckEligibility,
  useUpdatePatient,
  useLockPatient,
  useUnlockPatient,
  useUpdatePatientStatus,
  useUpdateAppointment,
} from "@/hooks/query/usePatients"
import { usePatient } from "@/hooks/query/usePatients"
import { useActivityLog } from "@/hooks/query/useActivityLog"
import { SelectOrOther } from "@/components/shared/select-or-other"
import { PAYMENT_METHOD_OPTIONS, INSURANCE_PROVIDER_OPTIONS, VISIT_STATUS_OPTIONS } from "@/lib/patient-options"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface PatientModalProps {
  patientId: string | null
  open: boolean
  onClose: () => void
}

// Stage-specific SOPs
const STAGE_SOPs: Record<PatientStage, string[]> = {
  onboarding: [
    "Confirm appointment date and time in calendar",
    "Verify patient contact information (phone, email)",
    "Send welcome email with pre-visit instructions",
    "Ensure intake form is completed",
  ],
  visit_complete: [
    "Document visit completion in Optimantra",
    "Verify all vital signs recorded",
    "Confirm provider's clinical notes entered",
    "Flag any abnormalities for review",
  ],
  post_visit_docs: [
    "Generate and send patient instruction letter",
    "Order and submit required lab work",
    "Attach lab request forms to patient record",
    "Confirm patient received all documents",
  ],
  chart_signed: [
    "Ensure Optimantra note is signed by provider",
    "Run pre-billing clawback check",
    "Verify CPT codes match services rendered",
    "Confirm ICD-10 codes are documented",
    "Check documentation supports diagnosis",
  ],
  sent_to_billing: [
    "Verify claim submission to billing system",
    "Record claim number and submission date",
    "Set follow-up reminder for claim status",
    "Attach claim submission confirmation",
  ],
  payment_posted: [
    "Record payment amount and date received",
    "Match payment to submitted claim",
    "Update insurance payer information",
    "Flag any payment discrepancies",
  ],
  reconciled: [
    "Verify all payments received match billing",
    "Close patient record in system",
    "Archive supporting documentation",
    "Record final reconciliation details",
  ],
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return "< 1h ago"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Format a Date as a local `datetime-local` value (YYYY-MM-DDTHH:mm). Using
// toISOString() here would return the UTC time and silently shift the
// appointment by the timezone offset when re-saving. Add a zero timezone offset
// to keep the local wall-clock time.
function toLocalDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const VOB_LABELS: Array<[string, string]> = [
  ["coverage", "Coverage"],
  ["payer", "Payer"],
  ["memberId", "Member ID"],
  ["groupNumber", "Group Number"],
  ["copay", "Copay"],
  ["coinsurance", "Coinsurance"],
  ["deductible", "Deductible"],
  ["deductibleMet", "Deductible Met"],
  ["outOfPocketMax", "Out-of-Pocket Max"],
  ["authorizationRequired", "Authorization"],
  ["visitsCoveredPerYear", "Visits / Year"],
  ["checkDate", "Checked"],
]

export function PatientModal({ patientId, open, onClose }: PatientModalProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const { order: stageOrder, labels: stageLabels, byKey: stageByKey } = useStageMeta()
  const { data: patient, isLoading } = usePatient(patientId || "")
  const { data: logData } = useActivityLog(
    patientId ? { patientId, limit: 20 } : undefined,
  )

  const moveStage = useMoveStage()
  const toggleChecklist = useToggleChecklist()
  const updateNotes = useUpdateNotes()
  const flagPatient = useFlagPatient()
  const clearFlag = useClearFlag()
  const claimPatient = useClaimPatient()
  const assignPatient = useAssignPatient()
  const updatePatient = useUpdatePatient()
  const lockPatient = useLockPatient()
  const unlockPatient = useUnlockPatient()
  const updateStatus = useUpdatePatientStatus()

  const { data: checklistDefs } = useChecklistItems()

  const currentStageItems = useMemo(() => {
    if (!checklistDefs || !patient) return []
    return checklistDefs
      .filter((item) => item.stage === patient.stage)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [checklistDefs, patient])

  const currentState = patient?.checklistState?.[patient.stage] || {}

  // Only REQUIRED items gate forward moves; optional items are informational.
  const requiredItems = currentStageItems.filter((item) => item.status === "required")
  const totalItems = requiredItems.length
  const completedItems = requiredItems.filter(
    (item) => currentState[item.id] === true,
  ).length
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100
  const allComplete = totalItems === 0 || completedItems === totalItems

  const { data: vaList } = useListVas()

  const [notesText, setNotesText] = useState("")
  const [flagReason, setFlagReason] = useState("")
  const [showFlagInput, setShowFlagInput] = useState(false)
  const [flagStage, setFlagStage] = useState<PatientStage | "">("")
  const [showFlagPopup, setShowFlagPopup] = useState(false)
  const [newFlagReason, setNewFlagReason] = useState("")
  const [newFlagType, setNewFlagType] = useState<"positive" | "negative">("positive")
  const [showAllFlags, setShowAllFlags] = useState(false)
  const [clearReason, setClearReason] = useState("")
  const [showClearInput, setShowClearInput] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("")
  const [insuranceProvider, setInsuranceProvider] = useState("")
  const [paymentMethodOther, setPaymentMethodOther] = useState(false)
  const [insuranceProviderOther, setInsuranceProviderOther] = useState(false)
  const [visitStatus, setVisitStatus] = useState("not_visited")
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    location: "",
    phone: "",
    email: "",
    copayAmount: "",
    amountPaid: "",
  })
  const [savingContact, setSavingContact] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [showCancelInput, setShowCancelInput] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState(false)
  const [newAppointmentDatetime, setNewAppointmentDatetime] = useState("")
  const checkEligibility = useCheckEligibility()
  const updateAppointment = useUpdateAppointment()

  // Checklist & assignment pending states (prevent duplicate requests)
  const [bulkPending, setBulkPending] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignFeedback, setAssignFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const assignFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checklistBusy = toggleChecklist.isPending || bulkPending

  // Clear any lingering assignment feedback when the modal unmounts
  useEffect(() => () => {
    if (assignFeedbackTimer.current) clearTimeout(assignFeedbackTimer.current)
  }, [])

  useEffect(() => {
    if (patient?.notes) setNotesText(patient.notes)
    else setNotesText("")
    const pm = patient?.paymentMethod ?? ""
    const ip = patient?.insuranceProvider ?? ""
    setPaymentMethod(pm)
    setInsuranceProvider(ip)
    setPaymentMethodOther(pm !== "" && !PAYMENT_METHOD_OPTIONS.includes(pm))
    setInsuranceProviderOther(ip !== "" && !INSURANCE_PROVIDER_OPTIONS.includes(ip))
    setVisitStatus(patient?.visitStatus ?? "not_visited")
    setContactForm({
      firstName: patient?.firstName ?? "",
      lastName: patient?.lastName ?? "",
      location: patient?.location ?? "",
      phone: patient?.phone ?? "",
      email: patient?.email ?? "",
      copayAmount: patient?.copayAmount ?? "",
      amountPaid: patient?.amountPaid ?? "",
    })
    setShowFlagInput(false)
    setFlagReason("")
    setShowClearInput(false)
    setClearReason("")
    setShowCancelInput(false)
    setCancelReason("")
    setEditingAppointment(false)
    // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:mm) in LOCAL time
    if (patient?.appointmentDatetime) {
      const dt = new Date(patient.appointmentDatetime)
      setNewAppointmentDatetime(toLocalDatetimeLocal(dt))
    } else {
      setNewAppointmentDatetime("")
    }
    setAssigning(false)
    setAssignFeedback(null)
  }, [patient?.id, patient?.notes, patient?.paymentMethod, patient?.insuranceProvider, patient?.appointmentDatetime])

  // ESC key to close modal (blocked while an assignment is in-flight)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !assigning) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [open, onClose, assigning])

  const handleSaveNotes = async () => {
    if (!patient) return
    setSavingNotes(true)
    await updateNotes.mutateAsync({ id: patient.id, notes: notesText })
    setSavingNotes(false)
  }

  const handleFlag = async () => {
    if (!patient || !flagReason.trim()) return
    await flagPatient.mutateAsync({ id: patient.id, reason: flagReason })
    setShowFlagInput(false)
    setFlagReason("")
    setFlagStage("")
  }

  const handleClearFlag = async () => {
    if (!patient || !clearReason.trim()) return
    await clearFlag.mutateAsync({ id: patient.id, clearReason })
    setShowClearInput(false)
    setClearReason("")
  }

  const handleMoveStage = async (target: PatientStage) => {
    if (!patient) return
    const currentIdx = stageOrder.indexOf(patient.stage)
    const targetIdx = stageOrder.indexOf(target)

    // Phase 3: checklist gate applies to EVERYONE (admin included) - server enforces too.
    if (targetIdx > currentIdx && !allComplete) {
      return // Prevent progression if checklist incomplete
    }

    await moveStage.mutateAsync({ id: patient.id, targetStage: target })
  }

  const handleClaim = async () => {
    if (!patient || !user) return
    await claimPatient.mutateAsync({ id: patient.id, userId: user.id })
  }

  const handleCheckEligibility = async () => {
    if (!patient) return
    await checkEligibility.mutateAsync({
      id: patient.id,
      paymentMethod: paymentMethod.trim() || null,
      insuranceProvider: insuranceProvider.trim() || null,
    })
  }

  const handleSaveContact = async () => {
    if (!patient) return
    setSavingContact(true)
    await updatePatient.mutateAsync({
      id: patient.id,
      firstName: contactForm.firstName.trim() || null,
      lastName: contactForm.lastName.trim() || null,
      location: contactForm.location.trim() || null,
      phone: contactForm.phone.trim() || null,
      email: contactForm.email.trim() || null,
      copayAmount: contactForm.copayAmount.trim() || null,
      amountPaid: contactForm.amountPaid.trim() || null,
      paymentMethod: paymentMethod.trim() || null,
      insuranceProvider: insuranceProvider.trim() || null,
      visitStatus,
    })
    setSavingContact(false)
  }

  const handleCancelPatient = async () => {
    if (!patient) return
    await updateStatus.mutateAsync({ id: patient.id, status: "cancelled", reason: cancelReason.trim() || null })
    setShowCancelInput(false)
    setCancelReason("")
  }

  const handleUpdateAppointment = async () => {
    if (!patient || !newAppointmentDatetime.trim()) return
    // Convert datetime-local format (2026-08-09T10:30) to ISO 8601 (2026-08-09T10:30:00Z)
    const isoDatetime = new Date(newAppointmentDatetime).toISOString()
    await updateAppointment.mutateAsync({ id: patient.id, appointmentDatetime: isoDatetime })
    setEditingAppointment(false)
  }

  const handleAssignTo = async (vaId: string) => {
    if (!patient || !vaId) return
    setAssigning(true)
    setAssignFeedback(null)
    try {
      await assignPatient.mutateAsync({ id: patient.id, assignedTo: vaId })
      const va = vaList?.find((v) => v.id === vaId)
      setAssignFeedback({ type: "success", message: `Assigned to ${va?.name ?? "VA"}` })
    } catch (err: unknown) {
      const apiMessage = (
        err as { response?: { data?: { message?: string } } }
      )?.response?.data?.message
      setAssignFeedback({
        type: "error",
        message: apiMessage || "Failed to assign this patient",
      })
    } finally {
      setAssigning(false)
      if (assignFeedbackTimer.current) clearTimeout(assignFeedbackTimer.current)
      assignFeedbackTimer.current = setTimeout(() => setAssignFeedback(null), 4000)
    }
  }

  const handleBulkChecklist = async (checked: boolean) => {
    if (!patient) return
    const itemsToChange = currentStageItems.filter(
      (item) => !!currentState[item.id] !== checked,
    )
    if (itemsToChange.length === 0) {
      toast.info(checked ? "All items are already checked" : "No checklist items are checked")
      return
    }
    setBulkPending(true)
    try {
      // Sequential updates so one failure stops the batch cleanly
      for (const item of itemsToChange) {
        await toggleChecklist.mutateAsync({ id: patient.id, itemId: item.id, checked })
      }
      toast.success(`Checklist updated (${itemsToChange.length} item${itemsToChange.length > 1 ? "s" : ""})`)
    } catch {
      // The toggle mutation's onError already surfaces a toast + rolls back optimistically
    } finally {
      setBulkPending(false)
    }
  }

  const canLock =
    !!patient && (isAdmin || patient.assignedTo === user?.id)
  const canUnlock =
    !!patient &&
    (isAdmin || patient.assignedTo === user?.id || patient.privateLockedByUser?.id === user?.id)

  const stale =
    patient &&
    !(stageByKey.get(patient.stage)?.isFinal ?? false) &&
    (Date.now() - new Date(patient.updatedAt).getTime()) / (1000 * 60 * 60) >
      STALE_HOURS

  if (!open) return null

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-lg"
        onClick={() => !assigning && onClose()}
      />
      {/* Full-screen sheet on mobile (no rounding/margin); centered card from sm up. */}
      <div className="relative bg-[#FAFAFA]/95 backdrop-blur-3xl rounded-none sm:rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.25)] border-0  w-full h-[100dvh] sm:h-auto max-w-full sm:max-w-4xl max-h-full sm:max-h-[92vh] flex flex-col overflow-hidden mx-0 sm:mx-4 animate-in fade-in zoom-in-95 duration-300">
        {isLoading || !patient ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            {isLoading ? (
              <>
                {/* Logo Container with Animation */}
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-6">
                  {/* Outer spinning ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#65BD6C] border-r-[#036638] animate-spin" />

                  {/* Middle pulsing ring */}
                  <div className="absolute inset-2 rounded-full border-2 border-[#65BD6C]/30 animate-pulse" />

                  {/* Inner glowing ring */}
                  <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#036638]/10 to-[#065040]/5 blur-xl animate-pulse" />

                  {/* Logo Image */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src="/logo.png"
                      alt="Elevated Core Health"
                      className="w-12 h-12 sm:w-16 sm:h-16 object-contain animate-bounce"
                      style={{
                        animation: "bounce 2s infinite",
                      }}
                    />
                  </div>

                  {/* Floating particles effect */}
                  <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/2 w-1 h-1 bg-[#65BD6C] rounded-full animate-ping" />
                    <div className="absolute bottom-0 right-1/4 w-1 h-1 bg-[#036638] rounded-full animate-ping" style={{ animationDelay: "0.5s" }} />
                    <div className="absolute top-1/2 right-0 w-1 h-1 bg-[#65BD6C] rounded-full animate-ping" style={{ animationDelay: "1s" }} />
                  </div>
                </div>

                <p className="text-sm font-semibold text-[#1A1B1E]">Loading patient details...</p>
                <p className="text-xs text-[#6B7280] mt-1">Please wait</p>
              </>
            ) : (
              <p className="text-sm text-[#6B7280]">Patient not found</p>
            )}
          </div>
        ) : (
          <>
            <div className="flex-shrink-0 relative overflow-hidden bg-gradient-to-br from-[#023E23] via-[#036638] to-[#012816] px-4 py-4 sm:px-8 sm:py-8 flex items-start justify-between border-b border-white/10 shadow-[0_4px_24px_rgba(3,102,56,0.3)]">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
              <div className="min-w-0 flex-1 relative z-50">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                    {patient.name}
                  </h2>
                  {patient.isFlagged && (
                    <Badge
                      variant="outline"
                      className="bg-[#E15C4E]/90 text-white border-[#E15C4E] text-[10px] font-bold gap-1 shadow-sm animate-pulse"
                    >
                      <Flag className="w-3 h-3" fill="white" />
                      Flagged
                    </Badge>
                  )}
                  {stale && (
                    <Badge
                      variant="outline"
                      className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold gap-1 shadow-sm"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Stale
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full">
                    {stageLabels[patient.stage]}
                  </span>
                  {patient.assignedTo && vaList ? (
                    <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      {vaList.find((v) => v.id === patient.assignedTo)?.name || "Unknown"}
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-500/80 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                      <Flag className="w-3 h-3" fill="currentColor" />
                      Unassigned
                    </span>
                  )}
                  {patient.status !== "active" && (
                    <span
                      className={cn(
                        "px-3 py-1 text-xs font-semibold rounded-full",
                        patient.status === "completed" ? "bg-[#65BD6C] text-white" : "bg-red-500 text-white",
                      )}
                    >
                      {patient.status === "completed" ? "Completed" : "Cancelled"}
                    </span>
                  )}
                  {patient.isPrivate && (
                    <span className="px-3 py-1 bg-amber-400/90 text-amber-950 text-xs font-semibold rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Locked
                    </span>
                  )}
                  <p className="text-sm text-white/80">
                    Created {new Date(patient.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Unified Flag Display */}
                {patient.isFlagged && patient.flagReason && (
                  <div className="mt-3 p-3 rounded-lg border bg-[#E15C4E]/15 border-[#E15C4E]/40 backdrop-blur-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#E15C4E] mb-1 flex items-center gap-1">
                          🚩 Flagged
                        </p>
                        <p className="text-xs text-white/90">{patient.flagReason}</p>
                        {patient.flaggedByUser && (
                          <p className="text-[10px] text-white/60 mt-2">
                            By {patient.flaggedByUser.name} • {timeAgo(patient.flaggedAt?.toString() || '')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Actions — Appointment, Eligibility, Assignment (elevated from the body per UX pass) */}
                <div className="mt-4 flex flex-wrap items-start gap-2.5">
                  {/* Appointment */}
                  <div
                    className={cn(
                      "rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md transition-all",
                      editingAppointment ? "p-3 w-full sm:w-auto" : "px-4 py-2.5",
                    )}
                  >
                    {!editingAppointment ? (
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-white/15 shrink-0">
                          <Calendar className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest leading-none mb-1">
                            Appointment
                          </p>
                          {patient.appointmentDatetime ? (
                            <p className="text-xs font-semibold text-white truncate">
                              {new Date(patient.appointmentDatetime).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          ) : (
                            <p className="text-xs font-medium text-white/60 italic">Not scheduled</p>
                          )}
                        </div>
                        <button
                          onClick={() => setEditingAppointment(true)}
                          title={patient.appointmentDatetime ? "Edit appointment" : "Set appointment"}
                          className="ml-1 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-all shrink-0"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl p-3.5 shadow-xl space-y-2.5 w-full sm:w-72">
                        <label className="text-[10px] font-bold text-[#036638] uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {patient.appointmentDatetime ? "Update Date & Time" : "Set Date & Time"}
                        </label>
                        <input
                          type="datetime-local"
                          value={newAppointmentDatetime}
                          onChange={(e) => setNewAppointmentDatetime(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#036638] transition-all"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={handleUpdateAppointment}
                            disabled={updateAppointment.isPending || !newAppointmentDatetime.trim()}
                            className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#036638] text-white hover:bg-[#025030] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all"
                          >
                            {updateAppointment.isPending ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <CheckCheck className="w-3.5 h-3.5" />
                                {patient.appointmentDatetime ? "Update" : "Set"}
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingAppointment(false)
                              if (patient?.appointmentDatetime) {
                                setNewAppointmentDatetime(toLocalDatetimeLocal(new Date(patient.appointmentDatetime)))
                              } else {
                                setNewAppointmentDatetime("")
                              }
                            }}
                            disabled={updateAppointment.isPending}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-50 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                        {updateAppointment.isPending && (
                          <p className="text-[10px] font-medium text-blue-700 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Saving &amp; notifying patient...
                          </p>
                        )}
                        {updateAppointment.isSuccess && !updateAppointment.isPending && (
                          <p className="text-[10px] font-medium text-[#036638] flex items-center gap-1">
                            <Check className="w-3 h-3" /> Saved — patient notified via email
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Eligibility Check — light brand-green "premium" pill (mirrors the emerald-50/700/200 treatment, in-palette) */}
                  <button
                    onClick={handleCheckEligibility}
                    disabled={checkEligibility.isPending}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all text-xs font-bold shrink-0",
                      checkEligibility.isPending
                        ? "bg-white/10 border-white/15 text-white/60 cursor-wait"
                        : "bg-[#EBF7EC] text-[#036638] border-[#65BD6C]/40 hover:bg-white hover:border-[#65BD6C] shadow-sm cursor-pointer",
                    )}
                  >
                    {checkEligibility.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Shield className="w-3.5 h-3.5" />
                    )}
                    {checkEligibility.isPending
                      ? "Checking..."
                      : patient.eligibilityStatus !== "not_checked"
                        ? "Re-check Eligibility"
                        : "Check Eligibility"}
                    {!checkEligibility.isPending && patient.eligibilityStatus === "eligible" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                    )}
                    {!checkEligibility.isPending && patient.eligibilityStatus === "not_eligible" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                    )}
                  </button>

                  {/* Assign / Reassign — SI (staff) selector: micro-label + active/unassigned status dot + chevron */}
                  {(!!vaList && (isAdmin || !patient.assignedUser)) && (
                    <div className="flex flex-col gap-1 bg-white/10 border border-white/15 rounded-2xl px-3.5 py-2 backdrop-blur-md">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            patient.assignedUser
                              ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                              : "bg-white/30",
                          )}
                        />
                        <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest leading-none">
                          {isAdmin ? "Assigned SI" : "Assignment"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <UserPlus className="w-3.5 h-3.5 text-white shrink-0" />
                        {!isAdmin && !patient.assignedUser && (
                          <button
                            onClick={handleClaim}
                            disabled={claimPatient.isPending}
                            className="text-xs font-bold text-white hover:text-white/80 transition-all disabled:opacity-50 whitespace-nowrap"
                          >
                            {claimPatient.isPending ? "Claiming..." : "Assign to Me"}
                          </button>
                        )}
                        {vaList && (
                          <div className="relative">
                            <select
                              onChange={(e) => {
                                const val = e.target.value
                                e.target.value = ""
                                if (val) handleAssignTo(val)
                              }}
                              value=""
                              disabled={assigning}
                              className="appearance-none text-xs font-semibold bg-transparent text-white pr-5 focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 [&>option]:text-[#1A1B1E]"
                            >
                              <option value="">{patient.assignedUser ? "Reassign to..." : "Assign to VA..."}</option>
                              {vaList.filter((v) => v.id !== user?.id).map((va) => (
                                <option key={va.id} value={va.id}>
                                  {va.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-white/70 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {assignFeedback && (
                  <div
                    className={cn(
                      "mt-2.5 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border w-fit",
                      assignFeedback.type === "success"
                        ? "bg-white/15 border-white/20 text-white"
                        : "bg-red-500/20 border-red-400/40 text-white",
                    )}
                  >
                    {assignFeedback.type === "success" ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {assignFeedback.message}
                  </div>
                )}
              </div>

              {/* Unified Flag Button (top-right, below close) */}
              <div className="flex flex-col gap-2 ml-4 flex-shrink-0 relative z-10">
                <button
                  onClick={() => setShowFlagPopup(true)}
                  title={isAdmin ? "Raise flag for VAs" : "Raise flag for admin"}
                  className={cn(
                    "p-2.5 rounded-xl transition-all border shadow-sm flex items-center justify-center",
                    isAdmin
                      ? "bg-[#65BD6C]/20 hover:bg-[#65BD6C]/30 text-[#65BD6C] hover:text-[#036638] border-[#65BD6C]/40"
                      : "bg-[#E15C4E]/20 hover:bg-[#E15C4E]/30 text-[#E15C4E] hover:text-white border-[#E15C4E]/40"
                  )}
                >
                  <Flag className="w-4 h-4" fill="currentColor" />
                </button>
                <button
                  onClick={onClose}
                  title="Press ESC to close"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all shadow-sm border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-[#036638] scrollbar-thumb-rounded">
            <div className="p-4 sm:p-8 space-y-5 sm:space-y-7">
              {/* Stage Navigation (sticky so the pipeline is always visible while scrolling) */}
              <div className="sticky top-0 z-20 bg-[#FAFAFA]/80 backdrop-blur-2xl border-b border-gray-200/50 -mx-4 px-4 sm:-mx-8 sm:px-8 py-3 sm:py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] mb-5 sm:mb-6">
                <p className="text-[11px] font-bold text-[#036638] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#036638] rounded-full shadow-[0_0_8px_rgba(3,102,56,0.6)]"></span>
                  Pipeline Stage
                </p>
                <div className="flex w-full overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300">
                  {stageOrder.map((stage, idx) => {
                    const currentIdx = stageOrder.indexOf(patient.stage)
                    const isComplete = idx < currentIdx
                    const isCurrent = stage === patient.stage
                    const isNext = idx === currentIdx + 1
                    const isFuture = idx > currentIdx + 1
                    const isLast = idx === stageOrder.length - 1

                    // EVERYONE: next stage is only clickable if current stage checklist is 100% complete
                    // Both VAs and Admins must complete all checklist items before advancing
                    const canAdvanceToNext = allComplete
                    const isClickable =
                      isCurrent ? false : // Can't click current stage
                      isComplete ? true :  // Can click completed stages (go back)
                      isNext ? canAdvanceToNext : // Next stage only if checklist complete
                      false // Can't skip stages

                    const isBlocked = isNext && !allComplete
                    const isDisabledReason = isBlocked
                      ? "Tick every required item before moving this card forward."
                      : isFuture
                        ? "Complete the current stage first"
                        : null

                    return (
                      <div key={stage} className="relative flex-1 min-w-[76px] sm:min-w-[92px] flex flex-col items-center">
                        {/* Connector to the next step — centered on the circle (circle is 2rem/32px, so its center sits at top-4/16px) */}
                        {!isLast && (
                          <div
                            className={cn(
                              "absolute top-4 left-1/2 w-full h-0.5 -z-0 transition-colors",
                              isComplete ? "bg-[#65BD6C]" : "bg-gray-200",
                            )}
                          />
                        )}
                        <button
                          onClick={() => isClickable && handleMoveStage(stage)}
                          disabled={moveStage.isPending || !isClickable}
                          title={isDisabledReason || stageLabels[stage]}
                          className="relative z-10 flex flex-col items-center gap-1.5 group"
                        >
                          <span
                            className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-full border-2 text-[11px] font-bold transition-all shrink-0",
                              // Current stage — solid, elevated with a soft focus ring
                              isCurrent &&
                                "bg-[#036638] border-[#036638] text-white shadow-[0_0_0_4px_rgba(3,102,56,0.15)]",
                              // Completed — light green fill, clickable to go back
                              !isCurrent && isComplete &&
                                "bg-[#EBF7EC] border-[#65BD6C] text-[#036638] group-hover:bg-[#dff4eb] cursor-pointer",
                              // Next stage, unlocked — white with a highlighted border
                              !isCurrent && !isComplete && !isFuture && isClickable &&
                                "bg-white border-[#036638]/40 text-[#036638] group-hover:border-[#036638] group-hover:shadow-sm cursor-pointer",
                              // Locked (checklist incomplete) or future — flat gray, disabled
                              !isCurrent && !isComplete && !isClickable &&
                                "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed",
                            )}
                          >
                            {isComplete ? (
                              <Check className="w-4 h-4" />
                            ) : isBlocked ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              idx + 1
                            )}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-semibold text-center leading-tight max-w-[84px] truncate transition-colors",
                              isCurrent ? "text-[#036638]" : isComplete ? "text-[#036638]/70" : "text-gray-400",
                            )}
                          >
                            {stageLabels[stage]}
                          </span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Checklist */}
              <div className="bg-white/90 backdrop-blur-md border border-gray-200/60 rounded-3xl p-4 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden transition-all hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-[#EBF7EC] rounded-lg border border-[#65BD6C]/20">
                      <CheckCheck className="w-4 h-4 text-[#036638]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1A1B1E] uppercase tracking-wide">
                      Checklist - {stageLabels[patient.stage]}
                    </h3>
                    {checklistBusy && <Loader2 className="w-3.5 h-3.5 text-[#036638] animate-spin ml-1" />}
                  </div>
                  {!allComplete && totalItems > 0 && !isAdmin && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 shadow-sm">
                      {totalItems - completedItems} remaining
                    </span>
                  )}
                </div>

                {currentStageItems.length > 0 ? (
                  <>
                    {totalItems > 0 ? (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-[#6B7280] mb-2">
                        <span className="font-medium">
                          {completedItems} / {totalItems} Completed
                        </span>
                        <span className="font-semibold text-[#036638]">{progress}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                              allComplete
                                ? "bg-[#3FA66E]"
                                : "bg-[#036638]",
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {allComplete && (
                        <p className="text-xs text-[#3FA66E] font-medium mt-2 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Ready to advance to next stage
                        </p>
                      )}
                    </div>
                    ) : (
                      <p className="text-xs text-[#6B7280] italic mb-4">
                        No required items - this stage can advance without checking anything.
                      </p>
                    )}

                    {/* Check All / Uncheck All */}
                    <div className="flex flex-wrap items-center gap-2 mb-5 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkChecklist(true)}
                        disabled={checklistBusy}
                        className="text-xs gap-1.5 border-[#036638]/30 text-[#036638] hover:text-[#025030] bg-[#F0F9F5] hover:bg-[#EBF7EC] hover:border-[#036638]/60 transition-all shadow-sm font-semibold"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Check All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkChecklist(false)}
                        disabled={checklistBusy}
                        className="text-xs gap-1.5 border-[#E5E7EB] text-[#4B5563] hover:text-[#1A1B1E] bg-white hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm font-medium"
                      >
                        <ListX className="w-3.5 h-3.5" />
                        Uncheck All
                      </Button>
                      {bulkPending && (
                        <span className="text-[10px] font-medium text-[#036638] flex items-center gap-1.5 ml-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Updating...
                        </span>
                      )}
                    </div>

                    {/* Checklist Items */}
                    <div className={cn("space-y-2 transition-opacity duration-200", checklistBusy && "opacity-50 pointer-events-none")}>
                      {currentStageItems.map((item) => {
                        const checked = !!currentState[item.id]
                        return (
                          <label
                            key={item.id}
                            className={cn(
                              "flex items-start gap-2.5 py-3 px-3 rounded-lg hover:bg-[#F9FAFB] cursor-pointer transition-all border border-transparent hover:border-[#E5E7EB] group",
                              checklistBusy && "hover:bg-transparent",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={checklistBusy}
                              onChange={() =>
                                toggleChecklist.mutate({
                                  id: patient.id,
                                  itemId: item.id,
                                  checked: !checked,
                                })
                              }
                              className="mt-1 w-5 h-5 rounded border-[#E5E7EB] text-[#036638] focus:ring-[#036638] accent-[#036638] cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={cn(
                                    "text-sm font-semibold transition-all",
                                    checked
                                      ? "text-[#6B7280] line-through"
                                      : "text-[#1A1B1E]",
                                  )}
                                >
                                  {item.label}
                                </span>
                                <span
                                  className={cn(
                                    "px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider",
                                    item.status === "required"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-[#EBF7EC] text-[#036638]",
                                  )}
                                >
                                  {item.status === "required" ? "Required" : "Optional"}
                                </span>
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-[#6B7280] mt-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-[#6B7280] italic py-2">
                    No checklist items for this stage
                  </p>
                )}
              </div>

              {/* Stage-Specific SOPs */}
              <div className="bg-gradient-to-br from-amber-50/90 to-orange-50/90 backdrop-blur-md border border-amber-200/60 rounded-3xl p-4 sm:p-7 shadow-[0_8px_30px_rgba(245,158,11,0.06)] transition-all hover:shadow-[0_12px_40px_rgba(245,158,11,0.1)]">
                <div className="flex items-center gap-2.5 mb-4">
                  <Zap className="w-5 h-5 text-amber-600" />
                  <p className="text-[11px] font-bold text-amber-900 uppercase tracking-widest">
                    Standard Operating Procedure
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {STAGE_SOPs[patient.stage]?.map((sop, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-900">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-[7px] shrink-0" />
                      <span>{sop}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Eligibility Check */}
              <div className="bg-gradient-to-br from-[#F0F9F5]/90 to-[#E8F5F2]/90 backdrop-blur-md border border-[#65BD6C]/30 rounded-3xl p-4 sm:p-7 shadow-[0_8px_30px_rgba(3,102,56,0.06)] transition-all hover:shadow-[0_12px_40px_rgba(3,102,56,0.1)]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-5 h-5 text-[#036638]" />
                    <p className="text-[11px] font-bold text-[#036638] uppercase tracking-widest">
                      Eligibility Check
                    </p>
                  </div>
                  {/* Trigger lives in the modal header now — this just reflects the latest result. */}
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2.5 py-1 rounded-full border",
                      patient.eligibilityStatus === "eligible" &&
                        "bg-emerald-50 text-emerald-700 border-emerald-200",
                      patient.eligibilityStatus === "not_eligible" &&
                        "bg-red-50 text-red-700 border-red-200",
                      patient.eligibilityStatus === "not_checked" &&
                        "bg-white text-[#6B7280] border-gray-200",
                    )}
                  >
                    {patient.eligibilityStatus === "eligible"
                      ? "Eligible"
                      : patient.eligibilityStatus === "not_eligible"
                        ? "Not Eligible"
                        : "Not Checked"}
                  </span>
                </div>

                {/* Payment details used for the check (persisted to the patient record) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">
                      Payment Type
                    </label>
                    <SelectOrOther
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      otherMode={paymentMethodOther}
                      onOtherModeChange={setPaymentMethodOther}
                      options={PAYMENT_METHOD_OPTIONS}
                      placeholder="Select payment type..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">
                      Insurance Company
                    </label>
                    <SelectOrOther
                      value={insuranceProvider}
                      onChange={setInsuranceProvider}
                      otherMode={insuranceProviderOther}
                      onOtherModeChange={setInsuranceProviderOther}
                      options={INSURANCE_PROVIDER_OPTIONS}
                      placeholder="Select insurance company..."
                    />
                  </div>
                </div>

                {patient.eligibilityStatus === "eligible" && (
                  <div className="bg-white rounded-lg p-3 border border-[#65BD6C]/40 mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <p className="text-sm font-semibold text-emerald-700">Eligible</p>
                      {patient.eligibilityCheckedAt && (
                        <span className="text-[10px] text-[#6B7280] ml-auto">
                          Checked {new Date(patient.eligibilityCheckedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {(patient.paymentMethod || patient.insuranceProvider) && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {patient.paymentMethod && (
                          <span className="text-[10px] font-medium bg-[#EBF7EC] text-[#036638] px-2 py-0.5 rounded-full">
                            {patient.paymentMethod}
                          </span>
                        )}
                        {patient.insuranceProvider && (
                          <span className="text-[10px] font-medium bg-[#EBF7EC] text-[#036638] px-2 py-0.5 rounded-full">
                            {patient.insuranceProvider}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {patient.eligibilityStatus === "not_eligible" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <p className="text-sm font-semibold text-red-700">Not Eligible</p>
                      {patient.eligibilityCheckedAt && (
                        <span className="text-[10px] text-[#6B7280] ml-auto">
                          Checked {new Date(patient.eligibilityCheckedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {(patient.paymentMethod || patient.insuranceProvider) && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {patient.paymentMethod && (
                          <span className="text-[10px] font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            {patient.paymentMethod}
                          </span>
                        )}
                        {patient.insuranceProvider && (
                          <span className="text-[10px] font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            {patient.insuranceProvider}
                          </span>
                        )}
                      </div>
                    )}
                    {patient.eligibilityReason && (
                      <p className="text-xs text-red-700/80 mt-1.5">{patient.eligibilityReason}</p>
                    )}
                  </div>
                )}

                {patient.eligibilityStatus === "not_checked" && (
                  <p className="text-sm text-[#6B7280] italic mb-3">
                    Use &ldquo;Check Eligibility&rdquo; in the header above to compare this
                    patient&apos;s payment details against the configured rules.
                  </p>
                )}

                {patient.eligibilityDetails?.vob && (
                  // Kept at 2 columns even on mobile — these are short key/value
                  // pairs (Coverage, Payer, Copay...), fine compact and avoids a
                  // very long single-column scroll for ~10 items.
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
                    {VOB_LABELS.map(([key, label]) => {
                      const value = patient.eligibilityDetails?.vob?.[key]
                      if (value === undefined || value === null) return null
                      const display =
                        typeof value === "boolean"
                          ? value
                            ? "Required"
                            : "Not Required"
                          : String(value)
                      return (
                        <div key={key} className="bg-white rounded p-2">
                          <p className="text-[10px] text-[#6B7280] font-medium">{label}</p>
                          <p className="text-sm font-semibold text-[#1A1B1E]">{display}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Details — stacked & center-aligned on mobile, 2-up and left-aligned once there's room to breathe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-center sm:text-left">
                {patient.assignedUser && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-2">
                      Assigned To
                    </p>
                    <p className="text-sm font-medium text-[#1A1B1E]">
                      {patient.assignedUser.name}
                    </p>
                  </div>
                )}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow">
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-2">
                    Source
                  </p>
                  <p className="text-sm font-medium text-[#1A1B1E] capitalize">
                    {patient.source || "Manual"}
                  </p>
                </div>
                {patient.bookingPlatform && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-2">
                      Booking Platform
                    </p>
                    <p className="text-sm font-medium text-[#1A1B1E]">
                      {patient.bookingPlatform}
                    </p>
                  </div>
                )}
                {patient.paymentMethod && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-2">
                      Payment Method
                    </p>
                    <p className="text-sm font-medium text-[#1A1B1E]">
                      {patient.paymentMethod}
                    </p>
                  </div>
                )}
                {patient.insuranceProvider && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-2">
                      Insurance Provider
                    </p>
                    <p className="text-sm font-medium text-[#1A1B1E]">
                      {patient.insuranceProvider}
                    </p>
                  </div>
                )}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow">
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-2">
                    Last Updated
                  </p>
                  <p className="text-sm font-medium text-[#036638]">
                    {timeAgo(patient.updatedAt)}
                  </p>
                </div>
              </div>

              {/* Flag for Donna Section - VA's flag message */}
              {patient.isFlagged && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
                  <p className="text-sm font-bold text-red-700 flex items-center gap-2">
                    <Flag className="w-4 h-4" fill="#dc2626" />
                    Flagged for Donna
                  </p>
                  {patient.flagReason && (
                    <p className="text-sm text-[#1A1B1E] mt-2 bg-white rounded-lg p-3 border border-red-100">
                      {patient.flagReason}
                    </p>
                  )}
                  {patient.flaggedByUser && (
                    <p className="text-[11px] text-[#6B7280] mt-2 font-medium">
                      by <span className="text-[#036638] font-semibold">{patient.flaggedByUser.name}</span>
                      {patient.flaggedAt &&
                        ` - ${new Date(patient.flaggedAt).toLocaleString()}`}
                    </p>
                  )}
                </div>
              )}

              {/* Donna's Response Section - when flag has been cleared */}
              {patient.flagClearedReason && (
                <div className="bg-[#EBF7EC] border border-[#65BD6C]/40 rounded-xl p-4 shadow-sm">
                  <p className="text-sm font-bold text-[#036638] flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Donna's Response
                  </p>
                  <p className="text-sm text-[#1A1B1E] mt-2 bg-white rounded-lg p-3 border border-[#65BD6C]/20">
                    {patient.flagClearedReason}
                  </p>
                  {patient.flagClearedByUser && (
                    <p className="text-[11px] text-[#6B7280] mt-2 font-medium">
                      by <span className="text-[#036638] font-semibold">Donna Rhodes</span>
                      {patient.flagClearedAt &&
                        ` - ${new Date(patient.flagClearedAt).toLocaleString()}`}
                    </p>
                  )}
                </div>
              )}

              {/* Patient Status & Access */}
              <div className="bg-gradient-to-br from-white/95 to-[#F9FAFB]/95 backdrop-blur-md border border-gray-200/60 rounded-3xl p-4 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden transition-all hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#EBF7EC]/50 to-transparent rounded-bl-full pointer-events-none" />
                
                <div className="flex items-center gap-2 mb-5 relative z-10">
                  <div className="p-1.5 bg-[#EBF7EC] rounded-lg border border-[#65BD6C]/20">
                    <Shield className="w-4 h-4 text-[#036638]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#1A1B1E] uppercase tracking-wide">
                    Status & Access
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                  {/* Status Side */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">
                      Current Status
                    </p>
                    <div className="flex flex-col items-start gap-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-all",
                          patient.status === "active" && "bg-white text-[#036638] border-[#65BD6C]/40 ring-1 ring-[#65BD6C]/10",
                          patient.status === "completed" && "bg-[#65BD6C]/10 text-[#025030] border-[#65BD6C]/40",
                          patient.status === "cancelled" && "bg-white text-red-700 border-red-200 ring-1 ring-red-100",
                        )}
                      >
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shadow-inner",
                            patient.status === "active" && "bg-[#3FA66E] shadow-[#025030]/40",
                            patient.status === "completed" && "bg-[#036638]",
                            patient.status === "cancelled" && "bg-red-500",
                          )}
                        />
                        {patient.status === "active"
                          ? "Active"
                          : patient.status === "completed"
                            ? "Completed"
                            : "Cancelled"}
                      </span>

                      {patient.isPrivate ? (
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border border-amber-300 bg-amber-50 text-amber-800 shadow-sm">
                          <Lock className="w-3.5 h-3.5" />
                          <div className="flex flex-col">
                            <span>Locked{patient.privateLockedByUser ? ` by ${patient.privateLockedByUser.name}` : ""}</span>
                            {patient.privateLockedAt && (
                              <span className="text-[9px] font-medium opacity-80 -mt-0.5">
                                {new Date(patient.privateLockedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : patient.status === "active" ? (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-white text-[#6B7280] shadow-sm">
                          <Unlock className="w-3.5 h-3.5" />
                          Open - any VA can work
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions Side */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">
                      Access Controls
                    </p>
                    <div className="flex flex-col gap-2.5">
                      {patient.isPrivate ? (
                        canUnlock ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unlockPatient.mutate(patient.id)}
                            disabled={unlockPatient.isPending}
                            className="w-full text-xs gap-2 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-900 transition-all shadow-sm font-semibold justify-start"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            {unlockPatient.isPending ? "Unlocking..." : "Unlock Access"}
                          </Button>
                        ) : (
                          <div className="text-xs text-amber-700/80 flex items-start gap-2 py-2 px-3 bg-amber-50/50 rounded-lg border border-amber-100">
                            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <p>Only <span className="font-semibold">{patient.privateLockedByUser?.name ?? "the locking VA"}</span> or an admin can edit.</p>
                          </div>
                        )
                      ) : canLock ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => lockPatient.mutate(patient.id)}
                          disabled={lockPatient.isPending}
                          className="w-full text-xs gap-2 border-[#036638]/30 text-[#036638] hover:text-[#025030] bg-[#F0F9F5] hover:bg-[#EBF7EC] hover:border-[#036638]/60 transition-all shadow-sm font-semibold justify-start"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          {lockPatient.isPending ? "Locking..." : "Lock (restrict other VAs)"}
                        </Button>
                      ) : (
                        <div className="text-xs text-[#6B7280] flex items-start gap-2 py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
                          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <p>Only the assigned VA or an admin can lock this patient.</p>
                        </div>
                      )}

                      {isAdmin && patient.status !== "cancelled" && !showCancelInput && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowCancelInput(true)}
                          className="w-full text-xs gap-2 border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-800 hover:border-red-300 transition-all shadow-sm font-semibold justify-start"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Mark Cancelled
                        </Button>
                      )}
                      {isAdmin && patient.status === "cancelled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: patient.id, status: "active" })}
                          disabled={updateStatus.isPending}
                          className="w-full text-xs gap-2 border-[#036638]/30 text-[#036638] hover:text-[#025030] hover:bg-[#EBF7EC] transition-all shadow-sm font-semibold justify-start"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          {updateStatus.isPending ? "Reactivating..." : "Reactivate Patient"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cancel Input Area */}
                <div className={cn(
                  "grid transition-all duration-300 ease-in-out",
                  (isAdmin && showCancelInput) || (patient.status === "cancelled" && patient.cancelledReason)
                    ? "grid-rows-[1fr] mt-5 opacity-100" 
                    : "grid-rows-[0fr] opacity-0"
                )}>
                  <div className="overflow-hidden">
                    <div className="pt-4 border-t border-gray-100">
                      {isAdmin && showCancelInput && (
                        <div className="space-y-3 bg-red-50/50 p-4 rounded-xl border border-red-100">
                          <p className="text-[11px] font-bold text-red-800 uppercase tracking-widest flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Cancellation Reason
                          </p>
                          <Textarea
                            placeholder="Optional reason for cancelling..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="text-sm min-h-[80px] bg-white border-red-200 focus:border-red-400 focus:ring-red-400"
                          />
                          <div className="flex gap-2.5">
                            <Button
                              size="sm"
                              onClick={handleCancelPatient}
                              disabled={updateStatus.isPending}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm"
                            >
                              {updateStatus.isPending ? "Cancelling..." : "Confirm Cancellation"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowCancelInput(false)}
                              className="text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {patient.status === "cancelled" && patient.cancelledReason && (
                        <div className="bg-red-50/80 border border-red-100 rounded-xl p-4 flex gap-3">
                          <div className="mt-0.5">
                            <Ban className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-red-800 mb-1">Cancellation Reason</p>
                            <p className="text-sm text-red-900/80 leading-relaxed">
                              {patient.cancelledReason}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact & Payment Info */}
              <div className="bg-white/90 backdrop-blur-md border border-gray-200/60 rounded-3xl p-4 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold text-[#036638] uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#036638] rounded-full"></span>
                    Contact & Payment Info
                  </p>
                  <Button
                    size="sm"
                    onClick={handleSaveContact}
                    disabled={savingContact || updatePatient.isPending}
                    className="bg-[#036638] hover:bg-[#025030] text-white text-xs"
                  >
                    {savingContact || updatePatient.isPending ? "Saving..." : "Save Details"}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      ["firstName", "First Name"],
                      ["lastName", "Last Name"],
                      ["location", "Location"],
                      ["phone", "Phone"],
                      ["email", "Email"],
                      ["copayAmount", "Copay Amount"],
                      ["amountPaid", "Total Paid"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">
                        {label}
                      </label>
                      <input
                        value={contactForm[key]}
                        onChange={(e) =>
                          setContactForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        className="w-full h-8 px-2.5 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30 bg-white"
                      />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">
                      Payment Type
                    </label>
                    <SelectOrOther
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      otherMode={paymentMethodOther}
                      onOtherModeChange={setPaymentMethodOther}
                      options={PAYMENT_METHOD_OPTIONS}
                      placeholder="Select payment type..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">
                      Insurance Company
                    </label>
                    <SelectOrOther
                      value={insuranceProvider}
                      onChange={setInsuranceProvider}
                      otherMode={insuranceProviderOther}
                      onOtherModeChange={setInsuranceProviderOther}
                      options={INSURANCE_PROVIDER_OPTIONS}
                      placeholder="Select insurance company..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">
                      Visit Status
                    </label>
                    <select
                      value={visitStatus}
                      onChange={(e) => setVisitStatus(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30 bg-white appearance-none cursor-pointer"
                    >
                      {VISIT_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Flag Controls */}
              {!patient.isFlagged ? (
                <div className={cn(
                  "border rounded-xl p-4 space-y-3",
                  isAdmin
                    ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/60"
                    : "bg-gradient-to-br from-red-50 to-pink-50 border-red-200/60"
                )}>
                  {!showFlagInput ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFlagInput(true)}
                      className={cn(
                        "text-xs gap-2 font-medium w-full justify-start",
                        isAdmin
                          ? "border-amber-300 text-amber-700 hover:text-amber-900 hover:bg-amber-100 hover:border-amber-400"
                          : "border-red-300 text-red-700 hover:text-red-900 hover:bg-red-100 hover:border-red-400"
                      )}
                    >
                      <Flag className="w-4 h-4" fill="currentColor" />
                      {isAdmin ? "Raise Admin Follow-up Flag" : "Flag for Donna"}
                    </Button>
                  ) : (
                    <div className="space-y-3.5">
                      <div>
                        <label className={cn(
                          "text-xs font-semibold block mb-1.5",
                          isAdmin ? "text-amber-900" : "text-red-900"
                        )}>
                          Related Stage (optional)
                        </label>
                        <select
                          value={flagStage}
                          onChange={(e) => setFlagStage(e.target.value as PatientStage | "")}
                          className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all"
                          style={{
                            borderColor: isAdmin ? '#daa520' : '#dc2626',
                            backgroundColor: 'rgba(255,255,255,0.7)',
                          }}
                        >
                          <option value="">-- Select stage (optional) --</option>
                          {stageOrder.map((stage) => (
                            <option key={stage} value={stage}>
                              {stageLabels[stage]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={cn(
                          "text-xs font-semibold block mb-1.5",
                          isAdmin ? "text-amber-900" : "text-red-900"
                        )}>
                          Reason <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                          placeholder={isAdmin ? "e.g., Missing lab results, needs review before billing..." : "e.g., Patient called, needs Donna's guidance..."}
                          value={flagReason}
                          onChange={(e) => setFlagReason(e.target.value)}
                          className="text-xs min-h-[70px] resize-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleFlag}
                          disabled={!flagReason.trim() || flagPatient.isPending}
                          className={cn(
                            "text-xs font-medium flex-1",
                            isAdmin
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : "bg-red-600 hover:bg-red-700 text-white"
                          )}
                        >
                          {flagPatient.isPending ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                              Flagging...
                            </>
                          ) : (
                            <>
                              <Flag className="w-3 h-3 mr-1.5" fill="currentColor" />
                              {isAdmin ? "Submit Admin Flag" : "Flag for Donna"}
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowFlagInput(false)
                            setFlagReason("")
                            setFlagStage("")
                          }}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : isAdmin && patient.isFlagged && !showClearInput ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearInput(true)}
                  className="text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-900 hover:border-red-300 w-full font-medium"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Clear Flag & Provide Feedback
                </Button>
              ) : null}

              {/* Clear Flag with Reason dialog (admin only) */}
              {isAdmin && showClearInput && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                    Provide Feedback to VA
                  </p>
                  <Textarea
                    placeholder="Explain why you're clearing this flag (sent to the VA who flagged)..."
                    value={clearReason}
                    onChange={(e) => setClearReason(e.target.value)}
                    className="text-sm min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleClearFlag}
                      disabled={!clearReason.trim() || clearFlag.isPending}
                      className="bg-[#036638] hover:bg-[#02804A] text-white text-xs"
                    >
                      {clearFlag.isPending ? "Clearing..." : "Confirm Clear"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowClearInput(false); setClearReason("") }}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Operational Notes */}
              <div className="bg-white/90 backdrop-blur-md border border-gray-200/60 rounded-3xl p-4 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
                <p className="text-[11px] font-bold text-[#036638] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#036638] rounded-full"></span>
                  Operational Notes
                </p>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add operational notes (no clinical data)..."
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    className="text-sm min-h-24 rounded-lg border-[#E5E7EB] focus:border-[#036638] focus:ring-[#036638]"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="bg-[#036638] hover:bg-[#025030] text-white text-xs font-semibold px-4 rounded-lg transition-all shadow-sm"
                    >
                      {savingNotes ? "Saving..." : "Save Notes"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Activity Log */}
              <div>
                <p className="text-[11px] font-bold text-[#036638] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Activity Log
                </p>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-gray-200/60">
                  {logData?.logs && logData.logs.length > 0 ? (
                    logData.logs.map((log) => {
                      const isAdminMessage = log.author === "Donna Rhodes" || log.author.toLowerCase() === "admin"
                      return (
                        <div
                          key={log.id}
                          className={cn(
                            "relative flex items-start gap-3 text-xs py-3 px-4 rounded-2xl ml-6 transition-all border bg-white shadow-sm hover:shadow-md",
                            isAdminMessage 
                              ? "border-[#65BD6C]/30 ring-1 ring-[#65BD6C]/10" 
                              : "border-gray-200/60"
                          )}
                        >
                          <div className={cn(
                            "absolute top-5 -left-[29px] w-2.5 h-2.5 rounded-full border-2 border-white ring-4 ring-white shadow-sm",
                            isAdminMessage ? "bg-[#036638]" : "bg-gray-400"
                          )} />
                          <span className={cn(
                            "text-[10px] whitespace-nowrap pt-0.5 min-w-[70px]",
                            isAdminMessage ? "text-[#036638] font-medium" : "text-[#9CA3AF]"
                          )}>
                            {new Date(log.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          <div className="flex flex-col gap-0.5 w-full">
                            <span className={cn(
                              "font-bold",
                              isAdminMessage ? "text-[#025030]" : "text-[#036638]"
                            )}>
                              {log.author}
                            </span>
                            <span className={cn(
                              "leading-relaxed",
                              isAdminMessage ? "text-[#1A1B1E] font-medium" : "text-[#4B5563]"
                            )}>{log.message}</span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-xs text-[#6B7280] italic">No activity yet</p>
                  )}
                </div>
              </div>
            </div>
            </div>
          </>
        )}
        {assigning && (
          <div className="absolute inset-0 z-50 bg-white/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-9 h-9 text-[#036638] animate-spin" />
            <p className="text-sm font-semibold text-[#036638]">Updating assignment...</p>
          </div>
        )}

        {/* Unified Flag Popup Modal */}
        {showFlagPopup && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 60 }}>
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-lg"
              onClick={() => setShowFlagPopup(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className={cn(
                "px-6 py-4 flex items-center justify-between",
                isAdmin
                  ? "bg-gradient-to-r from-[#65BD6C] to-[#036638]"
                  : "bg-gradient-to-r from-[#E15C4E] to-[#DC2626]"
              )}>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Flag className="w-5 h-5" fill="white" />
                  {isAdmin ? "Raise Flag for VAs" : "Raise Flag for Admin"}
                </h3>
                <button
                  onClick={() => setShowFlagPopup(false)}
                  className={cn(
                    "p-1 rounded-lg transition-colors",
                    isAdmin
                      ? "hover:bg-[#025030]/30 text-white"
                      : "hover:bg-red-900/30 text-white"
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Flag Type Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-3">
                    Flag Type
                  </label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="flagType"
                        value="positive"
                        checked={newFlagType === "positive"}
                        onChange={(e) => setNewFlagType(e.target.value as "positive" | "negative")}
                        className="w-4 h-4 accent-[#65BD6C]"
                      />
                      <span className="text-sm font-medium text-[#1A1B1E]">✅ Positive Note</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="flagType"
                        value="negative"
                        checked={newFlagType === "negative"}
                        onChange={(e) => setNewFlagType(e.target.value as "positive" | "negative")}
                        className="w-4 h-4 accent-[#E15C4E]"
                      />
                      <span className="text-sm font-medium text-[#1A1B1E]">⚠️ Alert/Issue</span>
                    </label>
                  </div>
                </div>

                {/* Reason Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
                    Reason <span className="text-[#E15C4E]">*</span>
                  </label>
                  <textarea
                    value={newFlagReason}
                    onChange={(e) => setNewFlagReason(e.target.value)}
                    placeholder={newFlagType === "positive"
                      ? "e.g., Excellent progress, great patient compliance..."
                      : "e.g., Missing lab results, needs immediate follow-up..."}
                    className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] resize-none min-h-[100px]"
                  />
                </div>

                {/* Info Box */}
                <div className={cn(
                  "p-3 rounded-lg text-xs font-medium",
                  newFlagType === "positive"
                    ? "bg-[#EBF7EC] border border-[#65BD6C]/40 text-[#036638]"
                    : "bg-[#FEE2E2] border border-[#E15C4E]/40 text-[#DC2626]"
                )}>
                  {newFlagType === "positive"
                    ? "✅ Positive flags highlight excellent work and progress."
                    : "⚠️ Alert flags indicate issues that need immediate follow-up."}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-[#E5E7EB] px-6 py-4 flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowFlagPopup(false)
                    setNewFlagReason("")
                    setNewFlagType("positive")
                  }}
                  className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:text-[#1A1B1E] hover:bg-[#F3F4F6] rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (patient && newFlagReason.trim()) {
                      await flagPatient.mutateAsync({ id: patient.id, reason: newFlagReason })
                      setShowFlagPopup(false)
                      setNewFlagReason("")
                      setNewFlagType("positive")
                      toast.success("Flag raised successfully")
                    }
                  }}
                  disabled={!newFlagReason.trim() || flagPatient.isPending}
                  className={cn(
                    "px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 uppercase tracking-wide",
                    newFlagReason.trim() && !flagPatient.isPending
                      ? isAdmin
                        ? "bg-[#65BD6C] hover:bg-[#036638] text-white cursor-pointer"
                        : "bg-[#E15C4E] hover:bg-[#DC2626] text-white cursor-pointer"
                      : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
                  )}
                >
                  {flagPatient.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Flag className="w-4 h-4" fill="currentColor" />
                      Raise Flag
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
