"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { CheckCheck, Loader2, PhoneOff, Play, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { getApiUrl } from "@/lib/config"
import { fullTime } from "@/lib/connections"
import { apiText, callSeconds, formatDuration, formatPhone, telephonyApi, type CallDetail, type CallEvent } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { PageBody } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { Caller, OutcomeBadge } from "@/components/telephony/shared"
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

/** What one engine event means, in the app's words. */
function useEventText() {
  const { t } = useTranslation()
  return (e: CallEvent): string => {
    const d = e.data as Record<string, string>
    switch (e.type) {
      case "call.started":
        return t("telephony.call.events.started")
      case "call.state":
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
  const [call, setCall] = useState<CallDetail | null>(null)
  const [missing, setMissing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [audio, setAudio] = useState<string | null>(null)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  // A call in progress updates as its events arrive.
  useEffect(() => {
    if (!call || call.state === "ended") return
    const id = setInterval(load, 3000)
    return () => clearInterval(id)
  }, [call, load])

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
      const res = await fetch(getApiUrl(`/v1/telephony/calls/${call.id}/recording?format=mp3`), {
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

  const seconds = callSeconds(call)
  const timeline = call.events.filter((e) => ["call.started", "call.state", "call.ended", "dtmf", "recording.uploaded"].includes(e.type))

  return (
    <>
      <AppHeader breadcrumbs={crumbs} />
      <PageBody>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
              <Caller number={call.from} />
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <OutcomeBadge call={call} />
              <span>{fullTime(call.started_at, locale)}</span>
              {call.test && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t("telephony.call.test")}</span>}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {call.state === "ended" &&
              (call.status === "new" ? (
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
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} aria-label={t("telephony.call.delete")}>
                <Trash2 />
              </Button>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4 sm:p-5">
          <Fact label={t("telephony.call.line")} value={call.line_name || formatPhone(call.to)} />
          <Fact label={t("telephony.call.dialled")} value={formatPhone(call.to)} />
          <Fact label={t("telephony.call.duration")} value={seconds > 0 ? formatDuration(seconds) : ""} />
          <Fact label={t("telephony.call.handledBy")} value={call.handled_by ? t(`telephony.call.handled.${call.handled_by}`) : t("telephony.call.handled.none")} />
        </dl>

        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="flex min-w-0 flex-col gap-4">
            <Section title={t("telephony.call.summary")}>
              {call.summary ? (
                <p className="text-[15px] leading-relaxed text-foreground">{call.summary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("telephony.call.noSummary")}</p>
              )}
            </Section>

            <Section title={t("telephony.call.recording")}>
              {call.has_recording ? (
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

            <Section title={t("telephony.call.transcript")}>
              {call.transcript.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("telephony.call.noTranscript")}</p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {call.transcript.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-12 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{formatDuration(s.start_ms / 1000)}</span>
                      <p className="text-[15px] leading-relaxed">
                        <span className="font-medium text-foreground">{t(`telephony.call.speaker.${s.speaker}`)}: </span>
                        <span className="text-foreground">{s.text}</span>
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
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
            {call.decision.length > 0 && (
              <Section title={t("telephony.call.routing")}>
                <ul className="flex flex-col gap-1 text-[13px] text-muted-foreground">
                  {call.decision.map((d, i) => (
                    <li key={i} className="break-words">
                      {d}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {call.notes.length > 0 && (
              <Section title={t("telephony.call.notes")}>
                <ul className="flex flex-col gap-2">
                  {call.notes.map((n) => (
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
