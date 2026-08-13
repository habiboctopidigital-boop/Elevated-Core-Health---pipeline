"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DatePicker } from "@/components/ui/date-time-picker"
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
  const [specificDate, setSpecificDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onOpenChange(false)
      }
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

    // Filter by specific date if provided
    if (specificDate) {
      const targetDate = new Date(specificDate)
      result = result.filter(p => {
        const patientDate = new Date(p.appointmentDatetime || p.createdAt)
        return (
          patientDate.toDateString() === targetDate.toDateString()
        )
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
    setSpecificDate("")
    setIsLoading(false)
    onFilterChange(patients)
    onOpenChange(false)
  }

  const hasActiveFilters = sortOrder || searchName || specificDate

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

            {/* Filter by Specific Date */}
            <div>
              <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider block mb-2">
                Filter by Date
              </label>
              <DatePicker
                value={specificDate}
                onChange={(v) => setSpecificDate(v)}
                placeholder="Filter by date"
                disabled={isLoading}
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
