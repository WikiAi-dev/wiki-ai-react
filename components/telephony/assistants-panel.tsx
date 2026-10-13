"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bot, Loader2, MoreHorizontal, Plus, Settings2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { apiText, formatPhone, telephonyApi, type KnowledgeScope, type Line, type Scenario, type ScenarioDraft } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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

/**
 * A new assistant's starting map: the usual call of a company's front
 * desk. It is Russian whatever the interface language: the assistant
 * speaks Russian.
 */
function starterDraft(scopeId: string): ScenarioDraft {
  return {
    company: "",
    assistant_name: "",
    greeting: "",
    instructions: "",
    scope_id: scopeId,
    nodes: [
      { id: "greet", title: "Приветствие", description: "Поздоровайся и узнай, чем можешь помочь.", x: 0, y: 0 },
      { id: "answer", title: "Вопрос о компании", description: "Ответь коротко по базе знаний и спроси, чем ещё помочь.", x: -170, y: 170 },
      { id: "message", title: "Сообщение для менеджера", description: "Узнай имя, телефон и суть вопроса, повтори и подтверди.", x: 170, y: 170 },
      { id: "bye", title: "Прощание", description: "Поблагодари за звонок и попрощайся.", x: 0, y: 340 },
    ],
    edges: [
      { id: "e1", from: "greet", to: "answer", label: "спрашивает об услугах, ценах или условиях" },
      { id: "e2", from: "greet", to: "message", label: "просит связаться с менеджером" },
      { id: "e3", from: "answer", to: "message", label: "хочет заказать или ответа в базе нет" },
      { id: "e4", from: "answer", to: "bye", label: "вопросов больше нет" },
      { id: "e5", from: "message", to: "bye", label: "" },
    ],
  }
}

/** Creates an assistant: an empty file list and a scenario that points at it. */
export async function createAssistant(token: string, name: string): Promise<{ id?: string; error?: string }> {
  const scope = await telephonyApi.createScope(token, { name, items: [] })
  if (scope.status !== "success" || !scope.response) return { error: scope.message }
  const scenario = await telephonyApi.createScenario(token, { name, draft: starterDraft(scope.response.id) })
  if (scenario.status !== "success" || !scenario.response) {
    await telephonyApi.deleteScope(token, scope.response.id)
    return { error: scenario.message }
  }
  return { id: scenario.response.id }
}

function AssistantRow({ scenario, scopes, lines, onChanged }: { scenario: Scenario; scopes: KnowledgeScope[]; lines: Line[]; onChanged: () => void }) {
  const { t, locale } = useTranslation()
  const { token } = useAuth()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const scope = scopes.find((s) => s.id === scenario.draft.scope_id)
  const numbers = lines.filter((l) => l.scenario_id === scenario.id)
  const href = `/app/telephony/assistants/${scenario.id}`

  const remove = async () => {
    if (!token) return
    setDeleting(true)
    try {
      const result = await telephonyApi.deleteScenario(token, scenario.id)
      if (result.status !== "success") {
        toast.error(apiText(result.message, locale) || t("telephony.toast.failed"))
        return
      }
      if (scope) await telephonyApi.deleteScope(token, scope.id)
      toast.success(t("telephony.assistants.toast.deleted"))
      setDeleteOpen(false)
      onChanged()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Bot className="size-4" strokeWidth={1.75} />
      </span>
      <Link href={href} className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate font-medium text-foreground">
          <span className="truncate">{scenario.name}</span>
          {scenario.published ? (
            <Badge variant="success">{t("telephony.assistants.version", { version: scenario.published.version })}</Badge>
          ) : (
            <Badge variant="secondary">{t("telephony.assistants.draft")}</Badge>
          )}
        </p>
        <p className="truncate text-[13px] text-muted-foreground">
          {scenario.draft.company || t("telephony.assistants.noCompany")} ·{" "}
          {t("telephony.assistants.filesCount", { count: scope?.items.filter((i) => i.kind === "document").length ?? 0 })} ·{" "}
          {!!scope?.items.some((i) => i.kind === "connection") && (
            <>
              {t("telephony.assistants.sourcesCount", { count: scope.items.filter((i) => i.kind === "connection").length })} ·{" "}
            </>
          )}
          {numbers.length ? numbers.map((l) => formatPhone(l.did)).join(", ") : t("telephony.assistants.noNumbers")}
        </p>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label={t("telephony.lines.more")}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem asChild>
            <Link href={href}>
              <Settings2 />
              {t("telephony.lines.edit")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            {t("telephony.lines.delete.action")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("telephony.assistants.delete.title", { name: scenario.name })}</AlertDialogTitle>
            <AlertDialogDescription>{t("telephony.assistants.delete.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("telephony.form.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                remove()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="animate-spin" />}
              {t("telephony.lines.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

/** The organization's assistants: what each says for the company, the files it uses, its numbers. */
export function AssistantsPanel({
  scenarios,
  scopes,
  lines,
  onChanged,
}: {
  scenarios: Scenario[]
  scopes: KnowledgeScope[]
  lines: Line[]
  onChanged: () => void
}) {
  const { t, locale } = useTranslation()
  const { token } = useAuth()
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  const create = async () => {
    if (!token) return
    setCreating(true)
    try {
      const name = scenarios.length ? `${t("telephony.assistants.defaultName")} ${scenarios.length + 1}` : t("telephony.assistants.defaultName")
      const { id, error } = await createAssistant(token, name)
      if (id) router.push(`/app/telephony/assistants/${id}`)
      else toast.error(apiText(error, locale) || t("telephony.toast.failed"))
    } finally {
      setCreating(false)
    }
  }

  const add = (
    <Button onClick={create} disabled={creating}>
      {creating ? <Loader2 className="animate-spin" /> : <Plus />}
      {t("telephony.assistants.add")}
    </Button>
  )
  if (scenarios.length === 0) {
    return (
      <EmptyState
        icon={Bot}
        title={t("telephony.assistants.empty.title")}
        description={t("telephony.assistants.empty.description")}
        action={add}
        className="py-14"
      />
    )
  }
  return (
    <>
      <div className="flex justify-end">{add}</div>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {scenarios.map((s) => (
          <AssistantRow key={s.id} scenario={s} scopes={scopes} lines={lines} onChanged={onChanged} />
        ))}
      </ul>
    </>
  )
}
