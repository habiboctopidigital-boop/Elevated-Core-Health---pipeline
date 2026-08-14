"use client"

import { useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { StageSettingsPanel } from "@/components/features/stage-settings-panel"

export function StageSettingsDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="cursor-pointer gap-1.5 h-9 px-3 rounded-xl bg-white text-[#374151] hover:bg-[#EBF7EC] hover:border-[#036638]/30 hover:text-[#036638] hover:shadow-sm transition-all border border-[#E5E7EB]"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#036638]" />
          <span className="hidden sm:inline">Stage Settings</span>
          <span className="sm:hidden">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl gap-0 p-0 overflow-hidden max-h-[calc(100dvh-2rem)] overflow-y-auto border-0 shadow-2xl rounded-3xl" hideAccent>
        <DialogHeader className="sr-only">
          <DialogTitle>Stage Settings</DialogTitle>
        </DialogHeader>
        <div className="relative overflow-hidden bg-gradient-to-r border-none from-[#036638] via-[#0a7a44] to-emerald-600 px-5 pt-5 pb-5 pr-12">
          <div className="absolute -right-10 -top-12 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -right-2 -top-3 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
          <div className="flex items-start gap-3 relative">
            <div className="w-11 h-11 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center shrink-0 shadow-lg shadow-black/5">
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-bold text-white tracking-tight">Stage Settings</DialogTitle>
              <p className="text-xs text-emerald-50/90 mt-0.5">Reorder stages, add new ones, and manage per-stage checklists</p>
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-6 bg-[#FAFBFA]">
          <StageSettingsPanel variant="dialog" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
