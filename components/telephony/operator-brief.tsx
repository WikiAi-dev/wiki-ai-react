"use client"

import { useEffect, useState } from "react"
import { Loader2, NotebookText } from "lucide-react"
import type { CallDetail } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"

interface Brief {
  who: string
  wants: string
  answered: string
  why: string
  /** What the assistant collected for the message, by name. */
  fields?: Record<string, string>
}

/** How long the page waits for the brief after the operator answered. */
const BRIEF_WAIT_MS = 20_000

/** The message fields the brief shows, in this order. */
const FIELDS = ["name", "company", "phone", "topic", "callback_at", "urgent"]

/** The latest brief of the call, and when an operator last answered it. */
function briefOf(call: CallDetail): {
  brief: Brief | null
  answeredAt: number | null
} {
  let brief: Brief | null = null
  let answeredAt: number | null = null
  for (const e of call.events) {
    if (e.type === "operator.brief") brief = e.data as unknown as Brief
    if (e.type === "call.state" && (e.data as { to?: string }).to === "operator") answeredAt = Date.parse(e.at)
  }
  return { brief, answeredAt }
}

/**
 * The brief the engine writes when an operator takes the call over
 * (WAI-239): who is calling, what they want, what the assistant answered,
 * why a person was needed and what it collected. While it is being
 * written, a line says so; a call without one shows nothing.
 */
export function OperatorBrief({ call, waiting = false }: { call: CallDetail; waiting?: boolean }) {
  const { t } = useTranslation()
  const { brief, answeredAt } = briefOf(call)
  const callerSpoke = call.transcript.some((s) => s.speaker === "caller")
  const [expired, setExpired] = useState(false)

  // The engine gives up on a brief after a while; so does the page.
  useEffect(() => {
    if (brief || answeredAt === null) return
    const left = answeredAt + BRIEF_WAIT_MS - Date.now()
    const id = setTimeout(() => setExpired(true), Math.max(0, left))
    return () => clearTimeout(id)
  }, [brief, answeredAt])

  if (!brief) {
    if (!waiting || !callerSpoke || answeredAt === null || expired) return null
    return (
      <section className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground sm:p-5">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t("telephony.operator.brief.preparing")}
      </section>
    )
  }

  const fields = FIELDS.filter((k) => brief.fields?.[k] && (k !== "urgent" || brief.fields[k] === "true"))
  const rows: [string, string][] = [
    ["who", brief.who],
    ["wants", brief.wants],
    ["answered", brief.answered],
    ["why", brief.why],
  ]
  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
        <NotebookText className="size-4 text-primary" aria-hidden />
        {t("telephony.operator.brief.title")}
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{t(`telephony.operator.brief.${k}`)}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-foreground">{v}</dd>
            </div>
          ))}
      </dl>
      {fields.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {fields.map((k) => (
            <li key={k} className="rounded-full bg-card px-2.5 py-0.5 text-xs text-foreground ring-1 ring-border">
              {k === "urgent" ? (
                <span className="font-medium text-destructive">{t("telephony.operator.brief.fields.urgent")}</span>
              ) : (
                <>
                  <span className="text-muted-foreground">{t(`telephony.operator.brief.fields.${k}`)}: </span>
                  {brief.fields?.[k]}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
