"use client"

import { ChartContainer } from "@/components/ui/chart-container"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { useStageMeta } from "@/hooks/query/useStages"

interface PipelineAnalyticsProps {
  data?: Array<{ stage: string; count: number; completed: number }>
}

export function PipelineAnalytics({ data }: PipelineAnalyticsProps) {
  const { labels: stageLabels, order: stageOrder } = useStageMeta()

  // Mock data if not provided
  const chartData = data || stageOrder.map((stage, idx) => ({
    stage: stageLabels[stage] || stage,
    count: Math.floor(Math.random() * 50) + 10,
    completed: Math.floor(Math.random() * 30) + 5,
  }))

  return (
    <ChartContainer
      title="Pipeline Progress"
      subtitle="Patient count by stage"
      className="lg:col-span-2"
    >
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="stage"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12, fill: "#6B7280" }}
            />
            <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1A1B1E",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#fff" }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="circle"
            />
            <Bar dataKey="count" fill="#036638" radius={[8, 8, 0, 0]} name="Total" />
            <Bar dataKey="completed" fill="#65BD6C" radius={[8, 8, 0, 0]} name="Completed" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  )
}
