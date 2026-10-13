"use client"

import Link from "next/link"
import { ChevronRight, Headset, Loader2 } from "lucide-react"
import { callSeconds, formatDuration, type Call } from "@/lib/telephony"
import { fullTime } from "@/lib/connections"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/src/i18n"
import { Caller, OutcomeBadge } from "@/components/telephony/shared"
import { useOperator } from "@/components/telephony/operator-provider"
import { Button } from "@/components/ui/button"

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

/** A call waiting for a person: the caller asked for one. */
export const needsOperator = (c: Pick<Call, "state">) => c.state === "queued"

/**
 * A call that ended while the caller waited for a person, and nobody has
 * handled it yet: someone should call back (WAI-245).
 */
export const askedForOperator = (c: Pick<Call, "state" | "outcome" | "status">) =>
  c.state === "ended" && c.outcome === "transferred" && c.status === "new"

/**
 * Calls as rows: who called, which line, how it ended, how long; each
 * opens its page. With answerable, calls in progress get "Ответить", and a
 * caller who asked for a person is red.
 */
export function CallList({ calls, answerable = false }: { calls: Call[]; answerable?: boolean }) {
  const { t, locale } = useTranslation()
  const { active, connecting, answer } = useOperator()
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {calls.map((c) => {
        const seconds = callSeconds(c)
        const waiting = needsOperator(c)
        const callBack = askedForOperator(c)
        const red = waiting || callBack
        const canAnswer = answerable && (c.state === "bot" || c.state === "queued") && !active
        return (
          <li key={c.id} className={cn("flex items-center", red && "border-l-4 border-destructive bg-destructive/5")}>
            <Link
              href={`/app/telephony/history/${c.id}`}
              className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 sm:gap-4 sm:px-5"
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
                {red && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-medium text-destructive">
                    <Headset className="size-3.5" aria-hidden />
                    {waiting ? t("telephony.operator.needed") : t("telephony.operator.callBack")}
                  </p>
                )}
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
            {canAnswer && (
              <div className="shrink-0 pr-4 sm:pr-5">
                <Button size="sm" variant={red ? "destructive" : "default"} onClick={() => answer(c)} disabled={connecting !== null}>
                  {connecting === c.id ? <Loader2 className="animate-spin" /> : <Headset />}
                  {t("telephony.operator.answer")}
                </Button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
