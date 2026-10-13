/**
 * The signed-in session's tokens (WAI-232): a short-lived access token
 * and the refresh token that renews it. identity-service rotates the
 * refresh token on every use, so only one refresh runs at a time (a
 * second one with the same token would be refused and end the session),
 * and everyone who holds the access token (the auth context, other tabs)
 * learns the new one.
 */
import { getApiUrl } from "./config"

const ACCESS_KEY = "auth_token"
const REFRESH_KEY = "refresh_token"

type Listener = (token: string | null) => void
const listeners = new Set<Listener>()
let inflight: Promise<string | null> | null = null

function read(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  if (typeof window === "undefined") return
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    // Storage unavailable (private mode): the session lives until reload.
  }
}

/** The current access token, null when signed out. */
export function accessToken(): string | null {
  return read(ACCESS_KEY)
}

/** Keeps a new pair (the refresh token only when one came) and tells everyone. */
export function setSession(access: string, refresh?: string | null) {
  write(ACCESS_KEY, access)
  if (refresh) write(REFRESH_KEY, refresh)
  listeners.forEach((fn) => fn(access))
}

/** Forgets the session here and tells everyone. */
export function clearSession() {
  write(ACCESS_KEY, null)
  write(REFRESH_KEY, null)
  listeners.forEach((fn) => fn(null))
}

/** Calls fn with every new access token (null on sign-out); returns the unsubscribe. */
export function onSessionChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** When a JWT expires, in ms since the epoch; null when it can't be read. */
export function tokenExpiresAt(token: string | null): number | null {
  if (!token) return null
  try {
    const part = token.split(".")[1]
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=")))
    return typeof json.exp === "number" ? json.exp * 1000 : null
  } catch {
    return null
  }
}

/** Whether a token is expired or about to (within margin ms). */
export function expiresSoon(token: string | null, margin = 30_000): boolean {
  const at = tokenExpiresAt(token)
  return at !== null && at - margin <= Date.now()
}

/**
 * A fresh access token: the one another request or tab already got when
 * `failed` is no longer the current one, else a refresh. Null when the
 * session is over (the refresh token was refused; the session is
 * cleared) or the server can't be reached (it is kept, to try again).
 */
export function refreshSession(failed?: string | null): Promise<string | null> {
  const current = accessToken()
  if (failed && current && current !== failed && !expiresSoon(current, 5_000)) {
    return Promise.resolve(current)
  }
  if (!inflight) {
    inflight = doRefresh().finally(() => {
      inflight = null
    })
  }
  return inflight
}

async function doRefresh(): Promise<string | null> {
  const refresh = read(REFRESH_KEY)
  if (!refresh) return null
  let res: Response
  try {
    res = await fetch(getApiUrl("/v1/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
      body: JSON.stringify({ refresh_token: refresh }),
    })
  } catch {
    return null // offline: keep the session and try again later
  }
  if (res.ok) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const pair = (data.token_pair ?? {}) as Record<string, unknown>
    const access = (pair.access_token ?? data.access_token ?? data.token) as string | undefined
    const next = (pair.refresh_token ?? data.refresh_token) as string | undefined
    if (access) {
      setSession(access, next)
      return access
    }
    return null
  }
  if (res.status === 401 || res.status === 403) {
    // Another tab may have rotated the token a moment ago: its pair is
    // the session now.
    if (read(REFRESH_KEY) !== refresh) return accessToken()
    clearSession()
  }
  return null
}

/** Ends the session on the server (the refresh token is revoked) and here. */
export async function logoutSession() {
  const refresh = read(REFRESH_KEY)
  clearSession()
  if (!refresh) return
  try {
    await fetch(getApiUrl("/v1/auth/logout"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
      body: JSON.stringify({ refresh_token: refresh }),
    })
  } catch {
    // The token expires on its own.
  }
}
