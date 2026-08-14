"use client"

import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { BoardFilterBar } from "@/components/features/board-filter-bar"
import type { BoardFilters } from "@/lib/board-filters"
import type { VaUser } from "@/types"

interface BoardHeaderBarProps {
  /* ---- Compact header row ---- */
  icon?: LucideIcon
  actions?: ReactNode

  /* ---- BoardFilterBar props ---- */
  filters: BoardFilters
  onChange: (filters: BoardFilters) => void
  vas?: VaUser[]
}

/**
 * Merged board header + global filter bar in a single card.
 *
 * Desktop (sm+): one line — icon · filter controls · action buttons pinned
 * right. The patient count and the list/grid view toggle live in a slim
 * toolbar above the board (BoardViewToolbar), not in this header.
 *
 * Phone (< sm): two stacked lines so nothing gets squeezed out — the filter
 * bar gets the full width on top (it scrolls horizontally within its own
 * row), and the action buttons sit on their own line below (wrapping if they
 * don't fit). The decorative header icon is hidden on phones to save space.
 */
export function BoardHeaderBar({
  icon: Icon,
  actions,
  filters,
  onChange,
  vas,
}: BoardHeaderBarProps) {
  return (
    <div className="rounded-2xl border border-[#EDEFF2] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] px-3 py-3 sm:px-4">
      {/* Phone: two stacked lines — filters on top, actions below. sm+: one
          line with the icon, filters, and the actions pinned right. */}
      <div className="flex flex-col gap-y-2 sm:flex-row sm:items-center sm:gap-x-2.5">
        {/* Header icon — hidden on phone to give the filters room */}
        {Icon && (
          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-gradient-sunrise items-center justify-center shrink-0 shadow-[var(--shadow-sm)] ring-1 ring-[#036638]/10">
            <Icon className="w-4 h-4 text-[#036638]" strokeWidth={2} />
          </div>
        )}

        {/* Filter controls — full width on phone so they're always visible;
            scrolls horizontally inside its own row when they don't fit. */}
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <BoardFilterBar
            filters={filters}
            onChange={onChange}
            vas={vas}
            bare
          />
        </div>

        {/* Action buttons — their own line on phone (wrap if needed), pinned
            right on sm+ */}
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:ml-auto sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
