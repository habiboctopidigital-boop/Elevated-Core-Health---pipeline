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
import { NotificationsProvider } from "@/providers/NotificationsProvider"
import { Toaster } from "sonner"
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from "lucide-react"

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
              <NotificationsProvider>
                {children}
              </NotificationsProvider>
              <Toaster
                position="top-right"
                gap={12}
                offset={20}
                visibleToasts={4}
                closeButton
                icons={{
                  success: <CheckCircle2 className="w-5 h-5" strokeWidth={2.25} />,
                  error: <XCircle className="w-5 h-5" strokeWidth={2.25} />,
                  warning: <AlertTriangle className="w-5 h-5" strokeWidth={2.25} />,
                  info: <Info className="w-5 h-5" strokeWidth={2.25} />,
                  loading: <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.25} />,
                  close: <X className="w-3.5 h-3.5" strokeWidth={2.5} />,
                }}
                toastOptions={{
                  duration: 400000,
                  classNames: {
                    toast: "ech-toast",
                    title: "ech-toast-title",
                    description: "ech-toast-description",
                    closeButton: "ech-toast-close",
                    icon: "ech-toast-icon",
                    success: "ech-toast-success",
                    error: "ech-toast-error",
                    warning: "ech-toast-warning",
                    info: "ech-toast-info",
                    loading: "ech-toast-loading",
                  },
                }}
              />
            </ThemeProvider>
          </QueryProvider>
        </ReduxProvider>
      </body>
    </html>
  )
}
