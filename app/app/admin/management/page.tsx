"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { adminApi, authApi, filesApi, apiKeysApi, pluginsApi, catalogsApi } from "@/lib/api"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import {
  Users,
  FileText,
  Key,
  Plug,
  Plus,
  Edit3,
  Trash2,
  Upload,
  Download,
  Search,
  Filter,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Settings,
  Database,
  Globe,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  HardDrive,
  Activity,
  MoreHorizontal,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { redirect } from "next/navigation"

interface User {
  id: string
  username: string
  role: string
  last_login?: string
  allowed_files?: string[]
}

interface File {
  document_id: string
  title: string
  chunk_count?: number
  created_at?: string
}

interface ApiKey {
  id: string
  key_id: string
  name: string
  created_at: string
  last_used?: string
}

interface Integration {
  id: string
  name: string
  type: "catalog" | "plugin" | "api"
  status: "active" | "inactive" | "error"
  description?: string
  config?: Record<string, any>
}

export default function AdminManagementPage() {
  const { token, isAdmin, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState("users")
  const [isLoading, setIsLoading] = useState(true)

  // Users state
  const [users, setUsers] = useState<User[]>([])
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "member" })
  const [showPassword, setShowPassword] = useState(false)

  // Files state
  const [files, setFiles] = useState<File[]>([])
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isCreateKeyOpen, setIsCreateKeyOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  // Integrations state
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [catalogs, setCatalogs] = useState<any[]>([])
  const [pluginsEnabled, setPluginsEnabled] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      redirect("/app")
    }
  }, [authLoading, isAdmin])

  const loadData = async () => {
    if (!token) return

    try {
      const [usersRes, filesRes, keysRes, catalogsRes, pluginsRes] = await Promise.all([
        authApi.listMembers(token),
        filesApi.list(token),
        apiKeysApi.list(token),
        catalogsApi.list(token),
        pluginsApi.status(token),
      ])

      if (usersRes.status === "success") {
        setUsers(
          (usersRes.response?.items || []).map((m) => ({
            id: m.user_id,
            username: m.username,
            role: m.role,
          }))
        )
      }
      if (filesRes.status === "success") {
        setFiles(filesRes.response?.documents || [])
      }
      if (keysRes.status === "success") {
        setApiKeys(keysRes.response?.keys || [])
      }
      if (catalogsRes.status === "success") {
        setCatalogs(catalogsRes.response?.catalogs || [])
      }
      if (pluginsRes.status === "success") {
        setPluginsEnabled(pluginsRes.response?.enabled || false)
      }

      // Build integrations list
      const integrationList: Integration[] = [
        ...(catalogsRes.response?.catalogs?.map((catalog: any) => ({
          id: catalog.catalog_id,
          name: catalog.shop_name,
          type: "catalog" as const,
          status: "active" as const,
          description: `${catalog.total_products} products`,
        })) || []),
        {
          id: "plugins",
          name: "Product Search Plugin",
          type: "plugin" as const,
          status: pluginsEnabled ? "active" : "inactive" as const,
          description: "Enable product search functionality",
        },
      ]
      setIntegrations(integrationList)
    } catch (error) {
      console.error("Failed to load admin data:", error)
      toast.error("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      // Fetch-on-condition pattern; loadData sets several list/loading
      // state fields from the async responses.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData()
    }
  }, [isAdmin])

  // User management functions
  const handleCreateUser = async () => {
    if (!token || !newUser.username || !newUser.password) return

    try {
      const result = await adminApi.createUser(token, newUser)
      if (result.status === "success") {
        toast.success("User created successfully")
        setIsCreateUserOpen(false)
        setNewUser({ username: "", password: "", role: "member" })
        loadData()
      } else {
        toast.error(result.message || "Failed to create user")
      }
    } catch (error) {
      toast.error("Failed to create user")
    }
  }

  const handleEditUser = async () => {
    if (!token || !selectedUser) return

    try {
      const result = await authApi.updateMemberRole(token, selectedUser.id, selectedUser.role)
      if (result.status === "success") {
        toast.success("User updated successfully")
        setIsEditUserOpen(false)
        setSelectedUser(null)
        loadData()
      } else {
        toast.error(result.message || "Failed to update user")
      }
    } catch (error) {
      toast.error("Failed to update user")
    }
  }

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!token || !confirm(`Are you sure you want to delete user "${username}"?`)) return

    try {
      const result = await adminApi.deleteUser(token, userId)
      if (result.status === "success") {
        toast.success("User deleted successfully")
        loadData()
      } else {
        toast.error(result.message || "Failed to delete user")
      }
    } catch (error) {
      toast.error("Failed to delete user")
    }
  }

  // File management functions
  const handleFileUpload = async () => {
    if (!token || !selectedFiles || selectedFiles.length === 0) return

    setIsUploading(true)
    try {
      const filesArray = Array.from(selectedFiles)
      const result = await filesApi.upload(token, filesArray)
      if (result.status === "success") {
        toast.success(`${filesArray.length} file(s) uploaded successfully`)
        setSelectedFiles(null)
        loadData()
      } else {
        toast.error(result.message || "Failed to upload files")
      }
    } catch (error) {
      toast.error("Failed to upload files")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteFile = async (filename: string) => {
    if (!token || !confirm(`Are you sure you want to delete "${filename}"?`)) return

    try {
      const result = await filesApi.deleteByFilename(token, filename)
      if (result.status === "success") {
        toast.success("File deleted successfully")
        loadData()
      } else {
        toast.error(result.message || "Failed to delete file")
      }
    } catch (error) {
      toast.error("Failed to delete file")
    }
  }

  // API Key management functions
  const handleCreateApiKey = async () => {
    if (!token || !newKeyName) return

    try {
      const result = await apiKeysApi.create(token, newKeyName)
      if (result.status === "success") {
        setCreatedKey(result.response?.key || "")
        toast.success("API key created successfully")
        setNewKeyName("")
        loadData()
      } else {
        toast.error(result.message || "Failed to create API key")
      }
    } catch (error) {
      toast.error("Failed to create API key")
    }
  }

  const handleDeleteApiKey = async (keyId: string) => {
    if (!token || !confirm("Are you sure you want to delete this API key?")) return

    try {
      const result = await apiKeysApi.delete(token, keyId)
      if (result.status === "success") {
        toast.success("API key deleted successfully")
        loadData()
      } else {
        toast.error(result.message || "Failed to delete API key")
      }
    } catch (error) {
      toast.error("Failed to delete API key")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  // Integration management functions
  const togglePlugin = async () => {
    if (!token) return

    try {
      const result = pluginsEnabled
        ? await pluginsApi.disable(token)
        : await pluginsApi.enable(token)
      
      if (result.status === "success") {
        setPluginsEnabled(!pluginsEnabled)
        toast.success(`Plugin ${!pluginsEnabled ? "enabled" : "disabled"} successfully`)
        loadData()
      } else {
        toast.error(result.message || "Failed to toggle plugin")
      }
    } catch (error) {
      toast.error("Failed to toggle plugin")
    }
  }

  const deleteCatalog = async (catalogId: string) => {
    if (!token || !confirm("Are you sure you want to delete this catalog?")) return

    try {
      const result = await catalogsApi.delete(token, catalogId)
      if (result.status === "success") {
        toast.success("Catalog deleted successfully")
        loadData()
      } else {
        toast.error(result.message || "Failed to delete catalog")
      }
    } catch (error) {
      toast.error("Failed to delete catalog")
    }
  }

  if (authLoading || isLoading) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Admin Management" }]} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </>
    )
  }

  if (!isAdmin) {
    return null
  }

  const filteredFiles = files.filter(file =>
    file.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <AppHeader breadcrumbs={[{ label: "Admin Management" }]} />
      <main className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Management</h1>
            <p className="text-muted-foreground">Manage users, files, API keys, and integrations</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">Registered accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{files.length}</div>
              <p className="text-xs text-muted-foreground">Uploaded files</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">API Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{apiKeys.length}</div>
              <p className="text-xs text-muted-foreground">Active keys</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Integrations</CardTitle>
              <Plug className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{integrations.length}</div>
              <p className="text-xs text-muted-foreground">Connected services</p>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage system users and permissions</CardDescription>
                  </div>
                  <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>Add a new user to the system</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={newUser.username}
                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                            placeholder="Enter username"
                          />
                        </div>
                        <div>
                          <Label htmlFor="password">Password</Label>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              value={newUser.password}
                              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                              placeholder="Enter password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="role">Role</Label>
                          <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateUser}>Create User</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {users.map((user) => (
                      <div key={user.username} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                {user.role}
                              </Badge>
                              {user.last_login && (
                                <span>Last login: {new Date(user.last_login).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user)
                                setIsEditUserOpen(true)
                              }}
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteUser(user.id, user.username)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                  <DialogDescription>Modify user details and permissions</DialogDescription>
                </DialogHeader>
                {selectedUser && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-username">Username</Label>
                      <Input id="edit-username" value={selectedUser.username} disabled />
                    </div>
                    <div>
                      <Label htmlFor="edit-role">Role</Label>
                      <Select
                        value={selectedUser.role}
                        onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditUser}>Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>File Management</CardTitle>
                    <CardDescription>Upload and manage documents</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Files
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Upload Files</DialogTitle>
                          <DialogDescription>Select files to upload to the knowledge base</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="file-upload">Choose Files</Label>
                            <Input
                              id="file-upload"
                              type="file"
                              multiple
                              onChange={(e) => setSelectedFiles(e.target.files)}
                              className="mt-2"
                            />
                          </div>
                          {selectedFiles && selectedFiles.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              {selectedFiles.length} file(s) selected
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setSelectedFiles(null)}>
                            Cancel
                          </Button>
                          <Button onClick={handleFileUpload} disabled={!selectedFiles || isUploading}>
                            {isUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {filteredFiles.map((file) => (
                      <div key={file.document_id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{file.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {typeof file.chunk_count === "number" && <span>{file.chunk_count} chunks</span>}
                              {file.created_at && (
                                <span>Uploaded: {new Date(file.created_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteFile(file.title)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>API Keys</CardTitle>
                    <CardDescription>Manage API access keys</CardDescription>
                  </div>
                  <Dialog open={isCreateKeyOpen} onOpenChange={setIsCreateKeyOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create API Key
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create API Key</DialogTitle>
                        <DialogDescription>Generate a new API key for external access</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="key-name">Key Name</Label>
                          <Input
                            id="key-name"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="Enter key name"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateKeyOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateApiKey}>Create Key</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {createdKey && (
                  <Alert className="mb-4">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm">{createdKey}</span>
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(createdKey)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Save this key securely. It won&apos;t be shown again.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div key={`${key.key_id}-${key.id}`} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                            <Key className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium">{key.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                              {key.last_used && (
                                <span>Last used: {new Date(key.last_used).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Key
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteApiKey(key.key_id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Integrations</CardTitle>
                    <CardDescription>Manage connected services and plugins</CardDescription>
                  </div>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Integration
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {integrations.map((integration) => (
                      <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Plug className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{integration.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline">{integration.type}</Badge>
                              <Badge
                                variant={
                                  integration.status === "active"
                                    ? "default"
                                    : integration.status === "error"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {integration.status}
                              </Badge>
                              {integration.description && <span>{integration.description}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {integration.type === "plugin" && (
                            <Switch
                              checked={integration.status === "active"}
                              onCheckedChange={togglePlugin}
                            />
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Settings className="w-4 h-4 mr-2" />
                                Configure
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {integration.type === "catalog" && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteCatalog(integration.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}
