"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { redirect } from "next/navigation"
import { AlertTriangle, CircleCheck, Clock, FileText, MessageSquare, MessageSquareText, Users } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useAuth } from "@/lib/auth-context"
import { metricsApi, reportsApi, filesApi, adminApi } from "@/lib/api"
import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { PageBody, PageHeader } from "@/components/page-header"
import { StatCard, StatGrid } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

interface MetricsSummary {
  total_queries: number
  successful_queries: number
  failed_queries: number
  avg_response_time: number
}

interface Report {
  id: string
  question?: string
  feedback?: string
  timestamp: string
}

interface VolumePoint {
  date: string
  fullDate?: string
  queries: number
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}/

/**
 * One point per day for the whole period, so days without queries read as
 * zero instead of being skipped. Falls back to the raw points when the
 * service labels days in some other format.
 */
function dailySeries(points: VolumePoint[], days: number): VolumePoint[] {
  const keyed = points.filter((p) => ISO_DAY.test(p.fullDate || p.date))
  if (points.length > 0 && keyed.length === 0) return points
  const byDay = new Map(keyed.map((p) => [(p.fullDate || p.date).slice(0, 10), p.queries || 0]))
  const now = new Date()
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1 - i)))
    const date = day.toISOString().slice(0, 10)
    return { date, queries: byDay.get(date) ?? 0 }
  })
}

const PERIODS = [7, 14, 30, 90]

const tooltipStyle = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "12px",
  color: "var(--color-popover-foreground)",
  fontSize: "13px",
}

function DashboardSkeleton() {
  return (
    <PageBody>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-full max-w-md" />
      </div>
      <StatGrid>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[132px] rounded-2xl" />
        ))}
      </StatGrid>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-[380px] rounded-2xl" />
        <Skeleton className="h-[380px] rounded-2xl" />
      </div>
    </PageBody>
  )
}

function ReportList({ reports, icon: Icon, text }: { reports: Report[]; icon: typeof AlertTriangle; text: (r: Report) => string }) {
  const { locale } = useTranslation()
  return (
    <ScrollArea className="h-[320px]">
      <ul className="divide-y divide-border">
        {reports.map((report) => (
          <li key={report.id} className="flex items-start gap-3 py-3.5 first:pt-0">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-4" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug text-foreground text-pretty">{text(report)}</p>
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                {new Date(report.timestamp).toLocaleString(locale === "ru" ? "ru-RU" : "en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </ScrollArea>
  )
}

export default function AdminDashboardPage() {
  const { token, isAdmin, isLoading: authLoading } = useAuth()
  const { t, locale } = useTranslation()
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null)
  const [autoReports, setAutoReports] = useState<Report[]>([])
  const [manualReports, setManualReports] = useState<Report[]>([])
  const [fileCount, setFileCount] = useState(0)
  const [userCount, setUserCount] = useState(0)
  const [volumeData, setVolumeData] = useState<VolumePoint[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState(7)
  const [isLoading, setIsLoading] = useState(true)
  const [isVolumeLoading, setIsVolumeLoading] = useState(false)

  const handlePeriodChange = (newPeriod: number) => {
    setSelectedPeriod(newPeriod)
    setIsVolumeLoading(true)
  }

  const fetchData = useCallback(async () => {
    if (!token || !isAdmin) return

    try {
      const [metricsRes, filesRes, usersRes, volumeRes] = await Promise.all([
        metricsApi.summary(token, "24h", "global"),
        filesApi.list(token),
        adminApi.listAccounts(token),
        metricsApi.volume(token, selectedPeriod, "global"),
      ])

      if (metricsRes.status === "success" && metricsRes.response) {
        setMetrics(metricsRes.response)
      }
      if (filesRes.status === "success" && filesRes.response) {
        setFileCount(filesRes.response.documents?.length || 0)
      }
      if (usersRes.status === "success" && usersRes.response) {
        setUserCount(usersRes.response.accounts?.length || 0)
      }
      if (volumeRes.status === "success" && volumeRes.response) {
        setVolumeData(volumeRes.response.data || [])
      }
      setIsVolumeLoading(false)

      const [autoRes, manualRes] = await Promise.all([reportsApi.getAuto(token), reportsApi.getManual(token)])
      if (autoRes.status === "success" && autoRes.response) {
        setAutoReports((autoRes.response as { reports?: Report[] }).reports || [])
      }
      if (manualRes.status === "success" && manualRes.response) {
        setManualReports((manualRes.response as { reports?: Report[] }).reports || [])
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [token, isAdmin, selectedPeriod])

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      redirect("/app")
    }
  }, [authLoading, isAdmin])

  useEffect(() => {
    if (isAdmin) {
      // Fetch-on-condition pattern; fetchData sets dashboard stats state
      // from the async response.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData()
    }
  }, [isAdmin, fetchData])

  // Refresh every 30 seconds so the numbers stay current.
  useEffect(() => {
    if (!isAdmin || !token) return
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [isAdmin, token, fetchData])

  const series = useMemo(() => dailySeries(volumeData, selectedPeriod), [volumeData, selectedPeriod])

  const header = <AppHeader breadcrumbs={[{ label: t("navigation.dashboard") }]} />

  if (authLoading || isLoading) {
    return (
      <>
        {header}
        <DashboardSkeleton />
      </>
    )
  }

  if (!isAdmin) {
    return null
  }

  const dateLocale = locale === "ru" ? "ru-RU" : "en-GB"
  const formatDay = (value: string) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(dateLocale, { day: "numeric", month: "short" })
  }

  const total = metrics?.total_queries || 0
  const answered = metrics?.successful_queries || 0
  const unanswered = metrics?.failed_queries || 0
  const answeredShare = total > 0 ? Math.round((answered / total) * 100) : null
  const outcomeTotal = answered + unanswered
  const hasVolume = series.some((point) => point.queries > 0)

  return (
    <>
      {header}
      <PageBody>
        <PageHeader title={t("admin.overview.title")} description={t("admin.overview.subtitle")} />

        <StatGrid>
          <StatCard
            label={t("admin.overview.queries")}
            value={total.toLocaleString(dateLocale)}
            hint={t("admin.overview.queriesHint")}
            icon={MessageSquare}
          />
          <StatCard
            label={t("admin.overview.answered")}
            value={answeredShare === null ? "—" : `${answeredShare}%`}
            hint={t("admin.overview.answeredHint")}
            icon={CircleCheck}
          />
          <StatCard
            label={t("admin.overview.documents")}
            value={fileCount.toLocaleString(dateLocale)}
            hint={t("admin.overview.documentsHint")}
            icon={FileText}
          />
          <StatCard
            label={t("admin.overview.users")}
            value={userCount.toLocaleString(dateLocale)}
            hint={t("admin.overview.usersHint")}
            icon={Users}
          />
        </StatGrid>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>{t("admin.overview.volume")}</CardTitle>
              <CardDescription>{t("admin.overview.volumeHint")}</CardDescription>
              <CardAction>
                <Select value={selectedPeriod.toString()} onValueChange={(value) => handlePeriodChange(Number(value))}>
                  <SelectTrigger className="w-[124px]" aria-label={t("admin.selectPeriod")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((days) => (
                      <SelectItem key={days} value={days.toString()}>
                        {t(`admin.${days}days`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardAction>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className={isVolumeLoading ? "h-[280px] opacity-50 transition-opacity" : "h-[280px] transition-opacity"}>
                {hasVolume ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <defs>
                        <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.24} />
                          <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="var(--color-border)" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDay}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={24}
                        tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(label) => formatDay(String(label))}
                        formatter={(value) => [value, t("admin.overview.queriesCount")]}
                        cursor={{ stroke: "var(--color-border)" }}
                      />
                      <Area isAnimationActive={false} type="monotone" dataKey="queries" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#volumeFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    icon={MessageSquare}
                    title={t("admin.overview.noQueries")}
                    description={t("admin.overview.noQueriesHint")}
                    className="h-full justify-center py-0"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="gap-5">
            <CardHeader>
              <CardTitle>{t("admin.overview.outcomes")}</CardTitle>
              <CardDescription>{t("admin.overview.outcomesHint")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
              <div>
                <p className="text-4xl font-semibold tracking-tight tabular-nums">{total.toLocaleString(dateLocale)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("admin.overview.queriesCount")}</p>
              </div>
              <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                {outcomeTotal > 0 && (
                  <>
                    <div className="bg-success transition-[width]" style={{ width: `${(answered / outcomeTotal) * 100}%` }} />
                    <div className="bg-destructive transition-[width]" style={{ width: `${(unanswered / outcomeTotal) * 100}%` }} />
                  </>
                )}
              </div>
              <dl className="divide-y divide-border text-sm">
                <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                  <dt className="flex items-center gap-2.5 text-muted-foreground">
                    <span className="size-2.5 rounded-full bg-success" aria-hidden />
                    {t("admin.overview.withAnswer")}
                  </dt>
                  <dd className="font-medium tabular-nums">{answered.toLocaleString(dateLocale)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="flex items-center gap-2.5 text-muted-foreground">
                    <span className="size-2.5 rounded-full bg-destructive" aria-hidden />
                    {t("admin.overview.withoutAnswer")}
                  </dt>
                  <dd className="font-medium tabular-nums">{unanswered.toLocaleString(dateLocale)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
                  <dt className="flex items-center gap-2.5 text-muted-foreground">
                    <Clock className="size-3.5" strokeWidth={1.75} aria-hidden />
                    {t("admin.overview.avgLatency")}
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {(metrics?.avg_response_time || 0).toLocaleString(dateLocale, { maximumFractionDigits: 2 })} {t("admin.overview.seconds")}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <Card className="gap-5">
          <CardHeader>
            <CardTitle>{t("admin.overview.reportsTitle")}</CardTitle>
            <CardDescription>{t("admin.overview.reportsHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="auto" className="gap-5">
              <TabsList>
                <TabsTrigger value="auto">
                  {t("admin.overview.unansweredTab")}
                  <span className="tabular-nums opacity-70">{autoReports.length}</span>
                </TabsTrigger>
                <TabsTrigger value="manual">
                  {t("admin.overview.feedbackTab")}
                  <span className="tabular-nums opacity-70">{manualReports.length}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="auto">
                {autoReports.length > 0 ? (
                  <ReportList reports={autoReports} icon={AlertTriangle} text={(r) => r.question || t("admin.noQuestionRecorded")} />
                ) : (
                  <EmptyState
                    icon={CircleCheck}
                    title={t("admin.overview.noUnanswered")}
                    description={t("admin.overview.noUnansweredHint")}
                  />
                )}
              </TabsContent>

              <TabsContent value="manual">
                {manualReports.length > 0 ? (
                  <ReportList reports={manualReports} icon={MessageSquareText} text={(r) => r.feedback || t("admin.noFeedbackProvided")} />
                ) : (
                  <EmptyState
                    icon={MessageSquareText}
                    title={t("admin.overview.noFeedback")}
                    description={t("admin.overview.noFeedbackHint")}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </PageBody>
    </>
  )
}
