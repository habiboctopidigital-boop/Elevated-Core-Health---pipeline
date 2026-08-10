"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { EchSidebar } from "@/components/layouts/ech-sidebar"
import { Topbar } from "@/components/layouts/topbar"
import { Menu, X } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  // Auto-close the drawer whenever the route changes (tapping a nav link
  // should navigate AND close it, not require a second tap on the overlay).
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMobileMenuOpen])

  return (
    <div className="flex min-h-screen bg-[#F4F5F7]">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-30">
        <EchSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      {/* Mobile Sidebar Overlay — z-40 so it sits above ALL page content
          (including the sticky Topbar, also z-20) and only below the drawer itself. */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className={`fixed left-0 top-0 h-screen z-50 lg:hidden transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <EchSidebar isCollapsed={false} setIsCollapsed={() => {}} onMobileClose={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 flex flex-col min-h-screen lg:ml-64 ${isCollapsed && 'lg:ml-20'}`}>
        {/* Topbar with Mobile Menu Button */}
        <div className="flex items-center justify-between lg:justify-start gap-4 bg-white border-b border-[#E5E7EB] px-4 py-3 lg:hidden sticky top-0 z-10">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[#F3F4F6] transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-[#036638]" />
            ) : (
              <Menu className="w-5 h-5 text-[#036638]" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#1A1B1E] truncate">ECH Pipeline</p>
          </div>
        </div>

        <Topbar />

        {/* Main Content Area - Responsive Padding */}
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
