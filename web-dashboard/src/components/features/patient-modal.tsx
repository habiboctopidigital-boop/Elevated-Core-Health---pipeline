"use client"

import { useState, useEffect, useMemo } from "react"
import type { Patient, PatientStage } from "@/types"
import { ROLES, STALE_HOURS } from "@/constants"
import { useStageMeta } from "@/hooks/query/useStages"
import {
  X,
  Flag,
  Clock,
  Check,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  UserCheck,
  ChevronDown,
  Zap,
  Shield,
  Lock,
  Unlock,
  Ban,
  RefreshCw,
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
} from "@/hooks/query/usePatients"
import { usePatient } from "@/hooks/query/usePatients"
import { useActivityLog } from "@/hooks/query/useActivityLog"
import { cn } from "@/lib/utils"

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
  const [clearReason, setClearReason] = useState("")
  const [showClearInput, setShowClearInput] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("")
  const [insuranceProvider, setInsuranceProvider] = useState("")
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
  const checkEligibility = useCheckEligibility()

  useEffect(() => {
    if (patient?.notes) setNotesText(patient.notes)
    else setNotesText("")
    setPaymentMethod(patient?.paymentMethod ?? "")
    setInsuranceProvider(patient?.insuranceProvider ?? "")
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
  }, [patient?.id, patient?.notes, patient?.paymentMethod, patient?.insuranceProvider])

  // ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [open, onClose])

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

    // Phase 3: checklist gate applies to EVERYONE (admin included) — server enforces too.
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
    })
    setSavingContact(false)
  }

  const handleCancelPatient = async () => {
    if (!patient) return
    await updateStatus.mutateAsync({ id: patient.id, status: "cancelled", reason: cancelReason.trim() || null })
    setShowCancelInput(false)
    setCancelReason("")
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto mx-4 animate-in fade-in zoom-in-95 duration-200 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-[#036638] scrollbar-thumb-rounded">
        {isLoading || !patient ? (
          <div className="p-8 text-center text-[#6B7280] text-sm">
            {isLoading ? "Loading..." : "Patient not found"}
          </div>
        ) : (
          <>
            <div className="sticky top-0 bg-gradient-to-r from-[#036638] to-[#025030] border-b-0 px-8 py-6 flex items-start justify-between z-10 rounded-t-2xl shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-white truncate">
                    {patient.name}
                  </h2>
                  {patient.isFlagged && (
                    <Badge
                      variant="outline"
                      className="bg-white text-[#036638] border-white text-[10px] font-bold gap-1 shadow-sm"
                    >
                      <Flag className="w-3 h-3" fill="#036638" />
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
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full">
                    {stageLabels[patient.stage]}
                  </span>
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
              </div>
              <button
                onClick={onClose}
                title="Press ESC to close"
                className="p-2 rounded-lg hover:bg-white/15 text-white hover:text-white transition-all ml-4 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-7">
              {/* Stage Navigation */}
              <div className="bg-gradient-to-br from-[#F9FAFB] to-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
                <p className="text-[11px] font-bold text-[#036638] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#036638] rounded-full"></span>
                  Pipeline Stage
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {stageOrder.map((stage) => {
                    const idx = stageOrder.indexOf(stage)
                    const currentIdx = stageOrder.indexOf(patient.stage)
                    const isComplete = idx < currentIdx
                    const isCurrent = stage === patient.stage
                    const isNext = idx === currentIdx + 1
                    const isFuture = idx > currentIdx + 1

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
                      ? "Complete all checklist items before advancing"
                      : isFuture
                        ? "Complete the current stage first"
                        : null

                    return (
                      <button
                        key={stage}
                        onClick={() => isClickable && handleMoveStage(stage)}
                        disabled={moveStage.isPending || !isClickable}
                        title={isDisabledReason || stageLabels[stage]}
                        className={cn(
                          "flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all border",
                          // Current stage (dark green)
                          isCurrent &&
                            "bg-[#036638] text-white border-[#036638] shadow-md cursor-default",
                          // Completed stages (light green, clickable to go back)
                          !isCurrent && isComplete &&
                            "bg-[#EBF7EC] text-[#036638] border-[#65BD6C]/50 hover:bg-[#dff4eb] cursor-pointer",
                          // Next stage when checklist COMPLETE (white, clickable)
                          !isCurrent && !isComplete && !isFuture && isClickable &&
                            "bg-white text-[#036638] border-[#036638] hover:border-[#036638] hover:shadow-md cursor-pointer font-bold",
                          // Next stage when checklist INCOMPLETE or future stages (gray, DISABLED)
                          !isCurrent && !isComplete && !isClickable &&
                            "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-60 line-through",
                          // Future unreachable stages (light gray)
                          isFuture && !isClickable &&
                            "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed opacity-40",
                        )}
                      >
                        {isComplete && <Check className="w-3.5 h-3.5" />}
                        {stageLabels[stage]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Checklist */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold text-[#036638] uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#036638] rounded-full"></span>
                    Checklist - {stageLabels[patient.stage]}
                  </p>
                  {!allComplete && totalItems > 0 && !isAdmin && (
                    <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
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
                        No required items — this stage can advance without checking anything.
                      </p>
                    )}

                    {/* Checklist Items */}
                    <div className="space-y-2">
                      {currentStageItems.map((item) => {
                        const checked = !!currentState[item.id]
                        return (
                          <label
                            key={item.id}
                            className="flex items-start gap-2.5 py-3 px-3 rounded-lg hover:bg-[#F9FAFB] cursor-pointer transition-all border border-transparent hover:border-[#E5E7EB] group"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleChecklist.mutate({
                                  id: patient.id,
                                  itemId: item.id,
                                  checked: !checked,
                                })
                              }
                              className="mt-1 w-5 h-5 rounded border-[#E5E7EB] text-[#036638] focus:ring-[#036638] accent-[#036638] cursor-pointer"
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
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <Zap className="w-5 h-5 text-amber-600" />
                  <p className="text-[11px] font-bold text-amber-900 uppercase tracking-widest">
                    Standard Operating Procedure
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {STAGE_SOPs[patient.stage]?.map((sop, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-900">
                      <span className="text-amber-600 font-bold mt-0.5">•</span>
                      <span>{sop}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Eligibility Check */}
              <div className="bg-gradient-to-br from-[#F0F9F5] to-[#E8F5F2] border border-[#65BD6C]/30 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-5 h-5 text-[#036638]" />
                    <p className="text-[11px] font-bold text-[#036638] uppercase tracking-widest">
                      Eligibility Check
                    </p>
                  </div>
                  <button
                    onClick={handleCheckEligibility}
                    disabled={checkEligibility.isPending}
                    className={cn(
                      "text-[10px] font-medium px-2.5 py-1 rounded transition-all",
                      checkEligibility.isPending
                        ? "bg-[#036638]/20 text-[#036638] cursor-wait"
                        : "bg-[#036638] text-white hover:bg-[#025030]",
                    )}
                  >
                    {checkEligibility.isPending
                      ? "Checking..."
                      : patient.eligibilityStatus !== "not_checked"
                        ? "Re-check Eligibility"
                        : "Check Eligibility"}
                  </button>
                </div>

                {/* Payment details used for the check (persisted to the patient record) */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">
                      Payment Method
                    </label>
                    <input
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      placeholder="e.g. Self-pay, Insurance"
                      className="w-full h-8 px-2.5 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">
                      Insurance Provider
                    </label>
                    <input
                      value={insuranceProvider}
                      onChange={(e) => setInsuranceProvider(e.target.value)}
                      placeholder="e.g. Blue Cross Blue Shield"
                      className="w-full h-8 px-2.5 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30 bg-white"
                    />
                  </div>
                </div>

                {patient.eligibilityStatus === "eligible" && (
                  <div className="bg-white rounded-lg p-3 border border-[#65BD6C]/40 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-700">Eligible</p>
                    {patient.eligibilityCheckedAt && (
                      <span className="text-[10px] text-[#6B7280] ml-auto">
                        Checked {new Date(patient.eligibilityCheckedAt).toLocaleString()}
                      </span>
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
                    {patient.eligibilityReason && (
                      <p className="text-xs text-red-700/80 mt-1.5">{patient.eligibilityReason}</p>
                    )}
                  </div>
                )}

                {patient.eligibilityStatus === "not_checked" && (
                  <p className="text-sm text-[#6B7280] italic mb-3">
                    Click "Check Eligibility" to compare this patient's payment details
                    against the configured rules.
                  </p>
                )}

                {patient.eligibilityDetails?.vob && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
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

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                {patient.appointmentDatetime && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-[#E5E7EB]">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-2">
                      Appointment
                    </p>
                    <p className="text-sm text-[#1A1B1E] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#65BD6C]" />
                      {new Date(patient.appointmentDatetime).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
                {patient.assignedUser && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-[#E5E7EB]">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-2">
                      Assigned To
                    </p>
                    <p className="text-sm font-medium text-[#1A1B1E]">
                      {patient.assignedUser.name}
                    </p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-3 border border-[#E5E7EB]">
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-2">
                    Source
                  </p>
                  <p className="text-sm font-medium text-[#1A1B1E] capitalize">
                    {patient.source || "Manual"}
                  </p>
                </div>
                {patient.bookingPlatform && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-[#E5E7EB]">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-2">
                      Booking Platform
                    </p>
                    <p className="text-sm font-medium text-[#1A1B1E]">
                      {patient.bookingPlatform}
                    </p>
                  </div>
                )}
                {patient.paymentMethod && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-[#E5E7EB]">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-2">
                      Payment Method
                    </p>
                    <p className="text-sm font-medium text-[#1A1B1E]">
                      {patient.paymentMethod}
                    </p>
                  </div>
                )}
                {patient.insuranceProvider && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-[#E5E7EB]">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-2">
                      Insurance Provider
                    </p>
                    <p className="text-sm font-medium text-[#1A1B1E]">
                      {patient.insuranceProvider}
                    </p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-3 border border-[#E5E7EB]">
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
                        ` • ${new Date(patient.flaggedAt).toLocaleString()}`}
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
                        ` • ${new Date(patient.flagClearedAt).toLocaleString()}`}
                    </p>
                  )}
                </div>
              )}

              {/* Patient Status & Access (admin / assigned VA) */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
                <p className="text-[11px] font-bold text-[#036638] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#036638] rounded-full"></span>
                  Status & Access
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Lock / Unlock */}
                  {patient.isPrivate ? (
                    <>
                      <span className="text-xs text-[#6B7280] mr-1">
                        Locked{patient.privateLockedByUser ? ` by ${patient.privateLockedByUser.name}` : ""} — only they or an admin can edit.
                      </span>
                      {canUnlock && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unlockPatient.mutate(patient.id)}
                          disabled={unlockPatient.isPending}
                          className="text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          Unlock
                        </Button>
                      )}
                    </>
                  ) : canLock ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => lockPatient.mutate(patient.id)}
                      disabled={lockPatient.isPending}
                      className="text-xs gap-1.5 border-[#036638]/30 text-[#036638] hover:bg-[#EBF7EC]"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Lock (restrict other VAs)
                    </Button>
                  ) : (
                    <span className="text-xs text-[#6B7280]">Open — any VA can work this patient.</span>
                  )}

                  {/* Cancel / Reactivate (admin) */}
                  {isAdmin && patient.status !== "cancelled" && !showCancelInput && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCancelInput(true)}
                      className="text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 ml-2"
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
                      className="text-xs gap-1.5 border-[#036638]/30 text-[#036638] hover:bg-[#EBF7EC] ml-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reactivate
                    </Button>
                  )}
                </div>

                {isAdmin && showCancelInput && (
                  <div className="space-y-2 mt-3">
                    <Textarea
                      placeholder="Reason for cancelling (optional)..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCancelPatient}
                        disabled={updateStatus.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs"
                      >
                        {updateStatus.isPending ? "Cancelling..." : "Confirm Cancellation"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCancelInput(false)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {patient.status === "cancelled" && patient.cancelledReason && (
                  <p className="text-xs text-[#6B7280] mt-2 bg-red-50 border border-red-100 rounded-lg p-2.5">
                    <span className="font-semibold text-red-700">Reason:</span> {patient.cancelledReason}
                  </p>
                )}
              </div>

              {/* Contact & Payment Info */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
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
                <div className="grid grid-cols-2 gap-3">
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
                </div>
              </div>

              {/* Flag Controls */}
              {!isAdmin && !patient.isFlagged ? (
                <div>
                  {showFlagInput ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Reason for flagging Donna..."
                        value={flagReason}
                        onChange={(e) => setFlagReason(e.target.value)}
                        className="text-sm min-h-[60px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleFlag}
                          disabled={!flagReason.trim() || flagPatient.isPending}
                          className="bg-[#036638] hover:bg-[#025030] text-white text-xs"
                        >
                          {flagPatient.isPending ? "Flagging..." : "Flag for Donna"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFlagInput(false)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFlagInput(true)}
                      className="text-xs gap-1.5 border-[#036638]/30 text-[#036638] hover:bg-[#EBF7EC] hover:border-[#036638]/60 transition-colors"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      Flag for Donna
                    </Button>
                  )}
                </div>
              ) : isAdmin && patient.isFlagged && !showClearInput ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearInput(true)}
                  className="text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-300 hover:text-black"
                >
                  Clear Flag with Feedback
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

              {/* Claim / Assign - show dropdown for VAs, simple claim for unassigned */}
              {(isAdmin || (!patient.assignedUser && user?.role === "va")) && vaList && (
                <div>
                  <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
                    Assign Patient
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {!isAdmin && (
                      <Button
                        size="sm"
                        onClick={handleClaim}
                        disabled={claimPatient.isPending}
                        className="bg-[#036638] hover:bg-[#025030] text-white text-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1" />
                        {claimPatient.isPending ? "Claiming..." : "Assign to Me"}
                      </Button>
                    )}
                    <div className="relative inline-block">
                      <select
                        onChange={(e) => {
                          const val = e.target.value
                          if (val) {
                            assignPatient.mutate({ id: patient.id, assignedTo: val })
                          }
                          e.target.value = ""
                        }}
                        value=""
                        className="appearance-none text-xs border border-[#E5E7EB] rounded-md px-3 py-1.5 pr-8 text-[#1A1B1E] bg-white cursor-pointer hover:border-[#65BD6C]/40 focus:outline-none focus:ring-1 focus:ring-[#036638]"
                      >
                        <option value="">Assign to VA...</option>
                        {vaList.filter((v) => v.id !== user?.id).map((va) => (
                          <option key={va.id} value={va.id}>
                            {va.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-[#6B7280] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* Operational Notes */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
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
                <div className="space-y-2 max-h-56 overflow-y-auto pr-2 bg-gray-50 rounded-xl p-4 border border-[#E5E7EB]">
                  {logData?.logs && logData.logs.length > 0 ? (
                    logData.logs.map((log) => {
                      const isAdminMessage = log.author === "Donna Rhodes" || log.author.toLowerCase() === "admin"
                      return (
                        <div
                          key={log.id}
                          className={cn(
                            "flex items-start gap-2.5 text-xs py-2 px-2.5 rounded-md mb-1 transition-colors border-b",
                            isAdminMessage 
                              ? "bg-[#EBF7EC]/80 border-[#65BD6C]/20 shadow-sm" 
                              : "border-[#E5E7EB]/30 hover:bg-gray-50/50"
                          )}
                        >
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
          </>
        )}
      </div>
    </div>
  )
}
