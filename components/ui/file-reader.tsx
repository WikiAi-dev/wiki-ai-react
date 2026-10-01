"use client"

import { useEffect, useState } from "react"
import { Download, FileText } from "lucide-react"
import { toast } from "sonner"
import { filesApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/src/i18n"
import { Markdown } from "@/components/markdown"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface FileItem {
  id?: string | number
  filename: string
  size: number
  upload_date: string
  content_type: string
  metadata?: unknown
  indexed: boolean
}

interface FileReaderProps {
  file: FileItem | null
  token: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  showDownload?: boolean
  className?: string
  /** Text to show instead of fetching the document. */
  content?: string | null
}

const MARKDOWN = /\.(md|markdown)$/i
const MONOSPACE = /\.(json|csv|tsv|js|jsx|ts|tsx|py|go|java|rb|php|sql|html?|xml|ya?ml|log|srt|vtt)$/i

/**
 * Shows a knowledge-base document. knowledge-service stores document content
 * as plain text (there is no binary storage path), so this renders Markdown
 * for .md files and the raw text for everything else.
 */
export function UnifiedFileReader({ file, token, open, onOpenChange, showDownload = true, className, content }: FileReaderProps) {
  const { t } = useTranslation()
  const [text, setText] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const fileId = file?.id
  const filename = file?.filename

  useEffect(() => {
    if (!open || !filename) return
    if (content) {
      // Content handed in by the caller; nothing to fetch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(content)
      setFailed(false)
      return
    }
    if (!token) return
    let cancelled = false
    setText(null)
    setFailed(false)
    // knowledge-service addresses documents by id; getContent resolves an id
    // from a file name when it isn't given one.
    filesApi
      .getContent(token, fileId ? String(fileId) : filename)
      .then((result) => {
        if (cancelled) return
        if (result.status === "success" && result.response) setText(result.response.content || "")
        else setFailed(true)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [open, fileId, filename, token, content])

  const download = () => {
    if (!filename || text === null) return
    try {
      const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }))
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t("files.reader.downloadFailed"))
    }
  }

  let body
  if (failed) {
    body = <p className="text-sm text-destructive">{t("files.reader.failed")}</p>
  } else if (text === null) {
    body = (
      <div className="flex flex-col gap-2.5" aria-busy>
        {["w-11/12", "w-full", "w-4/5", "w-full", "w-2/3"].map((width, i) => (
          <Skeleton key={i} className={cn("h-4", width)} />
        ))}
      </div>
    )
  } else if (!text.trim()) {
    body = <p className="text-sm text-muted-foreground">{t("files.reader.empty")}</p>
  } else if (filename && MARKDOWN.test(filename)) {
    body = <Markdown>{text}</Markdown>
  } else {
    body = (
      <pre
        className={cn(
          "whitespace-pre-wrap break-words text-foreground",
          filename && MONOSPACE.test(filename) ? "font-mono text-[13px] leading-relaxed" : "font-sans text-[15px] leading-relaxed",
        )}
      >
        {text}
      </pre>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("flex max-h-[90dvh] w-full max-w-[95vw] flex-col md:max-w-3xl", className)}>
        <DialogHeader>
          <DialogTitle className="flex min-w-0 items-center gap-2.5 pr-8">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <FileText className="size-4" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="truncate">{filename}</span>
          </DialogTitle>
          <DialogDescription>{t("files.reader.description")}</DialogDescription>
        </DialogHeader>
        <div className="min-h-[30vh] flex-1 overflow-y-auto rounded-xl border border-border bg-background p-4 sm:p-5">{body}</div>
        <DialogFooter>
          {showDownload && (
            <Button variant="outline" onClick={download} disabled={text === null || failed}>
              <Download />
              {t("files.reader.download")}
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>{t("files.reader.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default UnifiedFileReader
