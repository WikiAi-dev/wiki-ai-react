"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { adminApi, authApi } from "@/lib/api"
import { getActualSiteUrl } from "@/lib/config"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogPortal,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Plus, Search, MoreVertical, Edit, Trash2, Loader2, Shield, User, Mail, Link, Copy } from "lucide-react"
import { toast } from "sonner"
import { redirect } from "next/navigation"
import { useTranslation } from "@/src/i18n"

interface UserAccount {
  id: string
  username: string
  email?: string
  role: string
  organization_id?: string
  created_at?: string
}

export default function UsersPage() {
  const { token, isAdmin, isLoading: authLoading, user: currentUser } = useAuth()
  const { t } = useTranslation()
  const [users, setUsers] = useState<UserAccount[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Create user state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newRole, setNewRole] = useState("member")
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  // Create invite state
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviteExpiresInDays, setInviteExpiresInDays] = useState(7)
  const [inviteMessage, setInviteMessage] = useState("")
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [inviteError, setInviteError] = useState("")
  const [createdInvite, setCreatedInvite] = useState<any>(null)

  // Edit user state
  const [editUser, setEditUser] = useState<UserAccount | null>(null)
  const [editRole, setEditRole] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Delete user state
  const [deleteTarget, setDeleteTarget] = useState<UserAccount | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!token) return

    try {
      const usersRes = await authApi.listMembers(token)

      if (usersRes.status === "success" && usersRes.response) {
        setUsers(
          usersRes.response.items.map((m) => ({
            id: m.user_id,
            username: m.username,
            email: m.email,
            role: m.role,
          }))
        )
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
      toast.error(t('users.failedToLoadData'))
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      redirect("/app")
    }
  }, [authLoading, isAdmin])

  useEffect(() => {
    if (isAdmin) {
      // Fetch-on-condition pattern; fetchData sets users/loading state
      // from the async response.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData()
    }
  }, [isAdmin, fetchData])

  // Add 30-second polling for real-time updates
  useEffect(() => {
    if (!isAdmin || !token) return

    const interval = setInterval(() => {
      fetchData()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [isAdmin, token, fetchData])

  // Derived directly from users/searchQuery during render instead of a
  // separate state+effect.
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    const q = searchQuery.toLowerCase()
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(q) ||
        (user.role && user.role.toLowerCase().includes(q)),
    )
  }, [searchQuery, users])

  const handleCreateUser = async () => {
    if (!token || !newUsername.trim() || !newPassword.trim()) {
      setCreateError(t('users.usernameAndPasswordAreRequired'))
      return
    }

    if (newPassword.length < 6) {
      setCreateError("Password must be at least 6 characters long")
      return
    }

    setIsCreating(true)
    setCreateError("")
    try {
      const result = await adminApi.createUser(token, {
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
      })

      if (result.status === "success") {
        toast.success(t('users.userCreatedSuccessfully'))
        setIsCreateOpen(false)
        setNewUsername("")
        setNewPassword("")
        setNewRole("member")
        setCreateError("")
        fetchData()
      } else {
        setCreateError(result.message || t('users.failedToCreateUser'))
        toast.error(result.message || "Failed to create user")
      }
    } catch (error) {
      console.error("Create user error:", error)
      setCreateError(t('users.networkErrorOccurred'))
      toast.error("Failed to create user")
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateInvite = async () => {
    if (!token) return

    setIsCreatingInvite(true)
    setInviteError("")
    try {
      const result = await adminApi.createInvite(token, {
        email: inviteEmail.trim() || undefined,
        role: inviteRole,
        expires_in_days: inviteExpiresInDays,
        message: inviteMessage.trim() || undefined,
      })

      if (result.status === "success" && result.response) {
        toast.success(t('users.inviteLinkCreatedSuccessfully'))
        // Use actual site URL instead of backend-generated localhost link
        const siteUrl = getActualSiteUrl()
        const inviteLink = `${siteUrl}/invite?token=${result.response.token}`
        setCreatedInvite({ ...result.response.invite, link: inviteLink })
        setIsInviteOpen(false)
        setInviteEmail("")
        setInviteRole("member")
        setInviteExpiresInDays(7)
        setInviteMessage("")
        setInviteError("")
      } else {
        setInviteError(result.message || t('users.failedToCreateInvite'))
        toast.error(result.message || "Failed to create invite")
      }
    } catch (error) {
      console.error("Create invite error:", error)
      setInviteError("Network error occurred")
      toast.error("Failed to create invite")
    } finally {
      setIsCreatingInvite(false)
    }
  }

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    toast.success("Invite link copied to clipboard")
  }

  const handleEditUser = (user: UserAccount) => {
    setEditUser(user)
    setEditRole(user.role)
  }

  const handleSaveUser = async () => {
    if (!token || !editUser) return

    setIsSaving(true)
    try {
      const result = await authApi.updateMemberRole(token, editUser.id, editRole)

      if (result.status === "success") {
        toast.success("User updated successfully")
        setEditUser(null)
        fetchData()
      } else {
        toast.error(result.message || "Failed to update user")
      }
    } catch (error) {
      console.error("Update user error:", error)
      toast.error("Failed to update user")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!token || !deleteTarget) return

    setIsDeleting(true)
    try {
      const result = await adminApi.deleteUser(token, deleteTarget.id)

      if (result.status === "success") {
        toast.success("User deleted successfully")
        setDeleteTarget(null)
        fetchData()
      } else {
        toast.error(result.message || "Failed to delete user")
      }
    } catch (error) {
      console.error("Delete user error:", error)
      toast.error("Failed to delete user")
    } finally {
      setIsDeleting(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: t('nav.admin'), href: "/app/admin" }, { label: t('userManagement.title') }]} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t('nav.admin'), href: "/app/admin" }, { label: t('userManagement.title') }]} />
      <main className="flex-1 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('userManagement.title')}</h1>
            <p className="text-muted-foreground">{t('userManagement.manageUserAccountsAndPermissions')}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('userManagement.addUser')}
            </Button>
            <Button variant="outline" onClick={() => setIsInviteOpen(true)}>
              <Mail className="w-4 h-4 mr-2" />
              {t('userManagement.createInvite')}
            </Button>
          </div>
        </div>

        {/* Create User Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">{t('userManagement.createNewUser')}</h2>
                    <p className="text-sm text-muted-foreground">{t('userManagement.addNewUserToTheSystem')}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
                    ×
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">{t('userManagement.username')}</Label>
                    <Input
                      id="username"
                      placeholder={t('userManagement.enterUsername')}
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('userManagement.password')}</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={t('userManagement.enterPasswordMin6Characters')}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">{t('userManagement.role')}</Label>
                    <Select value={newRole} onValueChange={setNewRole} disabled={isCreating}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('userManagement.selectRole')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {t('userManagement.roleOptions.user')}
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            {t('userManagement.roleOptions.admin')}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      {newRole === "admin" ? (
                        <>
                          <Shield className="w-3 h-3" />
                          {t('userManagement.fullSystemAccessAndUserManagement')}
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3" />
                          {t('userManagement.standardUserWithAssignedFilePermissions')}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {createError && (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {createError}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateUser} 
                    disabled={!newUsername.trim() || !newPassword.trim() || newPassword.length < 6 || isCreating}
                    className="flex-1"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create User"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('userManagement.searchUsers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary">{filteredUsers.length} {t('userManagement.users2')}</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('userManagement.users2')}
            </CardTitle>
            <CardDescription>{t('userManagement.allRegisteredUserAccounts')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('userManagement.username2')}</TableHead>
                  <TableHead>{t('userManagement.role2')}</TableHead>
                  <TableHead>{t('userManagement.organization')}</TableHead>
                  <TableHead>{t('userManagement.filesAccess')}</TableHead>
                  <TableHead>{t('userManagement.created')}</TableHead>
                  <TableHead className="w-[80px]">{t('userManagement.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.username}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {user.role === "admin" ? (
                          <Shield className="w-4 h-4 text-primary" />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                        {user.username}
                        {user.username === currentUser?.username && (
                          <Badge variant="outline" className="text-xs">
                            {t('userManagement.you')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"} className="capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.organization_id || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{(user.role === "admin") ? t('userManagement.all') : (user.allowed_files?.length || 0)} {t('userManagement.files')}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="w-4 h-4 mr-2" />
                            {t('actions.edit')}
                          </DropdownMenuItem>
                          {user.username !== currentUser?.username && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(user)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('actions.delete')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit User Modal */}
        {editUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">{t('userManagement.editUser')}: {editUser.username}</h2>
                    <p className="text-sm text-muted-foreground">{t('userManagement.updateUserRoleAndFilePermissions')}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditUser(null)}>
                    ×
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('userManagement.username2')}</Label>
                    <Input value={editUser.username} disabled className="bg-muted" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Role</Label>
                    <Select value={editRole} onValueChange={setEditRole} disabled={isSaving}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            User
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Admin
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      {editRole === "admin" ? (
                        <>
                          <Shield className="w-3 h-3" />
                          {t('users.adminRoleDescription')}
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3" />
                          {t('users.userRoleDescription')}
                        </>
                      )}
                    </div>
                  </div>
                  
                </div>
                
                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => setEditUser(null)} disabled={isSaving} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveUser} disabled={isSaving} className="flex-1">
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('actions.saving')}
                      </>
                    ) : (
                      t('actions.saveChanges')
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Invite Modal */}
        {isInviteOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">{t('userManagement.createInviteLink')}</h2>
                    <p className="text-sm text-muted-foreground">{t('userManagement.generateInvitationLinkForNewUsers')}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setIsInviteOpen(false)}>
                    ×
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">{t('userManagement.emailOptional')}</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={isCreatingInvite}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole} disabled={isCreatingInvite}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            User
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Admin
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      {inviteRole === "admin" ? (
                        <>
                          <Shield className="w-3 h-3" />
                          {t('users.adminRoleDescription')}
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3" />
                          {t('users.userRoleDescription')}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="invite-expires">{t('userManagement.expiresIn')}</Label>
                    <Select value={inviteExpiresInDays.toString()} onValueChange={(value) => setInviteExpiresInDays(Number(value))} disabled={isCreatingInvite}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('userManagement.selectExpiration')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">
                          <div className="flex items-center gap-2">
                            <span>🕐</span>
                            {t('userManagement.1day')}
                          </div>
                        </SelectItem>
                        <SelectItem value="3">
                          <div className="flex items-center gap-2">
                            <span>🕐</span>
                            {t('userManagement.3days')}
                          </div>
                        </SelectItem>
                        <SelectItem value="7">
                          <div className="flex items-center gap-2">
                            <span>🕐</span>
                            {t('userManagement.1week')}
                          </div>
                        </SelectItem>
                        <SelectItem value="14">
                          <div className="flex items-center gap-2">
                            <span>🕐</span>
                            {t('userManagement.2weeks')}
                          </div>
                        </SelectItem>
                        <SelectItem value="30">
                          <div className="flex items-center gap-2">
                            <span>🕐</span>
                            {t('userManagement.1month')}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="invite-message">Message (Optional)</Label>
                    <textarea
                      id="invite-message"
                      placeholder={t('userManagement.welcomeToOurPlatformWereExcitedToHaveYouJoinUs')}
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      disabled={isCreatingInvite}
                      className="w-full h-20 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </div>
                  
                  {inviteError && (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {inviteError}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)} disabled={isCreatingInvite} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateInvite} disabled={isCreatingInvite} className="flex-1">
                    {isCreatingInvite ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('actions.creating')}
                      </>
                    ) : (
                      t('userManagement.createInvite')
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Created Invite Success Modal */}
        {createdInvite && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-green-600">{t('userManagement.inviteCreated')}</h2>
                    <p className="text-sm text-muted-foreground">{t('userManagement.shareThisLinkWithYourInvitee')}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCreatedInvite(null)}>
                    ×
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Link className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('userManagement.inviteLink')}</span>
                    </div>
                    <div className="bg-background p-2 rounded border">
                      <code className="text-xs break-all">{createdInvite.link}</code>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(createdInvite.link)}
                      className="w-full"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('userManagement.role3')}:</span>
                      <div className="font-medium capitalize">{createdInvite.role}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('userManagement.expires2')}:</span>
                      <div className="font-medium">{new Date(createdInvite.expires_at).toLocaleDateString()}</div>
                    </div>
                    {createdInvite.email && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">{t('userManagement.email')}:</span>
                        <div className="font-medium">{createdInvite.email}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                <Button onClick={() => setCreatedInvite(null)} className="w-full">
                  {t('actions.done')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete User Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('userManagement.deleteUser2')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('userManagement.areYouSureYouWantToDelete')} &quot;{deleteTarget?.username}&quot;? {t('userManagement.thisActionCannotBeUndone')}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('actions.deleting')}
                  </>
                ) : (
                  t('userManagement.deleteUser2')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  )
}
