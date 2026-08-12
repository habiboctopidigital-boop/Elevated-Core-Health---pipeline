import axiosInstance from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants"
import type { AdminReport, ApiResponse, VaReport } from "@/types"

/** Input for the client-generated export audit record (task.md §15). */
export interface LogExportInput {
  reportType: string
  /** Human-readable record noun for the activity message (e.g. "appointment"). */
  label?: string
  scope?: string
  recordCount: number
  format: "csv" | "xlsx"
}

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
   *
   * The backend caps `scope` at 200 chars; a long search string would make
   * the whole request fail validation and silently drop the audit row, so
   * scope is truncated here before it can.
   */
  async logExport(input: LogExportInput): Promise<void> {
    const scope = input.scope && input.scope.length > 200 ? `${input.scope.slice(0, 197)}...` : input.scope
    await axiosInstance.post(API_ENDPOINTS.REPORTING.EXPORT_LOG, { ...input, scope })
  },
}
