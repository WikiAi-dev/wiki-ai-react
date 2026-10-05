"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { filesApi } from "@/lib/api"
import { documentSource, fullTime, type DocumentSource } from "@/lib/connections"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/src/i18n"
import { useUploadStatusPoll, type UploadStatusValue } from "@/hooks/use-upload-status-poll"
import { PageBody, PageHeader } from "@/components/page-header"
import { StatCard, StatGrid } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { UploadStatusBadge } from "@/components/upload-status-badge"
import { ProviderMark, SourceBadge, useProviderText } from "@/components/connections/shared"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { UnifiedFileReader } from "@/components/ui/file-reader"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** A knowledge-service document as the library shows it. */
interface Doc {
  id: string
  name: string
  kind: string
  status?: string
  chunks?: number
  updatedAt?: string
  /** File name for the reader (connector documents are Markdown). */
  fileName: string
  /** Set for documents synced from Bitrix24 and other connected systems. */
  source: DocumentSource | null
}

type Origin = "all" | "uploaded" | "connected"

interface ViewerFile {
  id: string
  filename: string
  size: number
  upload_date: string
  content_type: string
  indexed: boolean
}

const TERMINAL: string[] = ["indexed", "failed", "duplicate", "error"]

// knowledge-service's DocumentResult has no "filename" field - a document's
// name is returned as "title" (see models/dtm/document.go), with
// metadata.original_filename as a fallback (set by filesApi.upload).
function toDoc(doc: any, index: number): Doc {
  const metadata = doc.metadata || {}
  const name: string = doc.title || doc.Title || doc.filename || metadata.original_filename || `#${index + 1}`
  const ext = name.includes(".") ? name.split(".").pop() || "" : ""
  const docType: string = doc.doc_type || doc.DocType || ""
  return {
    id: doc.document_id || doc.DocumentID || doc.id || String(index),
    name,
    kind: (docType && !docType.includes("/") ? docType : ext).toUpperCase(),
    status: doc.status || doc.Status,
    chunks: typeof doc.chunk_count === "number" ? doc.chunk_count : undefined,
    updatedAt: doc.updated_at || doc.created_at,
    fileName: metadata.original_filename || name,
    source: documentSource(metadata),
  }
}

function downloadText(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * The knowledge base's documents: upload, follow indexing, open, download,
 * and, for admins, edit, reindex and delete. Used by /app/files and
 * /app/admin/files.
 */
export function DocumentLibrary() {
  const { t, locale } = useTranslation()
  const { token, isAdmin } = useAuth()
  const [docs, setDocs] = useState<Doc[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [origin, setOrigin] = useState<Origin>("all")
  const providerText = useProviderText()
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [viewerFile, setViewerFile] = useState<ViewerFile | null>(null)
  const [editDoc, setEditDoc] = useState<Doc | null>(null)
  const [editText, setEditText] = useState("")
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDoc, setDeleteDoc] = useState<Doc | null>(null)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [reindexingId, setReindexingId] = useState<string | null>(null)

  const dateLocale = locale === "ru" ? "ru-RU" : "en-GB"

  const fetchDocs = useCallback(async () => {
    if (!token) return
    try {
      const result = await filesApi.list(token)
      if (result.status === "success" && result.response?.documents) {
        const next = result.response.documents.map(toDoc)
        setDocs(next)
        // Drop selections for documents that no longer exist.
        setSelected((prev) => new Set([...prev].filter((id) => next.some((doc) => doc.id === id))))
      }
    } catch (error) {
      console.error("Failed to fetch files:", error)
      toast.error(t("files.library.loadFailed"))
    } finally {
      setIsLoading(false)
    }
  }, [token, t])

  useEffect(() => {
    // Fetch-on-mount pattern; fetchDocs sets the list from the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocs()
  }, [fetchDocs])

  const uploadPoll = useUploadStatusPoll(token)

  // Once every tracked upload reaches a terminal state, refresh the list so
  // its status badges pick up the final result.
  const uploadEntries = uploadPoll.entries
  const refreshedRef = useRef(true)
  useEffect(() => {
    if (uploadEntries.length === 0) {
      refreshedRef.current = true
      return
    }
    const allTerminal = uploadEntries.every((entry) => TERMINAL.includes(entry.status))
    if (allTerminal && !refreshedRef.current) {
      refreshedRef.current = true
      fetchDocs()
    } else if (!allTerminal) {
      refreshedRef.current = false
    }
  }, [uploadEntries, fetchDocs])

  const upload = async (files: File[]) => {
    if (!token || files.length === 0) return
    setIsUploading(true)
    try {
      // Ingest is asynchronous (WAI-52): "success" means accepted and
      // indexing, so each file's live status is tracked in the uploads strip.
      const result = await filesApi.upload(token, files)
      const results = result.response?.results ?? []
      const succeeded = results.filter((r) => r.status === "success")
      const failed = results.filter((r) => r.status === "error")
      if (results.length > 0) {
        uploadPoll.track(
          results.map((r) => ({
            filename: r.filename,
            documentId: r.documentId,
            status: (r.initialStatus as UploadStatusValue) || (r.status === "success" ? "pending" : "error"),
            message: r.message,
          })),
        )
      }
      if (succeeded.length > 0) toast.success(t("files.library.accepted", { count: succeeded.length }))
      if (failed.length === 1) toast.error(failed[0].message || t("files.library.uploadFailed"))
      else if (failed.length > 1) toast.error(t("files.library.uploadFailedCount", { count: failed.length }))
      fetchDocs()
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(t("files.library.uploadFailed"))
    } finally {
      setIsUploading(false)
    }
  }

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    upload(Array.from(e.target.files || []))
    e.target.value = ""
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    upload(Array.from(e.dataTransfer.files))
  }

  const connectedCount = useMemo(() => docs.filter((doc) => doc.source).length, [docs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return docs.filter(
      (doc) =>
        (origin === "all" || (origin === "connected") === Boolean(doc.source)) &&
        (!q || doc.name.toLowerCase().includes(q) || (doc.source?.providerTitle.toLowerCase().includes(q) ?? false)),
    )
  }, [docs, query, origin])

  const counts = useMemo(
    () => ({
      indexed: docs.filter((doc) => !doc.status || doc.status === "indexed").length,
      processing: docs.filter((doc) => doc.status === "pending" || doc.status === "indexing").length,
      failed: docs.filter((doc) => doc.status === "failed").length,
    }),
    [docs],
  )

  const open = (doc: Doc) =>
    setViewerFile({
      id: doc.id,
      filename: doc.fileName,
      size: 0,
      upload_date: doc.updatedAt || new Date().toISOString(),
      content_type: "", // the reader works it out from the file name
      indexed: !doc.status || doc.status === "indexed",
    })

  const download = async (doc: Doc) => {
    if (!token) return
    try {
      const result = await filesApi.getContent(token, doc.id)
      if (result.status !== "success" || !result.response) throw new Error(result.message)
      downloadText(doc.fileName, result.response.content || "")
    } catch (error) {
      console.error("Download failed:", error)
      toast.error(t("files.library.downloadFailed"))
    }
  }

  const startEdit = async (doc: Doc) => {
    if (!token) return
    setEditDoc(doc)
    setEditText("")
    setIsEditLoading(true)
    try {
      const result = await filesApi.getContent(token, doc.id)
      if (result.status !== "success" || !result.response) throw new Error(result.message)
      setEditText(result.response.content || "")
    } catch (error) {
      console.error("Failed to load file:", error)
      toast.error(t("files.library.loadFailed"))
      setEditDoc(null)
    } finally {
      setIsEditLoading(false)
    }
  }

  const saveEdit = async () => {
    if (!token || !editDoc) return
    setIsSaving(true)
    try {
      const result = await filesApi.edit(token, editDoc.id, editText)
      if (result.status !== "success") throw new Error(result.message)
      toast.success(t("files.library.saved"))
      setEditDoc(null)
      fetchDocs()
    } catch (error) {
      console.error("Save error:", error)
      toast.error(t("files.library.saveFailed"))
    } finally {
      setIsSaving(false)
    }
  }

  // knowledge-service has no reindex endpoint: filesApi.reindex re-ingests and
  // then deletes the old copy, which mints a new id, so the list is refetched.
  const reindex = async (doc: Doc) => {
    if (!token) return
    setReindexingId(doc.id)
    try {
      const result = await filesApi.reindex(token, doc.id)
      if (result.status !== "success") throw new Error(result.message)
      toast.success(t("files.library.reindexed"))
      fetchDocs()
    } catch (error) {
      console.error("Failed to reindex file:", error)
      toast.error(t("files.library.reindexFailed"))
    } finally {
      setReindexingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!token || !deleteDoc) return
    setIsDeleting(true)
    try {
      const result = await filesApi.deleteById(token, deleteDoc.id)
      if (result.status !== "success") throw new Error(result.message)
      toast.success(t("files.library.deleted"))
      setDeleteDoc(null)
      fetchDocs()
    } catch (error) {
      console.error("Delete error:", error)
      toast.error(t("files.library.deleteFailed"))
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmBulkDelete = async () => {
    if (!token || selected.size === 0) return
    setIsDeleting(true)
    const ids = [...selected]
    const results = await Promise.all(ids.map((id) => filesApi.deleteById(token, id).catch(() => null)))
    const done = results.filter((r) => r?.status === "success").length
    if (done === ids.length) toast.success(t("files.library.bulkDeleted", { count: done }))
    else toast.error(t("files.library.bulkPartial", { done, total: ids.length }))
    setIsDeleting(false)
    setIsBulkDeleteOpen(false)
    setSelected(new Set())
    fetchDocs()
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const allSelected = filtered.length > 0 && filtered.every((doc) => selected.has(doc.id))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((doc) => doc.id)))

  const formatDate = (value?: string) => {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })
  }

  const statValue = (value: number) => (isLoading ? <Skeleton className="h-8 w-10" /> : value)

  const uploadButton = (
    <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
      {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
      {isUploading ? t("files.library.uploading") : t("files.library.upload")}
    </Button>
  )

  return (
    <PageBody>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onPick} />
      <PageHeader
        title={t("files.library.title")}
        description={isAdmin ? t("files.library.subtitleAdmin") : t("files.library.subtitle")}
        actions={uploadButton}
      />

      {isAdmin && (
        <StatGrid>
          <StatCard label={t("files.library.total")} value={statValue(docs.length)} hint={t("files.library.totalHint")} icon={FileText} />
          <StatCard label={t("files.library.indexed")} value={statValue(counts.indexed)} hint={t("files.library.indexedHint")} icon={Search} />
          <StatCard label={t("files.library.processing")} value={statValue(counts.processing)} hint={t("files.library.processingHint")} icon={Loader2} />
          <StatCard label={t("files.library.failed")} value={statValue(counts.failed)} hint={t("files.library.failedHint")} icon={X} />
        </StatGrid>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          // Phones have no drag and drop; the header's Upload button covers them.
          "flex items-center gap-4 rounded-2xl border border-dashed px-5 py-5 transition-colors max-sm:hidden",
          isDragging ? "border-primary bg-primary/[0.06]" : "border-border",
        )}
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Upload className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold tracking-tight text-foreground">
            {isDragging ? t("files.library.dropActive") : t("files.library.dropTitle")}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground text-pretty">{t("files.library.dropText")}</p>
        </div>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          {t("files.library.choose")}
        </Button>
      </div>

      {uploadPoll.entries.length > 0 && (
        <section className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 px-5 pt-4">
            <h2 className="text-sm font-semibold tracking-tight">{t("files.library.uploadsTitle")}</h2>
            <Button variant="ghost" size="sm" onClick={uploadPoll.clear}>
              {t("files.library.dismiss")}
            </Button>
          </div>
          <ul className="mt-1 divide-y divide-border px-5 pb-2">
            {uploadPoll.entries.map((entry, i) => (
              <li key={`${entry.filename}-${entry.documentId ?? i}`} className="flex items-center gap-3 py-2.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{entry.filename}</p>
                  {entry.status === "error" && entry.message && (
                    <p className="mt-0.5 text-xs leading-snug text-destructive">{entry.message}</p>
                  )}
                </div>
                <UploadStatusBadge status={entry.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4 sm:px-5">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("files.library.search")}
              aria-label={t("files.library.search")}
              className="pl-10"
            />
          </div>
          {connectedCount > 0 && (
            <SegmentedControl
              value={origin}
              onChange={setOrigin}
              label={t("files.library.origin.label")}
              options={[
                { value: "all", label: t("files.library.origin.all") },
                { value: "uploaded", label: t("files.library.origin.uploaded") },
                { value: "connected", label: t("files.library.origin.connected", { count: connectedCount }) },
              ]}
              className="max-sm:w-full"
            />
          )}
          {isAdmin && selected.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2 max-sm:w-full sm:ml-auto">
              <span className="text-sm font-medium tabular-nums">{t("files.library.selected", { count: selected.size })}</span>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                {t("files.library.clearSelection")}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteOpen(true)}>
                <Trash2 />
                {t("files.library.delete")}
              </Button>
            </div>
          ) : (
            !isLoading && (
              <span className="ml-auto shrink-0 text-sm tabular-nums text-muted-foreground">
                {filtered.length === docs.length ? docs.length : `${filtered.length} / ${docs.length}`}
              </span>
            )
          )}
        </div>

        {isLoading ? (
          <ul className="divide-y divide-border">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </li>
            ))}
          </ul>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t("files.library.emptyTitle")}
            description={t("files.library.emptyText")}
            action={uploadButton}
            className="m-4 sm:m-5"
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title={t("files.library.noMatchTitle")} description={t("files.library.noMatchText")} className="m-4 sm:m-5" />
        ) : (
          <>
            {isAdmin && (
              <label className="flex items-center gap-3 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground sm:px-5">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label={t("files.library.selectAll")} />
                {t("files.library.selectAll")}
              </label>
            )}
            <ul className="divide-y divide-border">
              {filtered.map((doc) => {
                const src = doc.source
                const meta = src
                  ? [
                      src.kind ? providerText.kind(src.provider, src.kind, src.kindTitle) : null,
                      src.connectionName || null,
                      formatDate(src.updatedAt ?? undefined)
                        ? t("files.library.changedAtSource", { date: formatDate(src.updatedAt ?? undefined) })
                        : null,
                    ].filter(Boolean)
                  : [
                      doc.kind || null,
                      typeof doc.chunks === "number" && doc.chunks > 0 ? t("files.library.chunks", { count: doc.chunks }) : null,
                      formatDate(doc.updatedAt) ? t("files.library.updated", { date: formatDate(doc.updatedAt) }) : null,
                    ].filter(Boolean)
                return (
                  <li
                    key={doc.id}
                    className={cn(
                      "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-5",
                      selected.has(doc.id) && "bg-primary/[0.04]",
                    )}
                  >
                    {isAdmin && (
                      <Checkbox checked={selected.has(doc.id)} onCheckedChange={() => toggle(doc.id)} aria-label={doc.name} />
                    )}
                    <button
                      type="button"
                      onClick={() => open(doc)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
                    >
                      {src ? (
                        <ProviderMark provider={src.provider} title={src.providerTitle} className="size-9 text-[10px]" />
                      ) : (
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                          <FileText className="size-4" strokeWidth={1.75} aria-hidden />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">{doc.name}</span>
                          {src && <SourceBadge providerTitle={src.providerTitle} />}
                        </span>
                        <span
                          className="mt-0.5 block truncate text-xs tabular-nums text-muted-foreground"
                          title={src?.updatedAt ? fullTime(src.updatedAt, locale) : undefined}
                        >
                          {meta.join(" · ")}
                        </span>
                      </span>
                    </button>
                    {doc.status && <UploadStatusBadge status={doc.status} className="max-sm:hidden" />}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={t("files.library.actions")} disabled={reindexingId === doc.id}>
                          {reindexingId === doc.id ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => open(doc)}>
                          <Eye />
                          {t("files.library.open")}
                        </DropdownMenuItem>
                        {src?.url && (
                          <DropdownMenuItem asChild>
                            <a href={src.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink />
                              {t("files.library.openOriginal", { platform: src.providerTitle })}
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => download(doc)}>
                          <Download />
                          {t("files.library.download")}
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            {!src && (
                              <DropdownMenuItem onClick={() => startEdit(doc)}>
                                <Pencil />
                                {t("files.library.edit")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => reindex(doc)}>
                              <RefreshCw />
                              {t("files.library.reindex")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteDoc(doc)}>
                              <Trash2 />
                              {t("files.library.delete")}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <UnifiedFileReader
        file={viewerFile}
        token={token}
        open={viewerFile !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setViewerFile(null)
        }}
        content={null}
        showDownload
      />

      <Dialog
        open={editDoc !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isSaving) setEditDoc(null)
        }}
      >
        <DialogContent className="w-full max-w-[95vw] md:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{editDoc?.name || t("files.library.editTitle")}</DialogTitle>
            <DialogDescription>{t("files.library.editText")}</DialogDescription>
          </DialogHeader>
          {isEditLoading ? (
            <Skeleton className="h-[40vh] w-full rounded-xl md:h-[50vh]" />
          ) : (
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              aria-label={t("files.library.editTitle")}
              className="h-[40vh] resize-none font-mono text-sm md:h-[50vh]"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDoc(null)} disabled={isSaving}>
              {t("files.library.cancel")}
            </Button>
            <Button onClick={saveEdit} disabled={isSaving || isEditLoading}>
              {isSaving && <Loader2 className="animate-spin" />}
              {isSaving ? t("files.library.saving") : t("files.library.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDoc !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isDeleting) setDeleteDoc(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("files.library.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("files.library.deleteText", { name: deleteDoc?.name ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("files.library.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="animate-spin" />}
              {t("files.library.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isBulkDeleteOpen}
        onOpenChange={(isOpen) => {
          if (!isDeleting) setIsBulkDeleteOpen(isOpen)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("files.library.deleteManyTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("files.library.deleteManyText", { count: selected.size })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("files.library.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmBulkDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="animate-spin" />}
              {t("files.library.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageBody>
  )
}
