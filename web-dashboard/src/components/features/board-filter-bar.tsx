"use client"

import { useEffect, useRef, useState } from "react"
import {
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateRangePicker } from "@/components/features/date-range-picker"

interface BoardFilterBarProps {
  /** Applied filters — what the board actually renders with. */
  filters: BoardFilters
  onChange: (filters: BoardFilters) => void
  /** VA list for the VA-wise filter (admin board only). VAs always see only their own cards. */
  vas?: VaUser[]
  /** Render without the card chrome (border/bg/shadow) — for embedding inside a parent card. */
  bare?: boolean
}

const MODE_OPTIONS: Array<{
  value: BoardFilterMode
  label: string
  icon: typeof Users
  active: string
  hover: string
}> = [
  {
    value: "all",
    label: "All",
    icon: Users,
    active: "bg-gradient-to-r from-[#036638] to-emerald-600 text-white shadow-sm shadow-emerald-500/25",
    hover: "hover:text-[#036638]",
  },
  {
    value: "flagged",
    label: "Flagged",
    icon: Flag,
    active: "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm shadow-red-500/25",
    hover: "hover:text-red-600",
  },
]

// The delayed (Apply-gated) portion of BoardFilters — only the two date ranges
// wait for Apply now; search, status and VA apply instantly.
type DateDraft = Pick<BoardFilters, "appointmentFrom" | "appointmentTo" | "createdFrom" | "createdTo">

function pickDateDraft(filters: BoardFilters): DateDraft {
  return {
    appointmentFrom: filters.appointmentFrom,
    appointmentTo: filters.appointmentTo,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
  }
}

export function BoardFilterBar({ filters, onChange, vas, bare = false }: BoardFilterBarProps) {
  // Search starts collapsed to a small icon button — expands on click/typing,
  // collapses again when empty and blurred. Keeps the merged header compact.
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchBarRef = useRef<HTMLDivElement>(null)
  const searchExpanded = searchOpen || Boolean(filters.search)

  // Close the floating search when clicking anywhere outside it.
  useEffect(() => {
    if (!searchExpanded) return
    const onDocClick = (e: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [searchExpanded])

  // Draft values for the delayed date filters — they only reach the board
  // when "Apply" is clicked. Search, status and VA apply instantly.
  const [draft, setDraft] = useState<DateDraft>(() => pickDateDraft(filters))

  // Keep the draft in sync with externally-driven filter changes (e.g. a page
  // level reset) — but never clobber a pending, unapplied draft.
  useEffect(() => {
    setDraft((prev) => {
      const dirty =
        prev.appointmentFrom !== filters.appointmentFrom ||
        prev.appointmentTo !== filters.appointmentTo ||
        prev.createdFrom !== filters.createdFrom ||
        prev.createdTo !== filters.createdTo
      return dirty ? prev : pickDateDraft(filters)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.appointmentFrom, filters.appointmentTo, filters.createdFrom, filters.createdTo])

  const patchDraft = (next: Partial<DateDraft>) => setDraft((prev) => ({ ...prev, ...next }))

  const apptPending = draft.appointmentFrom !== filters.appointmentFrom || draft.appointmentTo !== filters.appointmentTo
  const createdPending = draft.createdFrom !== filters.createdFrom || draft.createdTo !== filters.createdTo
  const datesDirty = apptPending || createdPending

  const applyDraft = () => onChange({ ...filters, ...draft })

  const resetAll = () => {
    setDraft({ appointmentFrom: "", appointmentTo: "", createdFrom: "", createdTo: "" })
    onChange({ ...EMPTY_BOARD_FILTERS })
  }

  const activeCount = activeFilterCount(filters)

  return (
    <div className={cn("relative", bare ? "" : "rounded-2xl border border-[#EDEFF2] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)]")}>
      <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-3", bare ? "px-0 py-0" : "px-4 py-3")}>
        {/* - Search — round icon button; expanded input floats absolutely so the row never shifts - */}
        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          className={cn(
            "w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer",
            searchExpanded
              ? "bg-[#036638] text-white shadow-sm shadow-emerald-500/30"
              : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#EBF7EC] hover:text-[#036638] hover:ring-2 hover:ring-[#036638]/15",
          )}
          title={searchExpanded ? "Close search" : "Search patients"}
          aria-label={searchExpanded ? "Close search" : "Search patients"}
          aria-expanded={searchExpanded}
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Expanded search — absolutely positioned, overlays content, breaks nothing */}
        {searchExpanded && (
          <div ref={searchBarRef} className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(360px,calc(100vw-3rem))]">
            <div className="flex items-center gap-2 pl-3.5 pr-2 h-11 rounded-full border border-[#036638]/25 bg-white shadow-xl shadow-emerald-900/10 focus-within:ring-2 focus-within:ring-[#036638]/25">
              <Search className="w-4 h-4 text-[#036638] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={filters.search}
                autoFocus
                onChange={(e) => onChange({ ...filters, search: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearchOpen(false)
                }}
                placeholder="Search patient name..."
                className="flex-1 min-w-0 bg-transparent text-sm text-[#1A1B1E] placeholder:text-[#9CA3AF] focus:outline-none"
              />
              {filters.search ? (
                <button
                  onClick={() => onChange({ ...filters, search: "" })}
                  className="p-1.5 rounded-full text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#6B7280] transition-colors cursor-pointer shrink-0"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-1.5 rounded-full text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#6B7280] transition-colors cursor-pointer shrink-0"
                  title="Close search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="hidden xl:block h-6 w-px bg-[#E5E7EB]" />

        {/* - Status segmented — instant - */}
        <div className="flex items-center gap-0.5 rounded-full bg-[#F3FAF4] border border-[#E5E7EB]/60 p-1">
          {MODE_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const isActive = filters.mode === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onChange({ ...filters, mode: opt.value })}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap",
                  isActive ? opt.active : cn("text-[#6B7280]", opt.hover),
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* - VA filter — admin board only, instant - */}
        {vas && (
          <div className="flex items-center gap-2">
            {/* Radix Select disallows empty-string item values, so "all" is a
                sentinel mapped to assignedTo="" in onChange. */}
            <Select
              value={filters.assignedTo || "all"}
              onValueChange={(v) =>
                onChange({ ...filters, assignedTo: v === "all" ? "" : v })
              }
            >
              <SelectTrigger
                className="w-[150px] h-10 rounded-xl border-[#E5E7EB] bg-[#F8FAF9] text-xs font-semibold text-[#1A1B1E] shadow-none focus:ring-2 focus:ring-[#036638]/25"
                title="Filter by assigned VA"
              >
                <UserRound className="w-3.5 h-3.5 text-[#036638] shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg">
                <SelectItem value="all" className="text-xs cursor-pointer">
                  All VAs
                </SelectItem>
                {vas.map((va) => (
                  <SelectItem key={va.id} value={va.id} className="text-xs cursor-pointer">
                    {va.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="hidden xl:block h-6 w-px bg-[#E5E7EB]" />

        {/* - Date ranges — Apply-gated - */}
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            label="Appointment"
            pending={apptPending}
            from={draft.appointmentFrom}
            to={draft.appointmentTo}
            onFrom={(v) => patchDraft({ appointmentFrom: v })}
            onTo={(v) => patchDraft({ appointmentTo: v })}
          />
          <DateRangePicker
            label="Created"
            pending={createdPending}
            from={draft.createdFrom}
            to={draft.createdTo}
            onFrom={(v) => patchDraft({ createdFrom: v })}
            onTo={(v) => patchDraft({ createdTo: v })}
          />
        </div>

        {/* - Apply — commits the pending date ranges only - */}
        {datesDirty && (
          <button
            onClick={applyDraft}
            className="flex items-center gap-1.5 h-10 px-4 text-xs font-bold bg-gradient-to-r from-[#036638] to-emerald-600 text-white rounded-xl hover:from-[#025030] hover:to-emerald-700 shadow-sm shadow-emerald-500/30 transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Apply
          </button>
        )}

        {/* - Reset all - */}
        {activeCount > 0 && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 h-10 px-3 text-xs font-semibold text-[#6B7280] rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer whitespace-nowrap"
            title="Clear all filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
            <span className="text-[10px] font-bold bg-[#F3F4F6] rounded-full w-5 h-5 flex items-center justify-center">
              {activeCount}
            </span>
          </button>
        )}

      </div>
    </div>
  )
}
