"use client"

import { ChartContainer } from "@/components/ui/chart-container"
import { ArrowUpDown, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface WorkloadEntry {
  id: string
  name: string
  role?: string
  assigned: number
  completed: number
  completionRate: number
  avgTime?: string
  status: "excellent" | "good" | "fair" | "warning"
}

interface WorkloadTableProps {
  data?: WorkloadEntry[]
  title?: string
}

export function WorkloadTable({
  data,
  title = "VA Workload Distribution",
}: WorkloadTableProps) {
  const [sortKey, setSortKey] = useState<keyof WorkloadEntry>("assigned")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const defaultData: WorkloadEntry[] = [
    {
      id: "1",
      name: "Jude",
      role: "Virtual Assistant",
      assigned: 24,
      completed: 18,
      completionRate: 75,
      avgTime: "2.5 hours",
      status: "excellent",
    },
    {
      id: "2",
      name: "Amanda",
      role: "Virtual Assistant",
      assigned: 28,
      completed: 22,
      completionRate: 79,
      avgTime: "2.2 hours",
      status: "excellent",
    },
    {
      id: "3",
      name: "Donna",
      role: "Administrator",
      assigned: 15,
      completed: 14,
      completionRate: 93,
      avgTime: "1.8 hours",
      status: "excellent",
    },
  ]

  const tableData = data || defaultData

  const sorted = [...tableData].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal
    }
    return 0
  })

  const getStatusColor = (status: WorkloadEntry["status"]) => {
    switch (status) {
      case "excellent":
        return "bg-green-50 text-green-700 border-green-200"
      case "good":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "fair":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      default:
        return "bg-red-50 text-red-700 border-red-200"
    }
  }

  const handleSort = (key: keyof WorkloadEntry) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  return (
    <ChartContainer title={title} className="lg:col-span-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              <th className="text-left py-3 px-4 font-semibold text-[#6B7280]">
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-2 hover:text-[#1A1B1E] transition-colors"
                >
                  Name
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </th>
              <th className="text-right py-3 px-4 font-semibold text-[#6B7280]">
                <button
                  onClick={() => handleSort("assigned")}
                  className="flex items-center justify-end gap-2 hover:text-[#1A1B1E] transition-colors ml-auto"
                >
                  Assigned
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </th>
              <th className="text-right py-3 px-4 font-semibold text-[#6B7280]">
                <button
                  onClick={() => handleSort("completed")}
                  className="flex items-center justify-end gap-2 hover:text-[#1A1B1E] transition-colors ml-auto"
                >
                  Completed
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </th>
              <th className="text-right py-3 px-4 font-semibold text-[#6B7280]">
                Completion Rate
              </th>
              <th className="text-center py-3 px-4 font-semibold text-[#6B7280]">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, idx) => (
              <tr
                key={entry.id}
                className={cn(
                  "border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors",
                  idx === sorted.length - 1 && "border-b-0"
                )}
              >
                <td className="py-3 px-4">
                  <div>
                    <p className="font-semibold text-[#1A1B1E]">{entry.name}</p>
                    {entry.role && (
                      <p className="text-xs text-[#6B7280]">{entry.role}</p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-medium text-[#1A1B1E]">
                  {entry.assigned}
                </td>
                <td className="py-3 px-4 text-right font-medium text-[#1A1B1E]">
                  {entry.completed}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="flex-shrink-0 w-20 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#036638] to-[#65BD6C]"
                        style={{ width: `${entry.completionRate}%` }}
                      />
                    </div>
                    <span className="font-semibold text-[#1A1B1E] w-12 text-right">
                      {entry.completionRate}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize",
                      getStatusColor(entry.status)
                    )}
                  >
                    {entry.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartContainer>
  )
}
