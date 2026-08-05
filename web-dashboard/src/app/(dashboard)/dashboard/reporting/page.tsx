"use client"

import { useState } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import {
  BarChart3,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  Briefcase,
  Flame,
  CalendarDays,
  Clock,
  Gauge,
  Loader2,
} from "lucide-react"
import { useMyReport } from "@/hooks/query/useReporting"
import { useAuth } from "@/hooks/auth/useAuth"
import { cn } from "@/lib/utils"

type RangeKey = "daily" | "weekly" | "monthly"

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "daily", label: "Last 7 days" },
  { key: "weekly", label: "Last 4 weeks" },
  { key: "monthly", label: "Last 6 months" },
]

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  tone: string
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] border-t-[3px] p-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", tone)}>
          <Icon className="w-5 h-5 text-[#036638]" strokeWidth={2} />
        </div>
        <div>
          <p className="text-2xl font-bold text-[#1A1B1E]">{value.toLocaleString("en-US")}</p>
          <p className="text-xs text-[#6B7280]">{label}</p>
        </div>
      </div>
    </div>
  )
}

function MetricTile({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] px-4 py-3">
      <div className="w-9 h-9 rounded-lg bg-[#EBF7EC] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#036638]" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-[#1A1B1E] leading-tight">{value}</p>
        <p className="text-[10px] text-[#6B7280] uppercase tracking-wider truncate">{label}</p>
      </div>
    </div>
  )
}

export default function VaReportingPage() {
  const { user } = useAuth()
  const { data: report, isLoading } = useMyReport()
  const [range, setRange] = useState<RangeKey>("weekly")

  const series = report?.series[range] ?? []
  const totalActions = series.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EBF7EC] to-[#FBE7B2] flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[#036638]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1A1B1E]">My Report</h1>
            <p className="text-sm text-[#6B7280]">
              Your performance at a glance, {user?.name?.split(" ")[0]}
            </p>
          </div>
        </div>
      </div>

      {isLoading || !report ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-[#036638] animate-spin" />
        </div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Assigned" value={report.totals.assigned} icon={Users} tone="bg-[#EBF7EC]" />
            <StatCard label="Active" value={report.totals.active} icon={Activity} tone="bg-[#EBF7EC]" />
            <StatCard label="Completed" value={report.totals.completed} icon={CheckCircle2} tone="bg-[#EBF7EC]" />
            <StatCard label="Cancelled" value={report.totals.cancelled} icon={XCircle} tone="bg-[#EBF7EC]" />
          </div>

          {/* Performance metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <MetricTile label="Current Workload" value={report.workload} icon={Briefcase} />
            <MetricTile label="Handled Cases" value={report.performance.handledCases} icon={Flame} />
            <MetricTile label="Actions Today" value={report.performance.actions.today} icon={CalendarDays} />
            <MetricTile label="Actions / Week" value={report.performance.actions.thisWeek} icon={Activity} />
            <MetricTile label="Avg Completion" value={`${report.performance.avgCompletionDays}d`} icon={Clock} />
            <MetricTile label="Completion Rate" value={`${report.performance.stageCompletionRate}%`} icon={Gauge} />
          </div>

          {/* Activity chart */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-[#036638]" />
              <h2 className="text-sm font-bold text-[#036638]">Your Activity</h2>
              <span className="ml-auto text-[10px] text-[#6B7280]">
                {totalActions} action{totalActions === 1 ? "" : "s"} in range
              </span>
            </div>

            <div className="flex gap-1.5 mb-4 mt-3">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={cn(
                    "text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
                    range === r.key
                      ? "bg-[#036638] text-white shadow-sm"
                      : "bg-[#F9FAFB] text-[#6B7280] hover:bg-[#EBF7EC] hover:text-[#036638]",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <Tooltip
                    cursor={{ fill: "#EBF7EC" }}
                    contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }}
                  />
                  <Bar dataKey="count" name="Actions" radius={[6, 6, 0, 0]} fill="#036638" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stage distribution */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-[#036638]" />
              <h2 className="text-sm font-bold text-[#036638]">Assigned Patients by Stage</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {report.stageDistribution.map((s) => (
                <div key={s.stage} className="flex items-center gap-3">
                  <span className="text-xs text-[#6B7280] w-28 truncate shrink-0">{s.label}</span>
                  <div className="flex-1 h-4 bg-[#EBF7EC] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#65BD6C] rounded-full transition-all"
                      style={{
                        width: `${Math.max(
                          (s.count / Math.max(...report.stageDistribution.map((x) => x.count), 1)) * 100,
                          s.count > 0 ? 6 : 0,
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[#1A1B1E] w-6 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
