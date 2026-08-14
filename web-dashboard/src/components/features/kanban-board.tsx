"use client"

import { useState, useCallback, useRef } from "react"
import { usePatients, useMoveStage } from "@/hooks/query/usePatients"
import { PatientCard } from "@/components/features/patient-card"
import { PatientModal } from "@/components/features/patient-modal"
import { PatientListView } from "@/components/features/patient-list-view"
import { StageFilterPopup } from "@/components/features/stage-filter-popup"
import { useStageMeta } from "@/hooks/query/useStages"
import { useStageJump } from "@/hooks/useStageJump"
import { filterPatients, type BoardFilters } from "@/lib/board-filters"
import type { Patient, PatientStage } from "@/types"
import { CheckCircle2, ChevronDown, Filter, GripVertical, Loader2, SearchX } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useMemo } from "react"

export function KanbanBoard({
  initialPatientId,
  filters,
  view = "grid",
}: {
  initialPatientId?: string
  filters: BoardFilters
  /** "grid" = kanban columns, "list" = compact vertical list (phone default). */
  view: "grid" | "list"
}) {
  const { data: patients, isLoading, error } = usePatients()
  const moveStage = useMoveStage()
  const { order: stageOrder, labels: stageLabels, hints: stageHints, byKey: stageByKey } = useStageMeta()
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId ?? null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [stageFilters, setStageFilters] = useState<Record<string, Patient[]>>({})
  // Stages whose filter matched 0 — the column keeps its cards and the error
  // is shown only in the stage header.
  const [filterNotFound, setFilterNotFound] = useState<Record<string, boolean>>({})
  const [openStageFilterPopup, setOpenStageFilterPopup] = useState<string | null>(null)
  const pendingMoves = useRef<Set<string>>(new Set())
  const { activeStage: quickJumpStage, jump: handleQuickJump, registerStageRef } = useStageJump()

  // Global filters from the board filter bar — applied across every stage column
  const filteredPatients = useMemo(() => {
    if (!patients) return []
    return filterPatients(patients, filters)
  }, [patients, filters])

  const groupedPatients = useMemo(() => {
    const result = filteredPatients.reduce(
      (acc, p) => {
        if (!acc[p.stage]) acc[p.stage] = []
        acc[p.stage].push(p)
        return acc
      },
      {} as Record<string, Patient[]>,
    )

    // Apply per-stage filters if they exist (mirrors the admin board). The
    // snapshot is intersected with the live stage patients so a card that has
    // since been moved/deleted (e.g. via drag-and-drop) can't ghost in the
    // filtered column and render in two stages at once. A filter that matched
    // nothing is skipped — the stage keeps its cards and the error shows in
    // the header instead.
    if (Object.keys(stageFilters).length > 0) {
      Object.keys(result).forEach((stage) => {
        if (stageFilters[stage] && !filterNotFound[stage]) {
          result[stage] = stageFilters[stage].filter((p) =>
            filteredPatients.some((live) => live.id === p.id),
          )
        }
      })
    }

    return result
  }, [filteredPatients, stageFilters, filterNotFound])

  const handleDragStart = useCallback((e: React.DragEvent, patientId: string) => {
    setDraggingId(patientId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", patientId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingId(null)
    setDropTarget(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, stage: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDropTarget(stage)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent, stage: string) => {
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget((prev) => (prev === stage ? null : prev))
    }
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetStage: string) => {
      e.preventDefault()
      const patientId = e.dataTransfer.getData("text/plain")
      if (!patientId) return

      setDropTarget(null)
      setDraggingId(null)

      if (pendingMoves.current.has(patientId)) return

      const patient = patients?.find((p) => p.id === patientId)
      if (!patient) return

      const curIdx = stageOrder.indexOf(patient.stage)
      const tgtIdx = stageOrder.indexOf(targetStage as PatientStage)
      if (curIdx === tgtIdx) return

      if (tgtIdx > curIdx + 1) {
        toast.error("Cannot skip stages. Move forward one stage at a time.")
        return
      }

      if (tgtIdx > curIdx) {
        const stageState = patient.checklistState?.[patient.stage] ?? {}
        const defs = await fetchChecklistDefs(patient.stage)
        // Only REQUIRED items gate forward moves (matches the server)
        const requiredDefs = defs.filter((item: any) => item.status === "required")
        const allComplete = requiredDefs.every((item: any) => stageState[item.id] === true)
        if (!allComplete) {
          toast.error("Please complete all required checklist items before moving to the next stage.")
          return
        }
      }

      pendingMoves.current.add(patientId)
      try {
        await moveStage.mutateAsync({ id: patientId, targetStage: targetStage as PatientStage })
      } finally {
        pendingMoves.current.delete(patientId)
      }
    },
    [patients, moveStage, stageOrder],
  )

  const handleMoveStage = useCallback(
    (id: string, target: PatientStage) => {
      if (pendingMoves.current.has(id)) return
      pendingMoves.current.add(id)
      moveStage.mutate(
        { id, targetStage: target },
        { onSettled: () => pendingMoves.current.delete(id) },
      )
    },
    [moveStage],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#036638] animate-spin" />
      </div>
    )
  }

  // Only replace the whole board with an error state when we have nothing to
  // fall back on. A background refetch (e.g. right after a mutation invalidates
  // the cache) can transiently fail without losing the data we already have —
  // in that case keep the board rendered with its last-known-good patients
  // instead of blanking every stage to empty.
  if (error && !patients) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-500">Failed to load patients</p>
      </div>
    )
  }

  return (
    <>
      {/* Stale-data banner — a background refetch failed but we're still showing the last good board */}
      {error && patients && (
        <div className="mb-3 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs font-medium text-amber-800">
          Couldn&apos;t refresh the board just now - showing the last loaded data. It&apos;ll retry automatically.
        </div>
      )}

      {/* Quick Jump Selector — scrollable pills on sm+; on phones it collapses
          to a native dropdown so it can never squeeze or clip. */}
      <div className="mb-4 flex items-center gap-2 w-full min-w-0">
        <span className="hidden sm:inline text-sm font-medium text-[#6B7280] shrink-0">Jump to stage:</span>
        <div className="hidden sm:flex gap-2 overflow-x-auto scrollbar-thin py-1 -my-1 flex-1 min-w-0">
          {stageOrder.map((stage) => (
            <button
              key={stage}
              onClick={() => handleQuickJump(stage)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer whitespace-nowrap shrink-0",
                quickJumpStage === stage
                  ? "bg-[#036638] text-white border-[#036638] shadow-md"
                  : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#036638] hover:text-[#036638]"
              )}
            >
              {stageLabels[stage]}
            </button>
          ))}
        </div>

        {/* Phone (< sm): native dropdown instead of the scrollable pill row —
            fixed width, it doesn't need to fill the row */}
        <div className="sm:hidden flex items-center gap-2 w-full min-w-0">
          <span className="text-sm font-medium text-[#6B7280] shrink-0">Jump to stage:</span>
          <div className="relative w-56 max-w-full shrink-0">
            <select
              value={quickJumpStage ?? ""}
              onChange={(e) => {
                if (e.target.value) handleQuickJump(e.target.value)
              }}
              aria-label="Jump to stage"
              className="w-full h-9 appearance-none rounded-xl border border-[#E5E7EB] bg-white pl-3 pr-8 text-xs font-semibold text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/25 focus:border-[#036638]/50"
            >
              <option value="" disabled>
                Select stage…
              </option>
              {stageOrder.map((stage) => (
                <option key={stage} value={stage}>
                  {stageLabels[stage]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          </div>
        </div>
      </div>

      {/* Grid view: stages as side-by-side columns (stacks vertically on
          phone). List view: one compact vertical list of all stages. */}
      {view === "grid" ? (
      <div className="flex-1 min-h-0 overflow-x-hidden sm:overflow-x-auto sm:snap-x sm:snap-mandatory scrollbar-thin ">
        <div className="flex flex-col sm:flex-row h-auto lg:h-full gap-3 sm:gap-4 p-0 sm:p-5 w-full sm:min-w-max ">
          {stageOrder.map((stage) => {
            const stagePatients = groupedPatients[stage] || []
            const isOver = dropTarget === stage
            const isDisabled = stageByKey.get(stage)?.isFinal ?? false
            // Per-stage filter state — active means the popup's Apply was
            // pressed. A 0-match filter keeps the stage's cards and shows the
            // error only in the header.
            const stageFilterActive = Object.prototype.hasOwnProperty.call(stageFilters, stage)
            const filterHasNoResults = stageFilterActive && filterNotFound[stage] === true
            const matchedCount = stageFilterActive && !filterHasNoResults ? stagePatients.length : null
            return (
              <div
                key={stage}
                ref={registerStageRef(stage)}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={(e) => handleDragLeave(e, stage)}
                onDrop={(e) => handleDrop(e, stage)}
                className={cn(
                  "w-full min-w-0 sm:w-[450px] sm:shrink-0 sm:snap-center flex flex-col bg-[#EBF7EC]/40 rounded-xl border border-[#E5E7EB]/50",
                  // Brief self-fading flash (animate-jump-flash clears on its own)
quickJumpStage === stage && "animate-jump-flash",
                  isOver && !isDisabled
                    ? "border-[#65BD6C] bg-[#EBF7EC] shadow-lg shadow-[#65BD6C]/10 sm:scale-[1.02]"
                    : "border-[#E5E7EB]/50 bg-[#EBF7EC]/40",
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
                      {filterHasNoResults ? (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-red-50 text-[10px] font-bold text-red-500">
                          <SearchX className="w-3 h-3" />
                          Search result 0
                        </span>
                      ) : stageFilterActive && (matchedCount ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-[#EBF7EC] text-[10px] font-bold text-[#036638]">
                          <CheckCircle2 className="w-3 h-3" />
                          {matchedCount} item{matchedCount === 1 ? "" : "s"} found
                        </span>
                      ) : null}
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
                      setFilterNotFound(prev => ({
                        ...prev,
                        [stage]: filtered.length === 0
                      }))
                    }}
                    isOpen={openStageFilterPopup === stage}
                    onOpenChange={(open) => {
                      if (!open) setOpenStageFilterPopup(null)
                    }}
                  />
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-brand p-3 space-y-2.5">
                  {stagePatients.length > 0 ? (
                    stagePatients.map((patient) => {
                      const isPending = pendingMoves.current.has(patient.id)
                      const isDragging = draggingId === patient.id
                      return (
                        <div key={patient.id} className="relative group w-full">
                          {isPending && (
                            <div className="absolute inset-0 z-10 bg-white/70 rounded-lg flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-[#036638] animate-spin" />
                            </div>
                          )}
                          <PatientCard
                            patient={patient}
                            onMoveStage={handleMoveStage}
                            onClick={(p) => setSelectedPatientId(p.id)}
                            isDragging={isDragging}
                            onDragStart={(e) => handleDragStart(e, patient.id)}
                            onDragEnd={handleDragEnd}
                          />
                        </div>
                      )
                    })
                  ) : (
                    <div
                      className={cn(
                        "text-center py-8 rounded-lg border-2 border-dashed transition-colors",
                        isOver && !isDisabled
                          ? "border-[#65BD6C] bg-[#EBF7EC]"
                          : "border-transparent",
                      )}
                    >
                      {isOver && !isDisabled ? (
                        <p className="text-xs text-[#036638] font-medium flex items-center justify-center gap-1.5">
                          <GripVertical className="w-3.5 h-3.5" />
                          Drop here
                        </p>
                      ) : (
                        <p className="text-xs text-[#6B7280] italic">No patients</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      ) : (
        <PatientListView
          patients={filteredPatients}
          stageOrder={stageOrder}
          stageLabels={stageLabels}
          onMoveStage={handleMoveStage}
          onSelect={(p) => setSelectedPatientId(p.id)}
          pendingIds={pendingMoves.current}
          registerStageRef={registerStageRef}
        />
      )}

      <PatientModal
        patientId={selectedPatientId}
        open={!!selectedPatientId}
        onClose={() => setSelectedPatientId(null)}
      />
    </>
  )
}

let cachedDefs: Record<string, any[]> | null = null

async function fetchChecklistDefs(stage: string) {
  if (cachedDefs) {
    const stageDefs = cachedDefs[stage]
    if (stageDefs) return stageDefs
  }
  try {
    const { PatientsService } = await import("@/services/patients.service")
    const all = await PatientsService.getChecklistItems()
    const grouped: Record<string, any[]> = {}
    for (const item of all) {
      if (!grouped[item.stage]) grouped[item.stage] = []
      grouped[item.stage].push(item)
    }
    cachedDefs = grouped
    return grouped[stage] || []
  } catch {
    return []
  }
}
