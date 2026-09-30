"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { authApi, apiRequest } from "./api"
import { API_CONFIG } from "./config"

interface User {
  username: string
  role: "admin" | "user" | "owner"
  organization: string
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

  const validateAndSetToken = useCallback(async (storedToken: string) => {
    const result = await authApi.validateToken(storedToken)
    console.log("[v0] Token validation result:", result)
    if (result.status === "success" && (result.response?.valid || (result as any).valid)) {
      const data = result.response || result
      setToken(storedToken)
      // /v1/token/validate only returns organization_id, not a name, so a
      // re-validation (this runs on every mount, not just login) would
      // otherwise blank out the organization name that login() populated.
      setUser((prev) => ({
        username: (data as any).username || "User",
        role: ((data as any).role as User["role"]) || "user",
        organization: (data as any).organization_name || (data as any).organization || prev?.organization || "",
      }))
      return true
    }
    localStorage.removeItem("auth_token")
    return false
  }, [])

  useEffect(() => {
    // One-time auth bootstrap from localStorage on mount.
    const storedToken = localStorage.getItem("auth_token")
    if (storedToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      validateAndSetToken(storedToken).finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [validateAndSetToken])

  const extractUserFromResponse = (data: any): User | null => {
    if (data.username || data.role) {
      return {
        username: data.username || "User",
        role: (data.role as "admin" | "owner" | "user") || "user",
        organization: normalizeOrganization(data.organization_name || data.organization),
      }
    }
    return null
  }

  const login = async (username: string, password: string) => {
    console.log("[v0] Attempting login for:", username)
    const result = await authApi.login(username, password)
    console.log("[v0] Login result:", result)

    // Handle both Go backend format ({access_token, user, organization, memberships})
    // and legacy format ({status: "success", token: "..."})
    const token = (result as any).access_token || result.token
    if (token) {
      localStorage.setItem("auth_token", token)
      setToken(token)

      const userData = (result as any).user
      if (userData) {
        const membership = (result as any).memberships?.[0]
        setUser({
          username: userData.username || "User",
          role: (membership?.role || userData.role || "user") as "admin" | "user" | "owner",
          organization: (result as any).organization?.name || "",
        })
        return { success: true }
      }

      await validateAndSetToken(token)
      return { success: true }
    }

    if (result.status === "success" && result.token) {
      localStorage.setItem("auth_token", result.token)
      setToken(result.token)
      await validateAndSetToken(result.token)
      return { success: true }
    }

    return { success: false, error: result.message || "Login failed" }
  }

  const refreshTokenFn = async (): Promise<boolean> => {
    const storedRefreshToken = localStorage.getItem(API_CONFIG.REFRESH_TOKEN_KEY)
    if (!storedRefreshToken) return false
    try {
      const res = await apiRequest<{ token: string; refresh_token?: string }>({
        url: API_CONFIG.ENDPOINTS.REFRESH,
        method: "POST",
        data: { refresh_token: storedRefreshToken },
      })
      if (res.status === "success" && res.response) {
        const newToken = (res.response as any).token_pair?.access_token || (res.response as any).token || (res.response as any).access_token
        if (newToken) {
          localStorage.setItem("auth_token", newToken)
          setToken(newToken)
          const newRefresh = (res.response as any).token_pair?.refresh_token || (res.response as any).refresh_token
          if (newRefresh) {
            localStorage.setItem(API_CONFIG.REFRESH_TOKEN_KEY, newRefresh)
          }
          return true
        }
      }
    } catch (err) {
      console.error("Token refresh failed:", err)
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem(API_CONFIG.REFRESH_TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  const switchOrganization = async (organizationId: string) => {
    if (!token) return false
    const result = await authApi.switchOrganization(token, { organization_id: organizationId })
    if (result.status === "success" && (result.response?.token || (result as any).token)) {
      const newToken = result.response?.token || (result as any).token
      localStorage.setItem("auth_token", newToken)
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

export const PERMISSIONS = {
  VIEW_FILES: 'view_files',
  MANAGE_USERS: 'manage_users',
  MANAGE_ORGANIZATIONS: 'manage_organizations',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_PLUGINS: 'manage_plugins',
  ADMIN_ACCESS: 'admin_access'
} as const

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
