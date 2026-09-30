"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiKeysApi } from "@/lib/api"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Key, Plus, Copy, Trash2, Loader2, Clock } from "lucide-react"
import { toast } from "sonner"
import { redirect } from "next/navigation"
import { useTranslation } from "@/src/i18n"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface ApiKey {
  id: string
  key_id: string
  name: string
  description?: string
  permissions: string[]
  created_at: string
  last_used: string
  is_active: boolean
  expires_at?: string
  created_by?: string
}

export default function ApiKeysPage() {
  const { token, isAdmin, isLoading: authLoading } = useAuth()
  const { t } = useTranslation()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyDescription, setNewKeyDescription] = useState("")
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(["search"])
  const [newKeyExpiresInDays, setNewKeyExpiresInDays] = useState("")
  const [newKey, setNewKey] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const fetchKeys = useCallback(async () => {
    if (!token) return

    try {
      const result = await apiKeysApi.list(token)
      if (result.status === "success" && result.response) {
        // Map backend response to frontend interface
        const mappedKeys = (result.response.keys || []).map((key: any) => {
          console.log("🔍 Mapping API key:", key)
          return {
            id: key.id,
            key_id: key.key_id,
            name: key.name,
            description: key.description,
            permissions: key.permissions || [],
            created_at: key.created_at,
            last_used: key.last_used || "",
            is_active: key.is_active !== false,
            expires_at: key.expires_at,
            created_by: key.created_by
          }
        })
        setApiKeys(mappedKeys)
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error)
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
      // Fetch-on-condition pattern; fetchKeys sets keys/loading state from
      // the async response.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchKeys()
    }
  }, [isAdmin, fetchKeys])

  const handleCreateKey = async () => {
    if (!token || !newKeyName.trim()) return

    setIsCreating(true)
    try {
      const requestData: any = {
        name: newKeyName.trim(),
        permissions: newKeyPermissions.length > 0 ? newKeyPermissions : ["search"]
      }

      if (newKeyDescription.trim()) {
        requestData.description = newKeyDescription.trim()
      }

      if (newKeyExpiresInDays.trim() && !isNaN(Number(newKeyExpiresInDays))) {
        requestData.expires_in_days = Number(newKeyExpiresInDays)
      }

      const result = await apiKeysApi.create(token, requestData)

      if (result.status === "success" && result.response) {
        setNewKey(result.response.key || result.response.full_key)
        toast.success(t('apiKeys.apiKeyCreatedSuccessfully') || 'API key created successfully')
        fetchKeys()
      } else {
        toast.error(result.message || t('apiKeys.failedToCreate') || 'Failed to create API key')
      }
    } catch (error) {
      console.error("Create key error:", error)
      toast.error(t('apiKeys.failedToCreate') || 'Failed to create API key')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteKey = async () => {
    if (!token || !deleteKeyId) {
      console.log("❌ Cannot delete - missing token or deleteKeyId:", { token: !!token, deleteKeyId })
      return
    }
    setIsDeleting(true)
    
    console.log("🗑️ Starting deletion for key:", deleteKeyId)
    
    try {
      const result = await apiKeysApi.delete(token, deleteKeyId)
      console.log("📤 API delete response:", result)
      
      if (result && (result.status === "success" || result.success)) {
        console.log("✅ Delete successful, calling fetchKeys()")
        toast.success(t('apiKeys.apiKeyDeletedSuccessfully') || 'API key deleted successfully')
        setDeleteKeyId(null)
        console.log("🔄 Calling fetchKeys() to refresh list...")
        setTimeout(() => fetchKeys(), 100)
      } else {
        console.log("❌ Delete failed:", result?.message || result)
        toast.error(result?.message || t('apiKeys.failedToDelete') || 'Failed to delete API key')
      }
    } catch (error) {
      console.error("❌ Delete key error:", error)
      toast.error(t('apiKeys.failedToDelete') || 'Failed to delete API key')
    } finally {
      setIsDeleting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t('apiKeys.copiedToClipboard') || 'Copied to clipboard')
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setNewKeyName("")
    setNewKeyDescription("")
    setNewKeyPermissions(["search"])
    setNewKeyExpiresInDays("")
    setNewKey(null)
  }

  if (authLoading || isLoading) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: t('nav.admin'), href: "/app/admin" }, { label: t('navigation.apiKeys') }]} />
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
      <AppHeader breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "API Keys" }]} />
      <main className="flex-1 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('apiKeys.apiKeys')}</h1>
            <p className="text-muted-foreground">{t('apiKeys.keysForAuthenticatingApiRequests')}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('apiKeys.createApiKey')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('apiKeys.createApiKey')}</DialogTitle>
                <DialogDescription>{t('apiKeys.createApiKeyToEnableProgrammaticAccess')}</DialogDescription>
              </DialogHeader>

              {newKey ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <p className="text-sm font-medium text-success mb-2">{t('apiKeys.apiKeyCreatedSuccessfully') || 'API key created successfully!'}</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {t('apiKeys.copyKeyNow') || 'Copy this key now. You won\'t be able to see it again.'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Input value={newKey} readOnly className="font-mono text-sm" />
                      <Button size="icon" variant="outline" onClick={() => copyToClipboard(newKey)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={closeDialog}>{t('actions.done') || 'Done'}</Button>
                  </DialogFooter>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="keyName">{t('apiKeys.keyName')}</Label>
                      <Input
                        id="keyName"
                        placeholder={t('apiKeys.keyNamePlaceholder')}
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('apiKeys.giveApiKeyDescriptiveName')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="keyDescription">{t('apiKeys.description')}</Label>
                      <textarea
                        id="keyDescription"
                        className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder={t('apiKeys.descriptionPlaceholder')}
                        value={newKeyDescription}
                        onChange={(e) => setNewKeyDescription(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('apiKeys.permissions')}</Label>
                      <div className="space-y-2">
                        {["search", "upload", "download", "delete_documents", "view_reports"].map((permission) => (
                          <div key={permission} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={permission}
                              checked={newKeyPermissions.includes(permission)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewKeyPermissions([...newKeyPermissions, permission])
                                } else {
                                  setNewKeyPermissions(newKeyPermissions.filter(p => p !== permission))
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor={permission} className="text-sm font-normal">
                              {permission.replace("_", " ").charAt(0).toUpperCase() + permission.replace("_", " ").slice(1)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expiresInDays">{t('apiKeys.expires')}</Label>
                      <Input
                        id="expiresInDays"
                        type="number"
                        placeholder={t('apiKeys.expiresPlaceholder')}
                        value={newKeyExpiresInDays}
                        onChange={(e) => setNewKeyExpiresInDays(e.target.value)}
                        min="1"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('apiKeys.leaveBlankForNoExpiration')}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={closeDialog}>{t('apiKeys.cancel')}</Button>
                    <Button onClick={handleCreateKey} disabled={!newKeyName.trim() || isCreating}>
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('apiKeys.creating')}
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          {t('apiKeys.createApiKey')}
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Key className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>{t('apiKeys.apiKeys')}</CardTitle>
                <CardDescription>{t('apiKeys.keysForAuthenticatingApiRequests')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {apiKeys.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('apiKeys.keyName')}</TableHead>
                    <TableHead>{t('apiKeys.permissions')}</TableHead>
                    <TableHead>{t('apiKeys.created')}</TableHead>
                    <TableHead>{t('apiKeys.createdBy')}</TableHead>
                    <TableHead>{t('apiKeys.lastUsed')}</TableHead>
                    <TableHead>{t('apiKeys.status')}</TableHead>
                    <TableHead className="w-[80px]">{t('apiKeys.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={`${key.key_id}-${key.id}`}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="flex items-center gap-2">
                            <Key className="w-4 h-4 text-muted-foreground" />
                            {key.name}
                          </div>
                          {key.description && (
                            <p className="text-xs text-muted-foreground mt-1">{key.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {key.permissions.map((permission) => (
                            <span
                              key={permission}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {permission.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(key.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {key.created_by || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {key.last_used ? new Date(key.last_used).toLocaleDateString() : t('apiKeys.never')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${key.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-sm">
                            {key.is_active ? t('apiKeys.active') : t('apiKeys.inactive')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            console.log("🗑️ Trash button clicked for key:", { key_id: key.key_id, id: key.id, key })
                            setDeleteKeyId(key.key_id || key.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Key className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">{t('apiKeys.noApiKeysYet')}</h3>
                <p className="text-muted-foreground mb-4">{t('apiKeys.createApiKeyToEnableProgrammaticAccess')}</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4" />
                  {t('apiKeys.createApiKey')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteKeyId} onOpenChange={(open) => {
          console.log("🔄 AlertDialog open state changed:", { open, deleteKeyId })
          if (!open) setDeleteKeyId(null)
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('apiKeys.deleteApiKey') || 'Delete API Key'}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('apiKeys.deleteConfirmation') || 'Are you sure you want to delete this API key? Any applications using this key will lose access.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>{t('apiKeys.cancel') || 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  onClick={handleDeleteKey}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('apiKeys.deleting') || 'Deleting...'}
                  </>
                ) : (
                  t('apiKeys.deleteKey') || 'Delete Key'
                  )}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  )
}
