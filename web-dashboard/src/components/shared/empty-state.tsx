import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/** Shared empty-state block for lists/tables app-wide. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-6", className)}>
      <div className="w-12 h-12 rounded-2xl bg-[#EBF7EC] flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-[#65BD6C]" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-semibold text-[#1A1B1E]">{title}</p>
      {description && <p className="text-xs text-[#6B7280] mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
