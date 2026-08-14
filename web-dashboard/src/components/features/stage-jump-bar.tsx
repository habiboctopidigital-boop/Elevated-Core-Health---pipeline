"use client"

import { ChevronDown, CornerDownRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { getStageColor } from "@/lib/stage-colors"

interface StageJumpBarProps {
  stageOrder: string[]
  stageLabels: Record<string, string>
  /** Patient count per stage key — shown as a small badge on each pill. */
  counts: Record<string, number>
  /** The stage that was just jumped to (brief highlight flash). */
  activeStage: string | null
  onJump: (stage: string) => void
}

/**
 * Jump-to-stage control shared by the VA and admin boards.
 *
 * Desktop (sm+): a leading "Jump to" chip plus a horizontally scrollable row
 * of stage pills; each pill carries its stage-color dot and live patient
 * count. Phone (< sm): the same action collapses to a single native dropdown
 * so the bar never squeezes or clips on narrow screens. The just-jumped stage
 * lights up brand-green while the column flashes via `animate-jump-flash`.
 */
export function StageJumpBar({ stageOrder, stageLabels, counts, activeStage, onJump }: StageJumpBarProps) {
  return (
    <div className="flex items-center gap-2.5 mb-4 w-full min-w-0">
      {/* Leading label chip — sm+ only */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#036638]/5 border border-[#036638]/10 text-[#036638] shrink-0">
        <CornerDownRight className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold">Jump to</span>
      </div>
      {/* Stage pills — sm+ only. py-1/-my-1: keep a touch of vertical padding
          for focus rings while cancelling it out so the bar's height stays
          exactly one row. flex-1/min-w-0 + shrink-0 pills = the pills
          overflow and scroll horizontally instead of squeezing/clipping. */}
      <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-1 -my-1 flex-1 min-w-0">
        {stageOrder.map((stage) => {
          const color = getStageColor(stage)
          const isActive = activeStage === stage
          return (
            <button
              key={stage}
              onClick={() => onJump(stage)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer",
                isActive
                  ? "bg-[#036638] text-white border-[#036638] shadow-md shadow-emerald-500/25 scale-[1.03]"
                  : "bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#65BD6C]/60 hover:text-[#036638] hover:shadow-sm",
              )}
              title={`Jump to ${stageLabels[stage]}`}
            >
              <span className={cn("w-2 h-2 rounded-full shrink-0", isActive ? "bg-emerald-300" : color.circle)} />
              {stageLabels[stage]}
              <span
                className={cn(
                  "min-w-[18px] px-1 rounded-full text-[10px] font-bold text-center",
                  isActive ? "bg-white/20 text-white" : "bg-[#EBF7EC] text-[#036638]",
                )}
              >
                {counts[stage] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* Phone (< sm): native dropdown instead of the scrollable pill row —
          fixed width, it doesn't need to fill the row */}
      <div className="sm:hidden flex items-center gap-2 w-full min-w-0">
        <span className="text-xs font-semibold text-[#036638] shrink-0">Jump to</span>
        <div className="relative w-56 max-w-full shrink-0">
          <select
            value={activeStage ?? ""}
            onChange={(e) => {
              if (e.target.value) onJump(e.target.value)
            }}
            aria-label="Jump to stage"
            className="w-full h-9 appearance-none rounded-xl border border-[#E5E7EB] bg-white pl-3 pr-8 text-xs font-semibold text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/25 focus:border-[#036638]/50"
          >
            <option value="" disabled>
              Select stage…
            </option>
            {stageOrder.map((stage) => (
              <option key={stage} value={stage}>
                {stageLabels[stage]} ({counts[stage] ?? 0})
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
        </div>
      </div>
    </div>
  )
}
