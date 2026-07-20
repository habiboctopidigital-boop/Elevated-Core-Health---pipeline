"use client"

import { useState, useEffect } from "react"
import type { Patient, PatientStage } from "@/types"
import { STAGE_ORDER, STAGE_LABELS, STAGE_HINTS } from "@/types"
import { ROLES, STALE_HOURS } from "@/constants"
import {
  X,
  Flag,
  Clock,
  ChevronRight,
  Check,
  AlertTriangle,
  MessageSquare,
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
} from "@/hooks/query/usePatients"
import { usePatient } from "@/hooks/query/usePatients"
import { useActivityLog } from "@/hooks/query/useActivityLog"
import { cn } from "@/lib/utils"

interface PatientModalProps {
  patientId: string | null
  open: boolean
  onClose: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return "< 1h ago"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function PatientModal({ patientId, open, onClose }: PatientModalProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
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

  const [notesText, setNotesText] = useState("")
  const [flagReason, setFlagReason] = useState("")
  const [showFlagInput, setShowFlagInput] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    if (patient?.notes) setNotesText(patient.notes)
    else setNotesText("")
    setShowFlagInput(false)
    setFlagReason("")
  }, [patient?.id, patient?.notes])

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
    if (!patient) return
    await clearFlag.mutateAsync(patient.id)
  }

  const handleMoveStage = async (target: PatientStage) => {
    if (!patient) return
    await moveStage.mutateAsync({ id: patient.id, targetStage: target })
  }

  const handleClaim = async () => {
    if (!patient || !user) return
    await claimPatient.mutateAsync({ id: patient.id, userId: user.id })
  }

  const stale =
    patient &&
    patient.stage !== "reconciled" &&
    (Date.now() - new Date(patient.updatedAt).getTime()) / (1000 * 60 * 60) >
      STALE_HOURS

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4 animate-in fade-in zoom-in-95 duration-200">
        {isLoading || !patient ? (
          <div className="p-8 text-center text-[#8B8D92] text-sm">
            {isLoading ? "Loading..." : "Patient not found"}
          </div>
        ) : (
          <>
            <div className="sticky top-0 bg-white border-b border-[#EADEC0]/50 px-6 py-4 flex items-start justify-between z-10 rounded-t-xl">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-[#1a1a1a] truncate">
                    {patient.name}
                  </h2>
                  {patient.isFlagged && (
                    <Badge
                      variant="outline"
                      className="bg-[#FEF2F2] text-[#E8792E] border-[#E8792E]/30 text-[10px] font-semibold gap-1"
                    >
                      <Flag className="w-3 h-3" fill="#E8792E" />
                      Flagged
                    </Badge>
                  )}
                  {stale && (
                    <Badge
                      variant="outline"
                      className="bg-[#FEFCE8] text-amber-600 border-amber-200 text-[10px] font-semibold gap-1"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Stale
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[#8B8D92]">
                  {STAGE_LABELS[patient.stage]} &middot; Created{" "}
                  {new Date(patient.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[#EBF7EC] text-[#8B8D92] hover:text-[#036638] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Stage Navigation */}
              <div>
                <p className="text-[11px] font-semibold text-[#8B8D92] uppercase tracking-wider mb-2">
                  Pipeline Stage
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STAGE_ORDER.map((stage) => {
                    const idx = STAGE_ORDER.indexOf(stage)
                    const currentIdx = STAGE_ORDER.indexOf(patient.stage)
                    const isComplete = idx < currentIdx
                    const isCurrent = stage === patient.stage
                    return (
                      <button
                        key={stage}
                        onClick={() => handleMoveStage(stage)}
                        disabled={moveStage.isPending}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border",
                          isCurrent &&
                            "bg-[#036638] text-white border-[#036638] shadow-sm",
                          isComplete &&
                            "bg-[#EBF7EC] text-[#036638] border-[#65BD6C]/30",
                          !isCurrent &&
                            !isComplete &&
                            "bg-white text-[#8B8D92] border-[#EADEC0] hover:border-[#65BD6C]/40",
                        )}
                      >
                        {isComplete && <Check className="w-3 h-3" />}
                        {STAGE_LABELS[stage]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Checklist */}
              <div>
                <p className="text-[11px] font-semibold text-[#8B8D92] uppercase tracking-wider mb-2">
                  Checklist — {STAGE_LABELS[patient.stage]}
                </p>
                <div className="space-y-1.5">
                  {patient.checklistState &&
                  Object.keys(patient.checklistState).length > 0 ? (
                    Object.entries(
                      patient.checklistState[patient.stage] || {},
                    ).map(([itemId, checked]) => (
                      <label
                        key={itemId}
                        className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-[#EBF7EC]/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={!!checked}
                          onChange={() =>
                            toggleChecklist.mutate({
                              id: patient.id,
                              itemId,
                              checked: !checked,
                            })
                          }
                          className="w-4 h-4 rounded border-[#EADEC0] text-[#036638] focus:ring-[#036638] accent-[#036638]"
                        />
                        <span
                          className={cn(
                            "text-sm",
                            checked
                              ? "text-[#8B8D92] line-through"
                              : "text-[#1a1a1a]",
                          )}
                        >
                          {itemId.replace(/_/g, " ")}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-[#8B8D92] italic">
                      No checklist items for this stage
                    </p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                {patient.appointmentDatetime && (
                  <div>
                    <p className="text-[10px] font-semibold text-[#8B8D92] uppercase tracking-wider mb-1">
                      Appointment
                    </p>
                    <p className="text-sm text-[#1a1a1a] flex items-center gap-1.5">
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
                  <div>
                    <p className="text-[10px] font-semibold text-[#8B8D92] uppercase tracking-wider mb-1">
                      Assigned To
                    </p>
                    <p className="text-sm text-[#1a1a1a]">
                      {patient.assignedUser.name}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-semibold text-[#8B8D92] uppercase tracking-wider mb-1">
                    Source
                  </p>
                  <p className="text-sm text-[#1a1a1a] capitalize">
                    {patient.source || "Manual"}
                  </p>
                </div>
                {patient.bookingPlatform && (
                  <div>
                    <p className="text-[10px] font-semibold text-[#8B8D92] uppercase tracking-wider mb-1">
                      Booking Platform
                    </p>
                    <p className="text-sm text-[#1a1a1a]">
                      {patient.bookingPlatform}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-semibold text-[#8B8D92] uppercase tracking-wider mb-1">
                    Last Updated
                  </p>
                  <p className="text-sm text-[#1a1a1a]">
                    {timeAgo(patient.updatedAt)}
                  </p>
                </div>
              </div>

              {/* Flag Section */}
              {patient.isFlagged ? (
                <div className="bg-[#FEF2F2] border border-red-100 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#E8792E] flex items-center gap-1.5">
                        <Flag className="w-3.5 h-3.5" fill="#E8792E" />
                        Flagged for Donna
                      </p>
                      {patient.flagReason && (
                        <p className="text-sm text-[#1a1a1a] mt-1">
                          {patient.flagReason}
                        </p>
                      )}
                      {patient.flaggedByUser && (
                        <p className="text-[11px] text-[#8B8D92] mt-1">
                          by {patient.flaggedByUser.name}
                          {patient.flaggedAt &&
                            ` · ${new Date(patient.flaggedAt).toLocaleString()}`}
                        </p>
                      )}
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFlag}
                        className="text-xs h-7 text-[#E8792E] hover:text-red-700 hover:bg-red-50"
                      >
                        Clear Flag
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
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
                          className="bg-[#E8792E] hover:bg-[#D4691F] text-white text-xs"
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
                      className="text-xs gap-1.5 border-[#E8792E]/30 text-[#E8792E] hover:bg-[#FEF2F2]"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      Flag for Donna
                    </Button>
                  )}
                </div>
              )}

              {/* Claim / Assign */}
              {!patient.assignedUser && user?.role === "va" && (
                <div>
                  <Button
                    size="sm"
                    onClick={handleClaim}
                    disabled={claimPatient.isPending}
                    className="bg-[#036638] hover:bg-[#028544] text-white text-xs"
                  >
                    {claimPatient.isPending ? "Claiming..." : "Claim Patient"}
                  </Button>
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="text-[11px] font-semibold text-[#8B8D92] uppercase tracking-wider mb-2">
                  Operational Notes
                </p>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add operational notes (no clinical data)..."
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    className="text-sm min-h-[80px]"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="bg-[#036638] hover:bg-[#028544] text-white text-xs"
                    >
                      {savingNotes ? "Saving..." : "Save Notes"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Activity Log */}
              <div>
                <p className="text-[11px] font-semibold text-[#8B8D92] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" />
                  Activity Log
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {logData?.logs && logData.logs.length > 0 ? (
                    logData.logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-2 text-xs py-1.5 border-b border-[#EADEC0]/30 last:border-0"
                      >
                        <span className="text-[10px] text-[#8B8D92] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="font-medium text-[#036638] min-w-fit">
                          {log.author}:
                        </span>
                        <span className="text-[#4a4a4a]">{log.message}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#8B8D92] italic">No activity yet</p>
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
