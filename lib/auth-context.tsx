"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { authApi } from "./api"
import { API_CONFIG } from "./config"
import { accessToken, clearSession, expiresSoon, hasRefreshToken, logoutSession, onSessionChange, refreshSession, setSession, tokenExpiresAt } from "./session"

/** identity-service roles; "user" is what older tokens call a member. */
export type Role = "owner" | "admin" | "member" | "viewer" | "user"

interface User {
  username: string
  role: Role
  organization: string
  permissions?: string[]
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAdmin: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  switchOrganization: (organizationId: string) => Promise<boolean>
  refreshToken: () => Promise<boolean>
}

/** How long and how often the page-load check retries while the server is unreachable. */
const BOOT_RETRY_MS = 3_000
const BOOT_RETRIES = 10

const AuthContext = createContext<AuthContextType | null>(null)

function normalizeOrganization(value: unknown): string {
  if (typeof value === "string") {
    return value
  }

  if (value && typeof value === "object") {
    const org = value as Record<string, unknown>
    return (
      (typeof org.organization_name === "string" && org.organization_name) ||
      (typeof org.name === "string" && org.name) ||
      (typeof org.slug === "string" && org.slug) ||
      (typeof org.id === "string" && org.id) ||
      ""
    )
  }

  return ""
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // "invalid": the server answered and refused the token. "unreachable": it
  // didn't answer (network error, 5xx during a deploy): nothing is known
  // about the token, so the session must not be touched (E2).
  const validateAndSetToken = useCallback(async (storedToken: string): Promise<"valid" | "invalid" | "unreachable"> => {
    const result = await authApi.validateToken(storedToken)
    if (result.status === "success" && (result.response?.valid || (result as any).valid)) {
      const data = result.response || result
      // Validating may have refreshed the token: keep the current one.
      setToken(accessToken() || storedToken)
      // /v1/token/validate has no organization name; /v1/me has the full
      // profile, so prefer it and fall back to the token's claims.
      const profile = await authApi.me(storedToken).catch(() => null)
      const me = profile?.status === "success" ? profile.response : undefined
      setUser((prev) => ({
        username: me?.user?.username || (data as any).username || "User",
        role: ((me?.user?.role || (data as any).role) as Role) || "user",
        organization: me?.organization?.name || (data as any).organization_name || prev?.organization || "",
        permissions: me?.permissions || prev?.permissions,
      }))
      return "valid"
    }
    if (result.status === "success" || result.httpStatus === 401 || result.httpStatus === 403) return "invalid"
    return "unreachable"
  }, [])

  useEffect(() => {
    // One-time auth bootstrap from storage on mount. An access token that
    // expired while the app was closed is renewed with the refresh token
    // instead of signing out (WAI-232). The session is cleared only when the
    // server refused it; while the server can't be reached (a deploy) the
    // tokens stay and the check is retried.
    let cancelled = false
    const attempt = async (): Promise<"done" | "retry"> => {
      let stored = accessToken()
      if (!stored) return "done"
      if (expiresSoon(stored)) {
        const renewed = await refreshSession(stored)
        if (renewed) stored = renewed
        else if (!accessToken()) return "done" // the refresh token was refused
        else if (hasRefreshToken()) return "retry"
      }
      const first = await validateAndSetToken(stored)
      if (first === "valid") return "done"
      if (first === "unreachable") return "retry"
      // The server refused the token: renew it once more and check again.
      const fresh = await refreshSession(stored)
      if (fresh) {
        const second = await validateAndSetToken(fresh)
        if (second === "valid") return "done"
        if (second === "unreachable") return "retry"
      } else if (hasRefreshToken()) {
        return "retry" // refresh couldn't reach the server (a refused one removes the token)
      }
      clearSession()
      return "done"
    }
    const boot = async () => {
      for (let tries = 0; !cancelled; tries++) {
        if ((await attempt()) === "done" || tries >= BOOT_RETRIES) return
        await new Promise((resolve) => setTimeout(resolve, BOOT_RETRY_MS))
      }
    }
    boot().finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [validateAndSetToken])

  // A refreshed token (by a request, a timer or another tab) reaches the
  // pages; a session that ended signs out.
  useEffect(() => {
    const unsubscribe = onSessionChange((next) => {
      setToken(next)
      if (!next) setUser(null)
    })
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "auth_token") return
      setToken(e.newValue)
      if (!e.newValue) setUser(null)
    }
    window.addEventListener("storage", onStorage)
    return () => {
      unsubscribe()
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  // Renew a minute before the access token expires, and when the tab comes
  // back after a while, so requests rarely meet an expired token.
  useEffect(() => {
    if (!token) return
    const at = tokenExpiresAt(token)
    const timer = at ? setTimeout(() => void refreshSession(token), Math.max(5_000, at - Date.now() - 60_000)) : undefined
    const onVisible = () => {
      if (document.visibilityState === "visible" && expiresSoon(token, 60_000)) void refreshSession(token)
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [token])

  const extractUserFromResponse = (data: any): User | null => {
    if (data.username || data.role) {
      return {
        username: data.username || "User",
        role: (data.role as Role) || "user",
        organization: normalizeOrganization(data.organization_name || data.organization),
      }
    }
    return null
  }

  const login = async (username: string, password: string) => {
    const result = await authApi.login(username, password)

    // Handle both Go backend format ({access_token, user, organization, memberships})
    // and legacy format ({status: "success", token: "..."})
    const token = (result as any).access_token || result.token
    if (token) {
      setSession(token, (result as any).refresh_token)
      setToken(token)

      const userData = (result as any).user
      if (userData) {
        const membership = (result as any).memberships?.[0]
        setUser({
          username: userData.username || "User",
          role: (membership?.role || userData.role || "user") as Role,
          organization: (result as any).organization?.name || "",
        })
        return { success: true }
      }

      await validateAndSetToken(token)
      return { success: true }
    }

    if (result.status === "success" && result.token) {
      setSession(result.token, (result as any).refresh_token)
      setToken(result.token)
      await validateAndSetToken(result.token)
      return { success: true }
    }

    return { success: false, error: result.message || "Login failed" }
  }

  const refreshTokenFn = async (): Promise<boolean> => !!(await refreshSession(token))

  // Signing out revokes the refresh token on the server, not only here.
  const logout = () => {
    void logoutSession()
    setToken(null)
    setUser(null)
  }

  const switchOrganization = async (organizationId: string) => {
    if (!token) return false
    const result = await authApi.switchOrganization(token, { organization_id: organizationId })
    if (result.status === "success" && (result.response?.token || (result as any).token)) {
      const newToken = result.response?.token || (result as any).token
      setSession(newToken, (result.response as any)?.refresh_token || (result as any).refresh_token)
      await validateAndSetToken(newToken)
      return true
    }
    return false
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin: user?.role === "admin" || user?.role === "owner",
        login,
        logout,
        switchOrganization,
        refreshToken: refreshTokenFn,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(API_CONFIG.REFRESH_TOKEN_KEY)
}
