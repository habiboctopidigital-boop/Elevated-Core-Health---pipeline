import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const authRoutes = ["/login"]
const vaRoutes = ["/va"]
const adminRoutes = ["/admin"]

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("ech_access_token")?.value
  const { pathname } = request.nextUrl

  const isAuth = !!accessToken

  if (authRoutes.some((route) => pathname.startsWith(route)) && isAuth) {
    const role = request.cookies.get("ech_role")?.value
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    return NextResponse.redirect(new URL("/va", request.url))
  }

  const isVaRoute = vaRoutes.some((route) => pathname.startsWith(route))
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route))

  if ((isVaRoute || isAdminRoute) && !isAuth) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAdminRoute && isAuth) {
    const role = request.cookies.get("ech_role")?.value
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/va", request.url))
    }
  }

  if (isVaRoute && isAuth) {
    const role = request.cookies.get("ech_role")?.value
    if (role !== "va" && role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
