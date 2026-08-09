"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginFormData } from "@/schemas/auth.schema"
import { useAuth } from "@/hooks/auth/useAuth"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { ROUTES } from "@/constants"

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null)
      await login(data.email, data.password)
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid email or password")
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md rounded-md bg-white p-10">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-6">
              <Image
                src="/logo.png"
                alt="Elevated Core Health Logo"
                width={100}
                height={100}
                priority
                className="h-24 w-auto"
              />
            </div>
            <h1 className="text-xl font-bold text-[#1A1B1E]">Welcome back</h1>
            <p className="text-sm text-[#6B7280] mt-1">
              Sign in to the Patient Pipeline Portal
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-[#374151] uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] transition-all"
                placeholder="name@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-[11px] text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-[#374151] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] transition-all pr-10"
                  placeholder="Enter your password"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-red-500 mt-1">{errors.password.message}</p>
              )}
              <div className="flex justify-end mt-1">
                <Link
                  href={ROUTES.FORGOT_PASSWORD}
                  className="text-[11px] text-[#6B7280] hover:text-[#036638] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 text-center">
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-[#036638] hover:bg-[#025030] text-white font-semibold rounded-lg shadow shadow-[#036638]/20 disabled:opacity-60 transition-all"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-center text-[10px] text-[#6B7280] mt-6">
            Elevated Core Health - Patient Pipeline Portal
          </p>
        </div>
      </div>


    </div>
  )
}
