"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { apiText, telephonyApi, type Trunk, type TrunkInput, type TrunkMode } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface FormState {
  name: string
  mode: TrunkMode
  host: string
  port: string
  transport: string
  username: string
  password: string
  allowedIPs: string
}

function initialState(trunk?: Trunk): FormState {
  return {
    name: trunk?.name ?? "",
    mode: trunk?.mode ?? "peer",
    host: trunk?.host ?? "",
    port: trunk?.port ? String(trunk.port) : "5060",
    transport: trunk?.transport ?? "udp",
    username: trunk?.username ?? "",
    password: "",
    allowedIPs: (trunk?.allowed_ips ?? []).join("\n"),
  }
}

function Field({ id, label, help, error, children }: { id: string; label: string; help?: string; error?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-[13px] text-destructive">{error}</p> : help ? <p className="text-[13px] text-muted-foreground">{help}</p> : null}
    </div>
  )
}

/**
 * Adds or edits a trunk: a PBX that sends calls from known addresses
 * (peer), or a SIP provider account voice-engine registers to. A saved
 * password is never shown; leaving the field empty keeps it.
 */
export function TrunkFormDialog({
  open,
  onOpenChange,
  trunk,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trunk?: Trunk
  onSaved: (trunk: Trunk) => void
}) {
  const { t, locale } = useTranslation()
  const { token } = useAuth()
  const editing = Boolean(trunk)
  const [form, setForm] = useState<FormState>(() => initialState(trunk))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const input = (): TrunkInput => {
    const ips = form.allowedIPs
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const body: TrunkInput = { name: form.name.trim(), mode: form.mode, host: form.host.trim() }
    if (form.mode === "peer") {
      body.allowed_ips = ips
    } else {
      body.port = Number(form.port) || 5060
      body.transport = form.transport
      body.username = form.username.trim()
      if (form.password) body.password = form.password
    }
    return body
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setErrors({})
    setError("")
    try {
      const result = editing && trunk ? await telephonyApi.updateTrunk(token, trunk.id, input()) : await telephonyApi.createTrunk(token, input())
      if (result.status === "success" && result.response) {
        toast.success(editing ? t("telephony.toast.saved") : t("telephony.trunks.toast.created"))
        onSaved(result.response)
        onOpenChange(false)
        return
      }
      // Field errors go next to their inputs; one for a field this form
      // doesn't show (or none at all) goes in the banner.
      const fields: Record<string, string> = {}
      for (const [k, v] of Object.entries(result.fields ?? {})) fields[k] = apiText(v, locale)
      const shown = form.mode === "peer" ? ["name", "allowed_ips", "host"] : ["name", "host", "port", "transport", "username", "password"]
      const hidden = Object.keys(fields).filter((k) => !shown.includes(k))
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
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{editing ? t("telephony.trunks.form.editTitle") : t("telephony.trunks.form.addTitle")}</DialogTitle>
            <DialogDescription>{t("telephony.trunks.form.description")}</DialogDescription>
          </DialogHeader>

          <Field id="trunk-name" label={t("telephony.trunks.form.name")} error={errors.name}>
            <Input
              id="trunk-name"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={t("telephony.trunks.form.namePlaceholder")}
              aria-invalid={Boolean(errors.name)}
              disabled={saving}
              required
            />
          </Field>

          <div className="grid gap-1.5">
            <Label>{t("telephony.trunks.form.mode")}</Label>
            <SegmentedControl
              value={form.mode}
              onChange={(mode) => set({ mode })}
              label={t("telephony.trunks.form.mode")}
              options={[
                { value: "peer", label: t("telephony.trunks.mode.peer") },
                { value: "register", label: t("telephony.trunks.mode.register") },
              ]}
              className="w-full"
            />
            <p className="text-[13px] text-muted-foreground">
              {form.mode === "peer" ? t("telephony.trunks.form.peerHelp") : t("telephony.trunks.form.registerHelp")}
            </p>
          </div>

          {form.mode === "peer" ? (
            <>
              <Field id="trunk-ips" label={t("telephony.trunks.form.allowedIPs")} help={t("telephony.trunks.form.allowedIPsHelp")} error={errors.allowed_ips}>
                <Textarea
                  id="trunk-ips"
                  value={form.allowedIPs}
                  onChange={(e) => set({ allowedIPs: e.target.value })}
                  placeholder={"192.168.0.10\n10.0.0.0/24"}
                  rows={3}
                  spellCheck={false}
                  className="font-mono text-[13px]"
                  aria-invalid={Boolean(errors.allowed_ips)}
                  disabled={saving}
                />
              </Field>
              <Field id="trunk-host" label={t("telephony.trunks.form.peerHost")} help={t("telephony.trunks.form.peerHostHelp")} error={errors.host}>
                <Input
                  id="trunk-host"
                  value={form.host}
                  onChange={(e) => set({ host: e.target.value })}
                  placeholder="pbx.example.by"
                  spellCheck={false}
                  aria-invalid={Boolean(errors.host)}
                  disabled={saving}
                />
              </Field>
            </>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_6rem_6.5rem] gap-3">
                <Field id="trunk-host" label={t("telephony.trunks.form.host")} error={errors.host}>
                  <Input
                    id="trunk-host"
                    value={form.host}
                    onChange={(e) => set({ host: e.target.value })}
                    placeholder="sip.provider.by"
                    spellCheck={false}
                    aria-invalid={Boolean(errors.host)}
                    disabled={saving}
                    required
                  />
                </Field>
                <Field id="trunk-port" label={t("telephony.trunks.form.port")} error={errors.port}>
                  <Input
                    id="trunk-port"
                    inputMode="numeric"
                    value={form.port}
                    onChange={(e) => set({ port: e.target.value.replace(/\D/g, "") })}
                    aria-invalid={Boolean(errors.port)}
                    disabled={saving}
                  />
                </Field>
                <Field id="trunk-transport" label={t("telephony.trunks.form.transport")} error={errors.transport}>
                  <Select value={form.transport} onValueChange={(transport) => set({ transport })} disabled={saving}>
                    <SelectTrigger id="trunk-transport" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="udp">UDP</SelectItem>
                      <SelectItem value="tcp">TCP</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="trunk-username" label={t("telephony.trunks.form.username")} error={errors.username}>
                  <Input
                    id="trunk-username"
                    value={form.username}
                    onChange={(e) => set({ username: e.target.value })}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(errors.username)}
                    disabled={saving}
                    required
                  />
                </Field>
                <Field id="trunk-password" label={t("telephony.trunks.form.password")} error={errors.password}>
                  <Input
                    id="trunk-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => set({ password: e.target.value })}
                    placeholder={trunk?.has_password ? t("telephony.trunks.form.passwordSaved") : ""}
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.password)}
                    disabled={saving}
                  />
                </Field>
              </div>
            </>
          )}

          {error && <p className="rounded-xl bg-destructive/5 px-3 py-2 text-[13px] text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("telephony.form.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {editing ? t("telephony.form.save") : t("telephony.trunks.form.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
