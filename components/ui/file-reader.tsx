/* @jsx */
"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  FileText,
  File,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Download,
  Maximize2,
  Minimize2,
  Loader2,
  X,
  FileSpreadsheet,
} from "lucide-react"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

interface FileItem {
  id?: string | number
  filename: string
  size: number
  upload_date: string
  content_type: string
  metadata?: any
  indexed: boolean
}

interface FileReaderProps {
  file: FileItem | null
  token: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  showDownload?: boolean
  className?: string
  content?: string | null
}

const getContentType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf': return 'application/pdf'
    case 'doc': return 'application/msword'
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'xls': return 'application/vnd.ms-excel'
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    case 'svg': return 'image/svg+xml'
    default: return 'application/octet-stream'
  }
}

const normalizeBase64Content = (content: string): string => {
  if (!content) return ""
  
  // Remove data URL prefix if present
  if (content.includes(',')) {
    content = content.split(',')[1]
  }
  
  // Remove any whitespace
  content = content.replace(/\s/g, '')
  
  // Ensure proper padding
  while (content.length % 4 !== 0) {
    content += '='
  }
  
  return content
}

// PDF Viewer Component
const PDFViewer: React.FC<{ filename: string; content: string }> = ({ filename, content }) => {
  const [pdfUrl, setPdfUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const viewerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadPDF = async () => {
      if (!content) return

      try {
        const base64Content = normalizeBase64Content(content)
        const binaryString = atob(base64Content)
        const bytes = new Uint8Array(binaryString.length)
        
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        
        setPdfUrl(url)
        setIsLoading(false)
        
        return () => {
          URL.revokeObjectURL(url)
        }
      } catch (error) {
        setError(`Failed to load PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setIsLoading(false)
      }
    }

    loadPDF()
  }, [content])

  // Handle ESC key and fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement
      setIsFullscreen(isCurrentlyFullscreen)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

  const toggleFullscreen = () => {
    if (!viewerRef.current) return
    
    if (!isFullscreen) {
      try {
        if (viewerRef.current.requestFullscreen) {
          viewerRef.current.requestFullscreen()
        }
        setIsFullscreen(true)
      } catch (error) {
        console.warn('Failed to enter fullscreen:', error)
      }
    } else {
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        }
        setIsFullscreen(false)
      } catch (error) {
        console.warn('Failed to exit fullscreen:', error)
        // Update state even if exitFullscreen fails
        setIsFullscreen(false)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div className="relative w-full h-full" ref={viewerRef}>
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="bg-background/80 backdrop-blur-sm"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
      
      <iframe
        src={pdfUrl}
        className="w-full h-full border-0 rounded"
        style={{ 
          minHeight: isFullscreen ? '100vh' : '500px',
          maxWidth: isFullscreen ? 'none' : '100%'
        }}
        title={`PDF: ${filename}`}
      />
    </div>
  )
}

// Word Document Viewer Component
const WordViewer: React.FC<{ filename: string; content: string }> = ({ filename, content }) => {
  const [docxUrl, setDocxUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const viewerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadDocument = async () => {
      if (!content) return

      try {
        const base64Content = normalizeBase64Content(content)
        const binaryString = atob(base64Content)
        const bytes = new Uint8Array(binaryString.length)
        
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        const mimeType = filename.toLowerCase().endsWith('.doc') 
          ? 'application/msword' 
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        
        const blob = new Blob([bytes], { type: mimeType })
        const url = URL.createObjectURL(blob)
        
        setDocxUrl(url)
        setIsLoading(false)
        
        return () => {
          URL.revokeObjectURL(url)
        }
      } catch (error) {
        setError(`Failed to load Word document: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setIsLoading(false)
      }
    }

    loadDocument()
  }, [content, filename])

  // Handle ESC key and fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement
      setIsFullscreen(isCurrentlyFullscreen)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

  const toggleFullscreen = () => {
    if (!viewerRef.current) return
    
    if (!isFullscreen) {
      try {
        if (viewerRef.current.requestFullscreen) {
          viewerRef.current.requestFullscreen()
        }
        setIsFullscreen(true)
      } catch (error) {
        console.warn('Failed to enter fullscreen:', error)
      }
    } else {
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        }
        setIsFullscreen(false)
      } catch (error) {
        console.warn('Failed to exit fullscreen:', error)
        // Update state even if exitFullscreen fails
        setIsFullscreen(false)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div className="relative w-full h-full" ref={viewerRef}>
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="bg-background/80 backdrop-blur-sm"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
      
      <iframe
        src={docxUrl}
        className="w-full h-full border-0 rounded"
        style={{ 
          minHeight: isFullscreen ? '100vh' : '400px',
          maxWidth: isFullscreen ? 'none' : '100%'
        }}
        title={`Word Document: ${filename}`}
      />
    </div>
  )
}

// Excel Viewer Component
const ExcelViewer: React.FC<{ filename: string; content: string }> = ({ filename, content }) => {
  const [excelUrl, setExcelUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const viewerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadExcel = async () => {
      if (!content) return

      try {
        const base64Content = normalizeBase64Content(content)
        const binaryString = atob(base64Content)
        const bytes = new Uint8Array(binaryString.length)
        
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        const mimeType = filename.toLowerCase().endsWith('.xls') 
          ? 'application/vnd.ms-excel' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        
        const blob = new Blob([bytes], { type: mimeType })
        const url = URL.createObjectURL(blob)
        
        setExcelUrl(url)
        setIsLoading(false)
        
        return () => {
          URL.revokeObjectURL(url)
        }
      } catch (error) {
        setError(`Failed to load Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setIsLoading(false)
      }
    }

    loadExcel()
  }, [content, filename])

  // Handle ESC key and fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement
      setIsFullscreen(isCurrentlyFullscreen)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

  const toggleFullscreen = () => {
    if (!viewerRef.current) return
    
    if (!isFullscreen) {
      try {
        if (viewerRef.current.requestFullscreen) {
          viewerRef.current.requestFullscreen()
        }
        setIsFullscreen(true)
      } catch (error) {
        console.warn('Failed to enter fullscreen:', error)
      }
    } else {
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        }
        setIsFullscreen(false)
      } catch (error) {
        console.warn('Failed to exit fullscreen:', error)
        // Update state even if exitFullscreen fails
        setIsFullscreen(false)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div className="relative w-full h-full" ref={viewerRef}>
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="bg-background/80 backdrop-blur-sm"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
      
      <iframe
        src={excelUrl}
        className="w-full h-full border-0 rounded"
        style={{ 
          minHeight: isFullscreen ? '100vh' : '400px',
          maxWidth: isFullscreen ? 'none' : '100%'
        }}
        title={`Excel File: ${filename}`}
      />
    </div>
  )
}

// Image Viewer Component
const ImageViewer: React.FC<{ filename: string; content: string }> = ({ filename, content }) => {
  const [imageUrl, setImageUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const viewerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadImage = async () => {
      if (!content) return

      try {
        let url: string
        
        if (content.startsWith('data:image')) {
          url = content
        } else {
          const base64Content = normalizeBase64Content(content)
          const binaryString = atob(base64Content)
          const bytes = new Uint8Array(binaryString.length)
          
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          
          const mimeType = `image/${filename.split('.').pop()?.toLowerCase() || 'png'}`
          const blob = new Blob([bytes], { type: mimeType })
          url = URL.createObjectURL(blob)
        }
        
        setImageUrl(url)
        setIsLoading(false)
        
        return () => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url)
          }
        }
      } catch (error) {
        setError(`Failed to load image: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setIsLoading(false)
      }
    }

    loadImage()
  }, [content, filename])

  // Handle ESC key and fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement
      setIsFullscreen(isCurrentlyFullscreen)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

  const toggleFullscreen = () => {
    if (!viewerRef.current) return
    
    if (!isFullscreen) {
      try {
        if (viewerRef.current.requestFullscreen) {
          viewerRef.current.requestFullscreen()
        }
        setIsFullscreen(true)
      } catch (error) {
        console.warn('Failed to enter fullscreen:', error)
      }
    } else {
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        }
        setIsFullscreen(false)
      } catch (error) {
        console.warn('Failed to exit fullscreen:', error)
        // Update state even if exitFullscreen fails
        setIsFullscreen(false)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div className="relative w-full h-full" ref={viewerRef}>
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="bg-background/80 backdrop-blur-sm"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="flex items-center justify-center h-full">
        {/* Kept as <img>, not next/image: imageUrl is a client-generated blob:/data: URI (see
            loadImage above), not a static/remote URL - not a safe next/image use case. */}
        <img
          src={imageUrl}
          alt={filename}
          className="max-w-full max-h-full object-contain rounded"
          style={{ 
            maxHeight: isFullscreen ? '100vh' : '500px'
          }}
        />
      </div>
    </div>
  )
}

// Markdown Viewer Component with optimization for large files
const MarkdownViewer: React.FC<{ content: string }> = ({ content }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [showFull, setShowFull] = useState(false)
  const [fontSize, setFontSize] = useState <'sm' | 'base' | 'lg' | 'xl'>('base')
  const CHUNK_SIZE = 5000
  const INITIAL_CHUNK_SIZE = 2000

  useEffect(() => {
    // Syncs loading state to the content prop - content arrives fully
    // loaded from the parent, so there's nothing async to await here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(false)
  }, [content])

  const displayContent = showFull ? content : content.substring(0, INITIAL_CHUNK_SIZE)
  const hasMore = content.length > displayContent.length

  const fontSizeClasses = {
    sm: 'prose-sm',
    base: 'prose-base',
    lg: 'prose-lg',
    xl: 'prose-xl',
  }

  const fontSizeStyles = {
    sm: { fontSize: '0.875rem' },
    base: { fontSize: '1rem' },
    lg: { fontSize: '1.125rem' },
    xl: { fontSize: '1.25rem' },
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col max-h-full">
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <span className="text-xs text-muted-foreground">Markdown Preview</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Font:</span>
          {(['sm', 'base', 'lg', 'xl'] as const).map((size) => (
            <Button
              key={size}
              variant={fontSize === size ? 'default' : 'ghost'}
              onClick={() => setFontSize(size)}
              className="h-6 px-2 text-xs"
            >
              {size === 'sm' ? 'S' : size === 'base' ? 'M' : size === 'lg' ? 'L' : 'XL'}
            </Button>
          ))}
        </div>
      </div>
      <ScrollArea className="flex-1 rounded-md border-t-0 p-4 max-h-[50vh] md:max-h-[60vh] overflow-auto">
        <div
          className={`prose ${fontSizeClasses[fontSize]} max-w-3xl dark:prose-invert prose-headings:scroll-mt-2 prose-headings:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:bg-muted/20 prose-blockquote:pl-4 prose-blockquote:py-1 prose-blockquote:rounded-r prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:text-foreground prose-pre:max-w-full prose-pre:overflow-x-auto prose-li:marker:text-muted-foreground prose-th:bg-muted prose-th:font-medium prose-td:border-muted/50`}
          style={fontSizeStyles[fontSize]}
        >
          <ReactMarkdown
            components={{
              a({ node, href, children, ...props }) {
                const isExternal = href?.startsWith('http://') || href?.startsWith('https://')
                return (
                  <a
                    href={href}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    className="text-blue-600 dark:text-blue-400 underline-offset-2 hover:underline"
                    {...props}
                  >
                    {isExternal && (
                      <svg className="inline w-3 h-3 ml-0.5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    )}
                    {children}
                  </a>
                )
              },
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-md !bg-muted !p-4 !my-4 text-sm"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-medium" {...props}>
                    {children}
                  </code>
                )
              },
              img({ node, alt, ...props }) {
                // Kept as <img>, not next/image: this renders arbitrary markdown image
                // syntax with an unbounded/unknown src (any URL the document author wrote),
                // which next/image can't handle generically without width/height or a
                // remotePatterns allowlist.
                return (
                  <img
                    className="rounded-lg border max-h-64 object-contain"
                    alt={alt || "Image from document"}
                    {...props}
                  />
                )
              },
              table({ node, ...props }) {
                return (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm" {...props} />
                  </div>
                )
              },
              hr({ node }) {
                return <hr className="my-6 border-t border-muted" />
              },
            }}
          >
            {displayContent}
          </ReactMarkdown>
        </div>
      </ScrollArea>

      {hasMore && (
        <div className="flex gap-2 p-4 border-t bg-muted/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFull(true)}
            className="flex-1"
          >
            Show Full Content
          </Button>
        </div>
      )}
    </div>
  )
}

// Text/Code Viewer Component
const TextViewer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <ScrollArea className="h-full rounded-md border p-4 max-h-[50vh] md:max-h-[60vh] overflow-auto">
      <pre className="text-sm font-mono whitespace-pre-wrap break-words">{content}</pre>
    </ScrollArea>
  )
}

interface FileViewerContentProps {
  file: FileItem
  token: string | null
}

// Main File Content Viewer
const FileContentViewer: React.FC<FileViewerContentProps> = ({ file, token }) => {
  const [content, setContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const loadContent = async () => {
      if (!token || (!file.id && !file.filename)) return
      
      try {
        // Import filesApi dynamically to avoid circular dependencies
        const { filesApi } = await import("@/lib/api")
        const response = await filesApi.getContent(token, file.id ? String(file.id) : file.filename)
        
        if (response.status === "success") {
          setContent(response.response.content || "")
        } else {
          setContent("Failed to load file content")
        }
      } catch (err) {
        console.error("Failed to load file content:", err)
        // Provide more specific error messages based on the error
        let errorMessage = "Error loading file content"
        if (err instanceof Error) {
          if (err.message.includes('404') || err.message.includes('Not Found')) {
            errorMessage = "File not found on server"
          } else if (err.message.includes('403') || err.message.includes('Unauthorized')) {
            errorMessage = "Access denied - you don't have permission to view this file"
          } else if (err.message.includes('500')) {
            errorMessage = "Server error - please try again later"
          } else {
            errorMessage = `Error loading file: ${err.message}`
          }
        }
        setContent(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    // Only try to load content if no content prop was provided and we have a token and filename
    if (!content && file.filename && token) {
      // Fetch-on-condition pattern; loadContent sets content/loading state
      // from the async response.
      loadContent()
    } else if (content) {
      // Content is already provided as prop, no need to fetch - syncing it
      // into local state directly.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContent(content)
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [file.filename, token, content])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {error}
      </div>
    )
  }

  const filename = file.filename.toLowerCase()
  
  if (filename.endsWith('.pdf')) {
    return <PDFViewer filename={file.filename} content={content} />
  }
  
  if (filename.endsWith('.doc') || filename.endsWith('.docx')) {
    return <WordViewer filename={file.filename} content={content} />
  }
  
  if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) {
    return <ExcelViewer filename={file.filename} content={content} />
  }
  
  if (filename.endsWith('.md') || filename.endsWith('.markdown')) {
    return <MarkdownViewer content={content} />
  }
  
  if (file.content_type.startsWith('image/')) {
    return <ImageViewer filename={file.filename} content={content} />
  }
  
  return <TextViewer content={content} />
}

// Main FileReader Component
export const UnifiedFileReader: React.FC<FileReaderProps> = ({ 
  file, 
  token, 
  open, 
  onOpenChange, 
  showDownload = true, 
  className = "",
  content 
}) => {
  const getFileIcon = (contentType: string, filename?: string) => {
    if (contentType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    if (contentType.includes("pdf")) return <FileText className="h-4 w-4" />
    if (contentType.includes("text") || contentType.includes("code")) return <FileCode className="h-4 w-4" />
    if (contentType.includes("sheet") || contentType.includes("excel")) return <FileSpreadsheet className="h-4 w-4" />
    if (contentType.includes("word") || contentType.includes("document")) return <FileText className="h-4 w-4" />
    if (contentType.includes("zip") || contentType.includes("archive")) return <FileArchive className="h-4 w-4" />
    if (filename?.toLowerCase().endsWith('.md') || filename?.toLowerCase().endsWith('.markdown')) return <FileCode className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  // Builds a Blob from either text or base64-encoded content, auto-detecting which.
  const contentToBlob = (rawContent: string, mimeType: string): Blob => {
    let processedContent = rawContent
    if (processedContent.startsWith('data:')) {
      processedContent = processedContent.split(',')[1] || processedContent
    }
    try {
      const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(processedContent)
      if (isBase64 && processedContent.length > 0 && processedContent.length % 4 === 0) {
        const binaryString = atob(processedContent)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        return new Blob([bytes], { type: mimeType })
      }
      return new Blob([processedContent], { type: mimeType })
    } catch {
      return new Blob([processedContent], { type: mimeType })
    }
  }

  const handleDownload = async () => {
    if (!file) {
      console.error('Cannot download: No file provided')
      return
    }
    try {
      const mimeType = file.content_type || getContentType(file.filename) || 'application/octet-stream'

      let resolvedContent: string
      if (content) {
        resolvedContent = content
      } else {
        if (!token) {
          throw new Error('No content or token available for download')
        }
        // knowledge-service addresses documents by id only - there is no filename-keyed
        // /content route. filesApi.getContent() resolves an id from a filename via a
        // list-and-match lookup internally when given one, then fetches
        // GET /v1/documents/{id}.
        const { filesApi } = await import("@/lib/api")
        const contentResult = await filesApi.getContent(token, file.id ? String(file.id) : file.filename)
        if (contentResult.status !== 'success' || !contentResult.response) {
          throw new Error(contentResult.message || 'Failed to fetch file content')
        }
        resolvedContent = contentResult.response.content
      }

      const blob = contentToBlob(resolvedContent, mimeType)
      const url = window.URL.createObjectURL(blob)

      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = file.filename
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
      // Provide user-friendly error messages
      let message = 'Download failed'
      if (err instanceof Error) {
        if (err.message.includes('404') || err.message.includes('Not Found')) {
          message = 'File not found on server'
        } else if (err.message.includes('403') || err.message.includes('Unauthorized')) {
          message = "Access denied - insufficient permissions"
        } else {
          message = `Download error: ${err.message}`
        }
      }
      // There is no working "open the raw file in a new tab" fallback: knowledge-service has no
      // public unauthenticated content URL, and window.open() can't attach an Authorization
      // header anyway. Surface the failure instead of silently opening a URL that would 401.
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-[95vw] md:max-w-4xl max-h-[90vh] w-full ${className}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {file && getFileIcon(file.content_type, file.filename)}
            <span className="truncate max-w-[95vw]">
                {file && file.filename && file.filename.length > 70
                    ? file.filename.slice(0, 67) + '...' 
                    : file?.filename}
            </span>
          </DialogTitle>
          <DialogDescription>
            File content preview
          </DialogDescription>
        </DialogHeader>
        
        {file && (
          <div className="h-[50vh] md:h-[60vh]">
            <FileContentViewer file={file} token={token} />
          </div>
        )}
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {showDownload && file && (
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default UnifiedFileReader
