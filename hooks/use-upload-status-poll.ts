"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { filesApi } from "@/lib/api"

export type UploadStatusValue = "pending" | "indexing" | "indexed" | "failed" | "duplicate" | "error"

export interface UploadStatusEntry {
  filename: string
  documentId?: string
  status: UploadStatusValue
  message?: string
}

const POLL_INTERVAL_MS = 2000
const TERMINAL_STATUSES: UploadStatusValue[] = ["indexed", "failed", "duplicate", "error"]

// Frontend counterpart to knowledge-service's async ingest (WAI-52) and its
// GET /v1/documents/{id}/status endpoint (WAI-53). Ingest now returns almost
// immediately with status "pending" instead of blocking until indexing
// finishes, so this hook polls each in-flight upload's status every ~2s
// until it reaches a terminal state (indexed/failed/duplicate), letting the
// UI show live pending -> indexing -> indexed/failed progress per file.
export function useUploadStatusPoll(token: string | null) {
  const [entries, setEntries] = useState<UploadStatusEntry[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  const stopPolling = useCallback((documentId: string) => {
    const timer = timersRef.current.get(documentId)
    if (timer) {
      clearInterval(timer)
      timersRef.current.delete(documentId)
    }
  }, [])

  // Registers a fresh batch of upload results and starts polling any of
  // them that aren't already in a terminal state.
  const track = useCallback(
    (initial: UploadStatusEntry[]) => {
      setEntries((prev) => [...prev, ...initial])

      if (!token) return

      for (const entry of initial) {
        const documentId = entry.documentId
        if (!documentId || TERMINAL_STATUSES.includes(entry.status)) continue
        if (timersRef.current.has(documentId)) continue

        const timer = setInterval(async () => {
          const result = await filesApi.getStatus(token, documentId)
          if (result.status !== "success" || !result.response) return

          const nextStatus = (result.response.status as UploadStatusValue) || "pending"
          setEntries((prev) => prev.map((e) => (e.documentId === documentId ? { ...e, status: nextStatus } : e)))

          if (TERMINAL_STATUSES.includes(nextStatus)) {
            stopPolling(documentId)
          }
        }, POLL_INTERVAL_MS)

        timersRef.current.set(documentId, timer)
      }
    },
    [token, stopPolling],
  )

  const dismiss = useCallback(
    (documentId: string) => {
      stopPolling(documentId)
      setEntries((prev) => prev.filter((e) => e.documentId !== documentId))
    },
    [stopPolling],
  )

  const clear = useCallback(() => {
    for (const documentId of timersRef.current.keys()) stopPolling(documentId)
    setEntries([])
  }, [stopPolling])

  // Stop every in-flight timer on unmount so polling doesn't keep firing
  // (and calling setEntries) after the page navigates away.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers.values()) clearInterval(timer)
      timers.clear()
    }
  }, [])

  return { entries, track, dismiss, clear }
}
