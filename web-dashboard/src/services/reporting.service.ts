import axiosInstance from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants"
import type { AdminReport, ApiResponse, VaReport } from "@/types"

export const ReportingService = {
  async getAdminReport(): Promise<AdminReport> {
    const { data } = await axiosInstance.get<ApiResponse<AdminReport>>(
      API_ENDPOINTS.REPORTING.ADMIN,
    )
    return data.data
  },

  async getMyReport(): Promise<VaReport> {
    const { data } = await axiosInstance.get<ApiResponse<VaReport>>(
      API_ENDPOINTS.REPORTING.ME,
    )
    return data.data
  },

  async getVaReport(id: string): Promise<VaReport> {
    const { data } = await axiosInstance.get<ApiResponse<VaReport>>(
      API_ENDPOINTS.REPORTING.VA(id),
    )
    return data.data
  },
}
