"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react"
import { getApiUrl } from "@/lib/config"

interface CMSSystemHealthProps {
  token: string
}

interface ServiceStatus {
  name: string
  status: "up" | "down"
  latency_ms: number
  error?: string
}

const POLL_INTERVAL_MS = 30_000

export default function CMSSystemHealth({ token }: CMSSystemHealthProps) {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [checkedAt, setCheckedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track the current valid token (may be refreshed) — same pattern as
  // CMSOrganizations/CMSUsers.
  const currentTokenRef = useRef<string>(token)
  useEffect(() => {
    currentTokenRef.current = token
  }, [token])

  const refreshToken = async (): Promise<string | null> => {
    const cmsUsername = process.env.NEXT_PUBLIC_CMS_ADMIN_USERNAME
    const cmsPassword = process.env.NEXT_PUBLIC_CMS_ADMIN_PASSWORD
    if (!cmsUsername || !cmsPassword) {
      return null
    }
    try {
      const response = await fetch(getApiUrl("/v1/auth/cms-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cmsUsername, password: cmsPassword }),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.access_token) {
          currentTokenRef.current = data.access_token
          return data.access_token
        }
      }
    } catch (err) {
      console.error("Token refresh error:", err)
    }
    return null
  }

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const currentToken = currentTokenRef.current
    const response = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
    })
    if (response.status === 401 || response.status === 403) {
      const newToken = await refreshToken()
      if (newToken && newToken !== currentToken) {
        return fetch(url, {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${newToken}`, "Content-Type": "application/json" },
        })
      }
    }
    return response
  }

  const fetchStatus = async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true)
    try {
      const response = await makeAuthenticatedRequest(getApiUrl("/v1/admin/system-status"), { method: "GET" })
      if (response.ok) {
        const data = await response.json()
        setServices(data.services || [])
        setCheckedAt(data.checked_at || null)
        setError(null)
      } else {
        setError(`Failed to fetch system status (${response.status})`)
      }
    } catch (err) {
      setError("Failed to connect to API")
      console.error(err)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatus(true)
    const interval = setInterval(() => fetchStatus(false), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [token])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
        <div className="flex items-center gap-3">
          {checkedAt && (
            <span className="text-xs text-muted-foreground">
              Checked {new Date(checkedAt).toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchStatus(true)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-destructive text-sm mb-4">{error}</p>}
        {loading && services.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((svc) => (
              <Card key={svc.name}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{svc.name}</span>
                    {svc.status === "up" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <Badge
                    variant={svc.status === "up" ? "outline" : "destructive"}
                    className={svc.status === "up" ? "border-green-600 text-green-600" : ""}
                  >
                    {svc.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">{svc.latency_ms}ms</p>
                  {svc.error && <p className="text-xs text-destructive mt-1 truncate" title={svc.error}>{svc.error}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
