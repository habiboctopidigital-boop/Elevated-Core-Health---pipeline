"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/auth/useAuth"
import { useNotificationsContext } from "@/providers/NotificationsProvider"
import { ROUTES } from "@/constants"
import {
  Search,
  Settings,
  Bell,
  LogOut,
  User,
  HelpCircle,
  ChevronDown,
  Flag,
  Clock,
  UserPlus,
  CheckCircle2,
  Info,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import axiosInstance from "@/lib/axios"
import { isAdminOrAbove, roleLabel } from "@/lib/roles"

export function DashboardHeader() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const profileRoute = isAdminOrAbove(user?.role) ? ROUTES.ADMIN.PROFILE : ROUTES.DASHBOARD.PROFILE
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationsContext()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  // Tinted icon-tile background per notification type (brand-green family,
  // red/amber reserved for alert types).
  const getNotificationTile = (type: string) => {
    switch (type) {
      case "flag":
        return "bg-red-50 text-red-500"
      case "stale":
        return "bg-amber-50 text-amber-600"
      default:
        return "bg-[#EBF7EC] text-[#036638]"
    }
  }

  const getNotificationIcon = (type: string) => {
    const className = "w-4 h-4"
    switch (type) {
      case "flag":
        return <Flag className={className} />
      case "stale":
        return <Clock className={className} />
      case "assignment":
        return <UserPlus className={className} />
      case "onboarding":
        return <User className={className} />
      case "success":
        return <CheckCircle2 className={className} />
      default:
        return <Info className={className} />
    }
  }

  const timeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return "just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <header className="hidden lg:block   bg-white border-b border-[#E5E7EB] shadow-sm w-full overflow-x-hidden" >
      <div className="flex items-center justify-between px-6 py-3.5 h-16">
        {/* Left: Search */}
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <input
              type="text"
              placeholder="Search patients, logs, settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              className="w-full px-4 py-2 pl-10 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] transition-all"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-3 ml-6">

          {/* Help */}
          <button
            onClick={() => router.push("/dashboard/sop")}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-transparent text-[#6B7280] hover:border-[#E5E7EB] hover:bg-[#F9FAFB] hover:text-[#036638] transition-all active:scale-95"
            title="Help & SOP"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={() => router.push(profileRoute)}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-transparent text-[#6B7280] hover:border-[#E5E7EB] hover:bg-[#F9FAFB] hover:text-[#036638] transition-all active:scale-95"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <div ref={notificationsRef} className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-transparent text-[#6B7280] hover:border-[#E5E7EB] hover:bg-[#F9FAFB] hover:text-[#036638] transition-all active:scale-95"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full shadow-md ring-2 ring-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200" style={{ zIndex: 60 }}>
                <div className="relative bg-gradient-to-r from-[#036638] to-[#025030] px-4 py-3.5 overflow-hidden">
                  {/* Decorative bubbles */}
                  <span aria-hidden className="absolute -right-4 -top-6 w-20 h-20 rounded-full bg-white/10" />
                  <span aria-hidden className="absolute right-10 -bottom-8 w-14 h-14 rounded-full bg-white/5" />
                  <div className="relative flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Notifications
                    </h3>
                    <div className="flex items-center gap-2.5">
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[10px] font-bold whitespace-nowrap">
                          {unreadCount} new
                        </span>
                      )}
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[11px] font-medium text-white/80 hover:text-white underline-offset-2 hover:underline transition-colors whitespace-nowrap"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto scrollbar-thin">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => markAsRead(notif.id)}
                        className={cn(
                          "px-4 py-3 border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors cursor-pointer",
                          !notif.read && "bg-[#EBF7EC]/40"
                        )}
                      >
                        <div className="flex gap-3">
                          <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", getNotificationTile(notif.type))}>
                            {getNotificationIcon(notif.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-[#1A1B1E] font-medium leading-snug">
                              {notif.message}
                            </p>
                            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                              {timeAgo(notif.timestamp)}
                            </p>
                          </div>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-[#036638] flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-10 text-center">
                      <div className="w-12 h-12 mx-auto rounded-full bg-[#F3F4F6] flex items-center justify-center mb-3">
                        <Bell className="w-5 h-5 text-[#9CA3AF]" />
                      </div>
                      <p className="text-sm font-medium text-[#6B7280]">No notifications</p>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">You&apos;re all caught up</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2.5">
                  <button
                    onClick={() => {
                      setNotificationsOpen(false)
                      router.push(isAdminOrAbove(user?.role) ? ROUTES.ADMIN.LOG : ROUTES.DASHBOARD.LOG)
                    }}
                    className="w-full text-xs text-[#036638] hover:text-[#025030] font-semibold py-1 rounded-lg hover:bg-[#EBF7EC] transition-colors"
                  >
                    View all notifications →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div ref={profileRef} className="relative ml-1 sm:ml-2 pl-2 sm:pl-3 border-l border-[#E5E7EB]">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 px-1.5 sm:pr-2.5 py-1.5 rounded-xl hover:bg-[#F9FAFB] transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#036638] to-[#025030] flex items-center justify-center text-white text-sm font-bold overflow-hidden ring-2 ring-[#65BD6C]/30">
                {user?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote avatar, no static optimization needed
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="hidden xl:block text-left min-w-0">
                <p className="text-xs font-bold text-[#1A1B1E] leading-tight truncate max-w-[110px]">{user?.name}</p>
                <p className="text-[10px] text-[#6B7280] uppercase tracking-wide font-semibold mt-0.5">
                  {roleLabel(user?.role)}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-[#6B7280] group-hover:text-[#036638] transition-colors shrink-0" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200" style={{ zIndex: 60 }}>
                {/* User Info */}
                <div className="relative bg-gradient-to-br from-[#EBF7EC] to-white px-4 py-4 border-b border-[#E5E7EB]/70 overflow-hidden">
                  <span aria-hidden className="absolute -right-5 -top-7 w-24 h-24 rounded-full bg-[#65BD6C]/10" />
                  <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#036638] to-[#025030] flex items-center justify-center text-white text-sm font-bold overflow-hidden ring-2 ring-[#65BD6C]/30 shrink-0">
                      {user?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element -- remote avatar, no static optimization needed
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user?.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#1A1B1E] truncate">{user?.name}</p>
                      <p className="text-[11px] text-[#6B7280] truncate mt-0.5">{user?.email}</p>
                    </div>
                  </div>
                  <span className="relative inline-flex items-center gap-1 mt-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full bg-[#036638]/10 text-[#036638]">
                    <ShieldCheck className="w-3 h-3" />
                    {roleLabel(user?.role)}
                  </span>
                </div>

                {/* Menu Items */}
                <div className="py-1.5">
                  <button
                    onClick={() => {
                      router.push(profileRoute)
                      setProfileOpen(false)
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1A1B1E] hover:bg-[#F9FAFB] transition-colors group"
                  >
                    <span className="w-7 h-7 rounded-lg bg-[#F3F4F6] flex items-center justify-center group-hover:bg-[#EBF7EC] transition-colors">
                      <User className="w-3.5 h-3.5 text-[#036638]" />
                    </span>
                    My Profile
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-[#E5E7EB] py-1.5">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium group"
                  >
                    <span className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                      <LogOut className="w-3.5 h-3.5" />
                    </span>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
