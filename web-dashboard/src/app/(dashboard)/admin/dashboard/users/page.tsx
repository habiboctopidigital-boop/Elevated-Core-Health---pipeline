"use client"

import { useState } from "react"
import { useAdminUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/query/useAdmin"
import { useAuth } from "@/hooks/auth/useAuth"
import { Loader2, Plus, Pencil, Trash2, Shield, ShieldCheck, AlertTriangle, User as UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SettingsNav } from "@/components/features/settings-nav"
import type { User } from "@/types"
import { cn } from "@/lib/utils"
import { roleLabel } from "@/lib/roles"

export default function AdminUsersPage() {
  const { data: users, isLoading } = useAdminUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  const { user: currentUser } = useAuth()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1)
  const [typedDeleteText, setTypedDeleteText] = useState("")

  const targetUser = confirmDelete ? users?.find((u) => u.id === confirmDelete) ?? null : null

  // task.md §10, §11, §17 — the UI mirrors what the backend already enforces:
  // no self-delete, the Super Admin account is protected, and only a Super
  // Admin may delete an Admin.
  const canDeleteUser = (u: User) => {
    if (u.id === currentUser?.id) return false
    if (u.role === "super_admin") return false
    if (u.role === "admin" && currentUser?.role !== "super_admin") return false
    return true
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  const openCreate = () => {
    setEditingUser(null)
    reset({
      name: "",
      email: "",
      password: "",
      role: "va",
      shift: "",
    })
    setModalOpen(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    reset({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      shift: user.shift || "",
    })
    setModalOpen(true)
  }

  const onSubmit = async (data: any) => {
    const payload = {
      name: data.name,
      email: data.email,
      role: data.role as "admin" | "va",
      shift: data.shift || null,
      ...(data.password ? { password: data.password } : {}),
    }

    if (editingUser) {
      await updateUser.mutateAsync({ id: editingUser.id, ...payload })
    } else {
      await createUser.mutateAsync(payload as any)
    }
    setModalOpen(false)
  }

  const closeDeleteModal = () => {
    setConfirmDelete(null)
    setDeleteStep(1)
    setTypedDeleteText("")
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteUser.mutateAsync(id)
      closeDeleteModal()
    } catch {
      // Keep the modal open so the user can retry — the hook already toasted the reason.
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#036638] animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* Settings Navigation - Top */}
      <SettingsNav currentPage="users" />

      <div className="space-y-4  max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#1A1B1E]">User Management</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">
            Manage the three portal accounts
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#036638] hover:bg-[#025030] text-white text-xs gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] divide-y divide-[#E5E7EB]/50 overflow-hidden">
        {users && users.length > 0 ? (
          users.map((user) => (
            <div key={user.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#EBF7EC]/30 transition-colors">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                user.role === "va" ? "bg-[#EBF7EC]" : "bg-[#036638]",
              )}>
                {user.role === "va" ? (
                  <UserIcon className="w-5 h-5 text-[#036638]" />
                ) : (
                  <Shield className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A1B1E] truncate">{user.name}</p>
                <p className="text-xs text-[#6B7280]">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] font-semibold uppercase px-2 py-0.5 rounded",
                  user.role === "va"
                    ? "bg-[#EBF7EC] text-[#036638]"
                    : "bg-[#036638]/10 text-[#036638]",
                )}>
                  {roleLabel(user.role)}
                </span>
                {user.shift && (
                  <span className="text-[10px] text-[#6B7280] bg-[#F4F5F7] px-2 py-0.5 rounded">
                    {user.shift}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {user.role === "super_admin" ? (
                  <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-1.5 rounded-lg bg-[#FBE7B2]/60 text-[#8A6D1D]">
                    <ShieldCheck className="w-3 h-3" />
                    Protected
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => openEdit(user)}
                      className="p-1.5 rounded-lg hover:bg-[#EBF7EC] text-[#6B7280] hover:text-[#036638] transition-colors"
                      title="Edit user"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {canDeleteUser(user) && (
                      <button
                        onClick={() => {
                          setConfirmDelete(user.id)
                          setDeleteStep(1)
                          setTypedDeleteText("")
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[#6B7280] hover:text-red-500 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-[#6B7280]">No users found</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation — two steps (task.md §9): warning first, then typed "DELETE" */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => {
          if (!open && !deleteUser.isPending) closeDeleteModal()
        }}
      >
        <DialogContent
          className="sm:max-w-md p-0 gap-0 overflow-hidden"
          onEscapeKeyDown={(e) => {
            if (deleteUser.isPending) e.preventDefault()
          }}
          onPointerDownOutside={(e) => {
            if (deleteUser.isPending) e.preventDefault()
          }}
        >
          {targetUser && deleteStep === 1 ? (
            <>
              {/* Step 1 — Warning confirmation */}
              <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-red-50/70 to-white">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-red-500/10 border border-red-200/60 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[#1A1B1E]">Delete user?</h3>
                    <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                      You are about to permanently delete{" "}
                      <span className="font-semibold text-[#1A1B1E]">{targetUser.name}</span>. This
                      action cannot be undone.
                    </p>
                  </div>
                </div>

                {/* User summary card */}
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-[#036638] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {targetUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1A1B1E] truncate">{targetUser.name}</p>
                    <p className="text-xs text-[#6B7280] truncate">{targetUser.email}</p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md bg-[#036638]/10 text-[#036638] shrink-0">
                    {roleLabel(targetUser.role)}
                  </span>
                </div>
              </div>

              <div className="px-6 py-3 bg-[#FEFCE8] border-y border-amber-100 text-[11px] text-amber-800 leading-relaxed flex gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Deleting removes {targetUser.name}&apos;s portal access immediately. Their activity
                  history is preserved in the audit log with a name snapshot.
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 px-6 py-4">
                <span className="text-[10px] font-medium text-[#9CA3AF]">Step 1 of 2</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={closeDeleteModal} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteStep(2)}
                    className="text-xs"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </>
          ) : targetUser ? (
            <>
              {/* Step 2 — Typed confirmation */}
              <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-red-50/70 to-white">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-red-500/10 border border-red-200/60 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[#1A1B1E]">Confirm permanent deletion</h3>
                    <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                      Type{" "}
                      <span className="font-mono font-bold text-red-600 bg-red-50 border border-red-100 rounded px-1.5 py-0.5">
                        DELETE
                      </span>{" "}
                      to permanently remove{" "}
                      <span className="font-semibold text-[#1A1B1E]">{targetUser.name}</span>. This
                      cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 mt-4">
                <label className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">
                  Type DELETE to confirm
                </label>
                <input
                  type="text"
                  value={typedDeleteText}
                  onChange={(e) => setTypedDeleteText(e.target.value)}
                  placeholder="DELETE"
                  autoFocus
                  className={`mt-1.5 w-full h-11 px-3 rounded-lg border text-sm font-mono text-center focus:outline-none focus:ring-2 transition-all ${
                    typedDeleteText.length > 0 && typedDeleteText !== "DELETE"
                      ? "border-red-400 bg-red-50/40 focus:ring-red-500/30"
                      : typedDeleteText === "DELETE"
                        ? "border-[#036638] bg-[#EBF7EC]/60 focus:ring-[#036638]/30"
                        : "border-[#E5E7EB] focus:ring-red-500/30 focus:border-red-400"
                  }`}
                  onKeyDown={(e) => {
                    // Accept Enter once the exact text matches — mirrors the
                    // disabled Delete Account button without surprising submit behavior.
                    if (e.key === "Enter" && typedDeleteText === "DELETE" && !deleteUser.isPending) {
                      e.preventDefault()
                      handleDelete(targetUser.id)
                    }
                  }}
                />
                {typedDeleteText.length > 0 && typedDeleteText !== "DELETE" && (
                  <p className="text-[11px] text-red-500 mt-1.5">
                    Text does not match. Type exactly <span className="font-mono font-bold">DELETE</span>.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 px-6 py-4 mt-2">
                <span className="text-[10px] font-medium text-[#9CA3AF]">Step 2 of 2</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setDeleteStep(1)} className="text-xs" disabled={deleteUser.isPending}>
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(targetUser.id)}
                    disabled={typedDeleteText !== "DELETE" || deleteUser.isPending}
                    className="text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deleteUser.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Account"
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1B1E]">
              {editingUser ? "Edit User" : "Add User"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Name</label>
              <input
                {...register("name", { required: "Name is required" })}
                className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              />
              {errors.name && <p className="text-[11px] text-red-500">{errors.name.message as string}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Email</label>
              <input
                type="email"
                {...register("email", { required: "Email is required" })}
                className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              />
              {errors.email && <p className="text-[11px] text-red-500">{errors.email.message as string}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">
                Password {editingUser && "(leave blank to keep current)"}
              </label>
              <input
                type="password"
                {...register("password", editingUser ? {} : { required: "Password is required" })}
                className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              />
              {errors.password && <p className="text-[11px] text-red-500">{errors.password.message as string}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#374151]">Role</label>
                <select
                  {...register("role")}
                  className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30 bg-white"
                >
                  <option value="va">VA</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#374151]">Shift</label>
                <input
                  {...register("shift")}
                  placeholder="e.g. Morning"
                  className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createUser.isPending || updateUser.isPending}
                className="bg-[#036638] hover:bg-[#025030] text-white text-xs"
              >
                {createUser.isPending || updateUser.isPending
                  ? "Saving..."
                  : editingUser
                    ? "Save Changes"
                    : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}
