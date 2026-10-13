"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Clock, PhoneCall, PhoneIncoming, PhoneMissed, Settings2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { callSeconds, formatDuration, telephonyApi, type Call, type Trunk } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { PageBody, PageHeader } from "@/components/page-header"
import { StatCard, StatGrid } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { CallList } from "@/components/telephony/call-list"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

// Calls in progress change by the second; the board rereads them often,
// today's numbers less often, and nothing while the tab is hidden.
const LIVE_MS = 3_000
const STATS_MS = 15_000
// Today's numbers read at most this many pages of 200 calls.
const STATS_PAGES = 5

const ANSWERED = new Set(["resolved_by_bot", "operator_handled", "message_taken", "transferred"])
const UNANSWERED = new Set(["missed", "abandoned", "rejected", "failed"])

/** "Сейчас": calls in progress, today's numbers and the latest calls. */
export function LiveView() {
  const { t, locale } = useTranslation()
  const { token, isAdmin } = useAuth()
  const [today, setToday] = useState<Call[] | null>(null)
  const [todayCapped, setTodayCapped] = useState(false)
  const [recent, setRecent] = useState<Call[] | null>(null)
  const [trunks, setTrunks] = useState<Trunk[] | null>(null)

  // The latest calls, test calls included: an echo check shows up live.
  const loadRecent = useCallback(async () => {
    if (!token || document.hidden) return
    const last = await telephonyApi.calls(token, { limit: 20, include_test: true })
    if (last.status === "success" && last.response) setRecent(last.response.items)
    else setRecent((prev) => prev ?? [])
  }, [token])

  // Today's calls for the numbers and for calls in progress older than the
  // latest 20, following pages up to STATS_PAGES.
  const loadToday = useCallback(async () => {
    if (!token || document.hidden) return
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const all: Call[] = []
    let cursor: string | undefined
    for (let page = 0; page < STATS_PAGES; page++) {
      const r = await telephonyApi.calls(token, { since: start.toISOString(), limit: 200, include_test: true, cursor })
      if (r.status !== "success" || !r.response) {
        setToday((prev) => prev ?? [])
        return
      }
      all.push(...r.response.items)
      cursor = r.response.next_cursor
      if (!cursor) break
    }
    setToday(all)
    setTodayCapped(Boolean(cursor))
  }, [token])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecent()
    loadToday()
    const live = setInterval(loadRecent, LIVE_MS)
    const stats = setInterval(loadToday, STATS_MS)
    const onVisible = () => {
      if (!document.hidden) {
        loadRecent()
        loadToday()
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(live)
      clearInterval(stats)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [loadRecent, loadToday])

  useEffect(() => {
    if (!token || !isAdmin) return
    // A failed read shows no setup prompt: only a real "no trunks" does.
    telephonyApi.trunks(token).then((r) => r.status === "success" && r.response && setTrunks(r.response.items))
  }, [token, isAdmin])

  const stats = useMemo(() => {
    const calls = (today ?? []).filter((c) => !c.test)
    const ended = calls.filter((c) => c.state === "ended")
    const answered = ended.filter((c) => ANSWERED.has(c.outcome))
    const unanswered = ended.filter((c) => UNANSWERED.has(c.outcome))
    const talk = answered.reduce((s, c) => s + callSeconds(c), 0)
    return { total: calls.length, answered: answered.length, unanswered: unanswered.length, avg: answered.length ? talk / answered.length : 0 }
  }, [today])

  // Calls in progress from both reads, newest first: a long call stays on
  // the board after newer short ones push it out of the latest 20.
  const live = useMemo(() => {
    const byId = new Map<string, Call>()
    for (const c of [...(today ?? []), ...(recent ?? [])]) byId.set(c.id, c)
    return [...byId.values()].filter((c) => c.state !== "ended").sort((a, b) => b.started_at.localeCompare(a.started_at))
  }, [today, recent])
  const ended = useMemo(() => (recent ?? []).filter((c) => c.state === "ended").slice(0, 10), [recent])
  const number = (n: number) => n.toLocaleString(locale === "ru" ? "ru-RU" : "en-GB") + (todayCapped ? "+" : "")
  const noTrunks = isAdmin && trunks !== null && trunks.length === 0

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t("navigation.telephony") }]} />
      <PageBody>
        <PageHeader
          title={t("telephony.live.title")}
          description={t("telephony.live.subtitle")}
          actions={
            <Button variant="outline" asChild>
              <Link href="/app/telephony/history">
                {t("telephony.live.allCalls")}
                <ArrowRight />
              </Link>
            </Button>
          }
        />

        {noTrunks && (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="font-semibold tracking-tight text-foreground">{t("telephony.live.setup.title")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("telephony.live.setup.description")}</p>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/app/telephony/settings">
                <Settings2 />
                {t("telephony.live.setup.action")}
              </Link>
            </Button>
          </div>
        )}

        {today === null ? (
          <StatGrid>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[132px] rounded-2xl" />
            ))}
          </StatGrid>
        ) : (
          <StatGrid>
            <StatCard label={t("telephony.live.stats.today")} value={number(stats.total)} hint={t("telephony.live.stats.todayHint")} icon={PhoneCall} />
            <StatCard label={t("telephony.live.stats.answered")} value={number(stats.answered)} hint={t("telephony.live.stats.answeredHint")} icon={PhoneIncoming} />
            <StatCard label={t("telephony.live.stats.unanswered")} value={number(stats.unanswered)} hint={t("telephony.live.stats.unansweredHint")} icon={PhoneMissed} />
            <StatCard
              label={t("telephony.live.stats.avg")}
              value={stats.avg > 0 ? formatDuration(stats.avg) : "—"}
              hint={t("telephony.live.stats.avgHint")}
              icon={Clock}
            />
          </StatGrid>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            {live.length > 0 && <span className="size-2 animate-pulse rounded-full bg-success" aria-hidden />}
            {t("telephony.live.now", { count: live.length })}
          </h2>
          {live.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{t("telephony.live.noneNow")}</p>
          ) : (
            <CallList calls={live} answerable />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{t("telephony.live.recent")}</h2>
          {recent === null ? (
            <Skeleton className="h-40 rounded-2xl" />
          ) : ended.length === 0 ? (
            <EmptyState icon={PhoneCall} title={t("telephony.history.empty.title")} description={t("telephony.history.empty.description")} className="py-12" />
          ) : (
            <CallList calls={ended} />
          )}
        </section>
      </PageBody>
    </>
  )
}
