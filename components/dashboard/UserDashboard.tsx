'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useTranslation } from '@/src/i18n'
import { useUserFiles } from '@/hooks/useUserData'
import { useUserStore } from '@/lib/store/user-store'
import { useDashboardStore } from '@/lib/store/dashboard-store'
import { getApiUrl } from '@/lib/config'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiRequest, filesApi } from '@/lib/api'
import {
  AlertCircle,
  Plus,
  Download,
  Trash2,
  FileText,
  Search,
  Send,
  Loader2,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DataTable, Column } from './DataTable'

interface UserFile {
  filename: string
  original_filename?: string
  size?: number
  uploaded_at?: string
  id?: string
}

/**
 * User dashboard for file management and queries
 */
export function UserDashboard() {
  const { t } = useTranslation()
  const { token, user } = useAuth()
  const { addNotification } = useDashboardStore()
  const {
    files: storedFiles,
    setFiles,
    selectedFiles,
    toggleFileSelection,
    clearFileSelection,
    recentQueries,
    addRecentQuery,
  } = useUserStore()

  const [queryText, setQueryText] = useState('')
  const [isQueryLoading, setIsQueryLoading] = useState(false)

  // Fetch user files
  const filesData = useUserFiles(token || undefined)

  // Sync fetched data to store. filesData.data is already a stable
  // reference from useUserFiles's own memoization.
  useEffect(() => {
    if (filesData.data && Array.isArray(filesData.data)) {
      setFiles(filesData.data as UserFile[])
    }
  }, [filesData.data, setFiles])

  // File columns
  const fileColumns: Column<UserFile>[] = [
    {
      key: 'filename',
      label: t('dashboard.files'),
      sortable: true,
      width: '50%',
    },
    {
      key: 'size',
      label: t('files.size'),
      sortable: true,
      width: '20%',
      render: (value) =>
        value ? `${(value / 1024).toFixed(2)} KB` : '-',
    },
    {
      key: 'uploaded_at',
      label: t('dashboard.uploading'),
      sortable: true,
      width: '30%',
      render: (value) =>
        value
          ? new Date(value).toLocaleDateString()
          : '-',
    },
  ]

  const handleQuery = async () => {
    if (!queryText.trim()) {
      addNotification(t('search.askAQuestionAboutYourKnowledgeBase'), 'warning')
      return
    }

    setIsQueryLoading(true)
    try {
      // TODO: Call query API when ready
      addRecentQuery(queryText)
      addNotification(t('search.generatingAiOverview'), 'info')
      setQueryText('')
    } catch (error) {
      addNotification(
        `${t('status.error')}: ${error instanceof Error ? error.message : t('status.failed')}`,
        'error'
      )
    } finally {
      setIsQueryLoading(false)
    }
  }

  const handleDownload = async (filename: string) => {
    try {
      const contentResult = await filesApi.getContent(token || '', filename)
      
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
          const blob = new Blob([bytes], { type: getContentType(filename) })
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        } else {
          // Handle text files
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
          const blob = new Blob([content], { type: getContentType(filename) })
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        }
        addNotification(`${t('files.downloadFile')} "${filename}" ${t('status.info')}`, 'info')
      }
    } catch (error) {
      console.error('Download failed:', error)
      addNotification(`Failed to download "${filename}"`, 'error')
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('navigation.dashboard')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('common.welcome')}, {user?.username}! {t('dashboard.uploadDocumentsToBuildYourKnowledgeBase')} {t('search.askQuestionsAboutYourDocuments')}.
        </p>
      </div>

      {/* Query Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('search.askAQuestionAboutYourKnowledgeBase')}</CardTitle>
          <CardDescription>
            {t('search.askQuestionsAboutYourDocuments')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={t('search.askAQuestionAboutYourKnowledgeBase')}
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isQueryLoading) {
                  handleQuery()
                }
              }}
              disabled={isQueryLoading}
            />
            <Button
              onClick={handleQuery}
              disabled={isQueryLoading || !queryText.trim()}
            >
              {isQueryLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Files Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.files')}</CardTitle>
          <CardDescription>
            {t('dashboard.manageAllUploadedDocuments')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filesData.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('dashboard.failedToFetchFiles')}: {filesData.error.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('dashboard.searchFiles')}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {selectedFiles.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      selectedFiles.forEach((filename: string) =>
                        handleDownload(filename)
                      )
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t('actions.download')} ({selectedFiles.length})
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      addNotification(
                        t('dashboard.fileDeletedSuccessfully'),
                        'info'
                      )
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('actions.delete')} ({selectedFiles.length})
                  </Button>
                </>
              )}

              <Button
                size="sm"
                onClick={() => {
                  addNotification(t('dashboard.uploadFiles'), 'info')
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('dashboard.uploadFiles')}
              </Button>
            </div>
          </div>

          <DataTable
            data={storedFiles}
            columns={fileColumns}
            loading={filesData.loading}
            selectable
            selectedRows={selectedFiles}
            onSelectRow={toggleFileSelection}
            onRowClick={(file) => {
              addNotification(
                `Opening "${file.filename}" (preview coming soon)`,
                'info'
              )
            }}
            emptyMessage="No files uploaded yet. Start by uploading a document."
          />
        </CardContent>
      </Card>

      {/* Recent Queries */}
      {recentQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Queries</CardTitle>
            <CardDescription>
              Your last {recentQueries.length} questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentQueries.map((query: any) => (
                <div
                  key={query.id}
                  className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  <p className="text-sm font-medium">{query.question}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(query.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default UserDashboard
