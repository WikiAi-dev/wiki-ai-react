import { vi } from "vitest"

/** One request the code under test sent. */
export interface SentRequest {
  url: string
  method: string
  body: unknown
}

/** What a stubbed route answers; a thrown error is a network failure. */
export type Answer = { status?: number; body?: unknown } | Error

/**
 * Replaces fetch with a router for tests: the handler sees each request and
 * answers with a status and a JSON body, or an Error for a network failure.
 */
export function mockFetch(route: (req: SentRequest) => Answer) {
  const calls: SentRequest[] = []
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    let body: unknown
    if (typeof init?.body === "string") {
      try {
        body = JSON.parse(init.body)
      } catch {
        body = init.body
      }
    }
    const req = { url: String(input), method: init?.method ?? "GET", body }
    calls.push(req)
    const answer = route(req)
    if (answer instanceof Error) throw answer
    const status = answer.status ?? 200
    if (status === 204) return new Response(null, { status })
    return new Response(JSON.stringify(answer.body ?? {}), { status, headers: { "Content-Type": "application/json" } })
  })
  vi.stubGlobal("fetch", fn)
  return { calls, fn }
}
