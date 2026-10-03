"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { ArrowRight, CalendarPlus, Clock, FileText, MessageSquare, Search, Upload } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { filesApi, metricsApi } from "@/lib/api"
import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { PageBody, PageHeader } from "@/components/page-header"
import { StatCard, StatGrid } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { ActivityFeed } from "@/components/connections/activity-feed"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

interface FileItem {
  id: string
  name: string
  type: string
  size?: number
  lastModified?: string
}

interface QuickStats {
  totalFiles: number
  recentUploads: number
  totalQueries: number
  avgResponseTime: number
}

const RECENT_LIMIT = 6

function QuickAction({ href, icon: Icon, title, text }: { href: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-y-px"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold tracking-tight text-foreground">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{text}</span>
      </span>
      <ArrowRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        aria-hidden
      />
    </Link>
  )
}

export default function UserDashboard() {
  const { token, user } = useAuth()
  const { t, locale } = useTranslation()
  const [files, setFiles] = useState<FileItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<QuickStats>({
    totalFiles: 0,
    recentUploads: 0,
    totalQueries: 0,
    avgResponseTime: 0,
  })

  const fetchFiles = useCallback(async () => {
    if (!token) return

    try {
      const result = await filesApi.list(token)
      if (result.status === "success" && result.response) {
        const fileItems: FileItem[] = (result.response.documents || []).map((doc: any, index: number) => {
          // knowledge-service's DocumentResult has no "filename" field - the
          // name is returned as "title" (see models/dtm/document.go).
          const name = doc.title || doc.Title || doc.filename || doc.original_filename || "Unknown"
          return {
            id: doc.document_id || doc.DocumentID || doc.id || `${index}`,
            name,
            type: name.split(".").pop()?.toLowerCase() || "unknown",
            size: doc.size,
            lastModified: doc.uploaded_at || doc.created_at,
          }
        })
        setFiles(fileItems)

        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const recentUploads = fileItems.filter((file) => file.lastModified && new Date(file.lastModified) > weekAgo).length

        setStats((prev) => ({ ...prev, totalFiles: fileItems.length, recentUploads }))
      }
    } catch (error) {
      console.error("Failed to fetch files:", error)
      toast.error(t("dashboard.failedToLoadFiles"))
    } finally {
      setIsLoading(false)
    }
  }, [token, t])

  const fetchStats = useCallback(async () => {
    if (!token) return

    try {
      const result = await metricsApi.summary(token, "24h", "user")
      if (result.status === "success" && result.response) {
        const response = result.response as { total_queries?: number; avg_response_time?: number }
        setStats((prev) => ({
          ...prev,
          totalQueries: response.total_queries || 0,
          avgResponseTime: response.avg_response_time || 0,
        }))
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }, [token])

  useEffect(() => {
    // Fetch-on-mount pattern; fetchFiles/fetchStats set files/stats/loading
    // state from their async responses.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFiles()
    fetchStats()
  }, [fetchFiles, fetchStats])

  // Refresh every 30 seconds so new documents show up without a reload.
  useEffect(() => {
    if (!token) return
    const interval = setInterval(() => {
      fetchFiles()
      fetchStats()
    }, 30000)
    return () => clearInterval(interval)
  }, [token, fetchFiles, fetchStats])

  const recentFiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const matching = query ? files.filter((file) => file.name.toLowerCase().includes(query)) : files
    const time = (file: FileItem) => (file.lastModified ? new Date(file.lastModified).getTime() || 0 : 0)
    return [...matching].sort((a, b) => time(b) - time(a)).slice(0, RECENT_LIMIT)
  }, [searchQuery, files])

  const dateLocale = locale === "ru" ? "ru-RU" : "en-GB"

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null
    const units = locale === "ru" ? ["Б", "КБ", "МБ", "ГБ"] : ["B", "KB", "MB", "GB"]
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    return `${(bytes / Math.pow(1024, i)).toLocaleString(dateLocale, { maximumFractionDigits: 1 })} ${units[i]}`
  }

  const formatDate = (value?: string) => {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })
  }

  const greeting = user?.username ? t("userDashboard.welcomeBack", { username: user.username }) : t("navigation.dashboard")

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t("navigation.dashboard") }]} />
      <PageBody>
        <PageHeader title={greeting} description={t("userDashboard.home.subtitle")} />

        <StatGrid>
          <StatCard
            label={t("userDashboard.home.documents")}
            value={isLoading ? <Skeleton className="h-9 w-16" /> : stats.totalFiles.toLocaleString(dateLocale)}
            hint={t("userDashboard.home.documentsHint")}
            icon={FileText}
          />
          <StatCard
            label={t("userDashboard.home.recent")}
            value={isLoading ? <Skeleton className="h-9 w-12" /> : stats.recentUploads.toLocaleString(dateLocale)}
            hint={t("userDashboard.home.recentHint")}
            icon={CalendarPlus}
          />
          <StatCard
            label={t("userDashboard.home.queries")}
            value={stats.totalQueries.toLocaleString(dateLocale)}
            hint={t("userDashboard.home.queriesHint")}
            icon={MessageSquare}
          />
          <StatCard
            label={t("userDashboard.home.latency")}
            value={
              stats.totalQueries > 0
                ? `${stats.avgResponseTime.toLocaleString(dateLocale, { maximumFractionDigits: 1 })} ${t("userDashboard.home.seconds")}`
                : "—"
            }
            hint={t("userDashboard.home.latencyHint")}
            icon={Clock}
          />
        </StatGrid>

        <div className="grid gap-4 md:grid-cols-2">
          <QuickAction
            href="/app/search"
            icon={Search}
            title={t("userDashboard.home.askTitle")}
            text={t("userDashboard.home.askText")}
          />
          <QuickAction
            href="/app/files"
            icon={FileText}
            title={t("userDashboard.home.filesTitle")}
            text={t("userDashboard.home.filesText")}
          />
        </div>

        <ActivityFeed canConnect={false} />

        <Card className="gap-5">
          <CardHeader>
            <CardTitle>{t("userDashboard.home.recentTitle")}</CardTitle>
            <CardDescription>{t("userDashboard.home.recentText")}</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/app/files">
                  {t("userDashboard.home.viewAll")}
                  <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {files.length > 0 && (
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("userDashboard.home.findPlaceholder")}
                  aria-label={t("userDashboard.home.findPlaceholder")}
                  className="pl-10"
                />
              </div>
            )}

            {isLoading ? (
              <ul className="divide-y divide-border">
                {Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className="flex items-center gap-3 py-3">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : files.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={t("userDashboard.home.emptyTitle")}
                description={t("userDashboard.home.emptyText")}
                action={
                  <Button asChild>
                    <Link href="/app/files">
                      <Upload />
                      {t("userDashboard.home.upload")}
                    </Link>
                  </Button>
                }
              />
            ) : recentFiles.length === 0 ? (
              <EmptyState icon={Search} title={t("userDashboard.home.noMatchTitle")} description={t("userDashboard.home.noMatchText")} />
            ) : (
              <ul className="divide-y divide-border">
                {recentFiles.map((file) => {
                  const meta = [formatDate(file.lastModified), formatFileSize(file.size)].filter(Boolean).join(" · ")
                  return (
                    <li key={file.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                        <FileText className="size-4" strokeWidth={1.75} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                        {meta && <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{meta}</p>}
                      </div>
                      {file.type !== "unknown" && file.type !== file.name.toLowerCase() && (
                        <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {file.type}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </PageBody>
    </>
  )
}
