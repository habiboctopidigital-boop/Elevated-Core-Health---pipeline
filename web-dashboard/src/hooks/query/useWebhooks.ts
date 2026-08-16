"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { QUERY_KEYS } from "@/constants"
import { WebhooksService } from "@/services/webhooks.service"
import { toast } from "sonner"

export function useWebhookSettings() {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN.WEBHOOK_SETTINGS,
    queryFn: () => WebhooksService.getSettings(),
  })
}

export function useRotateWebhookSecret() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => WebhooksService.rotateSecret(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN.WEBHOOK_SETTINGS })
      toast.success("Webhook secret rotated — update Make.com with the new value now")
    },
    onError: (err: unknown) => {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(apiMessage || "Failed to rotate webhook secret")
    },
  })
}

export function useSendTestWebhook() {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => WebhooksService.sendTest(payload),
    onSuccess: (data) => {
      // The mutation always "succeeds" here — it means we successfully reached
      // /patients/intake and got a structured reply back. Whether THAT reply
      // is itself a success (patient created) or a rejection (bad secret, 409
      // duplicate email, validation error, ...) lives in data.response, so the
      // toast has to reflect that, not just "the request didn't throw".
      if (data.response.success) {
        toast.success(`Webhook accepted — created "${data.response.data?.name ?? "patient"}" in Onboarding`)
      } else {
        toast.error(data.response.message || `Webhook rejected (HTTP ${data.httpStatus})`)
      }
    },
    onError: (err: unknown) => {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(apiMessage || "Failed to send test webhook")
    },
  })
}
