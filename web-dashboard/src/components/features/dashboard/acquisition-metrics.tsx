"use client"

import { ChartContainer } from "@/components/ui/chart-container"
import { Users, MousePointerClick } from "lucide-react"
import { cn } from "@/lib/utils"

interface AcquisitionMetric {
  label: string
  value: string | number
  change: number
  icon: React.ReactNode
  color: string
}

interface AcquisitionMetricsProps {
  metrics?: AcquisitionMetric[]
}

export function AcquisitionMetrics({ metrics }: AcquisitionMetricsProps) {
  const defaultMetrics: AcquisitionMetric[] = [
    {
      label: "New Intakes",
      value: "156",
      change: 18.5,
      icon: <Users className="w-5 h-5" />,
      color: "text-blue-600",
    },
    {
      label: "Conversion Rate",
      value: "42%",
      change: 5.2,
      icon: <MousePointerClick className="w-5 h-5" />,
      color: "text-green-600",
    },
  ]

  const data = metrics || defaultMetrics

  return (
    <ChartContainer
      title="Acquisition Overview"
      subtitle="New patient intake & conversion metrics"
    >
      <div className="grid grid-cols-2 gap-4">
        {data.map((metric) => (
          <div
            key={metric.label}
            className="p-4 rounded-lg border border-[#E5E7EB] hover:border-[#036638]/30 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[#6B7280]">
                {metric.label}
              </span>
              <div className={cn(
                "p-2 rounded-lg",
                metric.color === "text-blue-600" ? "bg-blue-50" : "bg-green-50"
              )}>
                <span className={metric.color}>
                  {metric.icon}
                </span>
              </div>
            </div>

            <div>
              <p className="text-2xl font-bold text-[#1A1B1E]">
                {metric.value}
              </p>
              <p className="text-xs text-green-600 font-semibold mt-2">
                ↑ {metric.change}% from last month
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Additional info */}
      <div className="mt-4 p-3 bg-[#EBF7EC]/50 border border-[#65BD6C]/20 rounded-lg">
        <p className="text-xs text-[#6B7280]">
          <strong>Insight:</strong> Patient intake is trending positively with a 18.5% week-over-week increase. Conversion rates remain stable at 42%.
        </p>
      </div>
    </ChartContainer>
  )
}
