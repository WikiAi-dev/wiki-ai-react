"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { useTranslation } from "@/src/i18n"
import { filesApi, apiRequest } from "@/lib/api"
import { getApiUrl } from "@/lib/config"
import { useUploadStatusPoll } from "@/hooks/use-upload-status-poll"
import { UploadStatusBadge } from "@/components/upload-status-badge"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { UnifiedFileReader } from "@/components/ui/file-reader"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import {
  FileText,
  Upload,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Download,
  Loader2,
  FileCode,
  FileJson,
  File,
  FolderOpen,
  X,
  FileImage,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Share2,
  Printer,
  Brain,
} from "lucide-react"
import { toast } from "sonner"

// Helper function to determine content type from filename
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

interface FileItem {
  name: string
  type: string
  size?: number
  documentId?: string
  // Real indexing status from knowledge-service (pending/indexing/indexed/failed,
  // see WAI-52), as already returned by GET /v1/documents in the list response.
  status?: string
}

interface FileReaderItem {
  filename: string
  size: number
  upload_date: string
  content_type: string
  metadata?: any
  indexed: boolean
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "json":
      return <FileJson className="w-4 h-4 text-yellow-500" />
    case "pdf":
      return <FileText className="w-4 h-4 text-red-500" />
    case "doc":
    case "docx":
      return <FileText className="w-4 h-4 text-blue-600" />
    case "xls":
    case "xlsx":
      return <FileSpreadsheet className="w-4 h-4 text-green-600" />
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
      return <FileImage className="w-4 h-4 text-purple-500" />
    case "md":
    case "txt":
      return <FileText className="w-4 h-4 text-blue-500" />
    case "js":
    case "ts":
    case "py":
    case "html":
    case "css":
      return <FileCode className="w-4 h-4 text-green-500" />
    default:
      return <File className="w-4 h-4 text-muted-foreground" />
  }
}

function getFileType(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "pdf":
      return "PDF"
    case "doc":
      return "Word 97-2003"
    case "docx":
      return "Word Document"
    case "xls":
      return "Excel 97-2003"
    case "xlsx":
      return "Excel Spreadsheet"
    case "png":
      return "PNG Image"
    case "jpg":
    case "jpeg":
      return "JPEG Image"
    case "gif":
      return "GIF Image"
    case "svg":
      return "SVG Image"
    case "md":
      return "Markdown"
    case "txt":
      return "Text"
    case "json":
      return "JSON"
    default:
      return ext?.toUpperCase() || "File"
  }
}

// Enhanced PDF Viewer Component
function normalizePdfBase64Content(content: string) {
  let base64 = (content || "").trim()

  if (base64.startsWith("data:")) {
    const commaIndex = base64.indexOf(",")
    if (commaIndex >= 0) base64 = base64.slice(commaIndex + 1)
  }

  if (base64.includes("%")) {
    try {
      base64 = decodeURIComponent(base64)
    } catch {
      // ignore
    }
  }

  base64 = base64.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/")

  const missingPadding = base64.length % 4
  if (missingPadding) {
    base64 = base64 + "=".repeat(4 - missingPadding)
  }

  return base64
}

function PDFViewer({ filename, content }: { filename: string; content: string }) {
  const [pdfUrl, setPdfUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const viewerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    console.log("PDFViewer: Starting to load PDF", { filename, contentLength: content?.length })

    setIsLoading(true)
    setError("")

    try {
      const base64Content = normalizePdfBase64Content(content)

      console.log("PDFViewer: Processing base64 content", { base64Length: base64Content.length })

      const binaryString = atob(base64Content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      console.log("PDFViewer: Created blob URL", { url })
      setPdfUrl(url)
      setIsLoading(false)

      return () => {
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error("PDFViewer: Error loading PDF", err)
      setError(`Failed to load PDF: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setIsLoading(false)
    }
  }, [content])

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen)

  const shareFile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: filename,
          url: pdfUrl
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      navigator.clipboard.writeText(pdfUrl)
      toast.success('PDF link copied to clipboard')
    }
  }

  const printPDF = () => {
    const printWindow = window.open(pdfUrl, '_blank')
    printWindow?.print()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <FileText className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-destructive mb-2">PDF Loading Failed</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button 
          onClick={() => {
            const base64Content = normalizePdfBase64Content(content)
            const dataUrl = content.startsWith("data:")
              ? content
              : `data:application/pdf;base64,${base64Content}`
            window.open(dataUrl, "_blank")
          }}
          variant="outline"
          size="sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>
    )
  }

  const containerClass = isFullscreen 
    ? "fixed inset-0 z-50 bg-background flex flex-col" 
    : "w-full h-full flex flex-col"

  return (
    <div className={containerClass}>
      {/* Enhanced Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-red-500" />
          <span className="font-medium text-sm truncate max-w-xs">{filename}</span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Navigation */}
          <div className="flex items-center gap-1 mr-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[60px] text-center">
              {currentPage} / {totalPages || '--'}
            </span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0">
              <ZoomOut className="w-3 h-3" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[40px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-8 w-8 p-0">
              <ZoomIn className="w-3 h-3" />
            </Button>
          </div>

          {/* Actions */}
          <Button variant="ghost" size="sm" onClick={handleRotate} className="h-8 w-8 p-0">
            <RotateCw className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={shareFile} className="h-8 w-8 p-0">
            <Share2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={printPDF} className="h-8 w-8 p-0">
            <Printer className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="h-8 w-8 p-0">
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* PDF Container */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900" ref={viewerRef}>
        <div className="flex justify-center p-4">
          <iframe
            src={pdfUrl}
            className="border shadow-lg transition-all duration-200"
            style={{
              width: `${100 * zoom}%`,
              height: isFullscreen ? 'calc(100vh - 120px)' : '60vh',
              transform: `rotate(${rotation}deg)`,
              maxWidth: isFullscreen ? 'none' : '100%'
            }}
            title={`PDF: ${filename}`}
            onLoad={() => console.log("PDFViewer: PDF loaded successfully")}
            onError={(e) => console.error("PDFViewer: iframe error", e)}
          />
        </div>
      </div>

      {/* Fullscreen Exit Hint */}
      {isFullscreen && (
        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm">
          Press ESC or click the minimize button to exit fullscreen
        </div>
      )}
    </div>
  )
}

// Enhanced Word Document Viewer Component
function WordViewer({ filename, content }: { filename: string; content: string }) {
  const [docxUrl, setDocxUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    console.log("WordViewer: Starting to load Word document", { filename, contentLength: content?.length })

    setIsLoading(true)
    setError("")

    try {
      const base64Content = normalizePdfBase64Content(content)

      console.log("WordViewer: Processing base64 content", { base64Length: base64Content.length })

      const binaryString = atob(base64Content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const mimeType = filename.endsWith('.doc') ? 'application/msword' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      const blob = new Blob([bytes], { type: mimeType })
      const url = URL.createObjectURL(blob)

      console.log("WordViewer: Created blob URL", { url, mimeType })
      setDocxUrl(url)
      setIsLoading(false)

      return () => {
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error("WordViewer: Error loading Word document", err)
      setError(`Failed to load Word document: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setIsLoading(false)
    }
  }, [content, filename])

  const handleDownload = () => {
    if (docxUrl) {
      const a = document.createElement('a')
      a.href = docxUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const handleOpenInNewTab = () => {
    if (docxUrl) {
      window.open(docxUrl, '_blank')
    }
  }

  const shareFile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: filename,
          url: docxUrl
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      navigator.clipboard.writeText(docxUrl)
      toast.success('Document link copied to clipboard')
    }
  }

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading Word document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <FileText className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-destructive mb-2">Word Document Loading Failed</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button 
          onClick={() => window.open(`data:application/msword;base64,${content}`, '_blank')}
          variant="outline"
          size="sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Document
        </Button>
      </div>
    )
  }

  const containerClass = isFullscreen 
    ? "fixed inset-0 z-50 bg-background flex flex-col" 
    : "flex flex-col h-full"

  return (
    <div className={containerClass}>
      {/* Enhanced Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-sm truncate max-w-xs">{filename}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={shareFile} className="h-8 w-8 p-0">
            <Share2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8 w-8 p-0">
            <Download className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleOpenInNewTab} className="h-8 w-8 p-0">
            <Eye className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="h-8 w-8 p-0">
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <FileText className="w-24 h-24 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Word Document</h3>
              <p className="text-muted-foreground mb-1">
                {filename.endsWith('.docx') ? 'DOCX' : 'DOC'} Format
              </p>
              <p className="text-sm text-muted-foreground">
                {Math.round(content.length * 0.75 / 1024)} KB
              </p>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This Word document contains formatted content that requires Microsoft Word or a compatible viewer to display properly.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleDownload} className="gap-2">
                  <Download className="w-4 h-4" />
                  Download Document
                </Button>
                <Button onClick={handleOpenInNewTab} variant="outline" className="gap-2">
                  <Eye className="w-4 h-4" />
                  Open in Browser
                </Button>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
                <div className="flex justify-center gap-2">
                  <Button variant="ghost" size="sm" onClick={shareFile} className="gap-1">
                    <Share2 className="w-3 h-3" />
                    Share
                  </Button>
                  <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="gap-1">
                    <Maximize2 className="w-3 h-3" />
                    Fullscreen
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Exit Hint */}
      {isFullscreen && (
        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm">
          Press ESC or click the minimize button to exit fullscreen
        </div>
      )}
    </div>
  )
}

export default function FilesPage() {
  const { t } = useTranslation()
  const { token, isAdmin } = useAuth()
  const [files, setFiles] = useState<FileItem[]>([])
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)

  // View/Edit state
  const [selectedFile, setSelectedFile] = useState<FileReaderItem | null>(null)
  const [fileContent, setFileContent] = useState("")
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [editedContent, setEditedContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Delete state
  const [deleteFile, setDeleteFile] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // AI Response state
  const [aiResponse, setAiResponse] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)

  const fetchFiles = useCallback(async () => {
    if (!token) return

    try {
      const result = await filesApi.list(token)
      if (result.status === "success" && result.response?.documents) {
        const fileItems: FileItem[] = (result.response.documents || []).map((doc: any) => ({
          name: doc.filename || 'Unknown',
          type: getFileType(doc.filename || 'Unknown'),
          size: doc.file_size || 0,
          documentId: doc.document_id || doc.DocumentID || doc.id,
          status: doc.status || doc.Status,
        }))
        setFiles(fileItems)
        setFilteredFiles(fileItems)
      }
    } catch (error) {
      console.error("Failed to fetch files:", error)
      toast.error("Failed to load files")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  useEffect(() => {
    if (searchQuery) {
      const filtered = files.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
      setFilteredFiles(filtered)
    } else {
      setFilteredFiles(files)
    }
  }, [searchQuery, files])

  const uploadPoll = useUploadStatusPoll(token)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files
    if (!uploadedFiles || !token) return

    setIsUploading(true)
    try {
      const result = await filesApi.upload(token, Array.from(uploadedFiles))
      const fileResults = result.response?.results ?? []
      const succeeded = fileResults.filter((r) => r.status === "success")
      const failed = fileResults.filter((r) => r.status === "error")

      if (fileResults.length > 0) {
        // Ingest is asynchronous (WAI-52) - a successful response here means
        // accepted-and-indexing, not finished. Track each accepted file so its
        // live status (pending -> indexing -> indexed/failed) shows in the
        // upload strip instead of the UI just going quiet until it's done.
        uploadPoll.track(
          fileResults.map((r) => ({
            filename: r.filename,
            documentId: r.documentId,
            status: (r.initialStatus as any) || (r.status === "success" ? "pending" : "error"),
            message: r.message,
          })),
        )
      }

      if (succeeded.length > 0) {
        toast.success(`${succeeded.length} file(s) accepted and indexing`)
      }
      if (failed.length > 0) {
        toast.error(failed.length === 1 ? failed[0].message || "Upload failed" : `${failed.length} file(s) failed to upload`)
      }

      fetchFiles()
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload files")
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  // Once every tracked upload reaches a terminal state, refresh the
  // persistent list so its status badges (WAI-55) pick up the final result
  // without waiting for the next manual/periodic fetchFiles() call.
  const uploadEntries = uploadPoll.entries
  const hasRefreshedRef = useRef(true)
  useEffect(() => {
    if (uploadEntries.length === 0) {
      hasRefreshedRef.current = true
      return
    }
    const allTerminal = uploadEntries.every((entry) =>
      ["indexed", "failed", "duplicate", "error"].includes(entry.status),
    )
    if (allTerminal && !hasRefreshedRef.current) {
      hasRefreshedRef.current = true
      fetchFiles()
    } else if (!allTerminal) {
      hasRefreshedRef.current = false
    }
  }, [uploadEntries, fetchFiles])

  const handleViewFile = async (filename: string) => {
    if (!token) return

    setIsLoadingContent(true)
    setIsViewOpen(true)

    try {
      const result = await filesApi.list(token)
      if (result.status === "success" && result.response?.documents) {
        // Find file in list to get actual file data
        const fileData = result.response.documents.find((doc: any) => doc.filename === filename)
        if (fileData) {
          const fileItem: FileReaderItem = {
            filename: fileData.filename || filename,
            size: fileData.file_size || 0,
            upload_date: fileData.upload_timestamp || new Date().toISOString(),
            content_type: 'application/octet-stream',
            indexed: false
          }
          setSelectedFile(fileItem)
          
          // Now get the actual content
          const contentResult = await filesApi.getContent(token, filename)
          if (contentResult.status === "success" && contentResult.response) {
            setFileContent(contentResult.response.content || "")
          } else {
            setFileContent("Failed to load file content")
          }
        } else {
          toast.error("File not found in list")
        }
      }
    } catch (error) {
      console.error("Failed to load file:", error)
      setFileContent("Error loading file content")
    } finally {
      setIsLoadingContent(false)
    }
  }

  const handleEditFile = async (filename: string) => {
    if (!token || !isAdmin) return

    setIsLoadingContent(true)
    setIsEditOpen(true)

    try {
      const result = await filesApi.list(token)
      if (result.status === "success" && result.response?.documents) {
        // Find the file in the list to get actual file data
        const fileData = result.response.documents.find((doc: any) => doc.filename === filename)
        if (fileData) {
          const fileItem: FileReaderItem = {
            filename: fileData.filename || filename,
            size: fileData.file_size || 0,
            upload_date: fileData.upload_timestamp || new Date().toISOString(),
            content_type: getContentType(fileData.filename || filename),
            indexed: false
          }
          setSelectedFile(fileItem)
          
          // Get the actual content
          const contentResult = await filesApi.getContent(token, filename)
          if (contentResult.status === "success" && contentResult.response) {
            setEditedContent(contentResult.response.content || "")
          } else {
            setEditedContent("Failed to load file content")
          }
        } else {
          toast.error("File not found in list")
        }
      }
    } catch (error) {
      console.error("Failed to load file:", error)
      setEditedContent("Error loading file content")
    } finally {
      setIsLoadingContent(false)
    }
  }

  const handleSaveFile = async () => {
    if (!token || !selectedFile || !isAdmin) return

    setIsSaving(true)
    try {
      const result = await filesApi.edit(token, selectedFile.filename, editedContent)
      if (result.status === "success") {
        toast.success("File saved successfully")
        setIsEditOpen(false)
        fetchFiles()
      } else {
        toast.error(result.message || "Failed to save file")
      }
    } catch (error) {
      console.error("Save error:", error)
      toast.error("Failed to save file")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteFile = async () => {
    if (!token || !deleteFile || !isAdmin) return

    setIsDeleting(true)
    try {
      const result = await filesApi.deleteByFilename(token, deleteFile)
      if (result.status === "success") {
        toast.success("File deleted successfully")
        setDeleteFile(null)
        fetchFiles()
      } else {
        toast.error(result.message || "Failed to delete file")
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete file")
    } finally {
      setIsDeleting(false)
    }
  }

  const filesByType = filteredFiles.reduce(
    (acc, file) => {
      const type = file.type
      if (!acc[type]) acc[type] = []
      acc[type].push(file)
      return acc
    },
    {} as Record<string, FileItem[]>,
  )

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t("nav.files") }]} />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("files.title")}</h1>
            {isAdmin ? <p className="text-muted-foreground">{t("files.manageAllUploadedDocuments")}</p> : <p className="text-muted-foreground">{t("files.viewAllAvailableDocuments")}</p>}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button asChild disabled={isUploading}>
                <label className="cursor-pointer">
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("files.uploading")}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {t("files.uploadFiles")}
                    </>
                  )}
                  <input type="file" multiple className="hidden" onChange={handleUpload} disabled={isUploading} />
                </label>
              </Button>
            </div>
          </div>
        </div>

        {uploadPoll.entries.length > 0 && (
          <Card>
            <CardContent className="py-3 space-y-2">
              {uploadPoll.entries.map((entry) => (
                <div
                  key={`${entry.filename}-${entry.documentId ?? "pending"}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getFileIcon(entry.filename)}
                    <span className="truncate">{entry.filename}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <UploadStatusBadge status={entry.status} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => entry.documentId && uploadPoll.dismiss(entry.documentId)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative w-full sm:max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("files.searchFiles")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Badge variant="secondary" className="shrink-0">{filteredFiles.length} {t("files.files")}</Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("files.noFilesFound")}</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchQuery ? t("files.noFilesMatchYourSearchQuery") : t("files.uploadDocumentsToBuildYourKnowledgeBase")}
              </p>
              {!searchQuery && (
                <Button asChild>
                  <label className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    {t("files.uploadFiles")}
                    <input type="file" multiple className="hidden" onChange={handleUpload} />
                  </label>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">{t("files.allFiles")} ({filteredFiles.length})</TabsTrigger>
              {Object.entries(filesByType).map(([type, typeFiles]) => (
                <TabsTrigger key={type} value={type}>
                  {type} ({typeFiles.length})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>{t("files.allFiles")}</CardTitle>
                  <CardDescription>{t("files.allDocumentsInYourKnowledgeBase")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {getFileIcon(file.name)}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{file.type}</p>
                          </div>
                          {file.status && <UploadStatusBadge status={file.status} className="shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                            onClick={() => handleViewFile(file.name)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewFile(file.name)}>
                                <Eye className="w-3 h-3 mr-2" />
                                {t("files.view")}
                              </DropdownMenuItem>
                              {isAdmin && (
                                <DropdownMenuItem onClick={() => handleEditFile(file.name)}>
                                  <Edit className="w-3 h-3 mr-2" />
                                  {t("files.edit")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={async () => {
                                try {
                                  const contentResult = await filesApi.getContent(token || '', file.name)
                                  if (contentResult.status === 'success' && contentResult.response) {
                                    const { content, isBinary } = contentResult.response
                                    
                                    if (isBinary) {
                                      // Handle binary files (base64 content)
                                      const binaryData = atob(content)
                                      const bytes = new Uint8Array(binaryData.length)
                                      for (let i = 0; i < binaryData.length; i++) {
                                        bytes[i] = binaryData.charCodeAt(i)
                                      }
                                      const blob = new Blob([bytes], { type: getContentType(file.name) })
                                      const url = window.URL.createObjectURL(blob)
                                      const link = document.createElement('a')
                                      link.href = url
                                      link.download = file.name
                                      document.body.appendChild(link)
                                      link.click()
                                      document.body.removeChild(link)
                                      window.URL.revokeObjectURL(url)
                                    } else {
                                      // Handle text files
                                      const blob = new Blob([content], { type: getContentType(file.name) })
                                      const url = window.URL.createObjectURL(blob)
                                      const link = document.createElement('a')
                                      link.href = url
                                      link.download = file.name
                                      document.body.appendChild(link)
                                      link.click()
                                      document.body.removeChild(link)
                                      window.URL.revokeObjectURL(url)
                                    }
                                  }
                                } catch (error) {
                                  console.error('Download failed:', error)
                                  toast.error('Failed to download file')
                                }
                              }}>
                                <Download className="w-3 h-3 mr-2" />
                                {t("files.download")}
                              </DropdownMenuItem>
                              {isAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteFile(file.name)}
                                  >
                                    <Trash2 className="w-3 h-3 mr-2" />
                                    {t("files.delete")}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {Object.entries(filesByType).map(([type, typeFiles]) => (
              <TabsContent key={type} value={type}>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("files.typeFiles", { type })}</CardTitle>
                    <CardDescription>
                      {t("files.typeFilesCount", { count: typeFiles.length, type: type.toLowerCase() })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {typeFiles.map((file) => (
                        <div
                          key={file.name}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {getFileIcon(file.name)}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{file.type}</p>
                            </div>
                            {file.status && <UploadStatusBadge status={file.status} className="shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                              onClick={() => handleViewFile(file.name)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewFile(file.name)}>
                                  <Eye className="w-3 h-3 mr-2" />
                                  {t("files.view")}
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <DropdownMenuItem onClick={() => handleEditFile(file.name)}>
                                    <Edit className="w-3 h-3 mr-2" />
                                    {t("files.edit")}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={async () => {
                                  try {
                                    const contentResult = await filesApi.getContent(token || '', file.name)
                                    if (contentResult.status === 'success' && contentResult.response) {
                                      const { content, isBinary } = contentResult.response
                                      
                                      if (isBinary) {
                                        // Handle binary files (base64 content)
                                        const binaryData = atob(content)
                                        const bytes = new Uint8Array(binaryData.length)
                                        for (let i = 0; i < binaryData.length; i++) {
                                          bytes[i] = binaryData.charCodeAt(i)
                                        }
                                      const blob = new Blob([bytes], { type: getContentType(file.name) })
                                        const url = window.URL.createObjectURL(blob)
                                        const link = document.createElement('a')
                                        link.href = url
                                        link.download = file.name
                                        document.body.appendChild(link)
                                        link.click()
                                        document.body.removeChild(link)
                                        window.URL.revokeObjectURL(url)
                                      } else {
                                      // Handle text files
                                      const blob = new Blob([content], { type: getContentType(file.name) })
                                        const url = window.URL.createObjectURL(blob)
                                        const link = document.createElement('a')
                                        link.href = url
                                        link.download = file.name
                                        document.body.appendChild(link)
                                        link.click()
                                        document.body.removeChild(link)
                                        window.URL.revokeObjectURL(url)
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Download failed:', error)
                                    toast.error('Failed to download file')
                                  }
                                }}>
                                  <Download className="w-3 h-3 mr-2" />
                                  {t("files.download")}
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => setDeleteFile(file.name)}
                                    >
                                      <Trash2 className="w-3 h-3 mr-2" />
                                      {t("files.delete")}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* View File Dialog */}
        <UnifiedFileReader
          file={selectedFile}
          token={token}
          open={isViewOpen}
          onOpenChange={setIsViewOpen}
          content={fileContent}
        />

        {/* Edit File Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Edit className="w-5 h-5" />
                <span className="truncate">{t("files.editFile", { filename: selectedFile?.filename })}</span>
              </DialogTitle>
              <DialogDescription>{t("files.makeChangesToTheFileContent")}</DialogDescription>
            </DialogHeader>
            {isLoadingContent ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="h-[40vh] md:h-[50vh] font-mono text-sm resize-none"
              />
            )}
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving} className="w-full sm:w-auto">
                {t("actions.cancel")}
              </Button>
              <Button onClick={handleSaveFile} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("files.saving")}
                  </>
                ) : (
                  t("files.saveChanges")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("files.deleteFile")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("files.areYouSureYouWantToDelete", { filename: deleteFile })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>{t("actions.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteFile}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("files.deleting")}
                  </>
                ) : (
                  t("files.delete")
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  )
}
