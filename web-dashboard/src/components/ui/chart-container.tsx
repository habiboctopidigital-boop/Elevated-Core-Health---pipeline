import { cn } from "@/lib/utils"
import { MoreVertical, RotateCcw } from "lucide-react"

interface ChartContainerProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
  onRefresh?: () => void
  showRefresh?: boolean
}

export function ChartContainer({
  title,
  subtitle,
  children,
  className,
  actions,
  onRefresh,
  showRefresh = true,
}: ChartContainerProps) {
  return (
    <div className={cn(
      "bg-white rounded-xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-all duration-200",
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between px-5 sm:px-6 py-4 border-b border-[#E5E7EB]">
        <div>
          <h3 className="text-sm font-bold text-[#1A1B1E]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[#6B7280] mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {actions}
          {showRefresh && onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-[#6B7280] hover:text-[#1A1B1E] hover:bg-[#F3F4F6] rounded-lg transition-all duration-200"
              title="Refresh data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            className="p-2 text-[#6B7280] hover:text-[#1A1B1E] hover:bg-[#F3F4F6] rounded-lg transition-all duration-200"
            title="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6">
        {children}
      </div>
    </div>
  )
}
