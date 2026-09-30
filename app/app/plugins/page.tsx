"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { pluginsApi } from "@/lib/api"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShoppingCart, Key, Plus, Copy, Trash2, Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface PluginToken {
  id: string
  name: string
  created_at: string
}

export default function PluginsPage() {
  const { token } = useAuth()
  const [isEnabled, setIsEnabled] = useState(false)
  const [status, setStatus] = useState<string>("unknown")
  const [tokens, setTokens] = useState<PluginToken[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)
  const [newTokenName, setNewTokenName] = useState("")
  const [newToken, setNewToken] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTokenId, setDeleteTokenId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const fetchStatus = useCallback(async () => {
    if (!token) return

    try {
      const [statusRes, tokensRes] = await Promise.all([pluginsApi.status(token), pluginsApi.listTokens(token)])

      if (statusRes.status === "success" && statusRes.response) {
        setIsEnabled(statusRes.response.enabled)
        setStatus(statusRes.response.status)
      }

      if (tokensRes.status === "success" && tokensRes.response) {
        setTokens(tokensRes.response.tokens || [])
      }
    } catch (error) {
      console.error("Failed to fetch plugin status:", error)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    // Fetch-on-mount pattern; fetchStatus sets plugin/loading state from
    // the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatus()
  }, [fetchStatus])

  const handleToggle = async (enabled: boolean) => {
    if (!token) return

    setIsToggling(true)
    try {
      const result = enabled ? await pluginsApi.enable(token) : await pluginsApi.disable(token)

      if (result.status === "success") {
        setIsEnabled(enabled)
        toast.success(`OpenCart plugin ${enabled ? "enabled" : "disabled"}`)
        fetchStatus()
      } else {
        toast.error(result.message || "Failed to toggle plugin")
      }
    } catch (error) {
      console.error("Toggle error:", error)
      toast.error("Failed to toggle plugin")
    } finally {
      setIsToggling(false)
    }
  }

  const handleCreateToken = async () => {
    if (!token || !newTokenName.trim()) return

    setIsCreating(true)
    try {
      const result = await pluginsApi.createToken(token, newTokenName.trim())

      if (result.status === "success" && result.response) {
        setNewToken(result.response.token)
        toast.success("Token created successfully")
        fetchStatus()
      } else {
        toast.error(result.message || "Failed to create token")
      }
    } catch (error) {
      console.error("Create token error:", error)
      toast.error("Failed to create token")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteToken = async () => {
    if (!token || !deleteTokenId) return

    setIsDeleting(true)
    try {
      const result = await pluginsApi.deleteToken(token, deleteTokenId)

      if (result.status === "success") {
        toast.success("Token deleted successfully")
        setDeleteTokenId(null)
        fetchStatus()
      } else {
        toast.error(result.message || "Failed to delete token")
      }
    } catch (error) {
      console.error("Delete token error:", error)
      toast.error("Failed to delete token")
    } finally {
      setIsDeleting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setNewTokenName("")
    setNewToken(null)
  }

  if (isLoading) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: "OpenCart Plugins" }]} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </>
    )
  }

  return (
    <>
      <AppHeader breadcrumbs={[{ label: "OpenCart Plugins" }]} />
      <main className="flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">OpenCart Integration</h1>
          <p className="text-muted-foreground">Manage your OpenCart plugin and API tokens</p>
        </div>

        {/* Plugin Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>OpenCart Plugin</CardTitle>
                  <CardDescription>Enable semantic product search for your OpenCart store</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={isEnabled ? "default" : "secondary"} className="gap-1">
                  {isEnabled ? (
                    <>
                      <CheckCircle className="w-3 h-3" /> Active
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" /> Inactive
                    </>
                  )}
                </Badge>
                <Switch checked={isEnabled} onCheckedChange={handleToggle} disabled={isToggling} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="text-lg font-semibold capitalize">{status}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium text-muted-foreground">Active Tokens</p>
                <p className="text-lg font-semibold">{tokens.length}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium text-muted-foreground">Integration</p>
                <p className="text-lg font-semibold">OpenCart 3.x / 4.x</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button variant="outline" size="sm" onClick={fetchStatus}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
          </CardFooter>
        </Card>

        {/* API Tokens Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Key className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <CardTitle>API Tokens</CardTitle>
                  <CardDescription>Manage authentication tokens for your OpenCart stores</CardDescription>
                </div>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Token
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create API Token</DialogTitle>
                    <DialogDescription>Create a new token for OpenCart integration</DialogDescription>
                  </DialogHeader>

                  {newToken ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                        <p className="text-sm font-medium text-success mb-2">Token created successfully!</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Copy this token now. You {"won't"} be able to see it again.
                        </p>
                        <div className="flex items-center gap-2">
                          <Input value={newToken} readOnly className="font-mono text-sm" />
                          <Button size="icon" variant="outline" onClick={() => copyToClipboard(newToken)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={closeDialog}>Done</Button>
                      </DialogFooter>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="tokenName">Token Name</Label>
                          <Input
                            id="tokenName"
                            placeholder="e.g., Production Store"
                            value={newTokenName}
                            onChange={(e) => setNewTokenName(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Give your token a descriptive name to identify it later
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={closeDialog}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateToken} disabled={!newTokenName.trim() || isCreating}>
                          {isCreating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create Token"
                          )}
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {tokens.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTokenId(t.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="font-medium mb-1">No tokens yet</p>
                <p className="text-sm text-muted-foreground">Create a token to integrate with your OpenCart store</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Token Confirmation */}
        <AlertDialog open={!!deleteTokenId} onOpenChange={() => setDeleteTokenId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Token</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this token? Any stores using this token will lose access.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteToken}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Token"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  )
}
