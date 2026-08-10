"use client"

import { Lock } from "lucide-react"
import Link from "next/link"
import { ROUTES } from "@/constants"
import { useAuth } from "@/hooks/auth/useAuth"
import { cn } from "@/lib/utils"

interface SettingsNavProps {
  currentPage: "profile" | "users" | "stages"
  className?: string
}

// Webhooks and CRM Connect tabs (and their admin pages) were removed. Only Profile
// remains, and it routes to the VA or Admin profile page depending on who's signed
// in, since this nav is shared by both.
const settingsPages = [
  {
    id: "profile" as const,
    label: "Profile",
    icon: Lock,
    desc: "Account & security",
  },
]

export function SettingsNav({ currentPage, className }: SettingsNavProps) {
  const { user } = useAuth()
  const profileHref = user?.role === "admin" ? ROUTES.ADMIN.PROFILE : ROUTES.DASHBOARD.PROFILE

  return (
    <div className={cn("", className)}>
      {/* Premium Tab Navigation */}
      <div className="bg-gradient-to-r from-[#F9FAFB] to-white border-b border-[#E5E7EB] sticky top-0 z-40">
        <div className="flex items-start justify-start gap-1 px-6 py-4">
          {/* Settings Icon Header */}
       

          {/* Navigation Tabs - Centered */}
          <div className="flex items-start  gap-0 w-full">
            {settingsPages.map((page) => {
              const Icon = page.icon
              const isActive = currentPage === page.id

              return (
                <Link
                  key={page.id}
                  href={profileHref}
                  className={cn(
                    "relative px-5 py-3 text-sm font-medium transition-all flex items-center gap-2 group whitespace-nowrap",
                    "border-b-2 -mb-4 pb-4",
                    isActive
                      ? "text-[#036638] border-b-[#036638]"
                      : "text-[#6B7280] border-b-transparent hover:text-[#1A1B1E]"
                  )}
                  title={page.desc}
                >
                  {/* Icon with background on hover/active */}
                  <div
                    className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0",
                      isActive
                        ? "bg-[#036638]/15 text-[#036638]"
                        : "text-[#6B7280] group-hover:bg-[#F3F4F6]"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Label */}
                  <span>{page.label}</span>

                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#036638] animate-pulse" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
