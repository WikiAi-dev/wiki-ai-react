"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { callSeconds, formatDuration, type Call } from "@/lib/telephony"
import { fullTime } from "@/lib/connections"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/src/i18n"
import { Caller, OutcomeBadge } from "@/components/telephony/shared"

/** "14:05" today, "вчера, 14:05", or "11 окт., 14:05". */
export function callTime(value: string, locale: string, now = new Date()): string {
  const d = new Date(value)
  const loc = locale === "ru" ? "ru-RU" : "en-GB"
  const time = d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(now) - day(d)) / 86_400_000)
  if (diff === 0) return time
  if (diff === 1) return `${new Intl.RelativeTimeFormat(loc, { numeric: "auto" }).format(-1, "day")}, ${time}`
  return `${d.toLocaleDateString(loc, { day: "numeric", month: "short" })}, ${time}`
}

/** Calls as rows: who called, which line, how it ended, how long; each opens its page. */
export function CallList({ calls }: { calls: Call[] }) {
  const { t, locale } = useTranslation()
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {calls.map((c) => {
        const seconds = callSeconds(c)
        return (
          <li key={c.id}>
            <Link
              href={`/app/telephony/history/${c.id}`}
              className="flex items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 sm:gap-4 sm:px-5"
            >
              <span
                aria-hidden
                className={cn("size-2 shrink-0 rounded-full", c.status === "new" && c.state === "ended" ? "bg-primary" : "bg-transparent")}
                title={c.status === "new" ? t("telephony.calls.status.new") : undefined}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {c.status === "new" && c.state === "ended" && <span className="sr-only">{t("telephony.calls.status.new")}: </span>}
                  <Caller number={c.from} />
                </p>
                <div className="mt-1 sm:hidden">
                  <OutcomeBadge call={c} />
                </div>
                <p className="truncate text-[13px] text-muted-foreground">
                  {c.line_name || c.to}
                  {c.summary ? ` · ${c.summary}` : ""}
                </p>
              </div>
              <div className="hidden shrink-0 sm:block">
                <OutcomeBadge call={c} />
              </div>
              <div className="w-20 shrink-0 text-right">
                <p className="text-sm tabular-nums text-foreground" title={fullTime(c.started_at, locale)}>
                  {callTime(c.started_at, locale)}
                </p>
                <p className="text-[13px] tabular-nums text-muted-foreground">{seconds > 0 ? formatDuration(seconds) : "—"}</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
