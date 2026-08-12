"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { ReportingService, type LogExportInput } from "@/services/reporting.service"
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

/**
 * Records a client-generated report export (task.md §15 — report export
 * tracking). Intentionally fire-and-forget: the download is already in the
 * user's hands, so a failed audit write must never surface an error or block
 * anything. Trigger with `.mutate()` and never await it.
 */
export function useLogExport() {
  return useMutation({
    mutationFn: (input: LogExportInput) => ReportingService.logExport(input),
    onError: () => {
      // Swallow — audit logging must never break the export UX.
    },
  })
}
