"use client"

import { useState, type FormEvent } from "react"
import { Check, Copy, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { adminApi } from "@/lib/api"
import { getActualSiteUrl } from "@/lib/config"
import { useTranslation } from "@/src/i18n"
import { RoleField, type Role } from "@/components/team/role-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const VALID_FOR = ["1", "3", "7", "14", "30"]

/** A field with the invite link and a copy button. */
export function CopyField({ value, label, copiedText }: { value: string; label: string; copiedText: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(copiedText)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be blocked; the text stays selectable.
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-xl border border-border bg-muted/60 px-3.5 py-2.5 font-mono text-[13px] select-all">
          {value}
        </code>
        <Button variant="outline" size="icon-lg" onClick={copy} aria-label={t("team.copy")} className="shrink-0 rounded-full">
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
    </div>
  )
}

/** Creates an invite link and then shows it, ready to copy. */
export function InviteDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}) {
  const { t, locale } = useTranslation()
  const { token, user } = useAuth()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("member")
  const [days, setDays] = useState("7")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [created, setCreated] = useState<{ link: string; expiresAt: string } | null>(null)

  const handleOpenChange = (next: boolean) => {
    if (sending) return
    onOpenChange(next)
    if (!next) {
      setEmail("")
      setRole("member")
      setDays("7")
      setMessage("")
      setError("")
      setCreated(null)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSending(true)
    setError("")
    try {
      const result = await adminApi.createInvite(token, {
        email: email.trim() || undefined,
        role,
        expires_in_days: Number(days),
        message: message.trim() || undefined,
      })
      if (result.status !== "success" || !result.response) {
        setError(result.message || t("team.invites.failed"))
        return
      }
      // The backend builds its link from its own configured site URL; use the
      // address this app is actually served from instead.
      setCreated({ link: `${getActualSiteUrl()}/invite?token=${result.response.token}`, expiresAt: result.response.invite.expires_at })
      onCreated?.()
    } catch {
      setError(t("team.invites.failed"))
    } finally {
      setSending(false)
    }
  }

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long" })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("team.invites.readyTitle")}</DialogTitle>
              <DialogDescription>{t("team.invites.readyText", { date: formatDate(created.expiresAt) })}</DialogDescription>
            </DialogHeader>
            <CopyField value={created.link} label={t("team.invites.link")} copiedText={t("team.invites.linkCopied")} />
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>{t("team.done")}</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>{t("team.invites.dialogTitle")}</DialogTitle>
              <DialogDescription>{t("team.invites.dialogText")}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-email">{t("team.invites.email")}</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("team.invites.emailPlaceholder")}
                autoComplete="off"
                disabled={sending}
              />
              <p className="text-[13px] leading-snug text-muted-foreground">{t("team.invites.emailHint")}</p>
            </div>
            <RoleField id="invite-role" value={role} onChange={setRole} canAssignOwner={user?.role === "owner"} disabled={sending} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-days">{t("team.invites.validFor")}</Label>
              <Select value={days} onValueChange={setDays} disabled={sending}>
                <SelectTrigger id="invite-days" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALID_FOR.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`team.invites.days.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-message">{t("team.invites.message")}</Label>
              <Textarea
                id="invite-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("team.invites.messagePlaceholder")}
                rows={3}
                disabled={sending}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={sending}>
                {t("team.cancel")}
              </Button>
              <Button type="submit" disabled={sending}>
                {sending && <Loader2 className="animate-spin" />}
                {sending ? t("team.invites.sending") : t("team.invites.send")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
