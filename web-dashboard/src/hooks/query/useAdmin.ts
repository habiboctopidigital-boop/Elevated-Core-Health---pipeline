"use client"

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { AdminService } from "@/services/admin.service"
import { QUERY_KEYS } from "@/constants"
import type { User, ChecklistItemDef } from "@/types"
import { toast } from "sonner"

export function useAdminUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN.USERS,
    queryFn: () => AdminService.listUsers(),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      name: string
      email: string
      password: string
      role: "admin" | "va"
      shift?: string | null
    }) => AdminService.createUser(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN.USERS })
      toast.success("User created")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create user")
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: { id: string } & Partial<{
      name: string
      email: string
      password: string
      role: "admin" | "va"
      shift: string | null
    }>) => AdminService.updateUser(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN.USERS })
      toast.success("User updated")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update user")
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => AdminService.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN.USERS })
      toast.success("User deleted")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete user")
    },
  })
}

export function useAdminChecklist() {
  return useQuery({
    queryKey: QUERY_KEYS.PATIENTS.CHECKLIST_ITEMS,
    queryFn: () => AdminService.listChecklistItems(),
  })
}

export function useCreateChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { stage: string; label: string; sortOrder?: number }) =>
      AdminService.createChecklistItem(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.CHECKLIST_ITEMS })
      toast.success("Checklist item added")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create item")
    },
  })
}

export function useDeleteChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => AdminService.deleteChecklistItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.CHECKLIST_ITEMS })
      toast.success("Checklist item removed")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete item")
    },
  })
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN.ANALYTICS,
    queryFn: () => AdminService.getAnalytics(),
  })
}
