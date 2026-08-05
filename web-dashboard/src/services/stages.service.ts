import axiosInstance from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants"
import type { ApiResponse, PipelineStage } from "@/types"

export const StagesService = {
  async getStages(): Promise<PipelineStage[]> {
    const { data } = await axiosInstance.get<ApiResponse<PipelineStage[]>>(
      API_ENDPOINTS.STAGES,
    )
    return data.data
  },
}
