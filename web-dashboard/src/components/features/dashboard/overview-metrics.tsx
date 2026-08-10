"use client"

import { MetricCard } from "@/components/ui/metric-card"
import { Activity, Users, TrendingUp } from "lucide-react"

interface OverviewMetricsProps {
  totalPatients: number
  activePatients: number
  completedThisWeek: number
}

export function OverviewMetrics({
  totalPatients,
  activePatients,
  completedThisWeek,
}: OverviewMetricsProps) {
  // Mock chart data
  const chartData = Array.from({ length: 7 }, (_, i) => ({
    name: `Day ${i + 1}`,
    value: Math.floor(Math.random() * 100) + 50,
  }))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total Patients */}
      <MetricCard
        title="Total Patients"
        value={totalPatients}
        subtitle="In pipeline"
        trend={{ direction: "up", percentage: 12 }}
        chart={{ data: chartData }}
        icon={<Users className="w-5 h-5 text-[#036638]" />}
        variant="default"
      />

      {/* Active Patients */}
      <MetricCard
        title="Active Pipeline"
        value={activePatients}
        subtitle={`${Math.round((activePatients / totalPatients) * 100)}% of total`}
        trend={{ direction: "up", percentage: 8 }}
        chart={{ data: chartData }}
        icon={<Activity className="w-5 h-5 text-green-600" />}
        variant="success"
      />

      {/* Completed This Week */}
      <MetricCard
        title="Completed/Week"
        value={completedThisWeek}
        subtitle="Last 7 days"
        trend={{ direction: "down", percentage: 3 }}
        chart={{ data: chartData }}
        icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
        variant="info"
      />
    </div>
  )
}
