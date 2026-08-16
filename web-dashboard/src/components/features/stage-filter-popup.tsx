"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DateRangePicker } from "@/components/features/date-range-picker"
import type { Patient } from "@/types"

interface StageFilterPopupProps {
  stage: string
  patients: Patient[]
  onFilterChange: (filtered: Patient[]) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

type SortOrder = "asc" | "desc" | null

export function StageFilterPopup({
  stage,
  patients,
  onFilterChange,
  isOpen,
  onOpenChange,
}: StageFilterPopupProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)
  const [searchName, setSearchName] = useState("")
  // "YYYY-MM-DD" pair — a single day is just a range where from === to, same
  // one-calendar pattern the board filter bar already uses (DateRangePicker),
  // rather than a separate single/range mode toggle.
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (popupRef.current && popupRef.current.contains(target)) return

      // The date picker (and its month/year dropdowns) render into a Radix
      // portal attached to <body>, not inside popupRef — so a click on a
      // calendar day is a DOM descendant of that portal, not of this popup,
      // and looks like an "outside" click even though it visually sits right
      // on top of the panel. That was closing the whole filter popup before
      // the day-select handler (or Apply) ever got to run. Every Radix
      // popper-based primitive (Popover, Select, DropdownMenu...) wraps its
      // portaled content in an element carrying this attribute, so treating
      // clicks inside it as "inside" covers the calendar and its selects.
      if (target instanceof Element && target.closest("[data-radix-popper-content-wrapper]")) {
        return
      }

      onOpenChange(false)
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onOpenChange])

  // Memoized filtering/sorting logic
  const filteredAndSorted = useMemo(() => {
    return patients
  }, [patients])

  const applyFilters = async () => {
    setIsLoading(true)

    // Simulate delay for UX
    await new Promise(resolve => setTimeout(resolve, 200))

    let result = [...filteredAndSorted]

    // Filter by search name
    if (searchName.trim()) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchName.toLowerCase())
      )
    }

    // Filter by date — from/to are always both set or both empty (a single
    // day is just a range where from === to), so one inclusive-range check
    // covers both cases.
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter(p => {
        const patientDate = new Date(p.appointmentDatetime || p.createdAt)
        return patientDate >= from && patientDate <= to
      })
    }

    // Sort by date
    if (sortOrder === "asc") {
      result.sort((a, b) => {
        const dateA = new Date(a.appointmentDatetime || a.createdAt).getTime()
        const dateB = new Date(b.appointmentDatetime || b.createdAt).getTime()
        return dateA - dateB
      })
    } else if (sortOrder === "desc") {
      result.sort((a, b) => {
        const dateA = new Date(a.appointmentDatetime || a.createdAt).getTime()
        const dateB = new Date(b.appointmentDatetime || b.createdAt).getTime()
        return dateB - dateA
      })
    }

    setIsLoading(false)
    onFilterChange(result)
    onOpenChange(false)
  }

  const resetFilters = async () => {
    setIsLoading(true)

    // Simulate delay with spinner for better UX
    await new Promise(resolve => setTimeout(resolve, 200))

    setSortOrder(null)
    setSearchName("")
    setDateFrom("")
    setDateTo("")
    setIsLoading(false)
    onFilterChange(patients)
    onOpenChange(false)
  }

  const hasActiveFilters = sortOrder || searchName || dateFrom || dateTo

  return (
    <>
      {isOpen && (
        <div
          ref={popupRef}
          className="absolute top-12 right-0 w-72 bg-white border border-[#E5E7EB] rounded-lg shadow-xl z-50"
        >
          {/* Popup Header */}
          <div className="px-4 py-3 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-bold text-[#1A1B1E]">Filter & Sort</h3>
            <p className="text-[11px] text-[#6B7280] mt-0.5">{stage}</p>
          </div>

          {/* Popup Body */}
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {/* Sort by Date */}
            <div>
              <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider block mb-2">
                Sort by Date
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortOrder(sortOrder === "asc" ? null : "asc")}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-all cursor-pointer",
                    sortOrder === "asc"
                      ? "bg-[#036638] text-white border-[#036638]"
                      : "bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#036638] hover:text-[#036638]",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Oldest First
                </button>
                <button
                  onClick={() => setSortOrder(sortOrder === "desc" ? null : "desc")}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-all cursor-pointer",
                    sortOrder === "desc"
                      ? "bg-[#036638] text-white border-[#036638]"
                      : "bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#036638] hover:text-[#036638]",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Newest First
                </button>
              </div>
            </div>

            {/* Search by Name */}
            <div>
              <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider block mb-2">
                Search by Name
              </label>
              <input
                type="text"
                placeholder="Enter patient name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Filter by Date — one calendar, click a single day or click two
                for a range (same picker the board filter bar uses). */}
            <div className="w-full flex flex-col ">
              <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider block mb-2">
                Filter by Date
              </label>
              <DateRangePicker
                label="Filter by date"
                pending={false}
                fullWidth
                from={dateFrom}
                to={dateTo}
                onFrom={setDateFrom}
                onTo={setDateTo}
              />
            </div>
          </div>

          {/* Popup Footer */}
          <div className="px-4 py-3 border-t border-[#E5E7EB] flex gap-2 bg-[#F9FAFB]">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-xs font-medium text-[#6B7280] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                {isLoading ? "Resetting..." : "Reset"}
              </button>
            )}
            <button
              onClick={applyFilters}
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-xs font-medium bg-[#036638] text-white rounded-lg hover:bg-[#025030] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              {isLoading ? "Applying..." : "Apply"}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
