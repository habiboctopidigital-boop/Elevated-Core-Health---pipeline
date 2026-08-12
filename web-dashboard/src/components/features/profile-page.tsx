"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/hooks/auth/useAuth"
import { AuthService } from "@/services/auth.service"
import { User, Shield, Save, Key, Loader2, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsNav } from "./settings-nav"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { isAdminOrAbove, roleLabel } from "@/lib/roles"

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"]

export function ProfilePage() {
  const { user, logout, refreshUser } = useAuth()

  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [saving, setSaving] = useState(false)

  // Sync fields when user data arrives
  useEffect(() => {
    if (user) {
      setName(user.name ?? "")
      setEmail(user.email ?? "")
    }
  }, [user])

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const updated = await AuthService.updateProfile({ name, email })
      refreshUser(updated)
      toast.success("Profile updated")
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarPick = () => avatarInputRef.current?.click()

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error("Please choose a PNG, JPG, or WEBP image")
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be 5MB or smaller")
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
    setUploadingAvatar(true)
    try {
      const updated = await AuthService.uploadAvatar(file)
      refreshUser(updated)
      toast.success("Profile picture updated")
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to upload profile picture")
    } finally {
      setUploadingAvatar(false)
      URL.revokeObjectURL(previewUrl)
      setAvatarPreview(null)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters")
      return
    }
    setChangingPassword(true)
    try {
      await AuthService.changePassword(currentPassword, newPassword)
      toast.success("Password changed successfully")
      setShowPasswordForm(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <>
      {/* Settings Navigation - Top */}
      <SettingsNav currentPage="profile" />

      <div className="space-y-6 max-w-4xl mt-10">
        <div>
          <h1 className="text-xl font-bold text-[#1A1B1E]">Profile</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Manage your account details and security
          </p>
        </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[#E5E7EB]/50">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleAvatarPick}
            disabled={uploadingAvatar}
            title="Change profile picture"
            className={cn(
              "relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden group cursor-pointer disabled:cursor-wait",
              isAdminOrAbove(user?.role) ? "bg-[#036638]" : "bg-[#EBF7EC]",
            )}
          >
            {avatarPreview || user?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote/blob avatar, no static optimization needed
              <img
                src={avatarPreview ?? user!.avatar!}
                alt={user?.name ?? "Profile picture"}
                className="w-full h-full object-cover"
              />
            ) : isAdminOrAbove(user?.role) ? (
              <Shield className="w-6 h-6 text-white" />
            ) : (
              <User className="w-6 h-6 text-[#036638]" />
            )}

            {/* Hover / uploading overlay */}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity",
                uploadingAvatar ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-white" />
              )}
            </div>
          </button>
          <div>
            <p className="text-sm font-bold text-[#1A1B1E]">{user?.name}</p>
            <p className="text-xs text-[#6B7280]">{roleLabel(user?.role)}</p>
            <button
              type="button"
              onClick={handleAvatarPick}
              disabled={uploadingAvatar}
              className="text-[11px] font-medium text-[#036638] hover:underline disabled:opacity-50 disabled:cursor-wait mt-0.5"
            >
              {uploadingAvatar ? "Uploading…" : "Change photo"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#374151]">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/30 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#374151]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/30 transition-all"
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveProfile}
              disabled={saving || !name.trim() || !email.trim()}
              className="bg-[#036638] hover:bg-[#025030] text-white text-xs gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#036638]" />
            <h2 className="text-sm font-bold text-[#1A1B1E]">Password</h2>
          </div>
          {!showPasswordForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordForm(true)}
              className="text-xs border-[#036638]/30 text-[#036638]"
            >
              Change
            </Button>
          )}
        </div>

        {showPasswordForm && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPasswordForm(false)
                  setCurrentPassword("")
                  setNewPassword("")
                  setConfirmPassword("")
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword}
                className="bg-[#036638] hover:bg-[#025030] text-white text-xs"
              >
                {changingPassword ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : null}
                {changingPassword ? "Changing..." : "Update Password"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
