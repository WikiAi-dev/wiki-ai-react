"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Search, Loader2 } from "lucide-react"
import { getApiUrl } from "@/lib/config"

interface CMSUsersProps {
  token: string
}

interface UserAccount {
  id: string
  username: string
  email?: string
  display_name?: string
  status: string
  created_at: string
}

export default function CMSUsers({ token }: CMSUsersProps) {
  const [users, setUsers] = useState<UserAccount[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track the current valid token (may be refreshed) — same pattern as
  // CMSOrganizations/CMSContentManager.
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

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await makeAuthenticatedRequest(getApiUrl("/v1/admin/users"), { method: "GET" })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.items || [])
        setError(null)
      } else {
        setError(`Failed to fetch users (${response.status})`)
      }
    } catch (err) {
      setError("Failed to connect to API")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchUsers()
    }
  }, [token])

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase()
    return (
      u.username.toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.display_name ?? "").toLowerCase().includes(q)
    )
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Users ({users.length})
        </CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-destructive text-sm mb-4">{error}</p>}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell>{u.email || "—"}</TableCell>
                    <TableCell>{u.display_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === "active" ? "default" : "secondary"}>{u.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
