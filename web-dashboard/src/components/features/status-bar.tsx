"use client"

import { AlertTriangle, Flag, CheckCircle2 } from "lucide-react"
import { useDashboard } from "@/hooks/query/useDashboard"
import { cn } from "@/lib/utils"

/** Compact status pill - lives in the Topbar. Rule: always-visible stale/flag summary. */
export function StatusBar() {
  const { data: summary, isLoading, error } = useDashboard()

  if (isLoading) {
    return (
      <div className="h-8 w-40 rounded-full bg-gray-100 animate-pulse" />
    )
  }

  if (error || !summary) {
    return (
      <div className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-red-50 border border-red-100">
        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
        <span className="text-[11px] text-red-600 font-semibold">Status unavailable</span>
      </div>
    )
  }

  const hasIssues = summary.staleCount > 0 || summary.flaggedCount > 0

  return (
    <div
      className={cn(
        "flex items-center h-8 px-3 rounded-full gap-3 text-[11px] font-semibold border transition-colors",
        hasIssues ? "bg-amber-50 border-amber-200" : "bg-[#EBF7EC] border-[#65BD6C]/20",
      )}
    >
      {hasIssues ? (
        <>
          {summary.staleCount > 0 && (
            <span className="flex items-center gap-1.5 text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              {summary.staleCount} stale
            </span>
          )}
          {summary.flaggedCount > 0 && (
            <span className="flex items-center gap-1.5 text-amber-700">
              <Flag className="w-3.5 h-3.5 text-amber-500" />
              {summary.flaggedCount} flagged
            </span>
          )}
        </>
      ) : (
        <span className="flex items-center gap-1.5 text-[#036638]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          All caught up
        </span>
      )}
    </div>
  )
}
