"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Copy, FileText, Lightbulb, Pin, PinOff, Search, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { queryApi } from "@/lib/api"
import { documentSource } from "@/lib/connections"
import type { CallDetail } from "@/lib/telephony"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/src/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { UnifiedFileReader } from "@/components/ui/file-reader"

/** Passages per search, and cards kept besides the pinned ones. */
const TOP_K = 3
const KEPT = 6
/** Questions searched when the page opens mid-call: the latest ones. */
const ON_OPEN = 3

interface Passage {
  id: string
  documentId?: string
  title: string
  /** The file name the reader opens it by. */
  filename: string
  content: string
}

interface Card {
  key: string
  query: string
  /** Found in what the caller said, or typed by the operator. */
  auto: boolean
  status: "searching" | "done" | "failed"
  passages: Passage[]
  pinned: boolean
}

/** A fragment as one line of prose, without markdown markers. */
function plainText(markdown: string) {
  return markdown
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_`]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function toPassage(
  chunk: {
    chunk_id?: string
    document_id?: string
    content?: string
    source?: string
    metadata?: Record<string, unknown>
  },
  i: number,
): Passage {
  const m = chunk.metadata ?? {}
  const fileName = String(m.original_filename || m.title || chunk.source || `#${i + 1}`)
  // Synced records are stored as "<title>.md"; their real title is in metadata.title.
  const synced = documentSource(m) !== null
  const title = synced ? String(m.title || fileName.replace(/\.md$/i, "")) : fileName
  return {
    id: chunk.chunk_id || `${i}`,
    documentId: chunk.document_id || (m.document_id as string | undefined),
    title,
    filename: synced ? `${title}.md` : fileName,
    content: plainText(chunk.content ?? ""),
  }
}

/** Pinned cards first, then the newest; at most KEPT unpinned ones. */
function keep(cards: Card[]) {
  const pinned = cards.filter((c) => c.pinned)
  return [...pinned, ...cards.filter((c) => !c.pinned).slice(0, KEPT)]
}

/**
 * Hints for the operator on a call (WAI-239, WAI-222): each question the
 * engine finds in what the caller says is searched in the knowledge base
 * with the member's own access, and the top passages come with their
 * documents. The operator can search by hand too. Nothing here takes the
 * focus.
 */
export function HintsPanel({ call }: { call: CallDetail }) {
  const { t } = useTranslation()
  const { token } = useAuth()
  const [cards, setCards] = useState<Card[]>([])
  const [query, setQuery] = useState("")
  const [viewer, setViewer] = useState<Passage | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  // The hint.query events already searched, by seq; null until the first look.
  const seen = useRef<Set<number> | null>(null)

  const search = useCallback(
    async (q: string, auto: boolean) => {
      if (!token) return
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      setCards((cs) =>
        keep([
          {
            key,
            query: q,
            auto,
            status: "searching",
            passages: [],
            pinned: false,
          },
          ...cs,
        ]),
      )
      let next: Pick<Card, "status" | "passages"> = {
        status: "failed",
        passages: [],
      }
      try {
        const result = await queryApi.query(token, q, { top_k: TOP_K })
        if (result.status === "success" && result.response) {
          const chunks = (result.response as { chunks?: Parameters<typeof toPassage>[0][] }).chunks ?? []
          next = {
            status: "done",
            passages: chunks.slice(0, TOP_K).map(toPassage),
          }
        }
      } catch {
        // The card says the search failed.
      }
      setCards((cs) => cs.map((c) => (c.key === key ? { ...c, ...next } : c)))
    },
    [token],
  )

  // Each question the engine found is searched once; opening the page
  // mid-call searches the latest few.
  useEffect(() => {
    const queries = call.events.filter((e) => e.type === "hint.query")
    let fresh = queries
    if (seen.current === null) {
      seen.current = new Set(queries.map((e) => e.seq))
      fresh = queries.slice(-ON_OPEN)
    } else {
      fresh = queries.filter((e) => !seen.current!.has(e.seq))
      fresh.forEach((e) => seen.current!.add(e.seq))
    }
    for (const e of fresh) {
      const q = String((e.data as { query?: unknown }).query ?? "").trim()
      if (q) void search(q, true)
    }
  }, [call.events, search])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setQuery("")
    void search(q, false)
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t("telephony.operator.hints.copied"))
    } catch {
      // Clipboard access can be blocked; nothing else to do.
    }
  }

  const togglePin = (key: string) => setCards((cs) => keep(cs.map((c) => (c.key === key ? { ...c, pinned: !c.pinned } : c))))

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <Lightbulb className="size-4 text-primary" aria-hidden />
          {t("telephony.operator.hints.title")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("telephony.operator.hints.description")}</p>
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("telephony.operator.hints.placeholder")}
          aria-label={t("telephony.operator.hints.placeholder")}
          className="h-9"
        />
        <Button
          type="submit"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          disabled={!query.trim()}
          aria-label={t("telephony.operator.hints.search")}
        >
          <Search />
        </Button>
      </form>
      {cards.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("telephony.operator.hints.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {cards.map((c) => (
            <li key={c.key} className={cn("rounded-xl border bg-background p-3", c.pinned ? "border-primary/40" : "border-border")}>
              <div className="flex items-start gap-2">
                {c.auto ? (
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-label={t("telephony.operator.hints.auto")} />
                ) : (
                  <Search className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label={t("telephony.operator.hints.manual")} />
                )}
                <p className="min-w-0 flex-1 text-sm font-medium text-foreground">{c.query}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => togglePin(c.key)}
                  aria-label={c.pinned ? t("telephony.operator.hints.unpin") : t("telephony.operator.hints.pin")}
                >
                  {c.pinned ? <PinOff /> : <Pin />}
                </Button>
              </div>
              {c.status === "searching" && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              )}
              {c.status === "failed" && <p className="mt-2 text-[13px] text-destructive">{t("telephony.operator.hints.failed")}</p>}
              {c.status === "done" && c.passages.length === 0 && (
                <p className="mt-2 text-[13px] text-muted-foreground">{t("telephony.operator.hints.nothing")}</p>
              )}
              {c.passages.length > 0 && (
                <ul className="mt-2 flex flex-col gap-2">
                  {c.passages.map((p) => (
                    <li key={p.id} className="rounded-lg bg-muted/50 px-2.5 py-2">
                      <p className="line-clamp-5 text-[13px] leading-relaxed text-foreground">{p.content}</p>
                      <div className="mt-1.5 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setViewer(p)
                            setViewerOpen(true)
                          }}
                          disabled={!p.documentId}
                          className="inline-flex min-w-0 items-center gap-1 text-xs text-primary hover:underline disabled:pointer-events-none disabled:text-muted-foreground"
                        >
                          <FileText className="size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{p.title}</span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-auto size-6 shrink-0"
                          onClick={() => copy(p.content)}
                          aria-label={t("telephony.operator.hints.copy")}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      <UnifiedFileReader
        file={
          viewer?.documentId
            ? {
                id: viewer.documentId,
                filename: viewer.filename,
                size: 0,
                upload_date: new Date().toISOString(),
                content_type: "",
                indexed: true,
              }
            : null
        }
        token={token}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        content={null}
        showDownload
      />
    </section>
  )
}
