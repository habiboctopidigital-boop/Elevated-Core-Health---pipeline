"use client"

import type { Patient, PatientStage } from "@/types"
import {
  AlertTriangle,
  Flag,
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  Square,
  Lock,
  Phone,
  CheckCircle,
  XCircle,
  ShieldCheck,
} from "lucide-react"
import { cn, getInitials } from "@/lib/utils"
import { getStageColor, getVaColor } from "@/lib/stage-colors"
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

// Attention-state accent bars override the stage color so flagged/stale cards
// are unmistakable at a glance. Unassigned tasks get a distinct lime highlight
// (green-family, clearly different from the emerald/forest stage shades) so
// the two VAs instantly spot unclaimed work.
const FLAG_BAR = "bg-gradient-to-r from-red-400 to-rose-500"
const STALE_BAR = "bg-gradient-to-r from-amber-400 to-amber-500"
const UNASSIGNED_BAR = "bg-gradient-to-r from-lime-400 to-lime-500"
const UNASSIGNED_AVATAR = "bg-gradient-to-br from-lime-400 to-lime-500"

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

  const stageColor = getStageColor(patient.stage)
  const isUnassigned = !patient.assignedUser
  // Highlight priority: flagged > stale > unassigned > stage color
  const accentBar = patient.isFlagged ? FLAG_BAR : stale ? STALE_BAR : isUnassigned ? UNASSIGNED_BAR : stageColor.bar
  const avatarColor = patient.isFlagged ? FLAG_BAR : stale ? STALE_BAR : isUnassigned ? UNASSIGNED_AVATAR : stageColor.avatar

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
        "relative bg-white rounded-lg border p-3.5 transition-all duration-150 overflow-hidden",
        canMoveStage ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        "hover:shadow-md hover:shadow-emerald-500/15 hover:-translate-y-0.5",
        "active:shadow-sm active:translate-y-0",
        stale && !patient.isFlagged
          ? "border-amber-300 shadow-[0_0_0_1px_#FDE68A]"
          : "border-[#E5E7EB]",
        patient.isFlagged && "bg-red-50/60 border-red-200 border-l-[3px] border-l-red-400 shadow-[0_0_0_1px_rgba(248,113,113,0.25)]",
        isDragging && "opacity-50 scale-95 shadow-lg rotate-2",
      )}
    >
      {/* - Colored top accent bar (stage color; red/amber for attention states) - */}
      <div className={cn("absolute top-0 left-0 right-0 h-[3px] pointer-events-none", accentBar)} />

      {/* - Header: avatar + name + badges - */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0 shadow-sm",
              avatarColor,
            )}
          >
            {getInitials(patient.name)}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* `min-w-0 flex-1` is load-bearing: it lets the name actually
                  shrink with an ellipsis (flex items won't shrink below their
                  content otherwise), so the name ALWAYS shows and the badges
                  wrap below instead of pushing it off the card. */}
              <h1 className="text-sm font-semibold text-[#1A1B1E] leading-tight truncate min-w-0 flex-1">
                {patient.name}
              </h1>
              <span className={cn(
                "text-[9px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap shrink-0",
                stageColor.chipBg,
                stageColor.chipText,
                stageColor.chipBorder,
              )}>
                {stageLabels[patient.stage]}
              </span>
              <span className="text-[9px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                {patient.source === "webhook" ? "Web" : "Manual"}
              </span>
            </div>
            {patient.email && (
              <p className="text-[11px] text-[#6B7280] truncate mt-0.5">{patient.email}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {patient.isPrivate && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-semibold text-amber-700 whitespace-nowrap shrink-0"
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
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-[9px] font-semibold text-red-600 whitespace-nowrap shrink-0">
              <Flag className="w-2.5 h-2.5" fill="#EF4444" />
              Flagged
            </span>
          )}
          {stale && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-semibold text-amber-600 whitespace-nowrap shrink-0">
              <AlertTriangle className="w-2.5 h-2.5" />
              Stale
            </span>
          )}
          {patient.eligibilityStatus === "eligible" && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-semibold text-emerald-700 whitespace-nowrap shrink-0">
              <CheckCircle className="w-2.5 h-2.5" />
              Eligible
            </span>
          )}
          {patient.eligibilityStatus === "not_eligible" && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-[9px] font-semibold text-red-600 whitespace-nowrap shrink-0">
              <XCircle className="w-2.5 h-2.5" />
              Not Eligible
            </span>
          )}
        </div>
      </div>

      {/* - Info chips: appointment + phone + insurance - */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        {patient.appointmentDatetime && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[10px] font-medium text-emerald-700 whitespace-nowrap">
            <Clock className="w-3 h-3" />
            {new Date(patient.appointmentDatetime).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        )}
        {patient.phone && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-200 text-[10px] font-medium text-emerald-800 whitespace-nowrap">
            <Phone className="w-3 h-3" />
            {patient.phone}
          </span>
        )}
        {patient.insuranceProvider && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EBF7EC] border border-[#65BD6C]/40 text-[10px] font-medium text-[#036638] whitespace-nowrap">
            <ShieldCheck className="w-3 h-3" />
            {patient.insuranceProvider}
          </span>
        )}
      </div>

      {/* - Assigned user - */}
      {patient.assignedUser ? (
        <div className="flex items-center gap-1.5 mb-2">
          {/* VA avatar — Jude (forest) vs Amanda (bright emerald) so the two
              VAs are instantly distinguishable. */}
          <div
            className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center",
              getVaColor(patient.assignedUser.name),
            )}
          >
            <span className="text-[8px] font-bold text-white">
              {patient.assignedUser.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-[10px] text-[#036638] font-medium">
            {patient.assignedUser.name}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 mb-2">
          <div className={cn("w-4 h-4 rounded-full flex items-center justify-center", UNASSIGNED_AVATAR)}>
            <span className="text-[8px] font-bold text-white">?</span>
          </div>
          <span className="text-[10px] font-semibold text-lime-700">Unassigned</span>
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
            <span className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[#6B7280]">
                {completedCount}/{totalCount}
              </span>
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-md border",
                allComplete
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-[#EBF7EC] text-[#036638] border-[#036638]/20",
              )}>
                {progressPct}%
              </span>
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                allComplete
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                  : "bg-gradient-to-r from-[#036638] to-emerald-500",
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {/* Individual checklist items (compact) */}
          <div className="mt-1.5 space-y-0.5">
            {stageDefs.map((item) => {
              const checked = stageState[item.id] === true
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-1 py-px",
                    checked && "bg-emerald-50/60",
                  )}
                >
                  {checked ? (
                    <CheckSquare className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Square className="w-3 h-3 text-gray-300 flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-[10px] leading-tight truncate",
                    checked ? "text-gray-400 line-through" : "text-[#1A1B1E]",
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
                  text-[#6B7280] border border-[#E5E7EB] bg-white hover:bg-gray-50 hover:text-[#1A1B1E] active:bg-gray-100 transition-colors"
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
                  "flex items-center gap-0.5 px-2.5 py-1.5 sm:px-2 sm:py-0.5 min-h-[36px] sm:min-h-0 rounded text-[10px] font-semibold transition-all",
                  allComplete
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 shadow-sm shadow-emerald-500/30"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed",
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
