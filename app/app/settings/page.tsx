"use client"

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Building2, LogOut, Monitor, Moon, Shield, Sun } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authApi } from "@/lib/api"
import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { PageBody, PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Skeleton } from "@/components/ui/skeleton"

type Theme = "light" | "dark" | "system"
type Locale = "ru" | "en"

const PERMISSION_ORDER = ["search", "generate_ai_response", "download", "upload", "delete_documents", "manage_api_keys", "admin"]

const subscribeNoop = () => () => {}

/** A titled panel of settings rows. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <h2 className="border-b border-border px-5 py-3.5 text-sm font-semibold tracking-tight">{title}</h2>
      <div className="divide-y divide-border">{children}</div>
    </section>
  )
}

/** One setting: what it is on the left, the control on the right. */
function Row({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {text && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground text-pretty">{text}</p>}
      </div>
      <div className="w-full shrink-0 sm:w-auto">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const { user, token, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { t, locale, changeLanguage } = useTranslation()
  const router = useRouter()
  const [permissions, setPermissions] = useState<string[] | null>(user?.permissions ?? null)
  // The theme is only known on the client; render no selection until then.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    authApi
      .me(token)
      .then((result) => {
        if (!cancelled && result.status === "success") setPermissions(result.response?.permissions ?? [])
      })
      .catch(() => {
        if (!cancelled) setPermissions([])
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const roleKey = !user?.role || user.role === "user" ? "member" : user.role
  const isAdminRole = roleKey === "owner" || roleKey === "admin"
  const sortedPermissions = [...(permissions ?? [])].sort((a, b) => {
    const rank = (p: string) => (PERMISSION_ORDER.includes(p) ? PERMISSION_ORDER.indexOf(p) : PERMISSION_ORDER.length)
    return rank(a) - rank(b)
  })
  const permissionLabel = (permission: string) => {
    const key = `team.keys.perms.${permission}`
    const label = t(key)
    return label === key ? permission : label
  }

  const signOut = () => {
    logout()
    router.push("/login")
  }

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t("settings.title") }]} />
      <PageBody className="max-w-3xl">
        <PageHeader title={t("settings.title")} description={t("settings.subtitle")} />

        <Section title={t("settings.profile")}>
          <div className="flex items-center gap-4 px-5 py-5">
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-lg font-semibold uppercase text-primary"
            >
              {user?.username?.charAt(0) || "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight text-foreground">{user?.username}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <Badge variant={isAdminRole ? "default" : "secondary"}>
                  {isAdminRole && <Shield />}
                  {t(`team.roles.${roleKey}`)}
                </Badge>
                {user?.organization && (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Building2 className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                    <span className="truncate">{user.organization}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm font-medium text-foreground">{t("settings.permissions")}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {permissions === null
                ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-5 w-28 rounded-full" />)
                : sortedPermissions.map((permission) => (
                    <Badge key={permission} variant="secondary">
                      {permissionLabel(permission)}
                    </Badge>
                  ))}
            </div>
          </div>
        </Section>

        <Section title={t("settings.appearance")}>
          <Row title={t("settings.theme")} text={t("settings.themeText")}>
            <SegmentedControl<Theme>
              className="w-full sm:w-auto"
              label={t("settings.theme")}
              value={mounted ? ((theme as Theme | undefined) ?? "system") : undefined}
              onChange={setTheme}
              options={[
                { value: "light", label: t("settings.themes.light"), icon: <Sun /> },
                { value: "dark", label: t("settings.themes.dark"), icon: <Moon /> },
                { value: "system", label: t("settings.themes.system"), icon: <Monitor /> },
              ]}
            />
          </Row>
          <Row title={t("settings.language")} text={t("settings.languageText")}>
            <SegmentedControl<Locale>
              className="w-full sm:w-auto"
              label={t("settings.language")}
              value={mounted ? (locale as Locale) : undefined}
              onChange={changeLanguage}
              options={[
                { value: "ru", label: "Русский" },
                { value: "en", label: "English" },
              ]}
            />
          </Row>
        </Section>

        <Section title={t("settings.session")}>
          <Row title={t("settings.signOut")} text={t("settings.signOutText")}>
            <Button variant="outline" onClick={signOut}>
              <LogOut />
              {t("settings.signOut")}
            </Button>
          </Row>
        </Section>
      </PageBody>
    </>
  )
}
