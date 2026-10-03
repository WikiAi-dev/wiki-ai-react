"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Activity, Cable, Clock, Database, Plus } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { connectionsApi, fullTime, relativeTime, type Connection, type ConnectionsSummary, type ProviderSpec } from "@/lib/connections"
import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { PageBody, PageHeader } from "@/components/page-header"
import { StatCard, StatGrid } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { ConnectionCard } from "@/components/connections/connection-card"
import { ConnectionData } from "@/components/connections/connection-data"
import { ConnectionFormDialog } from "@/components/connections/connection-form-dialog"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type Tab = "connections" | "data"

// While something syncs the page checks often; otherwise now and then.
const FAST_MS = 4_000
const SLOW_MS = 30_000

export function ConnectionsView() {
  const { t, locale } = useTranslation()
  const { token, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const tab: Tab = params.get("tab") === "data" ? "data" : "connections"
  const [providers, setProviders] = useState<ProviderSpec[]>([])
  const [connections, setConnections] = useState<Connection[] | null>(null)
  const [summary, setSummary] = useState<ConnectionsSummary | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const refresh = useCallback(async () => {
    if (!token) return
    const [list, sum] = await Promise.all([connectionsApi.list(token), connectionsApi.summary(token)])
    setConnections(list.status === "success" && list.response ? list.response.items : (prev) => prev ?? [])
    if (sum.status === "success" && sum.response) setSummary(sum.response)
  }, [token])

  useEffect(() => {
    if (!token) return
    connectionsApi.providers(token).then((result) => {
      if (result.status === "success" && result.response) setProviders(result.response.items)
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [token, refresh])

  const busy = useMemo(() => (connections ?? []).some((c) => c.state === "syncing" || c.state === "pending" || c.last_job?.status === "queued"), [connections])
  useEffect(() => {
    const id = setInterval(refresh, busy ? FAST_MS : SLOW_MS)
    return () => clearInterval(id)
  }, [refresh, busy])

  const setTab = (next: Tab) => {
    const q = new URLSearchParams(params.toString())
    if (next === "data") q.set("tab", "data")
    else q.delete("tab")
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false })
  }

  const dateLocale = locale === "ru" ? "ru-RU" : "en-GB"
  const errors = summary?.errors.length ?? 0
  const specOf = (id: string) => providers.find((p) => p.id === id)

  const addButton = isAdmin && providers.length > 0 && (
    <Button onClick={() => setAddOpen(true)}>
      <Plus />
      {t("connections.add")}
    </Button>
  )

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t("navigation.connections") }]} />
      <PageBody>
        <PageHeader title={t("connections.title")} description={t("connections.subtitle")} actions={addButton} />

        {connections === null ? (
          <>
            <StatGrid>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[132px] rounded-2xl" />
              ))}
            </StatGrid>
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-[220px] rounded-2xl" />
              <Skeleton className="h-[220px] rounded-2xl" />
            </div>
          </>
        ) : connections.length === 0 ? (
          <EmptyState
            icon={Cable}
            title={t("connections.empty.title")}
            description={isAdmin ? t("connections.empty.description") : t("connections.empty.memberDescription")}
            action={addButton || undefined}
            className="py-16"
          />
        ) : (
          <>
            <StatGrid>
              <StatCard
                label={t("connections.stats.connections")}
                value={connections.length.toLocaleString(dateLocale)}
                hint={errors > 0 ? t("connections.stats.connectionsHint", { errors }) : t("connections.stats.connectionsOk")}
                icon={Cable}
              />
              <StatCard
                label={t("connections.stats.records")}
                value={(summary?.items ?? 0).toLocaleString(dateLocale)}
                hint={t("connections.stats.recordsHint")}
                icon={Database}
              />
              <StatCard
                label={t("connections.stats.latest")}
                value={<span title={fullTime(summary?.latest_source_update, locale)}>{relativeTime(summary?.latest_source_update, locale) || "—"}</span>}
                hint={t("connections.stats.latestHint")}
                icon={Clock}
              />
              <StatCard
                label={t("connections.stats.today")}
                value={(summary?.changes_today ?? 0).toLocaleString(dateLocale)}
                hint={t("connections.stats.todayHint")}
                icon={Activity}
              />
            </StatGrid>

            <SegmentedControl
              value={tab}
              onChange={setTab}
              label={t("connections.title")}
              options={[
                { value: "connections", label: t("connections.tabs.connections") },
                { value: "data", label: t("connections.tabs.data") },
              ]}
              className="w-full sm:w-auto sm:self-start"
            />

            {tab === "connections" ? (
              <div className="grid gap-4 md:grid-cols-2">
                {connections.map((c) => (
                  <ConnectionCard
                    key={c.id}
                    connection={c}
                    spec={specOf(c.provider)}
                    providers={providers}
                    canManage={isAdmin}
                    onChanged={refresh}
                  />
                ))}
              </div>
            ) : (
              <ConnectionData connections={connections} summary={summary} />
            )}
          </>
        )}
      </PageBody>

      {isAdmin && (
        <ConnectionFormDialog
          key={`add-${addOpen}-${providers.length}`}
          open={addOpen}
          onOpenChange={setAddOpen}
          providers={providers}
          onSaved={refresh}
        />
      )}
    </>
  )
}
