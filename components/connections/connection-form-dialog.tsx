"use client"

import { useState, type FormEvent } from "react"
import { ArrowLeft, CheckCircle2, ChevronRight, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import {
  connectionsApi,
  type Connection,
  type ConnectionInput,
  type ProviderField,
  type ProviderSpec,
  type TestResult,
} from "@/lib/connections"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/src/i18n"
import { ProviderMark, useProviderText } from "@/components/connections/shared"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const SCHEDULES = ["5", "15", "60", "360", "1440"]

interface FormState {
  name: string
  config: Record<string, unknown>
  secrets: Record<string, string>
  kinds: string[]
  schedule: string
}

function initialState(spec: ProviderSpec | null, connection?: Connection): FormState {
  if (connection) {
    return {
      name: connection.name,
      config: { ...connection.config },
      secrets: {},
      kinds: connection.kinds.length > 0 ? connection.kinds : connection.synced_kinds,
      schedule: SCHEDULES.includes(String(connection.schedule_minutes)) ? String(connection.schedule_minutes) : String(connection.schedule_minutes),
    }
  }
  const config: Record<string, unknown> = {}
  for (const f of spec?.fields ?? []) {
    if (!f.secret && f.default !== undefined) config[f.key] = f.default
  }
  return {
    name: "",
    config,
    secrets: {},
    kinds: (spec?.kinds ?? []).filter((k) => k.default).map((k) => k.id),
    schedule: "15",
  }
}

/**
 * Adds a connection (pick a platform, fill in the form its spec describes,
 * test, connect) or edits one. Secrets are never shown again: an empty
 * secret field keeps the stored value.
 */
export function ConnectionFormDialog({
  open,
  onOpenChange,
  providers,
  connection,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  providers: ProviderSpec[]
  connection?: Connection
  onSaved: (connection: Connection) => void
}) {
  const { t } = useTranslation()
  const text = useProviderText()
  const { token } = useAuth()
  const editing = Boolean(connection)
  const fixedSpec = connection ? providers.find((p) => p.id === connection.provider) ?? null : null
  const [spec, setSpec] = useState<ProviderSpec | null>(fixedSpec ?? (providers.length === 1 ? providers[0] : null))
  const [form, setForm] = useState<FormState>(() => initialState(spec, connection))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const [test, setTest] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const busy = testing || saving

  const reset = (next: ProviderSpec | null) => {
    setSpec(next)
    setForm(initialState(next, connection))
    setFieldErrors({})
    setError("")
    setTest(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (busy) return
    onOpenChange(next)
    if (!next) reset(fixedSpec ?? (providers.length === 1 ? providers[0] : null))
  }

  const setConfig = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, config: { ...f.config, [key]: value } }))
    setTest(null)
  }
  const setSecret = (key: string, value: string) => {
    setForm((f) => ({ ...f, secrets: { ...f.secrets, [key]: value } }))
    setTest(null)
  }
  const toggleKind = (kind: string, on: boolean) =>
    setForm((f) => ({ ...f, kinds: on ? [...f.kinds, kind] : f.kinds.filter((k) => k !== kind) }))

  const input = (): ConnectionInput => {
    const secrets: Record<string, string> = {}
    for (const [k, v] of Object.entries(form.secrets)) if (v.trim()) secrets[k] = v.trim()
    return {
      provider: spec?.id ?? "",
      name: form.name.trim() || undefined,
      config: form.config,
      secrets,
      kinds: form.kinds,
      schedule_minutes: Number(form.schedule),
    }
  }

  const runTest = async () => {
    if (!token || !spec) return
    setTesting(true)
    setError("")
    setFieldErrors({})
    try {
      const result =
        editing && connection && Object.values(form.secrets).every((v) => !v.trim())
          ? await connectionsApi.test(token, connection.id)
          : await connectionsApi.testDraft(token, input())
      if (result.status === "success" && result.response) setTest(result.response)
      else {
        setFieldErrors(result.fields ?? {})
        setError(result.fields ? "" : result.message || t("connections.toast.failed"))
      }
    } finally {
      setTesting(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token || !spec) return
    setSaving(true)
    setError("")
    setFieldErrors({})
    try {
      const body = input()
      const result =
        editing && connection
          ? await connectionsApi.update(token, connection.id, {
              name: body.name ?? "",
              config: body.config,
              secrets: body.secrets,
              kinds: body.kinds,
              schedule_minutes: body.schedule_minutes,
            })
          : await connectionsApi.create(token, body)
      if (result.status === "success" && result.response) {
        toast.success(editing ? t("connections.toast.saved") : t("connections.toast.created"))
        onSaved(result.response)
        onOpenChange(false)
        reset(fixedSpec ?? (providers.length === 1 ? providers[0] : null))
        return
      }
      setFieldErrors(result.fields ?? {})
      setError(result.fields ? "" : result.message || t("connections.toast.failed"))
    } finally {
      setSaving(false)
    }
  }

  const renderField = (f: ProviderField) => {
    const id = `conn-${f.key}`
    const label = text.fieldLabel(spec!, f)
    const help = text.fieldHelp(spec!, f)
    const err = fieldErrors[f.key]
    const savedSecret = f.secret && connection?.secrets_set.includes(f.key)
    let control
    if (f.secret) {
      control = (
        <Input
          id={id}
          type={f.type === "url" ? "url" : "password"}
          value={form.secrets[f.key] ?? ""}
          onChange={(e) => setSecret(f.key, e.target.value)}
          placeholder={savedSecret ? t("connections.form.secretSet") : f.placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(err)}
          disabled={busy}
          className={f.type === "url" ? "font-mono text-[13px]" : undefined}
        />
      )
    } else if (f.type === "select") {
      control = (
        <Select value={String(form.config[f.key] ?? "")} onValueChange={(v) => setConfig(f.key, v)} disabled={busy}>
          <SelectTrigger id={id} className="w-full" aria-invalid={Boolean(err)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(f.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {text.option(spec!, f, o.value, o.label || o.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    } else if (f.type === "multiselect") {
      const values = Array.isArray(form.config[f.key]) ? (form.config[f.key] as string[]) : []
      control = (
        <div className="flex flex-wrap gap-2">
          {(f.options ?? []).map((o) => (
            <label key={o.value} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm">
              <Checkbox
                checked={values.includes(o.value)}
                onCheckedChange={(on) => setConfig(f.key, on ? [...values, o.value] : values.filter((v) => v !== o.value))}
                disabled={busy}
              />
              {text.option(spec!, f, o.value, o.label || o.value)}
            </label>
          ))}
        </div>
      )
    } else if (f.type === "textarea") {
      control = (
        <Textarea
          id={id}
          value={String(form.config[f.key] ?? "")}
          onChange={(e) => setConfig(f.key, e.target.value)}
          placeholder={f.placeholder}
          rows={3}
          aria-invalid={Boolean(err)}
          disabled={busy}
        />
      )
    } else {
      control = (
        <Input
          id={id}
          type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
          value={String(form.config[f.key] ?? "")}
          onChange={(e) => setConfig(f.key, f.type === "number" ? e.target.valueAsNumber : e.target.value)}
          placeholder={f.placeholder}
          aria-invalid={Boolean(err)}
          disabled={busy}
        />
      )
    }
    return (
      <div key={f.key} className="flex flex-col gap-2">
        <Label htmlFor={id}>
          {label}
          {f.required && !savedSecret && <span className="text-muted-foreground">*</span>}
        </Label>
        {control}
        {err ? (
          <p role="alert" className="text-[13px] leading-snug text-destructive">
            {err}
          </p>
        ) : (
          help && <p className="text-[13px] leading-snug text-muted-foreground text-pretty">{help}</p>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        {!spec ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("connections.form.choose")}</DialogTitle>
              <DialogDescription>{t("connections.form.chooseHint")}</DialogDescription>
            </DialogHeader>
            <ul className="flex flex-col gap-2">
              {providers.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => reset(p)}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <ProviderMark provider={p.id} title={p.title} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold tracking-tight">{p.title}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-muted-foreground text-pretty">{text.description(p)}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <ProviderMark provider={spec.id} title={spec.title} className="size-9" />
                {editing ? t("connections.form.editTitle") : spec.title}
              </DialogTitle>
              <DialogDescription>{text.description(spec)}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Label htmlFor="conn-name">{t("connections.form.name")}</Label>
              <Input
                id="conn-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={editing ? undefined : spec.title}
                aria-invalid={Boolean(fieldErrors.name)}
                disabled={busy}
              />
              {fieldErrors.name && <p className="text-[13px] text-destructive">{fieldErrors.name}</p>}
            </div>

            {spec.fields.map(renderField)}

            {spec.kinds.length > 0 && (
              <fieldset className="flex flex-col gap-2.5">
                <legend className="mb-2 text-sm font-medium">{t("connections.form.kinds")}</legend>
                <div className="flex flex-wrap gap-2">
                  {spec.kinds.map((k) => (
                    <label
                      key={k.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                        form.kinds.includes(k.id) ? "border-primary/40 bg-primary/5" : "border-border",
                      )}
                    >
                      <Checkbox checked={form.kinds.includes(k.id)} onCheckedChange={(on) => toggleKind(k.id, on === true)} disabled={busy} />
                      {text.kind(spec.id, k.id, k.title)}
                    </label>
                  ))}
                </div>
                {fieldErrors.kinds && <p className="text-[13px] text-destructive">{fieldErrors.kinds}</p>}
              </fieldset>
            )}

            {spec.pull && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="conn-schedule">{t("connections.form.schedule")}</Label>
                <Select value={form.schedule} onValueChange={(v) => setForm((f) => ({ ...f, schedule: v }))} disabled={busy}>
                  <SelectTrigger id="conn-schedule" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(SCHEDULES.includes(form.schedule) ? SCHEDULES : [...SCHEDULES, form.schedule]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {SCHEDULES.includes(value) ? t(`connections.form.scheduleOptions.${value}`) : t("connections.card.every", { minutes: value })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {spec.webhooks && !editing && <p className="text-[13px] leading-snug text-muted-foreground">{t("connections.form.webhookHint")}</p>}
              </div>
            )}

            {test && (
              <div
                role="status"
                className={cn(
                  "flex gap-3 rounded-2xl border p-4 text-sm",
                  test.ok ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5",
                )}
              >
                {test.ok ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="font-medium">{test.ok ? t("connections.form.testOk") : t("connections.form.testFailed")}</p>
                  <p className="mt-0.5 break-words text-muted-foreground">{test.message}</p>
                  {test.sample.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {test.sample.map((s, i) => (
                        <li key={i} className="max-w-full truncate rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground">
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter className="gap-2 sm:justify-between">
              {!editing && !fixedSpec && providers.length > 1 ? (
                <Button type="button" variant="ghost" onClick={() => reset(null)} disabled={busy}>
                  <ArrowLeft />
                  {t("connections.form.back")}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={runTest} disabled={busy}>
                  {testing && <Loader2 className="animate-spin" />}
                  {testing ? t("connections.form.testing") : t("connections.form.test")}
                </Button>
                <Button type="submit" disabled={busy}>
                  {saving && <Loader2 className="animate-spin" />}
                  {saving ? t("connections.form.saving") : editing ? t("connections.form.save") : t("connections.form.create")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
