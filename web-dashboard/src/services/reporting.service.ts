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

  /**
   * Records a client-generated export as an activity (task.md §15). Fire-
   * and-forget from the caller's perspective — a failure here should never
   * block the download the user already has.
   */
  async logExport(input: { reportType: string; scope?: string; recordCount: number; format: "csv" | "xlsx" }): Promise<void> {
    await axiosInstance.post(API_ENDPOINTS.REPORTING.EXPORT_LOG, input)
  },
}
