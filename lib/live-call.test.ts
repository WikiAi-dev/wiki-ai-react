import { describe, expect, it } from "vitest"
import { withLive } from "./live-call"
import type { CallDetail, CallEvent } from "./telephony"

const call = (over: Partial<CallDetail> = {}): CallDetail => ({
  id: "c1",
  line_id: "l1",
  line_name: "Main",
  trunk_id: "t1",
  from: "+375291234567",
  to: "+375171234567",
  state: "routing",
  outcome: "" as CallDetail["outcome"],
  handled_by: "",
  status: "new",
  started_at: "2026-11-21T10:00:00Z",
  answered_at: null,
  ended_at: null,
  duration_s: 0,
  importance: "",
  category: "",
  summary: "",
  has_recording: false,
  recording_duration_s: 0,
  test: false,
  importance_reason: "",
  extracted: {},
  crm_match: {},
  operator_ids: [],
  quality: {},
  decision: [],
  transcript: [],
  notes: [],
  events: [],
  ...over,
})

const ev = (seq: number, type: string, data: Record<string, unknown> = {}): CallEvent => ({ seq, type, at: "2026-11-21T10:00:00Z", data })
const seg = (seq: number, text: string, speaker = "caller") => ev(seq, "segment.final", { seq, speaker, start_ms: seq * 1000, end_ms: seq * 1000 + 500, text })

describe("withLive", () => {
  it("returns the very same call when there are no events", () => {
    const c = call()
    expect(withLive(c, [])).toBe(c)
  })

  it("returns the same call unless the events start at seq 1", () => {
    const c = call()
    expect(withLive(c, [ev(2, "call.state", { to: "bot" })])).toBe(c)
    expect(withLive(c, [ev(5, "call.ended")])).toBe(c)
  })

  it("rebuilds the transcript sorted by segment seq", () => {
    const out = withLive(call(), [ev(1, "call.started"), seg(30, "third"), seg(10, "first", "bot"), seg(20, "second")])
    expect(out.transcript.map((s) => s.text)).toEqual(["first", "second", "third"])
    expect(out.transcript[0]).toMatchObject({ speaker: "bot", start_ms: 10000, end_ms: 10500, sources: [] })
  })

  it("keeps the last version of a re-sent segment", () => {
    const out = withLive(call(), [ev(1, "call.started"), seg(10, "draft"), { ...seg(10, "final"), seq: 3 }])
    expect(out.transcript).toHaveLength(1)
    expect(out.transcript[0].text).toBe("final")
  })

  it("takes state from call.state and the CRM card from caller.matched", () => {
    const match = { found: "one" as const, contact: { id: "9", name: "Ivan" } }
    const out = withLive(call(), [ev(1, "call.started"), ev(2, "call.state", { to: "bot" }), ev(3, "caller.matched", { match }), ev(4, "call.state", { to: "operator" })])
    expect(out.state).toBe("operator")
    expect(out.crm_match).toEqual(match)
  })

  it("keeps the CRM card when caller.matched has no match", () => {
    const crm = { found: "none" as const }
    const out = withLive(call({ crm_match: crm }), [ev(1, "call.started"), ev(2, "caller.matched", {})])
    expect(out.crm_match).toBe(crm)
  })

  it("call.ended ends the call", () => {
    expect(withLive(call(), [ev(1, "call.started"), ev(2, "call.ended")]).state).toBe("ended")
  })

  it("never moves a call the API already ended back to a live state", () => {
    const out = withLive(call({ state: "ended" }), [ev(1, "call.started"), ev(2, "call.state", { to: "bot" })])
    expect(out.state).toBe("ended")
  })

  it("merges stored and live events without duplicate seq, in order", () => {
    const stored = [ev(1, "call.started"), ev(2, "call.state", { to: "bot" })]
    const out = withLive(call({ events: stored }), [ev(1, "call.started"), ev(2, "call.state", { to: "bot" }), ev(3, "call.state", { to: "operator" })])
    expect(out.events.map((e) => e.seq)).toEqual([1, 2, 3])
  })

  it("does not mutate the call it was given", () => {
    const c = call()
    withLive(c, [ev(1, "call.started"), seg(2, "hi")])
    expect(c.transcript).toEqual([])
    expect(c.events).toEqual([])
  })
})
