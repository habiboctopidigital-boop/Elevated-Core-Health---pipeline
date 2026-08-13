"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/auth/useAuth"
import { useDashboard } from "@/hooks/query/useDashboard"
import { usePatients } from "@/hooks/query/usePatients"
import { useStageMeta } from "@/hooks/query/useStages"
import { SplashLoader } from "@/components/ui/splash-loader"
import { ROUTES } from "@/constants"
import {
  Columns3,
  ClipboardList,
  ScrollText,
  AlertTriangle,
  Flag,
  Activity,
  User,
  ArrowRight,
  CalendarDays,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function VADashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { data: summary } = useDashboard()
  const { data: patients } = usePatients()
  const { order: stageOrder, labels: stageLabels } = useStageMeta()

  const totalPatients = patients?.length || 0
  const patientsByStage =
    patients?.reduce(
      (acc, p) => {
        acc[p.stage] = (acc[p.stage] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    ) || {}

  const maxStageCount = Math.max(...Object.values(patientsByStage), 1)

  const quickActions = [
    { label: "Board", icon: Columns3, href: ROUTES.DASHBOARD.BOARD, desc: "Kanban pipeline view", tint: "from-[#036638] to-emerald-600" },
    { label: "Handoff Log", icon: ClipboardList, href: ROUTES.DASHBOARD.LOG, desc: "Activity history", tint: "from-[#3B82C4] to-sky-500" },
    { label: "SOP Reference", icon: ScrollText, href: ROUTES.DASHBOARD.SOP, desc: "Standard procedures", tint: "from-[#F2A93B] to-amber-500" },
    { label: "Profile", icon: User, href: ROUTES.DASHBOARD.PROFILE, desc: "Update your profile", tint: "from-[#E15C4E] to-rose-500" },
  ]

  const isLoading = !summary || !patients

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const statCards = [
    {
      label: "Total Patients",
      value: totalPatients,
      icon: Activity,
      iconBg: "bg-[#EBF7EC]",
      iconColor: "text-[#036638]",
      accent: "from-[#036638]/10 to-transparent",
      sub: "Across all pipeline stages",
    },
    {
      label: "Stale Cards",
      value: summary?.staleCount || 0,
      icon: AlertTriangle,
      iconBg: summary?.staleCount ? "bg-amber-50" : "bg-[#EBF7EC]",
      iconColor: summary?.staleCount ? "text-amber-500" : "text-[#036638]",
      accent: "from-amber-400/10 to-transparent",
      sub: summary?.staleCount ? "Needs your attention" : "All caught up",
    },
    {
      label: "Flagged Cards",
      value: summary?.flaggedCount || 0,
      icon: Flag,
      iconBg: summary?.flaggedCount ? "bg-[#FEF2F2]" : "bg-[#EBF7EC]",
      iconColor: "text-[#036638]",
      accent: "from-[#65BD6C]/10 to-transparent",
      sub: summary?.flaggedCount ? "Awaiting admin review" : "No open flags",
    },
  ]

  return (
    <>
      {isLoading && (
        <SplashLoader
          show={true}
          message="Loading"
          subtitle="Setting up your workspace..."
        />
      )}
      <div className="relative z-10 space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* - Hero header - */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#036638] via-[#0a7a44] to-emerald-600 px-6 py-6 sm:px-8 shadow-lg shadow-emerald-900/20">
          {/* Decorative blobs */}
          <div className="absolute -right-14 -top-20 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -right-4 -top-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute right-32 -bottom-24 w-56 h-56 rounded-full bg-[#FBE7B2]/10 pointer-events-none" />

          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white text-[10px] font-bold uppercase tracking-widest ring-1 ring-white/20">
                  <Activity className="w-3 h-3" />
                  My Dashboard
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FBE7B2] text-[#7a5f14] text-[10px] font-bold">
                  <CalendarDays className="w-3 h-3" />
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {greeting}, {user?.name?.split(" ")[0]}
              </h1>
              <p className="text-emerald-50/85 text-sm mt-1">
                Here&apos;s your pipeline overview
              </p>
            </div>
            <Button
              onClick={() => router.push(ROUTES.DASHBOARD.BOARD)}
              className="bg-white text-[#036638] hover:bg-emerald-50 font-semibold gap-2 rounded-xl h-10 px-5 shadow-lg shadow-black/10"
            >
              Open Board
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* - Status Cards - */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.label}
                className="group relative overflow-hidden bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className={cn("absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300", card.accent)} />
                <div className="flex items-center gap-3.5 relative">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-black/5", card.iconBg)}>
                    <Icon className={cn("w-5 h-5", card.iconColor)} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-extrabold text-[#1A1B1E] leading-none tabular-nums">{card.value}</p>
                    <p className="text-xs font-medium text-[#6B7280] mt-1 truncate">{card.label}</p>
                  </div>
                </div>
                <p className="text-[11px] text-[#9CA3AF] mt-3 relative">{card.sub}</p>
              </div>
            )
          })}
        </div>

        {/* - Quick Actions - */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-[#1A1B1E]">Quick Navigation</h2>
            <span className="h-px flex-1 bg-[#E5E7EB]/70" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.href}
                  onClick={() => router.push(action.href)}
                  className="group bg-white rounded-2xl border border-[#E5E7EB] p-4 text-left hover:border-[#65BD6C]/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                >
                  <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-sm", action.tint)}>
                    <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <p className="text-sm font-bold text-[#1A1B1E] flex items-center gap-1">
                    {action.label}
                    <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF] opacity-0 group-hover:opacity-100 group-hover:text-[#036638] -translate-x-1 group-hover:translate-x-0 transition-all" />
                  </p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{action.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* - Pipeline Overview - */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-[#1A1B1E]">Pipeline Overview</h2>
            <span className="h-px flex-1 bg-[#E5E7EB]/70" />
            <span className="text-[11px] text-[#6B7280]">{totalPatients} total</span>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
              {stageOrder.map((stage) => {
                const count = patientsByStage[stage] || 0
                const pct = Math.round((count / maxStageCount) * 100)
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-36 shrink-0">
                      <div className="w-6 h-6 rounded-lg bg-[#EBF7EC] flex items-center justify-center shrink-0">
                        <Users className="w-3 h-3 text-[#036638]" />
                      </div>
                      <span className="text-xs font-medium text-[#374151] truncate">
                        {stageLabels[stage]}
                      </span>
                    </div>
                    <div className="flex-1 h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#036638] to-[#65BD6C] rounded-full transition-all duration-500"
                        style={{ width: count > 0 ? `${Math.max(pct, 5)}%` : "0%" }}
                      />
                    </div>
                    <span className={cn(
                      "text-xs font-bold w-9 text-right tabular-nums shrink-0",
                      count > 0 ? "text-[#036638]" : "text-[#9CA3AF]",
                    )}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
