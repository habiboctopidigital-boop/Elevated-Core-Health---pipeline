"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, LogOut, User, Flag, Clock, UserPlus, CheckCircle2, Info } from "lucide-react"
import { useAuth } from "@/hooks/auth/useAuth"
import { useNotificationsContext } from "@/providers/NotificationsProvider"
import { ROUTES } from "@/constants"
import { cn } from "@/lib/utils"
import { isAdminOrAbove, roleLabel } from "@/lib/roles"
import Link from "next/link"

function getNotificationIcon(type: string) {
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

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function MobileTopbar() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { notifications, unreadCount } = useNotificationsContext()
  const profileRoute = isAdminOrAbove(user?.role) ? ROUTES.ADMIN.PROFILE : ROUTES.DASHBOARD.PROFILE

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push(ROUTES.LOGIN)
  }

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#E5E7EB] px-2 z-30 flex items-center justify-between gap-1">
      {/* Brand */}
      <Link
      href={"/"}
        onClick={() => router.push(isAdminOrAbove(user?.role) ? ROUTES.ADMIN.HOME : ROUTES.DASHBOARD.HOME)}
        className="flex items-center gap-2 min-w-0 max-w-fit flex-1 rounded-lg px-1 py-1 hover:bg-[#F3F4F6] transition-colors"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- small static brand mark */}
        <img src="/logo.png" alt="" className="w-10 h-10 object-contain shrink-0" />
       
      </Link>

     <div className="flex items-center gap-x-2">
       {/* Notifications */}
      <div ref={notificationsRef} className="relative shrink-0">
        <button
          onClick={() => {
            setNotificationsOpen((v) => !v)
            setProfileOpen(false)
          }}
          className="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[#F3F4F6] active:bg-[#E5E7EB] text-[#6B7280] transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {notificationsOpen && (
          // Anchored to the screen edges rather than the button so a long notification
          // can never push the panel off a narrow viewport.
          <div className="fixed left-2 right-2 top-14 mt-1 bg-white border border-[#E5E7EB] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
            <div className="bg-gradient-to-r from-[#036638] to-[#025030] px-4 py-2.5">
              <h3 className="text-sm font-bold text-white">Notifications</h3>
            </div>
            <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      "px-4 py-3 border-b border-[#E5E7EB] last:border-b-0",
                      !notif.read && "bg-[#EBF7EC]/50",
                    )}
                  >
                    <div className="flex gap-3">
                      <span className="shrink-0 text-[#036638] mt-0.5">{getNotificationIcon(notif.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#1A1B1E] font-medium break-words">
                          {notif.message}
                        </p>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">{timeAgo(notif.timestamp)}</p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-[#036638] shrink-0 mt-1.5" />
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
          </div>
        )}
      </div>

      {/* Profile */}
      <div ref={profileRef} className="relative shrink-0">
        <button
          onClick={() => {
            setProfileOpen((v) => !v)
            setNotificationsOpen(false)
          }}
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[#F3F4F6] transition-colors"
          aria-label="Account menu"
        >
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#036638] to-[#025030] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
            {user?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote avatar
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0).toUpperCase() || "U"
            )}
          </span>
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-[#E5E7EB] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
            <div className="bg-gradient-to-br from-[#036638]/10 to-[#065040]/10 px-4 py-3 border-b border-[#E5E7EB]">
              <p className="text-sm font-bold text-[#1A1B1E] truncate">{user?.name}</p>
              <p className="text-xs text-[#6B7280] mt-0.5 truncate">{user?.email}</p>
              <span className="inline-block mt-2 px-2 py-0.5 text-xs font-semibold rounded bg-[#EBF7EC] text-[#036638]">
                {roleLabel(user?.role)}
              </span>
            </div>
            <button
              onClick={() => {
                router.push(profileRoute)
                setProfileOpen(false)
              }}
              className="w-full px-4 py-3 text-sm text-[#1A1B1E] hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors flex items-center gap-2"
            >
              <User className="w-4 h-4 text-[#6B7280]" />
              My Profile
            </button>
            <div className="border-t border-[#E5E7EB]">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors flex items-center gap-2 font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
     </div>
    </header>
  )
}
