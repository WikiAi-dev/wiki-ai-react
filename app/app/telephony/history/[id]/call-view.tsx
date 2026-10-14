"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { CheckCheck, Headset, Loader2, PhoneOff, Play, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { getApiUrl } from "@/lib/config"
import { fullTime } from "@/lib/connections"
import { apiText, callSeconds, formatDuration, formatPhone, telephonyApi, type CallDetail, type CallEvent, type TranscriptSegment } from "@/lib/telephony"
import { useLiveCall, withLive } from "@/lib/live-call"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { PageBody } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { Caller, OutcomeBadge } from "@/components/telephony/shared"
import { CRMSection } from "@/components/telephony/crm-section"
import { askedForOperator } from "@/components/telephony/call-list"
import { useOperator } from "@/components/telephony/operator-provider"
import { OperatorBrief } from "@/components/telephony/operator-brief"
import { PastCalls } from "@/components/telephony/past-calls"
import { HintsPanel } from "@/components/telephony/hints-panel"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/** Each speaker's name in the transcript has a colour of its own. */
const speakerColor: Record<TranscriptSegment["speaker"], string> = {
  caller: "text-foreground",
  bot: "text-primary",
  operator: "text-success",
}

function Fact({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium tabular-nums text-foreground" title={title ?? value}>
        {value || "—"}
      </dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  )
}

/**
 * The conversation, a line per phrase with who said it. Following, it
 * keeps the newest line in view while the reader is at the bottom.
 */
function Transcript({ lines, label, follow = false }: { lines: TranscriptSegment[]; label: (s: TranscriptSegment) => string; follow?: boolean }) {
  const { t } = useTranslation()
  const box = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)

  useEffect(() => {
    if (follow && atBottom.current && box.current) box.current.scrollTop = box.current.scrollHeight
  }, [follow, lines.length])

  if (lines.length === 0) return <p className="text-sm text-muted-foreground">{t("telephony.call.noTranscript")}</p>
  return (
    <div
      ref={box}
      onScroll={(e) => {
        const el = e.currentTarget
        atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
      }}
      className={cn(follow && "max-h-[60vh] overflow-y-auto pr-1")}
    >
      <ol className="flex flex-col gap-3">
        {lines.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-12 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{formatDuration(s.start_ms / 1000)}</span>
            <p className="text-[15px] leading-relaxed">
              <span className={cn("font-medium", speakerColor[s.speaker])}>{label(s)}: </span>
              <span className="text-foreground">{s.text}</span>
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** What one engine event means, in the app's words. */
function useEventText() {
  const { t } = useTranslation()
  return (e: CallEvent): string => {
    const d = e.data as Record<string, string>
    switch (e.type) {
      case "call.started":
        return t("telephony.call.events.started")
      case "call.state":
        if (d.to === "operator" && d.operator_name) return t("telephony.call.states.operatorNamed", { name: d.operator_name })
        return t(`telephony.call.states.${d.to}`, { reason: d.reason ?? "" })
      case "call.ended":
        return t("telephony.call.events.ended", {
          outcome: d.outcome ? t(`telephony.outcome.${d.outcome}`) : "—",
          by: d.hung_up_by ? t(`telephony.call.hungUpBy.${d.hung_up_by}`) : "—",
        })
      case "dtmf":
        return t("telephony.call.events.dtmf", { digit: d.digit ?? "" })
      case "recording.uploaded":
        return t("telephony.call.events.recording")
      default:
        return e.type
    }
  }
}

/** A call's page: who, when, how it ended, transcript, recording, what happened step by step. */
export function CallView() {
  const { t, locale } = useTranslation()
  const { token, isAdmin } = useAuth()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const eventText = useEventText()
  const operator = useOperator()
  const [call, setCall] = useState<CallDetail | null>(null)
  const [missing, setMissing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [audio, setAudio] = useState<string | null>(null)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // A call in progress comes live through the engine's socket.
  const live = useLiveCall(call && call.state !== "ended" ? call.id : null)

  const load = useCallback(async () => {
    if (!token || !params.id) return
    const result = await telephonyApi.call(token, params.id)
    if (result.status === "success" && result.response) {
      setCall(result.response)
      setMissing(false)
    } else if (result.httpStatus === 404) {
      // Only a 404 means there's no such call; a network blip or a 5xx
      // leaves the page as it is and the next poll tries again.
      setMissing(true)
    }
  }, [token, params.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  // A first load that failed (not a 404) is retried.
  useEffect(() => {
    if (call || missing) return
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [call, missing, load])

  // A call in progress updates as its events arrive: live through the
  // socket, and from the API for what only it has (the summary, the
  // recording); every 3 s while the socket is down.
  useEffect(() => {
    if (!call || call.state === "ended") return
    const id = setInterval(load, live.connected ? 15000 : 3000)
    return () => clearInterval(id)
  }, [call, load, live.connected])

  useEffect(() => () => {
    if (audio) URL.revokeObjectURL(audio)
  }, [audio])

  const setStatus = async (status: "new" | "processed") => {
    if (!token || !call) return
    setSaving(true)
    try {
      const result = await telephonyApi.setCallStatus(token, call.id, status)
      if (result.status === "success" && result.response) {
        setCall(result.response)
        toast.success(status === "processed" ? t("telephony.call.toast.processed") : t("telephony.call.toast.reopened"))
      } else toast.error(apiText(result.message, locale) || t("telephony.toast.failed"))
    } finally {
      setSaving(false)
    }
  }

  // The recording is served only with the member's token, so it is fetched
  // and played from memory rather than linked.
  const playRecording = async () => {
    if (!token || !call) return
    setLoadingAudio(true)
    try {
      // The format it was recorded in (WAV from the engine).
      const res = await fetch(getApiUrl(`/v1/telephony/calls/${call.id}/recording`), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        toast.error(t("telephony.call.recordingFailed"))
        return
      }
      setAudio(URL.createObjectURL(await res.blob()))
    } finally {
      setLoadingAudio(false)
    }
  }

  const remove = async () => {
    if (!token || !call) return
    setDeleting(true)
    try {
      const result = await telephonyApi.deleteCall(token, call.id)
      if (result.status === "success") {
        toast.success(t("telephony.call.toast.deleted"))
        router.push("/app/telephony/history")
      } else toast.error(apiText(result.message, locale) || t("telephony.toast.failed"))
    } finally {
      setDeleting(false)
    }
  }

  const crumbs = [
    { label: t("navigation.telephony"), href: "/app/telephony" },
    { label: t("telephony.history.title"), href: "/app/telephony/history" },
    { label: call ? formatPhone(call.from) || t("telephony.calls.hiddenNumber") : t("telephony.call.title") },
  ]

  if (missing)
    return (
      <>
        <AppHeader breadcrumbs={crumbs} />
        <PageBody>
          <EmptyState icon={PhoneOff} title={t("telephony.call.notFound")} className="py-16" />
        </PageBody>
      </>
    )

  if (!call)
    return (
      <>
        <AppHeader breadcrumbs={crumbs} />
        <PageBody>
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </PageBody>
      </>
    )

  const view = withLive(call, live.events)
  const seconds = callSeconds(view)
  const timeline = view.events.filter((e) => ["call.started", "call.state", "call.ended", "dtmf", "recording.uploaded"].includes(e.type))
  // Operators by id, named by the call.state that handed them the call.
  const operatorNames = new Map<string, string>()
  for (const e of view.events) {
    const d = e.data as Record<string, string>
    if (e.type === "call.state" && d.operator_id && d.operator_name) operatorNames.set(d.operator_id, d.operator_name)
  }
  // The member is the operator on this call: the page is their workspace.
  const mine = operator.active?.id === view.id && view.state !== "ended"
  const speakerLabel = (s: TranscriptSegment) => {
    const name = s.speaker === "operator" && s.operator_id ? operatorNames.get(s.operator_id) : undefined
    return name ? t("telephony.call.speaker.operatorNamed", { name }) : t(`telephony.call.speaker.${s.speaker}`)
  }

  return (
    <>
      <AppHeader breadcrumbs={crumbs} />
      <PageBody>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
              <Caller number={view.from} />
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <OutcomeBadge call={view} />
              {(view.state === "queued" || askedForOperator(view)) && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  <Headset className="size-3.5" aria-hidden />
                  {view.state === "queued" ? t("telephony.operator.needed") : t("telephony.operator.callBack")}
                </span>
              )}
              <span>{fullTime(view.started_at, locale)}</span>
              {view.test && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t("telephony.call.test")}</span>}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {view.state === "ended" &&
              (view.status === "new" ? (
                <Button onClick={() => setStatus("processed")} disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" /> : <CheckCheck />}
                  {t("telephony.call.markProcessed")}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setStatus("new")} disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                  {t("telephony.call.reopen")}
                </Button>
              ))}
            {(view.state === "bot" || view.state === "queued") && !operator.active && (
              <Button variant={view.state === "queued" ? "destructive" : "default"} onClick={() => operator.answer(view)} disabled={operator.connecting !== null}>
                {operator.connecting === view.id ? <Loader2 className="animate-spin" /> : <Headset />}
                {t("telephony.operator.answer")}
              </Button>
            )}
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} aria-label={t("telephony.call.delete")}>
                <Trash2 />
              </Button>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4 sm:p-5">
          <Fact label={t("telephony.call.line")} value={view.line_name || formatPhone(view.to)} />
          <Fact label={t("telephony.call.dialled")} value={formatPhone(view.to)} />
          <Fact label={t("telephony.call.duration")} value={seconds > 0 ? formatDuration(seconds) : ""} />
          <Fact label={t("telephony.call.handledBy")} value={view.handled_by ? t(`telephony.call.handled.${view.handled_by}`) : t("telephony.call.handled.none")} />
        </dl>

        {mine ? (
          // The operator on this call: what was said and the brief, who the
          // caller is, and hints from the knowledge base (WAI-239).
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)_minmax(0,24rem)]">
            <div className="flex min-w-0 flex-col gap-4">
              <OperatorBrief call={view} waiting />
              <Section title={t("telephony.call.transcript")}>
                <Transcript lines={view.transcript} label={speakerLabel} follow />
              </Section>
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <CRMSection call={view} />
              <PastCalls call={view} />
            </div>
            <div className="min-w-0 lg:col-span-2 xl:col-span-1">
              <HintsPanel call={view} />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
            <div className="flex min-w-0 flex-col gap-4">
              <Section title={t("telephony.call.summary")}>
                {view.summary ? (
                  <p className="text-[15px] leading-relaxed text-foreground">{view.summary}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("telephony.call.noSummary")}</p>
                )}
              </Section>

              <Section title={t("telephony.call.recording")}>
                {view.has_recording ? (
                  audio ? (
                    <audio controls autoPlay src={audio} className="w-full" />
                  ) : (
                    <Button variant="outline" onClick={playRecording} disabled={loadingAudio}>
                      {loadingAudio ? <Loader2 className="animate-spin" /> : <Play />}
                      {t("telephony.call.play")}
                    </Button>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">{t("telephony.call.noRecording")}</p>
                )}
              </Section>

              <OperatorBrief call={view} />

              <Section title={t("telephony.call.transcript")}>
                <Transcript lines={view.transcript} label={speakerLabel} />
              </Section>
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              <CRMSection call={view} />
              <Section title={t("telephony.call.timeline")}>
                <ol className="relative flex flex-col gap-3 border-l border-border pl-4">
                  {timeline.map((e) => (
                    <li key={e.seq} className="relative">
                      <span aria-hidden className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-primary" />
                      <p className="text-sm text-foreground">{eventText(e)}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {new Date(e.at).toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </p>
                    </li>
                  ))}
                </ol>
              </Section>
              {view.decision.length > 0 && (
                <Section title={t("telephony.call.routing")}>
                  <ul className="flex flex-col gap-1 text-[13px] text-muted-foreground">
                    {view.decision.map((d, i) => (
                      <li key={i} className="break-words">
                        {d}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {view.notes.length > 0 && (
                <Section title={t("telephony.call.notes")}>
                  <ul className="flex flex-col gap-2">
                    {view.notes.map((n) => (
                      <li key={n.id} className="text-sm text-foreground">
                        {n.text}
                        <span className="block text-xs text-muted-foreground">{fullTime(n.created_at, locale)}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          </div>
        )}
      </PageBody>

      <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("telephony.call.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("telephony.call.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("telephony.form.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                remove()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="animate-spin" />}
              {t("telephony.call.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
