"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { filesApi, metricsApi, reportsApi } from "@/lib/api"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  FileText,
  Upload,
  Search,
  Eye,
  Edit3,
  Download,
  Clock,
  TrendingUp,
  Users,
  HardDrive,
  Activity,
  Plus,
  Filter,
  Grid3X3,
  List,
  Star,
  Calendar,
  Tag,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useTranslation } from "@/src/i18n"

interface FileItem {
  id: string
  name: string
  type: string
  size?: number
  lastModified?: string
  tags?: string[]
  starred?: boolean
}

interface QuickStats {
  totalFiles: number
  recentUploads: number
  totalQueries: number
  avgResponseTime: number
}

export default function UserDashboard() {
  const { token, user } = useAuth()
  const { t } = useTranslation()
  const [files, setFiles] = useState<FileItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [stats, setStats] = useState<QuickStats>({
    totalFiles: 0,
    recentUploads: 0,
    totalQueries: 0,
    avgResponseTime: 0,
  })

  const fetchFiles = async () => {
    if (!token) return

    try {
      const result = await filesApi.list(token)
      if (result.status === "success" && result.response) {
        const fileItems: FileItem[] = (result.response.documents || []).map((doc: any, index: number) => {
          // knowledge-service's DocumentResult has no "filename" field - the
          // name is returned as "title" (see models/dtm/document.go).
          const name = doc.title || doc.Title || doc.filename || doc.original_filename || 'Unknown'
          return {
            id: doc.document_id || doc.DocumentID || doc.id || `${index}`,
            name,
            type: name.split('.').pop()?.toLowerCase() || 'unknown',
            size: doc.size,
            lastModified: doc.uploaded_at || doc.created_at,
            tags: doc.tags || [],
            starred: Math.random() > 0.7, // Simulate some starred files
          }
        })
        setFiles(fileItems)

        // Update stats
        const recentDate = new Date()
        recentDate.setDate(recentDate.getDate() - 7)
        const recentUploads = fileItems.filter(file => 
          file.lastModified && new Date(file.lastModified) > recentDate
        ).length
        
        setStats(prev => ({
          ...prev,
          totalFiles: fileItems.length,
          recentUploads,
        }))
      }
    } catch (error) {
      console.error("Failed to fetch files:", error)
      toast.error(t('dashboard.failedToLoadFiles'))
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!token) return

    try {
      const result = await metricsApi.summary(token, "24h", "user")
      if (result.status === "success" && result.response) {
        const response = result.response as any
        setStats(prev => ({
          ...prev,
          totalQueries: response?.total_queries || 0,
          avgResponseTime: response?.avg_response_time || 0,
        }))
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  useEffect(() => {
    // Fetch-on-mount pattern; fetchFiles/fetchStats set files/stats/loading
    // state from their async responses.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFiles()
    fetchStats()
  }, [token])

  // Add 30-second polling for real-time updates
  useEffect(() => {
    if (!token) return

    const interval = setInterval(() => {
      fetchFiles()
      fetchStats()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [token])

  // Derived directly from files/searchQuery/selectedTags during render
  // instead of a separate state+effect.
  const filteredFiles = useMemo(() => {
    let filtered = files

    if (searchQuery) {
      filtered = filtered.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((file) =>
        selectedTags.some(tag => file.tags?.includes(tag))
      )
    }

    return filtered
  }, [searchQuery, selectedTags, files])

  const allTags = Array.from(new Set(files.flatMap(file => file.tags || [])))

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase()
    switch (ext) {
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return t('dashboard.unknownSize')
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('dashboard.unknownDate')
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t('dashboard.title') }]} />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* Welcome Section */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t('common.welcome')} back, {user?.username}
            </h1>
            <p className="text-muted-foreground">
              {t('dashboard2.manageYourDocumentsAndExploreTheKnowledgeBase')}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard2.totalDocuments')}</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFiles}</div>
              <p className="text-xs text-muted-foreground">{t('dashboard2.inYourKnowledgeBase')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard2.recentUploads')}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentUploads}</div>
              <p className="text-xs text-muted-foreground">{t('dashboard2.last7Days')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard2.queriesMade')}</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQueries}</div>
              <p className="text-xs text-muted-foreground">{t('dashboard2.totalSearches')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard2.responseTime')}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResponseTime.toFixed(1)}s</div>
              <p className="text-xs text-muted-foreground">{t('dashboard2.averageQueryTime')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
            <Link href="/app/search">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Search className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{t('userDashboard.searchKnowledge')}</p>
                    <p className="text-sm text-muted-foreground">{t('userDashboard.queryYourDocuments')}</p>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
            <Link href="/app/files">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <FileText className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold">{t('dashboard2.browseFiles')}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard2.viewAllDocuments')}</p>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
            <Link href="/app/catalogs">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center group-hover:bg-chart-3/20 transition-colors">
                    <Grid3X3 className="w-6 h-6 text-chart-3" />
                  </div>
                  <div>
                    <p className="font-semibold">{t('userDashboard.catalogs')}</p>
                    <p className="text-sm text-muted-foreground">{t('userDashboard.productSearch')}</p>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Recent Files Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('dashboard2.recentDocuments')}</CardTitle>
                <CardDescription>{t('dashboard2.yourLatestUploadedFiles')}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                >
                  {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/app/files">{t('dashboard2.viewAll')}</Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('files.searchFiles')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-background"
                />
              </div>
              <div className="flex items-center gap-2">
                {allTags.slice(0, 3).map(tag => (
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

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('dashboard2.noDocumentsFound')}</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? t('dashboard.noDocumentsMatchYourSearch') : t('dashboard.noDocumentsUploadedYet')}
                </p>
                <Button asChild>
                  <Link href="/app/files">
                    <Upload className="w-4 h-4 mr-2" />
                    {t('dashboard2.uploadDocuments')}
                  </Link>
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFiles.slice(0, 6).map((file) => (
                      <Card key={file.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getFileIcon(file.name)}
                              <span className="text-sm font-medium truncate max-w-[120px]">
                                {file.name}
                              </span>
                            </div>
                            {file.starred && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                          </div>
                          <div className="space-y-2 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Size:</span>
                              <span>{formatFileSize(file.size)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Modified:</span>
                              <span>{formatDate(file.lastModified)}</span>
                            </div>
                          </div>
                          {file.tags && file.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {file.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 mt-4">
                            <Button size="sm" variant="outline" className="flex-1">
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1">
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
                    {filteredFiles.slice(0, 6).map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {getFileIcon(file.name)}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)} • {formatDate(file.lastModified)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {file.starred && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                          <Button size="sm" variant="ghost">
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost">
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
