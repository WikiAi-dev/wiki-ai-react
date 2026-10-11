"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, PhoneCall, Search, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { apiText, telephonyApi, type Call, type CallOutcome, type CallQuery, type CallStatus, type Line } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { PageBody, PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { CallList } from "@/components/telephony/call-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const PAGE = 50
const OUTCOMES: Exclude<CallOutcome, "">[] = [
  "resolved_by_bot",
  "operator_handled",
  "message_taken",
  "transferred",
  "missed",
  "rejected",
  "abandoned",
  "spam",
  "failed",
]
const PERIODS = ["all", "today", "week", "month"] as const
type Period = (typeof PERIODS)[number]

function since(period: Period): string | undefined {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === "today") return start.toISOString()
  if (period === "week") return new Date(start.getTime() - 6 * 86_400_000).toISOString()
  if (period === "month") return new Date(start.getTime() - 29 * 86_400_000).toISOString()
  return undefined
}

/** Past calls with filters: period, line, outcome, status, the caller's number. */
export function HistoryView() {
  const { t, locale } = useTranslation()
  const { token, isAdmin } = useAuth()
  const [calls, setCalls] = useState<Call[] | null>(null)
  // Lines seen in any loaded page (members don't list lines); it only grows,
  // so picking a line doesn't take the others out of the filter.
  const [seenLines, setSeenLines] = useState<Map<string, string>>(new Map())
  // Answers to an older query (filters changed meanwhile) are dropped.
  const request = useRef(0)
  const [next, setNext] = useState<string | undefined>()
  const [loadingMore, setLoadingMore] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const [period, setPeriod] = useState<Period>("all")
  const [lineId, setLineId] = useState("all")
  const [outcome, setOutcome] = useState<CallOutcome | "all">("all")
  const [status, setStatus] = useState<CallStatus | "all">("all")
  const [number, setNumber] = useState("")
  const [numberFilter, setNumberFilter] = useState("")
  const [error, setError] = useState("")

  const query = useMemo<CallQuery>(
    () => ({
      since: since(period),
      line_id: lineId === "all" ? undefined : lineId,
      outcome: outcome === "all" ? undefined : outcome,
      status: status === "all" ? undefined : status,
      from: numberFilter || undefined,
      limit: PAGE,
    }),
    [period, lineId, outcome, status, numberFilter],
  )

  const remember = useCallback((items: Call[]) => {
    setSeenLines((prev) => {
      let next = prev
      for (const c of items) {
        if (c.line_id && !next.has(c.line_id)) {
          if (next === prev) next = new Map(prev)
          next.set(c.line_id, c.line_name)
        }
      }
      return next
    })
  }, [])

  const load = useCallback(async () => {
    if (!token) return
    const id = ++request.current
    setNext(undefined)
    const result = await telephonyApi.calls(token, query)
    if (id !== request.current) return
    if (result.status === "success" && result.response) {
      setCalls(result.response.items)
      setNext(result.response.next_cursor)
      remember(result.response.items)
      setError("")
    } else {
      setCalls((prev) => prev ?? [])
      setError(apiText(result.fields?.from || result.message, locale) || t("telephony.toast.failed"))
    }
  }, [token, query, t, locale, remember])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  useEffect(() => {
    if (!token || !isAdmin) return
    telephonyApi.lines(token).then((r) => r.status === "success" && r.response && setLines(r.response.items))
  }, [token, isAdmin])

  const more = async () => {
    if (!token || !next) return
    const id = request.current
    setLoadingMore(true)
    try {
      const result = await telephonyApi.calls(token, { ...query, cursor: next })
      if (id !== request.current) return
      if (result.status === "success" && result.response) {
        const items = result.response.items
        setCalls((prev) => [...(prev ?? []), ...items])
        setNext(result.response.next_cursor)
        remember(items)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  // Members don't list lines; the calls name theirs.
  const lineOptions = useMemo(
    () => (lines.length > 0 ? lines.map((l) => ({ id: l.id, name: l.name })) : [...seenLines].map(([id, name]) => ({ id, name }))),
    [lines, seenLines],
  )

  const filtered = period !== "all" || lineId !== "all" || outcome !== "all" || status !== "all" || numberFilter !== ""
  const reset = () => {
    setPeriod("all")
    setLineId("all")
    setOutcome("all")
    setStatus("all")
    setNumber("")
    setNumberFilter("")
  }

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t("navigation.telephony"), href: "/app/telephony" }, { label: t("telephony.history.title") }]} />
      <PageBody>
        <PageHeader title={t("telephony.history.title")} description={t("telephony.history.subtitle")} />

        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setNumberFilter(number.trim())
            }}
            className="relative w-full sm:w-60"
          >
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              onBlur={() => setNumberFilter(number.trim())}
              placeholder={t("telephony.history.searchNumber")}
              inputMode="tel"
              className="pl-9"
              aria-label={t("telephony.history.searchNumber")}
            />
          </form>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-40" aria-label={t("telephony.history.period")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`telephony.history.periods.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(lineOptions.length > 1 || lineId !== "all") && (
            <Select value={lineId} onValueChange={setLineId}>
              <SelectTrigger className="w-44" aria-label={t("telephony.history.line")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("telephony.history.allLines")}</SelectItem>
                {lineOptions.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={outcome} onValueChange={(v) => setOutcome(v as CallOutcome | "all")}>
            <SelectTrigger className="w-48" aria-label={t("telephony.history.outcome")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("telephony.history.allOutcomes")}</SelectItem>
              {OUTCOMES.map((o) => (
                <SelectItem key={o} value={o}>
                  {t(`telephony.outcome.${o}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as CallStatus | "all")}>
            <SelectTrigger className="w-40" aria-label={t("telephony.history.status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("telephony.history.allStatuses")}</SelectItem>
              <SelectItem value="new">{t("telephony.calls.status.new")}</SelectItem>
              <SelectItem value="processed">{t("telephony.calls.status.processed")}</SelectItem>
            </SelectContent>
          </Select>
          {filtered && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X />
              {t("telephony.history.reset")}
            </Button>
          )}
        </div>

        {error && <p className="rounded-xl bg-destructive/5 px-3 py-2 text-[13px] text-destructive">{error}</p>}

        {calls === null ? (
          <div className="grid gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : calls.length === 0 ? (
          <EmptyState
            icon={PhoneCall}
            title={filtered ? t("telephony.history.emptyFiltered") : t("telephony.history.empty.title")}
            description={filtered ? undefined : t("telephony.history.empty.description")}
            className="py-16"
          />
        ) : (
          <>
            <CallList calls={calls} />
            {next && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={more} disabled={loadingMore}>
                  {loadingMore && <Loader2 className="animate-spin" />}
                  {t("telephony.history.more")}
                </Button>
              </div>
            )}
          </>
        )}
      </PageBody>
    </>
  )
}
