"use client"

import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { KanbanBoard } from "@/components/features/kanban-board"
import { BoardFilterBar } from "@/components/features/board-filter-bar"
import { StatusBar } from "@/components/features/status-bar"
import { ImportDialog } from "@/components/features/import-dialog"
import { AddPatientDialog } from "@/components/features/add-patient-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { usePatients } from "@/hooks/query/usePatients"
import { EMPTY_BOARD_FILTERS, type BoardFilters } from "@/lib/board-filters"
import { LayoutGrid, Users } from "lucide-react"

export default function VABoardPage() {
  const searchParams = useSearchParams()
  const claimPatientId = searchParams.get("claim")
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_BOARD_FILTERS)
  // Live total for the header count chip — same cached query the board uses,
  // so this adds no extra network round-trip.
  const { data: patients } = usePatients()

  // Desktop (lg+): fixed header height, so the board locks to the viewport
  // with internal scrollbars. Phone/tablet: the mobile topbar is taller, so
  // the page flows naturally (scrolls) to avoid clipping the board.
  return (
    <div className="flex flex-col h-full overflow-x-hidden lg:h-[calc(100vh-7.5rem)] lg:overflow-hidden no-scrollbar">
      {/* - Board Header - */}
      <div className="rounded-2xl border border-[#EDEFF2] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] px-4 py-3.5 sm:px-5 mb-4">
        <PageHeader
          breadcrumb="Patient Pipeline"
          title="Patient Pipeline Board"
          subtitle="Track patients through 7 workflow stages"
          icon={LayoutGrid}
          count={
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EBF7EC] border border-[#65BD6C]/30 text-[11px] font-bold text-[#036638]">
              <Users className="w-3 h-3" />
              {patients?.length ?? 0} patients
            </span>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <AddPatientDialog />
              <ImportDialog />
              <StatusBar />
            </div>
          }
        />
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
