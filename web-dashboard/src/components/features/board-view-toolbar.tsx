"use client"

import { useEffect, useRef, useState } from "react"
import { LayoutGrid, List, Users } from "lucide-react"
import { cn } from "@/lib/utils"

export type BoardView = "grid" | "list"

/**
 * Board view state with the phone default baked in: screens narrower than
 * 500px start in list view (compact rows — the user's preferred phone UX),
 * everything else starts in the grid/kanban view. The default only applies on
 * first load — once the user toggles manually, their choice sticks for the
 * rest of the session.
 */
export function useBoardView(): [BoardView, (view: BoardView) => void] {
  const [view, setView] = useState<BoardView>("grid")
  const userToggled = useRef(false)

  useEffect(() => {
    if (userToggled.current) return
    if (typeof window !== "undefined" && window.innerWidth < 500) {
      setView("list")
    }
  }, [])

  const changeView = (next: BoardView) => {
    userToggled.current = true
    setView(next)
  }

  return [view, changeView]
}

interface BoardViewToolbarProps {
  /** Total patient count — shown as the chip moved out of the board header. */
  count: number
  view: BoardView
  onViewChange: (view: BoardView) => void
}

/**
 * Slim toolbar above the board: patient count chip on the left, and a
 * List / Grid view toggle pinned to the right corner. Replaces the old count
 * chip + "Showing X of Y" text that used to live inside the board header.
 */
export function BoardViewToolbar({ count, view, onViewChange }: BoardViewToolbarProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 min-w-0">
      {/* Patient count chip — moved out of the board header */}
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EBF7EC] border border-[#65BD6C]/30 text-[11px] font-bold text-[#036638] shrink-0">
        <Users className="w-3 h-3" />
        {count} patients
      </span>

      {/* List / Grid view toggle — pinned to the right corner */}
      <div className="flex items-center gap-0.5 rounded-full bg-[#F3FAF4] border border-[#E5E7EB]/60 p-0.5 shrink-0">
        <button
          type="button"
          onClick={() => onViewChange("list")}
          title="List view"
          aria-label="List view"
          aria-pressed={view === "list"}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap",
            view === "list"
              ? "bg-gradient-to-r from-[#036638] to-emerald-600 text-white shadow-sm shadow-emerald-500/25"
              : "text-[#6B7280] hover:text-[#036638]",
          )}
        >
          <List className="w-3.5 h-3.5" />
          List
        </button>
        <button
          type="button"
          onClick={() => onViewChange("grid")}
          title="Grid view"
          aria-label="Grid view"
          aria-pressed={view === "grid"}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap",
            view === "grid"
              ? "bg-gradient-to-r from-[#036638] to-emerald-600 text-white shadow-sm shadow-emerald-500/25"
              : "text-[#6B7280] hover:text-[#036638]",
          )}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Grid
        </button>
      </div>
    </div>
  )
}
