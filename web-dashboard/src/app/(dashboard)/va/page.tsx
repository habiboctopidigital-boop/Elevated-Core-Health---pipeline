"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/auth/useAuth"
import { useDashboard } from "@/hooks/query/useDashboard"
import { usePatients } from "@/hooks/query/usePatients"
import { ROUTES } from "@/constants"
import { STAGE_ORDER, STAGE_LABELS } from "@/types"
import {
  Columns3,
  ClipboardList,
  ScrollText,
  AlertTriangle,
  Flag,
  CheckCircle2,
  Clock,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function VADashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { data: summary } = useDashboard()
  const { data: patients } = usePatients()

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
    { label: "Board", icon: Columns3, href: ROUTES.VA.BOARD, desc: "Kanban pipeline view" },
    { label: "Handoff Log", icon: ClipboardList, href: ROUTES.VA.LOG, desc: "Activity history" },
    { label: "SOP Reference", icon: ScrollText, href: ROUTES.VA.SOP, desc: "Standard procedures" },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-[#1a1a1a]">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-[#8B8D92] mt-0.5">
          Here&apos;s your pipeline overview
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              summary?.staleCount && summary.staleCount > 0
                ? "bg-[#FEFCE8]"
                : "bg-[#EBF7EC]",
            )}>
              {summary?.staleCount && summary.staleCount > 0 ? (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-[#036638]" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a1a1a]">{summary?.staleCount || 0}</p>
              <p className="text-xs text-[#8B8D92]">Stale Cards</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EADEC0] p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              summary?.flaggedCount && summary.flaggedCount > 0
                ? "bg-[#FEF2F2]"
                : "bg-[#EBF7EC]",
            )}>
              {summary?.flaggedCount && summary.flaggedCount > 0 ? (
                <Flag className="w-5 h-5 text-[#E8792E]" fill="#E8792E" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-[#036638]" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a1a1a]">{summary?.flaggedCount || 0}</p>
              <p className="text-xs text-[#8B8D92]">Flagged Cards</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
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

      {/* Pipeline Overview */}
      <div>
        <h2 className="text-sm font-semibold text-[#1a1a1a] mb-3">Pipeline Overview</h2>
        <div className="bg-white rounded-xl border border-[#EADEC0] p-4">
          <div className="space-y-3">
            {STAGE_ORDER.map((stage) => {
              const count = patientsByStage[stage] || 0
              const maxCount = Math.max(...Object.values(patientsByStage), 1)
              const barWidth = (count / maxCount) * 100
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-xs text-[#8B8D92] w-24 truncate shrink-0">
                    {STAGE_LABELS[stage]}
                  </span>
                  <div className="flex-1 h-6 bg-[#EBF7EC] rounded-full overflow-hidden">
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
      </div>
    </div>
  )
}
