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
  record?: boolean
  max_concurrent?: number
  enabled?: boolean
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
  start_ms: number
  end_ms: number
  text: string
  /** Knowledge documents a bot phrase used. */
  sources: string[]
}

export interface CallNote {
  id: string
  user_id: string
  text: string
  created_at: string
}

export interface CallDetail extends Call {
  importance_reason: string
  extracted: Record<string, unknown>
  crm_match: Record<string, unknown>
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

/** Whether a trunk's last report is newer than a moment (a test's answer). */
export function reportedSince(t: Trunk, since: number): boolean {
  return t.status_at !== null && new Date(t.status_at).getTime() >= since
}
