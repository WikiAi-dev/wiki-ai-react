"use client"

import { useState } from "react"
import { Activity, Loader2, MoreHorizontal, Pause, Play, Plus, Server, Settings2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { fullTime, relativeTime } from "@/lib/connections"
import { apiText, reportedAfter, telephonyApi, type Line, type Trunk } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"
import { TrunkStatusBadge } from "@/components/telephony/shared"
import { TrunkFormDialog } from "@/components/telephony/trunk-form-dialog"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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

// A test's answer comes back as a newer status within a few seconds; the
// page polls for it this long.
const TEST_WAIT_MS = 15_000
const TEST_POLL_MS = 1_000

function Fact({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-foreground" title={title ?? value}>
        {value}
      </dd>
    </div>
  )
}

function TrunkCard({ trunk, lines, onChanged }: { trunk: Trunk; lines: Line[]; onChanged: () => Promise<Trunk[]> }) {
  const { t, locale } = useTranslation()
  const { token } = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [testing, setTesting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const numbers = lines.filter((l) => l.trunk_id === trunk.id)

  const test = async () => {
    if (!token) return
    setTesting(true)
    // The answer is a report newer than the last one; both times are the
    // engine's, so the browser's clock can't skew the wait.
    const previous = trunk.status_at
    const started = Date.now()
    try {
      const result = await telephonyApi.testTrunk(token, trunk.id)
      if (result.status !== "success") {
        toast.error(apiText(result.message, locale) || t("telephony.toast.failed"))
        return
      }
      while (Date.now() - started < TEST_WAIT_MS) {
        await new Promise((r) => setTimeout(r, TEST_POLL_MS))
        const fresh = (await onChanged()).find((x) => x.id === trunk.id)
        if (fresh && reportedAfter(fresh, previous)) {
          if (fresh.status === "ok") toast.success(t("telephony.trunks.test.ok"), { description: fresh.status_detail })
          else toast.error(t("telephony.trunks.test.failed"), { description: fresh.status_detail })
          return
        }
      }
      toast.warning(t("telephony.trunks.test.noAnswer"))
    } finally {
      setTesting(false)
    }
  }

  const setEnabled = async (enabled: boolean) => {
    if (!token) return
    const result = await telephonyApi.updateTrunk(token, trunk.id, { enabled })
    if (result.status === "success") {
      toast.success(enabled ? t("telephony.trunks.toast.enabled") : t("telephony.trunks.toast.disabled"))
      onChanged()
    } else toast.error(apiText(result.message, locale) || t("telephony.toast.failed"))
  }

  const remove = async () => {
    if (!token) return
    setDeleting(true)
    try {
      const result = await telephonyApi.deleteTrunk(token, trunk.id)
      if (result.status === "success") {
        toast.success(t("telephony.trunks.toast.deleted"))
        setDeleteOpen(false)
        onChanged()
      } else toast.error(apiText(result.message, locale) || t("telephony.toast.failed"))
    } finally {
      setDeleting(false)
    }
  }

  const where =
    trunk.mode === "register"
      ? `${trunk.username}@${trunk.host}${trunk.port && trunk.port !== 5060 ? `:${trunk.port}` : ""} · ${trunk.transport.toUpperCase()}`
      : trunk.allowed_ips.join(", ") || trunk.host

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <header className="flex items-start gap-3.5">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Server className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold tracking-tight text-foreground">{trunk.name}</h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground" title={where}>
            {t(`telephony.trunks.mode.${trunk.mode}`)} · <span className="font-mono text-[13px]">{where}</span>
          </p>
        </div>
        <div className="shrink-0">
          <TrunkStatusBadge trunk={trunk} />
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 border-t border-border pt-4">
        <Fact
          label={t("telephony.trunks.card.numbers")}
          value={numbers.length > 0 ? numbers.map((l) => l.did).join(", ") : t("telephony.trunks.card.noNumbers")}
        />
        <Fact
          label={t("telephony.trunks.card.checked")}
          value={relativeTime(trunk.status_at, locale) || t("telephony.trunks.card.never")}
          title={fullTime(trunk.status_at, locale)}
        />
      </dl>

      {trunk.enabled && trunk.status_detail && (
        <p
          className={
            trunk.status === "error"
              ? "rounded-xl bg-destructive/5 px-3 py-2 text-[13px] leading-snug break-words text-destructive"
              : "rounded-xl bg-muted px-3 py-2 text-[13px] leading-snug break-words text-muted-foreground"
          }
        >
          {trunk.status_detail}
        </p>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={test} disabled={testing || !trunk.enabled}>
          {testing ? <Loader2 className="animate-spin" /> : <Activity />}
          {t("telephony.trunks.card.test")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Settings2 />
          {t("telephony.trunks.card.edit")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label={t("telephony.trunks.card.more")}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuItem onClick={() => setEnabled(!trunk.enabled)}>
              {trunk.enabled ? <Pause /> : <Play />}
              {trunk.enabled ? t("telephony.trunks.card.disable") : t("telephony.trunks.card.enable")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 />
              {t("telephony.trunks.card.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </footer>

      <TrunkFormDialog key={`edit-${trunk.id}-${editOpen}`} open={editOpen} onOpenChange={setEditOpen} trunk={trunk} onSaved={() => onChanged()} />
      <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("telephony.trunks.delete.title", { name: trunk.name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {numbers.length > 0 ? t("telephony.trunks.delete.withLines", { count: numbers.length }) : t("telephony.trunks.delete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("telephony.form.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                remove()
              }}
              disabled={deleting || numbers.length > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="animate-spin" />}
              {t("telephony.trunks.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}

/** The organization's trunks, and adding one. */
export function TrunksPanel({ trunks, lines, onChanged }: { trunks: Trunk[]; lines: Line[]; onChanged: () => Promise<Trunk[]> }) {
  const { t } = useTranslation()
  const [addOpen, setAddOpen] = useState(false)
  const add = (
    <Button onClick={() => setAddOpen(true)}>
      <Plus />
      {t("telephony.trunks.add")}
    </Button>
  )
  return (
    <>
      {trunks.length === 0 ? (
        <EmptyState icon={Server} title={t("telephony.trunks.empty.title")} description={t("telephony.trunks.empty.description")} action={add} className="py-14" />
      ) : (
        <>
          <div className="flex justify-end">{add}</div>
          <div className="grid gap-4 md:grid-cols-2">
            {trunks.map((tr) => (
              <TrunkCard key={tr.id} trunk={tr} lines={lines} onChanged={onChanged} />
            ))}
          </div>
        </>
      )}
      <TrunkFormDialog key={`add-${addOpen}`} open={addOpen} onOpenChange={setAddOpen} onSaved={() => onChanged()} />
    </>
  )
}
