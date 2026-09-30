"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { filesApi } from "@/lib/api"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  FileText,
  Upload,
  Search,
  Eye,
  Edit3,
  Download,
  Save,
  X,
  Plus,
  Grid3X3,
  List,
  Star,
  Calendar,
  Tag,
  FileImage,
  FileCode,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

interface Document {
  id: string
  name: string
  type: string
  size: number
  lastModified: string
  content?: string
  tags: string[]
  starred: boolean
}

export default function DocumentEditor() {
  const { token, isAdmin } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const fetchDocuments = async () => {
    if (!token) return

    try {
      const result = await filesApi.list(token)
      if (result.status === "success" && result.response) {
        const docs: Document[] = (result.response.documents || []).map((doc: any, index: number) => ({
          id: doc.file_id || doc.filename || `doc-${index}`,
          name: doc.original_filename || doc.filename || 'Unknown Document',
          type: doc.filename?.split('.').pop()?.toLowerCase() || 'unknown',
          size: doc.size || 0,
          lastModified: doc.uploaded_at || doc.created_at || new Date().toISOString(),
          tags: doc.tags || [],
          starred: Math.random() > 0.8, // Simulate some starred documents
        }))
        setDocuments(docs)
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      toast.error("Failed to load documents")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Fetch-on-mount pattern; fetchDocuments sets documents/loading state
    // from the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocuments()
  }, [token])

  // Derived directly from documents/searchQuery/selectedTags during render
  // instead of a separate state+effect.
  const filteredDocuments = useMemo(() => {
    let filtered = documents

    if (searchQuery) {
      filtered = filtered.filter((doc) =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((doc) =>
        selectedTags.some(tag => doc.tags.includes(tag))
      )
    }

    return filtered
  }, [searchQuery, selectedTags, documents])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !token) return

    setIsUploading(true)
    try {
      const result = await filesApi.upload(token!, Array.from(files))
      if (result.status === "success") {
        toast.success(`${files.length} file(s) uploaded successfully`)
        fetchDocuments()
      } else {
        toast.error(result.message || "Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload files")
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  const handleEditDocument = async (document: Document) => {
    if (!isAdmin) {
      toast.error("Admin access required to edit documents")
      return
    }

    setSelectedDocument(document)
    setIsLoading(true)

    try {
      const result = await filesApi.getContent(token!, document.name)
      if (result.status === "success" && result.response) {
        setEditedContent(result.response.content || "")
        setIsEditing(true)
      } else {
        toast.error("Failed to load document content")
      }
    } catch (error) {
      console.error("Failed to load document:", error)
      toast.error("Error loading document")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveDocument = async () => {
    if (!selectedDocument || !token || !isAdmin) return

    setIsSaving(true)
    try {
      const result = await filesApi.edit(token!, selectedDocument.name, editedContent)
      if (result.status === "success") {
        toast.success("Document saved successfully")
        setIsEditing(false)
        setSelectedDocument(null)
        fetchDocuments()
      } else {
        toast.error(result.message || "Failed to save document")
      }
    } catch (error) {
      console.error("Save error:", error)
      toast.error("Failed to save document")
    } finally {
      setIsSaving(false)
    }
  }

  const handleViewDocument = async (document: Document) => {
    setSelectedDocument(document)
    setIsLoading(true)

    try {
      const result = await filesApi.getContent(token!, document.name)
      if (result.status === "success" && result.response) {
        setSelectedDocument(prev => prev ? { ...prev, content: result.response.content } : null)
      } else {
        toast.error("Failed to load document content")
      }
    } catch (error) {
      console.error("Failed to load document:", error)
      toast.error("Error loading document")
    } finally {
      setIsLoading(false)
    }
  }

  const getFileIcon = (type: string) => {
    switch (type) {
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
        return <FileImage className="w-4 h-4 text-purple-500" />
      case "js":
      case "ts":
      case "py":
      case "html":
      case "css":
        return <FileCode className="w-4 h-4 text-yellow-500" />
      case "txt":
      case "md":
        return <FileText className="w-4 h-4 text-gray-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-400" />
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const allTags = Array.from(new Set(documents.flatMap(doc => doc.tags)))

  const canEdit = isAdmin

  return (
    <>
      <AppHeader breadcrumbs={[{ label: "Documents", href: "/app/files" }, { label: "Editor" }]} />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Document Editor</h1>
              <p className="text-muted-foreground">
                {canEdit ? "View and edit documents" : "View documents"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              >
                {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
              </Button>
              {canEdit && (
                <Button asChild disabled={isUploading}>
                  <label className="cursor-pointer">
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </>
                    )}
                    <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                  </label>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Document List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Select a document to view or edit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Tag Filter */}
                {allTags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Filter by tags</Label>
                    <div className="flex flex-wrap gap-1">
                      {allTags.map(tag => (
                        <Button
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTags(prev => 
                            prev.includes(tag) 
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          )}
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document List */}
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : filteredDocuments.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No documents found</p>
                      </div>
                    ) : (
                      filteredDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedDocument?.id === doc.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => handleViewDocument(doc)}
                        >
                          <div className="flex items-start gap-2">
                            {getFileIcon(doc.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-sm font-medium truncate">{doc.name}</p>
                                {doc.starred && <Star className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0" />}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(doc.size)} • {formatDate(doc.lastModified)}
                              </p>
                              {doc.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {doc.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditDocument(doc)
                              }}
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Document Viewer/Editor */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {selectedDocument ? selectedDocument.name : "Select a document"}
                    </CardTitle>
                    {selectedDocument && (
                      <CardDescription>
                        {selectedDocument.type.toUpperCase()} • {formatFileSize(selectedDocument.size)}
                      </CardDescription>
                    )}
                  </div>
                  {selectedDocument && (
                    <div className="flex items-center gap-2">
                      {canEdit && !isEditing && (
                        <Button
                          size="sm"
                          onClick={() => handleEditDocument(selectedDocument)}
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      )}
                      {isEditing && (
                        <>
                          <Button
                            size="sm"
                            onClick={handleSaveDocument}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsEditing(false)
                              setSelectedDocument(null)
                            }}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedDocument ? (
                  <div className="h-[500px]">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : isEditing ? (
                      <div className="h-full space-y-4">
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          placeholder="Document content..."
                          className="h-[450px] font-mono text-sm"
                        />
                      </div>
                    ) : (
                      <ScrollArea className="h-[450px]">
                        <div className="p-4">
                          {selectedDocument.content ? (
                            <pre className="whitespace-pre-wrap text-sm font-mono">
                              {selectedDocument.content}
                            </pre>
                          ) : (
                            <div className="text-center py-12">
                              <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                              <p className="text-muted-foreground">No content available</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[500px]">
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No document selected</h3>
                      <p className="text-muted-foreground">
                        Choose a document from the list to view or edit
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  )
}
