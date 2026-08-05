import { Space_Grotesk, Orbitron } from "next/font/google"
import "./globals.css"
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
})
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
})
import ReduxProvider from "@/providers/ReduxProvider"
import QueryProvider from "@/providers/QueryProvider"
import ThemeProvider from "@/providers/ThemeProvider"
import { Toaster } from "sonner"

export const metadata = {
  title: "Elevated Core Health - Patient Pipeline Portal",
  description: "Internal operations portal for patient pipeline management",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${orbitron.variable} font-sans antialiased`}>
        <ReduxProvider>
          <QueryProvider>
            <ThemeProvider>
              {children}
              <Toaster 
                position="top-right" 
                toastOptions={{
                  className: "group toast group-[.toaster]:bg-white/80 group-[.toaster]:backdrop-blur-xl group-[.toaster]:border-white/40 group-[.toaster]:shadow-[0_8px_30px_rgb(0,0,0,0.12)] group-[.toaster]:rounded-2xl border border-gray-200/50",
                  classNames: {
                    title: "font-space font-bold text-[15px]",
                    description: "font-sans text-sm text-gray-600",
                    actionButton: "group-[.toast]:bg-[#036638] group-[.toast]:text-white group-[.toast]:rounded-lg group-[.toast]:font-semibold",
                    cancelButton: "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-700 group-[.toast]:rounded-lg",
                    success: "group-[.toaster]:bg-emerald-50/90 group-[.toaster]:border-emerald-200/60 group-[.toaster]:text-emerald-950",
                    error: "group-[.toaster]:bg-rose-50/90 group-[.toaster]:border-rose-200/60 group-[.toaster]:text-rose-950",
                    warning: "group-[.toaster]:bg-amber-50/90 group-[.toaster]:border-amber-200/60 group-[.toaster]:text-amber-950",
                    info: "group-[.toaster]:bg-blue-50/90 group-[.toaster]:border-blue-200/60 group-[.toaster]:text-blue-950",
                  }
                }} 
              />
            </ThemeProvider>
          </QueryProvider>
        </ReduxProvider>
      </body>
    </html>
  )
}
