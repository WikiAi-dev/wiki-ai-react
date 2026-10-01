import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** What a list or page shows when there is nothing yet, and how to add the first item. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-12 text-center", className)}>
      {Icon && (
        <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
      )}
      <p className="mt-4 font-semibold tracking-tight text-foreground">{title}</p>
      {description && <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
