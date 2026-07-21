import axiosInstance from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants"
import type { ApiResponse } from "@/types"

export interface ParsedRow {
  [key: string]: string | undefined
}

export interface ImportResult {
  totalRows: number
  data: ParsedRow[]
}

export const ImportService = {
  async uploadFile(file: File): Promise<ImportResult> {
    const formData = new FormData()
    formData.append("file", file)

    const { data } = await axiosInstance.post<ApiResponse<ImportResult>>(
      API_ENDPOINTS.PATIENTS_IMPORT,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      },
    )

    return data.data
  },
}
