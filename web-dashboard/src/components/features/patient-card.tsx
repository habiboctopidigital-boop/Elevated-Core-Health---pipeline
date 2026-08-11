"use client"

import type { Patient, PatientStage } from "@/types"
import { AlertTriangle, Flag, Clock, ArrowLeft, ArrowRight, CheckSquare, Square, Lock, Phone, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { STALE_HOURS } from "@/constants"
import { useChecklistItems, useListVas, useAssignPatient } from "@/hooks/query/usePatients"
import { useStageMeta } from "@/hooks/query/useStages"
import { useAuth } from "@/hooks/auth/useAuth"

interface PatientCardProps {
  patient: Patient
  onMoveStage: (id: string, target: PatientStage) => void
  onClick: (patient: Patient) => void
  isDragging?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
}

function isStale(updatedAt: string): boolean {
  const updated = new Date(updatedAt).getTime()
  const now = Date.now()
  const diffHours = (now - updated) / (1000 * 60 * 60)
  return diffHours > STALE_HOURS
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return "1h ago"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function PatientCard({ patient, onMoveStage, onClick, isDragging, onDragStart, onDragEnd }: PatientCardProps) {
  const { order: stageOrder, labels: stageLabels, byKey: stageByKey } = useStageMeta()
  const isFinalStage = stageByKey.get(patient.stage)?.isFinal ?? false
  const stale = !isFinalStage && isStale(patient.updatedAt)
  const currentIdx = stageOrder.indexOf(patient.stage)
  const canAdvance = currentIdx < stageOrder.length - 1
  const canRetreat = currentIdx > 0
  const { data: checklistDefs } = useChecklistItems()
  const { user: currentUser } = useAuth()
  const { data: vaList } = useListVas()
  const assignPatient = useAssignPatient()
  // Phase 3 shared editing: board is open - any VA or admin can move any patient.
  const isAdmin = currentUser?.role === "admin"
  const canMoveStage = true

  // - Checklist progress for this stage (only REQUIRED items gate moves) -
  const stageDefs = checklistDefs?.filter((d) => d.stage === patient.stage) || []
  const stageState = patient.checklistState?.[patient.stage] || {}
  const requiredDefs = stageDefs.filter((d) => d.status === "required")
  const completedCount = requiredDefs.filter((d) => stageState[d.id] === true).length
  const totalCount = requiredDefs.length
  const allComplete = totalCount > 0 ? completedCount === totalCount : true
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100

  return (
    <div
      draggable={canMoveStage}
      onClick={() => onClick(patient)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "bg-white rounded-lg border p-3.5 transition-all duration-150 relative",
        canMoveStage ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        "hover:shadow-md hover:border-[#65BD6C]/40 hover:-translate-y-0.5",
        "active:shadow-sm active:translate-y-0",
        stale
          ? "border-amber-300 shadow-[0_0_0_1px_#FDE68A]"
          : "border-[#E5E7EB]",
        patient.isFlagged && "bg-[#F0F9F5] border-[#036638] border-l-[3px] shadow-[0_0_0_1px_#036638]/20",
        isDragging && "opacity-50 scale-95 shadow-lg rotate-2",
      )}
    >
      {/* - Header: Name + badges - */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-sm font-semibold text-[#1A1B1E] leading-tight truncate">
              {patient.name}
            </h1>
            {/* {patient.bookingPlatform && (
              <span className="text-[9px] font-medium text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                {patient.bookingPlatform}
              </span>
            )} */}
            <span className="text-[9px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
              {patient.source === "webhook" ? "Web" : "Manual"}
            </span>
          </div>
          {patient.email && (
            <p className="text-[11px] text-[#6B7280] truncate mt-0.5">{patient.email}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {patient.isPrivate && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-semibold text-amber-700"
              title={
                patient.privateLockedByUser
                  ? `Locked by ${patient.privateLockedByUser.name}`
                  : "Locked by assigned VA"
              }
            >
              <Lock className="w-2.5 h-2.5" />
              Locked
            </span>
          )}
          {patient.isFlagged && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#036638]/10 border border-[#036638]/20 text-[9px] font-semibold text-[#036638]">
              <Flag className="w-2.5 h-2.5" fill="#036638" />
              Flagged
            </span>
          )}
          {stale && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-semibold text-amber-600">
              <AlertTriangle className="w-2.5 h-2.5" />
              Stale
            </span>
          )}
          {patient.eligibilityStatus === "eligible" && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-semibold text-emerald-700">
              <CheckCircle className="w-2.5 h-2.5" />
              Eligible
            </span>
          )}
          {patient.eligibilityStatus === "not_eligible" && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-[9px] font-semibold text-red-600">
              <XCircle className="w-2.5 h-2.5" />
              Not Eligible
            </span>
          )}
        </div>
      </div>

      {/* - Info row: appointment + phone - */}
      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
        {patient.appointmentDatetime && (
          <p className="text-[11px] text-[#6B7280] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(patient.appointmentDatetime).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
        {patient.phone && (
          <p className="text-[11px] text-[#6B7280] flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {patient.phone}
          </p>
        )}
      </div>

      {/* - Assigned user - */}
      {patient.assignedUser ? (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-4 h-4 rounded-full bg-[#036638]/10 flex items-center justify-center">
            <span className="text-[8px] font-bold text-[#036638]">
              {patient.assignedUser.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-[10px] text-[#036638] font-medium">
            {patient.assignedUser.name}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-[8px] font-bold text-gray-400">?</span>
          </div>
          <span className="text-[10px] text-gray-400 italic">Unassigned</span>
        </div>
      )}

      {/* - Checklist progress - */}
      {totalCount > 0 ? (
        <div className="mb-2 px-0.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-[#6B7280] flex items-center gap-1">
              {allComplete ? (
                <CheckSquare className="w-3 h-3 text-emerald-500" />
              ) : (
                <Square className="w-3 h-3 text-[#6B7280]" />
              )}
              Required
            </span>
            <span className={cn(
              "text-[10px] font-bold",
              allComplete ? "text-emerald-600" : "text-[#036638]"
            )}>
              {completedCount}/{totalCount}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                allComplete ? "bg-emerald-500" : "bg-[#036638]"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {/* Individual checklist items (compact) */}
          <div className="mt-1.5 space-y-0.5">
            {stageDefs.map((item) => {
              const checked = stageState[item.id] === true
              return (
                <div key={item.id} className="flex items-center gap-1.5">
                  {checked ? (
                    <CheckSquare className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Square className="w-3 h-3 text-gray-300 flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-[10px] leading-tight truncate",
                    checked ? "text-gray-400 line-through" : "text-[#1A1B1E]"
                  )}>
                    {item.label}
                  </span>
                  {item.status === "optional" && (
                    <span className="text-[8px] font-semibold text-[#036638] bg-[#EBF7EC] px-1 rounded-full shrink-0">
                      Opt
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Empty state for stages with no checklist */
        <div className="mb-2 flex items-center gap-1">
          <CheckSquare className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] text-emerald-600 font-medium">No checklist required</span>
        </div>
      )}
             <span className="text-[10px] text-[#6B7280]">Last Updated At : {timeAgo(patient.updatedAt)}</span>


      {/* - Footer: timestamp + move buttons - */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]/50">

        {canMoveStage ? (
          <div className="flex items-center w-full justify-between gap-1.5 sm:gap-1">
            {canRetreat && (
              <button
                draggable={false}
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveStage(patient.id, stageOrder[currentIdx - 1])
                }}
                className="flex items-center gap-0.5 px-2 py-1.5 sm:px-1.5 sm:py-0.5 min-h-[36px] sm:min-h-0 rounded text-[10px] font-medium
                  text-[#6B7280] hover:bg-gray-100 hover:text-[#1A1B1E] active:bg-gray-200 transition-colors"
                title={`Move back to ${stageLabels[stageOrder[currentIdx - 1]]}`}
              >
                <ArrowLeft className="w-3 h-3" />
                Back
              </button>
            )}
            {canAdvance && (
              <button
                draggable={false}
                disabled={!allComplete}
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveStage(patient.id, stageOrder[currentIdx + 1])
                }}
                className={cn(
                  "flex items-center gap-0.5 px-2.5 py-1.5 sm:px-2 sm:py-0.5 min-h-[36px] sm:min-h-0 rounded text-[10px] font-medium transition-colors",
                  allComplete
                    ? "bg-[#036638] text-white hover:bg-[#025030] active:bg-[#014a29]"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
                title={
                  allComplete
                    ? `Move to ${stageLabels[stageOrder[currentIdx + 1]]}`
                    : "Tick every required item before moving this card forward."
                }
              >
                Move Next
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : null}
        {isAdmin && (
          <div className="relative inline-block w-[110px]" onClick={(e) => e.stopPropagation()}>
            <select
              onChange={(e) => {
                const val = e.target.value
                if (val) assignPatient.mutate({ id: patient.id, assignedTo: val })
                e.target.value = ""
              }}
              value=""
              className="appearance-none w-full text-[10px] border border-[#E5E7EB] rounded px-2 py-1.5 sm:py-0.5 min-h-[36px] sm:min-h-0 pr-6 text-[#1A1B1E] bg-white cursor-pointer hover:border-[#65BD6C]/40 focus:outline-none focus:ring-1 focus:ring-[#036638]"
              title="Assign VA"
            >
              <option value="">{patient.assignedTo ? "Reassign..." : "Assign VA..."}</option>
              {vaList?.map((va) => (
                <option key={va.id} value={va.id}>
                  {va.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
