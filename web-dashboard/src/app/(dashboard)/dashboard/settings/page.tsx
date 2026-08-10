"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/auth/useAuth"
import { User, Lock, Palette, Download, Mail, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SettingsTab = "profile" | "security" | "appearance"

export default function VASettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")
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

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
    { id: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
  ]

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000))
      // toast.success("Profile updated successfully")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1A1B1E]">Settings</h1>
        <p className="text-sm text-[#6B7280] mt-1">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5E7EB]">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-1 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-all",
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
            {/* Profile Header */}
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
                    <Upload className="w-6 h-6 text-[#6B7280] mx-auto mb-2" />
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

            {/* Bio */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#1A1B1E]">Professional Bio</label>
              <p className="text-xs text-[#6B7280] mb-2">Tell us about yourself (optional)</p>
              <textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                placeholder="Your professional background and expertise..."
                rows={4}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] resize-none transition-all"
              />
              <p className="text-xs text-[#9CA3AF]">{profileForm.bio.length}/500</p>
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
              <Button
                variant="outline"
                className="border-[#E5E7EB] text-[#6B7280] hover:text-[#1A1B1E]"
              >
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

            {/* Theme Selection */}
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

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button className="bg-[#036638] hover:bg-[#025030] text-white font-medium">
                Save Preferences
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Export Data */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[#1A1B1E]">Export Your Data</h3>
          <p className="text-sm text-[#6B7280] mt-1">Download all your account data in JSON format</p>
        </div>
        <Button variant="outline" className="gap-2 border-[#E5E7EB]">
          <Download className="w-4 h-4" />
          Export Data
        </Button>
      </div>
    </div>
  )
}

function Upload({ className }: { className?: string }) {
  return <Mail className={className} />
}
