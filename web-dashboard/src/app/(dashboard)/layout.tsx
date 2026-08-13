"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { EchSidebar } from "@/components/layouts/ech-sidebar"
import { DashboardHeader } from "@/components/layouts/dashboard-header"
import { MobileTopbar } from "@/components/layouts/mobile-topbar"
import { DashboardWatermark, WatermarkOpacity } from "@/components/ui/dashboard-watermark"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  // Auto-close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isMobileMenuOpen])

  // Keep viewport-centered modals clear of the fixed sidebar: expose its half-
  // width as a CSS var so portaled dialogs can offset their center to align
  // with the content area (right of the sidebar) on desktop.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--ech-sidebar-offset",
      isCollapsed ? "2.5rem" : "8rem",
    )
  }, [isCollapsed])

  return (
    <div className="flex min-h-screen w-full bg-[#F4F5F7] overflow-x-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-30">
        <EchSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      {/* Mobile Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          role="presentation"
        />
      )}

      {/* Mobile Sidebar Drawer - Only render when open for reliability */}
      {isMobileMenuOpen && (
        <div className="fixed left-0 top-0 h-screen w-64 z-[60] lg:hidden animate-in slide-in-from-left duration-300">
          <EchSidebar
            isCollapsed={false}
            setIsCollapsed={() => {}}
            onMobileClose={() => setIsMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content - No margin on mobile, margin on desktop for sidebar */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 w-full overflow-x-hidden ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >

        {/* Mobile Topbar — logo, notifications, profile */}
        <MobileTopbar onMenuClick={() => setIsMobileMenuOpen(true)} />

        {/* Content offset for the fixed h-14 mobile topbar */}
        <div className="lg:hidden h-14 shrink-0" />

        {/* Desktop Premium Header */}
        <div className="hidden lg:block w-full">
          <DashboardHeader />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar p-3 sm:p-4 md:p-6 lg:p-6">
          <div className="relative z-10 w-full no-scrollbar">
            <DashboardWatermark
              position="center"
              opacity={WatermarkOpacity.DASHBOARD_SUBTLE}
              showGlow={true}
            />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
