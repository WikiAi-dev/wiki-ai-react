"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, FileText, Loader2, Pin, X } from "lucide-react"
import { filesApi } from "@/lib/api"
import { documentSource } from "@/lib/connections"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/src/i18n"
import type { KnowledgeFile } from "@/components/telephony/file-picker"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/** How much of the pinned documents' text the prompt holds (telephony-service's dialog.DocumentsRunes). */
export const PINNED_LIMIT = 8000
/** How many documents can be pinned (telephony-service's scenario.MaxPinned). */
export const PINNED_MAX = 10
/** Records shown per source in the picker until the search narrows them. */
const SHOWN_PER_GROUP = 50

/**
 * A document's text as the engine puts it in the prompt: lines kept,
 * spaces and blank lines squeezed (knowledge.tidyText).
 */
export function tidyText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.split(/\s+/).filter(Boolean).join(" "))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** A pinned document's text; null when it can't be read (gone from the knowledge base). */
export async function pinnedText(token: string, documentId: string): Promise<string | null> {
  const r = await filesApi.getContent(token, documentId)
  return r.status === "success" && r.response ? tidyText(r.response.content) : null
}

const length = (text: string) => [...text].length

/** Where a document came from, for its row: the connected system and kind, or an upload. */
function sourceLabel(f: KnowledgeFile | undefined): string | null {
  const from = f && documentSource(f.metadata)
  if (!from) return null
  return [from.providerTitle, from.kindTitle].filter(Boolean).join(" · ")
}

/**
 * Documents the assistant has in full from the start of every call, so it
 * answers from them without searching (WAI-236): a list in pinning order,
 * a meter of the prompt they take, and a picker that refuses a document
 * that doesn't fit.
 */
export function PinnedDocuments({
  token,
  files,
  pinned,
  onChange,
  disabled,
}: {
  token: string | null
  files: KnowledgeFile[]
  pinned: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}) {
  const { t, locale } = useTranslation()
  /** Characters of each document measured; null for one that can't be read. */
  const [sizes, setSizes] = useState<Record<string, number | null>>({})
  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState("")
  const [adding, setAdding] = useState<string | null>(null)
  const [refusal, setRefusal] = useState("")

  const byId = useMemo(() => new Map(files.map((f) => [f.document_id, f])), [files])
  const num = (n: number) => n.toLocaleString(locale === "ru" ? "ru-RU" : "en-GB")

  /** Documents being measured, so none is fetched twice at once. */
  const inFlight = useRef(new Map<string, Promise<number | null>>())

  const measure = (id: string): Promise<number | null> => {
    if (!token) return Promise.resolve(null)
    let size = inFlight.current.get(id)
    if (!size) {
      size = pinnedText(token, id).then((text) => {
        const n = text === null ? null : length(text)
        setSizes((s) => ({ ...s, [id]: n }))
        inFlight.current.delete(id)
        return n
      })
      inFlight.current.set(id, size)
    }
    return size
  }

  // Documents pinned before this visit are measured once.
  useEffect(() => {
    for (const id of pinned) if (!(id in sizes)) void measure(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned, token])

  const measuring = pinned.some((id) => !(id in sizes))
  const used = pinned.reduce((sum, id) => sum + (sizes[id] ?? 0), 0)
  const free = Math.max(0, PINNED_LIMIT - used)
  const over = used > PINNED_LIMIT
  const full = pinned.length >= PINNED_MAX

  const title = (id: string) => byId.get(id)?.title || t("telephony.assistants.files.gone")

  const pin = async (f: KnowledgeFile) => {
    if (pinned.includes(f.document_id) || full || measuring || adding) return
    setRefusal("")
    setAdding(f.document_id)
    const size = f.document_id in sizes ? sizes[f.document_id] : await measure(f.document_id)
    setAdding(null)
    if (size === null || size === undefined) {
      setRefusal(t("telephony.assistants.pinned.failed"))
      return
    }
    if (used + size > PINNED_LIMIT) {
      setRefusal(t("telephony.assistants.pinned.tooBig", { title: f.title || f.document_id, size: num(size), free: num(free) }))
      return
    }
    onChange([...pinned, f.document_id])
    setPicking(false)
  }

  // The picker lists the knowledge base by source, filtered here rather
  // than by cmdk so a connection with thousands of records stays quick.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = new Map<string, KnowledgeFile[]>()
    for (const f of files) {
      if (q && !(f.title || f.document_id).toLowerCase().includes(q)) continue
      const from = documentSource(f.metadata)
      const key = from ? [from.providerTitle, from.connectionName].filter(Boolean).join(" · ") : ""
      out.set(key, [...(out.get(key) ?? []), f])
    }
    return [...out.entries()].sort(([a], [b]) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)))
  }, [files, query])

  const meterTone = over ? "bg-destructive" : used > PINNED_LIMIT * 0.9 ? "bg-warning" : "bg-primary"

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className={cn("tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
            {measuring ? t("telephony.assistants.pinned.measuring") : t("telephony.assistants.pinned.meter", { used: num(used), limit: num(PINNED_LIMIT) })}
          </span>
          <span className="tabular-nums text-muted-foreground">{t("telephony.assistants.pinned.count", { count: pinned.length, max: PINNED_MAX })}</span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={PINNED_LIMIT}
          aria-valuenow={used}
          aria-label={t("telephony.assistants.pinned.title")}
        >
          <div className={cn("h-full rounded-full transition-[width]", meterTone)} style={{ width: `${Math.min(100, (used / PINNED_LIMIT) * 100)}%` }} />
        </div>
        {over && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-[13px] text-foreground">{t("telephony.assistants.pinned.over")}</p>}
      </div>

      {pinned.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-[13px] text-muted-foreground">{t("telephony.assistants.pinned.none")}</p>
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {pinned.map((id) => {
            const size = sizes[id]
            const source = sourceLabel(byId.get(id))
            return (
              <li key={id} className="flex items-center gap-3 px-4 py-2.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm", byId.has(id) ? "text-foreground" : "text-muted-foreground")}>{title(id)}</span>
                  {byId.has(id) && <span className="block truncate text-xs text-muted-foreground">{source ?? t("telephony.assistants.pinned.uploaded")}</span>}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {!(id in sizes) ? (
                    <Loader2 className="size-3.5 animate-spin" aria-label={t("telephony.assistants.pinned.measuring")} />
                  ) : size === null ? (
                    t("telephony.assistants.pinned.unreadable")
                  ) : (
                    t("telephony.assistants.pinned.chars", { count: num(size) })
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => onChange(pinned.filter((x) => x !== id))}
                  disabled={disabled}
                  aria-label={t("telephony.assistants.pinned.remove", { title: title(id) })}
                >
                  <X />
                </Button>
              </li>
            )
          })}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => (setQuery(""), setRefusal(""), setPicking(true))}
          // Until the pinned documents are measured, what is free isn't known.
          disabled={disabled || full || measuring || files.length === 0}
        >
          <Pin />
          {t("telephony.assistants.pinned.add")}
        </Button>
        {full && <span className="text-[13px] text-muted-foreground">{t("telephony.assistants.pinned.full", { max: PINNED_MAX })}</span>}
      </div>

      <Dialog open={picking} onOpenChange={(open) => !adding && setPicking(open)}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="px-5 pb-3 pt-5">
            <DialogTitle>{t("telephony.assistants.pinned.add")}</DialogTitle>
            <DialogDescription>{t("telephony.assistants.pinned.pickDescription", { free: num(free) })}</DialogDescription>
          </DialogHeader>
          {refusal && <p className="mx-5 mb-3 rounded-xl bg-warning/10 px-3 py-2 text-[13px] text-foreground" role="alert">{refusal}</p>}
          <Command shouldFilter={false} className="border-t border-border">
            <CommandInput value={query} onValueChange={setQuery} placeholder={t("telephony.assistants.files.search")} />
            <CommandList className="max-h-[50vh]">
              <CommandEmpty>{t("telephony.assistants.files.nothingFound")}</CommandEmpty>
              {groups.map(([key, list]) => (
                <CommandGroup key={key || "uploaded"} heading={key || t("telephony.assistants.files.uploaded")}>
                  {list.slice(0, SHOWN_PER_GROUP).map((f) => {
                    const on = pinned.includes(f.document_id)
                    return (
                      <CommandItem
                        key={f.document_id}
                        value={f.document_id}
                        disabled={on || !!adding}
                        onSelect={() => void pin(f)}
                        className="gap-3 py-2"
                      >
                        <FileText aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{f.title || f.document_id}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {f.document_id in sizes && sizes[f.document_id] !== null
                              ? t("telephony.assistants.pinned.chars", { count: num(sizes[f.document_id] as number) })
                              : (sourceLabel(f) ?? t("telephony.assistants.files.chunks", { count: f.chunk_count }))}
                          </span>
                        </span>
                        {adding === f.document_id ? (
                          <Loader2 className="animate-spin" aria-hidden />
                        ) : on ? (
                          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <Check className="size-3.5" aria-hidden />
                            {t("telephony.assistants.pinned.pinnedMark")}
                          </span>
                        ) : null}
                      </CommandItem>
                    )
                  })}
                  {list.length > SHOWN_PER_GROUP && (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">{t("telephony.assistants.pinned.more", { count: list.length - SHOWN_PER_GROUP })}</p>
                  )}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  )
}
