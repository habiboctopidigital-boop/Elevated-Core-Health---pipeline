import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** "shimmer" sweeps a soft highlight across the block instead of a flat pulse. */
  variant?: "pulse" | "shimmer"
}

function Skeleton({ className, variant = "shimmer", ...props }: SkeletonProps) {
  if (variant === "pulse") {
    return <div className={cn("animate-pulse rounded-md bg-primary/10", className)} {...props} />
  }
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md bg-gradient-to-r from-primary/5 via-primary/15 to-primary/5 bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
