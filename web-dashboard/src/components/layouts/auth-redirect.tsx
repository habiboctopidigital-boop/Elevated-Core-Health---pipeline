"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/auth/useAuth"
import { SplashLoader } from "@/components/ui/splash-loader"

interface AuthRedirectProps {
  children: React.ReactNode
}

export function AuthRedirect({ children }: AuthRedirectProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading } = useAuth()

  // Public routes that should never show splash screen
  const publicRoutes = ["/login", "/forgot-password", "/reset-password", "/"]
  const isDashboardRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/admin")
  const shouldShowSplash = isDashboardRoute && isLoading

  useEffect(() => {
    if (isLoading || !user) return

    // Don't redirect on public routes
    if (publicRoutes.includes(pathname)) {
      return
    }

    const isAdminRoute = pathname.startsWith("/admin")
    const isUserAdmin = user.role === "admin"

    // Admin user on VA dashboard - redirect to admin
    if (!isAdminRoute && isUserAdmin && !publicRoutes.includes(pathname)) {
      router.push("/admin/dashboard")
      return
    }

    // VA user on admin dashboard - redirect to VA dashboard
    if (isAdminRoute && !isUserAdmin) {
      router.push("/dashboard")
      return
    }

    // User on root path - redirect based on role
    if (pathname === "/" && user) {
      if (isUserAdmin) {
        router.push("/admin/dashboard")
      } else {
        router.push("/dashboard")
      }
      return
    }
  }, [user, isLoading, pathname, router])

  // Only show splash on dashboard pages while loading
  return (
    <>
      {shouldShowSplash && (
        <SplashLoader
          show={true}
          message="Loading"
          subtitle="Setting up your workspace..."
        />
      )}
      {!shouldShowSplash && children}
    </>
  )
}
