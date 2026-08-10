import { cn } from "@/lib/utils"
import { ArrowUp } from "lucide-react"

interface PerformanceRating {
  label: string
  count: number
  percentage: number
  color: string
  bgColor: string
}

interface PerformanceGaugeProps {
  score: number
  maxScore?: number
  trend?: {
    direction: "up" | "down"
    percentage: number
  }
  ratings: PerformanceRating[]
  className?: string
  title?: string
}

export function PerformanceGauge({
  score,
  maxScore = 10,
  trend,
  ratings,
  className,
  title = "Performance Score",
}: PerformanceGaugeProps) {
  const scorePercentage = (score / maxScore) * 100

  // Determine gauge color based on score
  const getGaugeColor = () => {
    if (score >= 8) return "from-green-400 to-green-600"
    if (score >= 6) return "from-blue-400 to-blue-600"
    if (score >= 4) return "from-yellow-400 to-yellow-600"
    return "from-red-400 to-red-600"
  }

  return (
    <div className={cn("bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-[#1A1B1E]">{title}</h3>
        </div>
        {trend && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50">
            <ArrowUp className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold text-green-700">+{trend.percentage}%</span>
          </div>
        )}
      </div>

      {/* Score Display */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32 sm:w-40 sm:h-40">
          {/* Background circle */}
          <svg className="w-full h-full" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="8"
              strokeDasharray={`${(scorePercentage / 100) * 2 * Math.PI * 54} ${2 * Math.PI * 54}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl sm:text-4xl font-bold text-[#1A1B1E]">
              {score.toFixed(1)}
            </span>
            <span className="text-xs text-[#6B7280] mt-1">/ {maxScore}</span>
          </div>
        </div>
      </div>

      {/* Ratings List */}
      <div className="space-y-2.5">
        {ratings.map((rating) => (
          <div key={rating.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", rating.bgColor)} />
                <span className="text-sm font-medium text-[#1A1B1E]">
                  {rating.label}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-[#1A1B1E]">
                  {rating.count}
                </span>
                <span className="text-xs text-[#6B7280] ml-1">
                  {rating.percentage}%
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", rating.color)}
                style={{ width: `${rating.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
