"use client"

import { useState } from "react"
import {
  Calendar,
  Check,
  Clock,
  Flag,
  RotateCcw,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  EMPTY_BOARD_FILTERS,
  activeFilterCount,
  type BoardFilterMode,
  type BoardFilters,
} from "@/lib/board-filters"
import type { VaUser } from "@/types"

interface BoardFilterBarProps {
  /** Applied filters — what the board actually renders with. */
  filters: BoardFilters
  onChange: (filters: BoardFilters) => void
  /** VA list for the VA-wise filter (admin board only). VAs always see only their own cards. */
  vas?: VaUser[]
  /** Total patients in the unfiltered list — enables the "showing X of Y" line. */
  total?: number
  /** Count after filtering — enables the "showing X of Y" line. */
  resultCount?: number
}

const MODE_OPTIONS: Array<{
  value: BoardFilterMode
  label: string
  icon: typeof Users
  active: string
  hover: string
}> = [
  { value: "all", label: "All", icon: Users, active: "bg-[#036638] text-white shadow-sm", hover: "hover:text-[#036638]" },
  { value: "stale", label: "Stale", icon: Clock, active: "bg-amber-500 text-white shadow-sm", hover: "hover:text-amber-600" },
  { value: "flagged", label: "Flagged", icon: Flag, active: "bg-red-500 text-white shadow-sm", hover: "hover:text-red-600" },
]

// The delayed (Apply-gated) portion of BoardFilters — kept as a Pick so the
// draft shape can never drift from the applied filter shape.
type DateDraft = Pick<
  BoardFilters,
  "appointmentFrom" | "appointmentTo" | "createdFrom" | "createdTo" | "assignedTo"
>

export function BoardFilterBar({ filters, onChange, vas, total, resultCount }: BoardFilterBarProps) {
  // Draft values for the delayed filters (VA + dates) — they only reach the
  // board when "Apply" is clicked. Search and status apply instantly.
  const [draft, setDraft] = useState<DateDraft>({
    appointmentFrom: filters.appointmentFrom,
    appointmentTo: filters.appointmentTo,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    assignedTo: filters.assignedTo,
  })

  const patchDraft = (next: Partial<DateDraft>) => setDraft((prev) => ({ ...prev, ...next }))

  const draftDirty =
    draft.assignedTo !== filters.assignedTo ||
    draft.appointmentFrom !== filters.appointmentFrom ||
    draft.appointmentTo !== filters.appointmentTo ||
    draft.createdFrom !== filters.createdFrom ||
    draft.createdTo !== filters.createdTo

  const apptPending = draft.appointmentFrom !== filters.appointmentFrom || draft.appointmentTo !== filters.appointmentTo
  const createdPending = draft.createdFrom !== filters.createdFrom || draft.createdTo !== filters.createdTo
  const vaPending = draft.assignedTo !== filters.assignedTo

  const applyDraft = () => onChange({ ...filters, ...draft })

  const resetAll = () => {
    setDraft({ appointmentFrom: "", appointmentTo: "", createdFrom: "", createdTo: "", assignedTo: "" })
    onChange({ ...EMPTY_BOARD_FILTERS })
  }

  const activeCount = activeFilterCount(filters)
  const showCount = total !== undefined && resultCount !== undefined

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-3 py-2.5">
        {/* Search — instant */}
        <div className="relative w-full sm:w-56 sm:flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search by name..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] transition-shadow"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#6B7280] transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="hidden lg:block h-6 w-px bg-[#E5E7EB]" />

        {/* Status — instant */}
        <div className="flex items-center gap-1 rounded-lg bg-[#F3F4F6] p-1">
          {MODE_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const isActive = filters.mode === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onChange({ ...filters, mode: opt.value })}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap",
                  isActive ? opt.active : cn("text-[#6B7280]", opt.hover),
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* VA-wise filter — admin board only, applied on Apply */}
        {vas && (
          <>
            <div className="hidden lg:block h-6 w-px bg-[#E5E7EB]" />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1">
                <UserRound className="w-3 h-3 text-[#9CA3AF]" />
                <span className={cn("text-[10px] font-bold uppercase tracking-wider", vaPending ? "text-amber-600" : "text-[#6B7280]")}>
                  VA
                </span>
              </div>
              <select
                value={draft.assignedTo}
                onChange={(e) => patchDraft({ assignedTo: e.target.value })}
                className="w-36 px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] cursor-pointer"
              >
                <option value="">All VAs</option>
                {vas.map((va) => (
                  <option key={va.id} value={va.id}>
                    {va.name}
                  </option>
                ))}
              </select>
              {vaPending && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500" />}
            </div>
          </>
        )}

        <div className="hidden lg:block h-6 w-px bg-[#E5E7EB]" />

        {/* Date fields — inline, applied on Apply */}
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <InlineDateField
            label="Appointment Date"
            pending={apptPending}
            from={draft.appointmentFrom}
            to={draft.appointmentTo}
            onFrom={(v) => patchDraft({ appointmentFrom: v })}
            onTo={(v) => patchDraft({ appointmentTo: v })}
          />
          <InlineDateField
            label="Created Date"
            pending={createdPending}
            from={draft.createdFrom}
            to={draft.createdTo}
            onFrom={(v) => patchDraft({ createdFrom: v })}
            onTo={(v) => patchDraft({ createdTo: v })}
          />
        </div>

        {/* Apply — commits the draft VA + date filters */}
        {draftDirty && (
          <button
            onClick={applyDraft}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#036638] text-white rounded-lg hover:bg-[#025030] shadow-sm transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Apply
          </button>
        )}

        {/* Reset all */}
        {activeCount > 0 && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#6B7280] rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
            <span className="text-[10px] font-bold bg-[#F3F4F6] rounded-full w-4 h-4 flex items-center justify-center">
              {activeCount}
            </span>
          </button>
        )}

        {showCount && (
          <span className="ml-auto text-[11px] font-medium text-[#6B7280] hidden sm:inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#65BD6C]" />
            Showing {resultCount} of {total}
          </span>
        )}
      </div>
    </div>
  )
}

function InlineDateField({
  label,
  pending,
  from,
  to,
  onFrom,
  onTo,
}: {
  label: string
  pending: boolean
  from: string
  to: string
  onFrom: (value: string) => void
  onTo: (value: string) => void
}) {
  const isActive = Boolean(from || to)
  return (
    <div>
      <label
        className={cn(
          "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1.5 transition-colors",
          pending ? "text-amber-600" : isActive ? "text-[#036638]" : "text-[#6B7280]",
        )}
      >
        <Calendar className="w-3 h-3" />
        {label}
        {pending && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          className="w-36 px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638]"
        />
        <span className="text-[#9CA3AF] text-xs shrink-0">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          className="w-36 px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638]"
        />
      </div>
    </div>
  )
}
