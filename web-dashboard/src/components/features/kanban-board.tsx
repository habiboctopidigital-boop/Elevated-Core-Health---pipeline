"use client"

import { useState, useCallback, useRef } from "react"
import { usePatients, useMoveStage } from "@/hooks/query/usePatients"
import { PatientCard } from "@/components/features/patient-card"
import { PatientModal } from "@/components/features/patient-modal"
import { useStageMeta } from "@/hooks/query/useStages"
import type { Patient, PatientStage } from "@/types"
import { Loader2, GripVertical } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useMemo } from "react"

export function KanbanBoard({
  initialPatientId,
  searchQuery = "",
  stageFilter = null,
}: {
  initialPatientId?: string
  searchQuery?: string
  stageFilter?: string | null
}) {
  const { data: patients, isLoading, error } = usePatients()
  const moveStage = useMoveStage()
  const { order: stageOrder, labels: stageLabels, hints: stageHints, byKey: stageByKey } = useStageMeta()
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId ?? null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [quickJumpStage, setQuickJumpStage] = useState<string | null>(null)
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const pendingMoves = useRef<Set<string>>(new Set())

  // Filter patients by search query and stage
  const filteredPatients = useMemo(() => {
    if (!patients) return []

    return patients.filter((p) => {
      const matchesSearch = searchQuery === "" || p.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStage = stageFilter === null || p.stage === stageFilter

      return matchesSearch && matchesStage
    })
  }, [patients, searchQuery, stageFilter])

  const groupedPatients =
    filteredPatients.reduce(
      (acc, p) => {
        if (!acc[p.stage]) acc[p.stage] = []
        acc[p.stage].push(p)
        return acc
      },
      {} as Record<string, Patient[]>,
    ) || {}

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

  const handleQuickJump = (stage: string) => {
    setQuickJumpStage(stage)
    setTimeout(() => {
      stageRefs.current[stage]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }, 0)
  }

  return (
    <>
      {/* Stale-data banner — a background refetch failed but we're still showing the last good board */}
      {error && patients && (
        <div className="mb-3 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs font-medium text-amber-800">
          Couldn&apos;t refresh the board just now — showing the last loaded data. It&apos;ll retry automatically.
        </div>
      )}

      {/* Quick Jump Selector */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-[#6B7280]">Jump to stage:</span>
        <div className="flex gap-2 flex-wrap">
          {stageOrder.map((stage) => (
            <button
              key={stage}
              onClick={() => handleQuickJump(stage)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer",
                quickJumpStage === stage
                  ? "bg-[#036638] text-white border-[#036638] shadow-md"
                  : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#036638] hover:text-[#036638]"
              )}
            >
              {stageLabels[stage]}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: Horizontal scroll | Mobile: Vertical stack */}
      <div className="sm:h-[calc(100vh-12rem)] sm:-mx-3 sm:sm:-mx-6 sm:-mb-6 sm:overflow-x-auto sm:snap-x sm:snap-mandatory scrollbar-thin">
        <div className="flex sm:inline-flex flex-col sm:flex-row h-auto sm:h-full gap-3 p-3 sm:p-6 sm:min-w-max">
          {stageOrder.map((stage) => {
            const stagePatients = groupedPatients[stage] || []
            const isOver = dropTarget === stage
            const isDisabled = stageByKey.get(stage)?.isFinal ?? false
            return (
              <div
                key={stage}
                ref={(el) => {
                  if (el) stageRefs.current[stage] = el
                }}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={(e) => handleDragLeave(e, stage)}
                onDrop={(e) => handleDrop(e, stage)}
                className={cn(
                  "w-full sm:w-72 sm:shrink-0 sm:snap-center flex flex-col rounded-xl border transition-all duration-200",
                  quickJumpStage === stage && "ring-2 ring-[#036638] ring-offset-2",
                  isOver && !isDisabled
                    ? "border-[#65BD6C] bg-[#EBF7EC] shadow-lg shadow-[#65BD6C]/10 sm:scale-[1.02]"
                    : "border-[#E5E7EB]/50 bg-[#EBF7EC]/40",
                )}
              >
                <div className="px-3.5 py-3 border-b border-[#E5E7EB]/50">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-[#036638] truncate">
                        {stageLabels[stage]}
                      </h3>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">
                        {stageHints[stage]}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#6B7280] bg-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 border border-[#E5E7EB]">
                      {stagePatients.length}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {stagePatients.length > 0 ? (
                    stagePatients.map((patient) => {
                      const isPending = pendingMoves.current.has(patient.id)
                      const isDragging = draggingId === patient.id
                      return (
                        <div key={patient.id} className="relative group">
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
