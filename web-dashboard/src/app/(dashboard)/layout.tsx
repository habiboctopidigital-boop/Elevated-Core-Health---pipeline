"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { EchSidebar } from "@/components/layouts/ech-sidebar"
import { Topbar } from "@/components/layouts/topbar"
import { Menu } from "lucide-react"

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

  return (
    <div className="flex min-h-screen bg-[#F4F5F7]">
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
        <div className="fixed left-0 top-0 h-screen w-64 z-50 lg:hidden animate-in slide-in-from-left duration-300">
          <EchSidebar
            isCollapsed={false}
            setIsCollapsed={() => {}}
            onMobileClose={() => setIsMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content - No margin on mobile, margin on desktop for sidebar */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >

        {/* Mobile Topbar with Hamburger */}
        <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-[#E5E7EB] px-4 py-3 z-20 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[#F3F4F6] cursor-pointer transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-[#036638]" />
          </button>
          <p className="text-sm font-bold text-[#1A1B1E] truncate flex-1 ml-3">ECH Pipeline</p>
        </div>

        {/* Content offset for mobile topbar */}
        <div className="lg:hidden h-14" />

        {/* Desktop Topbar */}
        <div className="hidden lg:block">
          <Topbar />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-6">
          <div className="max-w-[1440px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
