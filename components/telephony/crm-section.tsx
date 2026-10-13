"use client"

import { ExternalLink } from "lucide-react"
import type { CallDetail } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"

const providerName: Record<string, string> = { bitrix24: "Битрикс24", amocrm: "amoCRM" }

/** A CRM date (YYYY-MM-DD) as the locale writes it. */
function crmDate(d: string | undefined, locale: string) {
  if (!d) return ""
  const t = new Date(`${d}T12:00:00`)
  return Number.isNaN(t.getTime()) ? "" : t.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB")
}

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

/**
 * The call in the CRM: who the caller is there (found while the assistant
 * greeted them, the card the assistant read) and the records the call was
 * logged to, each a link.
 */
export function CRMSection({ call }: { call: CallDetail }) {
  const { t, locale } = useTranslation()
  const match = call.crm_match
  const contact = match?.found === "one" ? match.contact : undefined
  const links = call.extracted?.crm ?? []
  const many = match?.found === "many"
  if (!contact && links.length === 0 && !many) return null
  const open = (match?.deals ?? []).filter((d) => !d.closed)
  const closed = (match?.deals ?? []).filter((d) => d.closed)
  const kind = contact?.kind ?? "contact"
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">{t("telephony.call.crm.title")}</h2>
      <div className="flex flex-col gap-3 text-sm">
        {contact && (
          <Part title={t(`telephony.call.crm.kind.${kind}`)}>
            {contact.url ? (
              <a href={contact.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                {contact.name}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : (
              <p className="font-medium text-foreground">{contact.name}</p>
            )}
            {(contact.company || contact.post || contact.status || contact.responsible) && (
              <p className="text-[13px] text-muted-foreground">
                {[
                  contact.company,
                  contact.post,
                  contact.status && t("telephony.call.crm.status", { status: contact.status }),
                  contact.responsible && t("telephony.call.crm.responsible", { name: contact.responsible }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {contact.emails && contact.emails.length > 0 && <p className="break-all text-[13px] text-muted-foreground">{contact.emails.join(", ")}</p>}
            {contact.notes && <p className="mt-1 whitespace-pre-line rounded-lg bg-muted/60 px-2.5 py-1.5 text-[13px] text-foreground">{contact.notes}</p>}
          </Part>
        )}
        {open.length > 0 && (
          <Part title={t("telephony.call.crm.openDeals")}>
            <ul className="text-[13px] text-foreground">
              {open.map((d, i) => (
                <li key={i}>
                  {d.title}
                  <span className="text-muted-foreground">{[d.stage, crmDate(d.date, locale)].filter(Boolean).map((x) => ` · ${x}`)}</span>
                </li>
              ))}
            </ul>
          </Part>
        )}
        {closed.length > 0 && (
          <Part title={t("telephony.call.crm.closedDeals")}>
            <ul className="text-[13px] text-foreground">
              {closed.map((d, i) => (
                <li key={i}>
                  {d.title}
                  <span className={d.won ? "text-success" : "text-muted-foreground"}> · {d.won ? t("telephony.call.crm.won") : t("telephony.call.crm.lost")}</span>
                  {d.date && <span className="text-muted-foreground"> · {crmDate(d.date, locale)}</span>}
                </li>
              ))}
            </ul>
          </Part>
        )}
        {match?.leads && match.leads.length > 0 && (
          <Part title={t("telephony.call.crm.leads")}>
            <ul className="text-[13px] text-foreground">
              {match.leads.map((l, i) => (
                <li key={i}>
                  {l.title}
                  <span className="text-muted-foreground">{[l.status, crmDate(l.date, locale)].filter(Boolean).map((x) => ` · ${x}`)}</span>
                </li>
              ))}
            </ul>
          </Part>
        )}
        {match?.activities && match.activities.length > 0 && (
          <Part title={t("telephony.call.crm.activities")}>
            <ul className="text-[13px] text-foreground">
              {match.activities.map((a, i) => (
                <li key={i}>
                  <span className="text-muted-foreground">{crmDate(a.date, locale)} </span>
                  {t(`telephony.call.crm.activity.${a.kind === "call" ? (a.incoming ? "callIn" : "callOut") : a.kind}`)}
                  {a.subject ? `: ${a.subject}` : ""}
                </li>
              ))}
            </ul>
          </Part>
        )}
        {many && <p className="text-[13px] text-muted-foreground">{t("telephony.call.crm.many")}</p>}
        {links.length > 0 && (
          <Part title={t("telephony.call.crm.logged")}>
            <ul className="flex flex-col gap-1">
              {links.map((l) => (
                <li key={`${l.provider}-${l.entity}-${l.id}`}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    {["lead", "deal", "contact"].includes(l.entity) ? t(`telephony.call.crm.entity.${l.entity}`) : l.entity} №{l.id}
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                  <span className="text-[13px] text-muted-foreground">
                    {" "}
                    · {providerName[l.provider] ?? l.provider}
                    {l.created ? ` · ${t("telephony.call.crm.created")}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Part>
        )}
      </div>
    </section>
  )
}
