"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Columns3,
  ClipboardList,
  Users,
  Settings,
  Contact,
  ScrollText,
  ShieldCheck,
  BarChart3,
  LogOut,
  User,
  Loader2,
  ChevronLeft,
  RulerIcon,
  ChevronRight,
  CalendarDays,
  X,
  NotebookText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants"
import { useAuth } from "@/hooks/auth/useAuth"

const VA_NAV = [
  { section: "Main", items: [
    { href: ROUTES.DASHBOARD.HOME, icon: LayoutDashboard, label: "Dashboard" },
    { href: ROUTES.DASHBOARD.BOARD, icon: Columns3, label: "Pipeline Board" },
  ]},
  { section: "Operations", items: [
    { href: ROUTES.DASHBOARD.WORKLOAD, icon: CalendarDays, label: "Workload" },
    { href: ROUTES.DASHBOARD.LOG, icon: ClipboardList, label: "Activity Log" },
    { href: ROUTES.DASHBOARD.REPORTING, icon: BarChart3, label: "My Report" },
  ]},
  { section: "Reference", items: [
    { href: ROUTES.DASHBOARD.SOP, icon: ScrollText, label: "SOP Guide" },
  ]},
]

const ADMIN_NAV = [
  { section: "Main", items: [
    { href: ROUTES.ADMIN.HOME, icon: LayoutDashboard, label: "Dashboard" },
    { href: ROUTES.ADMIN.BOARD, icon: Columns3, label: "Pipeline Board" },
  ]},
  { section: "Operations", items: [
    { href: ROUTES.ADMIN.WORKLOAD, icon: CalendarDays, label: "Workload" },
    { href: ROUTES.ADMIN.LOG, icon: ClipboardList, label: "Activity Log" },
    { href: ROUTES.ADMIN.REPORTING, icon: BarChart3, label: "Reporting" },
  ]},
  { section: "Management", items: [
    { href: ROUTES.ADMIN.USERS, icon: Users, label: "Users" },
    { href: ROUTES.ADMIN.STAGES, icon: Settings, label: "Stage Settings" },
    { href: ROUTES.ADMIN.CRM, icon: Contact, label: "CRM Integration" },
    { href: ROUTES.ADMIN.ELIGIBILITY, icon: ShieldCheck, label: "Eligibility" },
  ]},
  { section: "Configuration", items: [
    { href: ROUTES.ADMIN.APP_SETTINGS, icon: Settings, label: "App Settings" },
    { href: ROUTES.ADMIN.SOP, icon: NotebookText, label: "Sop Guide" },
  ]},
]

interface EchSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  /** Passed only by the mobile drawer instance — renders an explicit close (X) button. */
  onMobileClose?: () => void;
}

export function EchSidebar({ isCollapsed, setIsCollapsed, onMobileClose }: EchSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const isAdmin = user?.role === "admin"
  const navItems = isAdmin ? ADMIN_NAV : VA_NAV
  const profileRoute = isAdmin ? ROUTES.ADMIN.PROFILE : ROUTES.DASHBOARD.PROFILE
  const isProfileActive = pathname === profileRoute
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      router.push(ROUTES.LOGIN)
    }
  }

  return (
    <aside className={cn(
      "shrink-0 bg-[#0F1115]/90 backdrop-blur-2xl flex flex-col h-screen fixed left-0 top-0 z-30 transition-all duration-300 border-r border-white/10 shadow-[4px_0_24px_rgba(0,0,0,0.2)]",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className={cn(
        "flex items-center justify-between border-b border-white/5 relative transition-all duration-300 px-3",
        isCollapsed ? "h-20 w-20" : "h-20 w-64"
      )}>
        <div className={cn(
          "flex items-center transition-all duration-300",
          isCollapsed ? "justify-center w-full" : "justify-start gap-3 w-full"
        )}>
          {/* Logo */}
          <div className={cn(
            "flex-shrink-0 flex items-center justify-center transition-all duration-300",
            isCollapsed ? "w-16 h-16" : "w-16 h-16"
          )}>
            <img
              src="/logo.png"
              alt="Elevated Core Health"
              width={isCollapsed ? 64 : 64}
              className="w-16 h-16 object-contain"
            />
          </div>

          {/* Text */}
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-[12px] font-bold tracking-tight leading-tight">Elevated Health</p>
              <p className="text-[#65BD6C] text-[8px] font-semibold uppercase tracking-widest leading-tight mt-0.5">Care Dashboard</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#2D3139] border border-white/10 rounded-full items-center justify-center text-gray-400 hover:text-white hover:bg-[#3E434D] transition-colors z-40 hidden lg:flex"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            aria-label="Close menu"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-6 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {navItems.map((section) => (
          <div key={section.section} className="space-y-2">
            {/* Section Header */}
            {!isCollapsed && (
              <h3 className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#65BD6C]/70 transition-all duration-200">
                {section.section}
              </h3>
            )}

            {/* Section Items */}
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-lg text-sm font-medium transition-all duration-200 group",
                      isCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2 gap-3",
                      isActive
                        ? "bg-gradient-to-r from-[#036638] to-[#025030] text-white shadow-[0_4px_12px_rgba(3,102,56,0.25)] border border-[#65BD6C]/20"
                        : "text-[#9CA3AF] hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10",
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 flex-shrink-0 transition-all duration-200",
                        isActive ? "text-[#65BD6C]" : "group-hover:scale-110"
                      )}
                      strokeWidth={1.8}
                    />
                    {!isCollapsed && (
                      <span className="group-hover:translate-x-0.5 transition-transform duration-200">
                        {item.label}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/5 bg-gradient-to-t from-[#0F1115] to-transparent space-y-3">
        {/* Profile Card */}
        <Link
          href={profileRoute}
          title={isCollapsed ? "View profile" : undefined}
          className={cn(
            "flex items-center rounded-lg transition-all duration-200 group",
            isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-2.5 py-2.5 border",
            isProfileActive
              ? "bg-gradient-to-r from-[#036638]/20 to-[#025030]/10 border-[#65BD6C]/30"
              : "border-white/5 hover:border-white/10 hover:bg-white/5",
          )}
        >
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border font-semibold text-white transition-all duration-200 overflow-hidden",
            isProfileActive
              ? "bg-gradient-to-br from-[#036638] to-[#025030] border-[#65BD6C]/50"
              : "bg-gradient-to-br from-[#1F2937] to-[#111827] border-white/10 group-hover:border-[#65BD6C]/50",
          )}>
            {user?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote avatar, no static optimization needed
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0).toUpperCase() || "U"
            )}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-gray-100 text-sm font-semibold truncate leading-tight">
                {user?.name}
              </p>
              <p className="text-[#9CA3AF] text-[10px] truncate uppercase font-bold tracking-wide mt-1">
                {user?.role === "va" ? "Virtual Assistant" : "Administrator"}
              </p>
            </div>
          )}
        </Link>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            "w-full h-8 text-xs font-medium transition-all duration-200 border",
            isCollapsed
              ? "px-0 justify-center bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-300 hover:text-red-200"
              : "justify-start gap-2.5 px-2.5 bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-300 hover:text-red-200",
          )}
          title={isCollapsed ? "Sign out" : undefined}
        >
          {loggingOut ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
              {!isCollapsed && <span>Signing out...</span>}
            </>
          ) : (
            <>
              <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
              {!isCollapsed && <span>Sign out</span>}
            </>
          )}
        </Button>
      </div>

      
    </aside>
  )
}
