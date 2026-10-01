"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Mail, MoreHorizontal, Shield, Trash2, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { adminApi, authApi } from "@/lib/api"
import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { PageBody, PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { ListPanel, ListSkeleton, ListToolbar } from "@/components/list-panel"
import { InviteDialog } from "@/components/team/invite-dialog"
import { RoleField, roleBadgeVariant, type Role } from "@/components/team/role-field"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Member {
  id: string
  username: string
  email?: string
  role: string
  status: string
}

const MIN_PASSWORD = 8

export default function UsersPage() {
  const { token, isAdmin, isLoading: authLoading, user: currentUser } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [isInviteOpen, setIsInviteOpen] = useState(false)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newRole, setNewRole] = useState<Role>("member")
  const [addError, setAddError] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const [roleTarget, setRoleTarget] = useState<Member | null>(null)
  const [nextRole, setNextRole] = useState<Role>("member")
  const [isSavingRole, setIsSavingRole] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isOwner = currentUser?.role === "owner"

  const fetchMembers = useCallback(async () => {
    if (!token) return
    try {
      const result = await authApi.listMembers(token)
      if (result.status === "success" && result.response) {
        setMembers(
          result.response.items.map((m) => ({ id: m.user_id, username: m.username, email: m.email, role: m.role, status: m.status })),
        )
      }
    } catch (error) {
      console.error("Failed to fetch members:", error)
      toast.error(t("team.users.loadFailed"))
    } finally {
      setIsLoading(false)
    }
  }, [token, t])

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/app")
  }, [authLoading, isAdmin, router])

  useEffect(() => {
    if (!isAdmin) return
    // Fetch-on-condition pattern; fetchMembers sets the list from the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMembers()
    const interval = setInterval(fetchMembers, 30000)
    return () => clearInterval(interval)
  }, [isAdmin, fetchMembers])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        t(`team.roles.${m.role}`).toLowerCase().includes(q),
    )
  }, [members, query, t])

  // Nobody edits themselves here, and only owners touch other owners.
  const canManage = (member: Member) => member.username !== currentUser?.username && (isOwner || member.role !== "owner")

  const closeAdd = () => {
    if (isAdding) return
    setIsAddOpen(false)
    setNewUsername("")
    setNewPassword("")
    setNewRole("member")
    setAddError("")
  }

  const addUser = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    const problem = !newUsername.trim()
      ? t("team.users.errors.username")
      : newPassword.length < MIN_PASSWORD
        ? t("team.users.errors.password")
        : ""
    setAddError(problem)
    if (problem) return
    setIsAdding(true)
    try {
      const result = await adminApi.createUser(token, { username: newUsername.trim(), password: newPassword, role: newRole })
      if (result.status !== "success") {
        setAddError(result.message || t("team.users.createFailed"))
        return
      }
      toast.success(t("team.users.created"))
      setIsAdding(false)
      setIsAddOpen(false)
      setNewUsername("")
      setNewPassword("")
      setNewRole("member")
      fetchMembers()
    } catch {
      setAddError(t("team.users.createFailed"))
    } finally {
      setIsAdding(false)
    }
  }

  const openRole = (member: Member) => {
    setRoleTarget(member)
    setNextRole((member.role as Role) || "member")
  }

  const saveRole = async () => {
    if (!token || !roleTarget) return
    setIsSavingRole(true)
    try {
      const result = await authApi.updateMemberRole(token, roleTarget.id, nextRole)
      if (result.status !== "success") throw new Error(result.message)
      toast.success(t("team.users.roleSaved"))
      setRoleTarget(null)
      fetchMembers()
    } catch (error) {
      console.error("Update role error:", error)
      toast.error(t("team.users.roleFailed"))
    } finally {
      setIsSavingRole(false)
    }
  }

  const confirmDelete = async () => {
    if (!token || !deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await adminApi.deleteUser(token, deleteTarget.id)
      if (result.status !== "success") throw new Error(result.message)
      toast.success(t("team.users.deleted"))
      setDeleteTarget(null)
      fetchMembers()
    } catch (error) {
      console.error("Delete user error:", error)
      toast.error(t("team.users.deleteFailed"))
    } finally {
      setIsDeleting(false)
    }
  }

  if (!authLoading && !isAdmin) return null

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t("navigation.users") }]} />
      <PageBody>
        <PageHeader
          title={t("team.users.title")}
          description={t("team.users.subtitle")}
          actions={
            <>
              <Button variant="outline" onClick={() => setIsAddOpen(true)}>
                <UserPlus />
                {t("team.users.add")}
              </Button>
              <Button onClick={() => setIsInviteOpen(true)}>
                <Mail />
                {t("team.users.invite")}
              </Button>
            </>
          }
        />

        <ListPanel>
          <ListToolbar query={query} onQueryChange={setQuery} placeholder={t("team.users.search")}>
            {!isLoading && (filtered.length === members.length ? members.length : `${filtered.length} / ${members.length}`)}
          </ListToolbar>
          {isLoading ? (
            <ListSkeleton />
          ) : members.length <= 1 && !query ? (
            <>
              <MemberList members={filtered} currentUsername={currentUser?.username} canManage={canManage} onRole={openRole} onDelete={setDeleteTarget} />
              <EmptyState
                icon={Users}
                title={t("team.users.emptyTitle")}
                description={t("team.users.emptyText")}
                action={
                  <Button onClick={() => setIsInviteOpen(true)}>
                    <Mail />
                    {t("team.users.invite")}
                  </Button>
                }
                className="m-4 sm:m-5"
              />
            </>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title={t("team.users.noMatch")} className="m-4 sm:m-5" />
          ) : (
            <MemberList members={filtered} currentUsername={currentUser?.username} canManage={canManage} onRole={openRole} onDelete={setDeleteTarget} />
          )}
        </ListPanel>
      </PageBody>

      <InviteDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} />

      <Dialog open={isAddOpen} onOpenChange={(open) => (open ? setIsAddOpen(true) : closeAdd())}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={addUser} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>{t("team.users.addTitle")}</DialogTitle>
              <DialogDescription>{t("team.users.addText")}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-username">{t("team.users.username")}</Label>
              <Input
                id="new-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={t("team.users.usernamePlaceholder")}
                autoComplete="off"
                disabled={isAdding}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">{t("team.users.password")}</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("team.users.passwordPlaceholder")}
                autoComplete="new-password"
                disabled={isAdding}
              />
            </div>
            <RoleField id="new-role" value={newRole} onChange={setNewRole} canAssignOwner={isOwner} disabled={isAdding} />
            {addError && (
              <p role="alert" className="text-sm text-destructive">
                {addError}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeAdd} disabled={isAdding}>
                {t("team.cancel")}
              </Button>
              <Button type="submit" disabled={isAdding}>
                {isAdding && <Loader2 className="animate-spin" />}
                {isAdding ? t("team.users.creating") : t("team.users.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={roleTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isSavingRole) setRoleTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("team.users.roleTitle")}</DialogTitle>
            <DialogDescription>{t("team.users.roleText", { name: roleTarget?.username ?? "" })}</DialogDescription>
          </DialogHeader>
          <RoleField id="edit-role" value={nextRole} onChange={setNextRole} canAssignOwner={isOwner} disabled={isSavingRole} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTarget(null)} disabled={isSavingRole}>
              {t("team.cancel")}
            </Button>
            <Button onClick={saveRole} disabled={isSavingRole || nextRole === roleTarget?.role}>
              {isSavingRole && <Loader2 className="animate-spin" />}
              {isSavingRole ? t("team.saving") : t("team.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("team.users.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("team.users.deleteText", { name: deleteTarget?.username ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("team.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="animate-spin" />}
              {t("team.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function MemberList({
  members,
  currentUsername,
  canManage,
  onRole,
  onDelete,
}: {
  members: Member[]
  currentUsername?: string
  canManage: (member: Member) => boolean
  onRole: (member: Member) => void
  onDelete: (member: Member) => void
}) {
  const { t } = useTranslation()
  return (
    <ul className="divide-y divide-border">
      {members.map((member) => (
        <li key={member.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold uppercase text-primary"
          >
            {member.username.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="truncate">{member.username}</span>
              {member.username === currentUsername && (
                <Badge variant="outline" className="shrink-0">
                  {t("team.you")}
                </Badge>
              )}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{member.email || t("team.users.noEmail")}</p>
          </div>
          {member.status && member.status !== "active" && (
            <Badge variant="outline" className="max-sm:hidden">
              {t("team.users.statusInactive")}
            </Badge>
          )}
          <Badge variant={roleBadgeVariant(member.role)}>
            {(member.role === "owner" || member.role === "admin") && <Shield />}
            {t(`team.roles.${member.role}`)}
          </Badge>
          {canManage(member) ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={member.username}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onRole(member)}>
                  <Shield />
                  {t("team.users.changeRole")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(member)}>
                  <Trash2 />
                  {t("team.users.remove")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="size-8 shrink-0" aria-hidden />
          )}
        </li>
      ))}
    </ul>
  )
}
