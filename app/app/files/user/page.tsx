"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  FileText,
  Upload,
  Search,
  Eye,
  Download,
  Clock,
  TrendingUp,
  Users,
  HardDrive,
  Activity,
  Plus,
  Calendar,
  Tag,
  Star,
  Filter,
  Grid3X3,
  List,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface UserFile {
  id: string
  name: string
  type: string
  size: number
  lastModified: string
  tags: string[]
  starred: boolean
  downloads: number
  views: number
}

interface UserStats {
  totalFiles: number
  totalSize: number
  recentUploads: number
  totalViews: number
  totalDownloads: number
}

export default function UserFilesPage() {
  const { token, user } = useAuth()
  const [files, setFiles] = useState<UserFile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"name" | "date" | "size" | "views">("date")
  const [stats, setStats] = useState<UserStats>({
    totalFiles: 0,
    totalSize: 0,
    recentUploads: 0,
    totalViews: 0,
    totalDownloads: 0,
  })

  const fetchFiles = async () => {
    if (!token) return

    try {
      // Simulate fetching user files - in real implementation, this would call filesApi.list(token)
      const mockFiles: UserFile[] = [
        {
          id: "1",
          name: "Product Catalog 2024.pdf",
          type: "pdf",
          size: 2048576,
          lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          tags: ["catalog", "products", "2024"],
          starred: true,
          downloads: 15,
          views: 45,
        },
        {
          id: "2",
          name: "User Manual.docx",
          type: "docx",
          size: 1024576,
          lastModified: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
          tags: ["manual", "documentation"],
          starred: false,
          downloads: 8,
          views: 23,
        },
        {
          id: "3",
          name: "Sales Report Q1.xlsx",
          type: "xlsx",
          size: 512576,
          lastModified: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
          tags: ["report", "sales", "q1"],
          starred: true,
          downloads: 12,
          views: 34,
        },
        {
          id: "4",
          name: "Company Policies.md",
          type: "md",
          size: 256576,
          lastModified: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
          tags: ["policies", "hr"],
          starred: false,
          downloads: 5,
          views: 18,
        },
        {
          id: "5",
          name: "Technical Documentation.pdf",
          type: "pdf",
          size: 3072576,
          lastModified: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(),
          tags: ["technical", "documentation", "api"],
          starred: false,
          downloads: 20,
          views: 67,
        },
      ]
      
      setFiles(mockFiles)

      // Calculate stats
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 7)
      const recentUploads = mockFiles.filter(file => 
        new Date(file.lastModified) > recentDate
      ).length
      
      setStats({
        totalFiles: mockFiles.length,
        totalSize: mockFiles.reduce((acc, file) => acc + file.size, 0),
        recentUploads,
        totalViews: mockFiles.reduce((acc, file) => acc + file.views, 0),
        totalDownloads: mockFiles.reduce((acc, file) => acc + file.downloads, 0),
      })
    } catch (error) {
      console.error("Failed to fetch files:", error)
      toast.error("Failed to load files")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Fetch-on-mount pattern; fetchFiles sets files/stats/loading state
    // (currently from mock data, matching the eventual real API shape).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFiles()
  }, [token])

  // Derived directly from files/searchQuery/selectedTags/sortBy during
  // render instead of a separate state+effect.
  const filteredFiles = useMemo(() => {
    let filtered = files

    if (searchQuery) {
      filtered = filtered.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((file) =>
        selectedTags.some(tag => file.tags.includes(tag))
      )
    }

    // Sort files (filtered is always a fresh array from .filter() above,
    // or a fresh copy here when no filter ran, so this never mutates the
    // files state array).
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "date":
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        case "size":
          return b.size - a.size
        case "views":
          return b.views - a.views
        default:
          return 0
      }
    })
  }, [searchQuery, selectedTags, files, sortBy])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    // Simulate file upload - in real implementation, this would call filesApi.upload
    toast.success(`${files.length} file(s) uploaded successfully`)
    fetchFiles()
    e.target.value = ""
  }

  const handleViewFile = (file: UserFile) => {
    // Increment view count
    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, views: f.views + 1 } : f
    ))
    toast.info(`Viewing ${file.name}`)
  }

  const handleDownloadFile = (file: UserFile) => {
    // Increment download count
    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, downloads: f.downloads + 1 } : f
    ))
    toast.success(`Downloading ${file.name}`)
  }

  const toggleStar = (fileId: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, starred: !f.starred } : f
    ))
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
        return <FileText className="w-4 h-4 text-green-600" />
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

  const allTags = Array.from(new Set(files.flatMap(file => file.tags)))

  return (
    <>
      <AppHeader breadcrumbs={[{ label: "Files" }]} />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Files</h1>
              <p className="text-muted-foreground">Manage and organize your documents</p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild>
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Files
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                </label>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/app/documents/editor">
                  <Eye className="mr-2 h-4 w-4" />
                  Document Editor
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* User Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFiles}</div>
              <p className="text-xs text-muted-foreground">Documents uploaded</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
              <p className="text-xs text-muted-foreground">Storage used</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentUploads}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalViews}</div>
              <p className="text-xs text-muted-foreground">Document views</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Downloads</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDownloads}</div>
              <p className="text-xs text-muted-foreground">File downloads</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Section */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="date">Date</option>
                  <option value="name">Name</option>
                  <option value="size">Size</option>
                  <option value="views">Views</option>
                </select>
              </div>

              {/* View Mode */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              >
                {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
              </Button>
            </div>

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Filter by tags:</span>
                <div className="flex flex-wrap gap-2">
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
          </CardContent>
        </Card>

        {/* Files Display */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                  {filteredFiles.length} of {files.length} files
                </CardDescription>
              </div>
              <Badge variant="outline">
                {filteredFiles.length} files
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No files found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || selectedTags.length > 0 
                    ? "No files match your search criteria" 
                    : "Upload your first documents to get started"
                  }
                </p>
                <Button asChild>
                  <label className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Files
                    <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                  </label>
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFiles.map((file) => (
                      <Card key={file.id} className="hover:shadow-md transition-shadow group">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getFileIcon(file.type)}
                              <span className="text-sm font-medium truncate max-w-[120px]">
                                {file.name}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => toggleStar(file.id)}
                            >
                              <Star className={`w-4 h-4 ${file.starred ? 'text-yellow-500 fill-current' : ''}`} />
                            </Button>
                          </div>
                          
                          <div className="space-y-2 text-xs text-muted-foreground mb-3">
                            <div className="flex justify-between">
                              <span>Size:</span>
                              <span>{formatFileSize(file.size)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Modified:</span>
                              <span>{formatDate(file.lastModified)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Views:</span>
                              <span>{file.views}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Downloads:</span>
                              <span>{file.downloads}</span>
                            </div>
                          </div>
                          
                          {file.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {file.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => handleViewFile(file)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => handleDownloadFile(file)}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {getFileIcon(file.type)}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{file.name}</p>
                              {file.starred && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)} • {formatDate(file.lastModified)} • 
                              {file.views} views • {file.downloads} downloads
                            </p>
                            {file.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {file.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStar(file.id)}
                          >
                            <Star className={`w-4 h-4 ${file.starred ? 'text-yellow-500 fill-current' : ''}`} />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleViewFile(file)}>
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDownloadFile(file)}>
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  )
}
