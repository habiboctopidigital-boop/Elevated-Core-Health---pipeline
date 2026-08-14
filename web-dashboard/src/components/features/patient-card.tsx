"use client"

import { useState } from "react"
import type { Patient, PatientStage } from "@/types"
import {
  Flag,
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  Square,
  CheckCircle,
  XCircle,
  Mail,
  User,
  ChevronDown,
  Loader2,
  HelpCircle,
  Calendar,
  Check,
  X,
  Globe,
} from "lucide-react"
import { cn, getInitials } from "@/lib/utils"
import { getStageColor, getVaColor } from "@/lib/stage-colors"
import { STALE_HOURS } from "@/constants"
import { useChecklistItems, useListVas, useAssignPatient } from "@/hooks/query/usePatients"
import { useStageMeta } from "@/hooks/query/useStages"
import { useAuth } from "@/hooks/auth/useAuth"
import { isAdminOrAbove } from "@/lib/roles"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

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
const DEFAULT_BAR = "bg-gradient-to-r from-lime-400 to-green-500"
const DEFAULT_AVATAR = "bg-gradient-to-br from-lime-400 to-green-500"

// Compact, arrow-driven assign control. A single arrow button opens the VA
// list — the assignee (or "Assign") is always visible on the trigger, and the
// list marks the current owner with a check so reassigns are one click.
function AssignArrowMenu({
  patient,
  vaList,
  variant,
  assigning,
  onAssign,
}: {
  patient: Patient
  vaList?: { id: string; name: string }[]
  variant: "amber" | "emerald"
  assigning: boolean
  onAssign: (vaId: string) => void
}) {
  const isAmber = variant === "amber"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          draggable={false}
          disabled={assigning}
          onClick={(e) => e.stopPropagation()}
          title={patient.assignedTo ? "Reassign VA" : "Assign VA"}
          className={cn(
            "inline-flex items-center gap-1.5 font-semibold transition-colors select-none",
            "disabled:opacity-60 disabled:cursor-wait cursor-pointer",
            isAmber
              ? "bg-amber-100/80 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-full pl-2.5 pr-2 py-1 text-xs"
              : "bg-white hover:bg-emerald-50 border border-[#E5E7EB] text-[#036638] rounded-xl px-2.5 py-2 text-xs",
          )}
        >
          {assigning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <User className={cn("w-3.5 h-3.5", isAmber ? "text-amber-600" : "text-emerald-600")} />
          )}
          {/* Name hidden on phones so the footer never overflows — icon + chevron only. */}
          <span className="max-w-[88px] truncate hidden sm:inline">{patient.assignedUser?.name ?? "Assign"}</span>
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs font-semibold text-[#6B7280]">
          Assign to
        </DropdownMenuLabel>
        {vaList?.length ? (
          vaList.map((va) => (
            <DropdownMenuItem
              key={va.id}
              disabled={assigning}
              onSelect={() => onAssign(va.id)}
              className="cursor-pointer text-xs"
            >
              <span className="flex-1 truncate">{va.name}</span>
              {va.id === patient.assignedTo && <Check className="w-3.5 h-3.5 text-emerald-600" />}
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-2 py-1.5 text-xs text-gray-400">No VAs available</div>
        )}
        {patient.assignedTo && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={assigning}
              onSelect={() => onAssign("")}
              className="cursor-pointer text-xs text-red-600 focus:text-red-600"
            >
              <X className="w-3.5 h-3.5" />
              Unassign
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
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
  const [assigningFrom, setAssigningFrom] = useState<"banner" | "footer" | null>(null)
  // Phase 3 shared editing: board is open - any VA or admin can move any patient.
  const isAdmin = isAdminOrAbove(currentUser?.role)
  const canMoveStage = true

  const stageColor = getStageColor(patient.stage)
  const isUnassigned = !patient.assignedUser
  // Highlight priority: flagged > stale > unassigned > stage color (falls back
  // to the lime/green default so the card matches the reference design when
  // no stage-specific color is defined).
  const accentBar = patient.isFlagged ? FLAG_BAR : stale ? STALE_BAR : isUnassigned ? UNASSIGNED_BAR : stageColor?.bar || DEFAULT_BAR
  const avatarColor = patient.isFlagged ? FLAG_BAR : stale ? STALE_BAR : isUnassigned ? UNASSIGNED_AVATAR : stageColor?.avatar || DEFAULT_AVATAR

  // - Checklist progress for this stage (only REQUIRED items gate moves) -
  const stageDefs = checklistDefs?.filter((d) => d.stage === patient.stage) || []
  const stageState = patient.checklistState?.[patient.stage] || {}
  const requiredDefs = stageDefs.filter((d) => d.status === "required")
  const completedCount = requiredDefs.filter((d) => stageState[d.id] === true).length
  const totalCount = requiredDefs.length
  const allComplete = totalCount > 0 ? completedCount === totalCount : true
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100

  // VAs may only claim/assign themselves (roles table) — admins can assign any VA.
  const assignableVas = isAdmin
    ? vaList
    : vaList?.filter((v) => v.id === currentUser?.id)

  const handleAssign = (vaId: string, from: "banner" | "footer") => {
    setAssigningFrom(from)
    assignPatient.mutate(
      { id: patient.id, assignedTo: vaId || null },
      { onSettled: () => setAssigningFrom(null) },
    )
  }

  return (
    <div
      draggable={canMoveStage}
      onClick={() => onClick(patient)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "relative bg-white rounded-3xl border p-4 sm:p-5 transition-all duration-150 overflow-hidden",
        canMoveStage ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        "hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-0.5",
        "active:shadow-md active:translate-y-0",
        stale && !patient.isFlagged
          ? "border-amber-200 shadow-[0_0_0_1px_#FDE68A]"
          : "border-[#EDEFF2] shadow-[0_1px_3px_rgba(16,24,40,0.06)]",
        patient.isFlagged && "bg-red-50/50 border-red-200 shadow-[0_0_0_1px_rgba(248,113,113,0.2)]",
        isDragging && "opacity-50 scale-95 shadow-lg rotate-2",
      )}
    >
      {/* - Colored top accent bar (stage color; red/amber for attention states) - */}
      {/* <div className={cn("absolute top-0 left-0 right-0 h-2 rounded-t-3xl pointer-events-none", accentBar)} /> */}

      {/* - Header: avatar + name + badges - */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0",
              "shadow-[0_0_0_5px_rgba(163,230,53,0.15)]",
              avatarColor,
            )}
          >
            {getInitials(patient.name)}
          </div>
          <div className="flex flex-col min-w-0 gap-1.5 pt-0.5">
            <h1 className="text-lg font-bold text-[#12141A] leading-tight truncate">
              {patient.name}
            </h1>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border",
                  stageColor?.chipBg || "bg-emerald-50",
                  stageColor?.chipText || "text-emerald-700",
                  stageColor?.chipBorder || "border-emerald-200",
                )}
              >
                <CheckCircle className="w-3 h-3" />
                {stageLabels[patient.stage]}
              </span>

              {patient.eligibilityStatus === "eligible" && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <CheckCircle className="w-3 h-3" />
                  Eligible
                </span>
              )}
              {patient.eligibilityStatus === "not_eligible" && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600">
                  <XCircle className="w-3 h-3" />
                  Not Eligible
                </span>
              )}

              {patient.isFlagged && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600">
                  <Flag className="w-3 h-3" fill="#EF4444" />
                  Flagged
                </span>
              )}

              {/* Source badge — always visible, matches the card's badge scale. */}
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600">
                <Globe className="w-3 h-3" />
                {patient.source === "webhook" ? "Website" : "Manual"}
              </span>
            </div>

            {patient.email && (
              <p className="flex items-center gap-1 text-xs text-[#6B7280]">
                <Mail className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="truncate">{patient.email}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="my-4 border-t border-[#EDEFF2]" />

      {/* - Info boxes: assigned user + appointment (single column on phones, appointment right) - */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
        {patient.assignedUser ? (
          /* Assigned — just show the VA's name */
          <div className="flex items-center gap-2.5 rounded-2xl bg-[#F3FAF4] px-3 py-2.5 sm:px-3.5 sm:py-3 min-w-0">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                getVaColor(patient.assignedUser.name),
              )}
            >
              <span className="text-[10px] font-bold text-white">
                {patient.assignedUser.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-[#8A93A3] font-medium">Assigned To</p>
              <p className="text-xs font-semibold text-emerald-700 truncate">
                {patient.assignedUser.name}
              </p>
            </div>
          </div>
        ) : (
          /* Unassigned — offer an assign dropdown right on the card */
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-50/60 px-3 py-2.5 sm:px-3.5 sm:py-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shrink-0">
                <HelpCircle className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                {/* <p className="text-[10px] text-[#8A93A3] font-medium">Assignment</p> */}
                {/* <p className="text-xs font-bold text-amber-600">Unassigned</p> */}
              </div>
            </div>
            {assignableVas && assignableVas.length > 0 && (
              <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                <AssignArrowMenu
                  patient={patient}
                  vaList={assignableVas}
                  variant="amber"
                  assigning={assigningFrom === "banner"}
                  onAssign={(vaId) => handleAssign(vaId, "banner")}
                />
              </div>
            )}
          </div>
        )}

        {patient.appointmentDatetime ? (
          <div className="flex items-center gap-2.5 rounded-2xl bg-[#F3FAF4] px-3 py-2.5 sm:px-3.5 sm:py-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#E1F4E3] flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-[#8A93A3] font-medium">Appointment</p>
              <p className="text-xs font-bold text-[#12141A] truncate">
                {new Date(patient.appointmentDatetime).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs font-semibold text-emerald-600">
                {new Date(patient.appointmentDatetime).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ) : (
          /* No appointment scheduled — show a muted placeholder instead of an
             empty cell so the card always looks complete. */
          <div className="flex items-center gap-2.5 rounded-2xl bg-[#F6F8F7] px-3 py-2.5 sm:px-3.5 sm:py-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#E9ECEA] flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#9CA3AF]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-[#8A93A3] font-medium">Appointment</p>
              <p className="text-xs font-semibold text-[#9CA3AF]">No appointment scheduled</p>
            </div>
          </div>
        )}
      </div>

      {/* - Checklist progress - */}
      {totalCount > 0 ? (
        <div className="mb-2.5 rounded-2xl bg-[#F3FAF4] px-3 py-2.5 sm:px-3.5 sm:py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-[#12141A] flex items-center gap-1.5">
              {allComplete ? (
                <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Square className="w-3.5 h-3.5 text-[#6B7280]" />
              )}
              Required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#6B7280]">
                {completedCount}/{totalCount}
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full border",
                  allComplete
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-white text-[#036638] border-[#036638]/20",
                )}
              >
                {progressPct}%
              </span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
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
          <div className="mt-1.5 space-y-0.5">
            {stageDefs.map((item) => {
              const checked = stageState[item.id] === true
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-1 py-0.5",
                    checked && "bg-white/60",
                  )}
                >
                  {checked ? (
                    <CheckSquare className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Square className="w-3 h-3 text-gray-300 flex-shrink-0" />
                  )}
                  <span
                    className={cn(
                      "text-[11px] leading-tight truncate",
                      checked ? "text-gray-400 line-through" : "text-[#12141A]",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.status === "optional" && (
                    <span className="text-[9px] font-semibold text-[#036638] bg-white px-1.5 rounded-full shrink-0">
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
        <div className="flex items-center gap-2.5 rounded-2xl bg-blue-50/60 px-3 py-2.5 sm:px-3.5 sm:py-3 mb-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-xs font-semibold text-blue-700">No checklist required</span>
        </div>
      )}

      <div className="my-3 border-t border-[#EDEFF2]" />

      <div className="flex items-center gap-1.5 mb-3">
        <Clock className="w-3 h-3 text-[#8A93A3]" />
        <span className="text-xs text-[#8A93A3]">
          Last Updated At: <span className="font-semibold text-[#6B7280]">{timeAgo(patient.updatedAt)}</span>
        </span>
      </div>

      {/* - Footer: move buttons + arrow assign - */}
      {canMoveStage && (
        <div className="flex items-center w-full gap-2 flex-wrap">
          {canRetreat && (
            <button
              draggable={false}
              onClick={(e) => {
                e.stopPropagation()
                onMoveStage(patient.id, stageOrder[currentIdx - 1])
              }}
              className="flex items-center justify-center gap-1 flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold
                text-[#6B7280] border border-[#E5E7EB] bg-white hover:bg-gray-50 hover:text-[#12141A] active:bg-gray-100 transition-colors"
              title={`Move back to ${stageLabels[stageOrder[currentIdx - 1]]}`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
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
                "flex items-center justify-center gap-1 flex-[1.4] px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
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
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {isAdmin && assignableVas && assignableVas.length > 0 && (
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <AssignArrowMenu
                patient={patient}
                vaList={assignableVas}
                variant="emerald"
                assigning={assigningFrom === "footer"}
                onAssign={(vaId) => handleAssign(vaId, "footer")}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
