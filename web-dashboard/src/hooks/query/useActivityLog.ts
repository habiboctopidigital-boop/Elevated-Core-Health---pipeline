"use client"

import { useQuery } from "@tanstack/react-query"
import { ActivityLogService } from "@/services/activity-log.service"
import { QUERY_KEYS } from "@/constants"

export function useActivityLog(params?: {
  patientId?: string
  type?: string
  author?: string
  actorId?: string
  action?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: QUERY_KEYS.ACTIVITY_LOG.LIST(JSON.stringify(params)),
    queryFn: () => ActivityLogService.list(params),
  })
}
