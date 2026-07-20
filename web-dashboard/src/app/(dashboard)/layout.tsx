"use client"

import { EchSidebar } from "@/components/layouts/ech-sidebar"
import { StatusBar } from "@/components/features/status-bar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[#F8F6F1]">
      <EchSidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <StatusBar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
