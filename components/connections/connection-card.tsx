"use client"

import { useState } from "react"
import { History, Loader2, MoreHorizontal, Pause, Play, RefreshCw, RotateCw, Settings2, Trash2, Zap } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { connectionsApi, fullTime, relativeTime, type Connection, type ProviderSpec } from "@/lib/connections"
import { useTranslation } from "@/src/i18n"
import { ProviderMark, StateBadge, useProviderText } from "@/components/connections/shared"
import { ConnectionFormDialog } from "@/components/connections/connection-form-dialog"
import { WebhookDialog } from "@/components/connections/webhook-dialog"
import { HistoryDialog } from "@/components/connections/history-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
      <dd className="mt-0.5 truncate text-sm font-medium tabular-nums text-foreground" title={title}>
        {value}
      </dd>
    </div>
  )
}

/** One connection: its state, what it synced and when, and what admins can do with it. */
export function ConnectionCard({
  connection: c,
  spec,
  providers,
  canManage,
  onChanged,
}: {
  connection: Connection
  spec?: ProviderSpec
  providers: ProviderSpec[]
  canManage: boolean
  onChanged: () => void
}) {
  const { t, locale } = useTranslation()
  const text = useProviderText()
  const { token } = useAuth()
  const [syncing, setSyncing] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [webhookOpen, setWebhookOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [purge, setPurge] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const sync = async (full: boolean) => {
    if (!token) return
    setSyncing(true)
    try {
      const result = await connectionsApi.sync(token, c.id, full)
      if (result.status === "success") {
        toast.success(t("connections.toast.syncQueued"))
        onChanged()
      } else toast.error(result.message || t("connections.toast.failed"))
    } finally {
      setSyncing(false)
    }
  }

  const setEnabled = async (enabled: boolean) => {
    if (!token) return
    const result = await connectionsApi.update(token, c.id, { enabled })
    if (result.status === "success") {
      toast.success(enabled ? t("connections.toast.resumed") : t("connections.toast.paused"))
      onChanged()
    } else toast.error(result.message || t("connections.toast.failed"))
  }

  const remove = async () => {
    if (!token) return
    setDeleting(true)
    try {
      const result = await connectionsApi.remove(token, c.id, purge)
      if (result.status === "success") {
        const count = result.response?.documents_to_remove ?? 0
        toast.success(t("connections.toast.deleted"), {
          description: purge && count > 0 ? t("connections.delete.purgeQueued", { count }) : undefined,
        })
        setDeleteOpen(false)
        onChanged()
      } else toast.error(result.message || t("connections.toast.failed"))
    } finally {
      setDeleting(false)
    }
  }

  const kinds = c.synced_kinds
    .map((k) => text.kind(c.provider, k, spec?.kinds.find((s) => s.id === k)?.title ?? k))
    .join(", ")
  const busy = syncing || c.state === "syncing"

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <header className="flex items-start gap-3.5">
        <ProviderMark provider={c.provider} title={c.provider_title} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold tracking-tight text-foreground">{c.name}</h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {c.provider_title}
            {kinds && ` · ${kinds}`}
          </p>
          <div className="mt-2 sm:hidden">
            <StateBadge state={c.state} />
          </div>
        </div>
        <div className="hidden shrink-0 sm:block">
          <StateBadge state={c.state} />
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3">
        <Fact label={t("connections.card.records")} value={c.item_count.toLocaleString(locale === "ru" ? "ru-RU" : "en-GB")} />
        <Fact
          label={t("connections.card.sourceUpdated")}
          value={relativeTime(c.latest_source_update, locale) || "—"}
          title={fullTime(c.latest_source_update, locale)}
        />
        <Fact
          label={t("connections.card.lastSync")}
          value={relativeTime(c.last_success_at, locale) || t("connections.card.never")}
          title={fullTime(c.last_success_at, locale)}
        />
      </dl>

      {c.last_error && c.state !== "paused" && (
        <p className="line-clamp-3 rounded-xl bg-destructive/5 px-3 py-2 text-[13px] leading-snug break-words text-destructive">{c.last_error}</p>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-2">
        {canManage ? (
          <>
            <Button size="sm" onClick={() => sync(false)} disabled={busy || !c.enabled}>
              {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              {t("connections.card.syncNow")}
            </Button>
            {c.webhook.supported && (
              <Button size="sm" variant="outline" onClick={() => setWebhookOpen(true)}>
                <Zap className={c.webhook.enabled ? "text-primary" : undefined} />
                {t("connections.card.webhook")}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label={t("connections.card.more")}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem onClick={() => sync(true)} disabled={busy || !c.enabled}>
                  <RotateCw />
                  {t("connections.card.fullSync")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Settings2 />
                  {t("connections.card.settings")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
                  <History />
                  {t("connections.card.history")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEnabled(!c.enabled)}>
                  {c.enabled ? <Pause /> : <Play />}
                  {c.enabled ? t("connections.card.pause") : t("connections.card.resume")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 />
                  {t("connections.card.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
            <History />
            {t("connections.card.history")}
          </Button>
        )}
      </footer>

      {canManage && (
        <>
          <ConnectionFormDialog
            key={`edit-${c.id}-${editOpen}`}
            open={editOpen}
            onOpenChange={setEditOpen}
            providers={providers}
            connection={c}
            onSaved={onChanged}
          />
          <WebhookDialog open={webhookOpen} onOpenChange={setWebhookOpen} connection={c} spec={spec} onChanged={onChanged} />
          <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("connections.delete.title", { name: c.name })}</AlertDialogTitle>
                <AlertDialogDescription>{t("connections.delete.description")}</AlertDialogDescription>
              </AlertDialogHeader>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={purge} onCheckedChange={(on) => setPurge(on === true)} className="mt-0.5" />
                <span className="text-pretty">{t("connections.delete.purge")}</span>
              </label>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>{t("connections.form.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault()
                    remove()
                  }}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting && <Loader2 className="animate-spin" />}
                  {t("connections.delete.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} connection={c} />
    </article>
  )
}
