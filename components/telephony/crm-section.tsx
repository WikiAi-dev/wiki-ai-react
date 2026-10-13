"use client"

import { ExternalLink } from "lucide-react"
import type { CallDetail } from "@/lib/telephony"
import { useTranslation } from "@/src/i18n"

const providerName: Record<string, string> = { bitrix24: "Битрикс24", amocrm: "amoCRM" }

/**
 * The call in the CRM: who the caller is there (found while the assistant
 * greeted them) and the records the call was logged to, each a link.
 */
export function CRMSection({ call }: { call: CallDetail }) {
  const { t } = useTranslation()
  const contact = call.crm_match?.found === "one" ? call.crm_match.contact : undefined
  const links = call.extracted?.crm ?? []
  const many = call.crm_match?.found === "many"
  if (!contact && links.length === 0 && !many) return null
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">{t("telephony.call.crm.title")}</h2>
      <div className="flex flex-col gap-3 text-sm">
        {contact && (
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t("telephony.call.crm.contact")}</p>
            {contact.url ? (
              <a href={contact.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                {contact.name}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : (
              <p className="font-medium text-foreground">{contact.name}</p>
            )}
            {(contact.company || contact.responsible) && (
              <p className="text-[13px] text-muted-foreground">
                {[contact.company, contact.responsible && t("telephony.call.crm.responsible", { name: contact.responsible })].filter(Boolean).join(" · ")}
              </p>
            )}
            {call.crm_match.deals && call.crm_match.deals.length > 0 && (
              <ul className="mt-1 text-[13px] text-muted-foreground">
                {call.crm_match.deals.map((d, i) => (
                  <li key={i}>
                    {d.title}
                    {d.stage ? ` · ${d.stage}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {many && <p className="text-[13px] text-muted-foreground">{t("telephony.call.crm.many")}</p>}
        {links.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">{t("telephony.call.crm.logged")}</p>
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
          </div>
        )}
      </div>
    </section>
  )
}
