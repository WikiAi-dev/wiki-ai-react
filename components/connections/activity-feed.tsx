"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Cable, CirclePlus, PencilLine, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { connectionsApi, fullTime, relativeTime, type ConnectionChange } from "@/lib/connections"
import { useTranslation } from "@/src/i18n"
import { ProviderMark, useProviderText } from "@/components/connections/shared"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const LIMIT = 30
const POLL_MS = 20_000

const ACTION_ICON = { created: CirclePlus, updated: PencilLine, deleted: Trash2 } as const

/**
 * "Updates from connected systems": the latest changes synced from Bitrix24
 * and other platforms. It polls every 20 seconds, asking only for what is
 * newer than the newest entry it has, so a change made in Bitrix24 appears
 * without a reload.
 */
export function ActivityFeed({ canConnect }: { canConnect: boolean }) {
  const { t, locale } = useTranslation()
  const text = useProviderText()
  const { token } = useAuth()
  const [changes, setChanges] = useState<ConnectionChange[] | null>(null)
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const newest = useRef<string | undefined>(undefined)
  // Re-render now and then so "2 min ago" stays true.
  const [, setTick] = useState(0)

  const poll = useCallback(async () => {
    if (!token) return
    const since = newest.current
    const result = await connectionsApi.activity(token, { since, limit: LIMIT })
    if (result.status !== "success" || !result.response) {
      if (!since) setChanges((prev) => prev ?? [])
      return
    }
    const incoming = result.response.items
    if (incoming.length > 0) newest.current = incoming[0].happened_at
    if (!since) {
      setChanges(incoming)
      return
    }
    if (incoming.length > 0) {
      setChanges((prev) => [...incoming, ...(prev ?? [])].slice(0, LIMIT))
      setFresh(new Set(incoming.map((c) => c.id)))
    }
  }, [token])

  useEffect(() => {
    poll()
    const id = setInterval(() => {
      poll()
      setTick((n) => n + 1)
    }, POLL_MS)
    return () => clearInterval(id)
  }, [poll])

  return (
    <Card className="gap-5">
      <CardHeader>
        <CardTitle>{t("connections.feed.title")}</CardTitle>
        <CardDescription>{t("connections.feed.description")}</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/app/connections?tab=data">
              {t("connections.feed.viewAll")}
              <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {changes === null ? (
          <div className="flex flex-col gap-3" aria-busy>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : changes.length === 0 ? (
          <EmptyState
            icon={Cable}
            title={t("connections.feed.empty")}
            description={t("connections.feed.emptyHint")}
            action={
              canConnect ? (
                <Button asChild size="sm">
                  <Link href="/app/connections">{t("connections.feed.connect")}</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="-mr-2 max-h-[360px] overflow-y-auto pr-2">
            <ul className="divide-y divide-border" aria-live="polite">
              {changes.map((c) => {
                const Icon = ACTION_ICON[c.action]
                const kind = text.kind(c.provider, c.kind, c.kind_title)
                return (
                  <li
                    key={c.id}
                    className={`flex items-start gap-3 py-3 transition-colors first:pt-0 ${fresh.has(c.id) ? "animate-in fade-in" : ""}`}
                  >
                    <ProviderMark provider={c.provider} title={c.provider_title} className="size-8 text-[9px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-snug text-foreground">
                        {c.url && c.action !== "deleted" ? (
                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary" title={c.title}>
                            {c.title || c.external_id}
                          </a>
                        ) : (
                          <span className={c.action === "deleted" ? "text-muted-foreground line-through decoration-muted-foreground/50" : undefined}>
                            {c.title || c.external_id}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                        <Icon className={`size-3 shrink-0 ${c.action === "created" ? "text-success" : c.action === "deleted" ? "text-destructive" : "text-primary"}`} aria-hidden />
                        <span className="shrink-0">{t(`connections.feed.action.${c.action}`, { platform: c.provider_title })}</span>
                        <span aria-hidden>·</span>
                        <span className="truncate">{kind}</span>
                        <span aria-hidden>·</span>
                        <span className="shrink-0" title={fullTime(c.happened_at, locale)}>
                          {relativeTime(c.happened_at, locale)}
                        </span>
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
