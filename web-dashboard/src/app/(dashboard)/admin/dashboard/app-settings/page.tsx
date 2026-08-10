"use client"

import { useState, useEffect } from "react"
import { Settings as SettingsIcon, Loader2, Check, AlertCircle, Flag, Shield, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import axiosInstance from "@/lib/axios"

interface AppSetting {
  key: string
  value: string
  updatedAt: string
  isDefault?: boolean
}

export default function AppSettingsPage() {
  const [staleHours, setStaleHours] = useState<string>("48")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Load current setting
  useEffect(() => {
    const loadSetting = async () => {
      try {
        const response = await axiosInstance.get("/admin/settings/stale_threshold_hours")
        if (response.data?.data?.value) {
          setStaleHours(response.data.data.value)
        }
      } catch (error) {
        console.error("Failed to load stale threshold setting:", error)
        // Defaults to 48 if not found
      } finally {
        setIsLoading(false)
      }
    }

    loadSetting()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setFeedback(null)

    try {
      const numValue = parseInt(staleHours, 10)
      if (isNaN(numValue) || numValue < 1) {
        setFeedback({ type: "error", message: "Stale threshold must be a number >= 1" })
        setIsSaving(false)
        return
      }

      await axiosInstance.patch("/admin/settings/stale_threshold_hours", {
        value: staleHours,
      })

      setFeedback({ type: "success", message: "Setting saved successfully. Cards will be marked stale after the new threshold." })
    } catch (error: any) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.message || "Failed to save setting",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#036638]/10 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-[#036638]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1A1B1E]">App Settings</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">Configure application-wide parameters</p>
          </div>
        </div>
      </div>

      {/* Settings Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-6">
        {/* Stale Threshold Setting */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-[#1A1B1E] block">
            Mark card as stale after (hours)
          </label>
          <p className="text-xs text-[#6B7280] mb-3">
            Patient cards not updated within this period will be flagged as "Stale" to prompt follow-up.
          </p>

          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <input
                type="number"
                min="1"
                max="720"
                value={staleHours}
                onChange={(e) => setStaleHours(e.target.value)}
                disabled={isLoading || isSaving}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={isLoading || isSaving}
              className="bg-[#036638] hover:bg-[#025030] text-white text-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Setting
                </>
              )}
            </Button>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium",
                feedback.type === "success"
                  ? "bg-[#EBF7EC] border border-[#65BD6C]/30 text-[#036638]"
                  : "bg-red-50 border border-red-200 text-red-700"
              )}
            >
              {feedback.type === "success" ? (
                <Check className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {feedback.message}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3 mt-4">
            <p className="text-xs text-[#6B7280] leading-relaxed">
              <strong>Current setting:</strong> Cards are marked stale if not updated within <strong>{staleHours} hours</strong>.
              <br />
              <strong>Default:</strong> 48 hours (2 days)
              <br />
              <strong>Range:</strong> 1 to 720 hours (30 days)
            </p>
          </div>
        </div>

        <hr className="border-[#E5E7EB]/50" />

        {/* Admin Flag Raising */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Flag className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1A1B1E]">Admin Flag Raising</h3>
              <p className="text-xs text-[#6B7280]">Manage oversight and escalation flags</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Admin Flags */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-semibold text-amber-900">Admin Flags</h4>
              </div>
              <ul className="space-y-2 text-xs text-amber-800">
                <li className="flex gap-2">
                  <span className="text-amber-600 font-bold">→</span>
                  <span>Raised by: Donna (Admin) only</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600 font-bold">→</span>
                  <span>Purpose: Management oversight & escalation</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600 font-bold">→</span>
                  <span>Style: Amber/Golden color indicator</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600 font-bold">→</span>
                  <span>Access: Patient details modal → Flag for Follow-up</span>
                </li>
              </ul>
            </div>

            {/* VA Flags */}
            <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <h4 className="text-sm font-semibold text-red-900">VA Flags</h4>
              </div>
              <ul className="space-y-2 text-xs text-red-800">
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold">→</span>
                  <span>Raised by: VAs (Jude, Amanda)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold">→</span>
                  <span>Purpose: Alert admin to issues</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold">→</span>
                  <span>Style: Red color indicator</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold">→</span>
                  <span>Access: Patient details modal → Flag for Donna</span>
                </li>
              </ul>
            </div>
          </div>

          {/* How to Use */}
          <div className="bg-[#F0F9FF] border border-blue-200 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              How to Raise Flags
            </h4>
            <ol className="text-xs text-blue-900 space-y-2 ml-4 list-decimal">
              <li>Click <strong>Patient Card</strong> to open patient details modal</li>
              <li>Scroll to <strong>Flag Section</strong> at the bottom</li>
              <li>Select <strong>Patient Stage</strong> from dropdown (optional - for context)</li>
              <li>Enter detailed reason for the flag</li>
              <li>Click <strong>"Flag for Follow-up"</strong> (admin) or <strong>"Flag for Donna"</strong> (VA)</li>
              <li>Flag appears in patient card with visual indicator</li>
              <li><strong>Admin only</strong>: Click <strong>"Clear Flag"</strong> button to resolve</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-[#036638] animate-spin" />
          <p className="ml-2 text-sm text-[#6B7280]">Loading settings...</p>
        </div>
      )}
    </div>
  )
}
