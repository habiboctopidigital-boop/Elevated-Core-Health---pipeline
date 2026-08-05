"use client"

import { useQuery } from "@tanstack/react-query"
import { ReportingService } from "@/services/reporting.service"
import { QUERY_KEYS } from "@/constants"

export function useAdminReport() {
  return useQuery({
    queryKey: QUERY_KEYS.REPORTING.ADMIN,
    queryFn: () => ReportingService.getAdminReport(),
  })
}

export function useMyReport() {
  return useQuery({
    queryKey: QUERY_KEYS.REPORTING.ME,
    queryFn: () => ReportingService.getMyReport(),
  })
}

export function useVaReport(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.REPORTING.VA(id ?? ""),
    queryFn: () => ReportingService.getVaReport(id!),
    enabled: !!id,
  })
}
