"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CircleAlert, Clock, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { adminApi } from "@/lib/api"
import { useCopy } from "@/app/landing/_lib/copy"
import { AuthCard, AuthLayout } from "@/components/auth-layout"
import { PasswordInput } from "@/components/login-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface InviteInfo {
  valid: boolean
  org_name: string
  email?: string
  role: string
  expires_at: string
  created_by: string
  message?: string
}

function Notice({ icon: Icon, title, text, action }: { icon: typeof Clock; title: string; text: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="mt-4 font-semibold tracking-tight">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">{text}</p>
      <div className="mt-5">{action}</div>
    </div>
  )
}

export function InviteView() {
  const { t, locale } = useCopy()
  const router = useRouter()
  const token = useSearchParams().get("token")

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const result = await adminApi.getInviteInfo(token)
      if (result.status === "success" && result.response) setInvite(result.response)
    } catch {
      // An unreadable invite is shown as unavailable.
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    // Fetch on mount; load() updates state when the response arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const expired = invite ? new Date(invite.expires_at) < new Date() : false

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invite || !token) return
    const problem = !username.trim()
      ? t("auth.invite.errors.username")
      : !password
        ? t("auth.invite.errors.password")
        : password.length < 6
          ? t("auth.invite.errors.shortPassword")
          : password !== confirm
            ? t("auth.invite.errors.mismatch")
            : ""
    setError(problem)
    if (problem) return

    setSubmitting(true)
    try {
      const result = await adminApi.acceptInvite(token, { username: username.trim(), password })
      if (result.status === "success") {
        toast.success(t("auth.invite.created"))
        setTimeout(() => router.push("/login"), 1200)
      } else {
        setError(result.message || t("auth.invite.errors.failed"))
      }
    } catch {
      setError(t("auth.invite.errors.failed"))
    } finally {
      setSubmitting(false)
    }
  }

  const toLogin = (
    <Button asChild variant="outline">
      <Link href="/login">{t("auth.invite.toLogin")}</Link>
    </Button>
  )
  const roleKey = invite && ["owner", "admin"].includes(invite.role) ? invite.role : "user"
  const dateLocale = locale === "ru" ? "ru-RU" : "en-GB"

  let body: React.ReactNode
  if (loading) {
    body = (
      <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t("auth.invite.checking")}
      </p>
    )
  } else if (!invite || !invite.valid) {
    body = <Notice icon={CircleAlert} title={t("auth.invite.invalidTitle")} text={t("auth.invite.invalid")} action={toLogin} />
  } else if (expired) {
    body = <Notice icon={Clock} title={t("auth.invite.expiredTitle")} text={t("auth.invite.expired")} action={toLogin} />
  } else {
    const rows: [string, string][] = [
      [t("auth.invite.organization"), invite.org_name],
      ...(invite.email ? ([[t("auth.invite.email"), invite.email]] as [string, string][]) : []),
      [t("auth.invite.role"), t(`auth.invite.roles.${roleKey}`)],
      [t("auth.invite.expires"), new Date(invite.expires_at).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })],
      ...(invite.created_by ? ([[t("auth.invite.invitedBy"), invite.created_by]] as [string, string][]) : []),
    ]
    body = (
      <>
        <dl className="grid gap-2 rounded-xl bg-muted/60 p-4 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="truncate text-right font-medium">{value}</dd>
            </div>
          ))}
          {invite.message && <p className="mt-1 border-t border-border pt-2 text-muted-foreground">{invite.message}</p>}
        </dl>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">{t("auth.invite.username")}</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("auth.invite.usernamePlaceholder")}
              autoComplete="username"
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t("auth.invite.password")}</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              placeholder={t("auth.invite.passwordPlaceholder")}
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">{t("auth.invite.confirm")}</Label>
            <PasswordInput
              id="confirm"
              value={confirm}
              onChange={setConfirm}
              placeholder={t("auth.invite.confirmPlaceholder")}
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            {submitting ? t("auth.invite.submitting") : t("auth.invite.submit")}
          </Button>
        </form>
      </>
    )
  }

  return (
    <AuthLayout title={t("auth.invite.title")} subtitle={t("auth.invite.subtitle")}>
      <AuthCard>{body}</AuthCard>
    </AuthLayout>
  )
}
