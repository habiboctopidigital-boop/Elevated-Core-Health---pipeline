import axios from "axios"
import Cookies from "js-cookie"
import { config } from "@/config"
import type { ApiResponse } from "@/types"

const axiosInstance = axios.create({
  baseURL: "http://localhost:8080/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
})

axiosInstance.interceptors.request.use(
  (conf) => {
    const token = Cookies.get(config.auth.tokenKey)
    if (token) {
      conf.headers.Authorization = `Bearer ${token}`
    }
    return conf
  },
  (error) => Promise.reject(error),
)

axiosInstance.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>
    if (body.success === false) {
      return Promise.reject(new Error(body.message || "Request failed"))
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = Cookies.get(config.auth.refreshTokenKey)
        if (!refreshToken) {
          Cookies.remove(config.auth.tokenKey)
          Cookies.remove("ech_role")
          if (typeof window !== "undefined") {
            window.location.href = "/login"
          }
          return Promise.reject(error)
        }

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken },
        )

        const body = response.data as ApiResponse<{ accessToken: string; refreshToken: string }>
        if (!body.success || !body.data) {
          throw new Error("Refresh failed")
        }

        Cookies.set(config.auth.tokenKey, body.data.accessToken, { expires: 7, sameSite: "Lax" })
        Cookies.set(config.auth.refreshTokenKey, body.data.refreshToken, { expires: 30, sameSite: "Lax" })

        originalRequest.headers.Authorization = `Bearer ${body.data.accessToken}`
        return axiosInstance(originalRequest)
      } catch {
        Cookies.remove(config.auth.tokenKey)
        Cookies.remove(config.auth.refreshTokenKey)
        Cookies.remove("ech_role")
        if (typeof window !== "undefined") {
          window.location.href = "/login"
        }
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

export default axiosInstance
