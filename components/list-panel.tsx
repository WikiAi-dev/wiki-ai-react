import type { ReactNode } from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

/** A bordered panel holding a searchable list, as on the team pages. */
export function ListPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>{children}</section>
}

/** Search box on the left, anything (a count, bulk actions) on the right. */
export function ListToolbar({
  query,
  onQueryChange,
  placeholder,
  children,
}: {
  query: string
  onQueryChange: (value: string) => void
  placeholder: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border p-4 sm:px-5">
      <div className="relative min-w-48 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="pl-10"
        />
      </div>
      {children && <div className="ml-auto flex shrink-0 items-center gap-2 text-sm tabular-nums text-muted-foreground">{children}</div>}
    </div>
  )
}

/** Row placeholders while a list loads. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-border" aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
          <span className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
          <span className="flex flex-1 flex-col gap-1.5">
            <span className="h-4 w-2/5 animate-pulse rounded-md bg-muted" />
            <span className="h-3 w-1/4 animate-pulse rounded-md bg-muted" />
          </span>
          <span className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        </li>
      ))}
    </ul>
  )
}
