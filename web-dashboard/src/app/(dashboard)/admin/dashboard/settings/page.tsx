"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/auth/useAuth"
import { User, Lock, Palette, Zap, Settings, Download, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AdminSettingsTab = "profile" | "security" | "appearance" | "webhooks" | "integrations"

export default function AdminSettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminSettingsTab>("profile")
  const [isSaving, setIsSaving] = useState(false)

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.name?.split(" ")[0] || "",
    lastName: user?.name?.split(" ")[1] || "",
    email: user?.email || "",
    phone: "",
    location: "",
    bio: "",
  })

  const tabs: Array<{ id: AdminSettingsTab; label: string; icon: React.ReactNode; admin?: boolean }> = [
    { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
    { id: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
    { id: "webhooks", label: "Webhooks", icon: <Zap className="w-4 h-4" />, admin: true },
    { id: "integrations", label: "Integrations", icon: <Settings className="w-4 h-4" />, admin: true },
  ]

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1A1B1E]">Settings</h1>
        <p className="text-sm text-[#6B7280] mt-1">Manage your account, security, and integrations</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5E7EB]">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-1 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "border-[#036638] text-[#036638]"
                  : "border-transparent text-[#6B7280] hover:text-[#1A1B1E]"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 sm:p-8">
        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-[#1A1B1E] mb-2">Profile Details</h2>
              <p className="text-sm text-[#6B7280]">Update your personal information and profile picture.</p>
            </div>

            {/* Profile Picture */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#1A1B1E]">Profile Picture</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#036638] to-[#025030] flex items-center justify-center text-white text-2xl font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-6 text-center hover:border-[#036638]/50 transition-colors cursor-pointer">
                    <Download className="w-6 h-6 text-[#6B7280] mx-auto mb-2" />
                    <p className="text-xs text-[#6B7280]">Drop image here or click to upload</p>
                    <p className="text-[10px] text-[#9CA3AF] mt-1">PNG, JPG (Max 5MB)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#1A1B1E]">First Name</label>
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#1A1B1E]">Last Name</label>
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#1A1B1E]">Email Address</label>
              <p className="text-xs text-[#6B7280] mb-2">Your email is used for login and notifications</p>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] transition-all"
              />
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#1A1B1E] flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#6B7280]" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#1A1B1E] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#6B7280]" />
                  Location
                </label>
                <input
                  type="text"
                  value={profileForm.location}
                  onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                  placeholder="City, State"
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] transition-all"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="bg-[#036638] hover:bg-[#025030] text-white font-medium"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" className="border-[#E5E7EB] text-[#6B7280] hover:text-[#1A1B1E]">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-[#1A1B1E] mb-2">Security Settings</h2>
              <p className="text-sm text-[#6B7280]">Manage your password and security preferences.</p>
            </div>

            {/* Change Password */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#1A1B1E]">Change Password</label>
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Current Password"
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638]"
                />
                <input
                  type="password"
                  placeholder="New Password"
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638]"
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638]"
                />
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-[#EBF7EC] border border-[#65BD6C]/30 rounded-lg p-4">
              <p className="text-xs font-semibold text-[#036638] mb-2">Password Requirements:</p>
              <ul className="text-xs text-[#036638] space-y-1">
                <li>✓ At least 8 characters</li>
                <li>✓ One uppercase letter</li>
                <li>✓ One lowercase letter</li>
                <li>✓ One number</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button className="bg-[#036638] hover:bg-[#025030] text-white font-medium">
                Update Password
              </Button>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === "appearance" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-[#1A1B1E] mb-2">Appearance</h2>
              <p className="text-sm text-[#6B7280]">Customize how the app looks for you.</p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#1A1B1E]">Theme</label>
              <div className="grid grid-cols-3 gap-4">
                {["Light", "Dark", "System"].map((theme) => (
                  <button
                    key={theme}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all",
                      theme === "Light"
                        ? "border-[#036638] bg-[#EBF7EC]"
                        : "border-[#E5E7EB] hover:border-[#036638]"
                    )}
                  >
                    <p className="text-sm font-semibold text-[#1A1B1E]">{theme}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button className="bg-[#036638] hover:bg-[#025030] text-white font-medium">
                Save Preferences
              </Button>
            </div>
          </div>
        )}

        {/* Webhooks Tab (Admin Only) */}
        {activeTab === "webhooks" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-[#1A1B1E] mb-2">Webhook Configuration</h2>
              <p className="text-sm text-[#6B7280]">Manage webhook endpoints for external integrations.</p>
            </div>

            {/* Webhook URL */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#1A1B1E]">Webhook URL</label>
              <p className="text-xs text-[#6B7280] mb-2">Where should webhook events be sent?</p>
              <input
                type="url"
                placeholder="https://your-domain.com/webhooks"
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638]"
              />
            </div>

            {/* Events Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#1A1B1E]">Events to Subscribe</label>
              <div className="space-y-2">
                {[
                  "patient.created",
                  "patient.updated",
                  "patient.flagged",
                  "patient.stage_changed",
                  "appointment.scheduled",
                ].map((event) => (
                  <label key={event} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 accent-[#036638]"
                    />
                    <span className="text-sm text-[#1A1B1E]">{event}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Secret Key */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#1A1B1E]">Secret Key</label>
              <p className="text-xs text-[#6B7280] mb-2">Use this to verify webhook authenticity</p>
              <div className="flex gap-2">
                <input
                  type="password"
                  defaultValue="sk_test_12345678901234567890"
                  readOnly
                  className="flex-1 px-4 py-2 border border-[#E5E7EB] rounded-lg bg-[#F9FAFB] text-[#6B7280]"
                />
                <Button variant="outline" className="border-[#E5E7EB]">
                  Copy
                </Button>
              </div>
            </div>

            {/* Test Webhook */}
            <div className="bg-[#EBF7EC] border border-[#65BD6C]/30 rounded-lg p-4">
              <p className="text-sm font-semibold text-[#036638] mb-2">Test Webhook</p>
              <p className="text-xs text-[#036638] mb-3">Send a test event to verify your configuration</p>
              <Button className="bg-[#036638] hover:bg-[#025030] text-white font-medium text-xs">
                Send Test Event
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button className="bg-[#036638] hover:bg-[#025030] text-white font-medium">
                Save Webhook
              </Button>
              <Button variant="outline" className="border-[#E5E7EB]">
                Delete Webhook
              </Button>
            </div>
          </div>
        )}

        {/* Integrations Tab (Admin Only) */}
        {activeTab === "integrations" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-[#1A1B1E] mb-2">Integrations</h2>
              <p className="text-sm text-[#6B7280]">Connect with external services and tools.</p>
            </div>

            {/* Integration Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: "Make.com", description: "Automation workflows", status: "Connected" },
                { name: "Slack", description: "Send notifications", status: "Not Connected" },
                { name: "Gmail", description: "Email integration", status: "Connected" },
                { name: "Google Calendar", description: "Appointment sync", status: "Not Connected" },
              ].map((integration) => (
                <div key={integration.name} className="border border-[#E5E7EB] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-[#1A1B1E]">{integration.name}</p>
                      <p className="text-xs text-[#6B7280] mt-1">{integration.description}</p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full",
                        integration.status === "Connected"
                          ? "bg-[#EBF7EC] text-[#036638]"
                          : "bg-[#F3F4F6] text-[#6B7280]"
                      )}
                    >
                      {integration.status}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={integration.status === "Connected" ? "outline" : "default"}
                    className={cn(
                      "w-full text-xs font-medium",
                      integration.status === "Connected"
                        ? "border-[#E5E7EB] text-[#6B7280]"
                        : "bg-[#036638] hover:bg-[#025030] text-white"
                    )}
                  >
                    {integration.status === "Connected" ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export Data */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[#1A1B1E]">Export Organization Data</h3>
          <p className="text-sm text-[#6B7280] mt-1">Download all patient and activity data in JSON format</p>
        </div>
        <Button variant="outline" className="gap-2 border-[#E5E7EB]">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>
    </div>
  )
}
