import axiosInstance from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants"
import type { ApiResponse, ActivityLog, PaginatedResponse } from "@/types"

export const ActivityLogService = {
  async list(params?: {
    patientId?: string
    type?: string
    author?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<ActivityLog>> {
    const { data } = await axiosInstance.get<ApiResponse<PaginatedResponse<ActivityLog>>>(
      API_ENDPOINTS.ACTIVITY_LOG,
      { params },
    )
    return data.data
  },
}
