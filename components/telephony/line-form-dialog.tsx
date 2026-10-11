"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { apiText, telephonyApi, type Line, type LineInput, type Trunk } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

function Field({ id, label, help, error, children }: { id: string; label: string; help?: string; error?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-[13px] text-destructive">{error}</p> : help ? <p className="text-[13px] text-muted-foreground">{help}</p> : null}
    </div>
  )
}

/** Adds or edits a line: a number on one of the trunks, and how many calls it takes at once. */
export function LineFormDialog({
  open,
  onOpenChange,
  trunks,
  line,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trunks: Trunk[]
  line?: Line
  onSaved: (line: Line) => void
}) {
  const { t, locale } = useTranslation()
  const { token } = useAuth()
  const editing = Boolean(line)
  const [name, setName] = useState(line?.name ?? "")
  const [did, setDid] = useState(line?.did ?? "")
  const [trunkId, setTrunkId] = useState(line?.trunk_id ?? (trunks.length === 1 ? trunks[0].id : ""))
  const [maxConcurrent, setMaxConcurrent] = useState(String(line?.max_concurrent ?? 5))
  const [record, setRecord] = useState(line?.record ?? true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setErrors({})
    setError("")
    const input: LineInput = { name: name.trim(), did: did.trim(), trunk_id: trunkId, max_concurrent: Number(maxConcurrent) || 0, record }
    try {
      const result = editing && line ? await telephonyApi.updateLine(token, line.id, input) : await telephonyApi.createLine(token, input)
      if (result.status === "success" && result.response) {
        toast.success(editing ? t("telephony.toast.saved") : t("telephony.lines.toast.created"))
        onSaved(result.response)
        onOpenChange(false)
        return
      }
      const fields: Record<string, string> = {}
      for (const [k, v] of Object.entries(result.fields ?? {})) fields[k] = apiText(v, locale)
      const hidden = Object.keys(fields).filter((k) => !["did", "name", "trunk_id", "max_concurrent"].includes(k))
      setErrors(fields)
      setError(
        hidden.length > 0 ? fields[hidden[0]] : Object.keys(fields).length > 0 ? "" : apiText(result.message, locale) || t("telephony.toast.failed"),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{editing ? t("telephony.lines.form.editTitle") : t("telephony.lines.form.addTitle")}</DialogTitle>
            <DialogDescription>{t("telephony.lines.form.description")}</DialogDescription>
          </DialogHeader>

          <Field id="line-did" label={t("telephony.lines.form.did")} help={t("telephony.lines.form.didHelp")} error={errors.did}>
            <Input
              id="line-did"
              value={did}
              onChange={(e) => setDid(e.target.value)}
              placeholder="+375 17 222-33-44"
              inputMode="tel"
              aria-invalid={Boolean(errors.did)}
              disabled={saving}
              required
            />
          </Field>
          <Field id="line-name" label={t("telephony.lines.form.name")} error={errors.name}>
            <Input
              id="line-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("telephony.lines.form.namePlaceholder")}
              aria-invalid={Boolean(errors.name)}
              disabled={saving}
              required
            />
          </Field>
          <Field id="line-trunk" label={t("telephony.lines.form.trunk")} error={errors.trunk_id}>
            <Select value={trunkId} onValueChange={setTrunkId} disabled={saving}>
              <SelectTrigger id="line-trunk" className="w-full" aria-invalid={Boolean(errors.trunk_id)}>
                <SelectValue placeholder={t("telephony.lines.form.trunkPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {trunks.map((tr) => (
                  <SelectItem key={tr.id} value={tr.id}>
                    {tr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="line-max" label={t("telephony.lines.form.maxConcurrent")} help={t("telephony.lines.form.maxConcurrentHelp")} error={errors.max_concurrent}>
            <Input
              id="line-max"
              inputMode="numeric"
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(e.target.value.replace(/\D/g, ""))}
              className="w-28"
              aria-invalid={Boolean(errors.max_concurrent)}
              disabled={saving}
            />
          </Field>
          <label className="flex items-start justify-between gap-4 text-sm">
            <span>
              <span className="font-medium text-foreground">{t("telephony.lines.form.record")}</span>
              <span className="mt-0.5 block text-[13px] text-muted-foreground">{t("telephony.lines.form.recordHelp")}</span>
            </span>
            <Switch checked={record} onCheckedChange={setRecord} disabled={saving} />
          </label>

          {error && <p className="rounded-xl bg-destructive/5 px-3 py-2 text-[13px] text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("telephony.form.cancel")}
            </Button>
            <Button type="submit" disabled={saving || !trunkId}>
              {saving && <Loader2 className="animate-spin" />}
              {editing ? t("telephony.form.save") : t("telephony.lines.form.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
