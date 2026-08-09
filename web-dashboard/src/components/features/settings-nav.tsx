"use client"

import { Settings, Users, Lock, Zap } from "lucide-react"
import Link from "next/link"
import { ROUTES } from "@/constants"
import { cn } from "@/lib/utils"

interface SettingsNavProps {
  currentPage: "profile" | "webhooks" | "users" | "stages"
  className?: string
}

const settingsPages = [
  {
    id: "profile" as const,
    label: "Profile",
    icon: Lock,
    href: ROUTES.ADMIN.PROFILE,
    desc: "Account & security",
  },
  {
    id: "webhooks" as const,
    label: "Webhooks",
    icon: Zap,
    href: ROUTES.ADMIN.WEBHOOKS,
    desc: "Automations",
  },
]

export function SettingsNav({ currentPage, className }: SettingsNavProps) {
  return (
    <div className={cn("", className)}>
      {/* Premium Tab Navigation */}
      <div className="bg-gradient-to-r from-[#F9FAFB] to-white border-b border-[#E5E7EB] sticky top-0 z-40">
        <div className="flex items-center justify-center gap-1 px-6 py-4">
          {/* Settings Icon Header */}
          <div className="flex items-center gap-2.5 mr-8 pb-3 border-b-2 border-transparent">
            <div className="w-8 h-8 rounded-lg bg-[#036638]/10 flex items-center justify-center">
              <Settings className="w-4 h-4 text-[#036638]" />
            </div>
            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Settings</span>
          </div>

          {/* Navigation Tabs - Centered */}
          <div className="flex items-center gap-0">
            {settingsPages.map((page) => {
              const Icon = page.icon
              const isActive = currentPage === page.id

              return (
                <Link
                  key={page.id}
                  href={page.href}
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
