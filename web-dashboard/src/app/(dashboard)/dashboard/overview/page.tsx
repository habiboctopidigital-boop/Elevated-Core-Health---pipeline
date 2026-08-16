"use client"

import { useState } from "react"
import { usePatients } from "@/hooks/query/usePatients"
import { useAdminAnalytics } from "@/hooks/query/useAdmin"
import { useStageMeta } from "@/hooks/query/useStages"
import { OverviewMetrics } from "@/components/features/dashboard/overview-metrics"
import { PipelineAnalytics } from "@/components/features/dashboard/pipeline-analytics"
import { PerformanceAnalytics } from "@/components/features/dashboard/performance-analytics"
import { AcquisitionMetrics } from "@/components/features/dashboard/acquisition-metrics"
import { WorkloadTable } from "@/components/features/dashboard/workload-table"
import { ChartContainer } from "@/components/ui/chart-container"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, Share2, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function OverviewPage() {
  const { data: patients } = usePatients()
  const { data: analytics } = useAdminAnalytics()
  const { order: stageOrder, labels: stageLabels } = useStageMeta()
  const [dateRange, setDateRange] = useState("7d")

  const totalPatients = patients?.length || 0
  const activePatients = patients?.filter(p => p.status === "active").length || 0
  const completedThisWeek = analytics?.reconciledThisWeek || 0

  // Prepare pipeline chart data
  const pipelineData = stageOrder.map(stage => ({
    stage: stageLabels[stage],
    count: patients?.filter(p => p.stage === stage).length || 0,
    completed: patients?.filter(p => p.stage === stage && p.status === "completed").length || 0,
  }))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1B1E]">
            Dashboard Overview
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Welcome back! Here's your pipeline performance at a glance.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-auto px-3 py-2 text-sm border-[#E5E7EB] rounded-lg shadow-none focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] bg-white cursor-pointer">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs border-[#E5E7EB]"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs border-[#E5E7EB]"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs border-[#E5E7EB]"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <OverviewMetrics
        totalPatients={totalPatients}
        activePatients={activePatients}
        completedThisWeek={completedThisWeek}
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PipelineAnalytics data={pipelineData} />
        <PerformanceAnalytics />
      </div>

      {/* Acquisition & Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AcquisitionMetrics />
        <WorkloadTable data={analytics?.vaLoad?.map(va => ({
          id: va.id,
          name: va.name,
          assigned: va.patientCount,
          completed: Math.floor(va.patientCount * 0.75),
          completionRate: 75,
          status: "excellent",
        }))} />
      </div>

      {/* Activity Log Preview (optional) */}
      <ChartContainer
        title="Recent Activity"
        subtitle="Latest patient updates and pipeline changes"
      >
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2.5 border-b border-[#E5E7EB] last:border-0"
            >
              <div className="w-2 h-2 rounded-full bg-[#036638] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1A1B1E] font-medium">
                  Patient moved to next stage
                </p>
                <p className="text-xs text-[#6B7280]">2 hours ago</p>
              </div>
            </div>
          ))}
        </div>
      </ChartContainer>
    </div>
  )
}
