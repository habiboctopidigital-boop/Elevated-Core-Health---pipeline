"use client"

import { useMemo, useRef, useState } from "react"
import {
  useCrmContacts,
  useExportContacts,
  useImportHistory,
} from "@/hooks/query/useCrm"
import { useStageMeta } from "@/hooks/query/useStages"
import { PatientModal } from "@/components/features/patient-modal"
import { ImportDialog } from "@/components/features/import-dialog"
import {
  Search,
  Loader2,
  Download,
  CloudDownload,
  ChevronLeft,
  ChevronRight,
  Contact as ContactIcon,
  Lock,
  Flag,
  FileSpreadsheet,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { Patient } from "@/types"

const STATUS_STYLES: Record<string, string> = {
  active: "bg-[#EBF7EC] text-[#036638] border-[#65BD6C]/40",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
}

const ELIG_STYLES: Record<string, string> = {
  eligible: "bg-emerald-50 text-emerald-700 border-emerald-200",
  not_eligible: "bg-red-50 text-red-600 border-red-200",
  not_checked: "bg-gray-50 text-gray-500 border-gray-200",
}

export default function AdminCrmPage() {
  const { labels: stageLabels } = useStageMeta()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [statusFilter, setStatusFilter] = useState("")
  const [stageFilter, setStageFilter] = useState("")
  const [eligFilter, setEligFilter] = useState("")
  const [page, setPage] = useState(1)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      stage: stageFilter || undefined,
      eligibility: eligFilter || undefined,
      page,
      limit: 25,
    }),
    [debouncedSearch, statusFilter, stageFilter, eligFilter, page],
  )

  const { data, isLoading } = useCrmContacts(filters)
  const exportContacts = useExportContacts()
  const { data: batches } = useImportHistory()

  const contacts = data?.contacts ?? []
  const totalPages = data?.totalPages || 1

  const applySearch = (value: string) => {
    setSearch(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 400)
  }

  const handleExport = () => {
    exportContacts.mutate({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      stage: stageFilter || undefined,
      eligibility: eligFilter || undefined,
    })
  }

  const loadFromCrm = () => {
    // Phase 3 scope: mock only - real CRM integration lands in a later phase.
    toast.info("CRM integration is coming in the next phase. Bulk import works today.")
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#036638]/10 flex items-center justify-center">
            <ContactIcon className="w-5 h-5 text-[#036638]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1A1B1E]">CRM Management</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">
              Load, import and manage patient contacts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadFromCrm}
            className="text-xs gap-1.5 border-[#E5E7EB] text-[#374151] hover:bg-[#EBF7EC] hover:text-[#036638]"
          >
            <CloudDownload className="w-3.5 h-3.5" />
            Load from CRM
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exportContacts.isPending}
            className="text-xs gap-1.5 border-[#E5E7EB] text-[#374151] hover:bg-[#EBF7EC] hover:text-[#036638]"
          >
            <Download className="w-3.5 h-3.5" />
            {exportContacts.isPending ? "Exporting..." : "Export CSV"}
          </Button>
          <ImportDialog />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search name, phone, email, location..."
            value={search}
            onChange={(e) => applySearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/30 appearance-none cursor-pointer"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={stageFilter}
          onChange={(e) => { setStageFilter(e.target.value); setPage(1) }}
          className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/30 appearance-none cursor-pointer"
        >
          <option value="">All stages</option>
          {Object.entries(stageLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={eligFilter}
          onChange={(e) => { setEligFilter(e.target.value); setPage(1) }}
          className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/30 appearance-none cursor-pointer"
        >
          <option value="">All eligibility</option>
          <option value="eligible">Eligible</option>
          <option value="not_eligible">Not Eligible</option>
          <option value="not_checked">Not Checked</option>
        </select>
        <span className="text-xs text-[#6B7280] ml-auto">
          {data?.total ?? 0} contact{data?.total === 1 ? "" : "s"}
        </span>
      </div>

      {/* Contacts table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Contact</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Phone</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Email</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Location</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Stage</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Eligibility</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Assigned VA</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <Loader2 className="w-6 h-6 text-[#036638] animate-spin mx-auto" />
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-sm text-[#6B7280]">
                    No contacts found
                  </td>
                </tr>
              ) : (
                contacts.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className="border-b border-[#E5E7EB]/50 last:border-0 hover:bg-[#EBF7EC]/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#036638]/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-[#036638]">
                            {(patient.firstName || patient.name || "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1A1B1E] truncate flex items-center gap-1.5">
                            {[patient.firstName, patient.lastName].filter(Boolean).join(" ") || patient.name}
                            {patient.isPrivate && (
                              <span title="Locked by assigned VA" className="shrink-0">
                                <Lock className="w-3 h-3 text-amber-600" />
                              </span>
                            )}
                            {patient.isFlagged && (
                              <span title="Flagged for Donna" className="shrink-0">
                                <Flag className="w-3 h-3 text-[#036638]" fill="#036638" />
                              </span>
                            )}
                          </p>
                          {patient.firstName && (
                            <p className="text-[11px] text-[#6B7280] truncate">{patient.name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#374151] whitespace-nowrap">{patient.phone || "-"}</td>
                    <td className="px-4 py-3 text-xs text-[#374151] max-w-[200px] truncate">{patient.email || "-"}</td>
                    <td className="px-4 py-3 text-xs text-[#374151]">{patient.location || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-medium bg-[#EBF7EC] text-[#036638] px-2 py-0.5 rounded-full">
                        {stageLabels[patient.stage] || patient.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize", STATUS_STYLES[patient.status])}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", ELIG_STYLES[patient.eligibilityStatus])}>
                        {patient.eligibilityStatus === "not_checked" ? "Not Checked" : patient.eligibilityStatus === "eligible" ? "Eligible" : "Not Eligible"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#374151]">
                      {patient.assignedUser?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">
                      {new Date(patient.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-[#E5E7EB]">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#1A1B1E] disabled:opacity-40 hover:border-[#65BD6C]/40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-[#6B7280]">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#1A1B1E] disabled:opacity-40 hover:border-[#65BD6C]/40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Import history */}
      {batches && batches.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[#1A1B1E] mb-3 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#036638]" />
            Import History
          </h2>
          <div className="bg-white rounded-xl border border-[#E5E7EB] divide-y divide-[#E5E7EB]/50 overflow-hidden">
            {batches.slice(0, 8).map((batch) => (
              <div key={batch.id} className="flex items-center gap-3 px-4 py-3">
                <FileSpreadsheet className="w-5 h-5 text-[#036638] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#374151] truncate">{batch.fileName}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {batch.totalRows} rows | {batch.successCount} imported | {batch.duplicateCount} duplicates | {batch.failCount} failed
                    {batch.importedByUser ? ` | by ${batch.importedByUser.name}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    batch.failCount > 0
                      ? "bg-amber-50 text-amber-700"
                      : "bg-[#EBF7EC] text-[#036638]",
                  )}
                >
                  {batch.status === "completed_with_errors" ? "With errors" : "Completed"}
                </span>
                <span className="text-xs text-[#6B7280] whitespace-nowrap">
                  {new Date(batch.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <PatientModal
        patientId={selectedPatientId}
        open={!!selectedPatientId}
        onClose={() => setSelectedPatientId(null)}
      />
    </div>
  )
}
