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
  CalendarDays,
  Clock,
  CircleCheck,
  BadgeCheck,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
  Fingerprint,
  LockKeyhole,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsNav } from "./settings-nav"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { isAdminOrAbove, roleLabel } from "@/lib/roles"
import type { UserRole } from "@/types"

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"]

const inputClass =
  "w-full h-11 pl-10 pr-3.5 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#036638]/25 focus:border-[#036638]/50 transition-all hover:border-[#D1D5DB]"

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: "Full control — manages the practice, team and every workflow.",
  admin: "Oversees the team, stages, reporting and pipeline analytics.",
  va: "Handles day-to-day patient intake and pipeline work.",
}

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
  const isVa = user?.role === "va"

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

  const memberSince = user?.createdAt
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(user.createdAt))
    : null

  const lastLogin = user?.lastLoginAt
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
        new Date(user.lastLoginAt),
      )
    : null

  return (
    <>
      {/* Settings Navigation - Top */}
      <SettingsNav currentPage="profile" />

      <div className="max-w-5xl mx-auto mt-8 pb-16">
        {/* ─────────────────────────── Hero banner ─────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#036638] via-[#025030] to-[#012e1f] shadow-[0_16px_48px_rgba(3,102,56,0.28)]">
          {/* Decorative layers */}
          <span aria-hidden className="absolute -right-16 -top-24 w-72 h-72 rounded-full bg-white/[0.06]" />
          <span aria-hidden className="absolute right-40 -bottom-28 w-56 h-56 rounded-full bg-[#65BD6C]/[0.12]" />
          <span aria-hidden className="absolute -left-14 -bottom-20 w-48 h-48 rounded-full bg-[#65BD6C]/[0.08]" />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-6 px-6 sm:px-8 py-7 sm:py-8">
            {/* Avatar */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <div className="relative w-fit shrink-0">
              {/* Animated gradient ring */}
              <div className="absolute -inset-1.5 rounded-[1.35rem] bg-gradient-to-br from-[#65BD6C] via-white/30 to-[#65BD6C] opacity-80 animate-pulse [animation-duration:3s]" />
              <button
                type="button"
                onClick={handleAvatarPick}
                disabled={uploadingAvatar}
                title="Change profile picture"
                className="relative w-24 h-24 rounded-3xl overflow-hidden group cursor-pointer disabled:cursor-wait ring-4 ring-white/15 shadow-xl shadow-black/20"
              >
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center",
                    isAdmin
                      ? "bg-gradient-to-br from-[#65BD6C] to-[#036638]"
                      : "bg-gradient-to-br from-emerald-300 to-[#0e9e5b]",
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
                    <Shield className="w-10 h-10 text-white" />
                  ) : (
                    <User className="w-10 h-10 text-white" />
                  )}
                </div>

                {/* Hover / uploading overlay */}
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[1px] transition-opacity",
                    uploadingAvatar ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </div>
              </button>
              {/* Small status dot */}
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#EBF7EC] border-4 border-[#036638] flex items-center justify-center">
                <CircleCheck className="w-3 h-3 text-[#036638]" />
              </span>
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">
                  {user?.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-white/10 text-white border border-white/20 backdrop-blur whitespace-nowrap">
                  {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {roleLabel(user?.role)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-[#65BD6C]/20 text-[#D9F5DC] border border-[#65BD6C]/30 backdrop-blur whitespace-nowrap">
                  <CircleCheck className="w-3 h-3" />
                  Active
                </span>
              </div>
              <p className="flex items-center gap-2 text-sm text-white/75 mt-2 truncate">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                {user?.email}
              </p>

              {/* Meta chips */}
              <div className="flex items-center gap-2 flex-wrap mt-3">
                {memberSince && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/70 bg-white/[0.07] border border-white/10 rounded-lg px-2.5 py-1">
                    <CalendarDays className="w-3 h-3 text-[#65BD6C]" />
                    Member since {memberSince}
                  </span>
                )}
                {lastLogin && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/70 bg-white/[0.07] border border-white/10 rounded-lg px-2.5 py-1">
                    <Clock className="w-3 h-3 text-[#65BD6C]" />
                    Last login {lastLogin}
                  </span>
                )}
                {isVa && user?.shift && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/70 bg-white/[0.07] border border-white/10 rounded-lg px-2.5 py-1">
                    <Clock className="w-3 h-3 text-[#65BD6C]" />
                    {user.shift} shift
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────── Two-column body ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-start">
          {/* ======================= MAIN COLUMN ======================= */}
          <div className="lg:col-span-2 space-y-6">
            {/* - Account Info - */}
            <div className="bg-white rounded-2xl border border-[#EDEFF2] shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
              <div className="flex items-center gap-3.5 px-5 sm:px-6 py-4.5 border-b border-[#EDEFF2] bg-gradient-to-r from-[#F9FAFB] to-white">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EBF7EC] to-[#DCF3DF] flex items-center justify-center shrink-0 ring-1 ring-[#036638]/10">
                  <User className="w-4.5 h-4.5 text-[#036638]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#1A1B1E]">Account Information</h2>
                  <p className="text-xs text-[#6B7280] mt-0.5">Update your name and email address</p>
                </div>
              </div>

              <div className="px-5 sm:px-6 py-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#374151]">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                        placeholder="Your name"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#374151]">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={saving || !name.trim() || !email.trim()}
                    className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#036638] to-emerald-600 hover:from-[#025030] hover:to-emerald-700 text-white text-xs gap-1.5 shadow-[0_4px_14px_rgba(3,102,56,0.25)] hover:shadow-[0_6px_18px_rgba(3,102,56,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
              <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4.5 border-b border-[#EDEFF2] bg-gradient-to-r from-[#F9FAFB] to-white">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FDF6E3] to-[#FBE7B2] flex items-center justify-center shrink-0 ring-1 ring-[#8A6D1D]/10">
                    <Key className="w-4.5 h-4.5 text-[#8A6D1D]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-[#1A1B1E]">Password & Security</h2>
                    <p className="text-xs text-[#6B7280] mt-0.5">Protect your account with a strong password</p>
                  </div>
                </div>
                {!showPasswordForm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordForm(true)}
                    className="text-xs border-[#036638]/30 text-[#036638] shrink-0 hover:bg-[#EBF7EC] hover:border-[#036638]/40"
                  >
                    <LockKeyhole className="w-3.5 h-3.5 mr-1" />
                    Change
                  </Button>
                )}
              </div>

              {showPasswordForm ? (
                <div className="px-5 sm:px-6 py-6 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#374151]">Current Password</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                      <input
                        type={showCurrent ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className={cn(inputClass, "pr-11")}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#036638] hover:bg-[#F3F4F6] transition-colors"
                        title={showCurrent ? "Hide password" : "Show password"}
                        aria-label={showCurrent ? "Hide current password" : "Show current password"}
                      >
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#374151]">New Password</label>
                      <div className="relative">
                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                        <input
                          type={showNew ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={cn(inputClass, "pr-11")}
                          placeholder="Min. 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#036638] hover:bg-[#F3F4F6] transition-colors"
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
                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                        <input
                          type={showConfirm ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={cn(inputClass, "pr-11")}
                          placeholder="Re-enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#036638] hover:bg-[#F3F4F6] transition-colors"
                          title={showConfirm ? "Hide password" : "Show password"}
                          aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                        >
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Strength checklist */}
                  <div className="rounded-xl bg-[#F6F8F7] border border-[#E8EFEA] px-4 py-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-2">
                      Password requirements
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { ok: newPassword.length >= 6, label: "At least 6 characters" },
                        { ok: /[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword), label: "Letters & numbers" },
                        { ok: newPassword === confirmPassword && newPassword.length > 0, label: "Passwords match" },
                      ].map((req) => (
                        <span
                          key={req.label}
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[11px] font-medium rounded-lg px-2.5 py-1.5 border transition-colors",
                            req.ok
                              ? "text-[#036638] bg-[#EBF7EC] border-[#65BD6C]/30"
                              : "text-[#6B7280] bg-white border-[#E5E7EB]",
                          )}
                        >
                          {req.ok ? (
                            <CircleCheck className="w-3.5 h-3.5" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          )}
                          {req.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowPasswordForm(false)
                        setCurrentPassword("")
                        setNewPassword("")
                        setConfirmPassword("")
                      }}
                      className="text-xs text-[#6B7280] hover:bg-[#F3F4F6]"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleChangePassword}
                      disabled={changingPassword || !currentPassword || !newPassword}
                      className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#036638] to-emerald-600 hover:from-[#025030] hover:to-emerald-700 text-white text-xs shadow-[0_4px_14px_rgba(3,102,56,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {changingPassword ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                      )}
                      {changingPassword ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="px-5 sm:px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EBF7EC] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-[#036638]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1A1B1E]">Account is protected</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        Your password is kept encrypted — rotate it regularly for best practice.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ======================= RIGHT RAIL ======================= */}
          <div className="space-y-6">
            {/* - Account Status - */}
            <div className="bg-white rounded-2xl border border-[#EDEFF2] shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
              <div className="px-5 py-4.5 border-b border-[#EDEFF2] bg-gradient-to-r from-[#F9FAFB] to-white flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EBF7EC] to-[#DCF3DF] flex items-center justify-center shrink-0 ring-1 ring-[#036638]/10">
                  <BadgeCheck className="w-4.5 h-4.5 text-[#036638]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#1A1B1E]">Account Status</h2>
                  <p className="text-xs text-[#6B7280] mt-0.5">Current standing</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#6B7280]">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#036638] bg-[#EBF7EC] border border-[#65BD6C]/30 rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#036638] animate-pulse" />
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#6B7280]">Role</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1A1B1E] uppercase tracking-wide bg-[#F3F4F6] rounded-full px-2.5 py-1">
                    {isAdmin ? <Shield className="w-3 h-3 text-[#036638]" /> : <User className="w-3 h-3 text-[#0e9e5b]" />}
                    {roleLabel(user?.role)}
                  </span>
                </div>
                {memberSince && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#6B7280]">Member since</span>
                    <span className="text-xs font-semibold text-[#1A1B1E]">{memberSince}</span>
                  </div>
                )}
                {lastLogin && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#6B7280]">Last login</span>
                    <span className="text-xs font-semibold text-[#1A1B1E]">{lastLogin}</span>
                  </div>
                )}
                {isVa && user?.shift && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#6B7280]">Shift</span>
                    <span className="text-xs font-semibold text-[#1A1B1E] capitalize">{user.shift}</span>
                  </div>
                )}
              </div>
            </div>

            {/* - Role & Access - */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#036638] to-[#025030] p-5 shadow-[0_8px_24px_rgba(3,102,56,0.2)]">
              <span aria-hidden className="absolute -right-8 -top-10 w-32 h-32 rounded-full bg-white/[0.07]" />
              <span aria-hidden className="absolute right-10 -bottom-12 w-24 h-24 rounded-full bg-[#65BD6C]/[0.14]" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/12 ring-1 ring-white/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-[#65BD6C]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">{roleLabel(user?.role)} Access</h2>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#65BD6C] mt-0.5">
                    {isAdmin ? "Administrator" : "Virtual Assistant"}
                  </p>
                </div>
              </div>
              <p className="relative text-xs leading-relaxed text-white/75 mt-4">
                {ROLE_DESCRIPTIONS[user?.role ?? "va"]}
              </p>
              <div className="relative flex items-center gap-2 flex-wrap mt-4">
                {isAdmin ? (
                  <>
                    <span className="text-[10px] font-semibold text-white/80 bg-white/10 border border-white/15 rounded-full px-2.5 py-1">
                      Users
                    </span>
                    <span className="text-[10px] font-semibold text-white/80 bg-white/10 border border-white/15 rounded-full px-2.5 py-1">
                      Stages
                    </span>
                    <span className="text-[10px] font-semibold text-white/80 bg-white/10 border border-white/15 rounded-full px-2.5 py-1">
                      Reporting
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-semibold text-white/80 bg-white/10 border border-white/15 rounded-full px-2.5 py-1">
                      Board
                    </span>
                    <span className="text-[10px] font-semibold text-white/80 bg-white/10 border border-white/15 rounded-full px-2.5 py-1">
                      Checklists
                    </span>
                    <span className="text-[10px] font-semibold text-white/80 bg-white/10 border border-white/15 rounded-full px-2.5 py-1">
                      Notes
                    </span>
                  </>
                )}
              </div>
              <div className="relative flex items-center gap-1 text-[10px] font-semibold text-white/55 mt-4 hover:text-white/85 transition-colors cursor-default">
                <ChevronRight className="w-3 h-3" />
                Permissions are enforced server-side
              </div>
            </div>

            {/* - Security tip - */}
            <div className="rounded-2xl border border-[#FBE7B2]/70 bg-gradient-to-br from-[#FDF9EC] to-[#FBF3D9] p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FBE7B2] flex items-center justify-center shrink-0">
                  <Key className="w-4.5 h-4.5 text-[#8A6D1D]" />
                </div>
                <h2 className="text-sm font-bold text-[#5C4A10]">Security tip</h2>
              </div>
              <p className="text-xs leading-relaxed text-[#7A6520] mt-3">
                Use a unique password you don&apos;t reuse elsewhere, and update it every few months. You&apos;ll only
                ever be asked for it on the login screen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
