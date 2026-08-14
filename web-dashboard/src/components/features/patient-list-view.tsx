"use client"

import { useMemo } from "react"
import { Calendar, CheckCircle2, ChevronRight, Flag, Loader2, Users } from "lucide-react"
import type { Patient, PatientStage } from "@/types"
import { cn } from "@/lib/utils"
import { getStageColor } from "@/lib/stage-colors"

interface PatientListViewProps {
  /** Already-filtered patients, shown across all stages in one compact list. */
  patients: Patient[]
  stageOrder: string[]
  stageLabels: Record<string, string>
  onMoveStage: (id: string, target: PatientStage) => void
  onSelect: (patient: Patient) => void
  /** Set of patient ids currently being moved — rows show a spinner instead of the Next button. */
  pendingIds?: Set<string>
  /** Stage jump refs — attached to the first row of each stage so the jump bar can scroll the list. */
  registerStageRef?: (stage: string) => (el: HTMLDivElement | null) => void
}

/**
 * Compact list view for the board (default on phones < 500px). Every stage's
 * patients appear in one vertical list, ordered by stage then appointment
 * date, with deliberately minimal info per row: name, stage badge,
 * appointment date and a one-tap "Next" button to advance the stage. Clicking
 * the row opens the full patient modal.
 */
export function PatientListView({
  patients,
  stageOrder,
  stageLabels,
  onMoveStage,
  onSelect,
  pendingIds,
  registerStageRef,
}: PatientListViewProps) {
  const sorted = useMemo(() => {
    const order = new Map(stageOrder.map((stage, i) => [stage, i]))
    return [...patients].sort((a, b) => {
      const ia = order.get(a.stage) ?? Number.MAX_SAFE_INTEGER
      const ib = order.get(b.stage) ?? Number.MAX_SAFE_INTEGER
      if (ia !== ib) return ia - ib
      const ta = a.appointmentDatetime ? new Date(a.appointmentDatetime).getTime() : Number.POSITIVE_INFINITY
      const tb = b.appointmentDatetime ? new Date(b.appointmentDatetime).getTime() : Number.POSITIVE_INFINITY
      if (ta !== tb) return ta - tb
      return (a.firstName || a.name || "").localeCompare(b.firstName || b.name || "")
    })
  }, [patients, stageOrder])

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-2xl border border-[#E5E7EB]">
        <div className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center">
          <Users className="w-5 h-5 text-[#9CA3AF]" />
        </div>
        <p className="text-sm font-semibold text-[#1A1B1E]">No patients found</p>
        <p className="text-xs text-[#6B7280]">Try adjusting the filters</p>
      </div>
    )
  }

  const seenStages = new Set<string>()

  return (
    <div className="space-y-2.5 pb-2">
      {sorted.map((patient) => {
        const idx = stageOrder.indexOf(patient.stage)
        const nextStage = idx >= 0 && idx < stageOrder.length - 1 ? stageOrder[idx + 1] : null
        const isPending = pendingIds?.has(patient.id) ?? false
        const color = getStageColor(patient.stage)
        const displayName = [patient.firstName, patient.lastName].filter(Boolean).join(" ") || patient.name
        // Attach the stage-jump ref to the first row of each stage only, so a
        // jump scrolls the list to that stage's first patient.
        const isFirstOfStage = !seenStages.has(patient.stage)
        if (isFirstOfStage) seenStages.add(patient.stage)
        const rowRef = isFirstOfStage && registerStageRef ? registerStageRef(patient.stage) : undefined

        return (
          <div
            key={patient.id}
            ref={rowRef}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(patient)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onSelect(patient)
              }
            }}
            className="group w-full text-left bg-white rounded-2xl border border-[#E5E7EB] px-3.5 py-3 hover:border-[#65BD6C]/50 hover:shadow-sm transition-all active:scale-[0.995] cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", color.avatar)}>
                <span className="text-xs font-bold text-white">{displayName.charAt(0).toUpperCase()}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm font-bold text-[#1A1B1E] truncate">{displayName}</p>
                  {patient.isFlagged && (
                    <Flag
                      className="w-3 h-3 text-[#036638] shrink-0"
                      fill="#036638"
                      aria-label="Flagged for Donna"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 min-w-0">
                  <span
                    className={cn(
                      "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                      color.chipBg,
                      color.chipText,
                      color.chipBorder,
                    )}
                  >
                    {stageLabels[patient.stage] || patient.stage}
                  </span>
                  {patient.appointmentDatetime && (
                    <span className="flex items-center gap-1 text-[11px] text-[#6B7280] min-w-0">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span className="truncate">{formatAppointment(patient.appointmentDatetime)}</span>
                    </span>
                  )}
                </div>
              </div>

              {nextStage ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMoveStage(patient.id, nextStage)
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#036638] text-white hover:bg-[#025030] transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  title={`Move to ${stageLabels[nextStage]}`}
                >
                  {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                  Next
                </button>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Done
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatAppointment(datetime: string): string {
  try {
    return new Date(datetime).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return datetime
  }
}
