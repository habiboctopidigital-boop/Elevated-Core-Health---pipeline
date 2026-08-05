import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  actions?: ReactNode
  breadcrumb?: string
  className?: string
}

/** Shared page-title block — replaces every page's hand-rolled header markup. */
export function PageHeader({ title, subtitle, icon: Icon, actions, breadcrumb, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between flex-wrap gap-3", className)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-gradient-sunrise flex items-center justify-center shrink-0 shadow-[var(--shadow-xs)]">
            <Icon className="w-5 h-5 text-[#036638]" strokeWidth={2} />
          </div>
        )}
        <div>
          {breadcrumb && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#65BD6C] mb-0.5">{breadcrumb}</p>
          )}
          <h1 className="text-xl font-bold text-[#1A1B1E] tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-[#6B7280] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
