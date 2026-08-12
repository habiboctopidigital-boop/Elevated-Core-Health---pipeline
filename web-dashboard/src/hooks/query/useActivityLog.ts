"use client"

import { useQuery } from "@tanstack/react-query"
import { ActivityLogService, type ActivityLogFilters } from "@/services/activity-log.service"
import { QUERY_KEYS } from "@/constants"

export function useActivityLog(params?: ActivityLogFilters) {
  return useQuery({
    queryKey: QUERY_KEYS.ACTIVITY_LOG.LIST(JSON.stringify(params)),
    queryFn: () => ActivityLogService.list(params),
  })
}
