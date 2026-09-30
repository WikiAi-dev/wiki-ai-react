"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  FileText,
  BarChart3,
  Upload,
  Search,
  Eye,
  Edit3,
  Download,
  Clock,
  TrendingUp,
  HardDrive,
  Activity,
  Plus,
  Filter,
  Grid3X3,
  List,
  Star,
  Calendar,
  Tag,
  AlertTriangle,
  CheckCircle,
  Settings,
  Database,
  Shield,
  Globe,
  UserCheck,
  FileCheck,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface UserRoleStats {
  totalUsers: number
  adminUsers: number
  regularUsers: number
  activeUsers: number
  newUsersThisMonth: number
}

interface DocumentStats {
  totalDocuments: number
  publicDocuments: number
  privateDocuments: number
  recentUploads: number
  totalViews: number
  totalDownloads: number
}

interface SystemMetrics {
  systemHealth: number
  apiResponseTime: number
  uptime: number
  storageUsage: number
  querySuccessRate: number
}

export default function RoleBasedDashboard() {
  const { token, user, isAdmin } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [userStats, setUserStats] = useState<UserRoleStats>({
    totalUsers: 0,
    adminUsers: 0,
    regularUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
  })
  const [documentStats, setDocumentStats] = useState<DocumentStats>({
    totalDocuments: 0,
    publicDocuments: 0,
    privateDocuments: 0,
    recentUploads: 0,
    totalViews: 0,
    totalDownloads: 0,
  })
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    systemHealth: 95,
    apiResponseTime: 0.5,
    uptime: 99.9,
    storageUsage: 65,
    querySuccessRate: 98.5,
  })

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!token) return

      try {
        // Simulate loading role-based dashboard data
        // In real implementation, this would fetch actual data from your APIs
        
        if (isAdmin) {
          // Admin sees comprehensive stats
          setUserStats({
            totalUsers: 45,
            adminUsers: 3,
            regularUsers: 42,
            activeUsers: 31,
            newUsersThisMonth: 8,
          })
          
          setDocumentStats({
            totalDocuments: 234,
            publicDocuments: 156,
            privateDocuments: 78,
            recentUploads: 23,
            totalViews: 1250,
            totalDownloads: 340,
          })
        } else {
          // Regular users see limited stats
          setUserStats({
            totalUsers: 45, // Only total count
            adminUsers: 0,
            regularUsers: 0,
            activeUsers: 0,
            newUsersThisMonth: 0,
          })
          
          setDocumentStats({
            totalDocuments: 234,
            publicDocuments: 156,
            privateDocuments: 0, // Users don't see private doc count
            recentUploads: 23,
            totalViews: 1250,
            totalDownloads: 340,
          })
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error)
        toast.error("Failed to load dashboard data")
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [token, isAdmin])

  const getHealthColor = (health: number) => {
    if (health >= 90) return "text-green-600"
    if (health >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getStoragePercentage = () => {
    return systemMetrics.storageUsage
  }

  if (isLoading) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Dashboard" }]} />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </main>
      </>
    )
  }

  return (
    <>
      <AppHeader breadcrumbs={[{ label: "Dashboard" }]} />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* Welcome Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Welcome back, {user?.username}
              </h1>
              <p className="text-muted-foreground">
                {isAdmin 
                  ? "System overview and administration" 
                  : "Your personal dashboard and document management"
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isAdmin ? "default" : "secondary"}>
                {isAdmin ? "Administrator" : "User"}
              </Badge>
              {isAdmin && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/app/admin">
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {isAdmin ? "Total Users" : "Available Documents"}
                  </CardTitle>
                  {isAdmin ? <Users className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isAdmin ? userStats.totalUsers : documentStats.totalDocuments}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? "Registered users" : "In knowledge base"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Documents</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{documentStats.totalDocuments}</div>
                  <p className="text-xs text-muted-foreground">Total files</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">System Health</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getHealthColor(systemMetrics.systemHealth)}`}>
                    {systemMetrics.systemHealth}%
                  </div>
                  <Progress value={systemMetrics.systemHealth} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemMetrics.apiResponseTime}s</div>
                  <p className="text-xs text-muted-foreground">API response</p>
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
                        <p className="font-semibold">Search Knowledge</p>
                        <p className="text-sm text-muted-foreground">Query documents</p>
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
                        <p className="font-semibold">Browse Files</p>
                        <p className="text-sm text-muted-foreground">View documents</p>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>

              {isAdmin && (
                <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
                  <Link href="/app/admin">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                          <Shield className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <p className="font-semibold">Admin Panel</p>
                          <p className="text-sm text-muted-foreground">System management</p>
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Document Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Document Statistics</CardTitle>
                  <CardDescription>Overview of document activity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Total Documents</span>
                    </div>
                    <Badge variant="secondary">{documentStats.totalDocuments}</Badge>
                  </div>
                  
                  {isAdmin && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Public Documents</span>
                        </div>
                        <Badge variant="default">{documentStats.publicDocuments}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-500" />
                          <span className="text-sm">Private Documents</span>
                        </div>
                        <Badge variant="outline">{documentStats.privateDocuments}</Badge>
                      </div>
                    </>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Recent Uploads</span>
                    </div>
                    <Badge variant="secondary">{documentStats.recentUploads}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Total Views</span>
                    </div>
                    <Badge variant="secondary">{documentStats.totalViews}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Total Downloads</span>
                    </div>
                    <Badge variant="secondary">{documentStats.totalDownloads}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Storage Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Storage Usage</CardTitle>
                  <CardDescription>System storage utilization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used Storage</span>
                      <span>{getStoragePercentage()}%</span>
                    </div>
                    <Progress value={getStoragePercentage()} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Available</p>
                      <p className="font-semibold">35 GB</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Used</p>
                      <p className="font-semibold">65 GB</p>
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <div className="pt-4 border-t">
                      <Button variant="outline" size="sm" className="w-full">
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Storage
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* User Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle>User Statistics</CardTitle>
                    <CardDescription>Overview of user activity</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Total Users</span>
                      </div>
                      <Badge variant="secondary">{userStats.totalUsers}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-500" />
                        <span className="text-sm">Admin Users</span>
                      </div>
                      <Badge variant="destructive">{userStats.adminUsers}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Regular Users</span>
                      </div>
                      <Badge variant="default">{userStats.regularUsers}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm">Active Users</span>
                      </div>
                      <Badge variant="secondary">{userStats.activeUsers}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">New This Month</span>
                      </div>
                      <Badge variant="outline">{userStats.newUsersThisMonth}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick User Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Quick actions for user administration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New User
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      View All Users
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-2" />
                      User Permissions
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Activity className="w-4 h-4 mr-2" />
                      User Activity Log
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system events and actions</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {/* Simulated activity items */}
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <FileText className="w-4 h-4 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Document uploaded</p>
                        <p className="text-xs text-muted-foreground">Product catalog updated • 2 hours ago</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Search className="w-4 h-4 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Query performed</p>
                        <p className="text-xs text-muted-foreground">Search for &quot;pricing information&quot; • 3 hours ago</p>
                      </div>
                    </div>
                    
                    {isAdmin && (
                      <>
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <Users className="w-4 h-4 text-purple-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">New user registered</p>
                            <p className="text-xs text-muted-foreground">john_doe joined the platform • 5 hours ago</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <Settings className="w-4 h-4 text-gray-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">System maintenance</p>
                            <p className="text-xs text-muted-foreground">Backup completed successfully • 1 day ago</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}
