"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  FileText, 
  Users, 
  MessageSquare, 
  Phone, 
  TrendingUp,
  LogOut
} from "lucide-react"
import { getCmsEndpointUrl } from "@/lib/config"
import CMSContentManager from "./cms-content-manager"

interface CMSDashboardProps {
  token: string
  onLogout: () => void
}

interface ContentStats {
  blog_stats: {
    total_posts: number
    published_posts: number
    draft_posts: number
    featured_posts: number
  }
  help_stats: {
    total_articles: number
    published_articles: number
    draft_articles: number
    total_views: number
  }
  contact_stats: {
    total_submissions: number
    new_submissions: number
    in_progress_submissions: number
  }
  sales_stats: {
    total_leads: number
    new_leads: number
    qualified_leads: number
  }
}

export default function CMSDashboard({ token, onLogout }: CMSDashboardProps) {
  const [stats, setStats] = useState<ContentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchStats = async () => {
    try {
      const response = await fetch(getCmsEndpointUrl("/content/stats"), {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        setError("Failed to fetch stats")
      }
    } catch (err) {
      setError("Failed to connect to API")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch-on-mount/refresh pattern; fetchStats sets stats/loading/error
    // state from the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats()
  }, [token, refreshKey])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Loading CMS Dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => {
              setError("")
              setRefreshKey(prev => prev + 1)
            }}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-foreground">WikiAI CMS</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => setRefreshKey(prev => prev + 1)}>
                Refresh Stats
              </Button>
              <Button variant="outline" onClick={onLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blog Posts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.blog_stats.total_posts}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.blog_stats.published_posts} published
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Help Articles</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.help_stats.total_articles}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.help_stats.published_articles} published
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contact Submissions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.contact_stats.total_submissions}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.contact_stats.new_submissions} new
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales Leads</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.sales_stats.total_leads}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.sales_stats.qualified_leads} qualified
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Content Management */}
        <CMSContentManager token={token} />
      </main>
    </div>
  )
}
