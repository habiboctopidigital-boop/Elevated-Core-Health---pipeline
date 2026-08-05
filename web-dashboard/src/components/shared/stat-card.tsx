import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

type Accent = "brand" | "blue" | "purple" | "amber" | "red" | "gray"

const ACCENT_STYLES: Record<Accent, { chip: string; icon: string }> = {
  brand: { chip: "bg-[#EBF7EC]", icon: "text-[#036638]" },
  blue: { chip: "bg-blue-50", icon: "text-blue-600" },
  purple: { chip: "bg-violet-50", icon: "text-violet-600" },
  amber: { chip: "bg-amber-50", icon: "text-amber-600" },
  red: { chip: "bg-red-50", icon: "text-red-600" },
  gray: { chip: "bg-gray-100", icon: "text-gray-500" },
}

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  accent?: Accent
  trend?: { value: string; direction: "up" | "down" | "neutral" }
  className?: string
}

/** Shared stat tile - icon chip, label, big value, optional trend badge. */
export function StatCard({ label, value, icon: Icon, accent = "brand", trend, className }: StatCardProps) {
  const styles = ACCENT_STYLES[accent]
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", styles.chip)}>
          <Icon className={cn("w-5 h-5", styles.icon)} strokeWidth={2} />
        </div>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
              trend.direction === "up" && "text-emerald-700 bg-emerald-50",
              trend.direction === "down" && "text-red-600 bg-red-50",
              trend.direction === "neutral" && "text-gray-500 bg-gray-100",
            )}
          >
            {trend.direction === "up" && <ArrowUpRight className="w-3 h-3" />}
            {trend.direction === "down" && <ArrowDownRight className="w-3 h-3" />}
            {trend.value}
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mt-3.5">{label}</p>
      <p className="text-2xl font-bold text-[#1A1B1E] mt-1 tracking-tight">{value}</p>
    </Card>
  )
}
