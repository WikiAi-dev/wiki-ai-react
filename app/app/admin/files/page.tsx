"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
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
import { Checkbox } from "@/components/ui/checkbox"
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
  File,
  Image,
  FileCode,
  FileArchive,
  Calendar,
  User,
  HardDrive,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/src/i18n"

// Helper function to normalize PDF base64 content
function normalizePdfBase64Content(content: string): string {
  const trimmed = content.trim()
  
  if (trimmed.startsWith('data:application/pdf;base64,')) {
    return trimmed.split(',')[1]
  }
  
  if (!trimmed.includes(',') && trimmed.length > 0) {
    return trimmed
  }
  
  if (trimmed.includes(',')) {
    return trimmed.split(',')[1]
  }
  
  return trimmed
}

interface FileItem {
  id?: string | number
  filename: string
  size: number
  upload_date: string
  content_type: string
  metadata?: any
  indexed: boolean
  // Real indexing status from knowledge-service (pending/indexing/indexed/failed,
  // see WAI-52), as already returned by GET /v1/documents in the list response.
  status?: string
}


export default function AdminFilesPage() {
  const { token, user } = useAuth()
  const { t } = useTranslation()
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<{filename: string, id?: number} | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [reindexingId, setReindexingId] = useState<string | number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Multi-select state
  const [selectedFiles, setSelectedFiles] = useState<Set<string | number>>(new Set())
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  const fetchFiles = useCallback(async () => {
    if (!token) return
    
    try {
      setLoading(true)
      const response = await filesApi.list(token)
      if (response.status === "success" && response.response?.documents) {
        // Map API response to FileItem interface
        const mappedFiles = response.response.documents.map((doc: any, index: number) => {
          const title = doc.title || doc.Title || doc.filename || doc.original_filename || `file-${index}`
          const status = doc.status || doc.Status
          return {
            id: doc.document_id || doc.DocumentID || doc.id || doc.ID || `${index}`,
            filename: title,
            size: doc.file_size || doc.size || (typeof doc.content === 'string' ? doc.content.length : 0) || 0,
            upload_date: doc.upload_timestamp || doc.created_at || doc.updated_at || new Date().toISOString(),
            content_type: doc.doc_type || doc.DocType || "application/octet-stream",
            metadata: doc.metadata || null,
            // Older/synchronous responses without a status field are assumed
            // already indexed; when a real status is present, trust it.
            indexed: status ? status === "indexed" : true,
            status,
          }
        })
        setFiles(mappedFiles)
      }
    } catch (error) {
      toast.error(t('files.failedToFetchFiles'))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  // Filter files based on search query
  const filteredFiles = files.filter(file =>
    (file.filename ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const uploadPoll = useUploadStatusPoll(token)

  const handleFileUpload = async () => {
    if (!uploadedFiles.length || !token) return

    setUploading(true)
    try {
      // knowledge-service's ingest endpoint (POST /v1/documents) takes JSON with a plain-text
      // `content` field - there is no multipart/binary upload path. filesApi.upload() reads each
      // file's text client-side (FileReader.readAsText) and posts it as JSON; it rejects files
      // that don't look like text rather than silently uploading garbled binary content.
      //
      // Ingest is asynchronous (WAI-52): "success" here means accepted-and-indexing, not
      // finished, so track each result's live status instead of just reporting a flat count.
      const result = await filesApi.upload(token, uploadedFiles)
      const fileResults = result.response?.results ?? []
      const succeeded = fileResults.filter((r) => r.status === "success")
      const failed = fileResults.filter((r) => r.status === "error")

      if (fileResults.length > 0) {
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
        toast.error(failed.length === 1 ? failed[0].message || "Failed to upload files" : `${failed.length} file(s) failed to upload`)
      }
    } catch (error) {
      toast.error("Failed to upload files")
    } finally {
      setUploadedFiles([])
      setUploading(false)
      fetchFiles()
    }
  }

  // Once every tracked upload reaches a terminal state, refresh the list so
  // its status badges (WAI-55) pick up the final result.
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    setUploadedFiles(prev => [...prev, ...droppedFiles])
  }

  const handleDeleteFile = async () => {
    if (!fileToDelete || !token) return
    
    try {
      let result
      if (fileToDelete.id) {
        // Use delete by ID for better performance
        result = await filesApi.deleteById(token, fileToDelete.id.toString())
      } else {
        // Fallback to delete by filename
        result = await filesApi.deleteByFilename(token, fileToDelete.filename)
      }
      
      if (result.status === "success") {
        toast.success(t('files.fileDeletedSuccessfully'))
        fetchFiles()
      } else {
        toast.error(result.message || t('files.failedToDeleteFile'))
      }
    } catch (error) {
      console.error("Failed to delete file:", error)
      toast.error(t('files.failedToDeleteFile'))
    }
    setFileToDelete(null)
  }

  // Reindex rebuilds a document's chunks/embeddings. knowledge-service has no dedicated reindex
  // endpoint, so filesApi.reindex() deletes and re-ingests the document (see comment there for why
  // a simple re-PUT of identical content wouldn't actually trigger re-chunking). That mints a new
  // document_id, so we just refetch the list afterward rather than trying to patch state in place.
  const handleReindex = async (file: FileItem) => {
    if (!token || !file.id) return

    setReindexingId(file.id)
    try {
      const result = await filesApi.reindex(token, String(file.id))
      if (result.status === "success") {
        toast.success(`Reindexed ${file.filename}`)
        fetchFiles()
      } else {
        toast.error(result.message || `Failed to reindex ${file.filename}`)
      }
    } catch (error) {
      console.error("Failed to reindex file:", error)
      toast.error(`Failed to reindex ${file.filename}`)
    } finally {
      setReindexingId(null)
    }
  }

  // Multi-select functions
  const handleFileSelect = (fileId: number, event: React.MouseEvent) => {
    event.stopPropagation()
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId)
    } else {
      newSelected.add(fileId)
    }
    setSelectedFiles(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id!).filter(id => id !== undefined)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0 || !token) return
    
    try {
      const deletePromises = Array.from(selectedFiles).map(fileId => 
        filesApi.deleteById(token, fileId.toString())
      )
      
      const results = await Promise.all(deletePromises)
      const successCount = results.filter(r => r.status === "success").length
      
      if (successCount === selectedFiles.size) {
        toast.success(`Successfully deleted ${successCount} files`)
      } else {
        toast.success(`Deleted ${successCount} out of ${selectedFiles.size} files`)
      }
      
      setSelectedFiles(new Set())
      setBulkDeleteDialogOpen(false)
      fetchFiles()
    } catch (error) {
      console.error("Failed to delete files:", error)
      toast.error(t('files.failedToDeleteSomeFiles'))
    }
  }

  // NOTE: knowledge-service has no filename-keyed metadata endpoint (documents are addressed by
  // id only, and there's no standalone "edit metadata" route - metadata is just one field of
  // PUT /v1/documents/{id}). There was no real per-file metadata schema to preserve here, so the
  // "Metadata" menu item below is left as an informational no-op instead of wiring it to a
  // nonexistent endpoint. If a real metadata-editing UI is wanted later, it should resolve the
  // document id (see filesApi.edit's resolveDocumentId pattern) and PUT { metadata: {...} } to
  // /v1/documents/{id}.

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + " " + new Date(dateString).toLocaleTimeString()
  }

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) return <Image className="h-4 w-4" />
    if (contentType.includes("pdf")) return <FileText className="h-4 w-4" />
    if (contentType.includes("text") || contentType.includes("code")) return <FileCode className="h-4 w-4" />
    if (contentType.includes("zip") || contentType.includes("archive")) return <FileArchive className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const totalSize = files.reduce((acc, file) => acc + file.size, 0)
  const indexedCount = files.filter(file => file.indexed).length

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t('nav.admin'), href: "/app/admin" }, { label: t('fileManagement.title') }]} />
      <main className="flex-1 p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t('fileManagement.title')}</h1>
          <p className="text-muted-foreground">
            {t('fileManagement.uploadViewAndManageAllDocuments')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('fileManagement.totalFiles')}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{files.length}</div>
              <p className="text-xs text-muted-foreground">{t('fileManagement.documentsUploaded')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('fileManagement.totalSize')}</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFileSize(totalSize)}</div>
              <p className="text-xs text-muted-foreground">{t('fileManagement.storageUsed')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('fileManagement.indexed')}</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{indexedCount}</div>
              <p className="text-xs text-muted-foreground">{t('fileManagement.searchableFiles')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('fileManagement.uploadProgress')}</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uploadedFiles.length}</div>
              <p className="text-xs text-muted-foreground">{t('fileManagement.filesPending')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('fileManagement.uploadFiles')}</CardTitle>
            <CardDescription>
              {t('fileManagement.uploadDocumentsToBuildYourKnowledgeBase')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Drag and Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">
                    {isDragging ? t('fileManagement.dragAndDropFilesHere') : t('fileManagement.dragAndDropFilesHere')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('fileManagement.selectFiles')}
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => setUploadedFiles(Array.from(e.target.files || []))}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('fileManagement.selectFiles')}
                  </Button>
                  {uploadedFiles.length > 0 && (
                    <Button onClick={handleFileUpload} disabled={uploading}>
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('fileManagement.uploading')}
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {t('fileManagement.uploadFiles')} ({uploadedFiles.length} {t('files.files')})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">{t('fileManagement.selectedFiles', { count: uploadedFiles.length })}:</h4>
                  <div className="space-y-1">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <File className="h-4 w-4" />
                        <span>{file.name}</span>
                        <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadPoll.entries.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Indexing status:</h4>
                  <div className="space-y-1">
                    {uploadPoll.entries.map((entry) => (
                      <div
                        key={`${entry.filename}-${entry.documentId ?? "pending"}`}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="truncate">{entry.filename}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <UploadStatusBadge status={entry.status} />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => entry.documentId && uploadPoll.dismiss(entry.documentId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Files List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('files.allFiles')}</CardTitle>
                <CardDescription>
                  {t('files.allDocumentsInYourKnowledgeBase')}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder={t('files.searchFiles')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-80 h-10 bg-background border-input hover:border-primary/50 focus:border-primary transition-colors"
                  />
                </div>
                {filteredFiles.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-md border">
                    <Checkbox
                      checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className="text-sm font-medium text-foreground">
                      {selectedFiles.size === filteredFiles.length ? t('fileManagement.selectNone') : t('fileManagement.selectAll')}
                    </span>
                    {selectedFiles.size > 0 && (
                      <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full">
                        {selectedFiles.size} {t('fileManagement.selectedFiles')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>
                {/* Bulk Actions Bar */}
                {selectedFiles.size > 0 && (
                  <div className="flex items-center justify-between p-4 bg-muted/50 border-b mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        { /* {t('fileManagement.selectedFiles', { count: selectedFiles.size })} */}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFiles(new Set())}
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t('actions.clear')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setBulkDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('fileManagement.deleteFiles')}
                      </Button>
                    </div>
                  </div>
                )}
                
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {filteredFiles.map((file) => (
                      <div 
                        key={file.filename} 
                        className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                          selectedFiles.has(file.id!) ? 'bg-muted/50 border-muted' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedFiles.has(file.id!)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedFiles)
                              if (checked) {
                                newSelected.add(file.id!)
                              } else {
                                newSelected.delete(file.id!)
                              }
                              setSelectedFiles(newSelected)
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {getFileIcon(file.content_type)}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{file.filename}</h4>
                              {file.status && <UploadStatusBadge status={file.status} />}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatFileSize(file.size)}</span>
                              <span>{formatDate(file.upload_date)}</span>
                            </div>
                          </div>
                        </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedFile(file)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            try {
                              const contentResult = await filesApi.getContent(token || '', file.id ? String(file.id) : file.filename)
                              if (contentResult.status === 'success' && contentResult.response) {
                                const { content, isBinary } = contentResult.response
                                
                                if (isBinary) {
                                  // Handle binary files (base64 content)
                                  const binaryData = atob(content)
                                  const bytes = new Uint8Array(binaryData.length)
                                  for (let i = 0; i < binaryData.length; i++) {
                                    bytes[i] = binaryData.charCodeAt(i)
                                  }
                                  // Get proper MIME type based on filename
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
                                      case 'txt': return 'text/plain'
                                      case 'md': return 'text/markdown'
                                      case 'html': return 'text/html'
                                      case 'json': return 'application/json'
                                      case 'xml': return 'application/xml'
                                      case 'csv': return 'text/csv'
                                      default: return 'application/octet-stream'
                                    }
                                  }
                                  const blob = new Blob([bytes], { type: getContentType(file.filename) })
                                  const url = window.URL.createObjectURL(blob)
                                  const link = document.createElement('a')
                                  link.href = url
                                  link.download = file.filename
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                  window.URL.revokeObjectURL(url)
                                } else {
                                  // Handle text files
                                  // Handle text files with proper MIME type
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
                                      case 'txt': return 'text/plain'
                                      case 'md': return 'text/markdown'
                                      case 'html': return 'text/html'
                                      case 'json': return 'application/json'
                                      case 'xml': return 'application/xml'
                                      case 'csv': return 'text/csv'
                                      default: return 'application/octet-stream'
                                    }
                                  }
                                  const blob = new Blob([content], { type: getContentType(file.filename) })
                                  const url = window.URL.createObjectURL(blob)
                                  const link = document.createElement('a')
                                  link.href = url
                                  link.download = file.filename
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                  window.URL.revokeObjectURL(url)
                                }
                              }
                            } catch (error) {
                              console.error('Download failed:', error)
                            }
                          }}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            toast.info("Metadata editing is not available")
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t('fileManagement.metadata')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={reindexingId === file.id}
                            onClick={() => handleReindex(file)}
                          >
                            {reindexingId === file.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Reindex
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setFileToDelete({filename: file.filename, id: file.id})
                              setDeleteDialogOpen(true)
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('actions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                  {filteredFiles.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      {searchQuery ? t('files.noFilesMatchYourSearchQuery') : t('fileManagement.noFilesFound')}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
            )}
          </CardContent>
        </Card>

        {/* File Viewer Dialog */}
        <UnifiedFileReader
          file={selectedFile}
          token={token}
          open={!!selectedFile}
          onOpenChange={(open) => !open && setSelectedFile(null)}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('fileManagement.deleteFile')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('fileManagement.areYouSureYouWantToDelete', { filename: fileToDelete?.filename })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteFile}>
                {t('actions.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('fileManagement.deleteFiles')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('fileManagement.confirmDeleteFiles', { count: selectedFiles.size })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
                {t('fileManagement.deleteFiles')} {selectedFiles.size} {t('files.files')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  )
}
