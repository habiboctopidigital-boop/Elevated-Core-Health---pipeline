"use client"

import { useState, useEffect } from "react"
import { Settings as SettingsIcon, Loader2, Check, AlertCircle } from "lucide-react"
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
