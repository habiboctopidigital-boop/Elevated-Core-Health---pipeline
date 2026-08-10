"use client"

import { PerformanceGauge } from "@/components/ui/performance-gauge"

export function PerformanceAnalytics() {
  const ratings = [
    {
      label: "Excellent",
      count: 2847,
      percentage: 65,
      color: "bg-green-500",
      bgColor: "bg-green-100",
    },
    {
      label: "Good",
      count: 945,
      percentage: 22,
      color: "bg-blue-500",
      bgColor: "bg-blue-100",
    },
    {
      label: "Fair",
      count: 238,
      percentage: 5,
      color: "bg-yellow-500",
      bgColor: "bg-yellow-100",
    },
    {
      label: "Needs Improvement",
      count: 140,
      percentage: 3,
      color: "bg-red-500",
      bgColor: "bg-red-100",
    },
  ]

  return (
    <PerformanceGauge
      score={8.7}
      maxScore={10}
      trend={{ direction: "up", percentage: 2.8 }}
      ratings={ratings}
      title="Pipeline Health Score"
    />
  )
}
