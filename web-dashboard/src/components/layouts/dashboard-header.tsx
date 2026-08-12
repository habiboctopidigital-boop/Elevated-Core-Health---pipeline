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
  Moon,
  Sun,
  ChevronDown,
  Flag,
  Clock,
  UserPlus,
  CheckCircle2,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import axiosInstance from "@/lib/axios"

export function DashboardHeader() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const profileRoute = user?.role === "admin" ? ROUTES.ADMIN.PROFILE : ROUTES.DASHBOARD.PROFILE
  const { notifications, unreadCount } = useNotificationsContext()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

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
    <header className="hidden lg:block   bg-white border-b border-[#E5E7EB] shadow-sm" >
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
        <div className="flex items-center gap-3 ml-6">
        

          {/* Help */}
          <button
            onClick={() => router.push("/dashboard/sop")}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#1A1B1E] transition-all"
            title="Help & SOP"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={() => router.push(profileRoute)}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#1A1B1E] transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <div ref={notificationsRef} className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#1A1B1E] transition-all"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full shadow-md">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E5E7EB] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200" style={{ zIndex: 60 }}>
                <div className="bg-gradient-to-r from-[#036638] to-[#025030] px-4 py-3">
                  <h3 className="text-sm font-bold text-white">Notifications</h3>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={cn(
                          "px-4 py-3 border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors cursor-pointer",
                          !notif.read && "bg-[#EBF7EC]/50"
                        )}
                      >
                        <div className="flex gap-3">
                          <span className="flex-shrink-0 text-[#036638] mt-0.5">
                            {getNotificationIcon(notif.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#1A1B1E] font-medium">
                              {notif.message}
                            </p>
                            <p className="text-xs text-[#9CA3AF] mt-0.5">
                              {timeAgo(notif.timestamp)}
                            </p>
                          </div>
                          {!notif.read && (
                            <div className="w-2 h-2 rounded-full bg-[#036638] flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-[#6B7280]">No notifications</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2">
                  <button className="text-xs text-[#036638] hover:text-[#025030] font-medium">
                    View all →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div ref={profileRef} className="relative ml-2">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F3F4F6] transition-all group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#036638] to-[#025030] flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                {user?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote avatar, no static optimization needed
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0).toUpperCase()
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-[#6B7280] group-hover:text-[#1A1B1E] transition-colors" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E5E7EB] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200" style={{ zIndex: 60 }}>
                {/* User Info */}
                <div className="bg-gradient-to-br from-[#036638]/10 to-[#065040]/10 px-4 py-3 border-b border-[#E5E7EB]">
                  <p className="text-sm font-bold text-[#1A1B1E]">{user?.name}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{user?.email}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs font-semibold rounded bg-[#EBF7EC] text-[#036638] capitalize">
                    {user?.role}
                  </span>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      router.push(profileRoute)
                      setProfileOpen(false)
                    }}
                    className="w-full px-4 py-2.5 text-sm text-[#1A1B1E] hover:bg-[#F9FAFB] transition-colors flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-[#6B7280]" />
                    My Profile
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-[#E5E7EB] py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
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
