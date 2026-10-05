import { apiRequest } from "./api"

// Types and calls for connector-service's /v1/connections API (through the
// gateway). The service keeps WikiAI in sync with Bitrix24, Jira, 1C… and
// indexes every record in knowledge-service with a link to the original.

export type ConnectionState = "ok" | "syncing" | "pending" | "error" | "paused"

export interface ProviderField {
  key: string
  label: string
  type: "text" | "url" | "password" | "textarea" | "select" | "multiselect" | "number"
  secret?: boolean
  required?: boolean
  options?: { value: string; label: string }[]
  default?: unknown
  placeholder?: string
  help?: string
}

export interface ProviderSpec {
  id: string
  title: string
  description: string
  pull: boolean
  webhooks: boolean
  webhook_setup?: string[]
  fields: ProviderField[]
  kinds: { id: string; title: string; default?: boolean }[]
}

export interface JobStats {
  fetched: number
  created: number
  updated: number
  deleted: number
  unchanged: number
  failed: number
}

export interface SyncJob {
  id: string
  mode: "full" | "incremental" | "refs"
  trigger: "create" | "schedule" | "manual" | "webhook" | "push"
  status: "queued" | "running" | "succeeded" | "partial" | "failed"
  attempts: number
  stats: JobStats
  error?: string
  run_after: string
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface Connection {
  id: string
  provider: string
  provider_title: string
  name: string
  config: Record<string, unknown>
  secrets_set: string[]
  kinds: string[]
  synced_kinds: string[]
  schedule_minutes: number
  full_sync_hours: number
  enabled: boolean
  state: ConnectionState
  last_error?: string
  last_sync_at: string | null
  last_success_at: string | null
  last_full_sync_at: string | null
  next_sync_at: string
  item_count: number
  latest_source_update: string | null
  webhook: { supported: boolean; enabled: boolean; url?: string; key_prefix?: string }
  last_job: SyncJob | null
  created_at: string
  updated_at: string
}

export interface ConnectionItem {
  connection_id: string
  connection_name: string
  provider: string
  provider_title: string
  kind: string
  kind_title: string
  external_id: string
  title: string
  url: string
  source_updated_at: string | null
  synced_at: string
  document_id: string
  metadata: Record<string, unknown>
}

export interface ConnectionChange {
  id: string
  connection_id: string
  connection_name: string
  provider: string
  provider_title: string
  kind: string
  kind_title: string
  external_id: string
  title: string
  url: string
  action: "created" | "updated" | "deleted"
  source_updated_at: string | null
  happened_at: string
}

export interface ConnectionsSummary {
  connections: number
  states: Partial<Record<ConnectionState, number>>
  items: number
  latest_source_update: string | null
  last_sync_at: string | null
  changes_today: number
  providers: { provider: string; title: string; connections: number; items: number; latest_source_update: string | null }[]
  kinds: { provider: string; kind: string; title: string; items: number; latest_source_update: string | null }[]
  errors: { connection_id: string; name: string; provider: string; error: string; at: string | null }[]
}

export interface ConnectionInput {
  provider: string
  name?: string
  config?: Record<string, unknown>
  secrets?: Record<string, string>
  kinds?: string[]
  schedule_minutes?: number
  full_sync_hours?: number
  enabled?: boolean
}

export type ConnectionPatch = Partial<Omit<ConnectionInput, "provider">>

export interface TestResult {
  ok: boolean
  message: string
  sample: string[]
}

export interface WebhookKey {
  url: string
  key: string
  key_prefix: string
  setup: string[]
}

interface List<T> {
  items: T[]
  next_cursor?: string
}

const base = "/v1/connections"

export const connectionsApi = {
  providers: (token: string) => apiRequest<List<ProviderSpec>>({ url: `${base}/providers`, token }),
  list: (token: string) => apiRequest<List<Connection>>({ url: base, token }),
  get: (token: string, id: string) => apiRequest<Connection>({ url: `${base}/${id}`, token }),
  create: (token: string, input: ConnectionInput) =>
    apiRequest<Connection>({ url: base, method: "POST", token, data: input as unknown as Record<string, unknown> }),
  testDraft: (token: string, input: ConnectionInput) =>
    apiRequest<TestResult>({ url: `${base}/test`, method: "POST", token, data: input as unknown as Record<string, unknown> }),
  update: (token: string, id: string, patch: ConnectionPatch) =>
    apiRequest<Connection>({ url: `${base}/${id}`, method: "PATCH", token, data: patch as Record<string, unknown> }),
  remove: (token: string, id: string, purge: boolean) =>
    apiRequest<{ deleted: boolean; documents_to_remove: number }>({
      url: `${base}/${id}`,
      method: "DELETE",
      token,
      params: purge ? { purge: "true" } : undefined,
    }),
  test: (token: string, id: string) => apiRequest<TestResult>({ url: `${base}/${id}/test`, method: "POST", token }),
  sync: (token: string, id: string, full = false) =>
    apiRequest<SyncJob>({ url: `${base}/${id}/sync`, method: "POST", token, data: { full } }),
  rotateWebhook: (token: string, id: string) => apiRequest<WebhookKey>({ url: `${base}/${id}/webhook`, method: "POST", token }),
  disableWebhook: (token: string, id: string) => apiRequest({ url: `${base}/${id}/webhook`, method: "DELETE", token }),
  jobs: (token: string, id: string, limit = 10) =>
    apiRequest<List<SyncJob>>({ url: `${base}/${id}/jobs`, token, params: { limit: String(limit) } }),
  items: (
    token: string,
    query: { connection_id?: string; provider?: string; kind?: string; q?: string; limit?: number; cursor?: string } = {},
  ) => {
    const params: Record<string, string> = {}
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") params[k] = String(v)
    return apiRequest<List<ConnectionItem>>({ url: `${base}/items`, token, params })
  },
  activity: (token: string, query: { since?: string; limit?: number; connection_id?: string } = {}) => {
    const params: Record<string, string> = {}
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") params[k] = String(v)
    return apiRequest<List<ConnectionChange>>({ url: `${base}/activity`, token, params })
  },
  summary: (token: string) => apiRequest<ConnectionsSummary>({ url: `${base}/summary`, token }),
}

/** "5 мин назад" / "in 3 hours" for a timestamp, in the app's language. */
export function relativeTime(value: string | null | undefined, locale: string, now = Date.now()): string {
  if (!value) return ""
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ""
  const seconds = Math.round((then - now) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale === "ru" ? "ru" : "en", { numeric: "auto" })
  const abs = Math.abs(seconds)
  if (abs < 45) return rtf.format(0, "second")
  if (abs < 45 * 60) return rtf.format(Math.round(seconds / 60), "minute")
  if (abs < 22 * 3600) return rtf.format(Math.round(seconds / 3600), "hour")
  if (abs < 26 * 86400) return rtf.format(Math.round(seconds / 86400), "day")
  return new Date(value).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
}

/** Full date and time for tooltips. */
export function fullTime(value: string | null | undefined, locale: string): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Where a knowledge-base document came from, when connector-service synced it. */
export interface DocumentSource {
  provider: string
  providerTitle: string
  kind: string
  kindTitle: string
  connectionName: string
  url: string
  updatedAt: string | null
}

const PROVIDER_TITLES: Record<string, string> = {
  bitrix24: "Bitrix24",
  jira: "Jira",
  confluence: "Confluence",
  onec: "1C",
  rest: "REST API",
  push: "API",
  opencart: "OpenCart",
}

/**
 * Reads the metadata connector-service stores with each document it writes
 * (source=connector, provider, kind, source_url…). Older documents from
 * go-core's connectors carry connector_type/connector_name instead.
 */
export function documentSource(metadata: unknown): DocumentSource | null {
  if (!metadata || typeof metadata !== "object") return null
  const m = metadata as Record<string, unknown>
  if (m.source !== "connector") return null
  const s = (key: string) => (typeof m[key] === "string" ? (m[key] as string) : "")
  const provider = s("provider") || s("connector_type")
  return {
    provider,
    providerTitle: s("provider_title") || PROVIDER_TITLES[provider] || provider,
    kind: s("kind"),
    kindTitle: s("kind_title") || s("kind"),
    connectionName: s("connection_name") || s("connector_name"),
    url: s("source_url"),
    updatedAt: s("source_updated_at") || null,
  }
}
