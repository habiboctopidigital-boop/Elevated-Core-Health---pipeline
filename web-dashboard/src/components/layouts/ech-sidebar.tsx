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
  ChevronRight,
  CalendarDays,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants"
import { useAuth } from "@/hooks/auth/useAuth"

const VA_NAV = [
  { href: ROUTES.DASHBOARD.HOME, icon: LayoutDashboard, label: "Dashboard" },
  { href: ROUTES.DASHBOARD.BOARD, icon: Columns3, label: "Board" },
  { href: ROUTES.DASHBOARD.WORKLOAD, icon: CalendarDays, label: "Workload" },
  { href: ROUTES.DASHBOARD.LOG, icon: ClipboardList, label: "Activity Log" },
  { href: ROUTES.DASHBOARD.SOP, icon: ScrollText, label: "SOP Reference" },
  { href: ROUTES.DASHBOARD.REPORTING, icon: BarChart3, label: "My Report" },
]

const ADMIN_NAV = [
  { href: ROUTES.ADMIN.HOME, icon: LayoutDashboard, label: "Dashboard" },
  { href: ROUTES.ADMIN.BOARD, icon: Columns3, label: "Board" },
  { href: ROUTES.ADMIN.WORKLOAD, icon: CalendarDays, label: "Workload" },
  { href: ROUTES.ADMIN.LOG, icon: ClipboardList, label: "Activity Log" },
  { href: ROUTES.ADMIN.SOP, icon: ScrollText, label: "SOP Reference" },
  { href: ROUTES.ADMIN.REPORTING, icon: BarChart3, label: "Reporting" },
  { href: ROUTES.ADMIN.USERS, icon: Users, label: "Users" },
  { href: ROUTES.ADMIN.STAGES, icon: Settings, label: "Stage Settings" },
  { href: ROUTES.ADMIN.CRM, icon: Contact, label: "CRM" },
  { href: ROUTES.ADMIN.ELIGIBILITY, icon: ShieldCheck, label: "Eligibility Rules" },
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
        "flex items-center justify-center border-b border-white/5 px-4 relative transition-all duration-300",
        isCollapsed ? "h-20 w-20" : "h-24 w-64"
      )}>
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Elevated Core Health"
              width={40}
              height={40}
              priority
              className="w-10 h-10 object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="text-center leading-tight">
              <p className="text-white text-[13px] font-bold tracking-tight">Elevated Core</p>
              <p className="text-[#65BD6C] text-[9px] font-semibold uppercase tracking-widest">Pipeline Portal</p>
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

      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-xl text-sm font-medium transition-all duration-200",
                isCollapsed ? "justify-center px-0 py-3" : "px-3 py-2.5 gap-3",
                isActive
                  ? "bg-gradient-to-r from-[#036638]/90 to-[#024a28]/80 text-white shadow-[0_4px_16px_rgba(3,102,56,0.3)] border border-white/10"
                  : "text-[#9CA3AF] hover:text-white hover:bg-white/10",
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.8} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/5 bg-[#0F1115] space-y-2">
        <Link
          href={profileRoute}
          title={isCollapsed ? "View profile" : undefined}
          className={cn(
            "flex items-center rounded-lg transition-colors group",
            isCollapsed ? "justify-center px-0 py-2" : "gap-3 px-2 py-2 -mx-2",
            isProfileActive ? "bg-white/5" : "hover:bg-white/5",
          )}
        >
          <div className={cn(
            "w-9 h-9 rounded-full bg-[#374151] flex items-center justify-center flex-shrink-0 border transition-colors",
            isProfileActive ? "border-[#65BD6C]" : "border-white/10 group-hover:border-[#65BD6C]/50",
          )}>
            <span className="text-white text-sm font-semibold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-gray-200 text-sm font-semibold truncate leading-tight group-hover:text-white">{user?.name}</p>
              <p className="text-[#9CA3AF] text-[11px] truncate capitalize font-medium tracking-wide mt-0.5">{user?.role === "va" ? "virtual assistant" : "Admin"}</p>
            </div>
          )}
          {!isCollapsed && (
            <User className="w-3.5 h-3.5 text-[#6B7280] group-hover:text-[#65BD6C] shrink-0 transition-colors" strokeWidth={1.8} />
          )}
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            "w-full bg-[#1F2937] hover:bg-[#374151] text-gray-300 hover:text-white border border-white/5 disabled:opacity-50 transition-colors h-9 cursor-pointer",
            isCollapsed ? "px-0 justify-center" : "justify-start px-3 gap-2"
          )}
          title={isCollapsed ? "Sign out" : undefined}
        >
          {loggingOut ? (
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
          ) : (
            <LogOut className="w-4 h-4" strokeWidth={2} />
          )}
          {!isCollapsed && (
            <span className="text-sm font-medium">{loggingOut ? "Signing out..." : "Sign out"}</span>
          )}
        </Button>
      </div>
    </aside>
  )
}
