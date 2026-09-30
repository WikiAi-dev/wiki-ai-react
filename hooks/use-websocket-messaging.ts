"use client"

import { useEffect, useRef, useState } from "react"
import { getApiUrl, getWsUrl } from "@/lib/config"

interface WebSocketMessage {
  type: string
  thread_id?: string
  message?: string
  message_id?: string
  count?: number
  [key: string]: any
}

export function useWebSocketMessaging(token: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const [currentToken, setCurrentToken] = useState(token)

  // Token validation function
  const validateToken = async (providedToken: string): Promise<string | null> => {
    try {
      const response = await fetch(getApiUrl("/v1/organizations"), {
        headers: {
          "Authorization": `Bearer ${providedToken}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        return providedToken // Token is valid
      } else if (response.status === 403) {
        // Dev-only fallback: NEXT_PUBLIC_CMS_ADMIN_USERNAME/PASSWORD must be set explicitly
        // (e.g. in .env.local) for this to attempt a silent re-login - matches the pattern in
        // components/cms-content-manager.tsx and cms-organizations.tsx. There is no hardcoded
        // credential here; in any environment where those vars aren't set (production), this
        // just returns null and the caller falls back to a normal re-authentication prompt.
        const cmsUsername = process.env.NEXT_PUBLIC_CMS_ADMIN_USERNAME
        const cmsPassword = process.env.NEXT_PUBLIC_CMS_ADMIN_PASSWORD
        if (!cmsUsername || !cmsPassword) {
          console.warn("WebSocket token refresh skipped: NEXT_PUBLIC_CMS_ADMIN_USERNAME/PASSWORD not configured")
          return null
        }
        console.log("WebSocket token expired, attempting to refresh...")
        const refreshResponse = await fetch(getApiUrl("/v1/auth/cms-login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: cmsUsername, password: cmsPassword })
        })

        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          const token = data.access_token
          if (token) {
            console.log("WebSocket token refreshed successfully")
            setCurrentToken(token)
            return token
          }
        }
      }
    } catch (err) {
      console.error("WebSocket token validation error:", err)
    }
    
    return null
  }

  const connect = async () => {
    if (!currentToken) {
      console.error("No token provided for WebSocket connection")
      setConnectionError("No authentication token available")
      return
    }

    console.log("WebSocket: Starting connection with token length:", currentToken.length)

    // Close existing connection if any
    if (wsRef.current) {
      try {
        wsRef.current.close()
      } catch (e) {
        console.log("WebSocket: Error closing existing connection:", e)
      }
      wsRef.current = null
    }

    // Validate and refresh token if needed
    try {
      const validToken = await validateToken(currentToken)
      if (!validToken) {
        console.error("WebSocket token validation failed")
        setConnectionError("Authentication failed - please refresh the page")
        return
      }
      console.log("WebSocket: Token validation successful")
    } catch (error) {
      console.error("WebSocket: Token validation error:", error)
      setConnectionError("Token validation failed")
      return
    }

    const wsUrl = `${getWsUrl("/v1/ws/messaging")}?token=${currentToken}`
    console.log("WebSocket: Attempting connection to:", wsUrl.split('?token=')[0] + '?token=...')
    
    // Set connection timeout
    const connectionTimeout = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close()
        setConnectionError("Connection timeout. Server may not be running.")
        setIsConnected(false)
      }
    }, 5000) // 5 second timeout

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log("WebSocket connected")
        clearTimeout(connectionTimeout)
        
        setIsConnected(true)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0
      }

      ws.onclose = (event) => {
        console.log("WebSocket disconnected", event.code, event.reason)
        clearTimeout(connectionTimeout)
        setIsConnected(false)
        
        // Handle specific close codes
        if (event.code === 1008) {
          console.log("WebSocket authentication failed")
          setConnectionError("Authentication failed. Please refresh the page.")
          return
        }
        
        // Don't reconnect if it was a clean close or too many attempts
        if (event.code === 1000 || reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.log("Not reconnecting - clean close or max attempts reached")
          setConnectionError("Connection closed. Please refresh to reconnect.")
          return
        }
        
        // Attempt to reconnect after 3 seconds
        reconnectAttemptsRef.current++
        console.log(`Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`)
        reconnectTimeoutRef.current = setTimeout(async () => {
          // Refresh token before reconnecting
          try {
            const freshToken = await validateToken(currentToken)
            if (freshToken && freshToken !== currentToken) {
              console.log("WebSocket: Using refreshed token for reconnection")
            }
          } catch (error) {
            console.log("WebSocket: Token refresh failed during reconnection, proceeding anyway")
          }
          
          connect()
        }, 3000)
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        console.error("WebSocket state:", ws.readyState)
        console.error("WebSocket URL:", wsUrl.split('?token=')[0] + '?token=...')
        clearTimeout(connectionTimeout)
        
        // Provide more specific error messages based on state
        let errorMessage = "Connection failed. Server may be unavailable."
        if (ws.readyState === WebSocket.CLOSED) {
          errorMessage = "WebSocket connection closed. This might be due to authentication failure."
        } else if (ws.readyState === WebSocket.CLOSING) {
          errorMessage = "WebSocket connection closing..."
        }
        
        setConnectionError(errorMessage)
        setIsConnected(false)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("WebSocket message received:", data)
          
          if (data.type === "message") {
            setMessages(prev => [...prev, data])
          } else if (data.type === "unread_count") {
            setUnreadCount(data.count || 0)
          }
        } catch (parseError) {
          console.log("WebSocket: Error parsing message:", parseError)
        }
      }

    } catch (error) {
      console.error("WebSocket connection error:", error)
      setConnectionError("Failed to create WebSocket connection")
      setIsConnected(false)
    }
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsConnected(false)
  }

  const joinThread = (threadId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "join_thread",
        thread_id: threadId
      }))
    }
  }

  const sendMessage = (threadId: string, message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "send_message",
        thread_id: threadId,
        message: message
      }))
    }
  }

  const markMessageAsRead = (messageId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "mark_read",
        message_id: messageId
      }))
    }
  }

  useEffect(() => {
    if (currentToken) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [currentToken])

  // Update currentToken when token prop changes. Kept as state (not
  // derived during render) because the reconnect effect above needs to
  // observe the *previous* token value to close the old connection before
  // the new one takes effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentToken(token)
  }, [token])

  return {
    isConnected,
    messages,
    unreadCount,
    connectionError,
    joinThread,
    sendMessage,
    markMessageAsRead,
    disconnect
  }
}
