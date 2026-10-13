"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { Bot, Eye, Loader2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { filesApi } from "@/lib/api"
import {
  apiText,
  formatPhone,
  telephonyApi,
  type Line,
  type Scenario,
  type ScenarioDraft,
  type ScenarioEdge,
  type ScenarioNode,
} from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { PageBody, PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { ScenarioMap } from "@/components/telephony/scenario-map"
import { FilePicker, type KnowledgeFile } from "@/components/telephony/file-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
      {description && <p className="mt-1 max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Field({ id, label, help, error, children }: { id: string; label: string; help?: string; error?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-[13px] text-destructive">{error}</p> : help ? <p className="text-[13px] text-muted-foreground">{help}</p> : null}
    </div>
  )
}

type Form = Pick<ScenarioDraft, "company" | "assistant_name" | "greeting" | "instructions">

/**
 * An assistant's page: who it speaks for and how (instructions and the
 * conversation map), the files it may search, and the numbers it answers.
 * Saving publishes it: calls from then on use it.
 */
export function AssistantView() {
  const { t, locale } = useTranslation()
  const { token, isAdmin } = useAuth()
  const params = useParams<{ id: string }>()
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [missing, setMissing] = useState(false)
  const [name, setName] = useState("")
  const [form, setForm] = useState<Form>({ company: "", assistant_name: "", greeting: "", instructions: "" })
  const [map, setMap] = useState<{ nodes: ScenarioNode[]; edges: ScenarioEdge[] }>({ nodes: [], edges: [] })
  const [files, setFiles] = useState<KnowledgeFile[] | null>(null)
  const [chosen, setChosen] = useState<string[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [numbers, setNumbers] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<{ prompt: string; greeting: string } | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    const result = await telephonyApi.scenario(token, params.id)
    if (result.status !== "success" || !result.response) {
      setMissing(true)
      return
    }
    const sc = result.response
    const d = sc.draft
    setScenario(sc)
    setName(sc.name)
    setForm({ company: d.company ?? "", assistant_name: d.assistant_name ?? "", greeting: d.greeting ?? "", instructions: d.instructions ?? "" })
    setMap({ nodes: d.nodes ?? [], edges: d.edges ?? [] })
    const [scope, ls, docs] = await Promise.all([
      d.scope_id ? telephonyApi.scope(token, d.scope_id) : Promise.resolve(null),
      telephonyApi.lines(token),
      filesApi.list(token),
    ])
    if (scope?.status === "success" && scope.response) {
      setChosen(scope.response.items.filter((i) => i.kind === "document" && i.document_id).map((i) => i.document_id as string))
    }
    if (ls.status === "success" && ls.response) {
      setLines(ls.response.items)
      setNumbers(ls.response.items.filter((l) => l.scenario_id === sc.id).map((l) => l.id))
    }
    setFiles(docs.status === "success" && docs.response ? docs.response.documents : [])
    setDirty(false)
  }, [token, params.id])

  useEffect(() => {
    if (!token || !isAdmin) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [token, isAdmin, load])

  const change = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setDirty(true)
  }
  const onMap = useCallback((nodes: ScenarioNode[], edges: ScenarioEdge[]) => {
    setMap({ nodes, edges })
    setDirty(true)
  }, [])

  const draft = (scopeId: string | undefined): ScenarioDraft => ({ ...form, ...map, scope_id: scopeId })

  const showPreview = async () => {
    if (!token) return
    const result = await telephonyApi.previewScenario(token, draft(scenario?.draft.scope_id))
    if (result.status === "success" && result.response) setPreview(result.response)
    else toast.error(apiText(result.message, locale) || t("telephony.toast.failed"))
  }

  const save = async () => {
    if (!token || !scenario) return
    setSaving(true)
    setErrors({})
    try {
      const items = chosen.map((id) => ({ kind: "document" as const, document_id: id }))
      let scopeId = scenario.draft.scope_id
      const scope = scopeId
        ? await telephonyApi.saveScope(token, scopeId, { name: name.trim(), items })
        : await telephonyApi.createScope(token, { name: name.trim(), items })
      if (scope.status !== "success" || !scope.response) {
        toast.error(apiText(scope.message, locale) || t("telephony.toast.failed"))
        return
      }
      scopeId = scope.response.id
      const updated = await telephonyApi.updateScenario(token, scenario.id, { name: name.trim(), draft: draft(scopeId) })
      if (updated.status !== "success") {
        const fields: Record<string, string> = {}
        for (const [k, v] of Object.entries(updated.fields ?? {})) fields[k] = apiText(v, locale)
        setErrors(fields)
        toast.error(Object.values(fields)[0] || apiText(updated.message, locale) || t("telephony.toast.failed"))
        return
      }
      const published = await telephonyApi.publishScenario(token, scenario.id)
      if (published.status !== "success" || !published.response) {
        toast.error(apiText(published.message, locale) || t("telephony.toast.failed"))
        return
      }
      // The numbers checked answer with this assistant; those unchecked
      // go back to the default instructions.
      for (const l of lines) {
        const on = numbers.includes(l.id)
        const want = on ? { scenario_id: scenario.id, scope_id: scopeId } : { scenario_id: "", scope_id: "" }
        const has = l.scenario_id === scenario.id
        if ((on && (!has || l.scope_id !== scopeId)) || (!on && has)) {
          const r = await telephonyApi.updateLine(token, l.id, want)
          if (r.status !== "success") toast.error(apiText(r.message, locale) || t("telephony.toast.failed"))
        }
      }
      toast.success(t("telephony.assistants.toast.saved", { version: published.response.published?.version ?? 1 }))
      await load()
    } finally {
      setSaving(false)
    }
  }

  const crumbs = [
    { label: t("navigation.telephony"), href: "/app/telephony" },
    { label: t("telephony.settings.title"), href: "/app/telephony/settings?tab=assistants" },
    { label: scenario?.name ?? t("telephony.assistants.title") },
  ]

  if (!isAdmin) {
    return (
      <>
        <AppHeader breadcrumbs={crumbs} />
        <PageBody>
          <EmptyState icon={ShieldAlert} title={t("telephony.settings.adminsOnly")} className="py-16" />
        </PageBody>
      </>
    )
  }

  return (
    <>
      <AppHeader breadcrumbs={crumbs} />
      <PageBody>
        {missing ? (
          <EmptyState icon={Bot} title={t("telephony.assistants.missing")} className="py-16" />
        ) : !scenario ? (
          <div className="grid gap-4">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-[320px] rounded-2xl" />
            <Skeleton className="h-[480px] rounded-2xl" />
          </div>
        ) : (
          <>
            <PageHeader
              title={scenario.name}
              description={t("telephony.assistants.subtitle")}
              actions={
                <>
                  {scenario.published ? (
                    <Badge variant={dirty ? "secondary" : "success"}>
                      {dirty ? t("telephony.assistants.unsaved") : t("telephony.assistants.version", { version: scenario.published.version })}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{t("telephony.assistants.draft")}</Badge>
                  )}
                  <Button variant="outline" onClick={showPreview} disabled={saving}>
                    <Eye />
                    {t("telephony.assistants.preview")}
                  </Button>
                  <Button onClick={save} disabled={saving || !name.trim()}>
                    {saving && <Loader2 className="animate-spin" />}
                    {t("telephony.assistants.save")}
                  </Button>
                </>
              }
            />

            <Section title={t("telephony.assistants.company.title")} description={t("telephony.assistants.company.description")}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field id="a-name" label={t("telephony.assistants.company.name")} error={errors.name}>
                  <Input id="a-name" value={name} onChange={(e) => (setName(e.target.value), setDirty(true))} maxLength={120} disabled={saving} />
                </Field>
                <Field id="a-company" label={t("telephony.assistants.company.company")} error={errors["draft.company"]}>
                  <Input
                    id="a-company"
                    value={form.company}
                    onChange={(e) => change("company", e.target.value)}
                    placeholder={t("telephony.assistants.company.companyPlaceholder")}
                    maxLength={200}
                    disabled={saving}
                  />
                </Field>
                <Field id="a-assistant" label={t("telephony.assistants.company.assistantName")} help={t("telephony.assistants.company.assistantNameHelp")} error={errors["draft.assistant_name"]}>
                  <Input id="a-assistant" value={form.assistant_name} onChange={(e) => change("assistant_name", e.target.value)} placeholder="Анна" maxLength={60} disabled={saving} />
                </Field>
                <Field id="a-greeting" label={t("telephony.assistants.company.greeting")} help={t("telephony.assistants.company.greetingHelp")} error={errors["draft.greeting"]}>
                  <Input
                    id="a-greeting"
                    value={form.greeting}
                    onChange={(e) => change("greeting", e.target.value)}
                    placeholder={t("telephony.assistants.company.greetingPlaceholder")}
                    maxLength={300}
                    disabled={saving}
                  />
                </Field>
              </div>
            </Section>

            <Section title={t("telephony.assistants.instructions.title")} description={t("telephony.assistants.instructions.description")}>
              <Field id="a-instructions" label={t("telephony.assistants.instructions.label")} error={errors["draft.instructions"]}>
                <Textarea
                  id="a-instructions"
                  value={form.instructions}
                  onChange={(e) => change("instructions", e.target.value)}
                  placeholder={t("telephony.assistants.instructions.placeholder")}
                  className="min-h-44"
                  maxLength={8000}
                  disabled={saving}
                />
              </Field>
            </Section>

            <Section title={t("telephony.assistants.map.sectionTitle")} description={t("telephony.assistants.map.sectionDescription")}>
              <ScenarioMap key={scenario.id} nodes={map.nodes} edges={map.edges} onChange={onMap} disabled={saving} />
              {(errors["draft.nodes"] || errors["draft.edges"]) && (
                <p className="mt-2 text-[13px] text-destructive">{errors["draft.nodes"] || errors["draft.edges"]}</p>
              )}
            </Section>

            <Section title={t("telephony.assistants.files.title")} description={t("telephony.assistants.files.description")}>
              {files === null ? (
                <Skeleton className="h-40 rounded-2xl" />
              ) : (
                <FilePicker files={files} selected={chosen} onChange={(ids) => (setChosen(ids), setDirty(true))} disabled={saving} />
              )}
            </Section>

            <Section title={t("telephony.assistants.numbers.title")} description={t("telephony.assistants.numbers.description")}>
              {lines.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">{t("telephony.assistants.numbers.none")}</p>
              ) : (
                <ul className="grid gap-2">
                  {lines.map((l) => {
                    const other = l.scenario_id && l.scenario_id !== scenario.id
                    return (
                      <li key={l.id}>
                        <label className="flex cursor-pointer items-center gap-3 text-sm">
                          <Checkbox
                            checked={numbers.includes(l.id)}
                            onCheckedChange={(v) => {
                              setNumbers((ns) => (v === true ? [...ns, l.id] : ns.filter((x) => x !== l.id)))
                              setDirty(true)
                            }}
                            disabled={saving}
                          />
                          <span className="tabular-nums text-foreground">{formatPhone(l.did)}</span>
                          <span className="text-muted-foreground">{l.name}</span>
                          {other && !numbers.includes(l.id) && (
                            <span className="text-xs text-muted-foreground">{t("telephony.assistants.numbers.other")}</span>
                          )}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Section>
          </>
        )}
      </PageBody>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("telephony.assistants.previewTitle")}</DialogTitle>
            <DialogDescription>{t("telephony.assistants.previewDescription")}</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="grid gap-3">
              <p className="text-sm">
                <span className="text-muted-foreground">{t("telephony.assistants.company.greeting")}: </span>
                {preview.greeting}
              </p>
              <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-3 text-[13px] leading-relaxed text-foreground">
                {preview.prompt || t("telephony.assistants.previewEmpty")}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
