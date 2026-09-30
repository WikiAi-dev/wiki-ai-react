"use client"

import { useState, useEffect } from "react"
import CMSLogin from "@/components/cms-login"
import CMSDashboard from "@/components/cms-dashboard"

const SESSION_STORAGE_KEY = "cms_token"

export default function CMSPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState("")

  // Rehydrate from sessionStorage after mount (not during the initial render,
  // to avoid a server/client hydration mismatch — sessionStorage doesn't
  // exist during SSR). sessionStorage rather than localStorage so the
  // CMS-master token doesn't outlive the browser session.
  useEffect(() => {
    const savedToken = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (savedToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(savedToken)
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = (authToken: string) => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, authToken)
    setToken(authToken)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    setToken("")
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return <CMSLogin onLogin={handleLogin} />
  }

  return <CMSDashboard token={token} onLogout={handleLogout} />
}
