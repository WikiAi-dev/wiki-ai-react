"use client"

import { useRef, useEffect, useState, useCallback } from 'react'
import { API_CONFIG, getWsUrl } from './config'

interface WebSocketOptions {
  url?: string
  token?: string
  onMessage?: (data: any) => void
  onError?: (error: Event) => void
  onClose?: (event: CloseEvent) => void
  onOpen?: (event: Event) => void
}

export function useWebSocket(options: WebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return
    }

    const wsUrl = options.url || getWsUrl("/ws")
    const token = options.token || localStorage.getItem('auth_token')
    
    if (!token) {
      console.log('No token available for WebSocket connection (optional)')
      return
    }

    try {
      ws.current = new WebSocket(`${wsUrl}?token=${token}`)

      ws.current.onopen = (event) => {
        console.log('WebSocket connected')
        setIsConnected(true)
        reconnectAttempts.current = 0
        options.onOpen?.(event)
      }

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
          options.onMessage?.(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.current.onerror = (error) => {
        // Don't log as error since WebSocket is optional
        console.log('WebSocket connection failed (this is normal if server doesn\'t support WebSockets)')
        options.onError?.(error)
      }

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        options.onClose?.(event)

        // Only attempt to reconnect for non-normal closures and if we haven't exceeded attempts
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000)
          console.log(`Attempting to reconnect in ${delay}ms...`)
          
          reconnectTimeout.current = setTimeout(() => {
            // Self-referential by design: this callback only runs later
            // (after the reconnect delay), by which point `connect` is
            // fully assigned - safe despite the syntactic self-reference.
            // eslint-disable-next-line react-hooks/immutability
            connect()
          }, delay)
        }
      }
    } catch (error) {
      console.log('Failed to create WebSocket connection (this is normal):', error)
    }
  }, [options])

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
      reconnectTimeout.current = null
    }
    
    if (ws.current) {
      ws.current.close(1000, 'Client disconnect')
      ws.current = null
    }
    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect
  }
}
