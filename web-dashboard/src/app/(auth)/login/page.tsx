"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginFormData } from "@/schemas/auth.schema"
import { useAuth } from "@/hooks/auth/useAuth"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Loader2 } from "lucide-react"

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
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#036638] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#036638]/20">
              <span className="text-white text-2xl font-bold tracking-tight">ECH</span>
            </div>
            <h1 className="text-xl font-bold text-[#1a1a1a]">Welcome back</h1>
            <p className="text-sm text-[#8B8D92] mt-1">
              Sign in to the Patient Pipeline Portal
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-[#4a4a4a] uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full h-10 px-3 rounded-lg border border-[#EADEC0] bg-white text-sm text-[#1a1a1a] placeholder:text-[#8B8D92] focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] transition-all"
                placeholder="name@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-[11px] text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-[#4a4a4a] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full h-10 px-3 rounded-lg border border-[#EADEC0] bg-white text-sm text-[#1a1a1a] placeholder:text-[#8B8D92] focus:outline-none focus:ring-2 focus:ring-[#036638]/30 focus:border-[#036638] transition-all pr-10"
                  placeholder="Enter your password"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8D92] hover:text-[#4a4a4a]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 text-center">
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-[#036638] hover:bg-[#028544] text-white font-semibold rounded-lg shadow shadow-[#036638]/20 disabled:opacity-60 transition-all"
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

          <p className="text-center text-[10px] text-[#8B8D92] mt-6">
            Elevated Core Health &middot; Patient Pipeline Portal
          </p>
        </div>
      </div>

      <div className="hidden lg:flex w-[480px] bg-gradient-to-br from-[#036638] via-[#036638] to-[#024d2b] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative text-center">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <span className="text-white text-3xl font-bold tracking-tight">ECH</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Patient Pipeline Portal
          </h2>
          <p className="text-[#65BD6C] text-sm leading-relaxed max-w-xs mx-auto">
            Track patients through every stage of the administrative workflow — from onboarding to reconciliation.
          </p>
        </div>
      </div>
    </div>
  )
}
