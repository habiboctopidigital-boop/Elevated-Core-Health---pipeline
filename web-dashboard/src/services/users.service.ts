import axiosInstance from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants"
import type { ApiResponse, User, VaUser } from "@/types"

export const UsersService = {
  async listAll(): Promise<User[]> {
    const { data } = await axiosInstance.get<ApiResponse<User[]>>(API_ENDPOINTS.USERS)
    return data.data
  },

  async listVas(): Promise<VaUser[]> {
    const { data } = await axiosInstance.get<ApiResponse<VaUser[]>>(API_ENDPOINTS.USERS_VAS)
    return data.data
  },
}
