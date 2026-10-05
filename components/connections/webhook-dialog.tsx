"use client"

import { useState } from "react"
import { Info, Loader2, Zap, ZapOff } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { connectionsApi, type Connection, type ProviderSpec, type WebhookKey } from "@/lib/connections"
import { useTranslation } from "@/src/i18n"
import { useProviderText } from "@/components/connections/shared"
import { CopyField } from "@/components/team/invite-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/**
 * Turns on "instant updates": a webhook address the platform calls on every
 * change. The full address carries a secret key and is shown once.
 */
export function WebhookDialog({
  open,
  onOpenChange,
  connection,
  spec,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection: Connection
  spec?: ProviderSpec
  onChanged: () => void
}) {
  const { t } = useTranslation()
  const text = useProviderText()
  const { token } = useAuth()
  const [key, setKey] = useState<WebhookKey | null>(null)
  const [busy, setBusy] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (busy) return
    onOpenChange(next)
    if (!next) setKey(null)
  }

  const rotate = async () => {
    if (!token) return
    setBusy(true)
    try {
      const result = await connectionsApi.rotateWebhook(token, connection.id)
      if (result.status === "success" && result.response) {
        setKey(result.response)
        onChanged()
      } else toast.error(result.message || t("connections.toast.failed"))
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    if (!token) return
    setBusy(true)
    try {
      const result = await connectionsApi.disableWebhook(token, connection.id)
      if (result.status === "success") {
        setKey(null)
        onChanged()
      } else toast.error(result.message || t("connections.toast.failed"))
    } finally {
      setBusy(false)
    }
  }

  const steps = key?.setup.length ? key.setup : spec?.webhook_setup ?? []
  const relative = key ? key.url.startsWith("/") : (connection.webhook.url ?? "").startsWith("/")

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("connections.webhook.title")}</DialogTitle>
          <DialogDescription>{t("connections.webhook.description")}</DialogDescription>
        </DialogHeader>

        {key ? (
          <div className="flex flex-col gap-3">
            <CopyField value={key.url} label={t("connections.webhook.url")} copiedText={t("connections.webhook.copied")} />
            <p className="text-[13px] leading-snug text-muted-foreground">{t("connections.webhook.shownOnce")}</p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
            {connection.webhook.enabled ? (
              <Zap className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            ) : (
              <ZapOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <p className="text-pretty">
              {connection.webhook.enabled
                ? t("connections.webhook.enabled", { prefix: connection.webhook.key_prefix ?? "" })
                : t("connections.webhook.disabled")}
            </p>
          </div>
        )}

        {relative && (
          <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="text-pretty">{t("connections.webhook.relative")}</p>
          </div>
        )}

        {steps.length > 0 && spec && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{t("connections.webhook.setup")}</p>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-foreground">
              {steps.map((step, i) => (
                <li key={i} className="text-pretty break-words">
                  {text.setupStep(spec, i, step)}
                </li>
              ))}
            </ol>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {connection.webhook.enabled ? (
            <Button type="button" variant="ghost" onClick={disable} disabled={busy}>
              {t("connections.webhook.disable")}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={rotate} disabled={busy} title={connection.webhook.enabled ? t("connections.webhook.rotateHint") : undefined}>
            {busy && <Loader2 className="animate-spin" />}
            {connection.webhook.enabled || key ? t("connections.webhook.rotate") : t("connections.webhook.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
