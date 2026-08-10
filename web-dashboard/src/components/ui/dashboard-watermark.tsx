import { cn } from "@/lib/utils"

interface DashboardWatermarkProps {
  /**
   * Position: 'bottom-right' (default), 'bottom-center', 'bottom-left', 'center'
   */
  position?: "bottom-right" | "bottom-center" | "bottom-left" | "center"

  /**
   * Opacity level: 0-1
   * Defaults by context:
   * - dashboard: 0.05
   * - analytics: 0.03
   * - secondary: 0.035
   * - empty-state: 0.1
   */
  opacity?: number

  /**
   * Show soft ambient glow behind logo (never on logo)
   */
  showGlow?: boolean

  /**
   * Optional className for container
   */
  className?: string
}

export function DashboardWatermark({
  position = "center",
  opacity = 0.04,
  showGlow = true,
  className,
}: DashboardWatermarkProps) {
  const positionClasses = {
    "bottom-right": "bottom-0 right-0 translate-x-1/4 translate-y-1/4",
    "bottom-center": "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/4",
    "bottom-left": "bottom-0 left-0 -translate-x-1/4 translate-y-1/4",
    center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  }

  return (
    <div
      className={cn(
        "fixed pointer-events-none select-none",
        "w-[min(100vw,500px)] aspect-square",
        "sm:w-[min(100vw,450px)]",
        "md:w-[min(100vw,400px)]",
        "lg:w-[min(100vw,500px)]",
        "xl:w-[min(100vw,600px)]",
        "2xl:w-[min(100vw,650px)]",
        positionClasses[position],
        className
      )}
      style={{
        zIndex: 0,
        opacity: Math.max(0, Math.min(1, opacity)),
      }}
      aria-hidden="true"
    >
      {/* Optional soft glow backdrop */}
      {showGlow && (
        <div
          className="absolute inset-0 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(101, 189, 108, 0.08) 0%, rgba(101, 189, 108, 0.02) 70%, transparent 100%)",
            transform: "scale(0.8)",
          }}
        />
      )}

      {/* Logo image */}
      <img
        src="/logo.png"
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{
          opacity: 1,
          filter: "drop-shadow(0 0 0 transparent)",
        }}
      />
    </div>
  )
}

/**
 * Preset opacity values for common contexts
 */
export const WatermarkOpacity = {
  DASHBOARD: 0.05,
  DASHBOARD_SUBTLE: 0.035,
  ANALYTICS: 0.03,
  ANALYTICS_SUBTLE: 0.02,
  SECONDARY: 0.035,
  SECONDARY_SUBTLE: 0.025,
  EMPTY_STATE: 0.1,
  EMPTY_STATE_SUBTLE: 0.07,
} as const
