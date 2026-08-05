"use client"

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { PatientsService } from "@/services/patients.service"
import { QUERY_KEYS } from "@/constants"
import type { Patient, PatientStage } from "@/types"
import { toast } from "sonner"

export function usePatients(stage?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.PATIENTS.ALL, stage],
    queryFn: () => PatientsService.list(stage),
  })
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.PATIENTS.DETAIL(id),
    queryFn: () => PatientsService.getById(id),
    enabled: !!id,
  })
}

export function useMoveStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, targetStage }: { id: string; targetStage: PatientStage }) =>
      PatientsService.moveStage(id, targetStage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD.SUMMARY })
      toast.success("Stage updated")
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message
      if (message?.includes("skip stages")) {
        toast.error("Cannot skip stages. Move forward one stage at a time.")
      } else if (message?.includes("checklist")) {
        toast.error("Please complete all checklist items before moving to the next stage.")
      } else {
        toast.error(message || "Failed to move stage")
      }
    },
  })
}

export function useAssignPatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo: string | null }) =>
      PatientsService.assign(id, assignedTo),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.DETAIL(vars.id) })
      toast.success("Assignment updated")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to assign")
    },
  })
}

export function useChecklistItems() {
  return useQuery({
    queryKey: QUERY_KEYS.PATIENTS.CHECKLIST_ITEMS,
    queryFn: () => PatientsService.getChecklistItems(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useToggleChecklist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      itemId,
      checked,
    }: {
      id: string
      itemId: string
      checked: boolean
    }) => PatientsService.toggleChecklist(id, itemId, checked),
    onMutate: async ({ id, itemId, checked }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      await qc.cancelQueries({ queryKey: QUERY_KEYS.PATIENTS.DETAIL(id) })

      const previousList = qc.getQueryData<Patient[]>(QUERY_KEYS.PATIENTS.ALL)
      const previousDetail = qc.getQueryData<Patient>(QUERY_KEYS.PATIENTS.DETAIL(id))

      qc.setQueryData<Patient[]>(QUERY_KEYS.PATIENTS.ALL, (old) => {
        if (!old) return old
        return old.map((p) => {
          if (p.id !== id) return p
          return {
            ...p,
            checklistState: {
              ...p.checklistState,
              [p.stage]: {
                ...(p.checklistState[p.stage] || {}),
                [itemId]: checked,
              },
            },
          }
        })
      })

      qc.setQueryData<Patient>(QUERY_KEYS.PATIENTS.DETAIL(id), (old) => {
        if (!old) return old
        return {
          ...old,
          checklistState: {
            ...old.checklistState,
            [old.stage]: {
              ...(old.checklistState[old.stage] || {}),
              [itemId]: checked,
            },
          },
        }
      })

      return { previousList, previousDetail }
    },
    onError: (err: any, vars, context) => {
      if (context?.previousList) {
        qc.setQueryData(QUERY_KEYS.PATIENTS.ALL, context.previousList)
      }
      if (context?.previousDetail) {
        qc.setQueryData(QUERY_KEYS.PATIENTS.DETAIL(vars.id), context.previousDetail)
      }
      toast.error(err?.response?.data?.message || "Failed to update checklist")
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
    },
  })
}

export function useUpdateNotes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      PatientsService.updateNotes(id, notes),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.DETAIL(vars.id) })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      toast.success("Notes updated")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update notes")
    },
  })
}

export function useFlagPatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      PatientsService.flag(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD.SUMMARY })
      toast.success("Patient flagged for Donna")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to flag")
    },
  })
}

export function useClearFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, clearReason }: { id: string; clearReason: string }) =>
      PatientsService.clearFlag(id, clearReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD.SUMMARY })
      toast.success("Flag cleared")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to clear flag")
    },
  })
}

export function useListVas() {
  return useQuery({
    queryKey: ["users", "vas"],
    queryFn: () => PatientsService.listVas(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useClaimPatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      PatientsService.claim(id, userId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.DETAIL(vars.id) })
      toast.success("Patient claimed")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to claim")
    },
  })
}

export function useCheckEligibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: { id: string } & Partial<{
      paymentMethod?: string | null
      insuranceProvider?: string | null
      paymentDetails?: Record<string, unknown> | null
    }>) => PatientsService.checkEligibility(id, input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.DETAIL(vars.id) })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      toast.success("Eligibility check completed")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Eligibility check failed")
    },
  })
}

export function useIntake() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof PatientsService.intake>[0]) =>
      PatientsService.intake(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      toast.success("Patient added via test intake")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Intake failed")
    },
  })
}

export function useUpdatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: { id: string } & Partial<{
      firstName: string | null
      lastName: string | null
      location: string | null
      email: string | null
      phone: string | null
      copayAmount: string | null
      amountPaid: string | null
    }>) => PatientsService.updatePatient(id, input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.DETAIL(vars.id) })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CRM.CONTACTS })
      toast.success("Patient updated")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update patient")
    },
  })
}

export function useLockPatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => PatientsService.lockPatient(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.DETAIL(id) })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CRM.CONTACTS })
      toast.success("Patient locked")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to lock patient")
    },
  })
}

export function useUnlockPatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => PatientsService.unlockPatient(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.DETAIL(id) })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CRM.CONTACTS })
      toast.success("Patient unlocked")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to unlock patient")
    },
  })
}

export function useUpdatePatientStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & { status: "active" | "cancelled"; reason?: string | null }) =>
      PatientsService.updateStatus(id, input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.DETAIL(vars.id) })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS.ALL })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CRM.CONTACTS })
      toast.success("Status updated")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update status")
    },
  })
}
