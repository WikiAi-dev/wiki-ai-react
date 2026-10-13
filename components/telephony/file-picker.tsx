"use client"

import { useMemo, useState } from "react"
import { FileText, Search } from "lucide-react"
import { useTranslation } from "@/src/i18n"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

export interface KnowledgeFile {
  document_id: string
  title: string
  chunk_count: number
}

/**
 * The knowledge base's files with a checkbox each: the ones checked are
 * all the assistant may search. A file checked before but gone from the
 * knowledge base is listed too, so it can be unchecked.
 */
export function FilePicker({
  files,
  selected,
  onChange,
  disabled,
}: {
  files: KnowledgeFile[]
  selected: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState("")
  const all = useMemo(() => {
    const known = new Set(files.map((f) => f.document_id))
    const missing = selected.filter((id) => !known.has(id)).map((id) => ({ document_id: id, title: "", chunk_count: -1 }))
    return [...files, ...missing]
  }, [files, selected])
  const shown = all.filter((f) => !query.trim() || (f.title || f.document_id).toLowerCase().includes(query.trim().toLowerCase()))
  const chosen = new Set(selected)
  const toggle = (id: string, on: boolean) => onChange(on ? [...selected, id] : selected.filter((x) => x !== id))
  const shownIds = shown.map((f) => f.document_id)
  const allShownChosen = shownIds.length > 0 && shownIds.every((id) => chosen.has(id))

  if (all.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">{t("telephony.assistants.files.none")}</p>
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("telephony.assistants.files.search")} className="pl-9" />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || shownIds.length === 0}
          onClick={() =>
            onChange(allShownChosen ? selected.filter((id) => !shownIds.includes(id)) : [...new Set([...selected, ...shownIds])])
          }
        >
          {allShownChosen ? t("telephony.assistants.files.clearShown") : t("telephony.assistants.files.chooseShown")}
        </Button>
      </div>
      <p className="text-[13px] text-muted-foreground">{t("telephony.assistants.files.count", { chosen: selected.length, total: files.length })}</p>
      <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-2xl border border-border bg-card">
        {shown.map((f) => (
          <li key={f.document_id}>
            <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
              <Checkbox
                checked={chosen.has(f.document_id)}
                onCheckedChange={(v) => toggle(f.document_id, v === true)}
                disabled={disabled}
              />
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{f.title || t("telephony.assistants.files.gone")}</span>
                {f.chunk_count >= 0 && (
                  <span className="block text-xs text-muted-foreground">{t("telephony.assistants.files.chunks", { count: f.chunk_count })}</span>
                )}
              </span>
            </label>
          </li>
        ))}
        {shown.length === 0 && <li className="px-4 py-4 text-[13px] text-muted-foreground">{t("telephony.assistants.files.nothingFound")}</li>}
      </ul>
    </div>
  )
}
