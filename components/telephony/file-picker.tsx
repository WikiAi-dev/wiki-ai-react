"use client"

import { useMemo, useState } from "react"
import { ChevronRight, Database, FileText, Search, Upload } from "lucide-react"
import { documentSource, type Connection } from "@/lib/connections"
import type { ScopeItem } from "@/lib/telephony"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/src/i18n"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

export interface KnowledgeFile {
  document_id: string
  title: string
  chunk_count: number
  /** connector-service's metadata on a synced record (source, connection_id, kind…). */
  metadata?: Record<string, unknown>
}

/**
 * What the assistant may search: single documents, and connections whole
 * or by kind of record. A connection or a kind covers the records synced
 * later too.
 */
export interface KnowledgeSelection {
  documents: string[]
  /** No kinds is the whole connection. */
  connections: { id: string; kinds: string[] }[]
}

export function selectionFromItems(items: ScopeItem[]): KnowledgeSelection {
  return {
    documents: items.filter((i) => i.kind === "document" && i.document_id).map((i) => i.document_id as string),
    connections: items
      .filter((i) => i.kind === "connection" && i.connection_id)
      .map((i) => ({ id: i.connection_id as string, kinds: i.kinds ?? [] })),
  }
}

export function selectionToItems(s: KnowledgeSelection): ScopeItem[] {
  return [
    ...s.documents.map((id) => ({ kind: "document" as const, document_id: id })),
    ...s.connections.map((c) => ({ kind: "connection" as const, connection_id: c.id, ...(c.kinds.length ? { kinds: c.kinds } : {}) })),
  ]
}

interface Kind {
  id: string
  title: string
  files: KnowledgeFile[]
}

/** A connected system's records, by kind. */
interface Source {
  id: string
  title: string
  /** It has a connection id, so it can be chosen whole or by kind. */
  dynamic: boolean
  kinds: Kind[]
  count: number
}

/** The knowledge base by where it came from: uploaded files, then each connection. */
function group(files: KnowledgeFile[], connections: Connection[], chosen: string[]) {
  const uploaded: KnowledgeFile[] = []
  const sources = new Map<string, Source>()
  const source = (id: string, title: string, dynamic: boolean) => {
    let s = sources.get(id)
    if (!s) {
      s = { id, title, dynamic, kinds: [], count: 0 }
      sources.set(id, s)
    }
    return s
  }
  for (const c of connections) source(c.id, `${c.provider_title || c.provider} · ${c.name}`, true)
  for (const f of files) {
    const from = documentSource(f.metadata)
    if (!from) {
      uploaded.push(f)
      continue
    }
    const connectionId = typeof f.metadata?.connection_id === "string" ? f.metadata.connection_id : ""
    const title = [from.providerTitle, from.connectionName].filter(Boolean).join(" · ")
    // Records of go-core's old connectors have no connection id: they can
    // only be picked one by one.
    const s = connectionId ? source(connectionId, title, true) : source(`legacy:${title}`, title, false)
    let k = s.kinds.find((x) => x.id === from.kind)
    if (!k) {
      k = { id: from.kind, title: from.kindTitle || from.kind, files: [] }
      s.kinds.push(k)
    }
    k.files.push(f)
    s.count++
  }
  // A file checked before but gone from the knowledge base is listed, so it
  // can be unchecked.
  const known = new Set(files.map((f) => f.document_id))
  for (const id of chosen) if (!known.has(id)) uploaded.push({ document_id: id, title: "", chunk_count: -1 })
  const list = [...sources.values()].sort((a, b) => a.title.localeCompare(b.title))
  for (const s of list) s.kinds.sort((a, b) => a.title.localeCompare(b.title))
  return { uploaded, sources: list }
}

function FileRow({ file, checked, disabled, onCheck }: { file: KnowledgeFile; checked: boolean; disabled?: boolean; onCheck: (on: boolean) => void }) {
  const { t } = useTranslation()
  return (
    <li>
      <label className={cn("flex items-center gap-3 px-4 py-2 hover:bg-muted/50", disabled ? "cursor-default" : "cursor-pointer")}>
        <Checkbox checked={checked} onCheckedChange={(v) => onCheck(v === true)} disabled={disabled} />
        <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-foreground">{file.title || t("telephony.assistants.files.gone")}</span>
          {file.chunk_count >= 0 && <span className="block text-xs text-muted-foreground">{t("telephony.assistants.files.chunks", { count: file.chunk_count })}</span>}
        </span>
      </label>
    </li>
  )
}

/** A group's header: opens and closes it, and says what of it is chosen. */
function GroupHeader({ icon: Icon, title, status, open, onToggle }: { icon: typeof Upload; title: string; status: string; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50">
      <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} aria-hidden />
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{title}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{status}</span>
    </button>
  )
}

/**
 * The knowledge base by source, with a checkbox on each level: uploaded
 * files one by one; a connected system whole, by kind of record or record
 * by record. Only what is checked is what the assistant may search.
 */
export function FilePicker({
  files,
  connections,
  selected,
  onChange,
  disabled,
}: {
  files: KnowledgeFile[]
  connections: Connection[]
  selected: KnowledgeSelection
  onChange: (s: KnowledgeSelection) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<Set<string>>(() => new Set(["uploaded"]))
  const [openKinds, setOpenKinds] = useState<Set<string>>(() => new Set())
  const { uploaded, sources } = useMemo(() => group(files, connections, selected.documents), [files, connections, selected.documents])

  const q = query.trim().toLowerCase()
  const matches = (f: KnowledgeFile) => !q || (f.title || f.document_id).toLowerCase().includes(q)
  const docs = new Set(selected.documents)
  const conn = (id: string) => selected.connections.find((c) => c.id === id)
  const whole = (id: string) => conn(id)?.kinds.length === 0
  const kindOn = (id: string, kind: string) => {
    const c = conn(id)
    return !!c && (c.kinds.length === 0 || c.kinds.includes(kind))
  }
  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  }

  const setDoc = (id: string, on: boolean) =>
    onChange({ ...selected, documents: on ? [...new Set([...selected.documents, id])] : selected.documents.filter((x) => x !== id) })
  // Checking a source or a kind drops its records checked one by one: the
  // larger choice covers them.
  const withoutDocs = (ids: string[]) => selected.documents.filter((d) => !ids.includes(d))
  const setWhole = (s: Source, on: boolean) => {
    const rest = selected.connections.filter((c) => c.id !== s.id)
    const ids = s.kinds.flatMap((k) => k.files.map((f) => f.document_id))
    onChange({ documents: on ? withoutDocs(ids) : selected.documents, connections: on ? [...rest, { id: s.id, kinds: [] }] : rest })
  }
  const setKind = (s: Source, k: Kind, on: boolean) => {
    const kinds = conn(s.id)?.kinds ?? []
    const next = on ? [...new Set([...kinds, k.id])] : kinds.filter((x) => x !== k.id)
    const rest = selected.connections.filter((c) => c.id !== s.id)
    onChange({
      documents: on ? withoutDocs(k.files.map((f) => f.document_id)) : selected.documents,
      connections: next.length ? [...rest, { id: s.id, kinds: next }] : rest,
    })
  }

  if (files.length === 0 && connections.length === 0 && selected.documents.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">{t("telephony.assistants.files.none")}</p>
  }

  const shownUploaded = uploaded.filter(matches)
  const shownIds = shownUploaded.map((f) => f.document_id)
  const allShownChosen = shownIds.length > 0 && shownIds.every((id) => docs.has(id))
  const uploadedChosen = uploaded.filter((f) => docs.has(f.document_id)).length
  const nothing = selected.documents.length === 0 && selected.connections.length === 0

  const sourceStatus = (s: Source) => {
    if (whole(s.id)) return t("telephony.assistants.files.statusWhole")
    const kinds = conn(s.id)?.kinds.length ?? 0
    const picked = s.kinds.flatMap((k) => k.files).filter((f) => docs.has(f.document_id)).length
    if (kinds || picked) return t("telephony.assistants.files.statusPart", { kinds, files: picked })
    return t("telephony.assistants.files.statusTotal", { count: s.count })
  }

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("telephony.assistants.files.search")} className="pl-9" />
      </div>
      {nothing ? (
        <p className="rounded-xl bg-warning/10 px-3 py-2 text-[13px] text-foreground">{t("telephony.assistants.files.empty")}</p>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          {t("telephony.assistants.files.selected", { files: selected.documents.length, sources: selected.connections.length })}
        </p>
      )}

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {/* Uploaded files */}
        {(uploaded.length > 0 || sources.length === 0) && (
          <div>
            <GroupHeader
              icon={Upload}
              title={t("telephony.assistants.files.uploaded")}
              status={t("telephony.assistants.files.count", { chosen: uploadedChosen, total: uploaded.length })}
              open={open.has("uploaded") || !!q}
              onToggle={() => setOpen((o) => toggle(o, "uploaded"))}
            />
            {(open.has("uploaded") || !!q) && (
              <div className="border-t border-border">
                {shownIds.length > 1 && (
                  <div className="flex justify-end px-4 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      onClick={() =>
                        onChange({
                          ...selected,
                          documents: allShownChosen ? selected.documents.filter((id) => !shownIds.includes(id)) : [...new Set([...selected.documents, ...shownIds])],
                        })
                      }
                    >
                      {allShownChosen ? t("telephony.assistants.files.clearShown") : t("telephony.assistants.files.chooseShown")}
                    </Button>
                  </div>
                )}
                <ul className="max-h-72 overflow-y-auto py-1">
                  {shownUploaded.map((f) => (
                    <FileRow key={f.document_id} file={f} checked={docs.has(f.document_id)} disabled={disabled} onCheck={(on) => setDoc(f.document_id, on)} />
                  ))}
                  {shownUploaded.length === 0 && <li className="px-4 py-3 text-[13px] text-muted-foreground">{t("telephony.assistants.files.nothingFound")}</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Connected systems */}
        {sources.map((s) => {
          const kinds = s.kinds.map((k) => ({ k, shown: k.files.filter(matches) })).filter(({ shown }) => !q || shown.length > 0)
          if (q && kinds.length === 0) return null
          const isOpen = open.has(s.id) || !!q
          const isWhole = whole(s.id)
          return (
            <div key={s.id}>
              <GroupHeader icon={Database} title={s.title} status={sourceStatus(s)} open={isOpen} onToggle={() => setOpen((o) => toggle(o, s.id))} />
              {isOpen && (
                <div className="border-t border-border py-1">
                  {s.dynamic && (
                    <label className="flex cursor-pointer items-start gap-3 px-4 py-2 hover:bg-muted/50">
                      <Checkbox className="mt-0.5" checked={isWhole} onCheckedChange={(v) => setWhole(s, v === true)} disabled={disabled} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                          {t("telephony.assistants.files.whole")}
                          {isWhole && <Badge variant="secondary">{t("telephony.assistants.files.dynamic")}</Badge>}
                        </span>
                        <span className="block text-xs text-muted-foreground">{t("telephony.assistants.files.wholeHelp")}</span>
                      </span>
                    </label>
                  )}
                  {s.kinds.length === 0 && <p className="px-4 py-2 pl-11 text-[13px] text-muted-foreground">{t("telephony.assistants.files.notSynced")}</p>}
                  <ul>
                    {kinds.map(({ k, shown }) => {
                      const key = `${s.id}/${k.id}`
                      const on = s.dynamic && kindOn(s.id, k.id)
                      const expanded = openKinds.has(key) || !!q
                      return (
                        <li key={key} className={cn(s.dynamic && "pl-7")}>
                          <div className="flex items-center gap-3 px-4 py-2 hover:bg-muted/50">
                            {s.dynamic && <Checkbox checked={on} onCheckedChange={(v) => setKind(s, k, v === true)} disabled={disabled || isWhole} aria-label={k.title} />}
                            <button
                              type="button"
                              onClick={() => setOpenKinds((o) => toggle(o, key))}
                              aria-expanded={expanded}
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            >
                              <span className="truncate text-sm text-foreground">{k.title}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">{k.files.length}</span>
                              <ChevronRight className={cn("ml-auto size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")} aria-hidden />
                            </button>
                          </div>
                          {expanded && (
                            <ul className="max-h-64 overflow-y-auto pl-7">
                              {shown.map((f) => (
                                <FileRow
                                  key={f.document_id}
                                  file={f}
                                  checked={on || docs.has(f.document_id)}
                                  disabled={disabled || on}
                                  onCheck={(v) => setDoc(f.document_id, v)}
                                />
                              ))}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
