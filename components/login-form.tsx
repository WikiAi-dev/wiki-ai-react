"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { authApi } from "@/lib/api"
import { useCopy } from "@/app/landing/_lib/copy"
import { AuthCard, AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/** identity answers 403 "organization is not active" for pending or suspended organizations. */
function isInactiveOrganization(error?: string) {
  return !!error && /not active|pending approval/i.test(error)
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  autoComplete,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  autoComplete?: string
}) {
  const { t } = useCopy()
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        className="absolute inset-y-0 right-1 my-auto grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export function LoginForm() {
  const { t, get } = useCopy()
  const { login } = useAuth()
  const router = useRouter()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [signingIn, setSigningIn] = useState(false)

  const [orgName, setOrgName] = useState("")
  const [adminUsername, setAdminUsername] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [creating, setCreating] = useState(false)

  const signIn = async (name: string, secret: string) => {
    const result = await login(name, secret)
    if (result.success) {
      router.push("/app")
      return true
    }
    if (isInactiveOrganization(result.error)) {
      router.push(`/review-status?account=${encodeURIComponent(name)}`)
      return false
    }
    toast.error(t("auth.login.errors.failed"))
    return false
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      toast.error(t("auth.login.errors.fillLogin"))
      return
    }
    setSigningIn(true)
    const ok = await signIn(username.trim(), password)
    if (ok) toast.success(t("auth.login.success"))
    setSigningIn(false)
  }

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim() || !adminUsername.trim() || !adminPassword) {
      toast.error(t("auth.login.errors.fillAll"))
      return
    }
    if (adminPassword.length < 8) {
      toast.error(t("auth.login.errors.shortPassword"))
      return
    }
    setCreating(true)
    try {
      const result = await authApi.createOrganization({
        organization_name: orgName.trim(),
        admin_username: adminUsername.trim(),
        admin_password: adminPassword,
      })
      if (result.status !== "success") {
        toast.error(result.message || t("auth.login.errors.createFailed"))
        return
      }
      toast.success(t("auth.login.created"))
      // New organizations are active right away: sign the owner straight in.
      await signIn(adminUsername.trim(), adminPassword)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.login.errors.createFailed"))
    } finally {
      setCreating(false)
    }
  }

  return (
    <AuthLayout title={t("auth.login.title")} subtitle={t("auth.login.subtitle")} points={get<string[]>("auth.login.points")}>
      <AuthCard>
        <Tabs defaultValue="signin" className="gap-6">
          <TabsList className="w-full">
            <TabsTrigger value="signin">{t("auth.login.tabs.signIn")}</TabsTrigger>
            <TabsTrigger value="create">{t("auth.login.tabs.newOrg")}</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">{t("auth.login.username")}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("auth.login.usernamePlaceholder")}
                  autoComplete="username"
                  disabled={signingIn}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">{t("auth.login.password")}</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={setPassword}
                  placeholder={t("auth.login.passwordPlaceholder")}
                  autoComplete="current-password"
                  disabled={signingIn}
                />
              </div>
              <Button type="submit" size="lg" className="mt-2 w-full" disabled={signingIn}>
                {signingIn && <Loader2 className="animate-spin" />}
                {signingIn ? t("auth.login.submitting") : t("auth.login.submit")}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="create">
            <form onSubmit={handleCreateOrganization} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="org-name">{t("auth.login.orgName")}</Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder={t("auth.login.orgNamePlaceholder")}
                  autoComplete="organization"
                  disabled={creating}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-username">{t("auth.login.adminUsername")}</Label>
                <Input
                  id="admin-username"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder={t("auth.login.adminUsernamePlaceholder")}
                  autoComplete="username"
                  disabled={creating}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-password">{t("auth.login.adminPassword")}</Label>
                <PasswordInput
                  id="admin-password"
                  value={adminPassword}
                  onChange={setAdminPassword}
                  placeholder={t("auth.login.adminPasswordPlaceholder")}
                  autoComplete="new-password"
                  disabled={creating}
                />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{t("auth.login.newOrgHint")}</p>
              <Button type="submit" size="lg" className="w-full" disabled={creating}>
                {creating && <Loader2 className="animate-spin" />}
                {creating ? t("auth.login.creating") : t("auth.login.createSubmit")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </AuthCard>
    </AuthLayout>
  )
}
