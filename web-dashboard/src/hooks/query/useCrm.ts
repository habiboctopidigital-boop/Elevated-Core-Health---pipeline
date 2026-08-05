"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CrmService, type CrmFilters } from "@/services/crm.service"
import { ImportService, type ParsedRow } from "@/services/import.service"
import { QUERY_KEYS } from "@/constants"
import { toast } from "sonner"

export function useCrmContacts(filters: CrmFilters) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CRM.CONTACTS, filters],
    queryFn: () => CrmService.getContacts(filters),
    placeholderData: (prev) => prev,
  })
}

/** Downloads the filtered contact list as a CSV file. */
export function useExportContacts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (filters: Omit<CrmFilters, "page" | "limit"> = {}) => CrmService.exportContacts(filters),
    onSuccess: (csv) => {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CRM.CONTACTS })
      toast.success("Contacts exported")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Export failed")
    },
  })
}

export function useImportHistory() {
  return useQuery({
    queryKey: QUERY_KEYS.IMPORT.HISTORY,
    queryFn: () => ImportService.getImportHistory(),
  })
}

export function useApplyImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ rows, fileName, fileType }: { rows: ParsedRow[]; fileName?: string; fileType?: string }) =>
      ImportService.applyImport(rows, fileName, fileType),
    onSuccess: (batch) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.IMPORT.HISTORY })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CRM.CONTACTS })
      toast.success(
        `${batch.successCount} imported${batch.duplicateCount ? `, ${batch.duplicateCount} duplicates skipped` : ""}${batch.failCount ? `, ${batch.failCount} failed` : ""}`,
      )
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Import failed")
    },
  })
}
