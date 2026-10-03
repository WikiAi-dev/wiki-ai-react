"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowUp, Copy, FileText, Flag, Loader2, RotateCcw, Search, SearchCheck, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { queryApi, reportsApi, resolveTenantId } from "@/lib/api"
import { getWsUrl } from "@/lib/config"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { Markdown } from "@/components/markdown"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { UnifiedFileReader } from "@/components/ui/file-reader"
import { ProviderMark, SourceBadge } from "@/components/connections/shared"
import { documentSource, type DocumentSource } from "@/lib/connections"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/** A knowledge-base fragment the answer was built from. */
interface Source {
  id: string
  documentId?: string
  title: string
  content: string
  /** Set when the document was synced from Bitrix24 or another connected system. */
  origin: DocumentSource | null
}

type TurnStatus = "searching" | "writing" | "done" | "error"

/** One question and everything WikiAI sent back for it. */
interface Turn {
  id: string
  question: string
  status: TurnStatus
  sources: Source[]
  answer?: string
}

interface ViewerFile {
  id?: string
  filename: string
  size: number
  upload_date: string
  content_type: string
  indexed: boolean
}

const SUGGESTIONS = [0, 1, 2, 3]
const SOURCES_PREVIEW = 3

function isTokenExpiringSoon(token: string, bufferMs = 10000): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now() + bufferMs
  } catch {
    return false
  }
}

function toSource(chunk: any, index: number): Source {
  const metadata = chunk?.metadata || {}
  const origin = documentSource(metadata)
  const fileName: string = metadata.original_filename || metadata.title || chunk?.source || `#${index + 1}`
  return {
    id: chunk?.chunk_id || `chunk-${index}`,
    documentId: chunk?.document_id || metadata.document_id,
    // Synced records are stored as "<title>.md" with unsafe characters
    // replaced; their real title is in metadata.title.
    title: origin ? metadata.title || fileName.replace(/\.md$/i, "") : fileName,
    content: plainText(chunk?.content ?? ""),
    origin,
  }
}

/** A fragment as one line of prose, without markdown markers. */
function plainText(markdown: string) {
  return markdown
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_`]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** The documents behind an answer, one entry per document. */
function sourceNotes(sources: Source[]) {
  const seen = new Set<string>()
  return sources.filter((source) => {
    const key = source.documentId || source.title
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  autoFocus,
  className,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
  autoFocus?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className={cn(
        "flex items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-4 shadow-[0_20px_40px_-28px_oklch(0.3_0.08_262/0.35)] transition-[border-color,box-shadow] focus-within:border-primary/50 focus-within:ring-[3px] focus-within:ring-ring/25 sm:pl-5",
        className,
      )}
    >
      <Search className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("search.page.placeholder")}
        aria-label={t("search.page.placeholder")}
        autoFocus={autoFocus}
        enterKeyHint="send"
        className="h-10 min-w-0 flex-1 truncate bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
      />
      <Button
        type="submit"
        size="icon-lg"
        className="shrink-0 rounded-full"
        disabled={disabled || !value.trim()}
        aria-label={t("search.page.send")}
      >
        {disabled ? <Loader2 className="animate-spin" /> : <ArrowUp />}
      </Button>
    </form>
  )
}

function SourceList({ sources, onOpen }: { sources: Source[]; onOpen: (source: Source) => void }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  if (sources.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("search.page.noSources")}</p>
  }

  const shown = expanded ? sources : sources.slice(0, SOURCES_PREVIEW)
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <h3 className="flex items-center justify-between gap-3 px-4 pt-4 text-sm font-semibold tracking-tight sm:px-5">
        {t("search.page.sourcesTitle")}
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">{sources.length}</span>
      </h3>
      <ul className="mt-2 divide-y divide-border">
        {shown.map((source) => (
          <li key={source.id}>
            <button
              type="button"
              onClick={() => onOpen(source)}
              disabled={!source.documentId}
              aria-label={`${t("search.page.openDocument")}: ${source.title}`}
              className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none disabled:pointer-events-none sm:px-5"
            >
              {source.origin ? (
                <ProviderMark provider={source.origin.provider} title={source.origin.providerTitle} className="mt-0.5 size-8 text-[9px]" />
              ) : (
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                  <FileText className="size-4" strokeWidth={1.75} aria-hidden />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{source.title}</span>
                  {source.origin && <SourceBadge providerTitle={source.origin.providerTitle} />}
                </span>
                {source.content && (
                  <span className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{source.content}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {sources.length > SOURCES_PREVIEW && (
        <div className="border-t border-border px-2 py-1.5 sm:px-3">
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? t("search.page.showLess") : t("search.page.showAll", { count: sources.length })}
          </Button>
        </div>
      )}
    </section>
  )
}

function TurnView({
  turn,
  onOpen,
  onCopy,
  onReport,
  onRetry,
}: {
  turn: Turn
  onOpen: (source: Source) => void
  onCopy: (turn: Turn) => void
  onReport: (turn: Turn) => void
  onRetry: (turn: Turn) => void
}) {
  const { t } = useTranslation()
  const notes = sourceNotes(turn.sources).filter((source) => source.documentId).slice(0, 3)

  return (
    <li className="flex flex-col gap-3">
      <div className="flex max-w-[85%] flex-col self-end">
        <p className="sr-only">{t("search.page.you")}</p>
        <p className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-snug text-primary-foreground">{turn.question}</p>
      </div>

      {turn.status === "searching" && (
        <p className="flex items-center gap-1.5 self-start rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground" role="status">
          <SearchCheck className="size-3.5 shrink-0 animate-pulse text-primary" strokeWidth={1.75} aria-hidden />
          {t("search.page.searching")}
        </p>
      )}

      {turn.status === "error" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4" role="alert">
          <p className="text-sm text-foreground">{t("search.page.error")}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => onRetry(turn)}>
            <RotateCcw />
            {t("search.page.retry")}
          </Button>
        </div>
      )}

      {(turn.status === "writing" || turn.status === "done") && (
        <div className="rounded-xl border border-primary/25 bg-primary/[0.07] p-4 sm:p-5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" strokeWidth={1.75} aria-hidden />
            WikiAI
          </p>
          {turn.status === "writing" ? (
            <div className="mt-3 flex flex-col gap-2" role="status" aria-label={t("search.page.writing")}>
              <Skeleton className="h-4 w-11/12 bg-primary/10" />
              <Skeleton className="h-4 w-4/5 bg-primary/10" />
              <Skeleton className="h-4 w-3/5 bg-primary/10" />
            </div>
          ) : (
            turn.answer && <Markdown className="mt-2">{turn.answer}</Markdown>
          )}

          {turn.status === "done" && notes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {notes.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => onOpen(source)}
                  className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  <FileText className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="truncate">{source.title}</span>
                  {source.origin && <span className="shrink-0 opacity-80">· {source.origin.providerTitle}</span>}
                </button>
              ))}
            </div>
          )}

          {turn.status === "done" && turn.answer && (
            <div className="mt-3 border-t border-primary/15 pt-2">
              <div className="-ml-2.5 flex flex-wrap items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => onCopy(turn)}>
                  <Copy />
                  {t("search.page.copy")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onReport(turn)}>
                  <Flag />
                  {t("search.page.report")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {(turn.status === "writing" || turn.status === "done") && <SourceList sources={turn.sources} onOpen={onOpen} />}
    </li>
  )
}

export default function SearchPage() {
  const { token, refreshToken } = useAuth()
  const { t } = useTranslation()
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState("")
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID())
  const [viewerFile, setViewerFile] = useState<ViewerFile | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [reportTurn, setReportTurn] = useState<Turn | null>(null)
  const [reportText, setReportText] = useState("")
  const [reportSending, setReportSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const busy = turns.some((turn) => turn.status === "searching" || turn.status === "writing")

  // Bring a new question into view; answers fill in below it without moving the page.
  useEffect(() => {
    if (turns.length > 0) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [turns.length])

  const updateTurn = useCallback((id: string, patch: Partial<Turn>) => {
    setTurns((prev) => prev.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)))
  }, [])

  const askViaWebSocket = async (turnId: string, query: string) => {
    if (!token) throw new Error("Authentication token is required for WebSocket search")
    // The WS connection carries its own token in the URL and isn't covered by
    // the REST-call refresh interceptor — a still-mounted search page can
    // easily outlive the 15-minute access token, so refresh proactively
    // rather than let the socket fail with an opaque 1006 close.
    let activeToken = token
    if (isTokenExpiringSoon(activeToken)) {
      const refreshed = await refreshToken()
      if (refreshed) activeToken = localStorage.getItem("auth_token") || activeToken
    }
    const tenantId = await resolveTenantId(activeToken)

    await new Promise<void>((resolve, reject) => {
      // WebSocket isn't proxied through the same-origin rewrite (see
      // next.config.mjs) — it needs the real backend address, which is
      // what NEXT_PUBLIC_WS_URL (via getWsUrl) is for.
      const ws = new WebSocket(getWsUrl(`/v1/query/stream?token=${encodeURIComponent(activeToken)}`))
      let settled = false
      let answered = false
      const finish = (error?: Error) => {
        if (settled) return
        settled = true
        clearTimeout(connectTimer)
        // Once the answer is in, a messy close doesn't matter.
        if (error && !answered) reject(error)
        else resolve()
      }
      const connectTimer = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close()
          finish(new Error("WebSocket connection timeout"))
        }
      }, 5000)

      ws.onopen = () => {
        clearTimeout(connectTimer)
        ws.send(JSON.stringify({ query, tenant_id: tenantId, session_id: sessionId, top_k: 10 }))
      }
      ws.onmessage = (event) => {
        let message
        try {
          message = JSON.parse(event.data)
        } catch {
          return
        }
        switch (message.type) {
          case "chunks":
            updateTurn(turnId, { status: "writing", sources: (message.data?.chunks || []).map(toSource) })
            break
          case "answer":
            answered = true
            updateTurn(turnId, { status: "done", answer: message.data?.answer || "" })
            break
          case "complete":
            ws.close()
            finish()
            break
          case "error":
            ws.close()
            finish(new Error(message.message || "WebSocket query error"))
            break
        }
      }
      ws.onerror = () => finish(new Error("WebSocket connection error"))
      ws.onclose = (event) => finish(event.code === 1000 ? undefined : new Error(`WebSocket closed (code: ${event.code})`))
    })
  }

  const askViaHttp = async (turnId: string, query: string) => {
    if (!token) throw new Error("No token available")
    const result = await queryApi.query(token, query, { humanize: true })
    if (result.status !== "success" || !result.response) throw new Error("Search request failed")
    const response = result.response as { chunks?: unknown[]; answer?: string }
    updateTurn(turnId, { status: "done", sources: (response.chunks || []).map(toSource), answer: response.answer || "" })
  }

  const ask = async (question: string) => {
    const query = question.trim()
    if (!query || !token || busy) return
    const id = crypto.randomUUID()
    setTurns((prev) => [...prev, { id, question: query, status: "searching", sources: [] }])
    setInput("")

    try {
      try {
        await askViaWebSocket(id, query)
      } catch (wsError) {
        // The WS endpoint depends on the deployment's ingress supporting the
        // Upgrade handshake — that hop can fail even when the equivalent HTTP
        // /v1/search request would succeed, so fall back to it.
        console.error("WebSocket query failed, falling back to HTTP:", wsError)
        await askViaHttp(id, query)
      }
      setTurns((prev) => prev.map((turn) => (turn.id === id && turn.status !== "done" ? { ...turn, status: "done" } : turn)))
    } catch (error) {
      console.error("Query error:", error)
      updateTurn(id, { status: "error" })
    }
  }

  const retry = (turn: Turn) => {
    setTurns((prev) => prev.filter((item) => item.id !== turn.id))
    ask(turn.question)
  }

  const restart = () => {
    setTurns([])
    setSessionId(crypto.randomUUID())
  }

  const openSource = (source: Source) => {
    if (!source.documentId) return
    setViewerFile({
      id: source.documentId,
      filename: source.origin ? `${source.title}.md` : source.title,
      size: 0,
      upload_date: new Date().toISOString(),
      content_type: "", // the reader works it out from the file name
      indexed: true,
    })
    setViewerOpen(true)
  }

  const copyAnswer = async (turn: Turn) => {
    if (!turn.answer) return
    try {
      await navigator.clipboard.writeText(turn.answer)
      toast.success(t("search.page.copied"))
    } catch {
      // Clipboard access can be blocked; nothing else to do.
    }
  }

  const sendReport = async () => {
    if (!token || !reportTurn || !reportText.trim()) return
    setReportSending(true)
    try {
      const result = await reportsApi.submitManual(token, `«${reportTurn.question}» — ${reportText.trim()}`)
      if (result.status !== "success") throw new Error(result.message)
      toast.success(t("search.page.reportSent"))
      setReportTurn(null)
      setReportText("")
    } catch (error) {
      console.error("Feedback error:", error)
      toast.error(t("search.page.reportFailed"))
    } finally {
      setReportSending(false)
    }
  }

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t("navigation.search") }]} />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 md:px-8">
        {turns.length === 0 ? (
          <div className="flex flex-1 flex-col justify-center py-10 md:py-16">
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-balance text-foreground md:text-4xl">
              {t("search.page.title")}
            </h1>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground text-pretty md:text-base">
              {t("search.page.subtitle")}
            </p>
            <Composer className="mt-8" value={input} onChange={setInput} onSubmit={() => ask(input)} disabled={busy} autoFocus />
            <div className="mt-8">
              <p className="text-sm font-medium text-muted-foreground">{t("search.page.tryAsking")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((i) => {
                  const question = t(`search.page.suggestions.${i}`)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => ask(question)}
                      className="rounded-full border border-border bg-card px-4 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-y-px"
                    >
                      {question}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-end pt-4">
              <Button variant="ghost" size="sm" onClick={restart} disabled={busy}>
                <RotateCcw />
                {t("search.page.restart")}
              </Button>
            </div>
            <ol className="flex flex-1 flex-col gap-10 pt-2 pb-8">
              {turns.map((turn) => (
                <TurnView
                  key={turn.id}
                  turn={turn}
                  onOpen={openSource}
                  onCopy={copyAnswer}
                  onReport={setReportTurn}
                  onRetry={retry}
                />
              ))}
            </ol>
            <div ref={endRef} />
            <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-background from-60% to-transparent px-4 pt-6 pb-4 md:-mx-8 md:px-8 md:pb-6">
              <Composer value={input} onChange={setInput} onSubmit={() => ask(input)} disabled={busy} />
            </div>
          </>
        )}
      </div>

      <UnifiedFileReader
        file={viewerFile}
        token={token}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        content={null}
        showDownload
      />

      <Dialog
        open={reportTurn !== null}
        onOpenChange={(open) => {
          if (!open) setReportTurn(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("search.page.reportTitle")}</DialogTitle>
            <DialogDescription>{t("search.page.reportText")}</DialogDescription>
          </DialogHeader>
          {reportTurn && (
            <p className="line-clamp-2 rounded-xl bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">{reportTurn.question}</p>
          )}
          <Textarea
            placeholder={t("search.page.reportPlaceholder")}
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportTurn(null)}>
              {t("search.page.cancel")}
            </Button>
            <Button onClick={sendReport} disabled={!reportText.trim() || reportSending}>
              {reportSending && <Loader2 className="animate-spin" />}
              {t("search.page.reportSend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
