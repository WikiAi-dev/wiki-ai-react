"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ExternalLink, Loader2, Send, Unlink } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { apiText, telephonyApi, type TelegramNotify, type TelegramSettings } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"
import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Skeleton } from "@/components/ui/skeleton"

/** How long the card waits for the chat to be linked after the link is opened (the link's own life). */
const WAIT_MS = 10 * 60_000
const POLL_MS = 2_500

/**
 * The signed-in user's Telegram chat (WAI-202): link it with a one-time
 * t.me link, choose which calls it gets, unlink it. Any member, for their
 * own chat; the bot then sends call summaries and "needs an operator"
 * alerts there.
 */
export function TelegramCard() {
  const { t, locale } = useTranslation()
  const { token } = useAuth()
  const [data, setData] = useState<TelegramSettings | null>(null)
  const [failed, setFailed] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const waitUntil = useRef(0)

  const load = useCallback(async () => {
    if (!token) return null
    const result = await telephonyApi.telegram(token)
    if (result.status === "success" && result.response) {
      setData(result.response)
      setFailed(false)
      return result.response
    }
    setFailed(true)
    return null
  }, [token])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  // While a link is open, look for the chat to appear.
  useEffect(() => {
    if (!link) return
    const id = setInterval(async () => {
      const fresh = await load()
      if (fresh?.link) {
        setLink(null)
        toast.success(t("telephony.telegram.linked"))
      } else if (Date.now() > waitUntil.current) {
        setLink(null)
      }
    }, POLL_MS)
    return () => clearInterval(id)
  }, [link, load, t])

  const connect = async () => {
    if (!token) return
    // A window opened right on the click isn't blocked; the link goes in
    // once it's made.
    const tab = window.open("", "_blank")
    if (tab) tab.opener = null
    setBusy(true)
    try {
      const result = await telephonyApi.telegramLinkToken(token)
      if (result.status !== "success" || !result.response) {
        tab?.close()
        toast.error(apiText(result.message, locale) || t("telephony.toast.failed"))
        return
      }
      const url = result.response.url
      if (tab) tab.location.href = url
      waitUntil.current = Date.now() + WAIT_MS
      setLink(url)
    } finally {
      setBusy(false)
    }
  }

  const setNotify = async (notify: TelegramNotify) => {
    if (!token) return
    setBusy(true)
    try {
      const result = await telephonyApi.setTelegramNotify(token, notify)
      if (result.status === "success" && result.response) setData(result.response)
      else toast.error(apiText(result.message, locale) || t("telephony.toast.failed"))
    } finally {
      setBusy(false)
    }
  }

  const unlink = async () => {
    if (!token) return
    setBusy(true)
    try {
      const result = await telephonyApi.unlinkTelegram(token)
      if (result.status === "success") {
        toast.success(t("telephony.telegram.unlinked"))
        await load()
      } else {
        toast.error(apiText(result.message, locale) || t("telephony.toast.failed"))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="grid max-w-xl gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Send className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{t("telephony.telegram.title")}</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{t("telephony.telegram.description")}</p>
        </div>
      </div>

      {data === null && !failed ? (
        <Skeleton className="h-10 rounded-xl" />
      ) : failed ? (
        <p className="text-[13px] text-muted-foreground">{t("telephony.telegram.loadFailed")}</p>
      ) : !data!.bot ? (
        <p className="rounded-xl bg-muted/60 px-3 py-2 text-[13px] text-muted-foreground">{t("telephony.telegram.notConfigured")}</p>
      ) : data!.link ? (
        <div className="grid gap-4">
          <p className="text-sm text-foreground">
            {t("telephony.telegram.linkedAs", {
              who: [data!.link.username && `@${data!.link.username}`, data!.link.name].filter(Boolean).join(" · ") || t("telephony.telegram.yourChat"),
            })}
          </p>
          <div className="grid gap-1.5">
            <p className="text-[13px] font-medium text-foreground">{t("telephony.telegram.notify")}</p>
            <SegmentedControl<TelegramNotify>
              className="w-full sm:w-auto"
              label={t("telephony.telegram.notify")}
              value={data!.link.notify}
              onChange={setNotify}
              options={[
                { value: "all", label: t("telephony.telegram.notifyAll") },
                { value: "important", label: t("telephony.telegram.notifyImportant") },
                { value: "off", label: t("telephony.telegram.notifyOff") },
              ]}
            />
            <p className="text-[13px] text-muted-foreground">{t(`telephony.telegram.notifyHelp.${data!.link.notify}`)}</p>
          </div>
          <div>
            <Button variant="outline" onClick={unlink} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Unlink />}
              {t("telephony.telegram.unlink")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <div>
            <Button onClick={connect} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Send />}
              {t("telephony.telegram.connect", { bot: `@${data!.bot}` })}
            </Button>
          </div>
          {link && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {t("telephony.telegram.waiting")}
              <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                {t("telephony.telegram.openAgain")}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </p>
          )}
        </div>
      )}
    </section>
  )
}
