"use client"

import { useEffect, useMemo, useState } from "react"
import { isToday, isYesterday, format } from "date-fns"
import {
  Search,
  Loader2,
  AlertTriangle,
  RefreshCw,
  X,
  ArrowRightLeft,
  CheckSquare,
  Square,
  UserCog,
  UserCheck,
  MessageSquare,
  Flag,
  FlagOff,
  ShieldCheck,
  UserPlus,
  Pencil,
  Lock,
  Unlock,
  Activity,
  ChevronDown,
} from "lucide-react"
import { toast } from "sonner"
import { useActivityLog } from "@/hooks/query/useActivityLog"
import { useAllUsers } from "@/hooks/query/useUsers"
import { useStageMeta } from "@/hooks/query/useStages"
import { PatientModal } from "@/components/features/patient-modal"
import type { ActivityLog } from "@/types"
import { cn } from "@/lib/utils"

const ACTION_META: Record<string, { label: string; icon: typeof Activity; color: string }> = {
  "stage.move": { label: "Stage Move", icon: ArrowRightLeft, color: "#036638" },
  "checklist.toggle": { label: "Checklist", icon: CheckSquare, color: "#0F9B8E" },
  "assignment.change": { label: "Assignment", icon: UserCog, color: "#7C3AED" },
  "assignment.claim": { label: "Claim", icon: UserCheck, color: "#7C3AED" },
  "notes.update": { label: "Notes", icon: MessageSquare, color: "#6B7280" },
  "flag.create": { label: "Flag Raised", icon: Flag, color: "#DC2626" },
  "flag.clear": { label: "Flag Cleared", icon: FlagOff, color: "#16A34A" },
  "eligibility.check": { label: "Eligibility", icon: ShieldCheck, color: "#0891B2" },
  "patient.create": { label: "Patient Created", icon: UserPlus, color: "#036638" },
  "patient.update": { label: "Details Updated", icon: Pencil, color: "#6B7280" },
  "status.update": { label: "Status", icon: RefreshCw, color: "#D97706" },
  "lock.set": { label: "Locked", icon: Lock, color: "#D97706" },
  "lock.clear": { label: "Unlocked", icon: Unlock, color: "#16A34A" },
}

const ACTION_OPTIONS = Object.entries(ACTION_META).map(([value, meta]) => ({ value, label: meta.label }))

function actionMeta(action?: string | null) {
  return (action && ACTION_META[action]) || { label: action || "Activity", icon: Activity, color: "#6B7280" }
}

function timeOnly(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function dayGroupLabel(dateStr: string): string {
  const d = new Date(dateStr)
  if (isToday(d)) return "Today"
  if (isYesterday(d)) return "Yesterday"
  return format(d, "EEEE, MMM d, yyyy")
}

function roleBadge(role?: string | null) {
  if (!role) return null
  const isAdmin = role === "admin"
  return (
    <span
      className={cn(
        "text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full",
        isAdmin ? "bg-[#036638]/10 text-[#036638]" : "bg-[#EBF7EC] text-[#3E9C4A]",
      )}
    >
      {isAdmin ? "Admin" : "VA"}
    </span>
  )
}

/** Human-readable summary of what changed, tailored per action type. */
function DiffSummary({ log, stageLabels }: { log: ActivityLog; stageLabels: Record<string, string> }) {
  const prev = log.prevValue as Record<string, unknown> | null
  const next = log.newValue as Record<string, unknown> | null

  if (log.action === "stage.move" && prev && next) {
    const from = stageLabels[String(prev.stage)] || String(prev.stage)
    const to = stageLabels[String(next.stage)] || String(next.stage)
    return (
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] flex-wrap">
        <span className="text-[#6B7280] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">{from}</span>
        <ArrowRightLeft className="w-2.5 h-2.5 text-[#9CA3AF]" />
        <span className="text-[#036638] bg-[#EBF7EC] border border-[#65BD6C]/30 font-medium rounded px-1.5 py-0.5">
          {to}
        </span>
      </div>
    )
  }

  if (log.action === "checklist.toggle" && next) {
    const checked = next.checked === true
    const label = (log.metadata as Record<string, unknown> | null)?.label as string | undefined
    return (
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
        {checked ? (
          <CheckSquare className="w-3 h-3 text-emerald-500 shrink-0" />
        ) : (
          <Square className="w-3 h-3 text-gray-400 shrink-0" />
        )}
        <span className={cn("truncate", checked ? "text-gray-500" : "text-[#1A1B1E] font-medium")}>
          {label ?? "Checklist item"}
        </span>
      </div>
    )
  }

  if (log.action === "assignment.change" && prev !== undefined) {
    const toName = (next as Record<string, unknown> | null)?.name as string | undefined
    return (
      <div className="mt-1.5 text-[11px] text-[#6B7280]">
        Now assigned to <span className="font-semibold text-[#036638]">{toName ?? "Unassigned"}</span>
      </div>
    )
  }

  // Generic fallback: show up to 3 changed keys as prev -> new chips
  if (prev && next) {
    const keys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)])).slice(0, 3)
    if (keys.length === 0) return null
    return (
      <div className="mt-1.5 space-y-1">
        {keys.map((k) => {
          const pv = prev[k]
          const nv = next[k]
          const fmt = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v))
          if (fmt(pv) === fmt(nv)) return null
          return (
            <div key={k} className="flex items-center gap-2 text-[11px]">
              <span className="text-[#9CA3AF] w-20 shrink-0 truncate capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
              <span className="text-red-600 bg-red-50 rounded px-1.5 py-0.5 max-w-[160px] truncate">{fmt(pv)}</span>
              <span className="text-[#9CA3AF]">→</span>
              <span className="text-green-700 bg-green-50 rounded px-1.5 py-0.5 max-w-[160px] truncate">{fmt(nv)}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return null
}

export function HandoffLog() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("")
  const [actionFilter, setActionFilter] = useState<string>("")
  const [actorFilter, setActorFilter] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)

  const { labels: stageLabels } = useStageMeta()
  const { data: users } = useAllUsers()

  const { data, isLoading, isError, error, refetch, isFetching } = useActivityLog({
    page,
    limit: 30,
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(actorFilter ? { actorId: actorFilter } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  })

  useEffect(() => {
    if (isError) {
      toast.error((error as any)?.response?.data?.message || (error as Error)?.message || "Failed to load activity log")
    }
  }, [isError, error])

  const logs = data?.logs || []
  const totalPages = data?.totalPages || 1
  const total = data?.total ?? 0

  const filteredLogs = useMemo(
    () => logs.filter((log) => !search || log.patient?.name?.toLowerCase().includes(search.toLowerCase())),
    [logs, search],
  )

  const grouped = useMemo(() => {
    const groups: { label: string; items: ActivityLog[] }[] = []
    for (const log of filteredLogs) {
      const label = dayGroupLabel(log.createdAt)
      const last = groups[groups.length - 1]
      if (last && last.label === label) {
        last.items.push(log)
      } else {
        groups.push({ label, items: [log] })
      }
    }
    return groups
  }, [filteredLogs])

  const activeFilterCount = [typeFilter, actionFilter, actorFilter, startDate, endDate].filter(Boolean).length

  const clearFilters = () => {
    setTypeFilter("")
    setActionFilter("")
    setActorFilter("")
    setStartDate("")
    setEndDate("")
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1A1B1E] flex items-center gap-2">
            Activity Log
            {isFetching && !isLoading && <Loader2 className="w-3.5 h-3.5 text-[#65BD6C] animate-spin" />}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Every stage move, checklist change, assignment, and flag — who did it, when, and what changed
          </p>
        </div>
        {total > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-xs font-semibold text-[#036638]">
            {total} total {total === 1 ? "entry" : "entries"}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search by patient name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] transition-all"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setPage(1)
            }}
            className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/30 appearance-none cursor-pointer"
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(1)
            }}
            className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/30 appearance-none cursor-pointer"
          >
            <option value="">All types</option>
            <option value="manual">Manual</option>
            <option value="auto">Auto</option>
          </select>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={cn(
              "flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-colors",
              showFilters || activeFilterCount > 0
                ? "border-[#036638] bg-[#EBF7EC] text-[#036638]"
                : "border-[#E5E7EB] bg-white text-[#1A1B1E] hover:border-[#65BD6C]/40",
            )}
          >
            More filters
            {activeFilterCount > 0 && (
              <span className="bg-[#036638] text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showFilters && "rotate-180")} />
          </button>
          {(activeFilterCount > 0 || search) && (
            <button
              onClick={() => {
                clearFilters()
                setSearch("")
              }}
              className="flex items-center gap-1 text-xs font-medium text-[#6B7280] hover:text-red-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear all
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-[#E5E7EB]/60">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-[#6B7280] font-medium">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(1)
                }}
                className="h-9 px-2.5 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-[#6B7280] font-medium">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(1)
                }}
                className="h-9 px-2.5 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-[#6B7280] font-medium">User</label>
              <select
                value={actorFilter}
                onChange={(e) => {
                  setActorFilter(e.target.value)
                  setPage(1)
                }}
                className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/30 appearance-none cursor-pointer min-w-[160px]"
              >
                <option value="">All users</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === "admin" ? "Admin" : "VA"})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-[#E5E7EB]/50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm text-red-600 font-medium">Failed to load activity log</p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#036638] text-white text-xs font-medium hover:bg-[#025030] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div>
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="sticky top-0 z-10 px-4 py-1.5 bg-[#F9FAFB] border-y border-[#E5E7EB]/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    {group.label}
                  </span>
                </div>
                <div className="divide-y divide-[#E5E7EB]/50">
                  {group.items.map((log) => {
                    const meta = actionMeta(log.action)
                    const Icon = meta.icon
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 px-4 py-3.5 hover:bg-[#EBF7EC]/30 transition-colors"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: `${meta.color}1A` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: meta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-[#1A1B1E]">{log.author}</span>
                            {roleBadge(log.actor?.role)}
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                            >
                              {meta.label}
                            </span>
                            {log.type === "auto" && (
                              <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                                Auto
                              </span>
                            )}
                            <span className="text-xs text-[#9CA3AF] ml-auto shrink-0">{timeOnly(log.createdAt)}</span>
                          </div>
                          <p className="text-sm text-[#374151] mt-0.5">{log.message}</p>
                          <DiffSummary log={log} stageLabels={stageLabels} />
                          {log.patient && (
                            <button
                              onClick={() => setSelectedPatientId(log.patient!.id)}
                              className="text-xs text-[#036638] hover:underline mt-1 font-medium"
                            >
                              {log.patient.name}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Activity className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
            <p className="text-sm text-[#6B7280] font-medium">
              {activeFilterCount > 0 || search ? "No activity matches these filters" : "No activity log entries yet"}
            </p>
            {(activeFilterCount > 0 || search) && (
              <button
                onClick={() => {
                  clearFilters()
                  setSearch("")
                }}
                className="text-xs text-[#036638] hover:underline mt-1 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] bg-white text-[#1A1B1E] disabled:opacity-40 hover:border-[#65BD6C]/40 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-[#6B7280]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] bg-white text-[#1A1B1E] disabled:opacity-40 hover:border-[#65BD6C]/40 transition-colors"
          >
            Next
          </button>
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
