import axiosInstance from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants"
import type { ApiResponse, WebhookSettings, WebhookTestResult } from "@/types"

export const WebhooksService = {
  async getSettings(): Promise<WebhookSettings> {
    const { data } = await axiosInstance.get<ApiResponse<WebhookSettings>>(
      API_ENDPOINTS.ADMIN.WEBHOOK_SETTINGS,
    )
    return data.data
  },

  async rotateSecret(): Promise<{ secret: string; rotatedAt: string }> {
    const { data } = await axiosInstance.post<ApiResponse<{ secret: string; rotatedAt: string }>>(
      API_ENDPOINTS.ADMIN.WEBHOOK_ROTATE_SECRET,
    )
    return data.data
  },

  async sendTest(payload: Record<string, unknown>): Promise<WebhookTestResult> {
    const { data } = await axiosInstance.post<ApiResponse<WebhookTestResult>>(
      API_ENDPOINTS.ADMIN.WEBHOOK_TEST,
      payload,
    )
    return data.data
  },
}
