import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** One headline number with its label and a short explanation. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  className?: string
}) {
  return (
    <div className={cn("flex flex-col rounded-2xl border border-border bg-card p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Responsive grid for a row of StatCards. */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>
}
