"use client"

import { AlertCircle, CheckCircle2, CircleDashed, PhoneIncoming, PhoneMissed, PhoneOff, ShieldAlert, Voicemail } from "lucide-react"
import type { Call, CallOutcome, Trunk } from "@/lib/telephony"
import { formatPhone } from "@/lib/telephony"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/src/i18n"
import { Badge } from "@/components/ui/badge"

type Variant = "success" | "default" | "secondary" | "destructive" | "warning"

const OUTCOME_STYLE: Record<Exclude<CallOutcome, "">, { variant: Variant; icon: typeof PhoneIncoming }> = {
  resolved_by_bot: { variant: "success", icon: CheckCircle2 },
  message_taken: { variant: "default", icon: Voicemail },
  transferred: { variant: "default", icon: PhoneIncoming },
  operator_handled: { variant: "success", icon: PhoneIncoming },
  missed: { variant: "warning", icon: PhoneMissed },
  abandoned: { variant: "secondary", icon: PhoneOff },
  rejected: { variant: "secondary", icon: PhoneOff },
  spam: { variant: "secondary", icon: ShieldAlert },
  failed: { variant: "destructive", icon: AlertCircle },
}

/** How a call ended, or that it is still going. */
export function OutcomeBadge({ call }: { call: Pick<Call, "outcome" | "state"> }) {
  const { t } = useTranslation()
  if (!call.outcome || call.state !== "ended") {
    return (
      <Badge variant="default" className="gap-1.5">
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
        {t("telephony.outcome.live")}
      </Badge>
    )
  }
  const style = OUTCOME_STYLE[call.outcome] ?? { variant: "secondary" as Variant, icon: CircleDashed }
  const Icon = style.icon
  return (
    <Badge variant={style.variant} className="gap-1.5">
      <Icon className="size-3.5" aria-hidden />
      {t(`telephony.outcome.${call.outcome}`)}
    </Badge>
  )
}

/**
 * A trunk's state as voice-engine last reported it: registered or
 * reachable, not answering, or not reported yet.
 */
export function TrunkStatusBadge({ trunk }: { trunk: Trunk }) {
  const { t } = useTranslation()
  if (!trunk.enabled) return <Badge variant="secondary">{t("telephony.trunks.status.disabled")}</Badge>
  if (trunk.status === "ok")
    return (
      <Badge variant="success" className="gap-1.5">
        <CheckCircle2 className="size-3.5" aria-hidden />
        {trunk.mode === "register" ? t("telephony.trunks.status.registered") : t("telephony.trunks.status.reachable")}
      </Badge>
    )
  if (trunk.status === "error")
    return (
      <Badge variant="destructive" className="gap-1.5">
        <AlertCircle className="size-3.5" aria-hidden />
        {t("telephony.trunks.status.error")}
      </Badge>
    )
  return (
    <Badge variant="secondary" className="gap-1.5">
      <CircleDashed className="size-3.5" aria-hidden />
      {t("telephony.trunks.status.unknown")}
    </Badge>
  )
}

/** A caller's number, or "Скрытый номер" when there is none. */
export function Caller({ number, className }: { number: string; className?: string }) {
  const { t } = useTranslation()
  if (!number) return <span className={cn("text-muted-foreground", className)}>{t("telephony.calls.hiddenNumber")}</span>
  return <span className={cn("tabular-nums", className)}>{formatPhone(number)}</span>
}
