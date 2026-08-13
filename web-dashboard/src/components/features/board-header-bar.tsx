"use client"

import { SlidersHorizontal } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { BoardFilterBar } from "@/components/features/board-filter-bar"
import type { BoardFilters } from "@/lib/board-filters"
import type { VaUser } from "@/types"

interface BoardHeaderBarProps {
  /* ---- Compact header row ---- */
  icon?: LucideIcon
  count?: ReactNode
  actions?: ReactNode

  /* ---- BoardFilterBar props ---- */
  filters: BoardFilters
  onChange: (filters: BoardFilters) => void
  vas?: VaUser[]
  total?: number
  resultCount?: number
}

/**
 * Merged board header + global filter bar in a single card — everything flows
 * on one line (wrapping on narrow screens). No page title text; just the icon,
 * patient count, filter controls and action buttons. All functionality intact.
 */
export function BoardHeaderBar({
  icon: Icon,
  count,
  actions,
  filters,
  onChange,
  vas,
  total,
  resultCount,
}: BoardHeaderBarProps) {
  const showCount = total !== undefined && resultCount !== undefined

  return (
    <div className="rounded-2xl border border-[#EDEFF2] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        {/* Icon */}
        {Icon && (
          <div className="w-10 h-10 rounded-2xl bg-gradient-sunrise flex items-center justify-center shrink-0 shadow-[var(--shadow-sm)] ring-1 ring-[#036638]/10">
            <Icon className="w-5 h-5 text-[#036638]" strokeWidth={2} />
          </div>
        )}

        {/* Count chip */}
        {count}

        {/* Vertical divider before the filter controls */}
        <div className="hidden xl:block h-6 w-px bg-[#E5E7EB]" />

        {/* Filter bar — inline, no card chrome */}
        <div className="flex-1 min-w-[280px]">
          <BoardFilterBar
            filters={filters}
            onChange={onChange}
            vas={vas}
            bare
          />
        </div>

        {/* Right cluster: result count + actions — fixed place, never shifts */}
        {(showCount || actions) && (
          <div className="flex items-center gap-3 flex-wrap shrink-0 ml-auto">
            {showCount && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-[#6B7280] whitespace-nowrap">
                <SlidersHorizontal className="w-3 h-3 text-[#65BD6C]" />
                Showing <span className="font-bold text-[#036638]">{resultCount}</span> of {total}
              </span>
            )}
            {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
