"use client"

import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { KanbanBoard } from "@/components/features/kanban-board"
import { StatusBar } from "@/components/features/status-bar"
import { ImportDialog } from "@/components/features/import-dialog"
import { AddPatientDialog } from "@/components/features/add-patient-dialog"
import { useStageMeta } from "@/hooks/query/useStages"
import { LayoutGrid, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export default function VABoardPage() {
  const searchParams = useSearchParams()
  const claimPatientId = searchParams.get("claim")
  const { order: stageOrder, labels: stageLabels } = useStageMeta()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStageFilter, setSelectedStageFilter] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full">
      {/* - Board Header - */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#036638]/10 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-5 h-5 text-[#036638]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-[#1A1B1E] truncate">Patient Pipeline Board</h1>
            <p className="text-xs text-[#6B7280] truncate">Track patients through 7 workflow stages</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AddPatientDialog />
          <ImportDialog />
          <StatusBar />
        </div>
      </div>

      {/* - Search & Filter Bar - */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 pb-3 border-b border-[#E5E7EB]">
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
      <KanbanBoard
        initialPatientId={claimPatientId ?? undefined}
        searchQuery={searchQuery}
        stageFilter={selectedStageFilter}
      />
    </div>
  )
}
