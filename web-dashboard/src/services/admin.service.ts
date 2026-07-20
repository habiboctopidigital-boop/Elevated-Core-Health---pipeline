import axiosInstance from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants"
import type { ApiResponse, User, ChecklistItemDef, AdminAnalytics } from "@/types"

export const AdminService = {
  async listUsers(): Promise<User[]> {
    const { data } = await axiosInstance.get<ApiResponse<User[]>>(
      API_ENDPOINTS.ADMIN.USERS,
    )
    return data.data
  },

  async createUser(input: {
    name: string
    email: string
    password: string
    role: "admin" | "va"
    shift?: string | null
  }): Promise<User> {
    const { data } = await axiosInstance.post<ApiResponse<User>>(
      API_ENDPOINTS.ADMIN.USERS,
      input,
    )
    return data.data
  },

  async updateUser(id: string, input: Partial<{
    name: string
    email: string
    password: string
    role: "admin" | "va"
    shift: string | null
  }>): Promise<User> {
    const { data } = await axiosInstance.patch<ApiResponse<User>>(
      `${API_ENDPOINTS.ADMIN.USERS}/${id}`,
      input,
    )
    return data.data
  },

  async deleteUser(id: string): Promise<void> {
    await axiosInstance.delete(`${API_ENDPOINTS.ADMIN.USERS}/${id}`)
  },

  async listChecklistItems(): Promise<ChecklistItemDef[]> {
    const { data } = await axiosInstance.get<ApiResponse<ChecklistItemDef[]>>(
      API_ENDPOINTS.ADMIN.CHECKLIST_ITEMS,
    )
    return data.data
  },

  async createChecklistItem(input: {
    stage: string
    label: string
    sortOrder?: number
  }): Promise<ChecklistItemDef> {
    const { data } = await axiosInstance.post<ApiResponse<ChecklistItemDef>>(
      API_ENDPOINTS.ADMIN.CHECKLIST_ITEMS,
      input,
    )
    return data.data
  },

  async deleteChecklistItem(id: string): Promise<void> {
    await axiosInstance.delete(`${API_ENDPOINTS.ADMIN.CHECKLIST_ITEMS}/${id}`)
  },

  async getAnalytics(): Promise<AdminAnalytics> {
    const { data } = await axiosInstance.get<ApiResponse<AdminAnalytics>>(
      API_ENDPOINTS.ADMIN.ANALYTICS,
    )
    return data.data
  },
}
