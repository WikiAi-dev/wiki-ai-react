"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Ban, Eye, KeyRound, Loader2, MoreHorizontal, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { apiKeysApi, type ApiKey } from "@/lib/api"
import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { PageBody, PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { ListPanel, ListSkeleton, ListToolbar } from "@/components/list-panel"
import { CopyField } from "@/components/team/invite-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

/** Permissions in the order the form lists them; anything else the server knows goes last. */
const PERMISSION_ORDER = ["search", "generate_ai_response", "download", "upload", "delete_documents", "manage_api_keys", "admin"]
const DEFAULT_PERMISSIONS = ["search", "generate_ai_response"]
const VALID_FOR = ["0", "30", "90", "365"]

type KeyStatus = "active" | "revoked" | "expired"

// go-core serializes unset time.Time fields as the Go zero value
// ("0001-01-01T00:00:00Z") rather than omitting them or sending null.
const isSet = (value?: string) => !!value && !value.startsWith("0001-01-01")

function statusOf(key: ApiKey): KeyStatus {
  if (key.status !== "active") return "revoked"
  if (isSet(key.expires_at) && new Date(key.expires_at!) < new Date()) return "expired"
  return "active"
}

interface Usage {
  total_requests: number
  avg_response_time_ms: number
  error_count: number
  total_llm_tokens: number
}

interface RequestEvent {
  endpoint: string
  method: string
  status_code: number
  latency_ms: number
  created_at: string
}

/** Name, description and permission checkboxes, shared by create and edit. */
function KeyFields({
  name,
  description,
  permissions,
  available,
  onName,
  onDescription,
  onPermissions,
  disabled,
}: {
  name: string
  description: string
  permissions: string[]
  available: string[]
  onName: (value: string) => void
  onDescription: (value: string) => void
  onPermissions: (value: string[]) => void
  disabled: boolean
}) {
  const { t } = useTranslation()
  const toggle = (permission: string) =>
    onPermissions(permissions.includes(permission) ? permissions.filter((p) => p !== permission) : [...permissions, permission])
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="key-name">{t("team.keys.name")}</Label>
        <Input
          id="key-name"
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder={t("team.keys.namePlaceholder")}
          autoComplete="off"
          disabled={disabled}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="key-description">{t("team.keys.description")}</Label>
        <Textarea
          id="key-description"
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          placeholder={t("team.keys.descriptionPlaceholder")}
          rows={2}
          disabled={disabled}
        />
      </div>
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="mb-2 text-sm font-medium leading-none">{t("team.keys.permissions")}</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {available.map((permission) => (
            <label
              key={permission}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50 has-[button[data-state=checked]]:border-primary/50 has-[button[data-state=checked]]:bg-primary/[0.06]"
            >
              <Checkbox checked={permissions.includes(permission)} onCheckedChange={() => toggle(permission)} />
              <span className="min-w-0 leading-snug">{permissionLabel(t, permission)}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  )
}

function permissionLabel(t: (key: string) => string, permission: string) {
  const key = `team.keys.perms.${permission}`
  const label = t(key)
  return label === key ? permission : label
}

export default function ApiKeysPage() {
  const { token, isAdmin, isLoading: authLoading } = useAuth()
  const { t, locale } = useTranslation()
  const router = useRouter()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [available, setAvailable] = useState<string[]>(PERMISSION_ORDER)
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState("")

  // Create and edit share one form; editing holds the key being changed.
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null)
  const [editing, setEditing] = useState<ApiKey | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [permissions, setPermissions] = useState<string[]>(DEFAULT_PERMISSIONS)
  const [validFor, setValidFor] = useState("90")
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const [detailsKey, setDetailsKey] = useState<ApiKey | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [requests, setRequests] = useState<RequestEvent[] | null>(null)

  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const dateLocale = locale === "ru" ? "ru-RU" : "en-GB"
  const formatDate = (value: string) => new Date(value).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })
  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(dateLocale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

  const fetchKeys = useCallback(async () => {
    if (!token) return
    try {
      const result = await apiKeysApi.list(token)
      if (result.status === "success" && result.response) setKeys(result.response.items || [])
    } catch (error) {
      console.error("Failed to fetch API keys:", error)
      toast.error(t("team.keys.loadFailed"))
    } finally {
      setIsLoading(false)
    }
  }, [token, t])

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/app")
  }, [authLoading, isAdmin, router])

  useEffect(() => {
    if (!isAdmin || !token) return
    // Fetch-on-condition pattern; fetchKeys sets the list from the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchKeys()
    apiKeysApi
      .getPermissions(token)
      .then((result) => {
        const known = Object.keys(result.response?.permissions || {})
        if (known.length === 0) return
        const rank = (p: string) => (PERMISSION_ORDER.includes(p) ? PERMISSION_ORDER.indexOf(p) : PERMISSION_ORDER.length)
        setAvailable([...known].sort((a, b) => rank(a) - rank(b)))
      })
      .catch(() => {
        // Keep the built-in list.
      })
  }, [isAdmin, token, fetchKeys])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return keys
    return keys.filter(
      (key) =>
        key.name.toLowerCase().includes(q) || key.description?.toLowerCase().includes(q) || key.key_prefix.toLowerCase().includes(q),
    )
  }, [keys, query])

  const openCreate = () => {
    setFormMode("create")
    setEditing(null)
    setName("")
    setDescription("")
    setPermissions(DEFAULT_PERMISSIONS)
    setValidFor("90")
    setFormError("")
    setCreatedKey(null)
  }

  const openEdit = (key: ApiKey) => {
    setFormMode("edit")
    setEditing(key)
    setName(key.name)
    setDescription(key.description || "")
    setPermissions(key.permissions)
    setFormError("")
  }

  const closeForm = () => {
    if (isSubmitting) return
    setFormMode(null)
    setCreatedKey(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    const problem = !name.trim() ? t("team.keys.errors.name") : permissions.length === 0 ? t("team.keys.errors.permissions") : ""
    setFormError(problem)
    if (problem) return
    setIsSubmitting(true)
    try {
      if (formMode === "edit" && editing) {
        const result = await apiKeysApi.update(token, editing.id, {
          name: name.trim(),
          description: description.trim(),
          permissions,
        })
        if (result.status !== "success") throw new Error(result.message)
        toast.success(t("team.keys.saved"))
        setFormMode(null)
      } else {
        const days = Number(validFor)
        const result = await apiKeysApi.create(token, {
          name: name.trim(),
          description: description.trim() || undefined,
          permissions,
          expires_in_days: days > 0 ? days : undefined,
        })
        if (result.status !== "success" || !result.response?.full_key) throw new Error(result.message)
        setCreatedKey(result.response.full_key)
      }
      fetchKeys()
    } catch (error) {
      console.error("API key save error:", error)
      setFormError(formMode === "edit" ? t("team.keys.saveFailed") : t("team.keys.failed"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDetails = async (key: ApiKey) => {
    setDetailsKey(key)
    setUsage(null)
    setRequests(null)
    if (!token) return
    const [usageRes, logRes] = await Promise.all([
      apiKeysApi.getUsageStats(token, key.id, 7).catch(() => null),
      apiKeysApi.getAuditLog(token, key.id, 10).catch(() => null),
    ])
    setUsage(usageRes?.status === "success" && usageRes.response ? usageRes.response : { total_requests: 0, avg_response_time_ms: 0, error_count: 0, total_llm_tokens: 0 })
    setRequests(logRes?.status === "success" && logRes.response ? logRes.response.events || [] : [])
  }

  const confirmRevoke = async () => {
    if (!token || !revokeTarget) return
    setIsConfirming(true)
    try {
      const result = await apiKeysApi.revoke(token, revokeTarget.id)
      if (result.status !== "success") throw new Error(result.message)
      toast.success(t("team.keys.revoked"))
      setRevokeTarget(null)
      fetchKeys()
    } catch (error) {
      console.error("Revoke key error:", error)
      toast.error(t("team.keys.revokeFailed"))
    } finally {
      setIsConfirming(false)
    }
  }

  const confirmDelete = async () => {
    if (!token || !deleteTarget) return
    setIsConfirming(true)
    try {
      const result = await apiKeysApi.delete(token, deleteTarget.id)
      if (result.status !== "success") throw new Error(result.message)
      toast.success(t("team.keys.deleted"))
      setDeleteTarget(null)
      fetchKeys()
    } catch (error) {
      console.error("Delete key error:", error)
      toast.error(t("team.keys.deleteFailed"))
    } finally {
      setIsConfirming(false)
    }
  }

  if (!authLoading && !isAdmin) return null

  const createButton = (
    <Button onClick={openCreate}>
      <Plus />
      {t("team.keys.create")}
    </Button>
  )

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t("navigation.apiKeys") }]} />
      <PageBody>
        <PageHeader title={t("team.keys.title")} description={t("team.keys.subtitle")} actions={createButton} />

        <ListPanel>
          <ListToolbar query={query} onQueryChange={setQuery} placeholder={t("team.keys.search")}>
            {!isLoading && (filtered.length === keys.length ? keys.length : `${filtered.length} / ${keys.length}`)}
          </ListToolbar>
          {isLoading ? (
            <ListSkeleton rows={3} />
          ) : keys.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title={t("team.keys.emptyTitle")}
              description={t("team.keys.emptyText")}
              action={createButton}
              className="m-4 sm:m-5"
            />
          ) : filtered.length === 0 ? (
            <EmptyState icon={KeyRound} title={t("team.keys.noMatch")} className="m-4 sm:m-5" />
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((key) => {
                const status = statusOf(key)
                const meta = [
                  isSet(key.last_used_at) ? t("team.keys.lastUsed", { date: formatDate(key.last_used_at!) }) : t("team.keys.neverUsed"),
                  isSet(key.expires_at) ? t("team.keys.expires", { date: formatDate(key.expires_at!) }) : t("team.keys.noExpiry"),
                ]
                return (
                  <li key={key.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                      <KeyRound className="size-4" strokeWidth={1.75} aria-hidden />
                    </span>
                    <button type="button" onClick={() => openDetails(key)} className="min-w-0 flex-1 text-left focus-visible:outline-none">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground hover:text-primary">{key.name}</span>
                        <code className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground max-sm:hidden">
                          {key.key_prefix}…
                        </code>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {[key.description, ...meta].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                    <div className="hidden max-w-[16rem] flex-wrap justify-end gap-1 lg:flex">
                      {key.permissions.slice(0, 2).map((permission) => (
                        <Badge key={permission} variant="secondary">
                          {permissionLabel(t, permission)}
                        </Badge>
                      ))}
                      {key.permissions.length > 2 && <Badge variant="outline">+{key.permissions.length - 2}</Badge>}
                    </div>
                    <Badge variant={status === "active" ? "success" : "outline"}>{t(`team.keys.status.${status}`)}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={key.name}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDetails(key)}>
                          <Eye />
                          {t("team.keys.details")}
                        </DropdownMenuItem>
                        {status === "active" && (
                          <>
                            <DropdownMenuItem onClick={() => openEdit(key)}>
                              <Pencil />
                              {t("team.keys.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRevokeTarget(key)}>
                              <Ban />
                              {t("team.keys.revoke")}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(key)}>
                          <Trash2 />
                          {t("team.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                )
              })}
            </ul>
          )}
        </ListPanel>
      </PageBody>

      <Dialog open={formMode !== null} onOpenChange={(open) => (open ? undefined : closeForm())}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          {createdKey ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("team.keys.readyTitle")}</DialogTitle>
                <DialogDescription>{t("team.keys.readyLead", { name })}</DialogDescription>
              </DialogHeader>
              <p className="flex items-start gap-2.5 rounded-xl bg-warning/15 px-3.5 py-2.5 text-sm text-foreground">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-foreground dark:text-warning" aria-hidden />
                {t("team.keys.readyText")}
              </p>
              <CopyField value={createdKey} label={t("team.keys.key")} copiedText={t("team.keys.keyCopied")} />
              <DialogFooter>
                <Button onClick={closeForm}>{t("team.done")}</Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-5">
              <DialogHeader>
                <DialogTitle>{formMode === "edit" ? t("team.keys.editTitle") : t("team.keys.dialogTitle")}</DialogTitle>
                <DialogDescription>{t("team.keys.subtitle")}</DialogDescription>
              </DialogHeader>
              <KeyFields
                name={name}
                description={description}
                permissions={permissions}
                available={available}
                onName={setName}
                onDescription={setDescription}
                onPermissions={setPermissions}
                disabled={isSubmitting}
              />
              {formMode === "create" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="key-valid-for">{t("team.keys.validFor")}</Label>
                  <Select value={validFor} onValueChange={setValidFor} disabled={isSubmitting}>
                    <SelectTrigger id="key-valid-for" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VALID_FOR.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`team.keys.days.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {formError && (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>
                  {t("team.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="animate-spin" />}
                  {formMode === "edit"
                    ? isSubmitting
                      ? t("team.saving")
                      : t("team.save")
                    : isSubmitting
                      ? t("team.keys.sending")
                      : t("team.keys.send")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailsKey !== null}
        onOpenChange={(open) => {
          if (!open) setDetailsKey(null)
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {detailsKey && (
            <>
              <DialogHeader>
                <DialogTitle className="flex min-w-0 items-center gap-2 pr-8">
                  <span className="truncate">{detailsKey.name}</span>
                  <Badge variant={statusOf(detailsKey) === "active" ? "success" : "outline"}>
                    {t(`team.keys.status.${statusOf(detailsKey)}`)}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  <code className="font-mono text-xs">{detailsKey.key_prefix}…</code>
                  {" · "}
                  {t("team.keys.created", { date: formatDate(detailsKey.created_at) })}
                  {" · "}
                  {isSet(detailsKey.expires_at) ? t("team.keys.expires", { date: formatDate(detailsKey.expires_at!) }) : t("team.keys.noExpiry")}
                </DialogDescription>
              </DialogHeader>

              <section>
                <h3 className="text-sm font-semibold tracking-tight">{t("team.keys.usageTitle")}</h3>
                <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    [t("team.keys.requests"), usage?.total_requests.toLocaleString(dateLocale)],
                    [t("team.keys.errorsCount"), usage?.error_count.toLocaleString(dateLocale)],
                    [t("team.keys.avgLatency"), usage ? `${Math.round(usage.avg_response_time_ms).toLocaleString(dateLocale)} ms` : undefined],
                    [t("team.keys.tokens"), usage?.total_llm_tokens.toLocaleString(dateLocale)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border px-3 py-2.5">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums">{value ?? <Skeleton className="h-6 w-10" />}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold tracking-tight">{t("team.keys.permissions")}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {detailsKey.permissions.map((permission) => (
                    <Badge key={permission} variant="secondary">
                      {permissionLabel(t, permission)}
                    </Badge>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold tracking-tight">{t("team.keys.recentTitle")}</h3>
                {requests === null ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : requests.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">{t("team.keys.noRequests")}</p>
                ) : (
                  <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                    {requests.map((event, i) => (
                      <li key={`${event.created_at}-${i}`} className="flex items-center gap-3 px-3 py-2 text-xs">
                        <span className="w-12 shrink-0 font-mono text-muted-foreground">{event.method}</span>
                        <span className="min-w-0 flex-1 truncate font-mono">{event.endpoint}</span>
                        <Badge variant={event.status_code >= 400 ? "destructive" : "secondary"} className="font-mono">
                          {event.status_code}
                        </Badge>
                        <span className="w-24 shrink-0 text-right tabular-nums text-muted-foreground max-sm:hidden">
                          {formatDateTime(event.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={revokeTarget !== null || deleteTarget !== null}
        onOpenChange={(open) => {
          if (open || isConfirming) return
          setRevokeTarget(null)
          setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{revokeTarget ? t("team.keys.revokeTitle") : t("team.keys.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget
                ? t("team.keys.revokeText", { name: revokeTarget.name })
                : t("team.keys.deleteText", { name: deleteTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConfirming}>{t("team.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (revokeTarget) confirmRevoke()
                else confirmDelete()
              }}
              disabled={isConfirming}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isConfirming && <Loader2 className="animate-spin" />}
              {revokeTarget ? t("team.keys.revoke") : t("team.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
