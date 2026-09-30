"use client";

import { Fragment, useState } from "react";
import { ArrowRight, MessagesSquare, PhoneCall, Waypoints } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopy } from "../_lib/copy";
import { CallPanel, SourceNote, type CallMode } from "./call-panel";
import { Reveal, TiltCard } from "./motion";
import { Container, SectionTitle } from "./primitives";

const MODES: CallMode[] = ["operator", "bot"];

export function HowItWorks() {
  const { t, get } = useCopy();
  const [mode, setMode] = useState<CallMode>("operator");
  const flow = get<string[]>("how.sip.flow");

  return (
    <section id="how" className="scroll-mt-20 border-t border-border/70 py-16 md:py-24 lg:py-28">
      <Container>
        <Reveal>
          <SectionTitle>{t("how.title")}</SectionTitle>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-5">
          {/* On phones the call panel stands on its own instead of sitting in a card inside a card. */}
          <Reveal className="min-w-0 md:col-span-3 md:row-span-2">
            <article className="flex h-full flex-col md:rounded-2xl md:border md:border-border md:bg-primary/[0.06] md:p-8">
              <PhoneCall className="size-6 text-primary" strokeWidth={1.75} aria-hidden />
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground md:mt-5">{t("how.calls.title")}</h3>
              <div role="tablist" aria-label={t("how.calls.title")} className="mt-5 inline-flex self-start rounded-full border border-border bg-card p-1">
                {MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    aria-controls="how-call"
                    onClick={() => setMode(m)}
                    className={cn(
                      "h-8 rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                      mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(`how.calls.modes.${m}`)}
                  </button>
                ))}
              </div>
              <div id="how-call" role="tabpanel" className="mt-5">
                <CallPanel mode={mode} />
              </div>
            </article>
          </Reveal>

          <Reveal delay={0.08} className="min-w-0 md:col-span-2">
            <TiltCard>
              <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 sm:p-6 md:p-8">
                <Waypoints className="size-6 text-primary" strokeWidth={1.75} aria-hidden />
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground md:mt-5">{t("how.sip.title")}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{t("how.sip.desc")}</p>
                <ol className="mt-6 flex flex-wrap items-center gap-x-1.5 gap-y-2">
                  {flow.map((step, i) => {
                    const last = i === flow.length - 1;
                    return (
                      <Fragment key={step}>
                        <li
                          className={cn(
                            "rounded-full px-3.5 py-1.5 text-sm font-medium",
                            last ? "bg-primary text-primary-foreground" : "border border-border text-foreground",
                          )}
                        >
                          {step}
                        </li>
                        {!last && <ArrowRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />}
                      </Fragment>
                    );
                  })}
                </ol>
              </article>
            </TiltCard>
          </Reveal>

          <Reveal delay={0.16} className="min-w-0 md:col-span-2">
            <TiltCard>
              <article className="flex h-full flex-col rounded-2xl border border-border bg-muted/60 p-5 sm:p-6 md:p-8">
                <MessagesSquare className="size-6 text-primary" strokeWidth={1.75} aria-hidden />
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground md:mt-5">{t("how.chat.title")}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{t("how.chat.desc")}</p>
                <div className="mt-6">
                  <ChatWidget />
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
          <p className="text-sm font-medium text-foreground">{t("how.chat.widget")}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            {t("how.chat.status")}
          </p>
        </div>
        <span className="ml-auto font-mono text-xs text-muted-foreground">{t("how.chat.time")}</span>
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        <p className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[14px] leading-snug text-primary-foreground">
          {t("how.chat.question")}
        </p>
        <div className="max-w-[92%] self-start rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5">
          <p className="text-[14px] leading-snug text-foreground">{t("how.chat.answer")}</p>
          <SourceNote source={t("how.chat.source")} />
        </div>
      </div>
    </div>
  );
}
