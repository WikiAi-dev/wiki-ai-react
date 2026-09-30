"use client";

import { Braces, MessagesSquare, Users } from "lucide-react";
import { useCopy } from "../_lib/copy";
import { AskPanel, SourceNote } from "./ask-panel";
import { Reveal, TiltCard } from "./motion";
import { Container, Lead, SectionTitle } from "./primitives";

export function HowItWorks() {
  const { t, get } = useCopy();
  const channels = get<string[]>("how.clients.channels");

  return (
    <section id="how" className="scroll-mt-20 border-t border-border/70 py-16 md:py-24 lg:py-28">
      <Container>
        <Reveal className="max-w-[46rem]">
          <SectionTitle>{t("how.title")}</SectionTitle>
          <Lead className="mt-4">{t("how.subtitle")}</Lead>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-5">
          {/* On phones the panel stands on its own instead of sitting in a card inside a card. */}
          <Reveal className="min-w-0 md:col-span-3 md:row-span-2">
            <article className="flex h-full flex-col md:rounded-2xl md:border md:border-border md:bg-primary/[0.06] md:p-8">
              <Users className="size-6 text-primary" strokeWidth={1.75} aria-hidden />
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground md:mt-5">{t("how.ask.title")}</h3>
              <p className="mt-2 max-w-[52ch] leading-relaxed text-muted-foreground">{t("how.ask.desc")}</p>
              <AskPanel className="mt-6 flex-1" />
            </article>
          </Reveal>

          <Reveal delay={0.08} className="min-w-0 md:col-span-2">
            <TiltCard>
              <article className="flex h-full flex-col rounded-2xl border border-border bg-muted/60 p-5 sm:p-6 md:p-8">
                <MessagesSquare className="size-6 text-primary" strokeWidth={1.75} aria-hidden />
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground md:mt-5">{t("how.clients.title")}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{t("how.clients.desc")}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {channels.map((c) => (
                    <li key={c} className="rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-foreground">
                      {c}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <ChatWidget />
                </div>
              </article>
            </TiltCard>
          </Reveal>

          <Reveal delay={0.16} className="min-w-0 md:col-span-2">
            <TiltCard>
              <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 sm:p-6 md:p-8">
                <Braces className="size-6 text-primary" strokeWidth={1.75} aria-hidden />
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground md:mt-5">{t("how.api.title")}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{t("how.api.desc")}</p>
                <div className="mt-6">
                  <ApiSnippet />
                </div>
              </article>
            </TiltCard>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

function ChatWidget() {
  const { t } = useCopy();
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_48px_-28px_var(--wl-shadow)]">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span aria-hidden className="grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          W
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-medium text-foreground">{t("how.clients.widget")}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            {t("how.clients.status")}
          </p>
        </div>
        <span className="ml-auto font-mono text-xs text-muted-foreground">{t("how.clients.time")}</span>
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        <p className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[14px] leading-snug text-primary-foreground">
          {t("how.clients.question")}
        </p>
        <div className="max-w-[92%] self-start rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5">
          <p className="text-[14px] leading-snug text-foreground">{t("how.clients.answer")}</p>
          <SourceNote source={t("how.clients.source")} />
        </div>
      </div>
    </div>
  );
}

/** A request to the knowledge base search endpoint and its answer, in the real request and response shape. */
function ApiSnippet() {
  const { t } = useCopy();
  const key = (k: string) => <span className="text-foreground">&quot;{k}&quot;</span>;
  const str = (v: string) => <span className="text-primary">&quot;{v}&quot;</span>;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/70 font-mono text-[12px] leading-relaxed text-muted-foreground sm:text-[12.5px]">
      <p className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">POST</span>
        <span className="truncate text-foreground">/v1/ai-agent/kb-search</span>
      </p>
      <pre className="whitespace-pre-wrap break-words px-4 py-3 font-mono">
        {"{ "}
        {key("query")}: {str(t("how.api.query"))}
        {" }"}
      </pre>
      <p className="flex items-center gap-2 border-y border-border px-4 py-2">
        <span className="size-1.5 rounded-full bg-primary" aria-hidden />
        <span className="text-foreground">200 OK</span>
      </p>
      <pre className="whitespace-pre-wrap break-words px-4 py-3 font-mono">
        {"{\n  "}
        {key("overview")}: {str(t("how.api.overview"))}
        {",\n  "}
        {key("results")}
        {": [{\n    "}
        {key("source")}: {str(t("how.api.source"))}
        {"\n  }]\n}"}
      </pre>
    </div>
  );
}
