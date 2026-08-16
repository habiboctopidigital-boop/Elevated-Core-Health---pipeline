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
  Users,
  ArrowRight,
  Clock,
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
      {/* - Hero header - */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#036638] via-[#0a7a44] to-emerald-600 px-6 py-6 sm:px-8 shadow-lg shadow-emerald-900/20">
        <div className="absolute -right-14 -top-20 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -right-4 -top-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-32 -bottom-24 w-56 h-56 rounded-full bg-[#FBE7B2]/10 pointer-events-none" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center shrink-0 shadow-lg shadow-black/5">
              <ContactIcon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white text-[10px] font-bold uppercase tracking-widest ring-1 ring-white/20">
                  <Users className="w-3 h-3" />
                  Contacts
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#FBE7B2] text-[#7a5f14] text-[10px] font-bold">
                  {data?.total ?? 0} contacts
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                CRM Management
              </h1>
              <p className="text-emerald-50/85 text-sm mt-1">
                Load, import and manage patient contacts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={loadFromCrm}
              className="text-xs gap-1.5 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white hover:border-white/30 rounded-xl h-9"
            >
              <CloudDownload className="w-3.5 h-3.5" />
              Load from CRM
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exportContacts.isPending}
              className="text-xs gap-1.5 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white hover:border-white/30 rounded-xl h-9"
            >
              <Download className="w-3.5 h-3.5" />
              {exportContacts.isPending ? "Exporting..." : "Export CSV"}
            </Button>
            <div className="[&>button]:bg-white [&>button]:text-[#036638] [&>button]:hover:bg-emerald-50 [&>button]:hover:text-[#036638] [&>button]:border-0 [&>button]:font-semibold [&>button]:rounded-xl [&>button]:h-9 [&>button]:shadow-lg [&>button]:shadow-black/10">
              <ImportDialog />
            </div>
          </div>
        </div>
      </div>

      {/* - Filters - */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-3 sm:p-4 flex flex-wrap items-center gap-3 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search name, phone, email, location..."
            value={search}
            onChange={(e) => applySearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAF9] text-sm text-[#1A1B1E] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#036638]/25 focus:border-[#036638]/50 focus:bg-white transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="h-10 px-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAF9] text-sm text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/25 appearance-none cursor-pointer"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={stageFilter}
          onChange={(e) => { setStageFilter(e.target.value); setPage(1) }}
          className="h-10 px-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAF9] text-sm text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/25 appearance-none cursor-pointer"
        >
          <option value="">All stages</option>
          {Object.entries(stageLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={eligFilter}
          onChange={(e) => { setEligFilter(e.target.value); setPage(1) }}
          className="h-10 px-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAF9] text-sm text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/25 appearance-none cursor-pointer"
        >
          <option value="">All eligibility</option>
          <option value="eligible">Eligible</option>
          <option value="not_eligible">Not Eligible</option>
          <option value="not_checked">Not Checked</option>
        </select>
      </div>

      {/* - Contacts table - */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#E5E7EB] bg-gradient-to-r from-[#F9FAFB] to-white">
          <Users className="w-4 h-4 text-[#036638]" />
          <h2 className="text-sm font-bold text-[#036638]">Patient Contacts</h2>
          <span className="ml-auto text-[11px] text-[#6B7280]">
            Click a row to open the patient
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-5 py-3">First Name</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Last Name</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Phone</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Email</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Location</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Stage</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Eligibility</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Assigned VA</th>
                <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-5 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <Loader2 className="w-6 h-6 text-[#036638] animate-spin mx-auto" />
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-sm text-[#6B7280]">
                    No contacts found
                  </td>
                </tr>
              ) : (
                contacts.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className="border-b border-[#E5E7EB]/50 last:border-0 hover:bg-[#EBF7EC]/30 transition-colors cursor-pointer group"
                  >
                      <td className="px-4 py-3 text-sm text-[#374151] truncate">{patient.firstName || ""}</td>
                 
                    <td className="px-4 py-3 text-xs text-[#374151] whitespace-nowrap">{patient.phone || ""}</td>
                    <td className="px-4 py-3 text-xs text-[#374151] max-w-[200px] truncate">{patient.email || ""}</td>
                    <td className="px-4 py-3 text-xs text-[#374151]">{patient.location || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold bg-[#EBF7EC] text-[#036638] px-2.5 py-1 rounded-full">
                        {stageLabels[patient.stage] || patient.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize", STATUS_STYLES[patient.status])}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full border", ELIG_STYLES[patient.eligibilityStatus])}>
                        {patient.eligibilityStatus === "not_checked" ? "Not Checked" : patient.eligibilityStatus === "eligible" ? "Eligible" : "Not Eligible"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#374151]">
                      {patient.assignedUser ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-[#EBF7EC] flex items-center justify-center">
                            <span className="text-[9px] font-bold text-[#036638]">
                              {patient.assignedUser.name.charAt(0).toUpperCase()}
                            </span>
                          </span>
                          {patient.assignedUser.name}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#6B7280] whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-[#9CA3AF]" />
                        {new Date(patient.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-[#E5E7EB] bg-[#F9FAFB]/60">
            <span className="text-xs text-[#6B7280] hidden sm:block">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2 mx-auto sm:mx-0">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 h-8 rounded-lg border border-[#E5E7EB] bg-white text-xs font-semibold text-[#1A1B1E] disabled:opacity-40 hover:border-[#65BD6C]/40 hover:text-[#036638] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 h-8 rounded-lg border border-[#E5E7EB] bg-white text-xs font-semibold text-[#1A1B1E] disabled:opacity-40 hover:border-[#65BD6C]/40 hover:text-[#036638] transition-colors cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* - Import history - */}
      {batches && batches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-[#1A1B1E] flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#036638]" />
              Import History
            </h2>
            <span className="h-px flex-1 bg-[#E5E7EB]/70" />
            <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB] divide-y divide-[#E5E7EB]/60 overflow-hidden shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
            {batches.slice(0, 8).map((batch) => (
              <div key={batch.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors">
                <div className="w-9 h-9 rounded-xl bg-[#EBF7EC] flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4 text-[#036638]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#374151] truncate">{batch.fileName}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5 truncate">
                    {batch.totalRows} rows · {batch.successCount} imported · {batch.duplicateCount} duplicates · {batch.failCount} failed
                    {batch.importedByUser ? ` · by ${batch.importedByUser.name}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0",
                    batch.failCount > 0
                      ? "bg-amber-50 text-amber-700"
                      : "bg-[#EBF7EC] text-[#036638]",
                  )}
                >
                  {batch.status === "completed_with_errors" ? "With errors" : "Completed"}
                </span>
                <span className="text-xs text-[#6B7280] whitespace-nowrap shrink-0">
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
