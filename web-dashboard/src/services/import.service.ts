import axiosInstance from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants"
import type { ApiResponse, ImportBatch } from "@/types"

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

  async applyImport(rows: ParsedRow[], fileName?: string, fileType?: string): Promise<ImportBatch> {
    const { data } = await axiosInstance.post<ApiResponse<ImportBatch>>(
      API_ENDPOINTS.PATIENTS_IMPORT_APPLY,
      { rows, fileName, fileType },
    )
    return data.data
  },

  async getImportHistory(): Promise<ImportBatch[]> {
    const { data } = await axiosInstance.get<ApiResponse<ImportBatch[]>>(
      API_ENDPOINTS.PATIENTS_IMPORT_HISTORY,
    )
    return data.data
  },
}
