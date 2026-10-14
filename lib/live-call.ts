"use client"

import { useEffect, useState } from "react"
import { getWsUrl } from "@/lib/config"
import { accessToken, expiresSoon, refreshSession } from "@/lib/session"
import type { CallDetail, CallEvent, CallState, CRMMatch, TranscriptSegment } from "@/lib/telephony"

/** The live socket's own close codes (telephony-service api/live.md). */
const NOT_LIVE = 4404
const BEHIND = 4409

/** How long events are gathered before the page draws them: the whole call arrives at once on connect. */
const FLUSH_MS = 60

/**
 * Watches a call in progress through voice-engine's socket (WAI-190): the
 * whole call so far, then each event as it happens. A dropped socket comes
 * back from the last event it got, so nothing is missed or doubled. Null
 * watches nothing; the events are the watched call's, in order.
 */
export function useLiveCall(callId: string | null): { events: CallEvent[]; connected: boolean } {
  const [state, setState] = useState<{ callId: string | null; events: CallEvent[]; connected: boolean }>({
    callId: null,
    events: [],
    connected: false,
  })

  useEffect(() => {
    if (!callId) return
    let stopped = false
    let socket: WebSocket | null = null
    let retry: ReturnType<typeof setTimeout> | undefined
    let flush: ReturnType<typeof setTimeout> | undefined
    let attempt = 0
    let last = 0
    const got: CallEvent[] = []
    const draw = (connected: boolean) => setState({ callId, events: [...got], connected })

    const connect = async () => {
      let token = accessToken()
      if (token && expiresSoon(token, 60_000)) token = (await refreshSession(token)) ?? token
      if (stopped || !token) return
      const ws = new WebSocket(getWsUrl(`/v1/telephony/live/calls/${callId}/events?since=${last}&token=${encodeURIComponent(token)}`))
      socket = ws
      ws.onopen = () => {
        attempt = 0
        draw(true)
      }
      ws.onmessage = (m) => {
        let e: Partial<CallEvent>
        try {
          e = JSON.parse(m.data)
        } catch {
          return
        }
        if (typeof e.seq !== "number" || e.seq <= last || !e.type) return
        last = e.seq
        got.push({ seq: e.seq, type: e.type, at: e.at ?? new Date().toISOString(), data: e.data ?? {} })
        if (!flush)
          flush = setTimeout(() => {
            flush = undefined
            if (!stopped) draw(true)
          }, FLUSH_MS)
      }
      ws.onclose = (ev) => {
        if (stopped) return
        draw(false)
        // The call ended, or isn't live here: the API has it from now on.
        if (ev.code === 1000 || ev.code === NOT_LIVE) return
        const wait = ev.code === BEHIND ? 0 : Math.min(15_000, 1000 * 2 ** attempt++)
        retry = setTimeout(connect, wait)
      }
    }
    connect()
    return () => {
      stopped = true
      clearTimeout(retry)
      clearTimeout(flush)
      socket?.close()
    }
  }, [callId])

  return state.callId === callId ? { events: state.events, connected: state.connected } : { events: [], connected: false }
}

/**
 * The call as its live events tell it, once the socket has given the whole
 * call (from event 1): the transcript, state and CRM card as they are now,
 * and the event log with what the API hasn't stored yet.
 */
export function withLive(call: CallDetail, events: CallEvent[]): CallDetail {
  if (events.length === 0 || events[0].seq !== 1) return call
  const lines = new Map<number, TranscriptSegment>()
  let state: CallState = call.state
  let crm: CRMMatch = call.crm_match
  for (const e of events) {
    const d = e.data as Record<string, unknown>
    switch (e.type) {
      case "segment.final":
        lines.set(Number(d.seq), {
          speaker: d.speaker as TranscriptSegment["speaker"],
          operator_id: (d.operator_id as string) || undefined,
          start_ms: Number(d.start_ms) || 0,
          end_ms: Number(d.end_ms) || 0,
          text: String(d.text ?? ""),
          sources: (d.sources as string[]) ?? [],
        })
        break
      case "call.state":
        state = d.to as CallState
        break
      case "caller.matched":
        if (d.match) crm = d.match as CRMMatch
        break
      case "call.ended":
        state = "ended"
        break
    }
  }
  const stored = new Set(call.events.map((e) => e.seq))
  return {
    ...call,
    // The API's state wins once it says the call is over.
    state: call.state === "ended" ? call.state : state,
    crm_match: crm,
    transcript: [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, s]) => s),
    events: [...call.events, ...events.filter((e) => !stored.has(e.seq))].sort((a, b) => a.seq - b.seq),
  }
}
