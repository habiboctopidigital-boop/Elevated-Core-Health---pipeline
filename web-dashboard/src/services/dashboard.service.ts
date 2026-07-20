import axiosInstance from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants"
import type { ApiResponse, DashboardSummary } from "@/types"

export const DashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const { data } = await axiosInstance.get<ApiResponse<DashboardSummary>>(
      API_ENDPOINTS.DASHBOARD_SUMMARY,
    )
    return data.data
  },
}
