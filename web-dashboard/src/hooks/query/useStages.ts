"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AdminService } from "@/services/admin.service"
import { StagesService } from "@/services/stages.service"
import { QUERY_KEYS } from "@/constants"
import { DEFAULT_STAGES } from "@/types"
import type { PipelineStage } from "@/types"
import { toast } from "sonner"

/** Active stages for all logged-in users (board rendering). */
export function useStages() {
  return useQuery({
    queryKey: QUERY_KEYS.STAGES,
    queryFn: () => StagesService.getStages(),
  })
}

/**
 * Stage metadata derived from the API, with static fallback defaults while
 * loading so the UI never flashes empty. `order` drives the pipeline layout.
 */
export function useStageMeta() {
  const { data, isLoading } = useStages()
  const stages: PipelineStage[] = data && data.length > 0 ? data : DEFAULT_STAGES
  const byKey = new Map(stages.map((s) => [s.key, s]))
  const order = stages.map((s) => s.key)
  const labels: Record<string, string> = Object.fromEntries(stages.map((s) => [s.key, s.name]))
  const hints: Record<string, string> = Object.fromEntries(stages.map((s) => [s.key, s.hint ?? ""]))
  return { stages, byKey, order, labels, hints, isLoading }
}

function useInvalidateStages() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.STAGES })
    qc.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN.STAGES })
  }
}

/** All stages incl. inactive - admin only. */
export function useAdminStages() {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN.STAGES,
    queryFn: () => AdminService.listStages(),
  })
}

export function useCreateStage() {
  const invalidate = useInvalidateStages()
  return useMutation({
    mutationFn: (input: { name: string; hint?: string | null; isFinal?: boolean; isActive?: boolean }) =>
      AdminService.createStage(input),
    onSuccess: () => {
      invalidate()
      toast.success("Stage created")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create stage")
    },
  })
}

export function useUpdateStage() {
  const invalidate = useInvalidateStages()
  return useMutation({
    mutationFn: ({ key, ...input }: { key: string } & Partial<{
      name: string
      hint: string | null
      sortOrder: number
      isFinal: boolean
      isActive: boolean
    }>) => AdminService.updateStage(key, input),
    onSuccess: () => {
      invalidate()
      toast.success("Stage updated")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update stage")
    },
  })
}

export function useReorderStages() {
  const invalidate = useInvalidateStages()
  return useMutation({
    mutationFn: (keys: string[]) => AdminService.reorderStages(keys),
    onSuccess: () => {
      invalidate()
      toast.success("Stage order updated")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to reorder stages")
    },
  })
}

export function useDeleteStage() {
  const invalidate = useInvalidateStages()
  return useMutation({
    mutationFn: (key: string) => AdminService.deleteStage(key),
    onSuccess: () => {
      invalidate()
      toast.success("Stage deleted")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete stage")
    },
  })
}
