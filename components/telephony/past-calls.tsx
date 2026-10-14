"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { fullTime } from "@/lib/connections"
import { telephonyApi, type Call, type CallDetail } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"
import { OutcomeBadge } from "@/components/telephony/shared"
import { Skeleton } from "@/components/ui/skeleton"

/** How many earlier calls the operator sees. */
const SHOWN = 5

/**
 * The caller's earlier calls from the same number, newest first, each with
 * how it ended and its summary (WAI-239): what was already promised.
 */
export function PastCalls({ call }: { call: CallDetail }) {
  const { t, locale } = useTranslation()
  const { token } = useAuth()
  const [calls, setCalls] = useState<{ of: string; items: Call[] } | null>(null)

  useEffect(() => {
    if (!token || !call.from) return
    let gone = false
    telephonyApi
      .calls(token, {
        from: call.from,
        limit: SHOWN + 1,
        include_test: call.test,
      })
      .then((result) => {
        if (gone || result.status !== "success" || !result.response) return
        setCalls({
          of: call.id,
          items: result.response.items.filter((c) => c.id !== call.id).slice(0, SHOWN),
        })
      })
    return () => {
      gone = true
    }
  }, [token, call.from, call.id, call.test])

  if (!call.from) return null
  const items = calls?.of === call.id ? calls.items : null
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">{t("telephony.operator.pastCalls.title")}</h2>
      {items === null ? (
        <Skeleton className="h-16 rounded-xl" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("telephony.operator.pastCalls.none")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((c) => (
            <li key={c.id} className="min-w-0">
              <Link href={`/app/telephony/history/${c.id}`} target="_blank" className="group block">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums group-hover:text-foreground">{fullTime(c.started_at, locale)}</span>
                  <OutcomeBadge call={c} />
                </div>
                {(c.summary || c.category) && <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-foreground">{c.summary || c.category}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
