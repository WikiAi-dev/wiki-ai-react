"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Ban, Loader2, Mail, MailPlus } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { adminApi, authApi } from "@/lib/api"
import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { PageBody, PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { ListPanel, ListSkeleton, ListToolbar } from "@/components/list-panel"
import { InviteDialog } from "@/components/team/invite-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

interface Invite {
  id: string
  email?: string
  role: string
  expires_at: string
  created_at: string
  created_by: string
  used_at?: string
  revoked_at?: string
}

type InviteStatus = "active" | "used" | "revoked" | "expired"

const STATUS_ORDER: InviteStatus[] = ["active", "used", "expired", "revoked"]

const STATUS_VARIANT: Record<InviteStatus, "success" | "secondary" | "outline"> = {
  active: "success",
  used: "secondary",
  expired: "outline",
  revoked: "outline",
}

// go-core serializes unset time.Time fields as the Go zero value
// ("0001-01-01T00:00:00Z") rather than omitting them or sending null.
const isSet = (value?: string) => !!value && !value.startsWith("0001-01-01")

function statusOf(invite: Invite): InviteStatus {
  if (isSet(invite.revoked_at)) return "revoked"
  if (isSet(invite.used_at)) return "used"
  if (new Date(invite.expires_at) < new Date()) return "expired"
  return "active"
}

export default function InvitesPage() {
  const { token, isAdmin, isLoading: authLoading } = useAuth()
  const { t, locale } = useTranslation()
  const router = useRouter()
  const [invites, setInvites] = useState<Invite[]>([])
  const [usernames, setUsernames] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<Invite | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  const fetchInvites = useCallback(async () => {
    if (!token) return
    try {
      // Invites name their creator by user id; members map ids to names.
      const [invitesRes, membersRes] = await Promise.all([adminApi.listInvites(token), authApi.listMembers(token)])
      if (invitesRes.status === "success" && invitesRes.response) setInvites(invitesRes.response.items || [])
      if (membersRes.status === "success" && membersRes.response) {
        setUsernames(Object.fromEntries(membersRes.response.items.map((m) => [m.user_id, m.username])))
      }
    } catch (error) {
      console.error("Failed to fetch invites:", error)
      toast.error(t("team.invites.loadFailed"))
    } finally {
      setIsLoading(false)
    }
  }, [token, t])

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/app")
  }, [authLoading, isAdmin, router])

  useEffect(() => {
    // Fetch-on-condition pattern; fetchInvites sets the list from the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isAdmin) fetchInvites()
  }, [isAdmin, fetchInvites])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return invites
      .map((invite) => ({ invite, status: statusOf(invite) }))
      .filter(
        ({ invite }) =>
          !q || invite.email?.toLowerCase().includes(q) || t(`team.roles.${invite.role}`).toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
          new Date(b.invite.created_at).getTime() - new Date(a.invite.created_at).getTime(),
      )
  }, [invites, query, t])

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric" })

  const confirmRevoke = async () => {
    if (!token || !revokeTarget) return
    setIsRevoking(true)
    try {
      const result = await adminApi.revokeInvite(token, revokeTarget.id)
      if (result.status !== "success") throw new Error(result.message)
      toast.success(t("team.invites.revoked"))
      setRevokeTarget(null)
      fetchInvites()
    } catch (error) {
      console.error("Revoke invite error:", error)
      toast.error(t("team.invites.revokeFailed"))
    } finally {
      setIsRevoking(false)
    }
  }

  if (!authLoading && !isAdmin) return null

  const activeCount = rows.filter((row) => row.status === "active").length

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t("navigation.invites") }]} />
      <PageBody>
        <PageHeader
          title={t("team.invites.title")}
          description={t("team.invites.subtitle")}
          actions={
            <Button onClick={() => setIsCreateOpen(true)}>
              <MailPlus />
              {t("team.invites.create")}
            </Button>
          }
        />

        <ListPanel>
          <ListToolbar query={query} onQueryChange={setQuery} placeholder={t("team.invites.search")}>
            {!isLoading && invites.length > 0 && (
              <Badge variant="success">
                {t("team.invites.status.active")}: {activeCount}
              </Badge>
            )}
          </ListToolbar>
          {isLoading ? (
            <ListSkeleton />
          ) : invites.length === 0 ? (
            <EmptyState
              icon={Mail}
              title={t("team.invites.emptyTitle")}
              description={t("team.invites.emptyText")}
              action={
                <Button onClick={() => setIsCreateOpen(true)}>
                  <MailPlus />
                  {t("team.invites.create")}
                </Button>
              }
              className="m-4 sm:m-5"
            />
          ) : rows.length === 0 ? (
            <EmptyState icon={Mail} title={t("team.invites.noMatch")} className="m-4 sm:m-5" />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map(({ invite, status }) => {
                const when =
                  status === "used"
                    ? t("team.invites.usedAt", { date: formatDate(invite.used_at!) })
                    : status === "expired"
                      ? t("team.invites.expired", { date: formatDate(invite.expires_at) })
                      : status === "active"
                        ? t("team.invites.expires", { date: formatDate(invite.expires_at) })
                        : null
                const creator = usernames[invite.created_by]
                const meta = [t(`team.roles.${invite.role}`), when, creator ? t("team.invites.createdBy", { name: creator }) : null]
                return (
                  <li key={invite.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                      <Mail className="size-4" strokeWidth={1.75} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{invite.email || t("team.invites.noEmail")}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta.filter(Boolean).join(" · ")}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[status]}>{t(`team.invites.status.${status}`)}</Badge>
                    {status === "active" ? (
                      <Button variant="ghost" size="sm" onClick={() => setRevokeTarget(invite)} className="max-sm:px-2">
                        <Ban />
                        <span className="max-sm:sr-only">{t("team.invites.revoke")}</span>
                      </Button>
                    ) : (
                      <span className="w-[5.5rem] shrink-0 max-sm:w-9" aria-hidden />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </ListPanel>
      </PageBody>

      <InviteDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreated={fetchInvites} />

      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isRevoking) setRevokeTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("team.invites.revokeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("team.invites.revokeText")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>{t("team.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmRevoke()
              }}
              disabled={isRevoking}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isRevoking && <Loader2 className="animate-spin" />}
              {t("team.invites.revoke")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
