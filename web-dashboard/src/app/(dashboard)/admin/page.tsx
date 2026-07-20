"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/auth/useAuth"
import { useDashboard } from "@/hooks/query/useDashboard"
import { usePatients } from "@/hooks/query/usePatients"
import { useAdminAnalytics } from "@/hooks/query/useAdmin"
import { ROUTES } from "@/constants"
import { STAGE_ORDER, STAGE_LABELS } from "@/types"
import {
  Columns3,
  Users,
  CheckSquare,
  AlertTriangle,
  Flag,
  Activity,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { data: summary } = useDashboard()
  const { data: patients } = usePatients()
  const { data: analytics } = useAdminAnalytics()

  const totalPatients = patients?.length || 0
  const patientsByStage =
    patients?.reduce(
      (acc, p) => {
        acc[p.stage] = (acc[p.stage] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    ) || {}

  const quickActions = [
    { label: "Board", icon: Columns3, href: ROUTES.ADMIN.BOARD, desc: "Full pipeline view" },
    { label: "Users", icon: Users, href: ROUTES.ADMIN.USERS, desc: "Manage team accounts" },
    { label: "Checklist", icon: CheckSquare, href: ROUTES.ADMIN.CHECKLIST, desc: "Configure checklist items" },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-[#1a1a1a]">
          Admin Dashboard
        </h1>
        <p className="text-sm text-[#8B8D92] mt-0.5">
          Welcome back, {user?.name?.split(" ")[0]}
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#EADEC0] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EBF7EC] flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#036638]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a1a1a]">{totalPatients}</p>
              <p className="text-xs text-[#8B8D92]">Total Patients</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EADEC0] p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              summary?.staleCount && summary.staleCount > 0 ? "bg-[#FEFCE8]" : "bg-[#EBF7EC]",
            )}>
              <AlertTriangle className={cn(
                "w-5 h-5",
                summary?.staleCount && summary.staleCount > 0 ? "text-amber-500" : "text-[#036638]",
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a1a1a]">{summary?.staleCount || 0}</p>
              <p className="text-xs text-[#8B8D92]">Stale</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EADEC0] p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              summary?.flaggedCount && summary.flaggedCount > 0 ? "bg-[#FEF2F2]" : "bg-[#EBF7EC]",
            )}>
              <Flag className={cn(
                "w-5 h-5",
                summary?.flaggedCount && summary.flaggedCount > 0 ? "text-[#E8792E]" : "text-[#036638]",
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a1a1a]">{summary?.flaggedCount || 0}</p>
              <p className="text-xs text-[#8B8D92]">Flagged</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EADEC0] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EBF7EC] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#036638]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a1a1a]">{analytics?.reconciledThisWeek || 0}</p>
              <p className="text-xs text-[#8B8D92]">Reconciled/Week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Nav */}
      <div>
        <h2 className="text-sm font-semibold text-[#1a1a1a] mb-3">Quick Navigation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.href}
                onClick={() => router.push(action.href)}
                className="bg-white rounded-xl border border-[#EADEC0] p-4 text-left hover:border-[#65BD6C]/40 hover:shadow-sm transition-all text-center"
              >
                <Icon className="w-6 h-6 text-[#036638] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#1a1a1a]">{action.label}</p>
                <p className="text-xs text-[#8B8D92] mt-0.5">{action.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Pipeline Overview + VA Load */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#EADEC0] p-5">
          <h2 className="text-sm font-bold text-[#036638] mb-4">Pipeline Overview</h2>
          <div className="space-y-3">
            {STAGE_ORDER.map((stage) => {
              const count = patientsByStage[stage] || 0
              const maxCount = Math.max(...Object.values(patientsByStage), 1)
              const barWidth = (count / maxCount) * 100
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-xs text-[#8B8D92] w-28 truncate shrink-0">
                    {STAGE_LABELS[stage]}
                  </span>
                  <div className="flex-1 h-5 bg-[#EBF7EC] rounded-full overflow-hidden">
                    {count > 0 && (
                      <div
                        className="h-full bg-[#036638] rounded-full transition-all"
                        style={{ width: `${Math.max(barWidth, 8)}%` }}
                      />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-[#1a1a1a] w-6 text-right">
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EADEC0] p-5">
          <h2 className="text-sm font-bold text-[#036638] mb-4">VA Workload</h2>
          {analytics?.vaLoad && analytics.vaLoad.length > 0 ? (
            <div className="space-y-3">
              {analytics.vaLoad.map((va) => (
                <div key={va.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#EBF7EC] flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#036638]">
                      {va.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1a1a] truncate">{va.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-[#EBF7EC] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#65BD6C] rounded-full"
                          style={{
                            width: `${Math.min(
                              (va.patientCount / Math.max(...analytics.vaLoad.map((v) => v.patientCount), 1)) *
                                100,
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[#1a1a1a]">
                        {va.patientCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#8B8D92] italic">No VA data available</p>
          )}
        </div>
      </div>
    </div>
  )
}
