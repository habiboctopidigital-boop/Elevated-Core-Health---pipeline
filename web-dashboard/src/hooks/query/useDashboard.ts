"use client"

import { useQuery } from "@tanstack/react-query"
import { DashboardService } from "@/services/dashboard.service"
import { QUERY_KEYS } from "@/constants"

export function useDashboard() {
  return useQuery({
    queryKey: QUERY_KEYS.DASHBOARD.SUMMARY,
    queryFn: () => DashboardService.getSummary(),
    refetchInterval: 60_000,
  })
}
