"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Database, ExternalLink, FileText, Loader2, SearchX } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  connectionsApi,
  fullTime,
  relativeTime,
  type Connection,
  type ConnectionItem,
  type ConnectionsSummary,
} from "@/lib/connections"
import { useTranslation } from "@/src/i18n"
import { ProviderMark, useProviderText } from "@/components/connections/shared"
import { EmptyState } from "@/components/empty-state"
import { ListPanel, ListSkeleton, ListToolbar } from "@/components/list-panel"
import { UnifiedFileReader } from "@/components/ui/file-reader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const PAGE = 30
const ALL = "all"

// Metadata worth showing next to a record, in this order.
const META_KEYS = ["stage", "status", "amount", "price", "company", "responsible"]

/** Every record synced from connected systems, newest change at the source first. */
export function ConnectionData({ connections, summary }: { connections: Connection[]; summary: ConnectionsSummary | null }) {
  const { t, locale } = useTranslation()
  const text = useProviderText()
  const { token } = useAuth()
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [kind, setKind] = useState(ALL)
  const [connectionId, setConnectionId] = useState(ALL)
  const [items, setItems] = useState<ConnectionItem[] | null>(null)
  const [cursor, setCursor] = useState("")
  const [loadingMore, setLoadingMore] = useState(false)
  const [reading, setReading] = useState<ConnectionItem | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(id)
  }, [query])

  const filters = useMemo(() => {
    const [provider, kindId] = kind === ALL ? ["", ""] : kind.split("|")
    return { provider, kind: kindId, connection_id: connectionId === ALL ? "" : connectionId, q: debounced }
  }, [kind, connectionId, debounced])

  const load = useCallback(
    async (after = "") => {
      if (!token) return
      const result = await connectionsApi.items(token, { ...filters, limit: PAGE, cursor: after || undefined })
      if (result.status !== "success" || !result.response) {
        if (!after) setItems([])
        return
      }
      const page = result.response.items
      setItems((prev) => (after && prev ? [...prev, ...page] : page))
      setCursor(result.response.next_cursor ?? "")
    },
    [token, filters],
  )

  useEffect(() => {
    // New filters start from the first page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(null)
    load()
  }, [load])

  const more = async () => {
    setLoadingMore(true)
    try {
      await load(cursor)
    } finally {
      setLoadingMore(false)
    }
  }

  const dateLocale = locale === "ru" ? "ru-RU" : "en-GB"
  const filtered = filters.q !== "" || filters.kind !== "" || filters.connection_id !== ""
  const kinds = summary?.kinds ?? []

  return (
    <>
      <ListPanel>
        <ListToolbar query={query} onQueryChange={setQuery} placeholder={t("connections.data.search")}>
          {kinds.length > 1 && (
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="w-[170px]" aria-label={t("connections.data.allKinds")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("connections.data.allKinds")}</SelectItem>
                {kinds.map((k) => (
                  <SelectItem key={`${k.provider}|${k.kind}`} value={`${k.provider}|${k.kind}`}>
                    {text.kind(k.provider, k.kind, k.title)} · {k.items.toLocaleString(dateLocale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {connections.length > 1 && (
            <Select value={connectionId} onValueChange={setConnectionId}>
              <SelectTrigger className="w-[180px]" aria-label={t("connections.data.allConnections")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("connections.data.allConnections")}</SelectItem>
                {connections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </ListToolbar>

        {items === null ? (
          <ListSkeleton rows={6} />
        ) : items.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={filtered ? SearchX : Database}
              title={filtered ? t("connections.data.noMatches") : t("connections.data.empty")}
              description={filtered ? undefined : t("connections.data.emptyHint")}
              className="border-0"
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const meta = META_KEYS.map((k) => item.metadata[k]).filter((v): v is string => typeof v === "string" && v !== "")
              return (
                <li key={`${item.connection_id}:${item.external_id}`} className="flex gap-3.5 px-4 py-3.5 sm:px-5">
                  <ProviderMark provider={item.provider} title={item.provider_title} className="mt-0.5 size-9 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex min-w-0 max-w-full items-center gap-1.5 font-medium text-foreground hover:text-primary"
                          title={t("connections.data.openOriginal", { platform: item.provider_title })}
                        >
                          <span className="truncate">{item.title}</span>
                          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
                        </a>
                      ) : (
                        <span className="truncate font-medium">{item.title}</span>
                      )}
                      <Badge variant="secondary" className="shrink-0">
                        {t("connections.data.auto")} · {item.provider_title}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-[13px] text-muted-foreground">
                      {[text.kind(item.provider, item.kind, item.kind_title), item.connection_name, ...meta].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {item.source_updated_at && (
                        <span title={fullTime(item.source_updated_at, locale)}>
                          {t("connections.data.sourceUpdated")}: {relativeTime(item.source_updated_at, locale)}
                        </span>
                      )}
                      {item.source_updated_at && " · "}
                      <span title={fullTime(item.synced_at, locale)}>
                        {t("connections.data.synced")}: {relativeTime(item.synced_at, locale)}
                      </span>
                    </p>
                  </div>
                  {item.document_id && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="shrink-0 self-center"
                      onClick={() => setReading(item)}
                      aria-label={t("connections.data.readText")}
                      title={t("connections.data.readText")}
                    >
                      <FileText />
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {cursor && items && items.length > 0 && (
          <div className="border-t border-border p-3 text-center">
            <Button variant="ghost" size="sm" onClick={more} disabled={loadingMore}>
              {loadingMore && <Loader2 className="animate-spin" />}
              {t("connections.data.loadMore")}
            </Button>
          </div>
        )}
      </ListPanel>

      <UnifiedFileReader
        file={
          reading
            ? {
                id: reading.document_id,
                filename: `${reading.title}.md`,
                size: 0,
                upload_date: reading.synced_at,
                content_type: "text/markdown",
                indexed: true,
              }
            : null
        }
        token={token}
        open={reading !== null}
        onOpenChange={(open) => !open && setReading(null)}
        showDownload={false}
      />
    </>
  )
}
