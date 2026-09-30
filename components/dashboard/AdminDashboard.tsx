'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useAdminUsers, useAdminFiles, useAdminReports } from '@/hooks/useAdminData'
import { useAdminStore } from '@/lib/store/admin-store'
import { useDashboardStore } from '@/lib/store/dashboard-store'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Plus, Trash2, Edit2, Users, FileText, BarChart3, Lock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DataTable, Column } from './DataTable'

interface AdminUser {
  id: string
  user_id?: string
  username: string
  email?: string
  role: string
  created_at?: string
}

interface AdminFile {
  id: string
  filename: string
  size?: number
  uploaded_at?: string
}

interface AdminReport {
  id: string
  name: string
  type: string
  created_at?: string
}

/**
 * Admin dashboard for managing users, files, and reports
 * STRICTLY restricted to admin/owner roles only
 */
export function AdminDashboard() {
  const router = useRouter()
  const { token, user, isLoading: authLoading } = useAuth()
  const { addNotification } = useDashboardStore()
  
  // Strict permission check - must be admin or owner
  const isAuthorizedAdmin = user && (user.role === 'admin' || user.role === 'owner')

  // Redirect unauthorized users
  useEffect(() => {
    if (!authLoading && !isAuthorizedAdmin) {
      router.push('/dashboard')
    }
  }, [authLoading, isAuthorizedAdmin, router])

  const {
    users,
    files,
    reports,
    setUsers,
    setFiles,
    setReports,
    selectedUsers,
    selectedFiles,
    selectedReports,
    toggleUserSelection,
    toggleFileSelection,
    toggleReportSelection,
    activeTab,
    setActiveTab,
    loadingUsers,
    loadingFiles,
    loadingReports,
  } = useAdminStore()

  // Fetch data with auto-refresh every 30 seconds
  const usersData = useAdminUsers(token || undefined, false, { autoRefreshInterval: 30000 })
  const filesData = useAdminFiles(token || undefined, false, { autoRefreshInterval: 30000 })
  const reportsData = useAdminReports(token || undefined, false, { autoRefreshInterval: 30000 })

  // Sync fetched data to store. usersData.data/filesData.data/reportsData.data
  // are already stable references from useAdminData's own memoization, so
  // these can depend on them directly without a JSON.stringify workaround.
  useEffect(() => {
    if (usersData.data) {
      setUsers(usersData.data as AdminUser[])
    }
  }, [usersData.data, setUsers])

  useEffect(() => {
    if (filesData.data) {
      setFiles(filesData.data as AdminFile[])
    }
  }, [filesData.data, setFiles])

  useEffect(() => {
    if (reportsData.data) {
      setReports(reportsData.data as AdminReport[])
    }
  }, [reportsData.data, setReports])

  // Show access denied if not authorized. This must come after every hook
  // call above - hooks can't run conditionally, so an early return before
  // them would make the hook count differ between the "still loading" and
  // "resolved unauthorized" renders and crash with "Rendered more hooks
  // than during the previous render".
  if (!authLoading && !isAuthorizedAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="text-sm text-muted-foreground">
              Only administrators can access this panel.
            </p>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state
  const isLoading =
    usersData.loading || filesData.loading || reportsData.loading

  // User columns
  const userColumns: Column<AdminUser>[] = [
    {
      key: 'username',
      label: 'Username',
      sortable: true,
      width: '30%',
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      width: '35%',
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      width: '20%',
      render: (value) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
          {value || 'user'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      width: '15%',
      render: (value) =>
        value
          ? new Date(value).toLocaleDateString()
          : '-',
    },
  ]

  // File columns
  const fileColumns: Column<AdminFile>[] = [
    {
      key: 'filename',
      label: 'Filename',
      sortable: true,
      width: '50%',
    },
    {
      key: 'size',
      label: 'Size',
      sortable: true,
      width: '20%',
      render: (value) =>
        value ? `${(value / 1024).toFixed(2)} KB` : '-',
    },
    {
      key: 'uploaded_at',
      label: 'Uploaded',
      sortable: true,
      width: '30%',
      render: (value) =>
        value
          ? new Date(value).toLocaleDateString()
          : '-',
    },
  ]

  // Report columns
  const reportColumns: Column<AdminReport>[] = [
    {
      key: 'name',
      label: 'Report Name',
      sortable: true,
      width: '40%',
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      width: '30%',
      render: (value) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
          {value || 'general'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      width: '30%',
      render: (value) =>
        value
          ? new Date(value).toLocaleDateString()
          : '-',
    },
  ]

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage users, files, and system reports
          </p>
        </div>
        <Button
          onClick={() => {
            usersData.refetch()
            filesData.refetch()
            reportsData.refetch()
          }}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Refreshing...
            </>
          ) : (
            <>
              <span>↻</span>
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{files.length}</div>
            <p className="text-xs text-muted-foreground">Uploaded documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">Generated reports</p>
          </CardContent>
        </Card>
      </div>

      {/* Errors */}
      {usersData.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load users: {usersData.error.message}
          </AlertDescription>
        </Alert>
      )}

      {filesData.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load files: {filesData.error.message}
          </AlertDescription>
        </Alert>
      )}

      {reportsData.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load reports: {reportsData.error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Management</CardTitle>
          <CardDescription>
            View and manage users, files, and reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users">
                Users ({users.length})
              </TabsTrigger>
              <TabsTrigger value="files">
                Files ({files.length})
              </TabsTrigger>
              <TabsTrigger value="reports">
                Reports ({reports.length})
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {selectedUsers.length > 0 && (
                    <span>
                      {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  {selectedUsers.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        addNotification(
                          'Delete users functionality coming soon',
                          'info'
                        )
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      addNotification(
                        'Create user form coming soon',
                        'info'
                      )
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </div>

              <DataTable
                data={users}
                columns={userColumns}
                loading={usersData.loading}
                selectable
                selectedRows={selectedUsers}
                onSelectRow={toggleUserSelection}
                emptyMessage="No users found"
              />
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {selectedFiles.length > 0 && (
                    <span>
                      {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  {selectedFiles.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        addNotification(
                          'Delete files functionality coming soon',
                          'info'
                        )
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </Button>
                  )}
                </div>
              </div>

              <DataTable
                data={files}
                columns={fileColumns}
                loading={filesData.loading}
                selectable
                selectedRows={selectedFiles}
                onSelectRow={toggleFileSelection}
                emptyMessage="No files found"
              />
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {selectedReports.length > 0 && (
                    <span>
                      {selectedReports.length} report{selectedReports.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    addNotification(
                      'Generate report functionality coming soon',
                      'info'
                    )
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </div>

              <DataTable
                data={reports}
                columns={reportColumns}
                loading={reportsData.loading}
                selectable
                selectedRows={selectedReports}
                onSelectRow={toggleReportSelection}
                emptyMessage="No reports found"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminDashboard
