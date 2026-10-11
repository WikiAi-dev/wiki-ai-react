"use client"

import { useState } from "react"
import { Loader2, MoreHorizontal, Phone, Plus, Settings2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { apiText, formatPhone, telephonyApi, type Line, type Trunk } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"
import { LineFormDialog } from "@/components/telephony/line-form-dialog"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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

function LineRow({ line, trunks, onChanged }: { line: Line; trunks: Trunk[]; onChanged: () => void }) {
  const { t, locale } = useTranslation()
  const { token } = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const trunk = trunks.find((tr) => tr.id === line.trunk_id)

  const setEnabled = async (enabled: boolean) => {
    if (!token) return
    setToggling(true)
    try {
      const result = await telephonyApi.updateLine(token, line.id, { enabled })
      if (result.status === "success") onChanged()
      else toast.error(apiText(result.message, locale) || t("telephony.toast.failed"))
    } finally {
      setToggling(false)
    }
  }

  const remove = async () => {
    if (!token) return
    setDeleting(true)
    try {
      const result = await telephonyApi.deleteLine(token, line.id)
      if (result.status === "success") {
        toast.success(t("telephony.lines.toast.deleted"))
        setDeleteOpen(false)
        onChanged()
      } else toast.error(apiText(result.message, locale) || t("telephony.toast.failed"))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Phone className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium tabular-nums text-foreground">{formatPhone(line.did)}</p>
        <p className="truncate text-[13px] text-muted-foreground">
          {line.name} · {trunk?.name ?? t("telephony.lines.noTrunk")} · {t("telephony.lines.callsAtOnce", { count: line.max_concurrent })}
        </p>
      </div>
      <Switch
        checked={line.enabled}
        onCheckedChange={setEnabled}
        disabled={toggling}
        aria-label={line.enabled ? t("telephony.lines.disable") : t("telephony.lines.enable")}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label={t("telephony.lines.more")}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Settings2 />
            {t("telephony.lines.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            {t("telephony.lines.delete.action")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LineFormDialog key={`edit-${line.id}-${editOpen}`} open={editOpen} onOpenChange={setEditOpen} trunks={trunks} line={line} onSaved={onChanged} />
      <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("telephony.lines.delete.title", { number: formatPhone(line.did) })}</AlertDialogTitle>
            <AlertDialogDescription>{t("telephony.lines.delete.description")}</AlertDialogDescription>
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
              {t("telephony.lines.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

/** The organization's numbers: which trunk each arrives on, its limit, on or off. */
export function LinesPanel({ lines, trunks, onChanged }: { lines: Line[]; trunks: Trunk[]; onChanged: () => void }) {
  const { t } = useTranslation()
  const [addOpen, setAddOpen] = useState(false)
  const add = (
    <Button onClick={() => setAddOpen(true)} disabled={trunks.length === 0}>
      <Plus />
      {t("telephony.lines.add")}
    </Button>
  )
  return (
    <>
      {lines.length === 0 ? (
        <EmptyState
          icon={Phone}
          title={t("telephony.lines.empty.title")}
          description={trunks.length === 0 ? t("telephony.lines.empty.needTrunk") : t("telephony.lines.empty.description")}
          action={add}
          className="py-14"
        />
      ) : (
        <>
          <div className="flex justify-end">{add}</div>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {lines.map((l) => (
              <LineRow key={l.id} line={l} trunks={trunks} onChanged={onChanged} />
            ))}
          </ul>
        </>
      )}
      <LineFormDialog key={`add-${addOpen}`} open={addOpen} onOpenChange={setAddOpen} trunks={trunks} onSaved={onChanged} />
    </>
  )
}
