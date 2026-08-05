"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface FadeInProps {
  children: ReactNode
  /** Stagger delay in seconds - pass `index * 0.05` when mapping a list. */
  delay?: number
  className?: string
  /** Starting vertical offset in px. */
  y?: number
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const

/** Standard fade + slide-up entrance, used app-wide instead of ad hoc CSS animation classes. */
export function FadeIn({ children, delay = 0, className, y = 12 }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
