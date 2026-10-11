"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { telephonyApi, type Line, type TelephonySettings, type Trunk } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { PageBody, PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { TrunksPanel } from "@/components/telephony/trunks-panel"
import { LinesPanel } from "@/components/telephony/lines-panel"
import { GeneralPanel } from "@/components/telephony/general-panel"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ShieldAlert } from "lucide-react"

type Tab = "trunks" | "lines" | "general"
const TABS: Tab[] = ["trunks", "lines", "general"]

// Trunk statuses change on their own (registration, keep-alive): the page
// rereads them now and then.
const REFRESH_MS = 15_000

export function TelephonySettingsView() {
  const { t } = useTranslation()
  const { token, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const tab: Tab = TABS.find((x) => x === params.get("tab")) ?? "trunks"
  const [trunks, setTrunks] = useState<Trunk[] | null>(null)
  const [lines, setLines] = useState<Line[] | null>(null)
  const [settings, setSettings] = useState<TelephonySettings | null>(null)
  const [failed, setFailed] = useState(false)

  const loadTrunks = useCallback(async (): Promise<Trunk[]> => {
    if (!token) return []
    const result = await telephonyApi.trunks(token)
    if (result.status !== "success" || !result.response) {
      setFailed(true)
      return []
    }
    setFailed(false)
    setTrunks(result.response.items)
    return result.response.items
  }, [token])

  const loadLines = useCallback(async () => {
    if (!token) return
    const result = await telephonyApi.lines(token)
    if (result.status === "success" && result.response) setLines(result.response.items)
    else setFailed(true)
  }, [token])

  const loadAll = useCallback(async () => {
    if (!token) return
    await Promise.all([loadTrunks(), loadLines()])
    const s = await telephonyApi.settings(token)
    if (s.status === "success" && s.response) setSettings(s.response)
    else setFailed(true)
  }, [token, loadTrunks, loadLines])

  useEffect(() => {
    if (!token || !isAdmin) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll()
    const id = setInterval(loadTrunks, REFRESH_MS)
    return () => clearInterval(id)
  }, [token, isAdmin, loadAll, loadTrunks])

  const setTab = (next: Tab) => {
    const q = new URLSearchParams(params.toString())
    if (next === "trunks") q.delete("tab")
    else q.set("tab", next)
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false })
  }

  const refreshBoth = async () => {
    await Promise.all([loadTrunks(), loadLines()])
  }

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t("navigation.telephony"), href: "/app/telephony" }, { label: t("telephony.settings.title") }]} />
      <PageBody>
        <PageHeader title={t("telephony.settings.title")} description={t("telephony.settings.subtitle")} />
        {!isAdmin ? (
          <EmptyState icon={ShieldAlert} title={t("telephony.settings.adminsOnly")} className="py-16" />
        ) : failed && (trunks === null || lines === null || (tab === "general" && settings === null)) ? (
          <EmptyState
            icon={ShieldAlert}
            title={t("telephony.settings.loadFailed")}
            action={
              <Button variant="outline" onClick={() => loadAll()}>
                {t("telephony.settings.retry")}
              </Button>
            }
            className="py-16"
          />
        ) : trunks === null || lines === null ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-[220px] rounded-2xl" />
            <Skeleton className="h-[220px] rounded-2xl" />
          </div>
        ) : (
          <>
            <SegmentedControl
              value={tab}
              onChange={setTab}
              label={t("telephony.settings.title")}
              options={[
                { value: "trunks", label: t("telephony.settings.tabs.trunks") },
                { value: "lines", label: t("telephony.settings.tabs.lines") },
                { value: "general", label: t("telephony.settings.tabs.general") },
              ]}
              className="w-full sm:w-auto sm:self-start"
            />
            {tab === "trunks" && <TrunksPanel trunks={trunks} lines={lines} onChanged={async () => {
              const fresh = await loadTrunks()
              await loadLines()
              return fresh
            }} />}
            {tab === "lines" && <LinesPanel lines={lines} trunks={trunks} onChanged={refreshBoth} />}
            {tab === "general" &&
              (settings ? (
                <GeneralPanel key={settings.updated_at ?? "defaults"} settings={settings} onSaved={setSettings} />
              ) : (
                <Skeleton className="h-[240px] max-w-xl rounded-2xl" />
              ))}
          </>
        )}
      </PageBody>
    </>
  )
}
