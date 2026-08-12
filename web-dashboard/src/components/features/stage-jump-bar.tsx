"use client"

import { CornerDownRight } from "lucide-react"
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
 * Jump-to-stage control shared by the VA and admin boards. A compact leading
 * label chip plus a horizontally scrollable row of stage pills; each pill
 * carries its stage-color dot and live patient count so the whole pipeline
 * is scannable in one glance. The just-jumped pill lights up brand-green
 * while the column itself flashes via `animate-jump-flash`.
 */
export function StageJumpBar({ stageOrder, stageLabels, counts, activeStage, onJump }: StageJumpBarProps) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#036638]/5 border border-[#036638]/10 text-[#036638] shrink-0">
        <CornerDownRight className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold">Jump to</span>
      </div>
      {/* py-1/-my-1: keep a touch of vertical padding for focus rings while
          cancelling it out so the bar's height stays exactly one row. */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-1 -my-1">
        {stageOrder.map((stage) => {
          const color = getStageColor(stage)
          const isActive = activeStage === stage
          return (
            <button
              key={stage}
              onClick={() => onJump(stage)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
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
    </div>
  )
}
