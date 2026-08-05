"use client"

import { usePathname } from "next/navigation"
import { StatusBar } from "@/components/features/status-bar"

/** Suffix (with the optional /admin prefix stripped) -> display title. */
const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/board": "Patient Board",
  "/dashboard/workload": "Workload Calendar",
  "/dashboard/log": "Activity Log",
  "/dashboard/sop": "SOP Reference",
  "/dashboard/reporting": "Reporting",
  "/dashboard/import": "Import",
  "/dashboard/profile": "Profile",
  "/dashboard/users": "Users",
  "/dashboard/stages": "Stage Settings",
  "/dashboard/crm": "CRM Management",
  "/dashboard/eligibility": "Eligibility Rules",
}

function getPageTitle(pathname: string): string {
  const normalized = pathname.startsWith("/admin") ? pathname.slice("/admin".length) : pathname
  return PAGE_TITLES[normalized] ?? "Dashboard"
}

export function Topbar() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="sticky top-0 z-20 h-16 glass flex items-center justify-between px-6 border-b border-[#E5E7EB]/60">
      <h2 className="text-[15px] font-bold text-[#1A1B1E] tracking-tight">{title}</h2>
      <StatusBar />
    </header>
  )
}
