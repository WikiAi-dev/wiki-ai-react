// @vitest-environment jsdom
import { createElement, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { act, useEffect } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AuthProvider, useAuth } from "./auth-context"
import { mockFetch, type Answer, type SentRequest } from "./test-fetch"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root
let seen: ReturnType<typeof useAuth> | null = null

function Probe(): ReactNode {
  const value = useAuth()
  useEffect(() => {
    seen = value
  })
  return null
}

async function mount() {
  const el = document.createElement("div")
  root = createRoot(el)
  await act(async () => {
    root.render(createElement(AuthProvider, null, createElement(Probe)))
  })
}

/** Lets the page-load check (and its retries while the server is down) run to the end. */
async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000)
  })
}

const VALID: Answer = { body: { valid: true, username: "ivan", role: "admin", organization_name: "Org" } }
const ME: Answer = { body: { user: { id: "1", username: "ivan", role: "admin" }, organization: { id: "o", name: "Org" } } }

beforeEach(() => {
  vi.useFakeTimers()
  // Node 25+ ships its own localStorage global that is unusable here and
  // shadows jsdom's, so tests bring a plain in-memory one.
  const data = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  })
  localStorage.clear()
  localStorage.setItem("auth_token", "access-1")
  localStorage.setItem("refresh_token", "refresh-1")
  seen = null
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(async () => {
  await act(async () => root.unmount())
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function route(validate: (n: number) => Answer, refresh: () => Answer) {
  let n = 0
  return (req: SentRequest): Answer => {
    if (req.url.startsWith("/v1/token/validate")) return validate(++n)
    if (req.url.startsWith("/v1/me")) return ME
    if (req.url.startsWith("/v1/auth/refresh")) return refresh()
    return { status: 404 }
  }
}

describe("session bootstrap (E2)", () => {
  it("keeps both tokens when the gateway answers 502 to validate and to refresh", async () => {
    mockFetch(route(() => ({ status: 502, body: {} }), () => ({ status: 502, body: {} })))
    await mount()
    await settle()
    expect(localStorage.getItem("auth_token")).toBe("access-1")
    expect(localStorage.getItem("refresh_token")).toBe("refresh-1")
    expect(seen?.isLoading).toBe(false)
  })

  it("keeps both tokens when the network is down", async () => {
    mockFetch(() => new Error("Failed to fetch"))
    await mount()
    await settle()
    expect(localStorage.getItem("auth_token")).toBe("access-1")
    expect(localStorage.getItem("refresh_token")).toBe("refresh-1")
  })

  it("signs in once the server is back after a short outage", async () => {
    mockFetch(route((n) => (n <= 2 ? { status: 503, body: {} } : VALID), () => ({ status: 503, body: {} })))
    await mount()
    expect(seen?.isLoading).toBe(true) // still checking, not bounced to the login page
    await settle()
    expect(seen?.user?.username).toBe("ivan")
    expect(seen?.token).toBe("access-1")
    expect(localStorage.getItem("refresh_token")).toBe("refresh-1")
  })

  it("clears the session when validate and refresh both answer 401", async () => {
    mockFetch(route(() => ({ status: 401, body: {} }), () => ({ status: 401, body: {} })))
    await mount()
    await settle()
    expect(localStorage.getItem("auth_token")).toBeNull()
    expect(localStorage.getItem("refresh_token")).toBeNull()
    expect(seen?.user).toBeNull()
    expect(seen?.isLoading).toBe(false)
  })

  it("clears the session when validate answers 401 and there is no refresh token", async () => {
    localStorage.removeItem("refresh_token")
    mockFetch(route(() => ({ status: 401, body: {} }), () => ({ status: 401, body: {} })))
    await mount()
    await settle()
    expect(localStorage.getItem("auth_token")).toBeNull()
  })

  it("renews an expired access token with the refresh token and keeps the session", async () => {
    mockFetch(
      route(
        (n) => (n === 1 ? { status: 401, body: {} } : VALID),
        () => ({ body: { token_pair: { access_token: "access-2", refresh_token: "refresh-2" } } }),
      ),
    )
    await mount()
    await settle()
    expect(localStorage.getItem("auth_token")).toBe("access-2")
    expect(localStorage.getItem("refresh_token")).toBe("refresh-2")
    expect(seen?.user?.username).toBe("ivan")
  })
})
