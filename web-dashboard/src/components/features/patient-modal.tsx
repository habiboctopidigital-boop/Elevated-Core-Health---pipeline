// "use client"

// import { useState, useEffect, useMemo, useRef } from "react"
// import type { Patient, PatientStage } from "@/types"
// import { ROLES, STALE_HOURS } from "@/constants"
// import { useStageMeta } from "@/hooks/query/useStages"
// import {
//   X,
//   Flag,
//   Check,
//   CheckCheck,
//   CheckCircle,
//   XCircle,
//   AlertTriangle,
//   MessageSquare,
//   ListX,
//   Loader2,
//   UserCheck,
//   ChevronDown,
//   Zap,
//   Shield,
//   Lock,
//   Unlock,
//   Ban,
//   RefreshCw,
//   Calendar,
//   Pencil,
//   UserPlus,
// } from "lucide-react"
// import { Button } from "@/components/ui/button"
// import { Textarea } from "@/components/ui/textarea"
// import { Badge } from "@/components/ui/badge"
// import { useAuth } from "@/hooks/auth/useAuth"
// import {
//   useMoveStage,
//   useToggleChecklist,
//   useUpdateNotes,
//   useFlagPatient,
//   useClearFlag,
//   useClaimPatient,
//   useAssignPatient,
//   useChecklistItems,
//   useListVas,
//   useCheckEligibility,
//   useUpdatePatient,
//   useLockPatient,
//   useUnlockPatient,
//   useUpdatePatientStatus,
//   useUpdateAppointment,
// } from "@/hooks/query/usePatients"
// import { usePatient } from "@/hooks/query/usePatients"
// import { useActivityLog } from "@/hooks/query/useActivityLog"
// import { SelectOrOther } from "@/components/shared/select-or-other"
// import { PAYMENT_METHOD_OPTIONS, INSURANCE_PROVIDER_OPTIONS, VISIT_STATUS_OPTIONS } from "@/lib/patient-options"
// import { cn } from "@/lib/utils"
// import { toast } from "sonner"

// interface PatientModalProps {
//   patientId: string | null
//   open: boolean
//   onClose: () => void
// }

// const STAGE_SOPs: Record<PatientStage, string[]> = {
//   onboarding: [
//     "Confirm appointment date and time in calendar",
//     "Verify patient contact information (phone, email)",
//     "Send welcome email with pre-visit instructions",
//     "Ensure intake form is completed",
//   ],
//   visit_complete: [
//     "Document visit completion in Optimantra",
//     "Verify all vital signs recorded",
//     "Confirm provider's clinical notes entered",
//     "Flag any abnormalities for review",
//   ],
//   post_visit_docs: [
//     "Generate and send patient instruction letter",
//     "Order and submit required lab work",
//     "Attach lab request forms to patient record",
//     "Confirm patient received all documents",
//   ],
//   chart_signed: [
//     "Ensure Optimantra note is signed by provider",
//     "Run pre-billing clawback check",
//     "Verify CPT codes match services rendered",
//     "Confirm ICD-10 codes are documented",
//     "Check documentation supports diagnosis",
//   ],
//   sent_to_billing: [
//     "Verify claim submission to billing system",
//     "Record claim number and submission date",
//     "Set follow-up reminder for claim status",
//     "Attach claim submission confirmation",
//   ],
//   payment_posted: [
//     "Record payment amount and date received",
//     "Match payment to submitted claim",
//     "Update insurance payer information",
//     "Flag any payment discrepancies",
//   ],
//   reconciled: [
//     "Verify all payments received match billing",
//     "Close patient record in system",
//     "Archive supporting documentation",
//     "Record final reconciliation details",
//   ],
// }

// function timeAgo(dateStr: string): string {
//   const diff = Date.now() - new Date(dateStr).getTime()
//   const hours = Math.floor(diff / (1000 * 60 * 60))
//   if (hours < 1) return "< 1h ago"
//   if (hours < 24) return `${hours}h ago`
//   const days = Math.floor(hours / 24)
//   return `${days}d ago`
// }

// function toLocalDatetimeLocal(date: Date): string {
//   const pad = (n: number) => String(n).padStart(2, "0")
//   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
// }

// const VOB_LABELS: Array<[string, string]> = [
//   ["coverage", "Coverage"],
//   ["payer", "Payer"],
//   ["memberId", "Member ID"],
//   ["groupNumber", "Group Number"],
//   ["copay", "Copay"],
//   ["coinsurance", "Coinsurance"],
//   ["deductible", "Deductible"],
//   ["deductibleMet", "Deductible Met"],
//   ["outOfPocketMax", "Out-of-Pocket Max"],
//   ["authorizationRequired", "Authorization"],
//   ["visitsCoveredPerYear", "Visits / Year"],
//   ["checkDate", "Checked"],
// ]

// export function PatientModal({ patientId, open, onClose }: PatientModalProps) {
//   const { user } = useAuth()
//   const isAdmin = user?.role === "admin"
//   const { order: stageOrder, labels: stageLabels, byKey: stageByKey } = useStageMeta()
//   const { data: patient, isLoading } = usePatient(patientId || "")
//   const { data: logData } = useActivityLog(
//     patientId ? { patientId, limit: 20 } : undefined,
//   )

//   const moveStage = useMoveStage()
//   const toggleChecklist = useToggleChecklist()
//   const updateNotes = useUpdateNotes()
//   const flagPatient = useFlagPatient()
//   const clearFlag = useClearFlag()
//   const claimPatient = useClaimPatient()
//   const assignPatient = useAssignPatient()
//   const updatePatient = useUpdatePatient()
//   const lockPatient = useLockPatient()
//   const unlockPatient = useUnlockPatient()
//   const updateStatus = useUpdatePatientStatus()

//   const { data: checklistDefs } = useChecklistItems()

//   const currentStageItems = useMemo(() => {
//     if (!checklistDefs || !patient) return []
//     return checklistDefs
//       .filter((item) => item.stage === patient.stage)
//       .sort((a, b) => a.sortOrder - b.sortOrder)
//   }, [checklistDefs, patient])

//   const currentState = patient?.checklistState?.[patient.stage] || {}

//   const requiredItems = currentStageItems.filter((item) => item.status === "required")
//   const totalItems = requiredItems.length
//   const completedItems = requiredItems.filter(
//     (item) => currentState[item.id] === true,
//   ).length
//   const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100
//   const allComplete = totalItems === 0 || completedItems === totalItems

//   const { data: vaList } = useListVas()

//   const [notesText, setNotesText] = useState("")
//   const [flagReason, setFlagReason] = useState("")
//   const [showFlagInput, setShowFlagInput] = useState(false)
//   const [flagStage, setFlagStage] = useState<PatientStage | "">("")
//   const [showFlagPopup, setShowFlagPopup] = useState(false)
//   const [newFlagReason, setNewFlagReason] = useState("")
//   const [newFlagType, setNewFlagType] = useState<"positive" | "negative">("positive")
//   const [showAllFlags, setShowAllFlags] = useState(false)
//   const [clearReason, setClearReason] = useState("")
//   const [showClearInput, setShowClearInput] = useState(false)
//   const [savingNotes, setSavingNotes] = useState(false)
//   const [paymentMethod, setPaymentMethod] = useState("")
//   const [insuranceProvider, setInsuranceProvider] = useState("")
//   const [paymentMethodOther, setPaymentMethodOther] = useState(false)
//   const [insuranceProviderOther, setInsuranceProviderOther] = useState(false)
//   const [visitStatus, setVisitStatus] = useState("not_visited")
//   const [contactForm, setContactForm] = useState({
//     firstName: "",
//     lastName: "",
//     location: "",
//     phone: "",
//     email: "",
//     copayAmount: "",
//     amountPaid: "",
//   })
//   const [savingContact, setSavingContact] = useState(false)
//   const [cancelReason, setCancelReason] = useState("")
//   const [showCancelInput, setShowCancelInput] = useState(false)
//   const [editingAppointment, setEditingAppointment] = useState(false)
//   const [newAppointmentDatetime, setNewAppointmentDatetime] = useState("")
//   const checkEligibility = useCheckEligibility()
//   const updateAppointment = useUpdateAppointment()

//   const [bulkPending, setBulkPending] = useState(false)
//   const [assigning, setAssigning] = useState(false)
//   const [assignFeedback, setAssignFeedback] = useState<{
//     type: "success" | "error"
//     message: string
//   } | null>(null)
//   const assignFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
//   const checklistBusy = toggleChecklist.isPending || bulkPending

//   useEffect(() => () => {
//     if (assignFeedbackTimer.current) clearTimeout(assignFeedbackTimer.current)
//   }, [])

//   useEffect(() => {
//     if (patient?.notes) setNotesText(patient.notes)
//     else setNotesText("")
//     const pm = patient?.paymentMethod ?? ""
//     const ip = patient?.insuranceProvider ?? ""
//     setPaymentMethod(pm)
//     setInsuranceProvider(ip)
//     setPaymentMethodOther(pm !== "" && !PAYMENT_METHOD_OPTIONS.includes(pm))
//     setInsuranceProviderOther(ip !== "" && !INSURANCE_PROVIDER_OPTIONS.includes(ip))
//     setVisitStatus(patient?.visitStatus ?? "not_visited")
//     setContactForm({
//       firstName: patient?.firstName ?? "",
//       lastName: patient?.lastName ?? "",
//       location: patient?.location ?? "",
//       phone: patient?.phone ?? "",
//       email: patient?.email ?? "",
//       copayAmount: patient?.copayAmount ?? "",
//       amountPaid: patient?.amountPaid ?? "",
//     })
//     setShowFlagInput(false)
//     setFlagReason("")
//     setShowClearInput(false)
//     setClearReason("")
//     setShowCancelInput(false)
//     setCancelReason("")
//     setEditingAppointment(false)
//     if (patient?.appointmentDatetime) {
//       const dt = new Date(patient.appointmentDatetime)
//       setNewAppointmentDatetime(toLocalDatetimeLocal(dt))
//     } else {
//       setNewAppointmentDatetime("")
//     }
//     setAssigning(false)
//     setAssignFeedback(null)
//   }, [patient?.id, patient?.notes, patient?.paymentMethod, patient?.insuranceProvider, patient?.appointmentDatetime])

//   useEffect(() => {
//     const handleEscape = (e: KeyboardEvent) => {
//       if (e.key === "Escape" && open && !assigning) {
//         onClose()
//       }
//     }
//     window.addEventListener("keydown", handleEscape)
//     return () => window.removeEventListener("keydown", handleEscape)
//   }, [open, onClose, assigning])

//   const handleSaveNotes = async () => {
//     if (!patient) return
//     setSavingNotes(true)
//     await updateNotes.mutateAsync({ id: patient.id, notes: notesText })
//     setSavingNotes(false)
//   }

//   const handleFlag = async () => {
//     if (!patient || !flagReason.trim()) return
//     await flagPatient.mutateAsync({ id: patient.id, reason: flagReason })
//     setShowFlagInput(false)
//     setFlagReason("")
//     setFlagStage("")
//   }

//   const handleClearFlag = async () => {
//     if (!patient || !clearReason.trim()) return
//     await clearFlag.mutateAsync({ id: patient.id, clearReason })
//     setShowClearInput(false)
//     setClearReason("")
//   }

//   const handleMoveStage = async (target: PatientStage) => {
//     if (!patient) return
//     const currentIdx = stageOrder.indexOf(patient.stage)
//     const targetIdx = stageOrder.indexOf(target)
//     if (targetIdx > currentIdx && !allComplete) return
//     await moveStage.mutateAsync({ id: patient.id, targetStage: target })
//   }

//   const handleClaim = async () => {
//     if (!patient || !user) return
//     await claimPatient.mutateAsync({ id: patient.id, userId: user.id })
//   }

//   const handleCheckEligibility = async () => {
//     if (!patient) return
//     await checkEligibility.mutateAsync({
//       id: patient.id,
//       paymentMethod: paymentMethod.trim() || null,
//       insuranceProvider: insuranceProvider.trim() || null,
//     })
//   }

//   const handleSaveContact = async () => {
//     if (!patient) return
//     setSavingContact(true)
//     await updatePatient.mutateAsync({
//       id: patient.id,
//       firstName: contactForm.firstName.trim() || null,
//       lastName: contactForm.lastName.trim() || null,
//       location: contactForm.location.trim() || null,
//       phone: contactForm.phone.trim() || null,
//       email: contactForm.email.trim() || null,
//       copayAmount: contactForm.copayAmount.trim() || null,
//       amountPaid: contactForm.amountPaid.trim() || null,
//       paymentMethod: paymentMethod.trim() || null,
//       insuranceProvider: insuranceProvider.trim() || null,
//       visitStatus,
//     })
//     setSavingContact(false)
//   }

//   const handleCancelPatient = async () => {
//     if (!patient) return
//     await updateStatus.mutateAsync({ id: patient.id, status: "cancelled", reason: cancelReason.trim() || null })
//     setShowCancelInput(false)
//     setCancelReason("")
//   }

//   const handleUpdateAppointment = async () => {
//     if (!patient || !newAppointmentDatetime.trim()) return
//     const isoDatetime = new Date(newAppointmentDatetime).toISOString()
//     await updateAppointment.mutateAsync({ id: patient.id, appointmentDatetime: isoDatetime })
//     setEditingAppointment(false)
//   }

//   const handleAssignTo = async (vaId: string) => {
//     if (!patient || !vaId) return
//     setAssigning(true)
//     setAssignFeedback(null)
//     try {
//       await assignPatient.mutateAsync({ id: patient.id, assignedTo: vaId })
//       const va = vaList?.find((v) => v.id === vaId)
//       setAssignFeedback({ type: "success", message: `Assigned to ${va?.name ?? "VA"}` })
//     } catch (err: unknown) {
//       const apiMessage = (
//         err as { response?: { data?: { message?: string } } }
//       )?.response?.data?.message
//       setAssignFeedback({
//         type: "error",
//         message: apiMessage || "Failed to assign this patient",
//       })
//     } finally {
//       setAssigning(false)
//       if (assignFeedbackTimer.current) clearTimeout(assignFeedbackTimer.current)
//       assignFeedbackTimer.current = setTimeout(() => setAssignFeedback(null), 4000)
//     }
//   }

//   const handleBulkChecklist = async (checked: boolean) => {
//     if (!patient) return
//     const itemsToChange = currentStageItems.filter(
//       (item) => !!currentState[item.id] !== checked,
//     )
//     if (itemsToChange.length === 0) {
//       toast.info(checked ? "All items are already checked" : "No checklist items are checked")
//       return
//     }
//     setBulkPending(true)
//     try {
//       for (const item of itemsToChange) {
//         await toggleChecklist.mutateAsync({ id: patient.id, itemId: item.id, checked })
//       }
//       toast.success(`Checklist updated (${itemsToChange.length} item${itemsToChange.length > 1 ? "s" : ""})`)
//     } catch {}
//     finally {
//       setBulkPending(false)
//     }
//   }

//   const canLock =
//     !!patient && (isAdmin || patient.assignedTo === user?.id)
//   const canUnlock =
//     !!patient &&
//     (isAdmin || patient.assignedTo === user?.id || patient.privateLockedByUser?.id === user?.id)

//   const stale =
//     patient &&
//     !(stageByKey.get(patient.stage)?.isFinal ?? false) &&
//     (Date.now() - new Date(patient.updatedAt).getTime()) / (1000 * 60 * 60) >
//       STALE_HOURS

//   if (!open) return null

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
//       <div
//         className="absolute inset-0 bg-black/60 backdrop-blur-md"
//         onClick={() => !assigning && onClose()}
//       />
//       <div className="relative w-full max-w-4xl max-h-[92vh] bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/40 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
//         {isLoading || !patient ? (
//           <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
//             {isLoading ? (
//               <div className="flex flex-col items-center gap-4">
//                 <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
//                 <p className="text-sm font-semibold text-gray-700">Loading patient details...</p>
//               </div>
//             ) : (
//               <p className="text-sm text-gray-500">Patient not found</p>
//             )}
//           </div>
//         ) : (
//           <>
//             {/* Slim Top Bar */}
//             <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-sm">
//               <div className="flex items-center gap-3 min-w-0 flex-1">
//                 <div className="flex items-center gap-2 min-w-0">
//                   <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
//                     {patient.name}
//                   </h2>
//                   <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-gray-300" />
//                   <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
//                     {stageLabels[patient.stage]}
//                   </span>
//                 </div>
//                 <div className="flex items-center gap-1.5 flex-wrap">
//                   {patient.isFlagged && (
//                     <span className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 rounded-full flex items-center gap-1">
//                       <Flag className="w-3 h-3" /> Flagged
//                     </span>
//                   )}
//                   {stale && (
//                     <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1">
//                       <AlertTriangle className="w-3 h-3" /> Stale
//                     </span>
//                   )}
//                   {patient.assignedTo && vaList ? (
//                     <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1">
//                       <UserCheck className="w-3 h-3" /> {vaList.find(v => v.id === patient.assignedTo)?.name ?? "Assigned"}
//                     </span>
//                   ) : (
//                     <span className="px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 rounded-full flex items-center gap-1">
//                       Unassigned
//                     </span>
//                   )}
//                   {patient.isPrivate && (
//                     <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1">
//                       <Lock className="w-3 h-3" /> Locked
//                     </span>
//                   )}
//                 </div>
//               </div>
//               <div className="flex items-center gap-1.5">
//                 <button
//                   onClick={() => setShowFlagPopup(true)}
//                   className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
//                   title="Raise flag"
//                 >
//                   <Flag className="w-4 h-4" />
//                 </button>
//                 <button
//                   onClick={onClose}
//                   className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
//                   title="Close"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>
//             </div>

//             <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-gray-50 scrollbar-thumb-gray-300">
//               <div className="p-4 sm:p-6 space-y-5">
//                 {/* Quick Actions */}
//                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
//                   {/* Appointment */}
//                   <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
//                     <div className="flex items-center justify-between mb-2">
//                       <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Appointment</h4>
//                       <button
//                         onClick={() => setEditingAppointment(!editingAppointment)}
//                         className="p-1 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
//                       >
//                         <Pencil className="w-3.5 h-3.5" />
//                       </button>
//                     </div>
//                     {editingAppointment ? (
//                       <div className="space-y-2">
//                         <input
//                           type="datetime-local"
//                           value={newAppointmentDatetime}
//                           onChange={(e) => setNewAppointmentDatetime(e.target.value)}
//                           className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
//                         />
//                         <div className="flex gap-2">
//                           <button
//                             onClick={handleUpdateAppointment}
//                             disabled={updateAppointment.isPending || !newAppointmentDatetime.trim()}
//                             className="flex-1 px-3 py-1.5 text-xs font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
//                           >
//                             {updateAppointment.isPending ? "Saving..." : "Save"}
//                           </button>
//                           <button
//                             onClick={() => {
//                               setEditingAppointment(false)
//                               if (patient.appointmentDatetime) setNewAppointmentDatetime(toLocalDatetimeLocal(new Date(patient.appointmentDatetime)))
//                               else setNewAppointmentDatetime("")
//                             }}
//                             className="px-3 py-1.5 text-xs font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
//                           >
//                             Cancel
//                           </button>
//                         </div>
//                       </div>
//                     ) : (
//                       <p className="text-sm font-medium text-gray-700">
//                         {patient.appointmentDatetime
//                           ? new Date(patient.appointmentDatetime).toLocaleString("en-US", {
//                               month: "short",
//                               day: "numeric",
//                               year: "numeric",
//                               hour: "numeric",
//                               minute: "2-digit",
//                             })
//                           : "Not scheduled"}
//                       </p>
//                     )}
//                   </div>

//                   {/* Eligibility */}
//                   <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
//                     <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Eligibility</h4>
//                     <div className="flex items-center justify-between">
//                       <span className={cn(
//                         "text-sm font-medium",
//                         patient.eligibilityStatus === "eligible" ? "text-emerald-700" :
//                         patient.eligibilityStatus === "not_eligible" ? "text-red-700" : "text-gray-500"
//                       )}>
//                         {patient.eligibilityStatus === "eligible" ? "Eligible" :
//                          patient.eligibilityStatus === "not_eligible" ? "Not Eligible" : "Not Checked"}
//                       </span>
//                       <button
//                         onClick={handleCheckEligibility}
//                         disabled={checkEligibility.isPending}
//                         className="px-3 py-1.5 text-xs font-medium rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
//                       >
//                         {checkEligibility.isPending ? "Checking..." : "Check"}
//                       </button>
//                     </div>
//                   </div>

//                   {/* Assignment */}
//                   <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
//                     <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Assignment</h4>
//                     {(!!vaList && (isAdmin || !patient.assignedUser)) ? (
//                       <div className="relative">
//                         <select
//                           onChange={(e) => {
//                             const val = e.target.value
//                             e.target.value = ""
//                             if (val) handleAssignTo(val)
//                           }}
//                           value=""
//                           disabled={assigning}
//                           className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
//                         >
//                           <option value="">{patient.assignedUser ? "Reassign..." : "Assign to VA..."}</option>
//                           {vaList.filter(v => v.id !== user?.id).map(va => (
//                             <option key={va.id} value={va.id}>{va.name}</option>
//                           ))}
//                         </select>
//                         <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
//                       </div>
//                     ) : (
//                       <p className="text-sm text-gray-500">
//                         {patient.assignedUser ? patient.assignedUser.name : "Unassigned"}
//                       </p>
//                     )}
//                     {assignFeedback && (
//                       <p className={cn(
//                         "text-xs mt-1.5 font-medium",
//                         assignFeedback.type === "success" ? "text-emerald-700" : "text-red-600"
//                       )}>
//                         {assignFeedback.message}
//                       </p>
//                     )}
//                   </div>
//                 </div>

//                 {/* Stage Pipeline */}
//                 <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
//                   <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pipeline Stage</h4>
//                   <div className="flex w-full overflow-x-auto pb-1 gap-0.5">
//                     {stageOrder.map((stage, idx) => {
//                       const currentIdx = stageOrder.indexOf(patient.stage)
//                       const isComplete = idx < currentIdx
//                       const isCurrent = stage === patient.stage
//                       const isNext = idx === currentIdx + 1
//                       const isClickable = isCurrent ? false : isComplete ? true : isNext ? allComplete : false
//                       return (
//                         <button
//                           key={stage}
//                           onClick={() => isClickable && handleMoveStage(stage)}
//                           disabled={!isClickable}
//                           className={cn(
//                             "flex-1 min-w-[60px] flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl transition-all",
//                             isCurrent ? "bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-gray-50",
//                             !isClickable && "opacity-50 cursor-not-allowed"
//                           )}
//                         >
//                           <span className={cn(
//                             "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2",
//                             isCurrent && "bg-emerald-600 border-emerald-600 text-white",
//                             isComplete && !isCurrent && "bg-emerald-100 border-emerald-300 text-emerald-700",
//                             !isCurrent && !isComplete && "bg-white border-gray-200 text-gray-400"
//                           )}>
//                             {isComplete ? <Check className="w-4 h-4" /> : idx + 1}
//                           </span>
//                           <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">
//                             {stageLabels[stage]}
//                           </span>
//                         </button>
//                       )
//                     })}
//                   </div>
//                 </div>

//                 {/* Checklist Card */}
//                 <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
//                   <div className="flex items-center justify-between mb-4">
//                     <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
//                       <CheckCheck className="w-4 h-4 text-emerald-600" />
//                       Checklist - {stageLabels[patient.stage]}
//                     </h4>
//                     {checklistBusy && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />}
//                   </div>
//                   {currentStageItems.length > 0 ? (
//                     <>
//                       {totalItems > 0 && (
//                         <div className="mb-4">
//                           <div className="flex justify-between text-xs text-gray-500 mb-1">
//                             <span>{completedItems} / {totalItems} Completed</span>
//                             <span>{progress}%</span>
//                           </div>
//                           <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
//                             <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
//                           </div>
//                         </div>
//                       )}
//                       <div className="flex gap-2 mb-4">
//                         <Button size="sm" variant="outline" onClick={() => handleBulkChecklist(true)} disabled={checklistBusy}
//                           className="text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
//                           <CheckCheck className="w-3.5 h-3.5" /> Check All
//                         </Button>
//                         <Button size="sm" variant="outline" onClick={() => handleBulkChecklist(false)} disabled={checklistBusy}
//                           className="text-xs gap-1 border-gray-200 text-gray-600 hover:bg-gray-50">
//                           <ListX className="w-3.5 h-3.5" /> Uncheck All
//                         </Button>
//                       </div>
//                       <div className="space-y-1">
//                         {currentStageItems.map(item => {
//                           const checked = !!currentState[item.id]
//                           return (
//                             <label key={item.id}
//                               className={cn(
//                                 "flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors",
//                                 checklistBusy && "opacity-50 pointer-events-none"
//                               )}
//                             >
//                               <input
//                                 type="checkbox"
//                                 checked={checked}
//                                 disabled={checklistBusy}
//                                 onChange={() => toggleChecklist.mutate({ id: patient.id, itemId: item.id, checked: !checked })}
//                                 className="mt-0.5 w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
//                               />
//                               <div className="min-w-0">
//                                 <div className="flex items-center gap-2 flex-wrap">
//                                   <span className={cn("text-sm font-medium", checked ? "text-gray-400 line-through" : "text-gray-800")}>
//                                     {item.label}
//                                   </span>
//                                   <span className={cn(
//                                     "px-2 py-0.5 text-[10px] font-bold rounded-full",
//                                     item.status === "required" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
//                                   )}>
//                                     {item.status}
//                                   </span>
//                                 </div>
//                                 {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
//                               </div>
//                             </label>
//                           )
//                         })}
//                       </div>
//                     </>
//                   ) : (
//                     <p className="text-sm text-gray-500 italic">No checklist items for this stage</p>
//                   )}
//                 </div>

//                 {/* SOP Card */}
//                 <div className="bg-amber-50/50 rounded-2xl border border-amber-100 p-4 sm:p-5 shadow-sm">
//                   <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wide flex items-center gap-2 mb-3">
//                     <Zap className="w-4 h-4" /> Standard Operating Procedure
//                   </h4>
//                   <ul className="space-y-1.5">
//                     {STAGE_SOPs[patient.stage]?.map((sop, idx) => (
//                       <li key={idx} className="flex items-start gap-2 text-sm text-amber-900">
//                         <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
//                         {sop}
//                       </li>
//                     ))}
//                   </ul>
//                 </div>

//                 {/* Eligibility Details */}
//                 <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
//                   <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2 mb-4">
//                     <Shield className="w-4 h-4 text-emerald-600" /> Eligibility Details
//                   </h4>
//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
//                     <div>
//                       <label className="text-xs font-medium text-gray-500 mb-1 block">Payment Type</label>
//                       <SelectOrOther
//                         value={paymentMethod}
//                         onChange={setPaymentMethod}
//                         otherMode={paymentMethodOther}
//                         onOtherModeChange={setPaymentMethodOther}
//                         options={PAYMENT_METHOD_OPTIONS}
//                         placeholder="Select..."
//                       />
//                     </div>
//                     <div>
//                       <label className="text-xs font-medium text-gray-500 mb-1 block">Insurance Company</label>
//                       <SelectOrOther
//                         value={insuranceProvider}
//                         onChange={setInsuranceProvider}
//                         otherMode={insuranceProviderOther}
//                         onOtherModeChange={setInsuranceProviderOther}
//                         options={INSURANCE_PROVIDER_OPTIONS}
//                         placeholder="Select..."
//                       />
//                     </div>
//                   </div>
//                   {patient.eligibilityDetails?.vob && (
//                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
//                       {VOB_LABELS.map(([key, label]) => {
//                         const value = patient.eligibilityDetails?.vob?.[key]
//                         if (value === undefined || value === null) return null
//                         return (
//                           <div key={key} className="bg-gray-50 rounded-xl p-2.5">
//                             <p className="text-[10px] text-gray-500 font-medium">{label}</p>
//                             <p className="text-sm font-semibold text-gray-700">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</p>
//                           </div>
//                         )
//                       })}
//                     </div>
//                   )}
//                 </div>

//                 {/* Details Grid */}
//                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
//                   {patient.assignedUser && (
//                     <div className="bg-white rounded-xl border border-gray-100 p-3">
//                       <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Assigned To</p>
//                       <p className="text-sm font-medium text-gray-800">{patient.assignedUser.name}</p>
//                     </div>
//                   )}
//                   <div className="bg-white rounded-xl border border-gray-100 p-3">
//                     <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Source</p>
//                     <p className="text-sm font-medium text-gray-800 capitalize">{patient.source || "Manual"}</p>
//                   </div>
//                   {patient.paymentMethod && (
//                     <div className="bg-white rounded-xl border border-gray-100 p-3">
//                       <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Payment</p>
//                       <p className="text-sm font-medium text-gray-800">{patient.paymentMethod}</p>
//                     </div>
//                   )}
//                   <div className="bg-white rounded-xl border border-gray-100 p-3">
//                     <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Last Updated</p>
//                     <p className="text-sm font-medium text-gray-800">{timeAgo(patient.updatedAt)}</p>
//                   </div>
//                 </div>

//                 {/* Flag & Status & Access */}
//                 <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm space-y-4">
//                   <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
//                     <Flag className="w-4 h-4 text-red-500" /> Status & Access
//                   </h4>
//                   {/* Flag messages */}
//                   {patient.isFlagged && patient.flagReason && (
//                     <div className="bg-red-50 rounded-xl p-3 border border-red-100">
//                       <p className="text-xs font-bold text-red-700 mb-1">🚩 Flagged</p>
//                       <p className="text-sm text-red-900">{patient.flagReason}</p>
//                       <p className="text-[10px] text-red-600 mt-1">by {patient.flaggedByUser?.name} {patient.flaggedAt && `· ${timeAgo(patient.flaggedAt.toString())}`}</p>
//                     </div>
//                   )}
//                   {patient.flagClearedReason && (
//                     <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
//                       <p className="text-xs font-bold text-emerald-700 mb-1">✅ Response</p>
//                       <p className="text-sm text-emerald-900">{patient.flagClearedReason}</p>
//                     </div>
//                   )}
//                   {/* Cancel / Reactivate */}
//                   <div className="flex flex-wrap gap-2">
//                     {isAdmin && patient.status !== "cancelled" && !showCancelInput && (
//                       <Button size="sm" variant="outline" onClick={() => setShowCancelInput(true)}
//                         className="text-xs border-red-200 text-red-600 hover:bg-red-50">
//                         <Ban className="w-3.5 h-3.5 mr-1.5" /> Mark Cancelled
//                       </Button>
//                     )}
//                     {isAdmin && patient.status === "cancelled" && (
//                       <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: patient.id, status: "active" })}
//                         disabled={updateStatus.isPending}
//                         className="text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50">
//                         <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reactivate
//                       </Button>
//                     )}
//                     {patient.isPrivate ? (
//                       canUnlock && (
//                         <Button size="sm" variant="outline" onClick={() => unlockPatient.mutate(patient.id)}
//                           disabled={unlockPatient.isPending}
//                           className="text-xs border-amber-200 text-amber-700 hover:bg-amber-50">
//                           <Unlock className="w-3.5 h-3.5 mr-1.5" /> Unlock
//                         </Button>
//                       )
//                     ) : (
//                       canLock && (
//                         <Button size="sm" variant="outline" onClick={() => lockPatient.mutate(patient.id)}
//                           disabled={lockPatient.isPending}
//                           className="text-xs border-gray-200 text-gray-700 hover:bg-gray-50">
//                           <Lock className="w-3.5 h-3.5 mr-1.5" /> Lock
//                         </Button>
//                       )
//                     )}
//                   </div>
//                   {isAdmin && showCancelInput && (
//                     <div className="space-y-2 bg-red-50/50 p-3 rounded-xl border border-red-100">
//                       <Textarea placeholder="Cancellation reason..." value={cancelReason} onChange={e => setCancelReason(e.target.value)}
//                         className="text-sm min-h-[70px] bg-white" />
//                       <div className="flex gap-2">
//                         <Button size="sm" onClick={handleCancelPatient} disabled={updateStatus.isPending}
//                           className="bg-red-600 hover:bg-red-700 text-white text-xs">
//                           Confirm
//                         </Button>
//                         <Button size="sm" variant="ghost" onClick={() => setShowCancelInput(false)} className="text-xs">Cancel</Button>
//                       </div>
//                     </div>
//                   )}
//                 </div>

//                 {/* Contact & Payment Info */}
//                 <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
//                   <div className="flex items-center justify-between mb-4">
//                     <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Contact & Payment</h4>
//                     <Button size="sm" onClick={handleSaveContact} disabled={savingContact}
//                       className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
//                       {savingContact ? "Saving..." : "Save"}
//                     </Button>
//                   </div>
//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                     {(["firstName","lastName","location","phone","email","copayAmount","amountPaid"] as const).map(key => (
//                       <div key={key}>
//                         <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
//                           {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
//                         </label>
//                         <input
//                           value={contactForm[key]}
//                           onChange={e => setContactForm(f => ({...f, [key]: e.target.value}))}
//                           className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
//                         />
//                       </div>
//                     ))}
//                     <div>
//                       <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Payment Type</label>
//                       <SelectOrOther value={paymentMethod} onChange={setPaymentMethod} otherMode={paymentMethodOther}
//                         onOtherModeChange={setPaymentMethodOther} options={PAYMENT_METHOD_OPTIONS} placeholder="Select..." />
//                     </div>
//                     <div>
//                       <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Insurance</label>
//                       <SelectOrOther value={insuranceProvider} onChange={setInsuranceProvider} otherMode={insuranceProviderOther}
//                         onOtherModeChange={setInsuranceProviderOther} options={INSURANCE_PROVIDER_OPTIONS} placeholder="Select..." />
//                     </div>
//                     <div>
//                       <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Visit Status</label>
//                       <select value={visitStatus} onChange={e => setVisitStatus(e.target.value)}
//                         className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
//                         {VISIT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
//                       </select>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Notes */}
//                 <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
//                   <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Operational Notes</h4>
//                   <Textarea
//                     placeholder="Add notes..."
//                     value={notesText}
//                     onChange={e => setNotesText(e.target.value)}
//                     className="text-sm min-h-[100px] rounded-xl"
//                   />
//                   <div className="flex justify-end mt-3">
//                     <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}
//                       className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
//                       {savingNotes ? "Saving..." : "Save Notes"}
//                     </Button>
//                   </div>
//                 </div>

//                 {/* Activity Log */}
//                 <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
//                   <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2 mb-4">
//                     <MessageSquare className="w-4 h-4 text-gray-400" /> Activity Log
//                   </h4>
//                   <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
//                     {logData?.logs?.length ? logData.logs.map(log => (
//                       <div key={log.id} className="flex gap-2 text-xs py-2 border-b border-gray-50 last:border-0">
//                         <span className="text-gray-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleDateString()}</span>
//                         <div>
//                           <span className="font-semibold text-gray-700">{log.author}</span>
//                           <span className="text-gray-500 ml-1">{log.message}</span>
//                         </div>
//                       </div>
//                     )) : <p className="text-sm text-gray-400 italic">No activity yet</p>}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </>
//         )}
//         {assigning && (
//           <div className="absolute inset-0 z-50 bg-white/80 flex items-center justify-center gap-3">
//             <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
//             <span className="text-sm font-medium text-gray-700">Updating assignment...</span>
//           </div>
//         )}

//         {/* Flag Popup (unchanged logic, restyled lightly) */}
//         {showFlagPopup && (
//           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
//             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFlagPopup(false)} />
//             <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
//               <div className={cn("px-5 py-4 flex items-center justify-between", isAdmin ? "bg-emerald-600" : "bg-red-600")}>
//                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
//                   <Flag className="w-5 h-5" fill="white" /> {isAdmin ? "Raise Admin Flag" : "Raise Flag"}
//                 </h3>
//                 <button onClick={() => setShowFlagPopup(false)} className="p-1 rounded-lg hover:bg-white/20 text-white">
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>
//               <div className="p-5 space-y-4">
//                 <div>
//                   <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Type</label>
//                   <div className="flex gap-4">
//                     <label className="flex items-center gap-2 cursor-pointer">
//                       <input type="radio" name="flagType" value="positive" checked={newFlagType === "positive"}
//                         onChange={e => setNewFlagType(e.target.value as "positive"|"negative")} className="w-4 h-4 accent-emerald-600" />
//                       <span className="text-sm">✅ Positive</span>
//                     </label>
//                     <label className="flex items-center gap-2 cursor-pointer">
//                       <input type="radio" name="flagType" value="negative" checked={newFlagType === "negative"}
//                         onChange={e => setNewFlagType(e.target.value as "positive"|"negative")} className="w-4 h-4 accent-red-600" />
//                       <span className="text-sm">⚠️ Alert</span>
//                     </label>
//                   </div>
//                 </div>
//                 <div>
//                   <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reason</label>
//                   <textarea value={newFlagReason} onChange={e => setNewFlagReason(e.target.value)}
//                     className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl min-h-[80px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
//                 </div>
//                 <div className="flex justify-end gap-2">
//                   <button onClick={() => { setShowFlagPopup(false); setNewFlagReason(""); setNewFlagType("positive"); }}
//                     className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
//                   <button
//                     onClick={async () => {
//                       if (patient && newFlagReason.trim()) {
//                         await flagPatient.mutateAsync({ id: patient.id, reason: newFlagReason })
//                         setShowFlagPopup(false)
//                         setNewFlagReason("")
//                         setNewFlagType("positive")
//                         toast.success("Flag raised")
//                       }
//                     }}
//                     disabled={!newFlagReason.trim() || flagPatient.isPending}
//                     className={cn(
//                       "px-4 py-2 text-sm font-bold rounded-xl transition-colors flex items-center gap-2",
//                       newFlagReason.trim() && !flagPatient.isPending
//                         ? (isAdmin ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-red-600 hover:bg-red-700 text-white")
//                         : "bg-gray-200 text-gray-400 cursor-not-allowed"
//                     )}
//                   >
//                     {flagPatient.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" fill="currentColor" />}
//                     Raise Flag
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }


// "use client"

// import { useState, useEffect, useMemo, useRef } from "react"
// import type { Patient, PatientStage } from "@/types"
// import { ROLES, STALE_HOURS } from "@/constants"
// import { useStageMeta } from "@/hooks/query/useStages"
// import {
//   X,
//   Flag,
//   Check,
//   CheckCheck,
//   CheckCircle,
//   XCircle,
//   AlertTriangle,
//   MessageSquare,
//   ListX,
//   Loader2,
//   UserCheck,
//   ChevronDown,
//   Zap,
//   Shield,
//   Lock,
//   Unlock,
//   Ban,
//   RefreshCw,
//   Calendar,
//   Pencil,
//   UserPlus,
//   Sparkles,
//   ClipboardList,
//   CreditCard,
//   Activity,
//   MapPin,
//   Building2,
//   Wallet,
//   Clock3,
// } from "lucide-react"
// import { Button } from "@/components/ui/button"
// import { Textarea } from "@/components/ui/textarea"
// import { Badge } from "@/components/ui/badge"
// import { useAuth } from "@/hooks/auth/useAuth"
// import {
//   useMoveStage,
//   useToggleChecklist,
//   useUpdateNotes,
//   useFlagPatient,
//   useClearFlag,
//   useClaimPatient,
//   useAssignPatient,
//   useChecklistItems,
//   useListVas,
//   useCheckEligibility,
//   useUpdatePatient,
//   useLockPatient,
//   useUnlockPatient,
//   useUpdatePatientStatus,
//   useUpdateAppointment,
// } from "@/hooks/query/usePatients"
// import { usePatient } from "@/hooks/query/usePatients"
// import { useActivityLog } from "@/hooks/query/useActivityLog"
// import { SelectOrOther } from "@/components/shared/select-or-other"
// import { PAYMENT_METHOD_OPTIONS, INSURANCE_PROVIDER_OPTIONS, VISIT_STATUS_OPTIONS } from "@/lib/patient-options"
// import { cn } from "@/lib/utils"
// import { toast } from "sonner"

// interface PatientModalProps {
//   patientId: string | null
//   open: boolean
//   onClose: () => void
// }

// // ---------------------------------------------------------------------------
// // Static content
// // ---------------------------------------------------------------------------
// const STAGE_SOPs: Record<PatientStage, string[]> = {
//   onboarding: [
//     "Confirm appointment date and time in calendar",
//     "Verify patient contact information (phone, email)",
//     "Send welcome email with pre-visit instructions",
//     "Ensure intake form is completed",
//   ],
//   visit_complete: [
//     "Document visit completion in Optimantra",
//     "Verify all vital signs recorded",
//     "Confirm provider's clinical notes entered",
//     "Flag any abnormalities for review",
//   ],
//   post_visit_docs: [
//     "Generate and send patient instruction letter",
//     "Order and submit required lab work",
//     "Attach lab request forms to patient record",
//     "Confirm patient received all documents",
//   ],
//   chart_signed: [
//     "Ensure Optimantra note is signed by provider",
//     "Run pre-billing clawback check",
//     "Verify CPT codes match services rendered",
//     "Confirm ICD-10 codes are documented",
//     "Check documentation supports diagnosis",
//   ],
//   sent_to_billing: [
//     "Verify claim submission to billing system",
//     "Record claim number and submission date",
//     "Set follow-up reminder for claim status",
//     "Attach claim submission confirmation",
//   ],
//   payment_posted: [
//     "Record payment amount and date received",
//     "Match payment to submitted claim",
//     "Update insurance payer information",
//     "Flag any payment discrepancies",
//   ],
//   reconciled: [
//     "Verify all payments received match billing",
//     "Close patient record in system",
//     "Archive supporting documentation",
//     "Record final reconciliation details",
//   ],
// }

// const VOB_LABELS: Array<[string, string]> = [
//   ["coverage", "Coverage"],
//   ["payer", "Payer"],
//   ["memberId", "Member ID"],
//   ["groupNumber", "Group Number"],
//   ["copay", "Copay"],
//   ["coinsurance", "Coinsurance"],
//   ["deductible", "Deductible"],
//   ["deductibleMet", "Deductible Met"],
//   ["outOfPocketMax", "Out-of-Pocket Max"],
//   ["authorizationRequired", "Authorization"],
//   ["visitsCoveredPerYear", "Visits / Year"],
//   ["checkDate", "Checked"],
// ]

// // ---------------------------------------------------------------------------
// // Helpers
// // ---------------------------------------------------------------------------
// function timeAgo(dateStr: string): string {
//   const diff = Date.now() - new Date(dateStr).getTime()
//   const hours = Math.floor(diff / (1000 * 60 * 60))
//   if (hours < 1) return "< 1h ago"
//   if (hours < 24) return `${hours}h ago`
//   const days = Math.floor(hours / 24)
//   return `${days}d ago`
// }

// // Format a Date as a local `datetime-local` value (YYYY-MM-DDTHH:mm). Using
// // toISOString() here would return the UTC time and silently shift the
// // appointment by the timezone offset when re-saving. Add a zero timezone offset
// // to keep the local wall-clock time.
// function toLocalDatetimeLocal(date: Date): string {
//   const pad = (n: number) => String(n).padStart(2, "0")
//   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
// }

// // ---------------------------------------------------------------------------
// // Bento palette — each section owns a distinct color identity instead of
// // everything sharing the same green-on-white card. Tailwind classes are
// // written out in full (not built dynamically) so JIT can find them.
// // ---------------------------------------------------------------------------
// type BentoColor = "emerald" | "amber" | "sky" | "violet" | "rose" | "indigo" | "fuchsia" | "slate"

// const BENTO: Record<BentoColor, {
//   card: string
//   chip: string
//   title: string
//   ring: string
// }> = {
//   emerald: {
//     card: "bg-gradient-to-br from-emerald-50 to-white border-emerald-200/70",
//     chip: "bg-emerald-500 text-white shadow-emerald-500/30",
//     title: "text-emerald-900",
//     ring: "hover:shadow-[0_16px_40px_rgba(16,185,129,0.15)]",
//   },
//   amber: {
//     card: "bg-gradient-to-br from-amber-50 to-white border-amber-200/70",
//     chip: "bg-amber-500 text-white shadow-amber-500/30",
//     title: "text-amber-900",
//     ring: "hover:shadow-[0_16px_40px_rgba(245,158,11,0.15)]",
//   },
//   sky: {
//     card: "bg-gradient-to-br from-sky-50 to-white border-sky-200/70",
//     chip: "bg-sky-500 text-white shadow-sky-500/30",
//     title: "text-sky-900",
//     ring: "hover:shadow-[0_16px_40px_rgba(14,165,233,0.15)]",
//   },
//   violet: {
//     card: "bg-gradient-to-br from-violet-50 to-white border-violet-200/70",
//     chip: "bg-violet-500 text-white shadow-violet-500/30",
//     title: "text-violet-900",
//     ring: "hover:shadow-[0_16px_40px_rgba(139,92,246,0.15)]",
//   },
//   rose: {
//     card: "bg-gradient-to-br from-rose-50 to-white border-rose-200/70",
//     chip: "bg-rose-500 text-white shadow-rose-500/30",
//     title: "text-rose-900",
//     ring: "hover:shadow-[0_16px_40px_rgba(244,63,94,0.15)]",
//   },
//   indigo: {
//     card: "bg-gradient-to-br from-indigo-50 to-white border-indigo-200/70",
//     chip: "bg-indigo-500 text-white shadow-indigo-500/30",
//     title: "text-indigo-900",
//     ring: "hover:shadow-[0_16px_40px_rgba(99,102,241,0.15)]",
//   },
//   fuchsia: {
//     card: "bg-gradient-to-br from-fuchsia-50 to-white border-fuchsia-200/70",
//     chip: "bg-fuchsia-500 text-white shadow-fuchsia-500/30",
//     title: "text-fuchsia-900",
//     ring: "hover:shadow-[0_16px_40px_rgba(217,70,239,0.15)]",
//   },
//   slate: {
//     card: "bg-gradient-to-br from-slate-50 to-white border-slate-200/70",
//     chip: "bg-slate-700 text-white shadow-slate-500/30",
//     title: "text-slate-900",
//     ring: "hover:shadow-[0_16px_40px_rgba(51,65,85,0.12)]",
//   },
// }

// // Bento tile — a colorful card that slots into the grid. `span` controls how
// // much of the 12-col grid it occupies from `sm` breakpoint up.
// function Bento({
//   icon: Icon,
//   title,
//   color,
//   action,
//   children,
//   span = "col-span-12",
// }: {
//   icon: React.ElementType
//   title: string
//   color: BentoColor
//   action?: React.ReactNode
//   children: React.ReactNode
//   span?: string
// }) {
//   const p = BENTO[color]
//   return (
//     <div
//       className={cn(
//         "relative overflow-hidden border rounded-[28px] p-4 sm:p-6 shadow-[0_6px_24px_rgba(0,0,0,0.04)] transition-all duration-300",
//         p.card,
//         p.ring,
//         span,
//       )}
//     >
//       <div className="flex items-center justify-between mb-4 gap-3">
//         <div className="flex items-center gap-2.5 min-w-0">
//           <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg", p.chip)}>
//             <Icon className="w-4 h-4" />
//           </div>
//           <h3 className={cn("text-[11px] sm:text-xs font-extrabold uppercase tracking-widest truncate", p.title)}>
//             {title}
//           </h3>
//         </div>
//         {action}
//       </div>
//       {children}
//     </div>
//   )
// }

// // Small stat tile for the "Details" bento row.
// function StatTile({
//   icon: Icon,
//   label,
//   value,
//   color,
// }: {
//   icon: React.ElementType
//   label: string
//   value: string
//   color: BentoColor
// }) {
//   const p = BENTO[color]
//   return (
//     <div
//       className={cn(
//         "border rounded-3xl p-4 shadow-[0_6px_20px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1",
//         p.card,
//         p.ring,
//       )}
//     >
//       <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center mb-3 shadow", p.chip)}>
//         <Icon className="w-3.5 h-3.5" />
//       </div>
//       <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
//       <p className={cn("text-sm font-bold truncate", p.title)}>{value}</p>
//     </div>
//   )
// }

// // Circular progress ring used for the checklist completion indicator.
// function ProgressRing({ progress, size = 44 }: { progress: number; size?: number }) {
//   const stroke = 4
//   const radius = (size - stroke) / 2
//   const circumference = 2 * Math.PI * radius
//   const offset = circumference - (progress / 100) * circumference
//   return (
//     <div className="relative shrink-0" style={{ width: size, height: size }}>
//       <svg width={size} height={size} className="-rotate-90">
//         <circle cx={size / 2} cy={size / 2} r={radius} stroke="#D1FAE5" strokeWidth={stroke} fill="none" />
//         <circle
//           cx={size / 2}
//           cy={size / 2}
//           r={radius}
//           stroke={progress === 100 ? "#059669" : "#10B981"}
//           strokeWidth={stroke}
//           fill="none"
//           strokeLinecap="round"
//           strokeDasharray={circumference}
//           strokeDashoffset={offset}
//           className="transition-all duration-500 ease-out"
//         />
//       </svg>
//       <div className="absolute inset-0 flex items-center justify-center">
//         <span className="text-[10px] font-bold text-emerald-700">{progress}%</span>
//       </div>
//     </div>
//   )
// }

// export function PatientModal({ patientId, open, onClose }: PatientModalProps) {
//   const { user } = useAuth()
//   const isAdmin = user?.role === "admin"
//   const { order: stageOrder, labels: stageLabels, byKey: stageByKey } = useStageMeta()
//   const { data: patient, isLoading } = usePatient(patientId || "")
//   const { data: logData } = useActivityLog(
//     patientId ? { patientId, limit: 20 } : undefined,
//   )

//   const moveStage = useMoveStage()
//   const toggleChecklist = useToggleChecklist()
//   const updateNotes = useUpdateNotes()
//   const flagPatient = useFlagPatient()
//   const clearFlag = useClearFlag()
//   const claimPatient = useClaimPatient()
//   const assignPatient = useAssignPatient()
//   const updatePatient = useUpdatePatient()
//   const lockPatient = useLockPatient()
//   const unlockPatient = useUnlockPatient()
//   const updateStatus = useUpdatePatientStatus()

//   const { data: checklistDefs } = useChecklistItems()

//   const currentStageItems = useMemo(() => {
//     if (!checklistDefs || !patient) return []
//     return checklistDefs
//       .filter((item) => item.stage === patient.stage)
//       .sort((a, b) => a.sortOrder - b.sortOrder)
//   }, [checklistDefs, patient])

//   const currentState = patient?.checklistState?.[patient.stage] || {}

//   const requiredItems = currentStageItems.filter((item) => item.status === "required")
//   const totalItems = requiredItems.length
//   const completedItems = requiredItems.filter(
//     (item) => currentState[item.id] === true,
//   ).length
//   const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100
//   const allComplete = totalItems === 0 || completedItems === totalItems

//   const { data: vaList } = useListVas()

//   const [notesText, setNotesText] = useState("")
//   const [flagReason, setFlagReason] = useState("")
//   const [showFlagInput, setShowFlagInput] = useState(false)
//   const [flagStage, setFlagStage] = useState<PatientStage | "">("")
//   const [showFlagPopup, setShowFlagPopup] = useState(false)
//   const [newFlagReason, setNewFlagReason] = useState("")
//   const [newFlagType, setNewFlagType] = useState<"positive" | "negative">("positive")
//   const [showAllFlags, setShowAllFlags] = useState(false)
//   const [clearReason, setClearReason] = useState("")
//   const [showClearInput, setShowClearInput] = useState(false)
//   const [savingNotes, setSavingNotes] = useState(false)
//   const [paymentMethod, setPaymentMethod] = useState("")
//   const [insuranceProvider, setInsuranceProvider] = useState("")
//   const [paymentMethodOther, setPaymentMethodOther] = useState(false)
//   const [insuranceProviderOther, setInsuranceProviderOther] = useState(false)
//   const [visitStatus, setVisitStatus] = useState("not_visited")
//   const [contactForm, setContactForm] = useState({
//     firstName: "",
//     lastName: "",
//     location: "",
//     phone: "",
//     email: "",
//     copayAmount: "",
//     amountPaid: "",
//   })
//   const [savingContact, setSavingContact] = useState(false)
//   const [cancelReason, setCancelReason] = useState("")
//   const [showCancelInput, setShowCancelInput] = useState(false)
//   const [editingAppointment, setEditingAppointment] = useState(false)
//   const [newAppointmentDatetime, setNewAppointmentDatetime] = useState("")
//   const checkEligibility = useCheckEligibility()
//   const updateAppointment = useUpdateAppointment()

//   const [bulkPending, setBulkPending] = useState(false)
//   const [assigning, setAssigning] = useState(false)
//   const [assignFeedback, setAssignFeedback] = useState<{
//     type: "success" | "error"
//     message: string
//   } | null>(null)
//   const assignFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
//   const checklistBusy = toggleChecklist.isPending || bulkPending

//   useEffect(() => () => {
//     if (assignFeedbackTimer.current) clearTimeout(assignFeedbackTimer.current)
//   }, [])

//   useEffect(() => {
//     if (patient?.notes) setNotesText(patient.notes)
//     else setNotesText("")
//     const pm = patient?.paymentMethod ?? ""
//     const ip = patient?.insuranceProvider ?? ""
//     setPaymentMethod(pm)
//     setInsuranceProvider(ip)
//     setPaymentMethodOther(pm !== "" && !PAYMENT_METHOD_OPTIONS.includes(pm))
//     setInsuranceProviderOther(ip !== "" && !INSURANCE_PROVIDER_OPTIONS.includes(ip))
//     setVisitStatus(patient?.visitStatus ?? "not_visited")
//     setContactForm({
//       firstName: patient?.firstName ?? "",
//       lastName: patient?.lastName ?? "",
//       location: patient?.location ?? "",
//       phone: patient?.phone ?? "",
//       email: patient?.email ?? "",
//       copayAmount: patient?.copayAmount ?? "",
//       amountPaid: patient?.amountPaid ?? "",
//     })
//     setShowFlagInput(false)
//     setFlagReason("")
//     setShowClearInput(false)
//     setClearReason("")
//     setShowCancelInput(false)
//     setCancelReason("")
//     setEditingAppointment(false)
//     if (patient?.appointmentDatetime) {
//       const dt = new Date(patient.appointmentDatetime)
//       setNewAppointmentDatetime(toLocalDatetimeLocal(dt))
//     } else {
//       setNewAppointmentDatetime("")
//     }
//     setAssigning(false)
//     setAssignFeedback(null)
//   }, [patient?.id, patient?.notes, patient?.paymentMethod, patient?.insuranceProvider, patient?.appointmentDatetime])

//   useEffect(() => {
//     const handleEscape = (e: KeyboardEvent) => {
//       if (e.key === "Escape" && open && !assigning) {
//         onClose()
//       }
//     }
//     window.addEventListener("keydown", handleEscape)
//     return () => window.removeEventListener("keydown", handleEscape)
//   }, [open, onClose, assigning])

//   const handleSaveNotes = async () => {
//     if (!patient) return
//     setSavingNotes(true)
//     await updateNotes.mutateAsync({ id: patient.id, notes: notesText })
//     setSavingNotes(false)
//   }

//   const handleFlag = async () => {
//     if (!patient || !flagReason.trim()) return
//     await flagPatient.mutateAsync({ id: patient.id, reason: flagReason })
//     setShowFlagInput(false)
//     setFlagReason("")
//     setFlagStage("")
//   }

//   const handleClearFlag = async () => {
//     if (!patient || !clearReason.trim()) return
//     await clearFlag.mutateAsync({ id: patient.id, clearReason })
//     setShowClearInput(false)
//     setClearReason("")
//   }

//   const handleMoveStage = async (target: PatientStage) => {
//     if (!patient) return
//     const currentIdx = stageOrder.indexOf(patient.stage)
//     const targetIdx = stageOrder.indexOf(target)

//     if (targetIdx > currentIdx && !allComplete) {
//       return
//     }

//     await moveStage.mutateAsync({ id: patient.id, targetStage: target })
//   }

//   const handleClaim = async () => {
//     if (!patient || !user) return
//     await claimPatient.mutateAsync({ id: patient.id, userId: user.id })
//   }

//   const handleCheckEligibility = async () => {
//     if (!patient) return
//     await checkEligibility.mutateAsync({
//       id: patient.id,
//       paymentMethod: paymentMethod.trim() || null,
//       insuranceProvider: insuranceProvider.trim() || null,
//     })
//   }

//   const handleSaveContact = async () => {
//     if (!patient) return
//     setSavingContact(true)
//     await updatePatient.mutateAsync({
//       id: patient.id,
//       firstName: contactForm.firstName.trim() || null,
//       lastName: contactForm.lastName.trim() || null,
//       location: contactForm.location.trim() || null,
//       phone: contactForm.phone.trim() || null,
//       email: contactForm.email.trim() || null,
//       copayAmount: contactForm.copayAmount.trim() || null,
//       amountPaid: contactForm.amountPaid.trim() || null,
//       paymentMethod: paymentMethod.trim() || null,
//       insuranceProvider: insuranceProvider.trim() || null,
//       visitStatus,
//     })
//     setSavingContact(false)
//   }

//   const handleCancelPatient = async () => {
//     if (!patient) return
//     await updateStatus.mutateAsync({ id: patient.id, status: "cancelled", reason: cancelReason.trim() || null })
//     setShowCancelInput(false)
//     setCancelReason("")
//   }

//   const handleUpdateAppointment = async () => {
//     if (!patient || !newAppointmentDatetime.trim()) return
//     const isoDatetime = new Date(newAppointmentDatetime).toISOString()
//     await updateAppointment.mutateAsync({ id: patient.id, appointmentDatetime: isoDatetime })
//     setEditingAppointment(false)
//   }

//   const handleAssignTo = async (vaId: string) => {
//     if (!patient || !vaId) return
//     setAssigning(true)
//     setAssignFeedback(null)
//     try {
//       await assignPatient.mutateAsync({ id: patient.id, assignedTo: vaId })
//       const va = vaList?.find((v) => v.id === vaId)
//       setAssignFeedback({ type: "success", message: `Assigned to ${va?.name ?? "VA"}` })
//     } catch (err: unknown) {
//       const apiMessage = (
//         err as { response?: { data?: { message?: string } } }
//       )?.response?.data?.message
//       setAssignFeedback({
//         type: "error",
//         message: apiMessage || "Failed to assign this patient",
//       })
//     } finally {
//       setAssigning(false)
//       if (assignFeedbackTimer.current) clearTimeout(assignFeedbackTimer.current)
//       assignFeedbackTimer.current = setTimeout(() => setAssignFeedback(null), 4000)
//     }
//   }

//   const handleBulkChecklist = async (checked: boolean) => {
//     if (!patient) return
//     const itemsToChange = currentStageItems.filter(
//       (item) => !!currentState[item.id] !== checked,
//     )
//     if (itemsToChange.length === 0) {
//       toast.info(checked ? "All items are already checked" : "No checklist items are checked")
//       return
//     }
//     setBulkPending(true)
//     try {
//       for (const item of itemsToChange) {
//         await toggleChecklist.mutateAsync({ id: patient.id, itemId: item.id, checked })
//       }
//       toast.success(`Checklist updated (${itemsToChange.length} item${itemsToChange.length > 1 ? "s" : ""})`)
//     } catch {
//       // handled upstream
//     } finally {
//       setBulkPending(false)
//     }
//   }

//   const canLock =
//     !!patient && (isAdmin || patient.assignedTo === user?.id)
//   const canUnlock =
//     !!patient &&
//     (isAdmin || patient.assignedTo === user?.id || patient.privateLockedByUser?.id === user?.id)

//   const stale =
//     patient &&
//     !(stageByKey.get(patient.stage)?.isFinal ?? false) &&
//     (Date.now() - new Date(patient.updatedAt).getTime()) / (1000 * 60 * 60) >
//       STALE_HOURS

//   if (!open) return null

//   return (
//     <div className="fixed inset-0 z-10 flex items-center justify-center sm:p-4">
//       <div
//         className="absolute inset-0 bg-black/75 backdrop-blur-lg"
//         onClick={() => !assigning && onClose()}
//       />
//       <div className="relative bg-[#F7F7FA]/95 backdrop-blur-3xl rounded-none sm:rounded-[32px] shadow-[0_24px_80px_rgba(0,0,0,0.25)] border-0 w-full h-[100dvh] sm:h-auto max-w-full sm:max-w-5xl max-h-full sm:max-h-[92vh] flex flex-col overflow-hidden mx-0 sm:mx-4 animate-in fade-in zoom-in-95 duration-300">
//         {isLoading || !patient ? (
//           <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
//             {isLoading ? (
//               <>
//                 <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-6">
//                   <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#65BD6C] border-r-[#036638] animate-spin" />
//                   <div className="absolute inset-2 rounded-full border-2 border-[#65BD6C]/30 animate-pulse" />
//                   <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#036638]/10 to-[#065040]/5 blur-xl animate-pulse" />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <img
//                       src="/logo.png"
//                       alt="Elevated Core Health"
//                       className="w-12 h-12 sm:w-16 sm:h-16 object-contain animate-bounce"
//                       style={{ animation: "bounce 2s infinite" }}
//                     />
//                   </div>
//                   <div className="absolute inset-0">
//                     <div className="absolute top-0 left-1/2 w-1 h-1 bg-[#65BD6C] rounded-full animate-ping" />
//                     <div className="absolute bottom-0 right-1/4 w-1 h-1 bg-[#036638] rounded-full animate-ping" style={{ animationDelay: "0.5s" }} />
//                     <div className="absolute top-1/2 right-0 w-1 h-1 bg-[#65BD6C] rounded-full animate-ping" style={{ animationDelay: "1s" }} />
//                   </div>
//                 </div>
//                 <p className="text-sm font-semibold text-[#1A1B1E]">Loading patient details...</p>
//                 <p className="text-xs text-[#6B7280] mt-1">Please wait</p>
//               </>
//             ) : (
//               <p className="text-sm text-[#6B7280]">Patient not found</p>
//             )}
//           </div>
//         ) : (
//           <>
//             {/* ================= HEADER ================= */}
//             <div className="flex-shrink-0 relative overflow-hidden bg-gradient-to-br from-[#023E23] via-[#036638] to-[#012816] px-4 py-4 sm:px-8 sm:py-8 flex items-start justify-between border-b border-white/10 shadow-[0_4px_24px_rgba(3,102,56,0.3)]">
//               <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
//               <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#65BD6C]/20 rounded-full blur-[70px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />

//               <div className="min-w-0 flex-1 relative z-10">
//                 <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
//                   <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 border border-white/20 shrink-0 shadow-inner">
//                     <span className="text-sm font-bold text-white">
//                       {patient.name?.trim()?.charAt(0)?.toUpperCase() || "?"}
//                     </span>
//                   </div>
//                   <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
//                     {patient.name}
//                   </h2>
//                   {patient.isFlagged && (
//                     <Badge
//                       variant="outline"
//                       className="bg-[#E15C4E]/90 text-white border-[#E15C4E] text-[10px] font-bold gap-1 shadow-sm animate-pulse"
//                     >
//                       <Flag className="w-3 h-3" fill="white" />
//                       Flagged
//                     </Badge>
//                   )}
//                   {stale && (
//                     <Badge
//                       variant="outline"
//                       className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold gap-1 shadow-sm"
//                     >
//                       <AlertTriangle className="w-3 h-3" />
//                       Stale
//                     </Badge>
//                   )}
//                 </div>

//                 <div className="flex flex-wrap items-center gap-2 sm:gap-3">
//                   <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full flex items-center gap-1.5">
//                     <Sparkles className="w-3 h-3" />
//                     {stageLabels[patient.stage]}
//                   </span>
//                   {patient.assignedTo && vaList ? (
//                     <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full flex items-center gap-1">
//                       <UserCheck className="w-3 h-3" />
//                       {vaList.find((v) => v.id === patient.assignedTo)?.name || "Unknown"}
//                     </span>
//                   ) : (
//                     <span className="px-3 py-1 bg-red-500/80 text-white text-xs font-semibold rounded-full flex items-center gap-1">
//                       <Flag className="w-3 h-3" fill="currentColor" />
//                       Unassigned
//                     </span>
//                   )}
//                   {patient.status !== "active" && (
//                     <span
//                       className={cn(
//                         "px-3 py-1 text-xs font-semibold rounded-full",
//                         patient.status === "completed" ? "bg-[#65BD6C] text-white" : "bg-red-500 text-white",
//                       )}
//                     >
//                       {patient.status === "completed" ? "Completed" : "Cancelled"}
//                     </span>
//                   )}
//                   {patient.isPrivate && (
//                     <span className="px-3 py-1 bg-amber-400/90 text-amber-950 text-xs font-semibold rounded-full flex items-center gap-1">
//                       <Lock className="w-3 h-3" />
//                       Locked
//                     </span>
//                   )}
//                   <p className="text-sm text-white/70">
//                     Created {new Date(patient.createdAt).toLocaleDateString()}
//                   </p>
//                 </div>

//                 {patient.isFlagged && patient.flagReason && (
//                   <div className="mt-3 p-3 rounded-xl border bg-[#E15C4E]/15 border-[#E15C4E]/40 backdrop-blur-sm">
//                     <div className="flex items-start justify-between gap-2">
//                       <div className="flex-1 min-w-0">
//                         <p className="text-xs font-bold text-[#E15C4E] mb-1 flex items-center gap-1">
//                           🚩 Flagged
//                         </p>
//                         <p className="text-xs text-white/90">{patient.flagReason}</p>
//                         {patient.flaggedByUser && (
//                           <p className="text-[10px] text-white/60 mt-2">
//                             By {patient.flaggedByUser.name} • {timeAgo(patient.flaggedAt?.toString() || '')}
//                           </p>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 <div className="mt-4 flex flex-wrap items-start gap-2.5">
//                   <div
//                     className={cn(
//                       "rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md transition-all",
//                       editingAppointment ? "p-3 w-full sm:w-auto" : "px-4 py-2.5",
//                     )}
//                   >
//                     {!editingAppointment ? (
//                       <div className="flex items-center gap-3">
//                         <div className="p-1.5 rounded-lg bg-white/15 shrink-0">
//                           <Calendar className="w-3.5 h-3.5 text-white" />
//                         </div>
//                         <div className="min-w-0">
//                           <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest leading-none mb-1">
//                             Appointment
//                           </p>
//                           {patient.appointmentDatetime ? (
//                             <p className="text-xs font-semibold text-white truncate">
//                               {new Date(patient.appointmentDatetime).toLocaleString("en-US", {
//                                 month: "short",
//                                 day: "numeric",
//                                 year: "numeric",
//                                 hour: "numeric",
//                                 minute: "2-digit",
//                               })}
//                             </p>
//                           ) : (
//                             <p className="text-xs font-medium text-white/60 italic">Not scheduled</p>
//                           )}
//                         </div>
//                         <button
//                           onClick={() => setEditingAppointment(true)}
//                           title={patient.appointmentDatetime ? "Edit appointment" : "Set appointment"}
//                           className="ml-1 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-all shrink-0"
//                         >
//                           <Pencil className="w-3 h-3" />
//                         </button>
//                       </div>
//                     ) : (
//                       <div className="bg-white rounded-xl p-3.5 shadow-xl space-y-2.5 w-full sm:w-72">
//                         <label className="text-[10px] font-bold text-[#036638] uppercase tracking-wider flex items-center gap-1.5">
//                           <Calendar className="w-3 h-3" />
//                           {patient.appointmentDatetime ? "Update Date & Time" : "Set Date & Time"}
//                         </label>
//                         <input
//                           type="datetime-local"
//                           value={newAppointmentDatetime}
//                           onChange={(e) => setNewAppointmentDatetime(e.target.value)}
//                           className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#036638] transition-all"
//                         />
//                         <div className="flex gap-1.5">
//                           <button
//                             onClick={handleUpdateAppointment}
//                             disabled={updateAppointment.isPending || !newAppointmentDatetime.trim()}
//                             className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#036638] text-white hover:bg-[#025030] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all"
//                           >
//                             {updateAppointment.isPending ? (
//                               <>
//                                 <Loader2 className="w-3.5 h-3.5 animate-spin" />
//                                 Saving...
//                               </>
//                             ) : (
//                               <>
//                                 <CheckCheck className="w-3.5 h-3.5" />
//                                 {patient.appointmentDatetime ? "Update" : "Set"}
//                               </>
//                             )}
//                           </button>
//                           <button
//                             onClick={() => {
//                               setEditingAppointment(false)
//                               if (patient?.appointmentDatetime) {
//                                 setNewAppointmentDatetime(toLocalDatetimeLocal(new Date(patient.appointmentDatetime)))
//                               } else {
//                                 setNewAppointmentDatetime("")
//                               }
//                             }}
//                             disabled={updateAppointment.isPending}
//                             className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-50 transition-all"
//                           >
//                             Cancel
//                           </button>
//                         </div>
//                         {updateAppointment.isPending && (
//                           <p className="text-[10px] font-medium text-blue-700 flex items-center gap-1">
//                             <Loader2 className="w-3 h-3 animate-spin" /> Saving &amp; notifying patient...
//                           </p>
//                         )}
//                         {updateAppointment.isSuccess && !updateAppointment.isPending && (
//                           <p className="text-[10px] font-medium text-[#036638] flex items-center gap-1">
//                             <Check className="w-3 h-3" /> Saved — patient notified via email
//                           </p>
//                         )}
//                       </div>
//                     )}
//                   </div>

//                   <button
//                     onClick={handleCheckEligibility}
//                     disabled={checkEligibility.isPending}
//                     className={cn(
//                       "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all text-xs font-bold shrink-0",
//                       checkEligibility.isPending
//                         ? "bg-white/10 border-white/15 text-white/60 cursor-wait"
//                         : "bg-[#EBF7EC] text-[#036638] border-[#65BD6C]/40 hover:bg-white hover:border-[#65BD6C] shadow-sm cursor-pointer",
//                     )}
//                   >
//                     {checkEligibility.isPending ? (
//                       <Loader2 className="w-3.5 h-3.5 animate-spin" />
//                     ) : (
//                       <Shield className="w-3.5 h-3.5" />
//                     )}
//                     {checkEligibility.isPending
//                       ? "Checking..."
//                       : patient.eligibilityStatus !== "not_checked"
//                         ? "Re-check Eligibility"
//                         : "Check Eligibility"}
//                     {!checkEligibility.isPending && patient.eligibilityStatus === "eligible" && (
//                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
//                     )}
//                     {!checkEligibility.isPending && patient.eligibilityStatus === "not_eligible" && (
//                       <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
//                     )}
//                   </button>

//                   {(!!vaList && (isAdmin || !patient.assignedUser)) && (
//                     <div className="flex flex-col gap-1 bg-white/10 border border-white/15 rounded-2xl px-3.5 py-2 backdrop-blur-md">
//                       <div className="flex items-center gap-1.5">
//                         <span
//                           className={cn(
//                             "w-1.5 h-1.5 rounded-full shrink-0",
//                             patient.assignedUser
//                               ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
//                               : "bg-white/30",
//                           )}
//                         />
//                         <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest leading-none">
//                           {isAdmin ? "Assigned SI" : "Assignment"}
//                         </p>
//                       </div>
//                       <div className="flex items-center gap-2.5">
//                         <UserPlus className="w-3.5 h-3.5 text-white shrink-0" />
//                         {!isAdmin && !patient.assignedUser && (
//                           <button
//                             onClick={handleClaim}
//                             disabled={claimPatient.isPending}
//                             className="text-xs font-bold text-white hover:text-white/80 transition-all disabled:opacity-50 whitespace-nowrap"
//                           >
//                             {claimPatient.isPending ? "Claiming..." : "Assign to Me"}
//                           </button>
//                         )}
//                         {vaList && (
//                           <div className="relative">
//                             <select
//                               onChange={(e) => {
//                                 const val = e.target.value
//                                 e.target.value = ""
//                                 if (val) handleAssignTo(val)
//                               }}
//                               value=""
//                               disabled={assigning}
//                               className="appearance-none text-xs font-semibold bg-transparent text-white pr-5 focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 [&>option]:text-[#1A1B1E]"
//                             >
//                               <option value="">{patient.assignedUser ? "Reassign to..." : "Assign to VA..."}</option>
//                               {vaList.filter((v) => v.id !== user?.id).map((va) => (
//                                 <option key={va.id} value={va.id}>
//                                   {va.name}
//                                 </option>
//                               ))}
//                             </select>
//                             <ChevronDown className="w-3 h-3 text-white/70 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   )}
//                 </div>

//                 {assignFeedback && (
//                   <div
//                     className={cn(
//                       "mt-2.5 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border w-fit",
//                       assignFeedback.type === "success"
//                         ? "bg-white/15 border-white/20 text-white"
//                         : "bg-red-500/20 border-red-400/40 text-white",
//                     )}
//                   >
//                     {assignFeedback.type === "success" ? (
//                       <CheckCircle className="w-3.5 h-3.5" />
//                     ) : (
//                       <XCircle className="w-3.5 h-3.5" />
//                     )}
//                     {assignFeedback.message}
//                   </div>
//                 )}
//               </div>

//               <div className="flex flex-col gap-2 ml-4 flex-shrink-0 relative z-10">
//                 <button
//                   onClick={() => setShowFlagPopup(true)}
//                   title={isAdmin ? "Raise flag for VAs" : "Raise flag for admin"}
//                   className={cn(
//                     "p-2.5 rounded-xl transition-all border shadow-sm flex items-center justify-center hover:scale-105 active:scale-95",
//                     isAdmin
//                       ? "bg-[#65BD6C]/20 hover:bg-[#65BD6C]/30 text-[#65BD6C] hover:text-white border-[#65BD6C]/40"
//                       : "bg-[#E15C4E]/20 hover:bg-[#E15C4E]/30 text-[#E15C4E] hover:text-white border-[#E15C4E]/40"
//                   )}
//                 >
//                   <Flag className="w-4 h-4" fill="currentColor" />
//                 </button>
//                 <button
//                   onClick={onClose}
//                   title="Press ESC to close"
//                   className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all shadow-sm border border-white/10 hover:rotate-90 duration-300"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>
//             </div>

//             {/* ================= BODY (bento grid) ================= */}
//             <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-[#036638] scrollbar-thumb-rounded">
//               <div className="p-4 sm:p-8">

//                 {/* ---- Stage Navigation (sticky, full width) ---- */}
//                 <div className="sticky top-0 z-20 bg-[#F7F7FA]/85 backdrop-blur-2xl border-b border-gray-200/50 -mx-4 px-4 sm:-mx-8 sm:px-8 py-3 sm:py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] mb-5 sm:mb-6">
//                   <div className="flex items-center justify-between mb-3">
//                     <p className="text-[11px] font-bold text-[#036638] uppercase tracking-widest flex items-center gap-2">
//                       <span className="w-1.5 h-1.5 bg-[#036638] rounded-full shadow-[0_0_8px_rgba(3,102,56,0.6)]" />
//                       Pipeline Stage
//                     </p>
//                     <span className="text-[10px] font-semibold text-[#6B7280]">
//                       Step {stageOrder.indexOf(patient.stage) + 1} of {stageOrder.length}
//                     </span>
//                   </div>
//                   <div className="flex w-full overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300">
//                     {stageOrder.map((stage, idx) => {
//                       const currentIdx = stageOrder.indexOf(patient.stage)
//                       const isComplete = idx < currentIdx
//                       const isCurrent = stage === patient.stage
//                       const isNext = idx === currentIdx + 1
//                       const isFuture = idx > currentIdx + 1
//                       const isLast = idx === stageOrder.length - 1

//                       const canAdvanceToNext = allComplete
//                       const isClickable =
//                         isCurrent ? false :
//                         isComplete ? true :
//                         isNext ? canAdvanceToNext :
//                         false

//                       const isBlocked = isNext && !allComplete
//                       const isDisabledReason = isBlocked
//                         ? "Tick every required item before moving this card forward."
//                         : isFuture
//                           ? "Complete the current stage first"
//                           : null

//                       return (
//                         <div key={stage} className="relative flex-1 min-w-[76px] sm:min-w-[92px] flex flex-col items-center">
//                           {!isLast && (
//                             <div
//                               className={cn(
//                                 "absolute top-4 left-1/2 w-full h-0.5 -z-0 transition-colors duration-500",
//                                 isComplete ? "bg-[#65BD6C]" : "bg-gray-200",
//                               )}
//                             />
//                           )}
//                           <button
//                             onClick={() => isClickable && handleMoveStage(stage)}
//                             disabled={moveStage.isPending || !isClickable}
//                             title={isDisabledReason || stageLabels[stage]}
//                             className="relative z-10 flex flex-col items-center gap-1.5 group"
//                           >
//                             <span
//                               className={cn(
//                                 "flex items-center justify-center w-8 h-8 rounded-full border-2 text-[11px] font-bold transition-all shrink-0",
//                                 isCurrent &&
//                                   "bg-[#036638] border-[#036638] text-white shadow-[0_0_0_4px_rgba(3,102,56,0.15)] scale-110",
//                                 !isCurrent && isComplete &&
//                                   "bg-[#EBF7EC] border-[#65BD6C] text-[#036638] group-hover:bg-[#dff4eb] cursor-pointer",
//                                 !isCurrent && !isComplete && !isFuture && isClickable &&
//                                   "bg-white border-[#036638]/40 text-[#036638] group-hover:border-[#036638] group-hover:shadow-sm cursor-pointer",
//                                 !isCurrent && !isComplete && !isClickable &&
//                                   "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed",
//                               )}
//                             >
//                               {isComplete ? (
//                                 <Check className="w-4 h-4" />
//                               ) : isBlocked ? (
//                                 <Lock className="w-3.5 h-3.5" />
//                               ) : (
//                                 idx + 1
//                               )}
//                             </span>
//                             <span
//                               className={cn(
//                                 "text-[10px] font-semibold text-center leading-tight max-w-[84px] truncate transition-colors",
//                                 isCurrent ? "text-[#036638]" : isComplete ? "text-[#036638]/70" : "text-gray-400",
//                               )}
//                             >
//                               {stageLabels[stage]}
//                             </span>
//                           </button>
//                         </div>
//                       )
//                     })}
//                   </div>
//                 </div>

//                 {/* ---- BENTO GRID ---- */}
//                 <div className="grid grid-cols-12 gap-4 sm:gap-5">

//                   {/* Checklist — big tile */}
//                   <Bento
//                     icon={ClipboardList}
//                     title={`Checklist — ${stageLabels[patient.stage]}`}
//                     color="emerald"
//                     span="col-span-12 lg:col-span-7"
//                     action={
//                       <div className="flex items-center gap-2 shrink-0">
//                         {checklistBusy && <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />}
//                         {!allComplete && totalItems > 0 && !isAdmin && (
//                           <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 shadow-sm">
//                             {totalItems - completedItems} left
//                           </span>
//                         )}
//                         {totalItems > 0 && <ProgressRing progress={progress} />}
//                       </div>
//                     }
//                   >
//                     {currentStageItems.length > 0 ? (
//                       <>
//                         {totalItems > 0 ? (
//                           <div className="mb-4">
//                             <div className="flex items-center justify-between text-xs text-emerald-800/70 mb-2">
//                               <span className="font-medium">{completedItems} / {totalItems} Completed</span>
//                             </div>
//                             <div className="w-full h-2.5 bg-emerald-100 rounded-full overflow-hidden">
//                               <div
//                                 className={cn(
//                                   "h-full rounded-full transition-all duration-500",
//                                   allComplete ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-emerald-500",
//                                 )}
//                                 style={{ width: `${progress}%` }}
//                               />
//                             </div>
//                             {allComplete && (
//                               <p className="text-xs text-emerald-700 font-medium mt-2 flex items-center gap-1">
//                                 <Check className="w-3.5 h-3.5" />
//                                 Ready to advance to next stage
//                               </p>
//                             )}
//                           </div>
//                         ) : (
//                           <p className="text-xs text-emerald-800/60 italic mb-4">
//                             No required items - this stage can advance without checking anything.
//                           </p>
//                         )}

//                         <div className="flex flex-wrap items-center gap-2 mb-5 mt-2">
//                           <Button
//                             size="sm"
//                             variant="outline"
//                             onClick={() => handleBulkChecklist(true)}
//                             disabled={checklistBusy}
//                             className="text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-50 hover:border-emerald-400 transition-all shadow-sm font-semibold"
//                           >
//                             <CheckCheck className="w-3.5 h-3.5" />
//                             Check All
//                           </Button>
//                           <Button
//                             size="sm"
//                             variant="outline"
//                             onClick={() => handleBulkChecklist(false)}
//                             disabled={checklistBusy}
//                             className="text-xs gap-1.5 border-gray-200 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm font-medium"
//                           >
//                             <ListX className="w-3.5 h-3.5" />
//                             Uncheck All
//                           </Button>
//                           {bulkPending && (
//                             <span className="text-[10px] font-medium text-emerald-700 flex items-center gap-1.5 ml-2">
//                               <Loader2 className="w-3.5 h-3.5 animate-spin" />
//                               Updating...
//                             </span>
//                           )}
//                         </div>

//                         <div className={cn("space-y-2 transition-opacity duration-200", checklistBusy && "opacity-50 pointer-events-none")}>
//                           {currentStageItems.map((item) => {
//                             const checked = !!currentState[item.id]
//                             return (
//                               <label
//                                 key={item.id}
//                                 className={cn(
//                                   "flex items-start gap-2.5 py-3 px-3 rounded-2xl cursor-pointer transition-all border",
//                                   checked ? "border-emerald-300 bg-white" : "border-transparent bg-white/60 hover:bg-white hover:border-emerald-200",
//                                   checklistBusy && "hover:bg-white/60",
//                                 )}
//                               >
//                                 <input
//                                   type="checkbox"
//                                   checked={checked}
//                                   disabled={checklistBusy}
//                                   onChange={() =>
//                                     toggleChecklist.mutate({
//                                       id: patient.id,
//                                       itemId: item.id,
//                                       checked: !checked,
//                                     })
//                                   }
//                                   className="mt-1 w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
//                                 />
//                                 <div className="flex-1 min-w-0">
//                                   <div className="flex items-center gap-2 flex-wrap">
//                                     <span
//                                       className={cn(
//                                         "text-sm font-semibold transition-all",
//                                         checked ? "text-emerald-800/50 line-through" : "text-[#1A1B1E]",
//                                       )}
//                                     >
//                                       {item.label}
//                                     </span>
//                                     <span
//                                       className={cn(
//                                         "px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider",
//                                         item.status === "required"
//                                           ? "bg-rose-100 text-rose-700"
//                                           : "bg-emerald-100 text-emerald-700",
//                                       )}
//                                     >
//                                       {item.status === "required" ? "Required" : "Optional"}
//                                     </span>
//                                   </div>
//                                   {item.description && (
//                                     <p className="text-[11px] text-gray-500 mt-1">{item.description}</p>
//                                   )}
//                                 </div>
//                               </label>
//                             )
//                           })}
//                         </div>
//                       </>
//                     ) : (
//                       <p className="text-xs text-emerald-800/60 italic py-2">No checklist items for this stage</p>
//                     )}
//                   </Bento>

//                   {/* SOP — narrow tile */}
//                   <Bento icon={Zap} title="Standard Operating Procedure" color="amber" span="col-span-12 lg:col-span-5">
//                     <ul className="space-y-2">
//                       {STAGE_SOPs[patient.stage]?.map((sop, idx) => (
//                         <li key={idx} className="flex items-start gap-2.5 text-sm text-amber-900 bg-white/70 rounded-2xl px-3 py-2.5 border border-amber-100">
//                           <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold shrink-0 mt-0.5 shadow">
//                             {idx + 1}
//                           </span>
//                           <span>{sop}</span>
//                         </li>
//                       ))}
//                     </ul>
//                   </Bento>

//                   {/* Details — four small stat tiles */}
//                   {patient.assignedUser && (
//                     <div className="col-span-6 lg:col-span-3">
//                       <StatTile icon={UserCheck} label="Assigned To" value={patient.assignedUser.name} color="indigo" />
//                     </div>
//                   )}
//                   <div className="col-span-6 lg:col-span-3">
//                     <StatTile icon={Sparkles} label="Source" value={patient.source || "Manual"} color="violet" />
//                   </div>
//                   {patient.bookingPlatform && (
//                     <div className="col-span-6 lg:col-span-3">
//                       <StatTile icon={Building2} label="Booking Platform" value={patient.bookingPlatform} color="sky" />
//                     </div>
//                   )}
//                   {patient.paymentMethod && (
//                     <div className="col-span-6 lg:col-span-3">
//                       <StatTile icon={Wallet} label="Payment Method" value={patient.paymentMethod} color="fuchsia" />
//                     </div>
//                   )}
//                   {patient.insuranceProvider && (
//                     <div className="col-span-6 lg:col-span-3">
//                       <StatTile icon={Shield} label="Insurance Provider" value={patient.insuranceProvider} color="rose" />
//                     </div>
//                   )}
//                   <div className="col-span-6 lg:col-span-3">
//                     <StatTile icon={Clock3} label="Last Updated" value={timeAgo(patient.updatedAt)} color="slate" />
//                   </div>

//                   {/* Eligibility — medium tile */}
//                   <Bento
//                     icon={Shield}
//                     title="Eligibility Check"
//                     color="sky"
//                     span="col-span-12 lg:col-span-6"
//                     action={
//                       <span
//                         className={cn(
//                           "text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0",
//                           patient.eligibilityStatus === "eligible" &&
//                             "bg-emerald-100 text-emerald-700 border-emerald-200",
//                           patient.eligibilityStatus === "not_eligible" &&
//                             "bg-rose-100 text-rose-700 border-rose-200",
//                           patient.eligibilityStatus === "not_checked" &&
//                             "bg-white text-gray-500 border-gray-200",
//                         )}
//                       >
//                         {patient.eligibilityStatus === "eligible"
//                           ? "Eligible"
//                           : patient.eligibilityStatus === "not_eligible"
//                             ? "Not Eligible"
//                             : "Not Checked"}
//                       </span>
//                     }
//                   >
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-semibold text-sky-800/70 uppercase tracking-wider">
//                           Payment Type
//                         </label>
//                         <SelectOrOther
//                           value={paymentMethod}
//                           onChange={setPaymentMethod}
//                           otherMode={paymentMethodOther}
//                           onOtherModeChange={setPaymentMethodOther}
//                           options={PAYMENT_METHOD_OPTIONS}
//                           placeholder="Select payment type..."
//                         />
//                       </div>
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-semibold text-sky-800/70 uppercase tracking-wider">
//                           Insurance Company
//                         </label>
//                         <SelectOrOther
//                           value={insuranceProvider}
//                           onChange={setInsuranceProvider}
//                           otherMode={insuranceProviderOther}
//                           onOtherModeChange={setInsuranceProviderOther}
//                           options={INSURANCE_PROVIDER_OPTIONS}
//                           placeholder="Select insurance company..."
//                         />
//                       </div>
//                     </div>

//                     {patient.eligibilityStatus === "eligible" && (
//                       <div className="bg-white rounded-2xl p-3 border border-emerald-200 mb-3 shadow-sm">
//                         <div className="flex items-center gap-2">
//                           <CheckCircle className="w-4 h-4 text-emerald-600" />
//                           <p className="text-sm font-semibold text-emerald-700">Eligible</p>
//                           {patient.eligibilityCheckedAt && (
//                             <span className="text-[10px] text-gray-500 ml-auto">
//                               Checked {new Date(patient.eligibilityCheckedAt).toLocaleString()}
//                             </span>
//                           )}
//                         </div>
//                       </div>
//                     )}

//                     {patient.eligibilityStatus === "not_eligible" && (
//                       <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 mb-3">
//                         <div className="flex items-center gap-2">
//                           <XCircle className="w-4 h-4 text-rose-600" />
//                           <p className="text-sm font-semibold text-rose-700">Not Eligible</p>
//                           {patient.eligibilityCheckedAt && (
//                             <span className="text-[10px] text-gray-500 ml-auto">
//                               Checked {new Date(patient.eligibilityCheckedAt).toLocaleString()}
//                             </span>
//                           )}
//                         </div>
//                         {patient.eligibilityReason && (
//                           <p className="text-xs text-rose-700/80 mt-1.5">{patient.eligibilityReason}</p>
//                         )}
//                       </div>
//                     )}

//                     {patient.eligibilityStatus === "not_checked" && (
//                       <p className="text-sm text-sky-900/60 italic mb-3">
//                         Use &ldquo;Check Eligibility&rdquo; in the header above to compare this
//                         patient&apos;s payment details against the configured rules.
//                       </p>
//                     )}

//                     {patient.eligibilityDetails?.vob && (
//                       <div className="grid grid-cols-2 gap-2 text-sm">
//                         {VOB_LABELS.map(([key, label]) => {
//                           const value = patient.eligibilityDetails?.vob?.[key]
//                           if (value === undefined || value === null) return null
//                           const display =
//                             typeof value === "boolean"
//                               ? value ? "Required" : "Not Required"
//                               : String(value)
//                           return (
//                             <div key={key} className="bg-white rounded-xl p-2.5 border border-sky-100 shadow-sm">
//                               <p className="text-[10px] text-gray-500 font-medium">{label}</p>
//                               <p className="text-sm font-semibold text-[#1A1B1E]">{display}</p>
//                             </div>
//                           )
//                         })}
//                       </div>
//                     )}
//                   </Bento>

//                   {/* Status & Access — medium tile */}
//                   <Bento icon={Shield} title="Status & Access" color="indigo" span="col-span-12 lg:col-span-6">
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                       <div className="space-y-3">
//                         <p className="text-[10px] font-bold text-indigo-800/60 uppercase tracking-widest">Current Status</p>
//                         <div className="flex flex-col items-start gap-2.5">
//                           <span
//                             className={cn(
//                               "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-all",
//                               patient.status === "active" && "bg-white text-emerald-700 border-emerald-200",
//                               patient.status === "completed" && "bg-emerald-100 text-emerald-800 border-emerald-200",
//                               patient.status === "cancelled" && "bg-white text-rose-700 border-rose-200",
//                             )}
//                           >
//                             <span
//                               className={cn(
//                                 "w-2 h-2 rounded-full",
//                                 patient.status === "active" && "bg-emerald-500",
//                                 patient.status === "completed" && "bg-emerald-600",
//                                 patient.status === "cancelled" && "bg-rose-500",
//                               )}
//                             />
//                             {patient.status === "active" ? "Active" : patient.status === "completed" ? "Completed" : "Cancelled"}
//                           </span>

//                           {patient.isPrivate ? (
//                             <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border border-amber-300 bg-amber-50 text-amber-800 shadow-sm">
//                               <Lock className="w-3.5 h-3.5" />
//                               <div className="flex flex-col">
//                                 <span>Locked{patient.privateLockedByUser ? ` by ${patient.privateLockedByUser.name}` : ""}</span>
//                                 {patient.privateLockedAt && (
//                                   <span className="text-[9px] font-medium opacity-80 -mt-0.5">
//                                     {new Date(patient.privateLockedAt).toLocaleString()}
//                                   </span>
//                                 )}
//                               </div>
//                             </div>
//                           ) : patient.status === "active" ? (
//                             <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-white text-gray-500 shadow-sm">
//                               <Unlock className="w-3.5 h-3.5" />
//                               Open - any VA can work
//                             </span>
//                           ) : null}
//                         </div>
//                       </div>

//                       <div className="space-y-3">
//                         <p className="text-[10px] font-bold text-indigo-800/60 uppercase tracking-widest">Access Controls</p>
//                         <div className="flex flex-col gap-2.5">
//                           {patient.isPrivate ? (
//                             canUnlock ? (
//                               <Button
//                                 size="sm"
//                                 variant="outline"
//                                 onClick={() => unlockPatient.mutate(patient.id)}
//                                 disabled={unlockPatient.isPending}
//                                 className="w-full text-xs gap-2 border-amber-300 text-amber-700 bg-white hover:bg-amber-50 hover:text-amber-900 transition-all shadow-sm font-semibold justify-start"
//                               >
//                                 <Unlock className="w-3.5 h-3.5" />
//                                 {unlockPatient.isPending ? "Unlocking..." : "Unlock Access"}
//                               </Button>
//                             ) : (
//                               <div className="text-xs text-amber-700/80 flex items-start gap-2 py-2 px-3 bg-white/60 rounded-xl border border-amber-100">
//                                 <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
//                                 <p>Only <span className="font-semibold">{patient.privateLockedByUser?.name ?? "the locking VA"}</span> or an admin can edit.</p>
//                               </div>
//                             )
//                           ) : canLock ? (
//                             <Button
//                               size="sm"
//                               variant="outline"
//                               onClick={() => lockPatient.mutate(patient.id)}
//                               disabled={lockPatient.isPending}
//                               className="w-full text-xs gap-2 border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50 hover:text-indigo-900 transition-all shadow-sm font-semibold justify-start"
//                             >
//                               <Lock className="w-3.5 h-3.5" />
//                               {lockPatient.isPending ? "Locking..." : "Lock (restrict other VAs)"}
//                             </Button>
//                           ) : (
//                             <div className="text-xs text-gray-500 flex items-start gap-2 py-2 px-3 bg-white/60 rounded-xl border border-gray-100">
//                               <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
//                               <p>Only the assigned VA or an admin can lock this patient.</p>
//                             </div>
//                           )}

//                           {isAdmin && patient.status !== "cancelled" && !showCancelInput && (
//                             <Button
//                               size="sm"
//                               variant="outline"
//                               onClick={() => setShowCancelInput(true)}
//                               className="w-full text-xs gap-2 border-rose-200 text-rose-600 bg-white hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 transition-all shadow-sm font-semibold justify-start"
//                             >
//                               <Ban className="w-3.5 h-3.5" />
//                               Mark Cancelled
//                             </Button>
//                           )}
//                           {isAdmin && patient.status === "cancelled" && (
//                             <Button
//                               size="sm"
//                               variant="outline"
//                               onClick={() => updateStatus.mutate({ id: patient.id, status: "active" })}
//                               disabled={updateStatus.isPending}
//                               className="w-full text-xs gap-2 border-emerald-300 text-emerald-700 bg-white hover:bg-emerald-50 transition-all shadow-sm font-semibold justify-start"
//                             >
//                               <RefreshCw className="w-3.5 h-3.5" />
//                               {updateStatus.isPending ? "Reactivating..." : "Reactivate Patient"}
//                             </Button>
//                           )}
//                         </div>
//                       </div>
//                     </div>

//                     <div className={cn(
//                       "grid transition-all duration-300 ease-in-out",
//                       (isAdmin && showCancelInput) || (patient.status === "cancelled" && patient.cancelledReason)
//                         ? "grid-rows-[1fr] mt-5 opacity-100"
//                         : "grid-rows-[0fr] opacity-0"
//                     )}>
//                       <div className="overflow-hidden">
//                         <div className="pt-4 border-t border-indigo-100">
//                           {isAdmin && showCancelInput && (
//                             <div className="space-y-3 bg-white/70 p-4 rounded-2xl border border-rose-100">
//                               <p className="text-[11px] font-bold text-rose-800 uppercase tracking-widest flex items-center gap-1.5">
//                                 <AlertTriangle className="w-3.5 h-3.5" />
//                                 Cancellation Reason
//                               </p>
//                               <Textarea
//                                 placeholder="Optional reason for cancelling..."
//                                 value={cancelReason}
//                                 onChange={(e) => setCancelReason(e.target.value)}
//                                 className="text-sm min-h-[80px] bg-white border-rose-200 focus:border-rose-400 focus:ring-rose-400"
//                               />
//                               <div className="flex gap-2.5">
//                                 <Button
//                                   size="sm"
//                                   onClick={handleCancelPatient}
//                                   disabled={updateStatus.isPending}
//                                   className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm"
//                                 >
//                                   {updateStatus.isPending ? "Cancelling..." : "Confirm Cancellation"}
//                                 </Button>
//                                 <Button
//                                   variant="ghost"
//                                   size="sm"
//                                   onClick={() => setShowCancelInput(false)}
//                                   className="text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
//                                 >
//                                   Cancel
//                                 </Button>
//                               </div>
//                             </div>
//                           )}

//                           {patient.status === "cancelled" && patient.cancelledReason && (
//                             <div className="bg-white/70 border border-rose-100 rounded-2xl p-4 flex gap-3">
//                               <div className="mt-0.5">
//                                 <Ban className="w-4 h-4 text-rose-600" />
//                               </div>
//                               <div>
//                                 <p className="text-sm font-semibold text-rose-800 mb-1">Cancellation Reason</p>
//                                 <p className="text-sm text-rose-900/80 leading-relaxed">{patient.cancelledReason}</p>
//                               </div>
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   </Bento>

//                   {/* Flag banners — full width */}
//                   {patient.isFlagged && (
//                     <div className="col-span-12 bg-rose-50 border border-rose-200 rounded-3xl p-4 shadow-sm">
//                       <p className="text-sm font-bold text-rose-700 flex items-center gap-2">
//                         <Flag className="w-4 h-4" fill="#e11d48" />
//                         Flagged for Donna
//                       </p>
//                       {patient.flagReason && (
//                         <p className="text-sm text-[#1A1B1E] mt-2 bg-white rounded-xl p-3 border border-rose-100">
//                           {patient.flagReason}
//                         </p>
//                       )}
//                       {patient.flaggedByUser && (
//                         <p className="text-[11px] text-gray-500 mt-2 font-medium">
//                           by <span className="text-rose-700 font-semibold">{patient.flaggedByUser.name}</span>
//                           {patient.flaggedAt && ` - ${new Date(patient.flaggedAt).toLocaleString()}`}
//                         </p>
//                       )}
//                     </div>
//                   )}

//                   {patient.flagClearedReason && (
//                     <div className="col-span-12 bg-emerald-50 border border-emerald-200 rounded-3xl p-4 shadow-sm">
//                       <p className="text-sm font-bold text-emerald-700 flex items-center gap-2">
//                         <Check className="w-4 h-4" />
//                         Donna's Response
//                       </p>
//                       <p className="text-sm text-[#1A1B1E] mt-2 bg-white rounded-xl p-3 border border-emerald-100">
//                         {patient.flagClearedReason}
//                       </p>
//                       {patient.flagClearedByUser && (
//                         <p className="text-[11px] text-gray-500 mt-2 font-medium">
//                           by <span className="text-emerald-700 font-semibold">Donna Rhodes</span>
//                           {patient.flagClearedAt && ` - ${new Date(patient.flagClearedAt).toLocaleString()}`}
//                         </p>
//                       )}
//                     </div>
//                   )}

//                   {/* Contact & Payment — big tile */}
//                   <Bento
//                     icon={CreditCard}
//                     title="Contact & Payment Info"
//                     color="fuchsia"
//                     span="col-span-12 lg:col-span-7"
//                     action={
//                       <Button
//                         size="sm"
//                         onClick={handleSaveContact}
//                         disabled={savingContact || updatePatient.isPending}
//                         className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs shrink-0"
//                       >
//                         {savingContact || updatePatient.isPending ? "Saving..." : "Save Details"}
//                       </Button>
//                     }
//                   >
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                       {(
//                         [
//                           ["firstName", "First Name"],
//                           ["lastName", "Last Name"],
//                           ["location", "Location"],
//                           ["phone", "Phone"],
//                           ["email", "Email"],
//                           ["copayAmount", "Copay Amount"],
//                           ["amountPaid", "Total Paid"],
//                         ] as const
//                       ).map(([key, label]) => (
//                         <div key={key} className="space-y-1">
//                           <label className="text-[10px] font-semibold text-fuchsia-800/60 uppercase tracking-wider">
//                             {label}
//                           </label>
//                           <input
//                             value={contactForm[key]}
//                             onChange={(e) => setContactForm((f) => ({ ...f, [key]: e.target.value }))}
//                             className="w-full h-9 px-2.5 rounded-xl border border-fuchsia-100 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-300/40 bg-white transition-shadow"
//                           />
//                         </div>
//                       ))}
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-semibold text-fuchsia-800/60 uppercase tracking-wider">
//                           Payment Type
//                         </label>
//                         <SelectOrOther
//                           value={paymentMethod}
//                           onChange={setPaymentMethod}
//                           otherMode={paymentMethodOther}
//                           onOtherModeChange={setPaymentMethodOther}
//                           options={PAYMENT_METHOD_OPTIONS}
//                           placeholder="Select payment type..."
//                         />
//                       </div>
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-semibold text-fuchsia-800/60 uppercase tracking-wider">
//                           Insurance Company
//                         </label>
//                         <SelectOrOther
//                           value={insuranceProvider}
//                           onChange={setInsuranceProvider}
//                           otherMode={insuranceProviderOther}
//                           onOtherModeChange={setInsuranceProviderOther}
//                           options={INSURANCE_PROVIDER_OPTIONS}
//                           placeholder="Select insurance company..."
//                         />
//                       </div>
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-semibold text-fuchsia-800/60 uppercase tracking-wider">
//                           Visit Status
//                         </label>
//                         <select
//                           value={visitStatus}
//                           onChange={(e) => setVisitStatus(e.target.value)}
//                           className="w-full h-9 px-2.5 rounded-xl border border-fuchsia-100 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-300/40 bg-white appearance-none cursor-pointer"
//                         >
//                           {VISIT_STATUS_OPTIONS.map((o) => (
//                             <option key={o.value} value={o.value}>{o.label}</option>
//                           ))}
//                         </select>
//                       </div>
//                     </div>
//                   </Bento>

//                   {/* Flag controls + Notes stacked in narrow column */}
//                   <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 sm:gap-5">
//                     {!patient.isFlagged ? (
//                       <div className={cn(
//                         "border rounded-3xl p-4 space-y-3",
//                         isAdmin
//                           ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/60"
//                           : "bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200/60"
//                       )}>
//                         {!showFlagInput ? (
//                           <Button
//                             variant="outline"
//                             size="sm"
//                             onClick={() => setShowFlagInput(true)}
//                             className={cn(
//                               "text-xs gap-2 font-medium w-full justify-start",
//                               isAdmin
//                                 ? "border-amber-300 text-amber-700 hover:text-amber-900 hover:bg-amber-100 hover:border-amber-400"
//                                 : "border-rose-300 text-rose-700 hover:text-rose-900 hover:bg-rose-100 hover:border-rose-400"
//                             )}
//                           >
//                             <Flag className="w-4 h-4" fill="currentColor" />
//                             {isAdmin ? "Raise Admin Follow-up Flag" : "Flag for Donna"}
//                           </Button>
//                         ) : (
//                           <div className="space-y-3.5">
//                             <div>
//                               <label className={cn(
//                                 "text-xs font-semibold block mb-1.5",
//                                 isAdmin ? "text-amber-900" : "text-rose-900"
//                               )}>
//                                 Related Stage (optional)
//                               </label>
//                               <select
//                                 value={flagStage}
//                                 onChange={(e) => setFlagStage(e.target.value as PatientStage | "")}
//                                 className="w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all bg-white/70"
//                                 style={{
//                                   borderColor: isAdmin ? '#daa520' : '#e11d48',
//                                 }}
//                               >
//                                 <option value="">-- Select stage (optional) --</option>
//                                 {stageOrder.map((stage) => (
//                                   <option key={stage} value={stage}>{stageLabels[stage]}</option>
//                                 ))}
//                               </select>
//                             </div>

//                             <div>
//                               <label className={cn(
//                                 "text-xs font-semibold block mb-1.5",
//                                 isAdmin ? "text-amber-900" : "text-rose-900"
//                               )}>
//                                 Reason <span className="text-red-500">*</span>
//                               </label>
//                               <Textarea
//                                 placeholder={isAdmin ? "e.g., Missing lab results, needs review before billing..." : "e.g., Patient called, needs Donna's guidance..."}
//                                 value={flagReason}
//                                 onChange={(e) => setFlagReason(e.target.value)}
//                                 className="text-xs min-h-[70px] resize-none"
//                               />
//                             </div>

//                             <div className="flex gap-2">
//                               <Button
//                                 size="sm"
//                                 onClick={handleFlag}
//                                 disabled={!flagReason.trim() || flagPatient.isPending}
//                                 className={cn(
//                                   "text-xs font-medium flex-1",
//                                   isAdmin
//                                     ? "bg-amber-600 hover:bg-amber-700 text-white"
//                                     : "bg-rose-600 hover:bg-rose-700 text-white"
//                                 )}
//                               >
//                                 {flagPatient.isPending ? (
//                                   <>
//                                     <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
//                                     Flagging...
//                                   </>
//                                 ) : (
//                                   <>
//                                     <Flag className="w-3 h-3 mr-1.5" fill="currentColor" />
//                                     {isAdmin ? "Submit Admin Flag" : "Flag for Donna"}
//                                   </>
//                                 )}
//                               </Button>
//                               <Button
//                                 variant="ghost"
//                                 size="sm"
//                                 onClick={() => {
//                                   setShowFlagInput(false)
//                                   setFlagReason("")
//                                   setFlagStage("")
//                                 }}
//                                 className="text-xs"
//                               >
//                                 Cancel
//                               </Button>
//                             </div>
//                           </div>
//                         )}
//                       </div>
//                     ) : isAdmin && patient.isFlagged && !showClearInput ? (
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => setShowClearInput(true)}
//                         className="text-xs gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-900 hover:border-rose-300 w-full font-medium"
//                       >
//                         <CheckCircle className="w-3.5 h-3.5" />
//                         Clear Flag & Provide Feedback
//                       </Button>
//                     ) : null}

//                     {isAdmin && showClearInput && (
//                       <div className="space-y-2 bg-white rounded-2xl p-4 border border-gray-200">
//                         <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
//                           Provide Feedback to VA
//                         </p>
//                         <Textarea
//                           placeholder="Explain why you're clearing this flag (sent to the VA who flagged)..."
//                           value={clearReason}
//                           onChange={(e) => setClearReason(e.target.value)}
//                           className="text-sm min-h-[60px]"
//                         />
//                         <div className="flex gap-2">
//                           <Button
//                             size="sm"
//                             onClick={handleClearFlag}
//                             disabled={!clearReason.trim() || clearFlag.isPending}
//                             className="bg-[#036638] hover:bg-[#02804A] text-white text-xs"
//                           >
//                             {clearFlag.isPending ? "Clearing..." : "Confirm Clear"}
//                           </Button>
//                           <Button
//                             variant="ghost"
//                             size="sm"
//                             onClick={() => { setShowClearInput(false); setClearReason("") }}
//                             className="text-xs"
//                           >
//                             Cancel
//                           </Button>
//                         </div>
//                       </div>
//                     )}

//                     <Bento icon={Pencil} title="Operational Notes" color="slate" span="">
//                       <div className="space-y-3">
//                         <Textarea
//                           placeholder="Add operational notes (no clinical data)..."
//                           value={notesText}
//                           onChange={(e) => setNotesText(e.target.value)}
//                           className="text-sm min-h-24 rounded-xl border-slate-200 focus:border-slate-500 focus:ring-slate-400 bg-white"
//                         />
//                         <div className="flex justify-end">
//                           <Button
//                             size="sm"
//                             onClick={handleSaveNotes}
//                             disabled={savingNotes}
//                             className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 rounded-lg transition-all shadow-sm"
//                           >
//                             {savingNotes ? "Saving..." : "Save Notes"}
//                           </Button>
//                         </div>
//                       </div>
//                     </Bento>
//                   </div>

//                   {/* Activity Log — full width */}
//                   <div className="col-span-12">
//                     <div className="border border-violet-200/70 bg-gradient-to-br from-violet-50 to-white rounded-[28px] p-4 sm:p-6 shadow-[0_6px_24px_rgba(0,0,0,0.04)]">
//                       <div className="flex items-center gap-2.5 mb-4">
//                         <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg bg-violet-500 text-white">
//                           <Activity className="w-4 h-4" />
//                         </div>
//                         <h3 className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-violet-900">
//                           Activity Log
//                         </h3>
//                       </div>
//                       <div className="space-y-3 max-h-64 overflow-y-auto pr-2 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-violet-200/60">
//                         {logData?.logs && logData.logs.length > 0 ? (
//                           logData.logs.map((log) => {
//                             const isAdminMessage = log.author === "Donna Rhodes" || log.author.toLowerCase() === "admin"
//                             return (
//                               <div
//                                 key={log.id}
//                                 className={cn(
//                                   "relative flex items-start gap-3 text-xs py-3 px-4 rounded-2xl ml-6 transition-all border bg-white shadow-sm hover:shadow-md",
//                                   isAdminMessage
//                                     ? "border-emerald-200 ring-1 ring-emerald-100"
//                                     : "border-violet-100"
//                                 )}
//                               >
//                                 <div className={cn(
//                                   "absolute top-5 -left-[29px] w-2.5 h-2.5 rounded-full border-2 border-white ring-4 ring-white shadow-sm",
//                                   isAdminMessage ? "bg-emerald-500" : "bg-violet-400"
//                                 )} />
//                                 <span className={cn(
//                                   "text-[10px] whitespace-nowrap pt-0.5 min-w-[70px]",
//                                   isAdminMessage ? "text-emerald-700 font-medium" : "text-gray-400"
//                                 )}>
//                                   {new Date(log.createdAt).toLocaleString("en-US", {
//                                     month: "short",
//                                     day: "numeric",
//                                     hour: "numeric",
//                                     minute: "2-digit",
//                                   })}
//                                 </span>
//                                 <div className="flex flex-col gap-0.5 w-full">
//                                   <span className={cn(
//                                     "font-bold",
//                                     isAdminMessage ? "text-emerald-800" : "text-violet-700"
//                                   )}>
//                                     {log.author}
//                                   </span>
//                                   <span className={cn(
//                                     "leading-relaxed",
//                                     isAdminMessage ? "text-[#1A1B1E] font-medium" : "text-gray-600"
//                                   )}>{log.message}</span>
//                                 </div>
//                               </div>
//                             )
//                           })
//                         ) : (
//                           <p className="text-xs text-violet-800/50 italic">No activity yet</p>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </>
//         )}

//         {assigning && (
//           <div className="absolute inset-0 z-50 bg-white/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
//             <Loader2 className="w-9 h-9 text-[#036638] animate-spin" />
//             <p className="text-sm font-semibold text-[#036638]">Updating assignment...</p>
//           </div>
//         )}

//         {/* ================= Flag Popup ================= */}
//         {showFlagPopup && (
//           <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 60 }}>
//             <div
//               className="absolute inset-0 bg-black/75 backdrop-blur-lg"
//               onClick={() => setShowFlagPopup(false)}
//             />
//             <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
//               <div className={cn(
//                 "px-6 py-4 flex items-center justify-between",
//                 isAdmin
//                   ? "bg-gradient-to-r from-emerald-500 to-emerald-700"
//                   : "bg-gradient-to-r from-rose-500 to-rose-700"
//               )}>
//                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
//                   <Flag className="w-5 h-5" fill="white" />
//                   {isAdmin ? "Raise Flag for VAs" : "Raise Flag for Admin"}
//                 </h3>
//                 <button
//                   onClick={() => setShowFlagPopup(false)}
//                   className={cn(
//                     "p-1 rounded-lg transition-colors",
//                     isAdmin ? "hover:bg-emerald-900/30 text-white" : "hover:bg-rose-900/30 text-white"
//                   )}
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>

//               <div className="p-6 space-y-4">
//                 <div>
//                   <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
//                     Flag Type
//                   </label>
//                   <div className="flex gap-3">
//                     <label
//                       className={cn(
//                         "flex-1 flex items-center justify-center gap-2 cursor-pointer rounded-xl border px-3 py-2.5 transition-all",
//                         newFlagType === "positive"
//                           ? "border-emerald-400 bg-emerald-50"
//                           : "border-gray-200 hover:border-gray-300",
//                       )}
//                     >
//                       <input
//                         type="radio"
//                         name="flagType"
//                         value="positive"
//                         checked={newFlagType === "positive"}
//                         onChange={(e) => setNewFlagType(e.target.value as "positive" | "negative")}
//                         className="w-4 h-4 accent-emerald-500"
//                       />
//                       <span className="text-sm font-medium text-[#1A1B1E]">✅ Positive</span>
//                     </label>
//                     <label
//                       className={cn(
//                         "flex-1 flex items-center justify-center gap-2 cursor-pointer rounded-xl border px-3 py-2.5 transition-all",
//                         newFlagType === "negative"
//                           ? "border-rose-400 bg-rose-50"
//                           : "border-gray-200 hover:border-gray-300",
//                       )}
//                     >
//                       <input
//                         type="radio"
//                         name="flagType"
//                         value="negative"
//                         checked={newFlagType === "negative"}
//                         onChange={(e) => setNewFlagType(e.target.value as "positive" | "negative")}
//                         className="w-4 h-4 accent-rose-500"
//                       />
//                       <span className="text-sm font-medium text-[#1A1B1E]">⚠️ Alert</span>
//                     </label>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
//                     Reason <span className="text-rose-500">*</span>
//                   </label>
//                   <textarea
//                     value={newFlagReason}
//                     onChange={(e) => setNewFlagReason(e.target.value)}
//                     placeholder={newFlagType === "positive"
//                       ? "e.g., Excellent progress, great patient compliance..."
//                       : "e.g., Missing lab results, needs immediate follow-up..."}
//                     className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300/40 focus:border-emerald-400 resize-none min-h-[100px]"
//                   />
//                 </div>

//                 <div className={cn(
//                   "p-3 rounded-xl text-xs font-medium",
//                   newFlagType === "positive"
//                     ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
//                     : "bg-rose-50 border border-rose-200 text-rose-700"
//                 )}>
//                   {newFlagType === "positive"
//                     ? "✅ Positive flags highlight excellent work and progress."
//                     : "⚠️ Alert flags indicate issues that need immediate follow-up."}
//                 </div>
//               </div>

//               <div className="border-t border-gray-100 px-6 py-4 flex gap-2 justify-end">
//                 <button
//                   onClick={() => {
//                     setShowFlagPopup(false)
//                     setNewFlagReason("")
//                     setNewFlagType("positive")
//                   }}
//                   className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-[#1A1B1E] hover:bg-gray-100 rounded-lg transition-all"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={async () => {
//                     if (patient && newFlagReason.trim()) {
//                       await flagPatient.mutateAsync({ id: patient.id, reason: newFlagReason })
//                       setShowFlagPopup(false)
//                       setNewFlagReason("")
//                       setNewFlagType("positive")
//                       toast.success("Flag raised successfully")
//                     }
//                   }}
//                   disabled={!newFlagReason.trim() || flagPatient.isPending}
//                   className={cn(
//                     "px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 uppercase tracking-wide",
//                     newFlagReason.trim() && !flagPatient.isPending
//                       ? isAdmin
//                         ? "bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
//                         : "bg-rose-500 hover:bg-rose-600 text-white cursor-pointer"
//                       : "bg-gray-200 text-gray-400 cursor-not-allowed"
//                   )}
//                 >
//                   {flagPatient.isPending ? (
//                     <>
//                       <Loader2 className="w-4 h-4 animate-spin" />
//                       Submitting...
//                     </>
//                   ) : (
//                     <>
//                       <Flag className="w-4 h-4" fill="currentColor" />
//                       Raise Flag
//                     </>
//                   )}
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }


// "use client"

// import { useState, useEffect, useMemo, useRef } from "react"
// import type { Patient, PatientStage } from "@/types"
// import { ROLES, STALE_HOURS } from "@/constants"
// import { useStageMeta } from "@/hooks/query/useStages"
// import {
//   X,
//   Flag,
//   Check,
//   CheckCheck,
//   CheckCircle,
//   XCircle,
//   AlertTriangle,
//   MessageSquare,
//   ListX,
//   Loader2,
//   UserCheck,
//   ChevronDown,
//   Zap,
//   Shield,
//   Lock,
//   Unlock,
//   Ban,
//   RefreshCw,
//   Calendar,
//   Pencil,
//   UserPlus,
// } from "lucide-react"
// import { Button } from "@/components/ui/button"
// import { Textarea } from "@/components/ui/textarea"
// import { Badge } from "@/components/ui/badge"
// import { useAuth } from "@/hooks/auth/useAuth"
// import {
//   useMoveStage,
//   useToggleChecklist,
//   useUpdateNotes,
//   useFlagPatient,
//   useClearFlag,
//   useClaimPatient,
//   useAssignPatient,
//   useChecklistItems,
//   useListVas,
//   useCheckEligibility,
//   useUpdatePatient,
//   useLockPatient,
//   useUnlockPatient,
//   useUpdatePatientStatus,
//   useUpdateAppointment,
// } from "@/hooks/query/usePatients"
// import { usePatient } from "@/hooks/query/usePatients"
// import { useActivityLog } from "@/hooks/query/useActivityLog"
// import { SelectOrOther } from "@/components/shared/select-or-other"
// import { PAYMENT_METHOD_OPTIONS, INSURANCE_PROVIDER_OPTIONS, VISIT_STATUS_OPTIONS } from "@/lib/patient-options"
// import { cn } from "@/lib/utils"
// import { toast } from "sonner"

// interface PatientModalProps {
//   patientId: string | null
//   open: boolean
//   onClose: () => void
// }

// const STAGE_SOPs: Record<PatientStage, string[]> = {
//   onboarding: [
//     "Confirm appointment date and time in calendar",
//     "Verify patient contact information (phone, email)",
//     "Send welcome email with pre-visit instructions",
//     "Ensure intake form is completed",
//   ],
//   visit_complete: [
//     "Document visit completion in Optimantra",
//     "Verify all vital signs recorded",
//     "Confirm provider's clinical notes entered",
//     "Flag any abnormalities for review",
//   ],
//   post_visit_docs: [
//     "Generate and send patient instruction letter",
//     "Order and submit required lab work",
//     "Attach lab request forms to patient record",
//     "Confirm patient received all documents",
//   ],
//   chart_signed: [
//     "Ensure Optimantra note is signed by provider",
//     "Run pre-billing clawback check",
//     "Verify CPT codes match services rendered",
//     "Confirm ICD-10 codes are documented",
//     "Check documentation supports diagnosis",
//   ],
//   sent_to_billing: [
//     "Verify claim submission to billing system",
//     "Record claim number and submission date",
//     "Set follow-up reminder for claim status",
//     "Attach claim submission confirmation",
//   ],
//   payment_posted: [
//     "Record payment amount and date received",
//     "Match payment to submitted claim",
//     "Update insurance payer information",
//     "Flag any payment discrepancies",
//   ],
//   reconciled: [
//     "Verify all payments received match billing",
//     "Close patient record in system",
//     "Archive supporting documentation",
//     "Record final reconciliation details",
//   ],
// }

// function timeAgo(dateStr: string): string {
//   const diff = Date.now() - new Date(dateStr).getTime()
//   const hours = Math.floor(diff / (1000 * 60 * 60))
//   if (hours < 1) return "< 1h ago"
//   if (hours < 24) return `${hours}h ago`
//   const days = Math.floor(hours / 24)
//   return `${days}d ago`
// }

// function toLocalDatetimeLocal(date: Date): string {
//   const pad = (n: number) => String(n).padStart(2, "0")
//   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
// }

// const VOB_LABELS: Array<[string, string]> = [
//   ["coverage", "Coverage"],
//   ["payer", "Payer"],
//   ["memberId", "Member ID"],
//   ["groupNumber", "Group Number"],
//   ["copay", "Copay"],
//   ["coinsurance", "Coinsurance"],
//   ["deductible", "Deductible"],
//   ["deductibleMet", "Deductible Met"],
//   ["outOfPocketMax", "Out-of-Pocket Max"],
//   ["authorizationRequired", "Authorization"],
//   ["visitsCoveredPerYear", "Visits / Year"],
//   ["checkDate", "Checked"],
// ]

// export function PatientModal({ patientId, open, onClose }: PatientModalProps) {
//   const { user } = useAuth()
//   const isAdmin = user?.role === "admin"
//   const { order: stageOrder, labels: stageLabels, byKey: stageByKey } = useStageMeta()
//   const { data: patient, isLoading } = usePatient(patientId || "")
//   const { data: logData } = useActivityLog(
//     patientId ? { patientId, limit: 20 } : undefined,
//   )

//   const moveStage = useMoveStage()
//   const toggleChecklist = useToggleChecklist()
//   const updateNotes = useUpdateNotes()
//   const flagPatient = useFlagPatient()
//   const clearFlag = useClearFlag()
//   const claimPatient = useClaimPatient()
//   const assignPatient = useAssignPatient()
//   const updatePatient = useUpdatePatient()
//   const lockPatient = useLockPatient()
//   const unlockPatient = useUnlockPatient()
//   const updateStatus = useUpdatePatientStatus()

//   const { data: checklistDefs } = useChecklistItems()

//   const currentStageItems = useMemo(() => {
//     if (!checklistDefs || !patient) return []
//     return checklistDefs
//       .filter((item) => item.stage === patient.stage)
//       .sort((a, b) => a.sortOrder - b.sortOrder)
//   }, [checklistDefs, patient])

//   const currentState = patient?.checklistState?.[patient.stage] || {}

//   const requiredItems = currentStageItems.filter((item) => item.status === "required")
//   const totalItems = requiredItems.length
//   const completedItems = requiredItems.filter(
//     (item) => currentState[item.id] === true,
//   ).length
//   const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100
//   const allComplete = totalItems === 0 || completedItems === totalItems

//   const { data: vaList } = useListVas()

//   const [notesText, setNotesText] = useState("")
//   const [flagReason, setFlagReason] = useState("")
//   const [showFlagInput, setShowFlagInput] = useState(false)
//   const [flagStage, setFlagStage] = useState<PatientStage | "">("")
//   const [showFlagPopup, setShowFlagPopup] = useState(false)
//   const [newFlagReason, setNewFlagReason] = useState("")
//   const [newFlagType, setNewFlagType] = useState<"positive" | "negative">("positive")
//   const [showAllFlags, setShowAllFlags] = useState(false)
//   const [clearReason, setClearReason] = useState("")
//   const [showClearInput, setShowClearInput] = useState(false)
//   const [savingNotes, setSavingNotes] = useState(false)
//   const [paymentMethod, setPaymentMethod] = useState("")
//   const [insuranceProvider, setInsuranceProvider] = useState("")
//   const [paymentMethodOther, setPaymentMethodOther] = useState(false)
//   const [insuranceProviderOther, setInsuranceProviderOther] = useState(false)
//   const [visitStatus, setVisitStatus] = useState("not_visited")
//   const [contactForm, setContactForm] = useState({
//     firstName: "",
//     lastName: "",
//     location: "",
//     phone: "",
//     email: "",
//     copayAmount: "",
//     amountPaid: "",
//   })
//   const [savingContact, setSavingContact] = useState(false)
//   const [cancelReason, setCancelReason] = useState("")
//   const [showCancelInput, setShowCancelInput] = useState(false)
//   const [editingAppointment, setEditingAppointment] = useState(false)
//   const [newAppointmentDatetime, setNewAppointmentDatetime] = useState("")
//   const checkEligibility = useCheckEligibility()
//   const updateAppointment = useUpdateAppointment()

//   const [bulkPending, setBulkPending] = useState(false)
//   const [assigning, setAssigning] = useState(false)
//   const [assignFeedback, setAssignFeedback] = useState<{
//     type: "success" | "error"
//     message: string
//   } | null>(null)
//   const assignFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
//   const checklistBusy = toggleChecklist.isPending || bulkPending

//   useEffect(() => () => {
//     if (assignFeedbackTimer.current) clearTimeout(assignFeedbackTimer.current)
//   }, [])

//   useEffect(() => {
//     if (patient?.notes) setNotesText(patient.notes)
//     else setNotesText("")
//     const pm = patient?.paymentMethod ?? ""
//     const ip = patient?.insuranceProvider ?? ""
//     setPaymentMethod(pm)
//     setInsuranceProvider(ip)
//     setPaymentMethodOther(pm !== "" && !PAYMENT_METHOD_OPTIONS.includes(pm))
//     setInsuranceProviderOther(ip !== "" && !INSURANCE_PROVIDER_OPTIONS.includes(ip))
//     setVisitStatus(patient?.visitStatus ?? "not_visited")
//     setContactForm({
//       firstName: patient?.firstName ?? "",
//       lastName: patient?.lastName ?? "",
//       location: patient?.location ?? "",
//       phone: patient?.phone ?? "",
//       email: patient?.email ?? "",
//       copayAmount: patient?.copayAmount ?? "",
//       amountPaid: patient?.amountPaid ?? "",
//     })
//     setShowFlagInput(false)
//     setFlagReason("")
//     setShowClearInput(false)
//     setClearReason("")
//     setShowCancelInput(false)
//     setCancelReason("")
//     setEditingAppointment(false)
//     if (patient?.appointmentDatetime) {
//       const dt = new Date(patient.appointmentDatetime)
//       setNewAppointmentDatetime(toLocalDatetimeLocal(dt))
//     } else {
//       setNewAppointmentDatetime("")
//     }
//     setAssigning(false)
//     setAssignFeedback(null)
//   }, [patient?.id, patient?.notes, patient?.paymentMethod, patient?.insuranceProvider, patient?.appointmentDatetime])

//   useEffect(() => {
//     const handleEscape = (e: KeyboardEvent) => {
//       if (e.key === "Escape" && open && !assigning) {
//         onClose()
//       }
//     }
//     window.addEventListener("keydown", handleEscape)
//     return () => window.removeEventListener("keydown", handleEscape)
//   }, [open, onClose, assigning])

//   const handleSaveNotes = async () => {
//     if (!patient) return
//     setSavingNotes(true)
//     await updateNotes.mutateAsync({ id: patient.id, notes: notesText })
//     setSavingNotes(false)
//   }

//   const handleFlag = async () => {
//     if (!patient || !flagReason.trim()) return
//     await flagPatient.mutateAsync({ id: patient.id, reason: flagReason })
//     setShowFlagInput(false)
//     setFlagReason("")
//     setFlagStage("")
//   }

//   const handleClearFlag = async () => {
//     if (!patient || !clearReason.trim()) return
//     await clearFlag.mutateAsync({ id: patient.id, clearReason })
//     setShowClearInput(false)
//     setClearReason("")
//   }

//   const handleMoveStage = async (target: PatientStage) => {
//     if (!patient) return
//     const currentIdx = stageOrder.indexOf(patient.stage)
//     const targetIdx = stageOrder.indexOf(target)
//     if (targetIdx > currentIdx && !allComplete) return
//     await moveStage.mutateAsync({ id: patient.id, targetStage: target })
//   }

//   const handleClaim = async () => {
//     if (!patient || !user) return
//     await claimPatient.mutateAsync({ id: patient.id, userId: user.id })
//   }

//   const handleCheckEligibility = async () => {
//     if (!patient) return
//     await checkEligibility.mutateAsync({
//       id: patient.id,
//       paymentMethod: paymentMethod.trim() || null,
//       insuranceProvider: insuranceProvider.trim() || null,
//     })
//   }

//   const handleSaveContact = async () => {
//     if (!patient) return
//     setSavingContact(true)
//     await updatePatient.mutateAsync({
//       id: patient.id,
//       firstName: contactForm.firstName.trim() || null,
//       lastName: contactForm.lastName.trim() || null,
//       location: contactForm.location.trim() || null,
//       phone: contactForm.phone.trim() || null,
//       email: contactForm.email.trim() || null,
//       copayAmount: contactForm.copayAmount.trim() || null,
//       amountPaid: contactForm.amountPaid.trim() || null,
//       paymentMethod: paymentMethod.trim() || null,
//       insuranceProvider: insuranceProvider.trim() || null,
//       visitStatus,
//     })
//     setSavingContact(false)
//   }

//   const handleCancelPatient = async () => {
//     if (!patient) return
//     await updateStatus.mutateAsync({ id: patient.id, status: "cancelled", reason: cancelReason.trim() || null })
//     setShowCancelInput(false)
//     setCancelReason("")
//   }

//   const handleUpdateAppointment = async () => {
//     if (!patient || !newAppointmentDatetime.trim()) return
//     const isoDatetime = new Date(newAppointmentDatetime).toISOString()
//     await updateAppointment.mutateAsync({ id: patient.id, appointmentDatetime: isoDatetime })
//     setEditingAppointment(false)
//   }

//   const handleAssignTo = async (vaId: string) => {
//     if (!patient || !vaId) return
//     setAssigning(true)
//     setAssignFeedback(null)
//     try {
//       await assignPatient.mutateAsync({ id: patient.id, assignedTo: vaId })
//       const va = vaList?.find((v) => v.id === vaId)
//       setAssignFeedback({ type: "success", message: `Assigned to ${va?.name ?? "VA"}` })
//     } catch (err: unknown) {
//       const apiMessage = (
//         err as { response?: { data?: { message?: string } } }
//       )?.response?.data?.message
//       setAssignFeedback({
//         type: "error",
//         message: apiMessage || "Failed to assign this patient",
//       })
//     } finally {
//       setAssigning(false)
//       if (assignFeedbackTimer.current) clearTimeout(assignFeedbackTimer.current)
//       assignFeedbackTimer.current = setTimeout(() => setAssignFeedback(null), 4000)
//     }
//   }

//   const handleBulkChecklist = async (checked: boolean) => {
//     if (!patient) return
//     const itemsToChange = currentStageItems.filter(
//       (item) => !!currentState[item.id] !== checked,
//     )
//     if (itemsToChange.length === 0) {
//       toast.info(checked ? "All items are already checked" : "No checklist items are checked")
//       return
//     }
//     setBulkPending(true)
//     try {
//       for (const item of itemsToChange) {
//         await toggleChecklist.mutateAsync({ id: patient.id, itemId: item.id, checked })
//       }
//       toast.success(`Checklist updated (${itemsToChange.length} item${itemsToChange.length > 1 ? "s" : ""})`)
//     } catch {}
//     finally {
//       setBulkPending(false)
//     }
//   }

//   const canLock =
//     !!patient && (isAdmin || patient.assignedTo === user?.id)
//   const canUnlock =
//     !!patient &&
//     (isAdmin || patient.assignedTo === user?.id || patient.privateLockedByUser?.id === user?.id)

//   const stale =
//     patient &&
//     !(stageByKey.get(patient.stage)?.isFinal ?? false) &&
//     (Date.now() - new Date(patient.updatedAt).getTime()) / (1000 * 60 * 60) >
//       STALE_HOURS

//   if (!open) return null

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
//       <div
//         className="absolute inset-0 bg-black/70 backdrop-blur-sm"
//         onClick={() => !assigning && onClose()}
//       />
//       <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
//         {isLoading || !patient ? (
//           <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
//             {isLoading ? (
//               <div className="flex flex-col items-center gap-4">
//                 <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
//                 <p className="text-sm font-semibold text-gray-700">Loading patient details...</p>
//               </div>
//             ) : (
//               <p className="text-sm text-gray-500">Patient not found</p>
//             )}
//           </div>
//         ) : (
//           <>
//             {/* Premium Green Header */}
//             <div className="relative bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 px-5 sm:px-7 py-6 sm:py-8 flex items-start justify-between overflow-hidden shadow-lg">
//               {/* Decorative blobs */}
//               <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
//               <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl" />
//               <div className="absolute top-0 right-0 w-full h-full opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent" />

//               <div className="relative z-10 flex-1 min-w-0">
//                 <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
//                   <h2 className="text-xl sm:text-2xl font-bold text-white truncate drop-shadow-sm">
//                     {patient.name}
//                   </h2>
//                   {patient.isFlagged && (
//                     <span className="px-2.5 py-1 text-[11px] font-bold bg-red-400/90 text-white rounded-full shadow flex items-center gap-1.5">
//                       <Flag className="w-3.5 h-3.5" fill="white" /> Flagged
//                     </span>
//                   )}
//                   {stale && (
//                     <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-400/90 text-amber-900 rounded-full shadow flex items-center gap-1.5">
//                       <AlertTriangle className="w-3.5 h-3.5" /> Stale
//                     </span>
//                   )}
//                 </div>
//                 <div className="flex flex-wrap items-center gap-2 sm:gap-3">
//                   <span className="px-3 py-1.5 bg-white/20 text-white text-xs font-semibold rounded-full backdrop-blur-sm">
//                     {stageLabels[patient.stage]}
//                   </span>
//                   {patient.assignedTo && vaList ? (
//                     <span className="px-3 py-1.5 bg-white/20 text-white text-xs font-semibold rounded-full backdrop-blur-sm flex items-center gap-1.5">
//                       <UserCheck className="w-3.5 h-3.5" />
//                       {vaList.find(v => v.id === patient.assignedTo)?.name ?? "Assigned"}
//                     </span>
//                   ) : (
//                     <span className="px-3 py-1.5 bg-red-400/90 text-white text-xs font-semibold rounded-full backdrop-blur-sm flex items-center gap-1.5">
//                       <Flag className="w-3.5 h-3.5" fill="currentColor" /> Unassigned
//                     </span>
//                   )}
//                   {patient.isPrivate && (
//                     <span className="px-3 py-1.5 bg-amber-400/90 text-amber-900 text-xs font-semibold rounded-full backdrop-blur-sm flex items-center gap-1.5">
//                       <Lock className="w-3.5 h-3.5" /> Locked
//                     </span>
//                   )}
//                   {patient.status !== "active" && (
//                     <span className={cn(
//                       "px-3 py-1.5 text-xs font-semibold rounded-full",
//                       patient.status === "completed" ? "bg-emerald-400/90 text-emerald-900" : "bg-red-400/90 text-white"
//                     )}>
//                       {patient.status === "completed" ? "Completed" : "Cancelled"}
//                     </span>
//                   )}
//                 </div>
//                 {/* Flag info inside header */}
//                 {patient.isFlagged && patient.flagReason && (
//                   <div className="mt-4 p-3 rounded-xl bg-red-500/20 border border-red-300/30 backdrop-blur-sm">
//                     <p className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
//                       <Flag className="w-3.5 h-3.5" fill="white" /> Flag Reason
//                     </p>
//                     <p className="text-sm text-white/90">{patient.flagReason}</p>
//                     <p className="text-[11px] text-white/70 mt-1">
//                       by {patient.flaggedByUser?.name} · {timeAgo(patient.flaggedAt?.toString() || '')}
//                     </p>
//                   </div>
//                 )}
//                 {patient.flagClearedReason && (
//                   <div className="mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-300/30 backdrop-blur-sm">
//                     <p className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
//                       <CheckCircle className="w-3.5 h-3.5" /> Response
//                     </p>
//                     <p className="text-sm text-white/90">{patient.flagClearedReason}</p>
//                   </div>
//                 )}
//               </div>
//               <div className="flex flex-col gap-2 ml-4 relative z-10">
//                 <button
//                   onClick={() => setShowFlagPopup(true)}
//                   className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all shadow-lg border border-white/20"
//                   title="Raise flag"
//                 >
//                   <Flag className="w-5 h-5" fill="currentColor" />
//                 </button>
//                 <button
//                   onClick={onClose}
//                   className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all shadow-lg border border-white/20"
//                   title="Close"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>
//             </div>

//             <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-gray-50 scrollbar-thumb-gray-300">
//               <div className="p-4 sm:p-6 space-y-5">
//                 {/* Quick Actions – colorful cards */}
//                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//                   {/* Appointment Card */}
//                   <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-4 shadow-sm hover:shadow-md transition-shadow">
//                     <div className="flex items-center justify-between mb-2">
//                       <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Appointment</h4>
//                       <button
//                         onClick={() => setEditingAppointment(!editingAppointment)}
//                         className="p-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-500 transition-colors shadow"
//                       >
//                         <Pencil className="w-3.5 h-3.5" />
//                       </button>
//                     </div>
//                     {editingAppointment ? (
//                       <div className="space-y-2">
//                         <input
//                           type="datetime-local"
//                           value={newAppointmentDatetime}
//                           onChange={(e) => setNewAppointmentDatetime(e.target.value)}
//                           className="w-full px-3 py-2 text-sm border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/30"
//                         />
//                         <div className="flex gap-2">
//                           <button
//                             onClick={handleUpdateAppointment}
//                             disabled={updateAppointment.isPending || !newAppointmentDatetime.trim()}
//                             className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
//                           >
//                             {updateAppointment.isPending ? "Saving..." : "Save"}
//                           </button>
//                           <button
//                             onClick={() => {
//                               setEditingAppointment(false)
//                               if (patient.appointmentDatetime) setNewAppointmentDatetime(toLocalDatetimeLocal(new Date(patient.appointmentDatetime)))
//                               else setNewAppointmentDatetime("")
//                             }}
//                             className="px-3 py-1.5 text-xs font-medium rounded-xl border border-blue-200 text-gray-600 hover:bg-gray-50 transition-colors"
//                           >
//                             Cancel
//                           </button>
//                         </div>
//                       </div>
//                     ) : (
//                       <p className="text-sm font-semibold text-gray-800">
//                         {patient.appointmentDatetime
//                           ? new Date(patient.appointmentDatetime).toLocaleString("en-US", {
//                               month: "short",
//                               day: "numeric",
//                               year: "numeric",
//                               hour: "numeric",
//                               minute: "2-digit",
//                             })
//                           : "Not scheduled"}
//                       </p>
//                     )}
//                   </div>

//                   {/* Eligibility Card */}
//                   <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-4 shadow-sm hover:shadow-md transition-shadow">
//                     <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Eligibility</h4>
//                     <div className="flex items-center justify-between">
//                       <span className={cn(
//                         "text-sm font-semibold",
//                         patient.eligibilityStatus === "eligible" ? "text-emerald-700" :
//                         patient.eligibilityStatus === "not_eligible" ? "text-red-600" : "text-gray-500"
//                       )}>
//                         {patient.eligibilityStatus === "eligible" ? "Eligible" :
//                          patient.eligibilityStatus === "not_eligible" ? "Not Eligible" : "Not Checked"}
//                       </span>
//                       <button
//                         onClick={handleCheckEligibility}
//                         disabled={checkEligibility.isPending}
//                         className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow transition-colors"
//                       >
//                         {checkEligibility.isPending ? "Checking..." : "Check"}
//                       </button>
//                     </div>
//                   </div>

//                   {/* Assignment Card */}
//                   <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100 p-4 shadow-sm hover:shadow-md transition-shadow">
//                     <h4 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-2">Assignment</h4>
//                     {(!!vaList && (isAdmin || !patient.assignedUser)) ? (
//                       <div className="relative">
//                         <select
//                           onChange={(e) => {
//                             const val = e.target.value
//                             e.target.value = ""
//                             if (val) handleAssignTo(val)
//                           }}
//                           value=""
//                           disabled={assigning}
//                           className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-violet-400/30 disabled:opacity-50 shadow-sm"
//                         >
//                           <option value="">{patient.assignedUser ? "Reassign..." : "Assign..."}</option>
//                           {vaList.filter(v => v.id !== user?.id).map(va => (
//                             <option key={va.id} value={va.id}>{va.name}</option>
//                           ))}
//                         </select>
//                         <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 pointer-events-none" />
//                       </div>
//                     ) : (
//                       <p className="text-sm font-semibold text-gray-700">
//                         {patient.assignedUser ? patient.assignedUser.name : "Unassigned"}
//                       </p>
//                     )}
//                     {assignFeedback && (
//                       <p className={cn(
//                         "text-xs mt-1.5 font-medium",
//                         assignFeedback.type === "success" ? "text-emerald-700" : "text-red-600"
//                       )}>
//                         {assignFeedback.message}
//                       </p>
//                     )}
//                   </div>
//                 </div>

//                 {/* Colorful Stage Pipeline */}
//                 <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
//                   <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
//                     <span className="w-2 h-2 rounded-full bg-emerald-500" />
//                     Pipeline Stage
//                   </h4>
//                   <div className="flex w-full overflow-x-auto gap-1">
//                     {stageOrder.map((stage, idx) => {
//                       const currentIdx = stageOrder.indexOf(patient.stage)
//                       const isComplete = idx < currentIdx
//                       const isCurrent = stage === patient.stage
//                       const isNext = idx === currentIdx + 1
//                       const isClickable = isCurrent ? false : isComplete ? true : isNext ? allComplete : false
//                       return (
//                         <button
//                           key={stage}
//                           onClick={() => isClickable && handleMoveStage(stage)}
//                           disabled={!isClickable}
//                           className={cn(
//                             "flex-1 min-w-[64px] flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl transition-all",
//                             isCurrent ? "bg-emerald-100 ring-2 ring-emerald-400 shadow-md" : "hover:bg-gray-50",
//                             !isClickable && "opacity-50 cursor-not-allowed"
//                           )}
//                         >
//                           <span className={cn(
//                             "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shadow-sm",
//                             isCurrent && "bg-emerald-600 border-emerald-600 text-white",
//                             isComplete && !isCurrent && "bg-emerald-400 border-emerald-400 text-white",
//                             !isCurrent && !isComplete && "bg-white border-gray-200 text-gray-400"
//                           )}>
//                             {isComplete ? <Check className="w-4 h-4" /> : idx + 1}
//                           </span>
//                           <span className={cn(
//                             "text-[10px] font-semibold text-center leading-tight",
//                             isCurrent ? "text-emerald-800" : "text-gray-500"
//                           )}>
//                             {stageLabels[stage]}
//                           </span>
//                         </button>
//                       )
//                     })}
//                   </div>
//                 </div>

//                 {/* Checklist with colorful progress */}
//                 <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 rounded-2xl border border-emerald-100 p-4 sm:p-5 shadow-sm">
//                   <div className="flex items-center justify-between mb-4">
//                     <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
//                       <CheckCheck className="w-5 h-5 text-emerald-600" />
//                       Checklist - {stageLabels[patient.stage]}
//                     </h4>
//                     {checklistBusy && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />}
//                   </div>
//                   {currentStageItems.length > 0 ? (
//                     <>
//                       {totalItems > 0 && (
//                         <div className="mb-4">
//                           <div className="flex justify-between text-xs text-gray-600 mb-1 font-medium">
//                             <span>{completedItems} / {totalItems} Completed</span>
//                             <span className="text-emerald-700">{progress}%</span>
//                           </div>
//                           <div className="w-full h-2.5 bg-white/80 rounded-full overflow-hidden border border-emerald-200">
//                             <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
//                           </div>
//                         </div>
//                       )}
//                       <div className="flex gap-2 mb-4">
//                         <Button size="sm" variant="outline" onClick={() => handleBulkChecklist(true)} disabled={checklistBusy}
//                           className="text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-100 bg-white font-semibold">
//                           <CheckCheck className="w-3.5 h-3.5" /> Check All
//                         </Button>
//                         <Button size="sm" variant="outline" onClick={() => handleBulkChecklist(false)} disabled={checklistBusy}
//                           className="text-xs gap-1.5 border-gray-300 text-gray-600 hover:bg-gray-100 bg-white font-semibold">
//                           <ListX className="w-3.5 h-3.5" /> Uncheck All
//                         </Button>
//                       </div>
//                       <div className="space-y-1.5">
//                         {currentStageItems.map(item => {
//                           const checked = !!currentState[item.id]
//                           return (
//                             <label key={item.id}
//                               className={cn(
//                                 "flex items-start gap-3 p-3 rounded-xl bg-white hover:shadow-md transition-all cursor-pointer border border-gray-100",
//                                 checklistBusy && "opacity-50 pointer-events-none",
//                                 checked && "bg-emerald-50/50 border-emerald-200"
//                               )}
//                             >
//                               <input
//                                 type="checkbox"
//                                 checked={checked}
//                                 disabled={checklistBusy}
//                                 onChange={() => toggleChecklist.mutate({ id: patient.id, itemId: item.id, checked: !checked })}
//                                 className="mt-0.5 w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
//                               />
//                               <div className="min-w-0">
//                                 <div className="flex items-center gap-2 flex-wrap">
//                                   <span className={cn("text-sm font-semibold", checked ? "text-gray-400 line-through" : "text-gray-800")}>
//                                     {item.label}
//                                   </span>
//                                   <span className={cn(
//                                     "px-2 py-0.5 text-[10px] font-bold rounded-full",
//                                     item.status === "required" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
//                                   )}>
//                                     {item.status}
//                                   </span>
//                                 </div>
//                                 {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
//                               </div>
//                             </label>
//                           )
//                         })}
//                       </div>
//                     </>
//                   ) : (
//                     <p className="text-sm text-gray-500 italic">No checklist items for this stage</p>
//                   )}
//                 </div>

//                 {/* SOP Card with warm gradient */}
//                 <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4 sm:p-5 shadow-sm">
//                   <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wide flex items-center gap-2 mb-3">
//                     <Zap className="w-5 h-5 text-amber-500" /> Standard Operating Procedure
//                   </h4>
//                   <ul className="space-y-1.5">
//                     {STAGE_SOPs[patient.stage]?.map((sop, idx) => (
//                       <li key={idx} className="flex items-start gap-2 text-sm text-amber-900 font-medium">
//                         <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
//                         {sop}
//                       </li>
//                     ))}
//                   </ul>
//                 </div>

//                 {/* Eligibility Details with clean style */}
//                 <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
//                   <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-4">
//                     <Shield className="w-5 h-5 text-emerald-600" /> Eligibility Details
//                   </h4>
//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
//                     <div>
//                       <label className="text-xs font-semibold text-gray-500 mb-1 block">Payment Type</label>
//                       <SelectOrOther
//                         value={paymentMethod}
//                         onChange={setPaymentMethod}
//                         otherMode={paymentMethodOther}
//                         onOtherModeChange={setPaymentMethodOther}
//                         options={PAYMENT_METHOD_OPTIONS}
//                         placeholder="Select..."
//                       />
//                     </div>
//                     <div>
//                       <label className="text-xs font-semibold text-gray-500 mb-1 block">Insurance Company</label>
//                       <SelectOrOther
//                         value={insuranceProvider}
//                         onChange={setInsuranceProvider}
//                         otherMode={insuranceProviderOther}
//                         onOtherModeChange={setInsuranceProviderOther}
//                         options={INSURANCE_PROVIDER_OPTIONS}
//                         placeholder="Select..."
//                       />
//                     </div>
//                   </div>
//                   {patient.eligibilityDetails?.vob && (
//                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
//                       {VOB_LABELS.map(([key, label]) => {
//                         const value = patient.eligibilityDetails?.vob?.[key]
//                         if (value === undefined || value === null) return null
//                         return (
//                           <div key={key} className="bg-gray-50 rounded-xl p-2.5">
//                             <p className="text-[10px] text-gray-500 font-medium">{label}</p>
//                             <p className="text-sm font-semibold text-gray-700">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</p>
//                           </div>
//                         )
//                       })}
//                     </div>
//                   )}
//                 </div>

//                 {/* Colorful Detail Grid */}
//                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//                   {patient.assignedUser && (
//                     <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl border border-blue-100 p-3 shadow-sm">
//                       <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Assigned To</p>
//                       <p className="text-sm font-semibold text-gray-800">{patient.assignedUser.name}</p>
//                     </div>
//                   )}
//                   <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100 p-3 shadow-sm">
//                     <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Source</p>
//                     <p className="text-sm font-semibold text-gray-800 capitalize">{patient.source || "Manual"}</p>
//                   </div>
//                   {patient.paymentMethod && (
//                     <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl border border-pink-100 p-3 shadow-sm">
//                       <p className="text-[10px] font-bold text-pink-500 uppercase tracking-wider">Payment</p>
//                       <p className="text-sm font-semibold text-gray-800">{patient.paymentMethod}</p>
//                     </div>
//                   )}
//                   <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-100 p-3 shadow-sm">
//                     <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Last Updated</p>
//                     <p className="text-sm font-semibold text-gray-800">{timeAgo(patient.updatedAt)}</p>
//                   </div>
//                 </div>

//                 {/* Status & Access with pop colors */}
//                 <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm space-y-4">
//                   <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
//                     <Flag className="w-5 h-5 text-red-500" /> Status & Access
//                   </h4>
//                   <div className="flex flex-wrap gap-2 items-center">
//                     <span className={cn(
//                       "px-3 py-1.5 text-xs font-bold rounded-full",
//                       patient.status === "active" ? "bg-emerald-100 text-emerald-800" :
//                       patient.status === "completed" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
//                     )}>
//                       {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
//                     </span>
//                     {patient.isPrivate && (
//                       <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 flex items-center gap-1.5">
//                         <Lock className="w-3.5 h-3.5" /> Locked
//                       </span>
//                     )}
//                   </div>
//                   <div className="flex flex-wrap gap-2">
//                     {isAdmin && patient.status !== "cancelled" && !showCancelInput && (
//                       <Button size="sm" variant="outline" onClick={() => setShowCancelInput(true)}
//                         className="text-xs border-red-300 text-red-600 hover:bg-red-50 font-semibold">
//                         <Ban className="w-3.5 h-3.5 mr-1.5" /> Mark Cancelled
//                       </Button>
//                     )}
//                     {isAdmin && patient.status === "cancelled" && (
//                       <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: patient.id, status: "active" })}
//                         disabled={updateStatus.isPending}
//                         className="text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-50 font-semibold">
//                         <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reactivate
//                       </Button>
//                     )}
//                     {patient.isPrivate ? (
//                       canUnlock && (
//                         <Button size="sm" variant="outline" onClick={() => unlockPatient.mutate(patient.id)}
//                           disabled={unlockPatient.isPending}
//                           className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold">
//                           <Unlock className="w-3.5 h-3.5 mr-1.5" /> Unlock
//                         </Button>
//                       )
//                     ) : (
//                       canLock && (
//                         <Button size="sm" variant="outline" onClick={() => lockPatient.mutate(patient.id)}
//                           disabled={lockPatient.isPending}
//                           className="text-xs border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold">
//                           <Lock className="w-3.5 h-3.5 mr-1.5" /> Lock
//                         </Button>
//                       )
//                     )}
//                   </div>
//                   {isAdmin && showCancelInput && (
//                     <div className="space-y-2 bg-red-50 p-3 rounded-xl border border-red-200">
//                       <Textarea placeholder="Cancellation reason..." value={cancelReason} onChange={e => setCancelReason(e.target.value)}
//                         className="text-sm min-h-[70px]" />
//                       <div className="flex gap-2">
//                         <Button size="sm" onClick={handleCancelPatient} disabled={updateStatus.isPending}
//                           className="bg-red-600 hover:bg-red-700 text-white text-xs">
//                           Confirm
//                         </Button>
//                         <Button size="sm" variant="ghost" onClick={() => setShowCancelInput(false)} className="text-xs">Cancel</Button>
//                       </div>
//                     </div>
//                   )}
//                 </div>

//                 {/* Contact & Payment with colorful inputs */}
//                 <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
//                   <div className="flex items-center justify-between mb-4">
//                     <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Contact & Payment</h4>
//                     <Button size="sm" onClick={handleSaveContact} disabled={savingContact}
//                       className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold shadow">
//                       {savingContact ? "Saving..." : "Save"}
//                     </Button>
//                   </div>
//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                     {(["firstName","lastName","location","phone","email","copayAmount","amountPaid"] as const).map(key => (
//                       <div key={key}>
//                         <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
//                           {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
//                         </label>
//                         <input
//                           value={contactForm[key]}
//                           onChange={e => setContactForm(f => ({...f, [key]: e.target.value}))}
//                           className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-colors"
//                         />
//                       </div>
//                     ))}
//                     <div>
//                       <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Payment Type</label>
//                       <SelectOrOther value={paymentMethod} onChange={setPaymentMethod} otherMode={paymentMethodOther}
//                         onOtherModeChange={setPaymentMethodOther} options={PAYMENT_METHOD_OPTIONS} placeholder="Select..." />
//                     </div>
//                     <div>
//                       <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Insurance</label>
//                       <SelectOrOther value={insuranceProvider} onChange={setInsuranceProvider} otherMode={insuranceProviderOther}
//                         onOtherModeChange={setInsuranceProviderOther} options={INSURANCE_PROVIDER_OPTIONS} placeholder="Select..." />
//                     </div>
//                     <div>
//                       <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Visit Status</label>
//                       <select value={visitStatus} onChange={e => setVisitStatus(e.target.value)}
//                         className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30">
//                         {VISIT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
//                       </select>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Notes */}
//                 <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
//                   <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Operational Notes</h4>
//                   <Textarea
//                     placeholder="Add notes..."
//                     value={notesText}
//                     onChange={e => setNotesText(e.target.value)}
//                     className="text-sm min-h-[100px] rounded-xl border-gray-200 focus:ring-emerald-400/30"
//                   />
//                   <div className="flex justify-end mt-3">
//                     <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}
//                       className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold shadow">
//                       {savingNotes ? "Saving..." : "Save Notes"}
//                     </Button>
//                   </div>
//                 </div>

//                 {/* Activity Log */}
//                 <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
//                   <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-4">
//                     <MessageSquare className="w-5 h-5 text-indigo-400" /> Activity Log
//                   </h4>
//                   <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
//                     {logData?.logs?.length ? logData.logs.map(log => (
//                       <div key={log.id} className="flex gap-2 text-xs py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
//                         <span className="text-gray-400 whitespace-nowrap font-medium">{new Date(log.createdAt).toLocaleDateString()}</span>
//                         <div>
//                           <span className="font-semibold text-gray-700">{log.author}</span>
//                           <span className="text-gray-600 ml-1">· {log.message}</span>
//                         </div>
//                       </div>
//                     )) : <p className="text-sm text-gray-400 italic">No activity yet</p>}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </>
//         )}
//         {assigning && (
//           <div className="absolute inset-0 z-50 bg-white/80 flex items-center justify-center gap-3">
//             <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
//             <span className="text-sm font-medium text-gray-700">Updating assignment...</span>
//           </div>
//         )}

//         {/* Flag Popup – vibrant colors */}
//         {showFlagPopup && (
//           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
//             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFlagPopup(false)} />
//             <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
//               <div className={cn("px-5 py-4 flex items-center justify-between", isAdmin ? "bg-gradient-to-r from-emerald-600 to-teal-600" : "bg-gradient-to-r from-red-500 to-rose-600")}>
//                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
//                   <Flag className="w-5 h-5" fill="white" /> {isAdmin ? "Raise Admin Flag" : "Raise Flag"}
//                 </h3>
//                 <button onClick={() => setShowFlagPopup(false)} className="p-1 rounded-lg hover:bg-white/20 text-white">
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>
//               <div className="p-5 space-y-4">
//                 <div>
//                   <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Type</label>
//                   <div className="flex gap-4">
//                     <label className="flex items-center gap-2 cursor-pointer">
//                       <input type="radio" name="flagType" value="positive" checked={newFlagType === "positive"}
//                         onChange={e => setNewFlagType(e.target.value as "positive"|"negative")} className="w-4 h-4 accent-emerald-600" />
//                       <span className="text-sm font-medium">✅ Positive Note</span>
//                     </label>
//                     <label className="flex items-center gap-2 cursor-pointer">
//                       <input type="radio" name="flagType" value="negative" checked={newFlagType === "negative"}
//                         onChange={e => setNewFlagType(e.target.value as "positive"|"negative")} className="w-4 h-4 accent-red-600" />
//                       <span className="text-sm font-medium">⚠️ Alert/Issue</span>
//                     </label>
//                   </div>
//                 </div>
//                 <div>
//                   <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Reason</label>
//                   <textarea value={newFlagReason} onChange={e => setNewFlagReason(e.target.value)}
//                     className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl min-h-[80px] focus:outline-none focus:ring-2 focus:ring-emerald-400/30" />
//                 </div>
//                 <div className="flex justify-end gap-2">
//                   <button onClick={() => { setShowFlagPopup(false); setNewFlagReason(""); setNewFlagType("positive"); }}
//                     className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
//                   <button
//                     onClick={async () => {
//                       if (patient && newFlagReason.trim()) {
//                         await flagPatient.mutateAsync({ id: patient.id, reason: newFlagReason })
//                         setShowFlagPopup(false)
//                         setNewFlagReason("")
//                         setNewFlagType("positive")
//                         toast.success("Flag raised")
//                       }
//                     }}
//                     disabled={!newFlagReason.trim() || flagPatient.isPending}
//                     className={cn(
//                       "px-4 py-2 text-sm font-bold rounded-xl transition-colors flex items-center gap-2 shadow",
//                       newFlagReason.trim() && !flagPatient.isPending
//                         ? (isAdmin ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
//                                    : "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white")
//                         : "bg-gray-200 text-gray-400 cursor-not-allowed"
//                     )}
//                   >
//                     {flagPatient.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" fill="currentColor" />}
//                     Raise Flag
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }



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
  Phone,
  Mail,
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
  useUpdatePatient,
  useLockPatient,
  useUnlockPatient,
  useUpdatePatientStatus,
  useUpdateAppointment,
} from "@/hooks/query/usePatients"
import { usePatient } from "@/hooks/query/usePatients"
import { useActivityLog } from "@/hooks/query/useActivityLog"
import { SelectOrOther } from "@/components/shared/select-or-other"
import { EligibilityCheckDialog } from "./eligibility-check-dialog"
import { PAYMENT_METHOD_OPTIONS, INSURANCE_PROVIDER_OPTIONS, VISIT_STATUS_OPTIONS, VOB_LABELS } from "@/lib/patient-options"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface PatientModalProps {
  patientId: string | null
  open: boolean
  onClose: () => void
}

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

function toLocalDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Returns a usable avatar URL for a patient. Falls back to an auto-generated
 * "initials" avatar (via DiceBear) whenever the patient has no real photo on
 * file, so the UI never shows a broken image or an empty circle.
 */
function getAvatarUrl(patient: Patient): string {
  const withPhoto = patient as Patient & {
    avatarUrl?: string | null
    photoUrl?: string | null
    avatar?: string | null
    imageUrl?: string | null
  }
  const existing =
    withPhoto.avatarUrl || withPhoto.photoUrl || withPhoto.avatar || withPhoto.imageUrl
  if (existing) return existing
  const seed = encodeURIComponent(patient.name?.trim() || "Patient")
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=059669,0d9488,047857,10b981&fontFamily=Helvetica&fontWeight=600`
}

/** Local initials fallback for when the remote avatar image can't be loaded. */
function getInitials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
}

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
  const [avatarError, setAvatarError] = useState(false)
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
  const [showEligibilityCheck, setShowEligibilityCheck] = useState(false)
  const updateAppointment = useUpdateAppointment()

  const [bulkPending, setBulkPending] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignFeedback, setAssignFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const assignFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checklistBusy = toggleChecklist.isPending || bulkPending

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
    setAvatarError(false)
    if (patient?.appointmentDatetime) {
      const dt = new Date(patient.appointmentDatetime)
      setNewAppointmentDatetime(toLocalDatetimeLocal(dt))
    } else {
      setNewAppointmentDatetime("")
    }
    setAssigning(false)
    setAssignFeedback(null)
  }, [patient?.id, patient?.notes, patient?.paymentMethod, patient?.insuranceProvider, patient?.appointmentDatetime])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      // Don't close the whole modal when Escape is used inside a child dialog
      // (e.g. the eligibility check) — let that dialog handle its own Escape.
      if (e.key === "Escape" && open && !assigning && !showEligibilityCheck) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [open, onClose, assigning, showEligibilityCheck])

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
    if (targetIdx > currentIdx && !allComplete) return
    await moveStage.mutateAsync({ id: patient.id, targetStage: target })
  }

  const handleClaim = async () => {
    if (!patient || !user) return
    await claimPatient.mutateAsync({ id: patient.id, userId: user.id })
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
      for (const item of itemsToChange) {
        await toggleChecklist.mutateAsync({ id: patient.id, itemId: item.id, checked })
      }
      toast.success(`Checklist updated (${itemsToChange.length} item${itemsToChange.length > 1 ? "s" : ""})`)
    } catch {}
    finally {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => !assigning && onClose()}
      />
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
        {isLoading || !patient ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                <p className="text-sm font-semibold text-gray-700">Loading patient details...</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Patient not found</p>
            )}
          </div>
        ) : (
          <>
            {/* Premium Green Header.
                `shrink-0` is load-bearing: this is a flex item of a
                `max-h-[92vh]` column, so without it the flexbox algorithm
                compresses the header to make room for the long scrolling body
                — which is what was slicing the badges and the close button off
                at the bottom edge. */}
            <div className="relative shrink-0 bg-gradient-to-br min-h-[230px] max-h-fit flex flex-col gap-y-5 from-emerald-700 via-emerald-600 to-teal-700 px-5 sm:px-7 py-6 sm:py-8  gap-3 shadow-lg">
              {/* Decorative blobs get their own clipped layer. The header
                  itself must NOT be `overflow-hidden` — that's what turned any
                  compression into visibly chopped-off content instead of the
                  header simply growing to fit. */}
            <div className="flex items-start justify-between">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl" />
                <div className="absolute top-0 right-0 w-full h-full opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent" />
              </div>

              <div className="relative z-10 flex-1 min-w-0 flex items-start gap-3 sm:gap-4">
                {/* Patient avatar. The remote initials avatar is only a nicety —
                    if it fails to load (offline, blocked host) fall back to
                    initials rendered locally instead of a broken-image icon.
                    The previous ternary returned the same URL in both branches,
                    so `avatarError` never actually changed anything. */}
                {avatarError ? (
                  <div
                    aria-label={patient.name}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-white/50 shadow-lg shrink-0 bg-white/20 flex items-center justify-center text-white font-bold text-lg sm:text-xl"
                  >
                    {getInitials(patient.name)}
                  </div>
                ) : (
                  <img
                    src={getAvatarUrl(patient)}
                    onError={() => setAvatarError(true)}
                    alt={patient.name}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white/50 shadow-lg shrink-0 bg-white/20"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-white truncate drop-shadow-sm max-w-full">
                      {patient.name}
                    </h2>
                    {patient.isFlagged && (
                      <span className="px-2.5 py-1 text-[11px] font-bold bg-red-400/90 text-white rounded-full shadow flex items-center gap-1.5 shrink-0">
                        <Flag className="w-3.5 h-3.5" fill="white" /> Flagged
                      </span>
                    )}
                    {stale && (
                      <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-400/90 text-amber-900 rounded-full shadow flex items-center gap-1.5 shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5" /> Stale
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="px-3 py-1.5 bg-white/20 text-white text-xs font-semibold rounded-full backdrop-blur-sm">
                      {stageLabels[patient.stage]}
                    </span>
                    {patient.assignedTo && vaList ? (
                      <span className="px-3 py-1.5 bg-white/20 text-white text-xs font-semibold rounded-full backdrop-blur-sm flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5" />
                        {vaList.find(v => v.id === patient.assignedTo)?.name ?? "Assigned"}
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 bg-red-400/90 text-white text-xs font-semibold rounded-full backdrop-blur-sm flex items-center gap-1.5">
                        <Flag className="w-3.5 h-3.5" fill="currentColor" /> Unassigned
                      </span>
                    )}
                    {patient.isPrivate && (
                      <span className="px-3 py-1.5 bg-amber-400/90 text-amber-900 text-xs font-semibold rounded-full backdrop-blur-sm flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> Locked
                      </span>
                    )}
                    {patient.status !== "active" && (
                      <span className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-full",
                        patient.status === "completed" ? "bg-emerald-400/90 text-emerald-900" : "bg-red-400/90 text-white"
                      )}>
                        {patient.status === "completed" ? "Completed" : "Cancelled"}
                      </span>
                    )}
                  </div>
                  {/* Flag info inside header */}
                  {patient.isFlagged && patient.flagReason && (
                    <div className="mt-4 p-3 rounded-xl bg-red-500/20 border border-red-300/30 backdrop-blur-sm">
                      <p className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                        <Flag className="w-3.5 h-3.5" fill="white" /> Flag Reason
                      </p>
                      <p className="text-sm text-white/90">{patient.flagReason}</p>
                      <p className="text-[11px] text-white/70 mt-1">
                        by {patient.flaggedByUser?.name} · {timeAgo(patient.flaggedAt?.toString() || '')}
                      </p>
                    </div>
                  )}
                  {patient.flagClearedReason && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-300/30 backdrop-blur-sm">
                      <p className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" /> Response
                      </p>
                      <p className="text-sm text-white/90">{patient.flagClearedReason}</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Header actions stay on a single row. They used to stack
                  vertically on >=sm, which overflowed the bottom of a short
                  header — and because the header is `overflow-hidden` (to clip
                  the decorative blobs) the Close button was sliced in half /
                  unclickable. A row can't outgrow the header's height. */}
              <div className="flex flex-row gap-2 shrink-0 relative z-10">
                <button
                  onClick={() => setShowFlagPopup(true)}
                  className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all shadow-lg border border-white/20"
                  title="Raise flag"
                >
                  <Flag className="w-5 h-5" fill="currentColor" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all shadow-lg border border-white/20"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Appointment Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Appointment</h4>
                      <button
                        onClick={() => setEditingAppointment(!editingAppointment)}
                        className="p-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-500 transition-colors shadow"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {editingAppointment ? (
                      <div className="space-y-2">
                        <input
                          type="datetime-local"
                          value={newAppointmentDatetime}
                          onChange={(e) => setNewAppointmentDatetime(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleUpdateAppointment}
                            disabled={updateAppointment.isPending || !newAppointmentDatetime.trim()}
                            className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {updateAppointment.isPending ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingAppointment(false)
                              if (patient.appointmentDatetime) setNewAppointmentDatetime(toLocalDatetimeLocal(new Date(patient.appointmentDatetime)))
                              else setNewAppointmentDatetime("")
                            }}
                            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-blue-200 text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-gray-800">
                        {patient.appointmentDatetime
                          ? new Date(patient.appointmentDatetime).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "Not scheduled"}
                      </p>
                    )}
                  </div>

                  {/* Eligibility Card — shows a badge for the current status and
                      opens the eligibility-check dialog (demo dummy fields) via
                      the Check Eligibility button. */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Eligibility</h4>
                      {patient.eligibilityStatus === "eligible" && patient.eligibilityCheckedAt && (
                        <span className="text-[10px] font-medium text-emerald-600/70">
                          Checked {timeAgo(patient.eligibilityCheckedAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        "px-2.5 py-1 text-xs font-bold rounded-full border shadow-sm shrink-0",
                        patient.eligibilityStatus === "eligible"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-red-100 text-red-700 border-red-200",
                      )}>
                        {patient.eligibilityStatus === "eligible" ? "Eligibility" : "Not Eligibility"}
                      </span>
                      <button
                        onClick={() => setShowEligibilityCheck(true)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow transition-colors shrink-0"
                      >
                        Check Eligibility
                      </button>
                    </div>
                  </div>

                  {/* Assignment Card */}
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-2">Assignment</h4>
                    {(!!vaList && (isAdmin || !patient.assignedUser)) ? (
                      <div className="relative">
                        <select
                          onChange={(e) => {
                            const val = e.target.value
                            e.target.value = ""
                            if (val) handleAssignTo(val)
                          }}
                          value=""
                          disabled={assigning}
                          className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-violet-400/30 disabled:opacity-50 shadow-sm"
                        >
                          <option value="">{patient.assignedUser ? "Reassign..." : "Assign..."}</option>
                          {vaList.filter(v => v.id !== user?.id).map(va => (
                            <option key={va.id} value={va.id}>{va.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 pointer-events-none" />
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-gray-700">
                        {patient.assignedUser ? patient.assignedUser.name : "Unassigned"}
                      </p>
                    )}
                    {assignFeedback && (
                      <p className={cn(
                        "text-xs mt-1.5 font-medium",
                        assignFeedback.type === "success" ? "text-emerald-700" : "text-red-600"
                      )}>
                        {assignFeedback.message}
                      </p>
                    )}
                  </div>
                </div>


              
            </div>

            {/* `min-h-0` lets this pane actually shrink and scroll. Without it
                a flex item's automatic minimum size is its content height, so
                the body refused to shrink and the overflow was taken out of
                the header instead. */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-track-gray-50 scrollbar-thumb-gray-300">
              <div className="p-4 sm:p-6 space-y-5">
                {/* Quick Actions – colorful cards */}
                

                {/* Colorful Stage Pipeline */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Pipeline Stage
                  </h4>
                  {/* `overflow-x-auto` also clips vertically, which sliced the
                      current step's `ring-2` off at the top and bottom — the
                      inner padding gives the ring room to draw. */}
                  <div className="flex w-full overflow-x-auto gap-1 p-1">
                    {stageOrder.map((stage, idx) => {
                      const currentIdx = stageOrder.indexOf(patient.stage)
                      const isComplete = idx < currentIdx
                      const isCurrent = stage === patient.stage
                      const isNext = idx === currentIdx + 1
                      const isClickable = isCurrent ? false : isComplete ? true : isNext ? allComplete : false
                      return (
                        <button
                          key={stage}
                          onClick={() => isClickable && handleMoveStage(stage)}
                          disabled={!isClickable}
                          className={cn(
                            "flex-1 min-w-[64px] flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl transition-all",
                            isCurrent ? "bg-emerald-100 ring-2 ring-emerald-400 shadow-md" : "hover:bg-gray-50",
                            // The current stage is non-clickable by design, but it must stay
                            // the most prominent step — only dim the *other* unreachable ones.
                            isCurrent && "cursor-default",
                            !isClickable && !isCurrent && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <span className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shadow-sm",
                            isCurrent && "bg-emerald-600 border-emerald-600 text-white",
                            isComplete && !isCurrent && "bg-emerald-400 border-emerald-400 text-white",
                            !isCurrent && !isComplete && "bg-white border-gray-200 text-gray-400"
                          )}>
                            {isComplete ? <Check className="w-4 h-4" /> : idx + 1}
                          </span>
                          <span className={cn(
                            "text-[10px] font-semibold text-center leading-tight",
                            isCurrent ? "text-emerald-800" : "text-gray-500"
                          )}>
                            {stageLabels[stage]}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Checklist with colorful progress */}
                <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 rounded-2xl border border-emerald-100 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                      <CheckCheck className="w-5 h-5 text-emerald-600" />
                      Checklist - {stageLabels[patient.stage]}
                    </h4>
                    {checklistBusy && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />}
                  </div>
                  {currentStageItems.length > 0 ? (
                    <>
                      {totalItems > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-600 mb-1 font-medium">
                            <span>{completedItems} / {totalItems} Completed</span>
                            <span className="text-emerald-700">{progress}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-white/80 rounded-full overflow-hidden border border-emerald-200">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 mb-4">
                        <Button size="sm" variant="outline" onClick={() => handleBulkChecklist(true)} disabled={checklistBusy}
                          className="text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-100 bg-white font-semibold">
                          <CheckCheck className="w-3.5 h-3.5" /> Check All
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleBulkChecklist(false)} disabled={checklistBusy}
                          className="text-xs gap-1.5 border-gray-300 text-gray-600 hover:bg-gray-100 bg-white font-semibold">
                          <ListX className="w-3.5 h-3.5" /> Uncheck All
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        {currentStageItems.map(item => {
                          const checked = !!currentState[item.id]
                          return (
                            <label key={item.id}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-xl bg-white hover:shadow-md transition-all cursor-pointer border border-gray-100",
                                checklistBusy && "opacity-50 pointer-events-none",
                                checked && "bg-emerald-50/50 border-emerald-200"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={checklistBusy}
                                onChange={() => toggleChecklist.mutate({ id: patient.id, itemId: item.id, checked: !checked })}
                                className="mt-0.5 w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={cn("text-sm font-semibold", checked ? "text-gray-400 line-through" : "text-gray-800")}>
                                    {item.label}
                                  </span>
                                  <span className={cn(
                                    "px-2 py-0.5 text-[10px] font-bold rounded-full",
                                    item.status === "required" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                  )}>
                                    {item.status}
                                  </span>
                                </div>
                                {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No checklist items for this stage</p>
                  )}
                </div>

                {/* SOP Card with warm gradient */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4 sm:p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wide flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-amber-500" /> Standard Operating Procedure
                  </h4>
                  <ul className="space-y-1.5">
                    {STAGE_SOPs[patient.stage]?.map((sop, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-amber-900 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        {sop}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Eligibility Details with clean style */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-emerald-600" /> Eligibility Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Payment Type</label>
                      <SelectOrOther
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                        otherMode={paymentMethodOther}
                        onOtherModeChange={setPaymentMethodOther}
                        options={PAYMENT_METHOD_OPTIONS}
                        placeholder="Select..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Insurance Company</label>
                      <SelectOrOther
                        value={insuranceProvider}
                        onChange={setInsuranceProvider}
                        otherMode={insuranceProviderOther}
                        onOtherModeChange={setInsuranceProviderOther}
                        options={INSURANCE_PROVIDER_OPTIONS}
                        placeholder="Select..."
                      />
                    </div>
                  </div>
                  {patient.eligibilityDetails?.vob && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {VOB_LABELS.map(([key, label]) => {
                        const value = patient.eligibilityDetails?.vob?.[key]
                        if (value === undefined || value === null) return null
                        return (
                          <div key={key} className="bg-gray-50 rounded-xl p-2.5">
                            <p className="text-[10px] text-gray-500 font-medium">{label}</p>
                            <p className="text-sm font-semibold text-gray-700">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Colorful Detail Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {patient.assignedUser && (
                    <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl border border-blue-100 p-3 shadow-sm">
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Assigned To</p>
                      <p className="text-sm font-semibold text-gray-800">{patient.assignedUser.name}</p>
                    </div>
                  )}
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100 p-3 shadow-sm">
                    <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Source</p>
                    <p className="text-sm font-semibold text-gray-800 capitalize">{patient.source || "Manual"}</p>
                  </div>
                  {patient.paymentMethod && (
                    <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl border border-pink-100 p-3 shadow-sm">
                      <p className="text-[10px] font-bold text-pink-500 uppercase tracking-wider">Payment</p>
                      <p className="text-sm font-semibold text-gray-800">{patient.paymentMethod}</p>
                    </div>
                  )}
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-100 p-3 shadow-sm">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Last Updated</p>
                    <p className="text-sm font-semibold text-gray-800">{timeAgo(patient.updatedAt)}</p>
                  </div>
                </div>

                {/* Status & Access with pop colors */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    <Flag className="w-5 h-5 text-red-500" /> Status & Access
                  </h4>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-full",
                      patient.status === "active" ? "bg-emerald-100 text-emerald-800" :
                      patient.status === "completed" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
                    )}>
                      {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                    </span>
                    {patient.isPrivate && (
                      <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> Locked
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isAdmin && patient.status !== "cancelled" && !showCancelInput && (
                      <Button size="sm" variant="outline" onClick={() => setShowCancelInput(true)}
                        className="text-xs border-red-300 text-red-600 hover:bg-red-50 font-semibold">
                        <Ban className="w-3.5 h-3.5 mr-1.5" /> Mark Cancelled
                      </Button>
                    )}
                    {isAdmin && patient.status === "cancelled" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: patient.id, status: "active" })}
                        disabled={updateStatus.isPending}
                        className="text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-50 font-semibold">
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reactivate
                      </Button>
                    )}
                    {patient.isPrivate ? (
                      canUnlock && (
                        <Button size="sm" variant="outline" onClick={() => unlockPatient.mutate(patient.id)}
                          disabled={unlockPatient.isPending}
                          className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold">
                          <Unlock className="w-3.5 h-3.5 mr-1.5" /> Unlock
                        </Button>
                      )
                    ) : (
                      canLock && (
                        <Button size="sm" variant="outline" onClick={() => lockPatient.mutate(patient.id)}
                          disabled={lockPatient.isPending}
                          className="text-xs border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold">
                          <Lock className="w-3.5 h-3.5 mr-1.5" /> Lock
                        </Button>
                      )
                    )}
                  </div>
                  {isAdmin && showCancelInput && (
                    <div className="space-y-2 bg-red-50 p-3 rounded-xl border border-red-200">
                      <Textarea placeholder="Cancellation reason..." value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                        className="text-sm min-h-[70px]" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleCancelPatient} disabled={updateStatus.isPending}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs">
                          Confirm
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowCancelInput(false)} className="text-xs">Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact & Payment with colorful inputs */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4 gap-2">
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Contact & Payment</h4>
                    <Button size="sm" onClick={handleSaveContact} disabled={savingContact}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold shadow shrink-0">
                      {savingContact ? "Saving..." : "Save"}
                    </Button>
                  </div>

                  {/* Compact identity card: avatar + name + quick contact */}
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                    <img
                      src={getAvatarUrl(patient)}
                      alt={patient.name}
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(patient.name || "Patient")}`
                      }}
                      className="w-12 h-12 rounded-full object-cover border border-gray-200 shrink-0 bg-gray-50"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{patient.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {patient.phone && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone className="w-3 h-3" /> {patient.phone}
                          </span>
                        )}
                        {patient.email && (
                          <span className="flex items-center gap-1 text-xs text-gray-500 truncate">
                            <Mail className="w-3 h-3" /> {patient.email}
                          </span>
                        )}
                        {!patient.phone && !patient.email && (
                          <span className="text-xs text-gray-400 italic">No contact info on file</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(["firstName","lastName","location","phone","email","copayAmount","amountPaid"] as const).map(key => (
                      <div key={key}>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                        </label>
                        <input
                          value={contactForm[key]}
                          onChange={e => setContactForm(f => ({...f, [key]: e.target.value}))}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-colors"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Payment Type</label>
                      <SelectOrOther value={paymentMethod} onChange={setPaymentMethod} otherMode={paymentMethodOther}
                        onOtherModeChange={setPaymentMethodOther} options={PAYMENT_METHOD_OPTIONS} placeholder="Select..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Insurance</label>
                      <SelectOrOther value={insuranceProvider} onChange={setInsuranceProvider} otherMode={insuranceProviderOther}
                        onOtherModeChange={setInsuranceProviderOther} options={INSURANCE_PROVIDER_OPTIONS} placeholder="Select..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Visit Status</label>
                      <select value={visitStatus} onChange={e => setVisitStatus(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30">
                        {VISIT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Operational Notes</h4>
                  <Textarea
                    placeholder="Add notes..."
                    value={notesText}
                    onChange={e => setNotesText(e.target.value)}
                    className="text-sm min-h-[100px] rounded-xl border-gray-200 focus:ring-emerald-400/30"
                  />
                  <div className="flex justify-end mt-3">
                    <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold shadow">
                      {savingNotes ? "Saving..." : "Save Notes"}
                    </Button>
                  </div>
                </div>

                {/* Activity Log */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-indigo-400" /> Activity Log
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {logData?.logs?.length ? logData.logs.map(log => (
                      <div key={log.id} className="flex gap-2 text-xs py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <span className="text-gray-400 whitespace-nowrap font-medium">{new Date(log.createdAt).toLocaleDateString()}</span>
                        <div>
                          <span className="font-semibold text-gray-700">{log.author}</span>
                          <span className="text-gray-600 ml-1">· {log.message}</span>
                        </div>
                      </div>
                    )) : <p className="text-sm text-gray-400 italic">No activity yet</p>}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {assigning && (
          <div className="absolute inset-0 z-50 bg-white/80 flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <span className="text-sm font-medium text-gray-700">Updating assignment...</span>
          </div>
        )}

        {/* Flag Popup – vibrant colors */}
        {showFlagPopup && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFlagPopup(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className={cn("px-5 py-4 flex items-center justify-between", isAdmin ? "bg-gradient-to-r from-emerald-600 to-teal-600" : "bg-gradient-to-r from-red-500 to-rose-600")}>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Flag className="w-5 h-5" fill="white" /> {isAdmin ? "Raise Admin Flag" : "Raise Flag"}
                </h3>
                <button onClick={() => setShowFlagPopup(false)} className="p-1 rounded-lg hover:bg-white/20 text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="flagType" value="positive" checked={newFlagType === "positive"}
                        onChange={e => setNewFlagType(e.target.value as "positive"|"negative")} className="w-4 h-4 accent-emerald-600" />
                      <span className="text-sm font-medium">✅ Positive Note</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="flagType" value="negative" checked={newFlagType === "negative"}
                        onChange={e => setNewFlagType(e.target.value as "positive"|"negative")} className="w-4 h-4 accent-red-600" />
                      <span className="text-sm font-medium">⚠️ Alert/Issue</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Reason</label>
                  <textarea value={newFlagReason} onChange={e => setNewFlagReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl min-h-[80px] focus:outline-none focus:ring-2 focus:ring-emerald-400/30" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowFlagPopup(false); setNewFlagReason(""); setNewFlagType("positive"); }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                  <button
                    onClick={async () => {
                      if (patient && newFlagReason.trim()) {
                        await flagPatient.mutateAsync({ id: patient.id, reason: newFlagReason })
                        setShowFlagPopup(false)
                        setNewFlagReason("")
                        setNewFlagType("positive")
                        toast.success("Flag raised")
                      }
                    }}
                    disabled={!newFlagReason.trim() || flagPatient.isPending}
                    className={cn(
                      "px-4 py-2 text-sm font-bold rounded-xl transition-colors flex items-center gap-2 shadow",
                      newFlagReason.trim() && !flagPatient.isPending
                        ? (isAdmin ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                                   : "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white")
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {flagPatient.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" fill="currentColor" />}
                    Raise Flag
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Eligibility Check dialog (demo dummy fields) */}
        {patient && (
          <EligibilityCheckDialog
            patient={patient}
            open={showEligibilityCheck}
            onClose={() => setShowEligibilityCheck(false)}
          />
        )}
      </div>
    </div>
  )
}