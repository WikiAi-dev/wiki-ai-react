"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { connectionsApi, fullTime, relativeTime, type Connection, type SyncJob } from "@/lib/connections"
import { useTranslation } from "@/src/i18n"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const STATUS_VARIANT: Record<SyncJob["status"], "success" | "default" | "secondary" | "destructive" | "warning"> = {
  queued: "secondary",
  running: "default",
  succeeded: "success",
  partial: "warning",
  failed: "destructive",
}

/** The last runs of a connection: what triggered them and what they did. */
export function HistoryDialog({ open, onOpenChange, connection }: { open: boolean; onOpenChange: (open: boolean) => void; connection: Connection }) {
  const { t, locale } = useTranslation()
  const { token } = useAuth()
  const [jobs, setJobs] = useState<SyncJob[] | null>(null)

  useEffect(() => {
    if (!open || !token) return
    let cancelled = false
    connectionsApi.jobs(token, connection.id, 20).then((result) => {
      if (!cancelled) setJobs(result.status === "success" && result.response ? result.response.items : [])
    })
    return () => {
      cancelled = true
    }
  }, [open, token, connection.id])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("connections.history.title")}</DialogTitle>
          <DialogDescription>{connection.name}</DialogDescription>
        </DialogHeader>
        {jobs === null ? (
          <div className="flex flex-col gap-3" aria-busy>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("connections.history.empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {jobs.map((job) => (
              <li key={job.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{t(`connections.history.mode.${job.mode}`)}</span>
                  <Badge variant={STATUS_VARIANT[job.status]}>{t(`connections.history.status.${job.status}`)}</Badge>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground" title={fullTime(job.created_at, locale)}>
                    {relativeTime(job.finished_at || job.started_at || job.created_at, locale)}
                  </span>
                </div>
                {(job.status === "succeeded" || job.status === "partial" || job.stats.fetched > 0) && (
                  <p className="text-[13px] tabular-nums text-muted-foreground">{t("connections.history.stats", { ...job.stats })}</p>
                )}
                {job.error && <p className="break-words text-[13px] leading-snug text-destructive">{job.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
