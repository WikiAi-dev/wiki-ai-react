import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, Copy, Loader2, XCircle } from "lucide-react"

interface StatusConfig {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
  icon: ReactNode
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: "Pending", variant: "outline", icon: <Clock className="w-3 h-3" /> },
  indexing: { label: "Indexing", variant: "secondary", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  indexed: { label: "Indexed", variant: "default", icon: <CheckCircle2 className="w-3 h-3" /> },
  failed: { label: "Failed", variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
  error: { label: "Failed", variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
  duplicate: { label: "Already indexed", variant: "outline", icon: <Copy className="w-3 h-3" /> },
}

// Shared status pill for a document's real indexing status (from
// knowledge-service's pending/indexing/indexed/failed states, see WAI-52).
// Used both for the transient just-uploaded strip (WAI-54) and, reusing the
// same component, for each row in the persistent file list (WAI-55).
export function UploadStatusBadge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const, icon: null }
  return (
    <Badge variant={config.variant} className={className}>
      {config.icon}
      {config.label}
    </Badge>
  )
}
