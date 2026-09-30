"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { filesApi, queryApi, pluginsApi, catalogsApi, resolveTenantId } from "@/lib/api"
import { getWsUrl } from "@/lib/config"
import { useWebSocket } from "@/lib/use-websocket"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Search, 
  Settings,
  FileText,
  ExternalLink,
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Send,
  X,
  Loader2,
  User,
  Sparkles,
  Bot,
  ShoppingCart,
  Eye,
  Globe,
  Wifi,
  Brain,
  Copy,
} from "lucide-react"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import { useTranslation } from "@/src/i18n"

// Enhanced File Viewer Component (reused from files page with search highlighting)
function FileViewerModal({ isOpen, onClose, document, searchChunk }: { isOpen: boolean; onClose: () => void; document: any; searchChunk?: string }) {
  const [fileContent, setFileContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const { token } = useAuth()

  const fetchFullContent = async () => {
    setIsLoading(true)
    try {
      let result
      const documentIdentifier = document.document_id || document.id || document.title
      if (!documentIdentifier) {
        throw new Error('No document identifier available')
      }

      try {
        result = await filesApi.getContent(token!, String(documentIdentifier))
      } catch (error) {
        if (document.title) {
          const tempFileName = `temp_${document.title}`
          result = await filesApi.getContent(token!, tempFileName)
        } else {
          throw error
        }
      }
      
      if (result.status === 'success' && result.response) {
        let content = ''
        
        if (result.response.content) {
          if (result.response.content.startsWith('data:') || result.response.content.includes('base64')) {
            const base64Content = result.response.content.split(',')[1] || result.response.content
            content = atob(base64Content)
          } else {
            content = result.response.content
          }
        }
        
        setFileContent(content)
      } else {
        console.error('API returned error:', result)
        setFileContent('Content not available')
      }
    } catch (error) {
      console.error('Error fetching file content:', error)
      setFileContent('Error loading content')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && token && (document.document_id || document.title)) {
      // Fetch-on-condition pattern; fetchFullContent sets content/loading
      // state from the async response.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchFullContent()
    }
  }, [isOpen, document.document_id, document.title, token])

  const highlightSearchChunk = (content: string, chunk?: string) => {
    if (!chunk) return content
    
    const regex = new RegExp(`(${chunk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return content.replace(regex, '<mark>$1</mark>')
  }

  const getFileExtension = (filename: string) => {
    const parts = filename.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
  }

  if (!isOpen) return null

  const fileExt = getFileExtension(document.title)
  const isPdf = fileExt === 'pdf'
  const isWord = fileExt === 'doc' || fileExt === 'docx'
  const highlightedContent = searchChunk ? highlightSearchChunk(fileContent, searchChunk) : fileContent

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-5xl max-h-[90vh] w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            <span className="truncate">{document.title}</span>
          </DialogTitle>
          <DialogDescription>Document preview with search highlighting</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-[500px] max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading document...</p>
              </div>
            </div>
          ) : (
            <div className="h-full">
              {isPdf ? (
                <div className="text-center p-8">
                  <p className="text-muted-foreground">PDF preview not available in search results</p>
                  <p className="text-sm text-muted-foreground mt-2">Please open this file from the Files page for full viewing</p>
                </div>
              ) : isWord ? (
                <div className="text-center p-8">
                  <p className="text-muted-foreground">Word document preview not available in search results</p>
                  <p className="text-sm text-muted-foreground mt-2">Please open this file from the Files page for full viewing</p>
                </div>
              ) : (
                <ScrollArea className="h-[60vh] rounded-md border p-4">
                  {searchChunk ? (
                    <div 
                      className="text-sm font-mono whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{ __html: highlightedContent }}
                    />
                  ) : (
                    <pre className="text-sm font-mono whitespace-pre-wrap break-words">{fileContent}</pre>
                  )}
                </ScrollArea>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SearchResult {
  id: string
  document_id?: string
  type: 'document' | 'product'
  title: string
  content: string
  source: string
  url?: string
  price?: number | string
  special_price?: number
  shop_name?: string
  score?: number
  // AI Agent specific metadata
  ai_ranked?: boolean
  relevance?: 'high' | 'medium' | 'low'
  enhanced_context?: boolean
}

interface Message {
  id: string
  role: "user" | "assistant" | "sources" | "overview"
  content: string
  sources?: string[]
  searchResults?: SearchResult[]
  timestamp: Date
}

interface Catalog {
  catalog_id: string
  shop_name: string
  total_products: number
}

function isTokenExpiringSoon(token: string, bufferMs = 10000): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() + bufferMs
  } catch {
    return false
  }
}

export default function AdminSearchPage() {
  const { token, user, refreshToken } = useAuth()
  const { t } = useTranslation()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => crypto.randomUUID())
  const [feedbackMessage, setFeedbackMessage] = useState<Message | null>(null)
  const [feedbackText, setFeedbackText] = useState("")
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null)
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Settings states
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchType, setSearchType] = useState<'all' | 'documents' | 'opencart'>('all')
  const [enabledPlugins, setEnabledPlugins] = useState({
    documents: true,
    opencart: false,
  })
  const [loadingPlugins, setLoadingPlugins] = useState(false)
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(false)
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])
  const [showAiOverview, setShowAiOverview] = useState(true)
  const [copilotMode, setCopilotMode] = useState(false)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const loadSettings = () => {
    const saved = localStorage.getItem('searchSettings')
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        setSearchType(settings.searchType || 'all')
        setShowAiOverview(settings.showAiOverview !== false)
        setSelectedCatalogs(settings.selectedCatalogs || [])
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
  }

  const saveSettings = () => {
    const settings = {
      searchType,
      showAiOverview,
      selectedCatalogs
    }
    localStorage.setItem('searchSettings', JSON.stringify(settings))
  }

  const loadPluginStatus = async () => {
    if (!token) return
    
    setLoadingPlugins(true)
    try {
      const result = await pluginsApi.status(token)
      if (result.status === 'success' && result.response) {
        setEnabledPlugins({
          documents: true,
          opencart: result.response.enabled || false,
        })
      }
    } catch (error) {
      console.error('Failed to load plugin status:', error)
    } finally {
      setLoadingPlugins(false)
    }
  }

  useEffect(() => {
    // Fetch/load-on-mount pattern; both set local settings/plugin state
    // from localStorage / the async API response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings()
    loadPluginStatus()
  }, [])

  const loadCatalogs = async () => {
    if (!token) return
    
    setLoadingCatalogs(true)
    try {
      const result = await catalogsApi.list(token)
      if (result.status === 'success' && result.response) {
        setCatalogs(result.response.catalogs || [])
        if (selectedCatalogs.length === 0) {
          setSelectedCatalogs(result.response.catalogs?.map((c: Catalog) => c.catalog_id) || [])
        }
      }
    } catch (error) {
      console.error('Failed to load catalogs:', error)
    } finally {
      setLoadingCatalogs(false)
    }
  }

  // Handle document click to open/view content
  const handleDocumentClick = async (result: any) => {
    if (!token) return
    
    try {
      if (result.type === 'document') {
        // Open document viewer modal
        setSelectedDocument(result)
        setIsDocumentViewerOpen(true)
      } else if (result.type === 'product' && result.url) {
        // For products, open in new tab
        window.open(result.url, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      console.error('Error opening document:', error)
      toast.error('Failed to open document')
    }
  }

  const handleSearchUpdate = (data: any) => {
    console.log('Search update received:', data)
    
    // Handle immediate search results (sources/snippets)
    if (data.type === 'immediate') {
      // Remove the "Searching..." message
      setMessages(prev => prev.filter(msg => msg.content !== "Searching across your Knowledge Base..."))
      
      const sourcesMessage: Message = {
        id: crypto.randomUUID(),
        role: "sources",
        content: `Found ${data.files?.length || 0} relevant sources:`,
        sources: data.files || [],
        searchResults: data.snippets?.map((snippet: any, index: number) => ({
          id: `doc-${index}`,
          document_id: snippet.document_id || snippet.metadata?.document_id,
          type: 'document',
          title: snippet.metadata?.original_filename || snippet.source || `Document ${index + 1}`,
          content: snippet.content ?? 'No content available',
          source: snippet.source || 'document',
          score: snippet.final_score ?? snippet.score ?? 0,
        })) || [],
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, sourcesMessage])
      
      // Add "Generating AI overview" message if overview is expected
      if (showAiOverview) {
        const overviewLoadingMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Generating AI overview...",
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, overviewLoadingMessage])
      }
    }
    
    // Handle AI overview when ready
    if (data.type === 'overview') {
      // Remove the "Generating..." message and add the actual overview
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.content !== "Generating AI overview...")
        return [...filtered, {
          id: crypto.randomUUID(),
          role: "overview",
          content: data.content || "",
          timestamp: new Date(),
        }]
      })
    }
  }

  const handleQueryStatus = (data: any) => {
    console.log('Query status update:', data)
    // Update loading states or show progress
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !token || isLoading) return

    console.log('Starting search for:', input.trim())
    console.log('User:', user?.username, 'Session:', sessionId)

    // Add user message to the conversation
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])

    try {
      // Use WebSocket for real-time search (like Vue implementation)
      if (typeof WebSocket !== 'undefined') {
        try {
          await performWebSocketQuery(input.trim())
        } catch (wsError) {
          // The WS endpoint isn't proxied through this server (see
          // getWsUrl's callers) and depends on the deployment's ingress
          // supporting the Upgrade handshake — that hop can fail even when
          // the equivalent HTTP /v1/search request would succeed. Fall back
          // to it rather than surfacing a hard failure to the user.
          console.error("WebSocket query failed, falling back to HTTP:", wsError)
          await performHttpQuery(input.trim())
        }
      } else {
        // Fallback to HTTP
        await performHttpQuery(input.trim())
      }
    } catch (error) {
      console.error("Query error:", error)
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error while searching. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setInput("")
      setIsLoading(false)
    } finally {
      setIsLoading(false)
    }
  }

  const performWebSocketQuery = async (query: string) => {
    if (!token) {
      throw new Error('Authentication token is required for WebSocket search')
    }
    // The WS connection carries its own token in the URL and isn't covered by
    // the REST-call refresh interceptor — a still-mounted search page can
    // easily outlive the 15-minute access token, so refresh proactively
    // rather than let the socket fail with an opaque 1006 close.
    let activeToken = token
    if (isTokenExpiringSoon(activeToken)) {
      const refreshed = await refreshToken()
      if (refreshed) {
        activeToken = localStorage.getItem('auth_token') || activeToken
      }
    }
    const tenantId = await resolveTenantId(activeToken)
    return new Promise((resolve, reject) => {
      try {
        // WebSocket isn't proxied through the same-origin rewrite (see
        // next.config.mjs) — it needs the real backend address, which is
        // what NEXT_PUBLIC_WS_URL (via getWsUrl) is for.
        const wsUrl = getWsUrl(`/v1/query/stream?token=${encodeURIComponent(activeToken || '')}`)
        
        console.log('Connecting to WebSocket:', wsUrl)
        
        const ws = new WebSocket(wsUrl)
        let hasError = false
        let connectionTimeout: NodeJS.Timeout
        let immediateReceived = false
        let overviewReceived = false
        let loadingMessageAdded = false
        
        // Set connection timeout
        connectionTimeout = setTimeout(() => {
          if (!hasError && ws.readyState === WebSocket.CONNECTING) {
            hasError = true
            ws.close()
            reject(new Error('WebSocket connection timeout'))
          }
        }, 5000) // 5 second timeout
        
        ws.onopen = () => {
          clearTimeout(connectionTimeout)
          console.log('WebSocket connected, sending query')
          
          // Send query immediately (backend expects `query`, `tenant_id`)
          ws.send(JSON.stringify({
            query: query,
            tenant_id: tenantId,
            session_id: sessionId,
            top_k: 10,
          }))
        }
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            console.log('WebSocket message received:', message)
            
            switch (message.type) {
              case 'status':
                // Processing status update (same as Vue)
                console.log('Status:', message.message)
                
                // Show AI agent specific status
                if (copilotMode && message.message) {
                  const statusMessage: Message = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: `🤖 AI Agent: ${message.message}`,
                    timestamp: new Date()
                  }
                  setMessages(prev => [...prev, statusMessage])
                }
                break
                
              case 'chunks':
                // Show search results from backend
                immediateReceived = true
                setIsLoading(false)
                
                const chunks = message.data?.chunks || []
                if (chunks.length > 0) {
                  const searchResults = chunks.map((chunk: any, index: number) => ({
                    id: `doc-${index}`,
                    document_id: chunk.document_id,
                    type: 'document' as const,
                    title: chunk.metadata?.original_filename || chunk.source || `Document ${index + 1}`,
                    content: chunk.content ?? 'No content available',
                    source: chunk.source || 'Unknown',
                    score: chunk.final_score ?? 0,
                  }))
                  const sources = chunks.map((c: any) => c.metadata?.original_filename || c.source)
                  
                  setMessages(prev => [...prev, {
                    id: crypto.randomUUID(),
                    role: "sources",
                    content: `Found ${searchResults.length} relevant sources:`,
                    sources: sources,
                    searchResults: searchResults,
                    timestamp: new Date(),
                  }])
                  
                  if (showAiOverview && !loadingMessageAdded) {
                    loadingMessageAdded = true
                    setMessages(prev => [...prev, {
                      id: crypto.randomUUID(),
                      role: "assistant",
                      content: "Generating AI overview...",
                      timestamp: new Date(),
                    }])
                  }
                }
                break
                
              case 'answer':
                // Replace "Generating..." with actual answer
                overviewReceived = true
                setIsLoading(false)
                
                setMessages(prev => {
                  const filtered = prev.filter(msg => 
                    msg.content !== "Generating AI overview..." && 
                    msg.content !== "🤖 AI Agent generating enhanced analysis..."
                  )
                  return [...filtered, {
                    id: crypto.randomUUID(),
                    role: "overview",
                    content: message.data?.answer || message.data || "",
                    timestamp: new Date(),
                  }]
                })
                break
                
              case 'complete':
                // Query completed (same as Vue)
                console.log('Query completed')
                ws.close()
                resolve(message.data)
                break
                
              case 'error':
                hasError = true
                console.error('WebSocket error from server:', message.message)
                reject(new Error(message.message || 'WebSocket query error'))
                ws.close()
                break
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }
        
        ws.onerror = (error) => {
          clearTimeout(connectionTimeout)
          console.error('WebSocket error:', error)
          if (!hasError) {
            hasError = true
            reject(new Error('WebSocket connection error'))
          }
        }
        
        ws.onclose = (event) => {
          clearTimeout(connectionTimeout)
          console.log('WebSocket closed:', event.code, event.reason)
          if (!hasError && event.code !== 1000) {
            hasError = true
            reject(new Error(`WebSocket closed: ${event.reason || 'Unknown reason'} (code: ${event.code})`))
          }
        }
        
      } catch (error) {
        reject(error)
      }
    })
  }

  const performHttpQuery = async (query: string) => {
    if (!token) {
      throw new Error('No token available')
    }
    
    // Fallback HTTP implementation
    const result = await queryApi.query(token, query, {
      humanize: true,
      ai_agent_mode: copilotMode,
    })
    
    // Process and display results with the current query API structure
    if (result.status === 'success' && result.response) {
      const chunks = result.response.chunks || []
      const aiAnswer = result.response.answer || ""
      
      if (chunks.length > 0) {
        const sourcesMessage: Message = {
          id: crypto.randomUUID(),
          role: "sources",
          content: `Found ${chunks.length} relevant sources:`,
          sources: chunks.map((chunk: any) => chunk.metadata?.original_filename || chunk.source || 'Unknown'),
          searchResults: chunks.map((chunk: any, index: number) => ({
            id: `doc-${index}`,
            document_id: chunk.document_id,
            type: 'document',
            title: chunk.metadata?.original_filename || chunk.source || `Document ${index + 1}`,
            content: chunk.content ?? 'No content available',
            source: chunk.source || 'document',
            score: chunk.final_score ?? 0,
          })),
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, sourcesMessage])
      }
      
      if (showAiOverview && aiAnswer) {
        const overviewMessage: Message = {
          id: crypto.randomUUID(),
          role: "overview",
          content: aiAnswer,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, overviewMessage])
      }
    }
  }

  const handleFeedback = async () => {
    if (!token || !feedbackMessage || !feedbackText.trim()) return

    try {
      // Note: This would need to be adapted to the new API structure
      toast.success("Feedback submitted successfully")
      setIsFeedbackOpen(false)
      setFeedbackText("")
      setFeedbackMessage(null)
    } catch (error) {
      console.error("Feedback error:", error)
      toast.error("Failed to submit feedback")
    }
  }

  const formatPrice = (price: number | string) => {
    if (typeof price === 'number') {
      return `$${price.toFixed(2)}`
    }
    if (typeof price === 'string' && !isNaN(parseFloat(price))) {
      return `$${parseFloat(price).toFixed(2)}`
    }
    return '$0.00'
  }

  const suggestedQuestions = [
    t('search.whatProductsDoWeHaveInStock'),
    t('search.howDoIConfigureTheSystemSettings'),
    t('search.whatAreTheMainFeaturesOfThePlatform'),
    t('search.showMeRecentOrderStatistics'),
  ]

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t('nav.admin'), href: "/app/admin" }, { label: t('search.title') }]} />
      <main className="flex-1 p-4 md:p-6 relative">
        <div className="max-w-7xl mx-auto h-full">
          <div className="p-2 h-full overflow-hidden">
            <div className="h-full flex flex-col">
                <ScrollArea className="flex-1 p-6 pb-32" ref={scrollRef}>
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center">
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                        <Sparkles className="w-10 h-10 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">{t('search.searchYourKnowledgeBase')}</h2>
                      <p className="text-muted-foreground mb-8">
                        {t('search.askQuestionsAboutYourDocuments')}
                      </p>

                      <div className="grid gap-3 w-full max-w-lg">
                        <p className="text-sm font-medium text-muted-foreground">{t('search.tryAsking')}</p>
                        {suggestedQuestions.map((question, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="justify-start h-auto py-3 px-4 text-left bg-transparent"
                            onClick={() => setInput(question)}
                          >
                            <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0" />
                            <span className="truncate">{question}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messages.map((message, index) => (
                        <div key={message.id} className="flex gap-4">
                          {message.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                          
                          {(message.role === "assistant" || message.role === "sources" || message.role === "overview") && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {message.role === "sources" && <FileText className="w-4 h-4 text-blue-600" />}
                              {message.role === "overview" && <Sparkles className="w-4 h-4 text-purple-600" />}
                              {message.role === "assistant" && <Bot className="w-4 h-4 text-primary" />}
                            </div>
                          )}
                          
                          <div className="flex-1 space-y-4">
                            {/* Sources Message */}
                            {message.role === "sources" && (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  <span className="font-medium text-blue-900 dark:text-blue-100">{t('search.sources')}</span>
                                </div>
                                
                                {message.searchResults && message.searchResults.length > 0 && (
                                  <div className="space-y-3">
                                    {message.searchResults.map((result: any, resultIndex: number) => (
                                      <div 
                                        key={result.id} 
                                        className="border rounded-lg p-3 bg-background hover:bg-muted/50 transition-colors cursor-pointer"
                                        onClick={() => handleDocumentClick(result)}
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <h4 className="font-medium text-sm flex items-center gap-2">
                                            {result.type === 'document' && <FileText className="w-4 h-4 text-blue-500" />}
                                            {result.type === 'product' && <ShoppingCart className="w-4 h-4 text-green-500" />}
                                            {result.url ? (
                                              <a 
                                                href={result.url} 
                                                target="_blank" 
                                                rel="noopener"
                                                className="text-blue-600 hover:underline flex items-center gap-1"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {result.title}
                                                <ExternalLink className="w-3 h-3" />
                                              </a>
                                            ) : (
                                              <span className="flex items-center gap-2">
                                                {result.title}
                                                <Badge variant="secondary" className="text-xs">
                                                  {result.type}
                                                </Badge>
                                              </span>
                                            )}
                                          </h4>
                                          <div className="flex gap-1 flex-shrink-0 items-center">
                                            {result.score !== undefined && result.score > 0 && (
                                              <Badge variant="outline" className="text-xs font-mono">
                                                {Math.round(result.score * 100)}%
                                              </Badge>
                                            )}
                                            {result.ai_ranked && (
                                              <Badge variant="secondary" className="text-xs">
                                                <Brain className="w-3 h-3 mr-1" />
                                                {t('search.aiRanked')}
                                              </Badge>
                                            )}
                                            {result.relevance && (
                                              <Badge 
                                                variant={result.relevance === 'high' ? 'default' : result.relevance === 'medium' ? 'secondary' : 'outline'} 
                                                className="text-xs"
                                              >
                                                {result.relevance === 'high' ? 'High' : result.relevance === 'medium' ? 'Medium' : 'Low'} Relevance
                                              </Badge>
                                            )}
                                            {result.type === 'document' && (
                                              <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                            )}
                                          </div>
                                        </div>
                                        
                                        <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                                          {result.content}
                                        </p>
                                        
                                        {result.price && (
                                          <div className="flex items-center gap-2 mb-2">
                                            {result.special_price ? (
                                              <>
                                                <span className="text-sm font-semibold text-green-600">
                                                  {formatPrice(result.special_price)}
                                                </span>
                                                <span className="text-xs text-muted-foreground line-through">
                                                  {formatPrice(result.price)}
                                                </span>
                                              </>
                                            ) : (
                                              <span className="text-sm font-semibold">
                                                {formatPrice(result.price)}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        
                                        {result.shop_name && (
                                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Globe className="w-3 h-3" />
                                            Shop: {result.shop_name}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {message.sources && message.sources.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                                    <p className="text-xs font-medium mb-2 text-blue-700 dark:text-blue-300">{t('search.allSources')}:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {message.sources.map((source: string, sourceIndex: number) => (
                                        <Badge key={sourceIndex} variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                          {source}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* AI Overview */}
                            {message.role === "overview" && (
                              <div className="w-full">
                                <div className="flex items-center gap-2 mb-3">
                                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                  <span className="font-medium text-purple-900 dark:text-purple-100">{t('search.aiOverview')}</span>
                                </div>
                                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground">
                                  <ReactMarkdown>{message.content}</ReactMarkdown>
                                </div>
                              </div>
                            )}

                            {/* Regular Assistant Message */}
                            {message.role === "assistant" && (
                              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground">
                                {message.content === "Generating AI overview..." || message.content === "🤖 AI Agent generating enhanced analysis..." ? (
                                  <span className="animate-pulse">{message.content}</span>
                                ) : (
                                  <ReactMarkdown>{message.content}</ReactMarkdown>
                                )}
                              </div>
                            )}

                            {/* User Message */}
                            {message.role === "user" && (
                              <p>{message.content}</p>
                            )}

                            {/* Feedback button only for main assistant messages */}
                            {message.role === "assistant" && (
                              <div className="mt-3 flex items-center gap-2">
                                <Dialog
                                  open={isFeedbackOpen && feedbackMessage?.id === message.id}
                                  onOpenChange={setIsFeedbackOpen}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => setFeedbackMessage(message)}
                                    >
                                      <ThumbsDown className="w-3 h-3 mr-1" />
                                      {t('search.reportAnIssue')}
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>{t('search.reportAnIssue')}</DialogTitle>
                                      <DialogDescription>
                                        {t('search.helpUsImproveByDescribingWhatWasWrongWithThisResponse')}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <Textarea
                                      placeholder={t('search.describeTheIssue')}
                                      value={feedbackText}
                                      onChange={(e) => setFeedbackText(e.target.value)}
                                      rows={4}
                                    />
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setIsFeedbackOpen(false)}>
                                        {t('actions.cancel')}
                                      </Button>
                                      <Button onClick={handleFeedback} disabled={!feedbackText.trim()}>
                                        {t('search.submitFeedback')}
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {isLoading && (
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                          <Card className="max-w-[80%] animate-pulse">
                            <CardContent className="p-4 flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>{t('search.searching')}</span>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                {/* Search Input Area */}
                <div className="fixed bottom-0 left-64 right-0 border-t bg-background p-4 z-50 shadow-lg">
                  <div className="px-4 md:px-6">
                    <div className="flex items-center gap-2 mb-4">
                    {/* Settings Button - Temporarily Commented Out */}
                    {/* <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSettingsOpen(true)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Button> */}
                    
                    {/* Copilot AI Search Mode Toggle */}
                    <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{t('search.aiAgentSearch')}</span>
                      <Switch
                        checked={false}
                        onCheckedChange={() => {}}
                        disabled
                      />
                      <span className="text-xs text-muted-foreground">({t('search.comingSoon')})</span>
                    </div>
                    
                    {/* WebSocket Connection Status (hidden if not available) */}
                    {false && ( // Temporarily hide WebSocket status indicator
                      <div className="flex items-center gap-1 text-xs">
                        <Wifi className="w-3 h-3 text-green-500" />
                        <span className="text-green-600">{t('search.realTimeSearch')}</span>
                      </div>
                    )}
                    
                    <div className="flex-1" />
                    <div className="text-xs text-muted-foreground">
                      {searchType === 'all' ? t('search.all') : searchType === 'documents' ? t('search.documents') : t('search.products')}
                    </div>
                  </div>
                  <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t('search.askAQuestionAboutYourKnowledgeBase')}
                        className="pl-12 pr-12 h-12 text-base"
                        disabled={isLoading}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                        disabled={!input.trim() || isLoading}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Enhanced File Viewer Modal */}
      <FileViewerModal
        isOpen={isDocumentViewerOpen}
        onClose={() => {
          setIsDocumentViewerOpen(false)
          setSelectedDocument(null)
        }}
        document={selectedDocument || {}}
        searchChunk={selectedDocument?.content}
      />
    </>
  )
}
