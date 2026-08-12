"use client"

import { useState, useMemo } from "react"
import { usePatients, useMoveStage, useListVas } from "@/hooks/query/usePatients"
import { PatientCard } from "@/components/features/patient-card"
import { PatientModal } from "@/components/features/patient-modal"
import { ImportDialog } from "@/components/features/import-dialog"
import { AddPatientDialog } from "@/components/features/add-patient-dialog"
import { StageFilterPopup } from "@/components/features/stage-filter-popup"
import { StageJumpBar } from "@/components/features/stage-jump-bar"
import { BoardFilterBar } from "@/components/features/board-filter-bar"
import { useStageMeta } from "@/hooks/query/useStages"
import { useStageJump } from "@/hooks/useStageJump"
import { EMPTY_BOARD_FILTERS, filterPatients, type BoardFilters } from "@/lib/board-filters"
import type { Patient, PatientStage } from "@/types"
import { Loader2, ShieldCheck, AlertTriangle, RefreshCw, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

export default function AdminBoardPage() {
  const { data: patients, isLoading, error, refetch } = usePatients()
  const { data: vas } = useListVas()
  const moveStage = useMoveStage()
  const { order: stageOrder, labels: stageLabels, hints: stageHints } = useStageMeta()
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_BOARD_FILTERS)
  const [stageFilters, setStageFilters] = useState<Record<string, Patient[]>>({})
  const [openStageFilterPopup, setOpenStageFilterPopup] = useState<string | null>(null)
  const { activeStage: quickJumpStage, jump: handleQuickJump, registerStageRef } = useStageJump()

  // Global filters from the board filter bar — applied across every stage column
  const filteredPatients = useMemo(() => {
    if (!patients) return []
    return filterPatients(patients, filters)
  }, [patients, filters])

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

  // Live patient count per stage — feeds the jump-bar pills.
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const stage of stageOrder) {
      counts[stage] = groupedPatients[stage]?.length ?? 0
    }
    return counts
  }, [groupedPatients, stageOrder])

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
          Couldn&apos;t refresh the board just now - showing the last loaded data. It&apos;ll retry automatically.
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

      {/* - Global Filter Bar (search, status, date ranges — applies to all stages) - */}
      <div className="mb-4">
        <BoardFilterBar
          filters={filters}
          onChange={setFilters}
          vas={vas}
          total={patients?.length ?? 0}
          resultCount={filteredPatients.length}
        />
      </div>

      {/* - Jump-to-stage bar - */}
      <StageJumpBar
        stageOrder={stageOrder}
        stageLabels={stageLabels}
        counts={stageCounts}
        activeStage={quickJumpStage}
        onJump={handleQuickJump}
      />

      {/* - Kanban Board - */}
      <div className="sm:h-[calc(100vh-12rem)] sm:-mx-6 sm:-mb-6 sm:overflow-x-auto sm:snap-x sm:snap-mandatory scrollbar-thin">
        <div className="flex sm:inline-flex flex-col sm:flex-row h-auto sm:h-full gap-4 p-0 sm:p-6 sm:min-w-max">
          {stageOrder.map((stage) => {
            const stagePatients = groupedPatients[stage] || []
            return (
              <div
                key={stage}
                ref={registerStageRef(stage)}
                className={cn(
                  "w-full sm:w-[420px] sm:shrink-0 sm:snap-center flex flex-col bg-[#EBF7EC]/40 rounded-xl border border-[#E5E7EB]/50 transition-all duration-200",
                  quickJumpStage === stage && "animate-jump-flash",
                )}
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
