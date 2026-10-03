"use client"

import { useCallback } from "react"
import { AlertCircle, CheckCircle2, Clock, Loader2, PauseCircle } from "lucide-react"
import type { ConnectionState, ProviderField, ProviderSpec } from "@/lib/connections"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/src/i18n"
import { Badge } from "@/components/ui/badge"

// Each platform's mark: its usual initials on a tint of its brand colour.
const MARKS: Record<string, { text: string; color: string }> = {
  bitrix24: { text: "B24", color: "#2FC6F6" },
  jira: { text: "J", color: "#2684FF" },
  confluence: { text: "C", color: "#1868DB" },
  onec: { text: "1С", color: "#E8B500" },
  rest: { text: "API", color: "#7C8798" },
  push: { text: "↧", color: "#7C8798" },
  opencart: { text: "OC", color: "#23A1D1" },
}

/** A round mark standing for a platform. */
export function ProviderMark({ provider, title, className }: { provider: string; title?: string; className?: string }) {
  const mark = MARKS[provider] ?? { text: (title || provider).slice(0, 2).toUpperCase(), color: "#7C8798" }
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full text-[11px] font-bold tracking-tight",
        className,
      )}
      style={{ backgroundColor: `${mark.color}1f`, color: mark.color }}
    >
      {mark.text}
    </span>
  )
}

const STATE_STYLE: Record<ConnectionState, { variant: "success" | "default" | "secondary" | "destructive" | "warning"; icon: typeof Clock }> = {
  ok: { variant: "success", icon: CheckCircle2 },
  syncing: { variant: "default", icon: Loader2 },
  pending: { variant: "secondary", icon: Clock },
  error: { variant: "destructive", icon: AlertCircle },
  paused: { variant: "warning", icon: PauseCircle },
}

/** Where a connection's syncing stands. */
export function StateBadge({ state }: { state: ConnectionState }) {
  const { t } = useTranslation()
  const style = STATE_STYLE[state] ?? STATE_STYLE.pending
  const Icon = style.icon
  return (
    <Badge variant={style.variant} className="gap-1.5">
      <Icon className={cn("size-3.5", state === "syncing" && "animate-spin")} aria-hidden />
      {t(`connections.state.${state}`)}
    </Badge>
  )
}

/**
 * Platform texts (form labels, help, kinds, setup steps) come from
 * connector-service in English; this prefers the app's own translation when
 * there is one.
 */
export function useProviderText() {
  const { t } = useTranslation()
  const tr = useCallback(
    (key: string, fallback: string) => {
      const value = t(key)
      return typeof value === "string" && value !== key ? value : fallback
    },
    [t],
  )
  return {
    description: (spec: ProviderSpec) => tr(`connections.providers.${spec.id}.description`, spec.description),
    kind: (providerId: string, kind: string, fallback: string) => tr(`connections.providers.${providerId}.kinds.${kind}`, fallback),
    fieldLabel: (spec: ProviderSpec, f: ProviderField) => tr(`connections.providers.${spec.id}.fields.${f.key}.label`, f.label),
    fieldHelp: (spec: ProviderSpec, f: ProviderField) => (f.help ? tr(`connections.providers.${spec.id}.fields.${f.key}.help`, f.help) : ""),
    option: (spec: ProviderSpec, f: ProviderField, value: string, fallback: string) =>
      tr(`connections.providers.${spec.id}.fields.${f.key}.options.${value}`, fallback),
    setupStep: (spec: ProviderSpec, index: number, fallback: string) => tr(`connections.providers.${spec.id}.webhookSetup.${index}`, fallback),
  }
}
