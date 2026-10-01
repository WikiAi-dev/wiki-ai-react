import { cn } from "@/lib/utils"

/** The WikiAI wordmark: the "W" tile and the name, shared by the site and the app. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-foreground", className)}>
      <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-[15px] font-bold text-primary-foreground">
        W
      </span>
      WikiAI
    </span>
  )
}
