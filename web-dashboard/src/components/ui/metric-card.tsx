import { cn } from "@/lib/utils"
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    direction: "up" | "down"
    percentage: number
  }
  chart?: {
    data: Array<{ name: string; value: number }>
    stroke?: string
    fill?: string
  }
  icon?: React.ReactNode
  className?: string
  variant?: "default" | "success" | "warning" | "danger" | "info"
}

const variantStyles = {
  default: {
    border: "border-[#E5E7EB]",
    bg: "bg-white",
    accent: "text-[#036638]",
    accentBg: "bg-[#EBF7EC]",
    chart: { stroke: "#036638", fill: "#EBF7EC" },
  },
  success: {
    border: "border-green-200",
    bg: "bg-white",
    accent: "text-green-600",
    accentBg: "bg-green-50",
    chart: { stroke: "#22c55e", fill: "#dcfce7" },
  },
  warning: {
    border: "border-amber-200",
    bg: "bg-white",
    accent: "text-amber-600",
    accentBg: "bg-amber-50",
    chart: { stroke: "#f59e0b", fill: "#fef3c7" },
  },
  danger: {
    border: "border-red-200",
    bg: "bg-white",
    accent: "text-red-600",
    accentBg: "bg-red-50",
    chart: { stroke: "#ef4444", fill: "#fee2e2" },
  },
  info: {
    border: "border-blue-200",
    bg: "bg-white",
    accent: "text-blue-600",
    accentBg: "bg-blue-50",
    chart: { stroke: "#3b82f6", fill: "#eff6ff" },
  },
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  chart,
  icon,
  className,
  variant = "default",
}: MetricCardProps) {
  const styles = variantStyles[variant]

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md",
        styles.border,
        styles.bg,
        className
      )}
    >
      {/* Background gradient decoration */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-5" style={{
          background: `linear-gradient(135deg, ${variant === "default" ? "#036638" : styles.accent} 0%, transparent 70%)`
        }} />
      </div>

      <div className="relative p-4 sm:p-5">
        {/* Header: Title + Icon */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-medium text-[#6B7280] uppercase tracking-wide">
              {title}
            </p>
          </div>
          {icon && (
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
              styles.accentBg
            )}>
              {icon}
            </div>
          )}
        </div>

        {/* Value + Trend */}
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-[#1A1B1E]">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-[#6B7280] mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold",
              trend.direction === "up"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            )}>
              {trend.direction === "up" ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {trend.percentage}%
            </div>
          )}
        </div>

        {/* Chart */}
        {chart && chart.data.length > 0 && (
          <div className="h-12 -mx-4 -mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chart.data}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={`gradient-${variant}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chart.fill || styles.chart.fill} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chart.fill || styles.chart.fill} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide={true} />
                <YAxis hide={true} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chart.stroke || styles.chart.stroke}
                  fill={`url(#gradient-${variant})`}
                  strokeWidth={2}
                  isAnimationActive={true}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
