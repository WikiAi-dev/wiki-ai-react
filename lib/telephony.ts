import { apiRequest } from "./api"

// Types and calls for telephony-api's /v1/telephony API (through the
// gateway): trunks (the PBX or SIP provider calls arrive from), lines (the
// organization's numbers), settings and the call history.

export type TrunkMode = "peer" | "register"
export type TrunkStatus = "unknown" | "ok" | "error"

export interface Trunk {
  id: string
  name: string
  mode: TrunkMode
  host: string
  port: number
  transport: "udp" | "tcp"
  username: string
  has_password: boolean
  allowed_ips: string[]
  enabled: boolean
  status: TrunkStatus
  status_detail: string
  /** When voice-engine last reported; a test's answer is newer than the test. */
  status_at: string | null
  created_at: string
  updated_at: string
}

export interface TrunkInput {
  name?: string
  mode?: TrunkMode
  host?: string
  port?: number
  transport?: string
  username?: string
  /** Absent keeps the stored password; "" removes it. */
  password?: string
  allowed_ips?: string[]
  enabled?: boolean
}

export type LineMode = "ai_first" | "operators_first" | "schedule" | "ai_only"

export interface Line {
  id: string
  trunk_id: string
  did: string
  name: string
  mode: LineMode
  scenario_id: string
  scope_id: string
  schedule_id: string
  record: boolean
  max_concurrent: number
  ring_timeout_s: number
  ring_strategy: "all" | "round_robin" | "longest_idle"
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface LineInput {
  trunk_id?: string
  did?: string
  name?: string
  mode?: LineMode
  /** The assistant: its scenario and the knowledge scope saved with it; "" for none. */
  scenario_id?: string
  scope_id?: string
  record?: boolean
  max_concurrent?: number
  enabled?: boolean
}

/** A step of the conversation map; x and y are where the editor draws it. */
export interface ScenarioNode {
  id: string
  title: string
  description: string
  x: number
  y: number
}

/** A transition between steps; label is when ("клиент спросил о цене"), "" for "then". */
export interface ScenarioEdge {
  id: string
  from: string
  to: string
  label: string
}

/**
 * What an admin writes for the assistant. scope_id links the knowledge
 * scope saved with the assistant: the editor keeps the two together.
 */
export interface ScenarioDraft {
  company: string
  assistant_name: string
  greeting: string
  instructions: string
  nodes: ScenarioNode[]
  edges: ScenarioEdge[]
  scope_id?: string
}

export interface ScenarioVersion {
  id: string
  version: number
  prompt: string
  greeting: string
  created_at: string
}

export interface Scenario {
  id: string
  name: string
  template_key: string
  draft: Partial<ScenarioDraft>
  published_version_id: string
  published: ScenarioVersion | null
  created_at: string
  updated_at: string
}

export interface ScopeItem {
  kind: "document" | "connection"
  document_id?: string
  connection_id?: string
  kinds?: string[]
}

/** The files the assistant may search. */
export interface KnowledgeScope {
  id: string
  name: string
  items: ScopeItem[]
  created_at: string
  updated_at: string
}

export interface TelephonySettings {
  recording_retention_days: number
  transcript_retention_days: number
  telegram_recordings: boolean
  time_saved_per_message: number
  max_concurrent_calls: number
  categories: string[]
  wizard: Record<string, unknown>
  updated_at: string | null
}

export type CallState = "routing" | "ringing_operators" | "bot" | "queued" | "operator" | "hold" | "wrapup" | "ended"
export type CallOutcome =
  | ""
  | "resolved_by_bot"
  | "message_taken"
  | "transferred"
  | "operator_handled"
  | "missed"
  | "abandoned"
  | "rejected"
  | "spam"
  | "failed"
export type CallStatus = "new" | "processed"
export type Importance = "" | "low" | "normal" | "high" | "urgent"

export interface Call {
  id: string
  line_id: string
  line_name: string
  trunk_id: string
  /** E.164, "" when the caller withheld the number or it isn't one. */
  from: string
  to: string
  state: CallState
  outcome: CallOutcome
  handled_by: "" | "bot" | "operator" | "both"
  status: CallStatus
  started_at: string
  answered_at: string | null
  ended_at: string | null
  duration_s: number
  importance: Importance
  category: string
  summary: string
  has_recording: boolean
  recording_duration_s: number
  test: boolean
}

export interface CallEvent {
  seq: number
  type: string
  at: string
  data: Record<string, unknown>
}

export interface TranscriptSegment {
  speaker: "caller" | "bot" | "operator"
  /** Who said an operator's phrase; the call's call.state event names them. */
  operator_id?: string
  start_ms: number
  end_ms: number
  text: string
  /** Knowledge documents a bot phrase used. */
  sources: string[]
}

/** A record a call was logged to in a CRM. */
export interface CRMLink {
  provider: string
  entity: "lead" | "deal" | "contact" | string
  id: string
  url: string
  created: boolean
}

/**
 * The CRM's record for the caller's number (a contact, or a company or a
 * request with it), what hangs off it, and their last call.
 */
export interface CRMMatch {
  found?: "none" | "one" | "many"
  provider?: string
  contact?: {
    id: string
    kind?: "contact" | "company" | "lead"
    name: string
    company?: string
    post?: string
    responsible?: string
    emails?: string[]
    notes?: string
    status?: string
    url?: string
  }
  /** Open deals first, then the last closed ones. */
  deals?: { title: string; stage?: string; amount?: string; closed?: boolean; won?: boolean; date?: string }[]
  leads?: { title: string; status?: string; date?: string }[]
  activities?: { kind: "call" | "meeting" | "email" | "task" | "other"; subject?: string; date?: string; incoming?: boolean; done?: boolean }[]
  last_call?: { at: string; outcome: CallOutcome; summary?: string; topic?: string }
}

export interface CallNote {
  id: string
  user_id: string
  text: string
  created_at: string
}

export interface CallDetail extends Call {
  importance_reason: string
  /** The analysis; `crm` lists the records the call was logged to. */
  extracted: { crm?: CRMLink[] } & Record<string, unknown>
  /** Who the caller is in the CRM, found while the assistant greeted them. */
  crm_match: CRMMatch
  operator_ids: string[]
  quality: Record<string, unknown>
  decision: string[]
  /** The final transcript when there is one, else what was recognized live. */
  transcript: TranscriptSegment[]
  notes: CallNote[]
  events: CallEvent[]
}

export interface CallQuery {
  line_id?: string
  from?: string
  outcome?: CallOutcome
  status?: CallStatus
  since?: string
  until?: string
  include_test?: boolean
  limit?: number
  cursor?: string
}

interface List<T> {
  items: T[]
  next_cursor?: string
}

const base = "/v1/telephony"

const json = (v: object) => v as unknown as Record<string, unknown>

export const telephonyApi = {
  trunks: (token: string) => apiRequest<List<Trunk>>({ url: `${base}/trunks`, token }),
  createTrunk: (token: string, input: TrunkInput) => apiRequest<Trunk>({ url: `${base}/trunks`, method: "POST", token, data: json(input) }),
  updateTrunk: (token: string, id: string, input: TrunkInput) =>
    apiRequest<Trunk>({ url: `${base}/trunks/${id}`, method: "PATCH", token, data: json(input) }),
  deleteTrunk: (token: string, id: string) => apiRequest({ url: `${base}/trunks/${id}`, method: "DELETE", token }),
  testTrunk: (token: string, id: string) => apiRequest<{ status: string }>({ url: `${base}/trunks/${id}/test`, method: "POST", token }),

  lines: (token: string) => apiRequest<List<Line>>({ url: `${base}/lines`, token }),
  createLine: (token: string, input: LineInput) => apiRequest<Line>({ url: `${base}/lines`, method: "POST", token, data: json(input) }),
  updateLine: (token: string, id: string, input: LineInput) =>
    apiRequest<Line>({ url: `${base}/lines/${id}`, method: "PATCH", token, data: json(input) }),
  deleteLine: (token: string, id: string) => apiRequest({ url: `${base}/lines/${id}`, method: "DELETE", token }),

  scenarios: (token: string) => apiRequest<List<Scenario>>({ url: `${base}/scenarios`, token }),
  scenario: (token: string, id: string) => apiRequest<Scenario>({ url: `${base}/scenarios/${id}`, token }),
  createScenario: (token: string, input: { name: string; draft: Partial<ScenarioDraft> }) =>
    apiRequest<Scenario>({ url: `${base}/scenarios`, method: "POST", token, data: json(input) }),
  updateScenario: (token: string, id: string, input: { name?: string; draft?: Partial<ScenarioDraft> }) =>
    apiRequest<Scenario>({ url: `${base}/scenarios/${id}`, method: "PATCH", token, data: json(input) }),
  deleteScenario: (token: string, id: string) => apiRequest({ url: `${base}/scenarios/${id}`, method: "DELETE", token }),
  publishScenario: (token: string, id: string) => apiRequest<Scenario>({ url: `${base}/scenarios/${id}/publish`, method: "POST", token }),
  previewScenario: (token: string, draft: Partial<ScenarioDraft>) =>
    apiRequest<{ prompt: string; greeting: string }>({ url: `${base}/scenarios/preview`, method: "POST", token, data: json({ draft }) }),

  scopes: (token: string) => apiRequest<List<KnowledgeScope>>({ url: `${base}/scopes`, token }),
  scope: (token: string, id: string) => apiRequest<KnowledgeScope>({ url: `${base}/scopes/${id}`, token }),
  createScope: (token: string, input: { name: string; items: ScopeItem[] }) =>
    apiRequest<KnowledgeScope>({ url: `${base}/scopes`, method: "POST", token, data: json(input) }),
  saveScope: (token: string, id: string, input: { name: string; items: ScopeItem[] }) =>
    apiRequest<KnowledgeScope>({ url: `${base}/scopes/${id}`, method: "PUT", token, data: json(input) }),
  deleteScope: (token: string, id: string) => apiRequest({ url: `${base}/scopes/${id}`, method: "DELETE", token }),

  // Operators (voice-engine, through the gateway's /v1/telephony/live).
  liveIce: (token: string) => apiRequest<{ ice_servers: RTCIceServer[] }>({ url: `${base}/live/ice`, token }),
  answerCall: (token: string, id: string, sdp: string) =>
    apiRequest<{ sdp: string }>({ url: `${base}/live/calls/${id}/answer`, method: "POST", token, data: { sdp } }),
  hangupCall: (token: string, id: string) => apiRequest({ url: `${base}/live/calls/${id}/hangup`, method: "POST", token }),

  settings: (token: string) => apiRequest<TelephonySettings>({ url: `${base}/settings`, token }),
  updateSettings: (token: string, input: Partial<TelephonySettings>) =>
    apiRequest<TelephonySettings>({ url: `${base}/settings`, method: "PATCH", token, data: json(input) }),

  calls: (token: string, query: CallQuery = {}) => {
    const params: Record<string, string> = {}
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "" && v !== false) params[k] = String(v)
    return apiRequest<List<Call>>({ url: `${base}/calls`, token, params })
  },
  call: (token: string, id: string) => apiRequest<CallDetail>({ url: `${base}/calls/${id}`, token }),
  setCallStatus: (token: string, id: string, status: CallStatus) =>
    apiRequest<CallDetail>({ url: `${base}/calls/${id}`, method: "PATCH", token, data: { status } }),
  deleteCall: (token: string, id: string) => apiRequest({ url: `${base}/calls/${id}`, method: "DELETE", token }),
}

/**
 * "+375 29 123-45-67" for a Belarusian number, "+7 912 345-67-89" for a
 * Russian one, the E.164 form otherwise.
 */
export function formatPhone(e164: string): string {
  if (!e164) return ""
  const by = /^\+375(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164)
  if (by) return `+375 ${by[1]} ${by[2]}-${by[3]}-${by[4]}`
  const ru = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(e164)
  if (ru) return `+7 ${ru[1]} ${ru[2]}-${ru[3]}-${ru[4]}`
  return e164
}

/** "1:05" or "1:02:03" for a number of seconds. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`
}

/** How long a call lasted: answer to hang-up, or the whole call when nobody answered. */
export function callSeconds(c: Pick<Call, "started_at" | "answered_at" | "ended_at" | "duration_s">): number {
  if (c.duration_s > 0) return c.duration_s
  const from = c.answered_at ?? c.started_at
  if (!c.ended_at) return 0
  return Math.max(0, (new Date(c.ended_at).getTime() - new Date(from).getTime()) / 1000)
}

/**
 * Whether a trunk has reported since a previous report (status_at as it
 * was before a test). Both times are voice-engine's, so the browser's
 * clock doesn't matter.
 */
export function reportedAfter(t: Trunk, previous: string | null): boolean {
  if (t.status_at === null) return false
  if (previous === null) return true
  return new Date(t.status_at).getTime() > new Date(previous).getTime()
}

// telephony-api answers in English; these are its messages people see in
// forms and toasts, in Russian.
const RU_API_TEXT: Record<string, string> = {
  "This number is already used by a line": "Этот номер уже занят другой линией",
  "Enter the whole number, e.g. +375 17 123-45-67 or 8 017 123-45-67": "Введите номер целиком, например +375 17 123-45-67 или 8 017 123-45-67",
  "Number must be in international format, e.g. +375171234567": "Номер в международном формате, например +375171234567",
  "Enter a whole phone number": "Введите номер целиком",
  "Choose a trunk": "Выберите транк",
  "Trunk not found": "Транк не найден",
  "Allow 1 to 100 calls at once": "От 1 до 100 звонков одновременно",
  "Ring operators for 5 to 120 seconds": "От 5 до 120 секунд",
  "Unknown mode": "Неизвестный режим",
  "Mode must be peer or register": "Выберите способ подключения",
  "List the addresses your PBX calls from": "Укажите адреса, с которых звонит ваша АТС",
  "Use IP addresses or CIDR ranges, e.g. 10.0.0.5 or 10.0.0.0/24": "IP-адреса или сети, например 10.0.0.5 или 10.0.0.0/24",
  "A range is too wide: list your PBX's addresses (at most a /16 for IPv4, /48 for IPv6)":
    "Слишком широкая сеть: укажите адреса вашей АТС (не шире /16 для IPv4 и /48 для IPv6)",
  "Provider address is required": "Укажите сервер провайдера",
  "Use a host name like sip.example.com or an IP address, without a port": "Имя сервера, например sip.example.by, или IP-адрес, без порта",
  "Port must be 1 to 65535": "Порт от 1 до 65535",
  "Transport must be udp or tcp": "Протокол UDP или TCP",
  "Username is required": "Укажите логин",
  "Use letters, digits and - _ . ! ~ * ' ( ) & = + $ , ; ? / % only, at most 128":
    "Только латинские буквы, цифры и знаки - _ . ! ~ * ' ( ) & = + $ , ; ? / %, до 128 символов",
  "Name is required": "Укажите название",
  "Name is too long": "Слишком длинное название",
  "Keep recordings 1 to 3650 days": "От 1 до 3650 дней",
  "Enable the trunk to test it": "Включите транк, чтобы проверить его",
  "Can't reach the call engine right now; try again": "Голосовой сервер сейчас недоступен, попробуйте ещё раз",
  "The change clashes with existing data": "Изменение конфликтует с текущими данными",
  "Something went wrong": "Что-то пошло не так",
}

/** An API message in the app's language, when it's one we know. */
export function apiText(message: string | undefined, locale: string): string {
  if (!message) return ""
  return (locale === "ru" && RU_API_TEXT[message]) || message
}
