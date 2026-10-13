"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { Loader2, Mic, MicOff, PhoneOff } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { AnswerError, answerCall, type OperatorCall } from "@/lib/operator"
import { formatDuration, formatPhone, type Call } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"
import { Button } from "@/components/ui/button"

interface OperatorState {
  /** The call the operator is on, null for none. */
  active: Call | null
  /** The call being answered, null for none. */
  connecting: string | null
  answer: (call: Call) => Promise<void>
}

const OperatorContext = createContext<OperatorState>({ active: null, connecting: null, answer: async () => {} })

/** The operator's call, for the telephony pages: answering one keeps it while moving between them. */
export function useOperator() {
  return useContext(OperatorContext)
}

/** Holds the operator's call and shows the bar to talk, mute and hang up. */
export function OperatorProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useTranslation()
  const { token } = useAuth()
  const [active, setActive] = useState<Call | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [since, setSince] = useState(0)
  const [now, setNow] = useState(0)
  const call = useRef<OperatorCall | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)

  const finish = useCallback(() => {
    call.current = null
    setActive(null)
    setMuted(false)
  }, [])

  const answer = useCallback(
    async (c: Call) => {
      if (!token || call.current || connecting) return
      setConnecting(c.id)
      try {
        const oc = await answerCall(token, c.id, locale)
        call.current = oc
        oc.pc.onconnectionstatechange = () => {
          if (["failed", "closed", "disconnected"].includes(oc.pc.connectionState) && call.current === oc) {
            toast.info(t("telephony.operator.ended"))
            oc.pc.close()
            finish()
          }
        }
        setActive(c)
        setSince(Date.now())
        if (audio.current) audio.current.srcObject = oc.remote
      } catch (e) {
        const kind = e instanceof AnswerError ? e.kind : "failed"
        toast.error(t(`telephony.operator.errors.${kind}`))
      } finally {
        setConnecting(null)
      }
    },
    [token, connecting, locale, t, finish],
  )

  const hangup = async () => {
    const oc = call.current
    if (!oc) return
    finish()
    await oc.hangup()
  }

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])

  // Leaving the telephony pages ends the operator's side: no call keeps
  // running unseen.
  useEffect(() => () => void call.current?.hangup(), [])

  return (
    <OperatorContext.Provider value={{ active, connecting, answer }}>
      {children}
      <audio ref={audio} autoPlay className="hidden" />
      {active && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur sm:inset-x-auto sm:right-6 sm:bottom-6 sm:rounded-2xl sm:border">
          <div className="flex items-center gap-3">
            <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-success" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {t("telephony.operator.onCall", { who: formatPhone(active.from) || t("telephony.calls.hiddenNumber") })}
              </p>
              <p className="text-xs tabular-nums text-muted-foreground">{formatDuration(Math.max(0, Math.round((now - since) / 1000)))}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                call.current?.setMuted(!muted)
                setMuted(!muted)
              }}
              aria-label={muted ? t("telephony.operator.unmute") : t("telephony.operator.mute")}
            >
              {muted ? <MicOff /> : <Mic />}
            </Button>
            <Button variant="destructive" onClick={hangup}>
              <PhoneOff />
              {t("telephony.operator.hangup")}
            </Button>
          </div>
        </div>
      )}
      {connecting && !active && (
        <div className="fixed right-6 bottom-6 z-50 hidden items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-lg sm:flex">
          <Loader2 className="size-4 animate-spin" />
          {t("telephony.operator.answering")}
        </div>
      )}
    </OperatorContext.Provider>
  )
}
