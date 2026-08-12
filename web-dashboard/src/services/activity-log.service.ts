import axiosInstance from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants"
import type { ApiResponse, ActivityLog, PaginatedResponse } from "@/types"

export interface ActivityLogFilters {
  patientId?: string
  type?: string
  category?: string
  author?: string
  actorId?: string
  role?: string
  action?: string
  entityType?: string
  entityId?: string
  q?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export const ActivityLogService = {
  async list(params?: ActivityLogFilters): Promise<PaginatedResponse<ActivityLog>> {
    const { data } = await axiosInstance.get<ApiResponse<PaginatedResponse<ActivityLog>>>(
      API_ENDPOINTS.ACTIVITY_LOG,
      { params },
    )
    return data.data
  },
}
