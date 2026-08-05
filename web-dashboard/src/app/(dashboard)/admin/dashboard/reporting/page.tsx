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
  Cell,
} from "recharts"
import {
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flag,
  TrendingUp,
  Clock,
  Gauge,
  BarChart3,
  Loader2,
  X,
} from "lucide-react"
import { useAdminReport, useVaReport } from "@/hooks/query/useReporting"
import { useAuth } from "@/hooks/auth/useAuth"
import { cn } from "@/lib/utils"
import type { VaComparisonRow, VaReport } from "@/types"

const STAGE_BAR_COLORS = ["#036638", "#65BD6C", "#F2A93B", "#3B82C4", "#8B5CF6", "#E15C4E", "#14B8A6"]

function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "0"
  return n.toLocaleString("en-US")
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  accent: string
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] border-t-[3px] p-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", accent)}>
          <Icon className="w-5 h-5 text-[#036638]" strokeWidth={2} />
        </div>
        <div>
          <p className="text-2xl font-bold text-[#1A1B1E]">{formatNumber(value)}</p>
          <p className="text-xs text-[#6B7280]">{label}</p>
        </div>
      </div>
    </div>
  )
}

function WorkflowMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  tone: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] px-4 py-3">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", tone)}>
        <Icon className="w-4 h-4" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-[#1A1B1E] leading-tight">{value}</p>
        <p className="text-[10px] text-[#6B7280] uppercase tracking-wider truncate">{label}</p>
      </div>
    </div>
  )
}

function VaDetailModal({ vaId, onClose }: { vaId: string; onClose: () => void }) {
  const { data: report, isLoading } = useVaReport(vaId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#E5E7EB] shrink-0">
          <div>
            <h3 className="text-base font-bold text-[#1A1B1E]">VA Performance</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {isLoading ? "Loading..." : report?.va?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6B7280] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {isLoading || !report ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#036638] animate-spin" />
            </div>
          ) : (
            <VaDetailContent report={report} />
          )}
        </div>
      </div>
    </div>
  )
}

function VaDetailContent({ report }: { report: VaReport }) {
  const { totals, workload, performance, stageDistribution, series } = report
  const activeData = series.weekly

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Assigned" value={totals.assigned} />
        <MiniStat label="Active" value={totals.active} />
        <MiniStat label="Completed" value={totals.completed} />
        <MiniStat label="Cancelled" value={totals.cancelled} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Workload" value={workload} />
        <MiniStat label="Handled cases" value={performance.handledCases} />
        <MiniStat label="Avg completion" value={`${performance.avgCompletionDays}d`} />
        <MiniStat label="Completion rate" value={`${performance.stageCompletionRate}%`} />
      </div>

      <div>
        <p className="text-xs font-semibold text-[#374151] uppercase tracking-wider mb-2">
          Weekly activity
        </p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} width={24} />
              <Tooltip
                cursor={{ fill: "#EBF7EC" }}
                contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }}
              />
              <Bar dataKey="count" name="Actions" radius={[6, 6, 0, 0]} fill="#036638" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-[#374151] uppercase tracking-wider mb-2">
          Patients by stage
        </p>
        <div className="space-y-2">
          {stageDistribution.map((s) => (
            <div key={s.stage} className="flex items-center gap-3">
              <span className="text-xs text-[#6B7280] w-28 truncate shrink-0">{s.label}</span>
              <div className="flex-1 h-3 bg-[#EBF7EC] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#65BD6C] rounded-full transition-all"
                  style={{
                    width: `${Math.max(
                      (s.count / Math.max(...stageDistribution.map((x) => x.count), 1)) * 100,
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
  )
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-2.5">
      <p className="text-lg font-bold text-[#1A1B1E] leading-tight">{value}</p>
      <p className="text-[10px] text-[#6B7280] uppercase tracking-wider">{label}</p>
    </div>
  )
}

export default function AdminReportingPage() {
  const { user } = useAuth()
  const { data: report, isLoading } = useAdminReport()
  const [selectedVa, setSelectedVa] = useState<VaComparisonRow | null>(null)

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EBF7EC] to-[#FBE7B2] flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[#036638]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1A1B1E]">Reporting</h1>
            <p className="text-sm text-[#6B7280]">
              Platform-wide performance &amp; workflow metrics
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
            <StatCard label="Total Patients" value={report.totals.total} icon={Users} accent="bg-[#EBF7EC]" />
            <StatCard label="Active" value={report.totals.active} icon={Activity} accent="bg-[#EBF7EC]" />
            <StatCard label="Completed" value={report.totals.completed} icon={CheckCircle2} accent="bg-[#EBF7EC]" />
            <StatCard label="Cancelled" value={report.totals.cancelled} icon={XCircle} accent="bg-[#EBF7EC]" />
          </div>

          {/* Workflow metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <WorkflowMetric
              label="Reconciled / Week"
              value={formatNumber(report.workflow.reconciledThisWeek)}
              icon={TrendingUp}
              tone="bg-[#EBF7EC]"
            />
            <WorkflowMetric
              label="Stale (48h)"
              value={formatNumber(report.workflow.staleCount)}
              icon={AlertTriangle}
              tone={report.workflow.staleCount > 0 ? "bg-[#FEFCE8]" : "bg-[#EBF7EC]"}
            />
            <WorkflowMetric
              label="Flagged"
              value={formatNumber(report.workflow.flaggedCount)}
              icon={Flag}
              tone="bg-[#EBF7EC]"
            />
            <WorkflowMetric
              label="Avg Completion"
              value={`${report.workflow.avgCompletionDays}d`}
              icon={Clock}
              tone="bg-[#EBF7EC]"
            />
            <WorkflowMetric
              label="Completion Rate"
              value={`${report.workflow.completionRate}%`}
              icon={Gauge}
              tone="bg-[#EBF7EC]"
            />
          </div>

          {/* Stage chart */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-[#036638]" />
              <h2 className="text-sm font-bold text-[#036638]">Patients by Stage</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.byStage}>
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
                  <Bar dataKey="count" name="Patients" radius={[6, 6, 0, 0]}>
                    {report.byStage.map((entry, index) => (
                      <Cell key={entry.stage} fill={STAGE_BAR_COLORS[index % STAGE_BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* VA comparison */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#E5E7EB]">
              <Users className="w-4 h-4 text-[#036638]" />
              <h2 className="text-sm font-bold text-[#036638]">VA Performance Comparison</h2>
              <span className="ml-auto text-[10px] text-[#6B7280]">Click a VA for full details</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F9FAFB] text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">
                    <th className="px-5 py-3">VA</th>
                    <th className="px-3 py-3 text-right">Assigned</th>
                    <th className="px-3 py-3 text-right">Active</th>
                    <th className="px-3 py-3 text-right">Completed</th>
                    <th className="px-3 py-3 text-right">Cancelled</th>
                    <th className="px-3 py-3 text-right">Handled</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                    <th className="px-3 py-3 text-right">Avg Days</th>
                    <th className="px-5 py-3 text-right">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]/60">
                  {report.vaComparison.map((va) => (
                    <tr
                      key={va.id}
                      onClick={() => setSelectedVa(va)}
                      className="cursor-pointer hover:bg-[#EBF7EC]/20 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#EBF7EC] flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-bold text-[#036638]">
                              {va.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-[#1A1B1E]">{va.name}</span>
                          {va.id === user?.id && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#FBE7B2] text-[#8A6D1D] uppercase tracking-wider">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-[#374151]">{va.assigned}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-[#374151]">{va.active}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-[#036638] font-semibold">{va.completed}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-[#E15C4E] font-semibold">{va.cancelled}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-[#374151]">{va.handledCases}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-[#374151]">{va.actions}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-[#374151]">{va.avgCompletionDays}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-[#EBF7EC] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#65BD6C] rounded-full"
                              style={{ width: `${Math.min(va.stageCompletionRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-[#1A1B1E] tabular-nums w-9 text-right">
                            {va.stageCompletionRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {report.vaComparison.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-10 text-center text-sm text-[#6B7280] italic">
                        No VAs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedVa && <VaDetailModal vaId={selectedVa.id} onClose={() => setSelectedVa(null)} />}
    </div>
  )
}
