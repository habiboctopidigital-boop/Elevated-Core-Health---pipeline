"use client"

import { useState, useMemo } from "react"
import { usePatients, useMoveStage } from "@/hooks/query/usePatients"
import { PatientCard } from "@/components/features/patient-card"
import { PatientModal } from "@/components/features/patient-modal"
import { StatusBar } from "@/components/features/status-bar"
import { ImportDialog } from "@/components/features/import-dialog"
import { AddPatientDialog } from "@/components/features/add-patient-dialog"
import { StageFilterPopup } from "@/components/features/stage-filter-popup"
import { useStageMeta } from "@/hooks/query/useStages"
import type { Patient, PatientStage } from "@/types"
import { Loader2, ShieldCheck, Search, X, AlertTriangle, RefreshCw, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

export default function AdminBoardPage() {
  const { data: patients, isLoading, error, refetch } = usePatients()
  const moveStage = useMoveStage()
  const { order: stageOrder, labels: stageLabels, hints: stageHints } = useStageMeta()
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStageFilter, setSelectedStageFilter] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<"all" | "stale" | "flagged">("all")
  const [stageFilters, setStageFilters] = useState<Record<string, Patient[]>>({})
  const [openStageFilterPopup, setOpenStageFilterPopup] = useState<string | null>(null)

  // Filter patients by search query, stage, and status
  const filteredPatients = useMemo(() => {
    if (!patients) return []

    return patients.filter((p) => {
      const matchesSearch = searchQuery === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStage = selectedStageFilter === null || p.stage === selectedStageFilter

      // Calculate stale status
      const isFinal = p.stage === "reconciled"
      const isStale = !isFinal && (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60) > 48

      let matchesFilter = true
      if (filterMode === "stale") matchesFilter = isStale
      if (filterMode === "flagged") matchesFilter = p.isFlagged

      return matchesSearch && matchesStage && matchesFilter
    })
  }, [patients, searchQuery, selectedStageFilter, filterMode])

  const groupedPatients = useMemo(() => {
    let result = filteredPatients.reduce(
      (acc, p) => {
        if (!acc[p.stage]) acc[p.stage] = []
        acc[p.stage].push(p)
        return acc
      },
      {} as Record<string, Patient[]>,
    )

    // Apply per-stage filters if they exist
    if (Object.keys(stageFilters).length > 0) {
      Object.keys(result).forEach(stage => {
        if (stageFilters[stage]) {
          result[stage] = stageFilters[stage]
        }
      })
    }

    return result || {}
  }, [filteredPatients, stageFilters])

  const handleMoveStage = (id: string, target: PatientStage) => {
    moveStage.mutate({ id, targetStage: target })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#036638] animate-spin" />
      </div>
    )
  }

  // Only replace the whole page with an error state when we have nothing to
  // fall back on. A background refetch (e.g. right after Add Patient or a
  // bulk import invalidates the cache) can transiently fail without losing
  // the data we already have — in that case keep the board rendered with its
  // last-known-good patients instead of wiping every stage to a blank error
  // screen (this mirrors the same fix already applied to the shared
  // KanbanBoard used by the VA board).
  if (error && !patients) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#1A1B1E]">Unable to load the board</p>
          <p className="text-xs text-[#6B7280] mt-1">
            {(error as any)?.response?.data?.message || "Connection issue - please try again"}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#036638] text-white text-sm font-semibold hover:bg-[#025030] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stale-data banner — a background refetch failed but we're still showing the last good board */}
      {error && patients && (
        <div className="mb-3 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs font-medium text-amber-800">
          Couldn&apos;t refresh the board just now — showing the last loaded data. It&apos;ll retry automatically.
        </div>
      )}

      {/* - Board Header - */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#036638]/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#036638]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-[#1A1B1E] truncate">Admin Pipeline Board</h1>
            <p className="text-xs text-[#6B7280] truncate">Full oversight - manage all patient stages</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AddPatientDialog />
          <ImportDialog />
        </div>
      </div>

      {/* - Search & Filter Bar - */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 pb-3 border-b border-[#E5E7EB]">
        {/* Priority Filters */}
        <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
          <button
            onClick={() => setFilterMode("all")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
              filterMode === "all"
                ? "bg-[#036638] text-white shadow-sm"
                : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#036638] hover:text-[#036638]"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilterMode("stale")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
              filterMode === "stale"
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-amber-500 hover:text-amber-500"
            )}
          >
            Stale
          </button>
          <button
            onClick={() => setFilterMode("flagged")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
              filterMode === "flagged"
                ? "bg-red-500 text-white shadow-sm"
                : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-red-500 hover:text-red-500"
            )}
          >
            Flagged
          </button>
        </div>

        {/* Stage Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
          <button
            onClick={() => setSelectedStageFilter(null)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
              selectedStageFilter === null
                ? "bg-[#036638] text-white shadow-sm"
                : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#036638] hover:text-[#036638]"
            )}
          >
            All Stages
          </button>
          {stageOrder.slice(0, 3).map((stage) => (
            <button
              key={stage}
              onClick={() => setSelectedStageFilter(stage)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
                selectedStageFilter === stage
                  ? "bg-[#036638] text-white shadow-sm"
                  : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#036638] hover:text-[#036638]"
              )}
              title={stageLabels[stage]}
            >
              {stageLabels[stage]}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#F3F4F6] rounded"
            >
              <X className="w-4 h-4 text-[#9CA3AF]" />
            </button>
          )}
        </div>
      </div>

      {/* - Kanban Board - */}
      <div className="sm:h-[calc(100vh-12rem)] sm:-mx-6 sm:-mb-6 sm:overflow-x-auto">
        <div className="flex sm:inline-flex flex-col sm:flex-row h-auto sm:h-full gap-3 p-0 sm:p-6 sm:min-w-max">
          {stageOrder.map((stage) => {
            const stagePatients = groupedPatients[stage] || []
            return (
              <div
                key={stage}
                className="w-full sm:w-72 flex flex-col bg-[#EBF7EC]/40 rounded-xl border border-[#E5E7EB]/50 sm:shrink-0"
              >
                <div className="px-3.5 py-3 border-b border-[#E5E7EB]/50 relative">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-[#036638] truncate">
                        {stageLabels[stage]}
                      </h3>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">
                        {stageHints[stage]}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setOpenStageFilterPopup(openStageFilterPopup === stage ? null : stage)}
                        className={cn(
                          "p-1.5 rounded-lg transition-all cursor-pointer",
                          openStageFilterPopup === stage
                            ? "bg-[#036638]/15 text-[#036638]"
                            : "text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#6B7280]"
                        )}
                        title="Filter and sort"
                      >
                        <Filter className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold text-[#6B7280] bg-white rounded-full w-5 h-5 flex items-center justify-center border border-[#E5E7EB]">
                        {stagePatients.length}
                      </span>
                    </div>
                  </div>

                  {/* Stage Filter Popup */}
                  <StageFilterPopup
                    stage={stageLabels[stage]}
                    patients={filteredPatients.filter(p => p.stage === stage)}
                    onFilterChange={(filtered) => {
                      setStageFilters(prev => ({
                        ...prev,
                        [stage]: filtered
                      }))
                    }}
                    isOpen={openStageFilterPopup === stage}
                    onOpenChange={(open) => {
                      if (!open) setOpenStageFilterPopup(null)
                    }}
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {stagePatients.length > 0 ? (
                    stagePatients.map((patient) => (
                      <PatientCard
                        key={patient.id}
                        patient={patient}
                        onMoveStage={handleMoveStage}
                        onClick={(p) => setSelectedPatientId(p.id)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-xs text-[#6B7280] italic">No patients</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <PatientModal
          patientId={selectedPatientId}
          open={!!selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      </div>
    </div>
  )
}
