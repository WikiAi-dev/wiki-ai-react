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

const POLL_INTERVAL_MS = 5000
// A status request that fails (a network error, a 5xx during a deploy) says
// nothing about the document, which keeps indexing on the server: keep
// polling, backing off up to MAX_BACKOFF_MS. Only a definitive answer stops
// it: a terminal status, or a 404 (the document is gone).
const MAX_BACKOFF_MS = 30000
const TERMINAL_STATUSES: UploadStatusValue[] = ["indexed", "failed", "duplicate", "error"]

// Frontend counterpart to knowledge-service's async ingest (WAI-52) and its
// GET /v1/documents/{id}/status endpoint (WAI-53). Ingest now returns almost
// immediately with status "pending" instead of blocking until indexing
// finishes, so this hook polls each in-flight upload's status every ~5s
// until it reaches a terminal state (indexed/failed/duplicate), letting the
// UI show live pending -> indexing -> indexed/failed progress per file.
export function useUploadStatusPoll(token: string | null) {
  const [entries, setEntries] = useState<UploadStatusEntry[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const stopPolling = useCallback((documentId: string) => {
    const timer = timersRef.current.get(documentId)
    if (timer) {
      clearTimeout(timer)
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

        let failures = 0
        const schedule = () => {
          const delay = Math.min(POLL_INTERVAL_MS * 2 ** failures, MAX_BACKOFF_MS)
          const timer = setTimeout(poll, delay)
          timersRef.current.set(documentId, timer)
        }
        const poll = async () => {
          const result = await filesApi.getStatus(token, documentId).catch(() => null)
          // Stopped (dismissed, cleared, unmounted) while the request ran.
          if (!timersRef.current.has(documentId)) return
          if (!result || result.status !== "success" || !result.response) {
            if (result?.httpStatus === 404) {
              stopPolling(documentId)
              setEntries((prev) =>
                prev.map((e) =>
                  e.documentId === documentId ? { ...e, status: "error", message: result.message || "Could not get the indexing status" } : e,
                ),
              )
              return
            }
            failures++
            schedule()
            return
          }
          failures = 0

          const nextStatus = (result.response.status as UploadStatusValue) || "pending"
          setEntries((prev) => prev.map((e) => (e.documentId === documentId ? { ...e, status: nextStatus } : e)))

          if (TERMINAL_STATUSES.includes(nextStatus)) {
            stopPolling(documentId)
            return
          }
          schedule()
        }
        schedule()
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
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
    }
  }, [])

  return { entries, track, dismiss, clear }
}
