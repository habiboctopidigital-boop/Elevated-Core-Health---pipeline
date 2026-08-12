import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  actions?: ReactNode
  breadcrumb?: string
  /** Optional stat chip shown next to the title, e.g. "12 patients on board". */
  count?: ReactNode
  className?: string
}

/**
 * Shared page-title block — replaces every page's hand-rolled header markup.
 * Responsive: title/actions stack on mobile, sit on one row from `sm` up.
 */
export function PageHeader({ title, subtitle, icon: Icon, actions, breadcrumb, count, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-11 h-11 rounded-2xl bg-gradient-sunrise flex items-center justify-center shrink-0 shadow-[var(--shadow-sm)] ring-1 ring-[#036638]/10">
            <Icon className="w-5 h-5 text-[#036638]" strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0">
          {breadcrumb && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#65BD6C] mb-0.5 truncate">
              {breadcrumb}
            </p>
          )}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-[#1A1B1E] tracking-tight truncate">{title}</h1>
            {count}
          </div>
          {subtitle && <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap sm:shrink-0">{actions}</div>
      )}
    </div>
  )
}
