"use client"

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { AdminService } from "@/services/admin.service"
import { QUERY_KEYS } from "@/constants"
import type { User, ChecklistItemDef, EligibilityRule, CrmProvider, CrmPermission } from "@/types"
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
      // The admin Users page and the board's "Assign to VA" dropdowns read from
      // two different caches — without this, a newly created VA shows up on
      // the Users page but stays invisible everywhere else until a hard reload.
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS.VAS })
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
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS.VAS })
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
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS.VAS })
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
    mutationFn: (input: { stage: string; label: string; status: "required" | "optional"; sortOrder?: number }) =>
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

export function useUpdateChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, label, status, stage, sortOrder, silent }: { id: string; label: string; status?: "required" | "optional"; stage?: string; sortOrder?: number; silent?: boolean }) =>
      AdminService.updateChecklistItem(id, {
        label,
        ...(status ? { status } : {}),
        ...(stage ? { stage } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      }).then((item) => ({ item, silent })),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.CHECKLIST_ITEMS })
      if (!res.silent) toast.success("Checklist item updated")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update item")
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

export function useEligibilityRules() {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN.ELIGIBILITY_RULES,
    queryFn: () => AdminService.listEligibilityRules(),
  })
}

export function useCreateEligibilityRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      label: string
      field: string
      operator: string
      value?: string | null
      isActive: boolean
    }) => AdminService.createEligibilityRule(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN.ELIGIBILITY_RULES })
      toast.success("Eligibility rule added")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create rule")
    },
  })
}

export function useUpdateEligibilityRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<{
      label: string
      field: string
      operator: string
      value: string | null
      isActive: boolean
    }>) => AdminService.updateEligibilityRule(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN.ELIGIBILITY_RULES })
      toast.success("Eligibility rule updated")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update rule")
    },
  })
}

export function useDeleteEligibilityRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => AdminService.deleteEligibilityRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN.ELIGIBILITY_RULES })
      toast.success("Eligibility rule removed")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete rule")
    },
  })
}

export function useCrmIntegration() {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN.CRM_INTEGRATION,
    queryFn: () => AdminService.getCrmIntegration(),
  })
}

export function useConnectCrm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { provider: CrmProvider; apiKey: string; permission: CrmPermission }) =>
      AdminService.connectCrm(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN.CRM_INTEGRATION })
      toast.success("CRM connected")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to connect CRM")
    },
  })
}

export function useDisconnectCrm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => AdminService.disconnectCrm(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN.CRM_INTEGRATION })
      toast.success("CRM disconnected")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to disconnect CRM")
    },
  })
}

export function useUpdateCrmPermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (permission: CrmPermission) => AdminService.updateCrmPermission(permission),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN.CRM_INTEGRATION })
      toast.success("Permission updated")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update permission")
    },
  })
}
