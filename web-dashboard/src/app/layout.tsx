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
  title: "Elevated Core Health — Patient Pipeline Portal",
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
              <Toaster richColors position="top-right" />
            </ThemeProvider>
          </QueryProvider>
        </ReduxProvider>
      </body>
    </html>
  )
}
