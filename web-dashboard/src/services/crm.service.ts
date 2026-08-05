import axiosInstance from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants"
import type { ApiResponse, CrmContactsResponse } from "@/types"

export interface CrmFilters {
  search?: string
  status?: string
  stage?: string
  eligibility?: string
  assignedTo?: string
  page?: number
  limit?: number
}

function toQuery(filters: CrmFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.status) params.set("status", filters.status)
  if (filters.stage) params.set("stage", filters.stage)
  if (filters.eligibility) params.set("eligibility", filters.eligibility)
  if (filters.assignedTo) params.set("assignedTo", filters.assignedTo)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))
  const q = params.toString()
  return q ? `?${q}` : ""
}

export const CrmService = {
  async getContacts(filters: CrmFilters = {}): Promise<CrmContactsResponse> {
    const { data } = await axiosInstance.get<ApiResponse<CrmContactsResponse>>(
      `${API_ENDPOINTS.CRM.CONTACTS}${toQuery(filters)}`,
    )
    return data.data
  },

  /** Fetch CSV text honoring current filters. */
  async exportContacts(filters: Omit<CrmFilters, "page" | "limit"> = {}): Promise<string> {
    const { data } = await axiosInstance.get<ApiResponse<{ csv: string }>>(
      `${API_ENDPOINTS.CRM.EXPORT}${toQuery(filters)}`,
    )
    return data.data.csv
  },
}
