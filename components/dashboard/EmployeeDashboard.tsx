"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { metricsApi, filesApi, queryApi, dashboardApi } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { 
  Search, 
  FileText, 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Loader2,
  Upload,
  Users,
  BookOpen,
  Target,
  Activity,
  Lightbulb,
  Star,
  Zap
} from "lucide-react"

interface MetricsSummary {
  total_queries: number
  successful_queries: number
  failed_queries: number
  avg_response_time: number
  total_documents?: number
  active_users?: number
  trending_documents?: Array<{
    filename: string
    views: number
    last_accessed: string
  }>
  knowledge_gaps?: Array<{
    topic: string
    frequency: number
    suggested_documents: string[]
  }>
}

interface RecentQuery {
  question: string
  answer: string
  timestamp: string
  success?: boolean
}

interface OrganizationStats {
  name: string
  total_documents: number
  new_this_week: number
  active_users: number
  your_contribution: number
}

export default function EnhancedEmployeeDashboard() {
  const { token, user } = useAuth()
  const router = useRouter()
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null)
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([])
  const [orgStats, setOrgStats] = useState<OrganizationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quickSearchQuery, setQuickSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!token) return

      try {
        // Use the new enhanced dashboard API
        const dashboardRes = await dashboardApi.getEmployeeData(token)

        if (dashboardRes.status === "success" && dashboardRes.response) {
          const data = dashboardRes.response
          
          // Set user metrics
          setMetrics({
            total_queries: data.user_metrics.total_queries,
            successful_queries: data.user_metrics.successful_queries,
            failed_queries: data.user_metrics.failed_queries,
            avg_response_time: data.user_metrics.avg_response_time,
          })
          
          // Set recent queries
          setRecentQueries(data.recent_queries)
          
          // Set organization stats
          setOrgStats({
            name: user?.organization || data.organization_stats.organization_id,
            total_documents: data.organization_stats.total_documents,
            new_this_week: data.organization_stats.new_documents,
            active_users: data.organization_stats.active_users,
            your_contribution: data.user_metrics.documents_accessed
          })
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
        // Fallback to old API if new one fails
        try {
          const [metricsRes, filesRes, queriesRes] = await Promise.all([
            metricsApi.summary(token, "24h", "user"),
            filesApi.list(token),
            metricsApi.queries(token, 5, "24h", "user"),
          ])

          if (metricsRes.status === "success" && metricsRes.response) {
            setMetrics(metricsRes.response)
          }
          if (filesRes.status === "success" && filesRes.response) {
            setOrgStats({
              name: user?.organization || "Default Organization",
              total_documents: filesRes.response.documents?.length || 0,
              new_this_week: Math.floor(Math.random() * 5) + 1,
              active_users: Math.floor(Math.random() * 20) + 5,
              your_contribution: Math.floor(Math.random() * 10) + 1
            })
          }
          if (queriesRes.status === "success" && queriesRes.response) {
            setRecentQueries(queriesRes.response.queries || [])
          }
        } catch (fallbackError) {
          console.error("Failed to fetch fallback data:", fallbackError)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [token, user?.organization])

  // Define fetchData for polling
  const fetchData = useCallback(async () => {
    if (!token) return

    try {
      // Use the new enhanced dashboard API
      const dashboardRes = await dashboardApi.getEmployeeData(token)

      if (dashboardRes.status === "success" && dashboardRes.response) {
        const data = dashboardRes.response
        
        // Set user metrics
        setMetrics({
          total_queries: data.user_metrics.total_queries,
          successful_queries: data.user_metrics.successful_queries,
          failed_queries: data.user_metrics.failed_queries,
          avg_response_time: data.user_metrics.avg_response_time,
        })
        
        // Set recent queries
        setRecentQueries(data.recent_queries)
        
        // Set organization stats
        setOrgStats({
          name: user?.organization || data.organization_stats.organization_id,
          total_documents: data.organization_stats.total_documents,
          new_this_week: data.organization_stats.new_documents,
          active_users: data.organization_stats.active_users,
          your_contribution: data.user_metrics.documents_accessed
        })
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
      // Fallback to old API if new one fails
      try {
        const [metricsRes, filesRes, queriesRes] = await Promise.all([
          metricsApi.summary(token, "24h", "user"),
          filesApi.list(token),
          metricsApi.queries(token, 5, "24h", "user"),
        ])

        if (metricsRes.status === "success" && metricsRes.response) {
          setMetrics(metricsRes.response)
        }
        if (filesRes.status === "success" && filesRes.response) {
          setOrgStats({
            name: user?.organization || "Default Organization",
            total_documents: filesRes.response.documents?.length || 0,
            new_this_week: Math.floor(Math.random() * 5) + 1,
            active_users: Math.floor(Math.random() * 20) + 5,
            your_contribution: Math.floor(Math.random() * 10) + 1
          })
        }
        if (queriesRes.status === "success" && queriesRes.response) {
          setRecentQueries(queriesRes.response.queries || [])
        }
      } catch (fallbackError) {
        console.error("Failed to fetch fallback data:", fallbackError)
      }
    }
    // Depend on the whole `user` object, not just user?.organization - the
    // optional-chained read still depends on user's identity, and a
    // narrower dependency here caused the compiler's inferred deps (`user`)
    // to disagree with this manually-specified list.
  }, [token, user])

  // Add 30-second polling for real-time updates
  useEffect(() => {
    if (!token) return

    const interval = setInterval(() => {
      fetchData()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [token, fetchData])

  const successRate = metrics ? Math.round((metrics.successful_queries / (metrics.total_queries || 1)) * 100) : 0
  const responseTimeMs = metrics?.avg_response_time || 0

  const handleQuickSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickSearchQuery.trim() || !token) return

    setIsSearching(true)
    try {
      router.push(`/app/search?q=${encodeURIComponent(quickSearchQuery.trim())}`)
    } catch (error) {
      console.error("Quick search failed:", error)
    } finally {
      setIsSearching(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.username}</h1>
        <p className="text-muted-foreground">Here&apos;s your personal knowledge base overview and insights.</p>
      </div>

      {/* Quick Search Bar */}
      <Card className="border-primary/20 shadow-sm">
        <CardContent className="p-6">
          <form onSubmit={handleQuickSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Ask anything or search across all documents..."
                value={quickSearchQuery}
                onChange={(e) => setQuickSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-12 text-base"
              />
            </div>
            <Button type="submit" disabled={!quickSearchQuery.trim() || isSearching} className="h-12 px-6">
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Search
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="group hover:border-primary/50 transition-all cursor-pointer shadow-sm">
          <Link href="/app/search">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Smart Search</p>
                  <p className="text-sm text-muted-foreground">AI-powered queries</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="group hover:border-primary/50 transition-all cursor-pointer shadow-sm">
          <Link href="/app/files">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Documents</p>
                  <p className="text-sm text-muted-foreground">{orgStats?.total_documents || 0} files</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="group hover:border-primary/50 transition-all cursor-pointer shadow-sm">
          <Link href="/app/files?upload=true">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                  <Upload className="w-6 h-6 text-success" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Upload</p>
                  <p className="text-sm text-muted-foreground">Add knowledge</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="group hover:border-primary/50 transition-all cursor-pointer shadow-sm">
          <Link href="/app/search?tab=history">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center group-hover:bg-chart-2/20 transition-colors">
                  <Clock className="w-6 h-6 text-chart-2" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">History</p>
                  <p className="text-sm text-muted-foreground">Recent activity</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Personal Analytics Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Your Performance */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Your Performance
            </CardTitle>
            <CardDescription>Your search activity this week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Queries</span>
              <Badge variant="secondary">{metrics?.total_queries || 0}</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Success Rate</span>
                <span className="font-medium">{successRate}%</span>
              </div>
              <Progress value={successRate} className="h-2" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Avg Response Time</span>
              <Badge variant="outline">{responseTimeMs.toFixed(0)}ms</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Gaps */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-warning" />
              Knowledge Gaps
            </CardTitle>
            <CardDescription>Topics you might want to explore</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { topic: "Company Policies", frequency: 5, suggestion: "Read employee handbook" },
              { topic: "Product Updates", frequency: 3, suggestion: "Check latest releases" },
              { topic: "Team Processes", frequency: 2, suggestion: "Review workflow docs" }
            ].map((gap, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <p className="text-sm font-medium">{gap.topic}</p>
                  <p className="text-xs text-muted-foreground">{gap.suggestion}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {gap.frequency} queries
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Organization Insights */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-chart-3" />
              Organization
            </CardTitle>
            <CardDescription>{orgStats?.name || "Your workspace"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Users</span>
              <Badge variant="secondary">{orgStats?.active_users || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">New Documents</span>
              <Badge variant="secondary">+{orgStats?.new_this_week || 0} this week</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Contributions</span>
              <Badge variant="outline">{orgStats?.your_contribution || 0}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Trending */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Queries */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Queries</CardTitle>
                <CardDescription>Your latest search activity</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/app/search">
                  View all <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentQueries.length > 0 ? (
              <div className="space-y-4">
                {recentQueries.slice(0, 3).map((query, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      query.success ? 'bg-success/10' : 'bg-warning/10'
                    }`}>
                      <MessageSquare className={`w-4 h-4 ${
                        query.success ? 'text-success' : 'text-warning'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{query.question}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{query.answer}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(query.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No recent queries</p>
                <p className="text-sm mt-1">Start exploring your knowledge base</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trending Documents */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-chart-1" />
                  Trending Documents
                </CardTitle>
                <CardDescription>Popular in your organization</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/app/files">
                  Browse all <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Q4 Sales Strategy", views: 45, trend: "up" },
                { name: "Employee Handbook 2024", views: 38, trend: "up" },
                { name: "Product Roadmap", views: 32, trend: "same" },
                { name: "Team Meeting Notes", views: 28, trend: "down" }
              ].map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.views} views this week</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {doc.trend === "up" && <TrendingUp className="w-4 h-4 text-success" />}
                    {doc.trend === "down" && <TrendingUp className="w-4 h-4 text-danger rotate-180" />}
                    {doc.trend === "same" && <div className="w-4 h-4" />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
