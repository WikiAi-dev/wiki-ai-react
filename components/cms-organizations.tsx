"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Building, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  XCircle,
  Send,
  Eye,
  Reply,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  MessageCircle,
  Ban,
  Settings,
  ArrowUpDown
} from "lucide-react"
import { useWebSocketMessaging } from "@/hooks/use-websocket-messaging"
import { API_CONFIG, getApiUrl } from "@/lib/config"

interface CMSOrganizationsProps {
  token: string
}

interface Organization {
  id: string
  name: string
  slug: string
  status: string
  created_at: string
  updated_at: string
  admin_user_id: string
  admin_username?: string
  admin_email?: string
  description?: string
}

interface MessageThread {
  id: string
  organization_id: string
  subject: string
  status: string
  created_at: string
  updated_at: string
  last_message_at: string
  organization_name?: string
}

interface Message {
  id: string
  thread_id: string
  organization_id: string
  sender_type: string
  sender_name: string
  sender_email: string
  message: string
  message_type: string
  status: string
  created_at: string
  updated_at: string
}

export default function CMSOrganizations({ token }: CMSOrganizationsProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>([])
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null)
  const [threadMessages, setThreadMessages] = useState<Message[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  
  // Track the current valid token (may be refreshed)
  const currentTokenRef = useRef<string>(token)
  
  // Status change modal state
  const [statusChangeModal, setStatusChangeModal] = useState<{
    isOpen: boolean
    organization: Organization | null
    newStatus: string
    reason: string
  }>({
    isOpen: false,
    organization: null,
    newStatus: "",
    reason: ""
  })

  // Update token ref when prop changes
  useEffect(() => {
    currentTokenRef.current = token
  }, [token])

  // WebSocket messaging (disabled for stability - using HTTP API instead)
  const {
    isConnected: wsIsConnected,
    messages: wsMessages,
    unreadCount: wsUnreadCount,
    connectionError: wsConnectionError,
    joinThread,
    sendMessage: wsSendMessage,
    markMessageAsRead: wsMarkMessageAsRead
  } = useWebSocketMessaging("") // Disabled by passing empty token

  // Token validation/refresh helper.
  // Dev-only fallback: NEXT_PUBLIC_CMS_ADMIN_USERNAME/PASSWORD must be set explicitly (e.g. in
  // .env.local for local development) for this to attempt a silent re-login. There is no
  // hardcoded credential here - in any environment where those vars aren't set (production),
  // this just returns null and the caller falls back to a normal 401, which should surface a
  // re-authentication prompt rather than silently using a baked-in password.
  const refreshToken = async (): Promise<string | null> => {
    const cmsUsername = process.env.NEXT_PUBLIC_CMS_ADMIN_USERNAME
    const cmsPassword = process.env.NEXT_PUBLIC_CMS_ADMIN_PASSWORD
    if (!cmsUsername || !cmsPassword) {
      console.warn("CMS token refresh skipped: NEXT_PUBLIC_CMS_ADMIN_USERNAME/PASSWORD not configured")
      return null
    }
    try {
      console.log("Attempting to refresh token with configured CMS admin credentials...")
      const response = await fetch(getApiUrl("/v1/auth/cms-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cmsUsername, password: cmsPassword })
      })

      if (response.ok) {
        const data = await response.json()
        const token = data.access_token
        if (token) {
          console.log("Token refreshed successfully, updating local reference")
          currentTokenRef.current = token
          return token
        }
      }
    } catch (err) {
      console.error("Token refresh error:", err)
    }
    return null
  }

  // Make API request with automatic token refresh on 401/403
  const makeAuthenticatedRequest = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    try {
      let currentToken = currentTokenRef.current
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          "Authorization": `Bearer ${currentToken}`,
          "Content-Type": "application/json"
        }
      })

      // If we get 401/403, try to refresh token and retry
      if (response.status === 401 || response.status === 403) {
        console.log("Token invalid, attempting refresh...")
        const newToken = await refreshToken()
        if (newToken && newToken !== currentToken) {
          console.log("Retrying request with refreshed token")
          // Retry with new token
          return fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              "Authorization": `Bearer ${newToken}`,
              "Content-Type": "application/json"
            }
          })
        }
      }

      return response
    } catch (err) {
      console.error("Request error:", err)
      throw err
    }
  }

  const fetchOrganizations = async () => {
    try {
      const response = await makeAuthenticatedRequest(
        getApiUrl("/v1/organizations"),
        { method: "GET" }
      )

      if (response.ok) {
        const data = await response.json()
        const orgs = data.items || data.organizations || []
        console.log("Fetched organizations:", orgs)
        setOrganizations(orgs)
        setError(null)
      } else {
        console.error(`HTTP ${response.status}: Failed to fetch organizations`)
        setError(`Failed to fetch organizations (${response.status})`)
      }
    } catch (err) {
      setError("Failed to fetch organizations")
      console.error(err)
    }
  }

  const fetchMessageThreads = async () => {
    try {
      const response = await makeAuthenticatedRequest(
        getApiUrl("/v1/messages/threads"),
        { method: "GET" }
      )

      if (response.ok) {
        const data = await response.json()
        setMessageThreads(data.threads || data.items || [])
      } else {
        setError(`HTTP ${response.status}: Failed to fetch message threads`)
      }
    } catch (err) {
      setError("Failed to fetch message threads")
      console.error(err)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await makeAuthenticatedRequest(
        getApiUrl("/v1/messages/unread-count"),
        { method: "GET" }
      )

      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count || data.unread_count || 0)
      }
    } catch (err) {
      console.error("Failed to fetch unread count:", err)
    }
  }

  const fetchThreadMessages = async (threadId: string) => {
    try {
      // Always use HTTP API for message fetching (more reliable than WebSocket)
      const response = await makeAuthenticatedRequest(
        getApiUrl(`/v1/messages/threads/${threadId}/messages`),
        { method: "GET" }
      )

      if (response.ok) {
        const data = await response.json()
        setThreadMessages(data.messages || data.items || [])
      } else {
        setError(`HTTP ${response.status}: Failed to fetch thread messages`)
      }
    } catch (err) {
      setError("Failed to fetch thread messages")
      console.error(err)
    }
  }

  const banOrganization = async (orgId: string) => {
    try {
      const response = await makeAuthenticatedRequest(
        getApiUrl(`/v1/organizations/${orgId}/reject`),
        { method: "POST" }
      )

      if (response.ok) {
        await fetchOrganizations()
      } else {
        setError("Failed to ban organization")
      }
    } catch (err) {
      setError("Failed to ban organization")
      console.error(err)
    }
  }

  const approveOrganization = async (orgId: string) => {
    try {
      const response = await makeAuthenticatedRequest(
        getApiUrl(`/v1/organizations/${orgId}/approve`),
        { method: "POST" }
      )

      if (response.ok) {
        await fetchOrganizations()
      } else {
        setError("Failed to approve organization")
      }
    } catch (err) {
      setError("Failed to approve organization")
      console.error(err)
    }
  }

  const rejectOrganization = async (orgId: string, reason: string = "") => {
    try {
      const response = await makeAuthenticatedRequest(
        getApiUrl(`/v1/organizations/${orgId}/reject`),
        { method: "POST", body: JSON.stringify({ reason }) }
      )

      if (response.ok) {
        await fetchOrganizations()
        setStatusChangeModal({ isOpen: false, organization: null, newStatus: "", reason: "" })
      } else {
        setError("Failed to reject organization")
      }
    } catch (err) {
      setError("Failed to reject organization")
      console.error(err)
    }
  }

  const changeOrganizationStatus = async (orgId: string, newStatus: string) => {
    try {
      const response = await makeAuthenticatedRequest(
        getApiUrl(`/v1/organizations/${orgId}`),
        { method: "PATCH", body: JSON.stringify({ status: newStatus }) }
      )

      if (response.ok) {
        await fetchOrganizations()
        setStatusChangeModal({ isOpen: false, organization: null, newStatus: "", reason: "" })
      } else {
        setError("Failed to change organization status")
      }
    } catch (err) {
      setError("Failed to change organization status")
      console.error(err)
    }
  }

  const openStatusChangeModal = (organization: Organization) => {
    setStatusChangeModal({
      isOpen: true,
      organization,
      newStatus: organization.status,
      reason: ""
    })
  }

  const handleStatusChange = () => {
    if (statusChangeModal.organization && statusChangeModal.newStatus) {
      if (statusChangeModal.newStatus === "rejected") {
        rejectOrganization(statusChangeModal.organization.id, statusChangeModal.reason)
      } else {
        changeOrganizationStatus(statusChangeModal.organization.id, statusChangeModal.newStatus)
      }
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return

    setSendingMessage(true)
    try {
      const response = await makeAuthenticatedRequest(
        getApiUrl(`/v1/messages/threads/${selectedThread?.id}/messages`),
        {
          method: "POST",
          body: JSON.stringify({
            message: newMessage.trim(),
            sender_name: "WikiAI Admin",
            sender_email: "admin@wikiai.com",
            message_type: "response"
          })
        }
      )

      if (response.ok) {
        setNewMessage("")
        if (selectedThread?.id) {
          fetchThreadMessages(selectedThread.id)
        }
      } else {
        setError("Failed to send message")
      }
    } catch (err) {
      setError("Failed to send message")
      console.error(err)
    } finally {
      setSendingMessage(false)
    }
  }

  const markMessageAsRead = async (messageId: string) => {
    try {
      const response = await makeAuthenticatedRequest(
        getApiUrl(`/v1/messages/${messageId}/read`),
        { method: "POST" }
      )

      if (response.ok) {
        if (selectedThread?.id) {
          fetchThreadMessages(selectedThread.id)
        }
        fetchUnreadCount()
      }
    } catch (err) {
      setError("Failed to mark message as read")
      console.error(err)
    }
  }

  const openThreadWithOrganization = async (orgId: string, orgName: string) => {
    try {
      const response = await makeAuthenticatedRequest(
        getApiUrl("/v1/messages/threads"),
        {
          method: "POST",
          body: JSON.stringify({
            organization_id: orgId,
            subject: `Conversation with ${orgName}`,
            sender_name: "WikiAI Admin",
            sender_email: "admin@wikiai.com",
            message: `Hello! This is a message thread opened with ${orgName}. How can we help you today?`,
            message_type: "inquiry"
          })
        }
      )

      if (response.ok) {
        const data = await response.json()
        await fetchMessageThreads()
        
        // Find the newly created thread
        const updatedThreadsResponse = await makeAuthenticatedRequest(
          getApiUrl("/v1/messages/threads"),
          { method: "GET" }
        )
        
        if (updatedThreadsResponse.ok) {
          const threadsData = await updatedThreadsResponse.json()
          const threads = threadsData.threads || threadsData.items || []
          const newThread = threads.find((t: any) => t.subject === `Conversation with ${orgName}`)
          
          if (newThread) {
            setSelectedThread(newThread)
            await fetchThreadMessages(newThread.id)
            
            // Switch to messages tab
            const messagesTab = document.querySelector('[value="messages"]') as HTMLElement
            if (messagesTab) {
              messagesTab.click()
            }
          }
        }
        
        setError("Thread created successfully!")
      } else {
        setError("Failed to create thread")
      }
    } catch (err) {
      setError("Failed to create thread")
      console.error(err)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "suspended":
        return <Ban className="w-4 h-4 text-orange-600" />
      case "on review":
        return <Ban className="w-4 h-4 text-orange-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "suspended":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "on review":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown date"
    try {
      return new Date(dateString).toLocaleDateString()
    } catch (error) {
      console.error("Invalid date string:", dateString)
      return "Invalid date"
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      // Fetch all data in parallel with automatic token refresh on failure
      await Promise.all([
        fetchOrganizations(),
        fetchMessageThreads(),
        fetchUnreadCount()
      ])
      setLoading(false)
    }

    if (token) {
      loadData()
    }
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* WebSocket Error Message */}
      {wsConnectionError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <div className="flex items-center">
            <WifiOff className="w-4 h-4 mr-2" />
            <span className="font-medium">Live Chat Unavailable</span>
          </div>
          <p className="text-sm mt-1">
            {(wsConnectionError?.includes("timeout") || wsConnectionError?.includes("failed")) 
              ? "The chat server is not responding. The server may need to be restarted."
              : wsConnectionError?.includes("Authentication")
              ? "Authentication issue. Please log out and log back in."
              : wsConnectionError?.includes("Access denied")
              ? "Access denied. Live chat requires admin privileges."
              : wsConnectionError?.includes("not working properly")
              ? "Server authentication needs to be fixed. Please restart the server."
              : wsConnectionError?.includes("refresh")
              ? "Connection lost. Please refresh the page to reconnect."
              : wsConnectionError || "Unknown error"}
          </p>
          {((wsConnectionError?.includes("timeout") || wsConnectionError?.includes("failed") || wsConnectionError?.includes("not working properly"))) && (
            <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mt-2">
              <p className="text-xs font-mono text-yellow-800">
                To restart the server, run in the graphtalk directory:<br/>
                <code>python api.py</code>
              </p>
            </div>
          )}
          {wsConnectionError?.includes("Authentication") && (
            <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mt-2">
              <p className="text-xs text-yellow-800">
                Your session may have expired. Please log out from the CMS and log back in.
              </p>
            </div>
          )}
          <p className="text-xs mt-1 text-yellow-600">
            Regular messaging will still work through HTTP requests.
          </p>
        </div>
      )}

      {/* Header with unread count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-foreground">Organizations & Messages</h2>
          <div className="flex items-center space-x-2">
            {wsIsConnected ? (
              <Badge variant="outline" className="flex items-center text-green-600">
                <Wifi className="w-4 h-4 mr-1" />
                Live Chat
              </Badge>
            ) : wsConnectionError ? (
              <Badge variant="outline" className="flex items-center text-red-600">
                <WifiOff className="w-4 h-4 mr-1" />
                {wsConnectionError?.includes("refresh") ? "Reconnect Required" : "Offline"}
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center text-muted-foreground">
                <WifiOff className="w-4 h-4 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => Promise.all([fetchOrganizations(), fetchMessageThreads(), fetchUnreadCount()])}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organizations">
            <Building className="w-4 h-4 mr-2" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-4">
          <div className="grid gap-4">
            {organizations.map((org: Organization, index: number) => (
              <Card key={org.id || org.name || `org-${index}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{org.name}</h3>
                      <p className="text-sm text-muted-foreground">{org.slug}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {formatDate(org.created_at)} • Updated: {formatDate(org.updated_at)}
                      </p>
                    </div>
                    {org.admin_username && (
                      <p className="text-sm text-muted-foreground">
                        Admin: {org.admin_username} ({org.admin_email})
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(org.status)}>
                      <div className="flex items-center">
                        {getStatusIcon(org.status)}
                        <span className="ml-1">{org.status}</span>
                      </div>
                    </Badge>
                    {org.status === "pending" && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => approveOrganization(org.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openStatusChangeModal(org)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {(org.status === "pending" || org.status === "active") && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openThreadWithOrganization(org.id, org.name)}
                          className="text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Open Thread
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openStatusChangeModal(org)}
                          className="text-purple-600 hover:text-purple-700 border-purple-300 hover:border-purple-400"
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Change Status
                        </Button>
                      </div>
                    )}
                    {org.status === "rejected" && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openStatusChangeModal(org)}
                          className="text-purple-600 hover:text-purple-700 border-purple-300 hover:border-purple-400"
                        >
                          <ArrowUpDown className="w-4 h-4 mr-1" />
                          Review Status
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                {org.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{org.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
          {organizations.length === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Organizations</h3>
                  <p className="text-muted-foreground">
                    No organizations have been created yet.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Thread List */}
            <div className="lg:col-span-1 space-y-2">
              <h3 className="font-semibold">Message Threads</h3>
              {messageThreads.map((thread: MessageThread) => (
                <Card
                  key={thread.id}
                  className={`cursor-pointer transition-colors ${
                    selectedThread?.id === thread.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => {
                    setSelectedThread(thread)
                    fetchThreadMessages(thread.id)
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-foreground">{thread.subject}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {thread.organization_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(thread.last_message_at)}
                        </p>
                      </div>
                      {thread.status === "open" && (
                        <Badge variant="outline" className="text-xs">
                          Open
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Messages */}
            <div className="lg:col-span-2">
              {selectedThread ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-foreground">{selectedThread?.subject || 'No Subject'}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedThread?.organization_name || 'Unknown Organization'}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {threadMessages.map((message: Message, index: number) => (
                        <div
                          key={message.id || index}
                          className={`flex items-start space-x-3 p-3 rounded-lg ${
                            message.sender_type === "admin"
                              ? "bg-blue-50 dark:bg-blue-950"
                              : "bg-gray-50 dark:bg-gray-900"
                          }`}
                        >
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium">
                                {message.sender_name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm text-foreground">{message.sender_name || 'Unknown'}</p>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(message.created_at)}
                                </span>
                                {message.status === "unread" && (
                                  <Badge variant="outline" className="text-xs">
                                    New
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-sm mt-1 text-foreground">{message.message || 'No message content'}</p>
                            {message.sender_type === "user" && message.status === "unread" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={() => markMessageAsRead(message.id)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Mark as read
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reply Form */}
                    <div className="mt-4 border-t pt-4">
                      <div className="flex space-x-2">
                        <Textarea
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={sendMessage}
                          disabled={sendingMessage || !newMessage.trim()}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Thread Selected</h3>
                      <p className="text-muted-foreground">
                        Select a message thread to view and respond to messages
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Status Change Modal */}
      {statusChangeModal.isOpen && statusChangeModal.organization && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Change Organization Status
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {statusChangeModal.organization.name}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">New Status</label>
                <select
                  value={statusChangeModal.newStatus}
                  onChange={(e) => setStatusChangeModal(prev => ({
                    ...prev,
                    newStatus: e.target.value
                  }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {statusChangeModal.newStatus === "rejected" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Rejection Reason (Optional)</label>
                  <Textarea
                    placeholder="Enter reason for rejection..."
                    value={statusChangeModal.reason}
                    onChange={(e) => setStatusChangeModal(prev => ({
                      ...prev,
                      reason: e.target.value
                    }))}
                    className="w-full"
                  />
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Status Guide:</p>
                <ul className="space-y-1 text-xs">
                  <li><strong>Pending:</strong> Awaiting approval (login blocked)</li>
                  <li><strong>Active:</strong> Approved and functional (login allowed)</li>
                  <li><strong>Suspended:</strong> Temporarily disabled by admin (login blocked), can be reactivated</li>
                  <li><strong>Rejected:</strong> Rejected by admin (login blocked)</li>
                </ul>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStatusChangeModal({ isOpen: false, organization: null, newStatus: "", reason: "" })}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStatusChange}
                  disabled={!statusChangeModal.newStatus || statusChangeModal.newStatus === statusChangeModal.organization.status}
                  className="flex-1"
                >
                  {statusChangeModal.newStatus === "rejected" ? "Reject" : "Update Status"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
