"use client"

import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { apiText, telephonyApi, type TelephonySettings } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TelegramCard } from "@/components/telephony/telegram-card"

/**
 * Organization-wide telephony options (the call limit across all lines, how
 * long recordings are kept) and the user's Telegram chat.
 */
export function GeneralPanel({ settings, onSaved }: { settings: TelephonySettings; onSaved: (s: TelephonySettings) => void }) {
  const { t, locale } = useTranslation()
  const { token } = useAuth()
  const [maxCalls, setMaxCalls] = useState(String(settings.max_concurrent_calls))
  const [retention, setRetention] = useState(String(settings.recording_retention_days))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const dirty = maxCalls !== String(settings.max_concurrent_calls) || retention !== String(settings.recording_retention_days)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setErrors({})
    try {
      const result = await telephonyApi.updateSettings(token, {
        max_concurrent_calls: Number(maxCalls) || 0,
        recording_retention_days: Number(retention) || 0,
      })
      if (result.status === "success" && result.response) {
        toast.success(t("telephony.toast.saved"))
        onSaved(result.response)
        return
      }
      const fields: Record<string, string> = {}
      for (const [k, v] of Object.entries(result.fields ?? {})) fields[k] = apiText(v, locale)
      setErrors(fields)
      const hidden = Object.keys(fields).filter((k) => k !== "max_concurrent_calls" && k !== "recording_retention_days")
      if (hidden.length > 0) toast.error(fields[hidden[0]])
      else if (!result.fields) toast.error(apiText(result.message, locale) || t("telephony.toast.failed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={submit} className="grid max-w-xl gap-6 rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-1.5">
          <Label htmlFor="max-calls">{t("telephony.general.maxCalls")}</Label>
          <Input
            id="max-calls"
            inputMode="numeric"
            value={maxCalls}
            onChange={(e) => setMaxCalls(e.target.value.replace(/\D/g, ""))}
            className="w-28"
            aria-invalid={Boolean(errors.max_concurrent_calls)}
            disabled={saving}
          />
          <p className={errors.max_concurrent_calls ? "text-[13px] text-destructive" : "text-[13px] text-muted-foreground"}>
            {errors.max_concurrent_calls || t("telephony.general.maxCallsHelp")}
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="retention">{t("telephony.general.retention")}</Label>
          <Input
            id="retention"
            inputMode="numeric"
            value={retention}
            onChange={(e) => setRetention(e.target.value.replace(/\D/g, ""))}
            className="w-28"
            aria-invalid={Boolean(errors.recording_retention_days)}
            disabled={saving}
          />
          <p className={errors.recording_retention_days ? "text-[13px] text-destructive" : "text-[13px] text-muted-foreground"}>
            {errors.recording_retention_days || t("telephony.general.retentionHelp")}
          </p>
        </div>
        <div>
          <Button type="submit" disabled={saving || !dirty}>
            {saving && <Loader2 className="animate-spin" />}
            {t("telephony.form.save")}
          </Button>
        </div>
      </form>
      <TelegramCard />
    </div>
  )
}
