"use client"

import type { ReactNode } from "react"
import { CheckCircle2, Clock, Copy, Loader2, XCircle } from "lucide-react"
import { useTranslation } from "@/src/i18n"
import { Badge } from "@/components/ui/badge"

interface StatusConfig {
  key: string
  variant: "secondary" | "destructive" | "outline" | "success"
  icon: ReactNode
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { key: "pending", variant: "outline", icon: <Clock /> },
  indexing: { key: "indexing", variant: "secondary", icon: <Loader2 className="animate-spin" /> },
  indexed: { key: "indexed", variant: "success", icon: <CheckCircle2 /> },
  failed: { key: "failed", variant: "destructive", icon: <XCircle /> },
  error: { key: "failed", variant: "destructive", icon: <XCircle /> },
  duplicate: { key: "duplicate", variant: "outline", icon: <Copy /> },
}

// Shared status pill for a document's real indexing status (from
// knowledge-service's pending/indexing/indexed/failed states, see WAI-52).
// Used both for the transient just-uploaded strip (WAI-54) and, reusing the
// same component, for each row in the persistent file list (WAI-55).
export function UploadStatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useTranslation()
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config?.variant ?? "outline"} className={className}>
      {config?.icon}
      {config ? t(`files.library.status.${config.key}`) : status}
    </Badge>
  )
}
