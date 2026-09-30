"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiKeysApi } from "@/lib/api"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  Key, Plus, Copy, Trash2, Loader2, Clock, AlertCircle, TrendingUp, 
  Settings, FileText, BarChart3, Zap, DollarSign 
} from "lucide-react"
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
import { Badge } from "@/components/ui/badge"

interface ApiKeyDetails {
  id: string
  key_id: string
  name: string
  description?: string
  permissions: string[]
  created_at: string
  last_used?: string
  is_active: boolean
  expires_at?: string
  created_by?: string
  status?: string
  priority_tier?: string
  rate_limit_requests?: number
  current_usage?: number
  llm_enabled?: boolean
  max_tokens_per_day?: number
  current_llm_tokens_used?: number
}

interface UsageStats {
  total_requests: number
  avg_response_time_ms: number
  error_count: number
  total_llm_tokens: number
  total_request_bytes: number
  total_response_bytes: number
  period_days: number
}

interface AuditEvent {
  id: number
  event_type: string
  changes?: Record<string, any>
  changed_by?: string
  timestamp: string
  reason?: string
}

export default function ApiKeysPage() {
  const { token, isAdmin, isLoading: authLoading } = useAuth()
  const { t } = useTranslation()
  
  // State for key list
  const [apiKeys, setApiKeys] = useState<ApiKeyDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // State for creation
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyDescription, setNewKeyDescription] = useState("")
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(["search"])
  const [newKeyExpiresInDays, setNewKeyExpiresInDays] = useState("")
  // const [newKeyPriorityTier, setNewKeyPriorityTier] = useState<"free" | "pro" | "business" | "enterprise">("pro")  // Commented out - tier support coming soon
  const [newKeyRateLimit, setNewKeyRateLimit] = useState("10000")
  const [newKeyLLMEnabled, setNewKeyLLMEnabled] = useState(true)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [keyCountdown, setKeyCountdown] = useState<number>(0)
  const [isCreating, setIsCreating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // State for details/editing
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null)
  const [selectedKeyDetails, setSelectedKeyDetails] = useState<ApiKeyDetails | null>(null)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([])
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  
  // State for full edit mode
  const [isEditMode, setIsEditMode] = useState(false)
  const [editData, setEditData] = useState<any>({})
  
  // State for permissions editing
  const [editingPermissions, setEditingPermissions] = useState<string[]>([])
  const [isEditingPermissions, setIsEditingPermissions] = useState(false)
  const [availablePermissions, setAvailablePermissions] = useState<Record<string, string>>({})
  
  // State for deletion
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // State for updates
  const [isUpdating, setIsUpdating] = useState(false)

  // Commented out - tier support coming soon
  // const tierDefaults = useMemo(() => ({
  //   free: { rate_limit: 1000, llm_tokens: 5000, llm_cost: 10 },
  //   pro: { rate_limit: 50000, llm_tokens: 500000, llm_cost: 500 },
  //   business: { rate_limit: 500000, llm_tokens: 5000000, llm_cost: 5000 },
  //   enterprise: { rate_limit: 1000000, llm_tokens: 10000000, llm_cost: 50000 },
  // }), [])

  const fetchKeys = useCallback(async () => {
    if (!token) return
    try {
      const result = await apiKeysApi.list(token)
      if (result.status === "success" && result.response) {
        setApiKeys(result.response.keys || [])
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error)
      toast.error("Failed to fetch API keys")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  const fetchKeyDetails = useCallback(async (keyId: string) => {
    if (!token) return
    setIsLoadingDetails(true)
    try {
      const [detailsResult, statsResult, auditResult] = await Promise.all([
        apiKeysApi.get(token, keyId),
        apiKeysApi.getUsageStats(token, keyId, 7),
        apiKeysApi.getAuditLog(token, keyId, 20),
      ])

      if (detailsResult.status === "success" && detailsResult.response) {
        setSelectedKeyDetails(detailsResult.response as ApiKeyDetails)
      }
      if (statsResult.status === "success" && statsResult.response) {
        setUsageStats(statsResult.response)
      }
      if (auditResult.status === "success" && auditResult.response) {
        setAuditLog(auditResult.response.events || [])
      }
    } catch (error) {
      console.error("Failed to fetch key details:", error)
      toast.error("Failed to fetch key details")
    } finally {
      setIsLoadingDetails(false)
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
      // the async response. Without this, isLoading never leaves its
      // initial `true` and the page shows a permanent spinner — fetchKeys
      // was previously only ever called after a create/delete action, never
      // on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchKeys()
    }
  }, [isAdmin, fetchKeys])

  useEffect(() => {
    if (isAdmin && selectedKeyId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchKeyDetails(selectedKeyId)
    }
  }, [isAdmin, selectedKeyId, fetchKeyDetails])

  // Countdown timer for API key display
  useEffect(() => {
    if (keyCountdown <= 0) return

    const timer = setInterval(() => {
      setKeyCountdown((prev) => {
        if (prev <= 1) {
          closeDialog()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [keyCountdown])

  // Commented out - tier support coming soon
  // const handleTierChange = (tier: "free" | "pro" | "business" | "enterprise") => {
  //   setNewKeyPriorityTier(tier)
  //   const defaults = tierDefaults[tier]
  //   setNewKeyRateLimit(defaults.rate_limit.toString())
  // }

  const handleCreateKey = async () => {
    if (!token || !newKeyName.trim()) return

    setIsCreating(true)
    try {
      const requestData: any = {
        name: newKeyName.trim(),
        permissions: newKeyPermissions.length > 0 ? newKeyPermissions : ["search"],
        // priority_tier: newKeyPriorityTier,  // Commented out - tier support coming soon
        rate_limit_requests: parseInt(newKeyRateLimit),
        llm_enabled: newKeyLLMEnabled,
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
        setKeyCountdown(15)  // Start 15-second countdown
        toast.success("API key created successfully")
        setTimeout(() => {
          fetchKeys()
        }, 1000)
      } else {
        toast.error(result.message || "Failed to create API key")
      }
    } catch (error) {
      console.error("Create key error:", error)
      toast.error("Failed to create API key")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteKey = async () => {
    if (!token || !deleteKeyId) return
    setIsDeleting(true)
    
    try {
      const result = await apiKeysApi.delete(token, deleteKeyId)
      
      if (result && (result.status === "success" || result.success)) {
        toast.success("API key deleted successfully")
        setDeleteKeyId(null)
        setSelectedKeyId(null)
        fetchKeys()
      } else {
        toast.error(result?.message || "Failed to delete API key")
      }
    } catch (error) {
      console.error("Delete key error:", error)
      toast.error("Failed to delete API key")
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
    setNewKeyName("")
    setNewKeyDescription("")
    setNewKeyPermissions(["search"])
    setNewKeyExpiresInDays("")
    // setNewKeyPriorityTier("pro")  // Commented out - tier support coming soon
    setNewKeyRateLimit("50000")
    setNewKeyLLMEnabled(true)
    setNewKey(null)
  }

  const handleEditPermissions = (keyId: string) => {
    if (!selectedKeyDetails) return
    setEditingPermissions([...selectedKeyDetails.permissions])
    setIsEditingPermissions(true)
  }

  const handleSavePermissions = async () => {
    if (!token || !selectedKeyId || !selectedKeyDetails) return
    setIsUpdating(true)
    
    try {
      const result = await apiKeysApi.update(token, selectedKeyId, {
        permissions: editingPermissions,
      })
      
      if (result.status === "success") {
        toast.success("Permissions updated successfully")
        setIsEditingPermissions(false)
        setSelectedKeyDetails({
          ...selectedKeyDetails,
          permissions: editingPermissions,
        })
      } else {
        toast.error(result.message || "Failed to update permissions")
      }
    } catch (error) {
      console.error("Update permissions error:", error)
      toast.error("Failed to update permissions")
    } finally {
      setIsUpdating(false)
    }
  }

  const togglePermission = (permission: string) => {
    setEditingPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    )
  }

  const handleEditMode = () => {
    if (!selectedKeyDetails) return
    setEditData({
      name: selectedKeyDetails.name || "",
      description: selectedKeyDetails.description || "",
      rate_limit_requests: selectedKeyDetails.rate_limit_requests || 0,
      rate_limit_period: selectedKeyDetails.rate_limit_period || "minute",
      expires_at: selectedKeyDetails.expires_at || "",
      llm_enabled: selectedKeyDetails.llm_enabled || false,
      max_tokens_per_day: selectedKeyDetails.max_tokens_per_day || 0,
      llm_cost_limit: selectedKeyDetails.llm_cost_limit || 0,
      // priority_tier: selectedKeyDetails.priority_tier || "standard",  // Commented out - tier support coming soon
    })
    setIsEditMode(true)
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setEditData({})
  }

  const handleSaveEdit = async () => {
    if (!token || !selectedKeyId || !selectedKeyDetails) return
    setIsUpdating(true)
    
    try {
      const result = await apiKeysApi.update(token, selectedKeyId, editData)
      
      if (result.status === "success") {
        toast.success("API key updated successfully")
        setIsEditMode(false)
        setSelectedKeyDetails({
          ...selectedKeyDetails,
          ...editData,
        })
      } else {
        toast.error(result.message || "Failed to update API key")
      }
    } catch (error) {
      console.error("Update key error:", error)
      toast.error("Failed to update API key")
    } finally {
      setIsUpdating(false)
    }
  }

  const getUsagePercent = (current: number = 0, limit: number = 1) => {
    return Math.min(100, Math.round((current / limit) * 100))
  }

  const getStatusBadge = (status?: string, isActive?: boolean) => {
    if (status === "revoked" || !isActive) {
      return <Badge variant="destructive">Revoked</Badge>
    }
    if (status === "expired") {
      return <Badge variant="secondary">Expired</Badge>
    }
    return <Badge className="bg-green-500">Active</Badge>
  }

  if (authLoading || isLoading) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "API Keys" }]} />
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
            <h1 className="text-2xl font-bold tracking-tight">API Keys Management</h1>
            <p className="text-muted-foreground">Create and manage API keys with advanced features</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>Configure a new API key for programmatic access</DialogDescription>
              </DialogHeader>

              {newKey ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-sm font-medium text-green-900 mb-2">✓ API Key Created Successfully</p>
                    <p className="text-xs text-green-800 mb-3">
                      Copy this key now. You won&apos;t be able to see it again.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input value={newKey} readOnly className="font-mono text-xs" />
                      <Button size="icon" variant="outline" onClick={() => copyToClipboard(newKey)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      Auto-closing in <span className="font-bold text-primary">{keyCountdown}</span>s
                    </p>
                    <div className="w-full bg-background rounded-full h-1 mt-2">
                      <div 
                        className="bg-primary h-1 rounded-full transition-all" 
                        style={{ width: `${(keyCountdown / 15) * 100}%` }}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={closeDialog}>Done</Button>
                  </DialogFooter>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <div className="space-y-2">
                      <Label htmlFor="keyName" className="text-sm font-medium">Key Name *</Label>
                      <Input
                        id="keyName"
                        placeholder="e.g., Production API, Mobile App"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="keyDescription" className="text-sm font-medium">Description</Label>
                      <textarea
                        id="keyDescription"
                        className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Optional: describe what this key is for"
                        value={newKeyDescription}
                        onChange={(e) => setNewKeyDescription(e.target.value)}
                      />
                    </div>
                    {/* Tier selection commented out - coming soon */}
                    {/* <div className="space-y-2">
                      <Label className="text-sm font-medium">Tier</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["free", "pro", "business", "enterprise"] as const).map((tier) => (
                          <button
                            key={tier}
                            onClick={() => handleTierChange(tier)}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              newKeyPriorityTier === tier
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {tier.charAt(0).toUpperCase() + tier.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div> */}

                    {/* Permissions */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Permissions</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                        {["search", "upload", "download", "delete_documents", "view_reports", "generate_ai_response"].map((permission) => (
                          <label key={permission} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={newKeyPermissions.includes(permission)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewKeyPermissions([...newKeyPermissions, permission])
                                } else {
                                  setNewKeyPermissions(newKeyPermissions.filter(p => p !== permission))
                                }
                              }}
                              className="rounded w-4 h-4"
                            />
                            <span>{permission.replace("_", " ")}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Expiration */}
                    <div className="space-y-2">
                      <Label htmlFor="expiresInDays" className="text-sm font-medium">Expires In (days)</Label>
                      <Input
                        id="expiresInDays"
                        type="number"
                        placeholder="Leave blank for no expiration"
                        value={newKeyExpiresInDays}
                        onChange={(e) => setNewKeyExpiresInDays(e.target.value)}
                        min="1"
                      />
                    </div>

                    {/* LLM Toggle */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Enable AI Features
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newKeyLLMEnabled}
                          onChange={(e) => setNewKeyLLMEnabled(e.target.checked)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-muted-foreground">Allow this key to use AI features</span>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                    <Button onClick={handleCreateKey} disabled={!newKeyName.trim() || isCreating}>
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Key
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Keys List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Keys ({apiKeys.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {apiKeys.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {apiKeys.map((key) => (
                    <button
                      key={key.key_id}
                      onClick={() => setSelectedKeyId(key.key_id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                        selectedKeyId === key.key_id
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{key.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{key.key_id.slice(0, 8)}...</p>
                        </div>
                        {getStatusBadge(key.status, key.is_active)}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Key className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No API keys yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details View */}
          {selectedKeyId && selectedKeyDetails ? (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedKeyDetails.name}</CardTitle>
                    <CardDescription>{selectedKeyDetails.description}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteKeyId(selectedKeyDetails.key_id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                    <TabsTrigger value="quota" className="text-xs">Quota</TabsTrigger>
                    <TabsTrigger value="llm" className="text-xs">AI</TabsTrigger>
                    <TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-4">
                    {!isEditMode ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-medium">Key Details</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleEditMode}
                          >
                            Edit
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Status</p>
                            <p className="text-sm font-medium">{getStatusBadge(selectedKeyDetails.status, selectedKeyDetails.is_active)}</p>
                          </div>
                          {/* Tier display commented out - coming soon */}
                          {/* <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Tier</p>
                            <p className="text-sm font-medium">{selectedKeyDetails.priority_tier || "Standard"}</p>
                          </div> */}
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="text-sm">{new Date(selectedKeyDetails.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Last Used</p>
                            <p className="text-sm">{selectedKeyDetails.last_used ? new Date(selectedKeyDetails.last_used).toLocaleDateString() : "Never"}</p>
                          </div>
                        </div>

                        {selectedKeyDetails.expires_at && (
                          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                            <p className="text-xs text-yellow-900">
                              Expires: {new Date(selectedKeyDetails.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                        )}

                        <div className="pt-4 border-t">
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Name</p>
                              <p className="text-sm font-medium">{selectedKeyDetails.name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Description</p>
                              <p className="text-sm">{selectedKeyDetails.description || "No description"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Rate Limit (Requests)</p>
                                <p className="text-sm font-medium">{selectedKeyDetails.rate_limit_requests}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Rate Limit (Period)</p>
                                <p className="text-sm font-medium capitalize">{selectedKeyDetails.rate_limit_period || "minute"}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">AI Enabled</p>
                                <p className="text-sm font-medium">{selectedKeyDetails.llm_enabled ? "Yes" : "No"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Max Tokens/Day</p>
                                <p className="text-sm font-medium">{selectedKeyDetails.max_tokens_per_day || 0}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">AI Cost Limit</p>
                              <p className="text-sm font-medium">${selectedKeyDetails.llm_cost_limit || 0}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Permissions</p>
                            {!isEditingPermissions && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditPermissions(selectedKeyDetails.key_id)}
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                          
                          {!isEditingPermissions ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedKeyDetails.permissions.map((p) => (
                                <Badge key={p} variant="secondary" className="text-xs">{p.replace("_", " ")}</Badge>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-3 p-3 rounded-lg border bg-muted/50">
                              <div className="grid grid-cols-2 gap-2">
                                {Object.keys({
                                  search: "Search",
                                  upload: "Upload",
                                  download: "Download",
                                  delete_documents: "Delete",
                                  parse_users: "View Users",
                                  edit_users: "Edit Users",
                                  view_reports: "Reports",
                                  generate_ai_response: "AI Response",
                                  use_advanced_llm: "Advanced AI",
                                  moderate_content: "Moderation",
                                  export_data: "Export",
                                  admin: "Admin"
                                }).map((perm) => (
                                  <label key={perm} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editingPermissions.includes(perm)}
                                      onChange={() => togglePermission(perm)}
                                      className="w-4 h-4"
                                    />
                                    <span className="text-sm">{perm.replace("_", " ")}</span>
                                  </label>
                                ))}
                              </div>
                              <div className="flex gap-2 pt-2 border-t">
                                <Button
                                  size="sm"
                                  onClick={handleSavePermissions}
                                  disabled={isUpdating}
                                >
                                  {isUpdating ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setIsEditingPermissions(false)}
                                  disabled={isUpdating}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-medium">Edit Details</h4>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">Name</label>
                            <Input
                              value={editData.name}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              placeholder="Key name"
                              className="text-sm"
                            />
                          </div>

                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">Description</label>
                            <Input
                              value={editData.description}
                              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                              placeholder="Optional description"
                              className="text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">Rate Limit (Requests)</label>
                              <Input
                                type="number"
                                value={editData.rate_limit_requests}
                                onChange={(e) => setEditData({ ...editData, rate_limit_requests: parseInt(e.target.value) || 0 })}
                                placeholder="10000"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">Rate Limit (Period)</label>
                              <select
                                value={editData.rate_limit_period}
                                onChange={(e) => setEditData({ ...editData, rate_limit_period: e.target.value })}
                                className="w-full px-3 py-2 text-sm border rounded-md bg-white"
                              >
                                <option value="minute">Minute</option>
                                <option value="hour">Hour</option>
                                <option value="day">Day</option>
                              </select>
                            </div>
                          </div>

                          {/* Tier editing commented out - coming soon */}
                          {/* <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">Priority Tier</label>
                              <select
                                value={editData.priority_tier}
                                onChange={(e) => setEditData({ ...editData, priority_tier: e.target.value })}
                                className="w-full px-3 py-2 text-sm border rounded-md bg-white"
                              >
                                <option value="free">Free</option>
                                <option value="standard">Standard</option>
                                <option value="premium">Premium</option>
                                <option value="enterprise">Enterprise</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">Expires At</label>
                              <Input
                                type="date"
                                value={editData.expires_at ? editData.expires_at.split("T")[0] : ""}
                                onChange={(e) => setEditData({ ...editData, expires_at: e.target.value })}
                                className="text-sm"
                              />
                            </div>
                          </div> */}
                          
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">Expires At</label>
                            <Input
                              type="date"
                              value={editData.expires_at ? editData.expires_at.split("T")[0] : ""}
                              onChange={(e) => setEditData({ ...editData, expires_at: e.target.value })}
                              className="text-sm"
                            />
                          </div>

                          <div className="p-3 rounded-lg border bg-muted/50 space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">AI Features Enabled</label>
                              <input
                                type="checkbox"
                                checked={editData.llm_enabled}
                                onChange={(e) => setEditData({ ...editData, llm_enabled: e.target.checked })}
                                className="w-4 h-4"
                              />
                            </div>

                            {editData.llm_enabled && (
                              <>
                                <div>
                                  <label className="text-xs text-muted-foreground block mb-1">Max Tokens per Day</label>
                                  <Input
                                    type="number"
                                    value={editData.max_tokens_per_day}
                                    onChange={(e) => setEditData({ ...editData, max_tokens_per_day: parseInt(e.target.value) || 0 })}
                                    placeholder="0 for unlimited"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground block mb-1">Cost Limit ($)</label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editData.llm_cost_limit}
                                    onChange={(e) => setEditData({ ...editData, llm_cost_limit: parseFloat(e.target.value) || 0 })}
                                    placeholder="0 for unlimited"
                                    className="text-sm"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t">
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={isUpdating}
                          >
                            {isUpdating ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={isUpdating}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Quota Tab */}
                  <TabsContent value="quota" className="space-y-4">
                    {usageStats && (
                      <>
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-sm font-medium">Requests</span>
                              </div>
                              <span className="text-sm font-bold">
                                {selectedKeyDetails.current_usage || 0} / {selectedKeyDetails.rate_limit_requests || 10000}
                              </span>
                            </div>
                            <Progress 
                              value={getUsagePercent(selectedKeyDetails.current_usage, selectedKeyDetails.rate_limit_requests)} 
                              className="h-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {getUsagePercent(selectedKeyDetails.current_usage, selectedKeyDetails.rate_limit_requests)}% used
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Requests (7d)</p>
                            <p className="text-lg font-bold">{usageStats.total_requests}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Response</p>
                            <p className="text-lg font-bold">{usageStats.avg_response_time_ms.toFixed(0)}ms</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Errors</p>
                            <p className="text-lg font-bold text-red-600">{usageStats.error_count}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Data Transferred</p>
                            <p className="text-lg font-bold">{((usageStats.total_request_bytes + usageStats.total_response_bytes) / 1024 / 1024) | 0}MB</p>
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* AI Tab */}
                  <TabsContent value="llm" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <Zap className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">AI Features {selectedKeyDetails.llm_enabled ? "Enabled" : "Disabled"}</p>
                          <p className="text-xs text-blue-800">{selectedKeyDetails.llm_enabled ? "This key can use AI features" : "This key cannot use AI features"}</p>
                        </div>
                      </div>

                      {selectedKeyDetails.llm_enabled && (
                        <>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">LLM Tokens</span>
                              <span className="text-sm font-bold">
                                {selectedKeyDetails.current_llm_tokens_used || 0} / {selectedKeyDetails.max_tokens_per_day || 1000000}
                              </span>
                            </div>
                            <Progress 
                              value={getUsagePercent(selectedKeyDetails.current_llm_tokens_used, selectedKeyDetails.max_tokens_per_day)} 
                              className="h-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {getUsagePercent(selectedKeyDetails.current_llm_tokens_used, selectedKeyDetails.max_tokens_per_day)}% used
                            </p>
                          </div>

                          {usageStats && (
                            <div className="p-3 rounded-lg bg-muted/50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4" />
                                  <span className="text-sm text-muted-foreground">Tokens (7 days)</span>
                                </div>
                                <span className="text-sm font-bold">{usageStats.total_llm_tokens.toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>

                  {/* Audit Tab */}
                  <TabsContent value="audit" className="space-y-3">
                    {auditLog.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {auditLog.map((event) => (
                          <div key={event.id} className="p-2 rounded-lg bg-muted/50 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{event.event_type}</span>
                              <span className="text-muted-foreground">{new Date(event.timestamp).toLocaleDateString()}</span>
                            </div>
                            {event.changed_by && (
                              <p className="text-muted-foreground">By: {event.changed_by}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No audit events yet</p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="lg:col-span-2">
              <CardContent className="pt-12">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Select a key to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteKeyId} onOpenChange={(open) => {
          if (!open) setDeleteKeyId(null)
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete API Key</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this API key? Any applications using this key will lose access immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  onClick={handleDeleteKey}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Key"
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
