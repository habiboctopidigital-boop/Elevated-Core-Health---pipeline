"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/hooks/auth/useAuth"
import { AuthService } from "@/services/auth.service"
import {
  User,
  Shield,
  Save,
  Key,
  Loader2,
  Camera,
  Mail,
  Eye,
  EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsNav } from "./settings-nav"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { isAdminOrAbove, roleLabel } from "@/lib/roles"

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"]

const inputClass =
  "w-full h-10 px-3.5 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#036638]/25 focus:border-[#036638]/50 transition-all"

export function ProfilePage() {
  const { user, refreshUser } = useAuth()

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
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const isAdmin = isAdminOrAbove(user?.role)

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

      <div className="space-y-6 max-w-4xl mx-auto mt-6 pb-12">
        {/* - Hero banner - */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#036638] via-[#025030] to-[#014324] px-6 py-7 sm:px-8 shadow-[0_10px_40px_rgba(3,102,56,0.25)]">
          {/* Decorative bubbles */}
          <span aria-hidden className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-white/5" />
          <span aria-hidden className="absolute right-24 -bottom-20 w-40 h-40 rounded-full bg-white/5" />
          <span aria-hidden className="absolute -left-8 -bottom-14 w-36 h-36 rounded-full bg-[#65BD6C]/15" />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
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
              className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 group cursor-pointer disabled:cursor-wait ring-2 ring-white/25 ring-offset-2 ring-offset-[#036638]"
            >
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center",
                  isAdmin
                    ? "bg-gradient-to-br from-[#65BD6C] to-[#036638]"
                    : "bg-gradient-to-br from-emerald-400 to-[#65BD6C]",
                )}
              >
                {avatarPreview || user?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote/blob avatar, no static optimization needed
                  <img
                    src={avatarPreview ?? user!.avatar!}
                    alt={user?.name ?? "Profile picture"}
                    className="w-full h-full object-cover"
                  />
                ) : isAdmin ? (
                  <Shield className="w-9 h-9 text-white" />
                ) : (
                  <User className="w-9 h-9 text-white" />
                )}
              </div>

              {/* Hover / uploading overlay */}
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity",
                  uploadingAvatar ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </div>
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                  {user?.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full bg-white/15 text-white border border-white/20 backdrop-blur whitespace-nowrap">
                  {isAdmin ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {roleLabel(user?.role)}
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-sm text-white/80 mt-1.5 truncate">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                {user?.email}
              </p>
              <button
                type="button"
                onClick={handleAvatarPick}
                disabled={uploadingAvatar}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/85 hover:text-white underline-offset-2 hover:underline mt-2.5 disabled:opacity-50 disabled:cursor-wait transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                {uploadingAvatar ? "Uploading…" : "Change photo"}
              </button>
            </div>
          </div>
        </div>

        {/* - Account Info - */}
        <div className="bg-white rounded-2xl border border-[#EDEFF2] shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
          <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-[#EDEFF2]">
            <div className="w-9 h-9 rounded-xl bg-[#EBF7EC] flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-[#036638]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1A1B1E]">Account Info</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Update your name and email</p>
            </div>
          </div>

          <div className="px-5 sm:px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#374151]">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#374151]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSaveProfile}
                disabled={saving || !name.trim() || !email.trim()}
                className="bg-gradient-to-r from-[#036638] to-[#025030] hover:from-[#025030] hover:to-[#014324] text-white text-xs gap-1.5 shadow-[0_4px_14px_rgba(3,102,56,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* - Password - */}
        <div className="bg-white rounded-2xl border border-[#EDEFF2] shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#EDEFF2]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#FBE7B2]/50 flex items-center justify-center shrink-0">
                <Key className="w-4 h-4 text-[#8A6D1D]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#1A1B1E]">Password</h2>
                <p className="text-xs text-[#6B7280] mt-0.5">Keep your account secure</p>
              </div>
            </div>
            {!showPasswordForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordForm(true)}
                className="text-xs border-[#036638]/30 text-[#036638] shrink-0"
              >
                Change
              </Button>
            )}
          </div>

          {showPasswordForm && (
            <div className="px-5 sm:px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#374151]">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={cn(inputClass, "pr-10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#9CA3AF] hover:text-[#036638] transition-colors"
                    title={showCurrent ? "Hide password" : "Show password"}
                    aria-label={showCurrent ? "Hide current password" : "Show current password"}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#374151]">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={cn(inputClass, "pr-10")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#9CA3AF] hover:text-[#036638] transition-colors"
                      title={showNew ? "Hide password" : "Show password"}
                      aria-label={showNew ? "Hide new password" : "Show new password"}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#374151]">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={cn(inputClass, "pr-10")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#9CA3AF] hover:text-[#036638] transition-colors"
                      title={showConfirm ? "Hide password" : "Show password"}
                      aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
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
                  className="bg-gradient-to-r from-[#036638] to-[#025030] hover:from-[#025030] hover:to-[#014324] text-white text-xs shadow-[0_4px_14px_rgba(3,102,56,0.25)]"
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
