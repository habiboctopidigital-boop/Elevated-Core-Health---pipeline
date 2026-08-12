"use client"

import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { KanbanBoard } from "@/components/features/kanban-board"
import { BoardFilterBar } from "@/components/features/board-filter-bar"
import { StatusBar } from "@/components/features/status-bar"
import { ImportDialog } from "@/components/features/import-dialog"
import { AddPatientDialog } from "@/components/features/add-patient-dialog"
import { EMPTY_BOARD_FILTERS, type BoardFilters } from "@/lib/board-filters"
import { LayoutGrid } from "lucide-react"

export default function VABoardPage() {
  const searchParams = useSearchParams()
  const claimPatientId = searchParams.get("claim")
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_BOARD_FILTERS)

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

      {/* - Global Filter Bar (search, status, date ranges — applies to all stages) - */}
      <div className="mb-4">
        <BoardFilterBar filters={filters} onChange={setFilters} />
      </div>

      {/* - Kanban Board - */}
      <KanbanBoard
        initialPatientId={claimPatientId ?? undefined}
        filters={filters}
      />
    </div>
  )
}
