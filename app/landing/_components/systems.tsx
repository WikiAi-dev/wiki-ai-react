"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Check, Database, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopy } from "../_lib/copy";
import { Reveal, SPRING, TiltCard } from "./motion";
import { BrandLogo, Container, Lead, SectionTitle, type LogoId } from "./primitives";

type Source = { id: "bitrix24" | "1c" | "docs" | "custom"; name: string; data: string };
type FeedEvent = { system: string; text: string };

const MORE: { id: LogoId; size: string }[] = [
  { id: "googledrive", size: "h-5" },
  { id: "confluence", size: "h-5" },
  { id: "gmail", size: "h-5" },
  { id: "telegram", size: "h-5" },
  { id: "opencart", size: "h-[18px]" },
];

const FEED_VISIBLE = 4;
const FEED_TICK_MS = 3400;

function SourceMark({ source }: { source: Source }): ReactNode {
  switch (source.id) {
    case "bitrix24":
      return <BrandLogo id="bitrix24" className="h-4 sm:h-5" />;
    case "1c":
      return <BrandLogo id="1c" className="h-7 sm:h-8" />;
    case "docs":
    case "custom": {
      // "custom" stands for any other system the customer connects, as in the hero hub.
      const Icon = source.id === "docs" ? FileText : Database;
      return (
        <>
          <Icon className="size-5 shrink-0 text-primary sm:size-6" strokeWidth={1.75} aria-hidden />
          <span className="leading-tight">{source.name}</span>
        </>
      );
    }
  }
}

export function Systems() {
  const { t, get } = useCopy();
  const sources = get<Source[]>("systems.sources");

  return (
    <section id="systems" className="scroll-mt-20 py-16 md:py-24 lg:py-28">
      <Container>
        <Reveal className="max-w-[46rem]">
          <SectionTitle>{t("systems.title")}</SectionTitle>
          <Lead className="mt-4">{t("systems.subtitle")}</Lead>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-4 md:mt-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <ul className="grid grid-cols-2 gap-3 sm:gap-4">
            {sources.map((s, i) => (
              <li key={s.id} className="min-w-0">
                <Reveal delay={i * 0.06} className="h-full">
                  <TiltCard>
                    <div className="h-full rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 sm:p-6">
                      <h3 className="flex min-h-8 items-center gap-2 text-base font-semibold text-foreground sm:gap-2.5 sm:text-lg">
                        <SourceMark source={s} />
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-[15px]">{s.data}</p>
                    </div>
                  </TiltCard>
                </Reveal>
              </li>
            ))}
          </ul>

          <Reveal delay={0.12} className="min-w-0">
            <LiveFeed />
          </Reveal>
        </div>

        <Reveal className="mt-8 flex flex-col gap-4 md:mt-10 md:flex-row md:items-center md:gap-10">
          <p className="max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">{t("systems.more")}</p>
          <ul className="flex flex-wrap items-center gap-x-7 gap-y-4 text-muted-foreground">
            {MORE.map(({ id, size }) => (
              <li key={id}>
                <BrandLogo id={id} className={cn(size, "transition-colors hover:text-foreground")} />
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}

/**
 * The sync log from the systems above. While it is on screen, a new event
 * arrives at the top every few seconds, the way changes flow in from real
 * sources. The time labels belong to positions, so they always read in order.
 */
function LiveFeed() {
  const { t, get } = useCopy();
  const pool = get<FeedEvent[]>("systems.feed");
  const times = get<string[]>("systems.feedTimes");
  const [head, setHead] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView || reduce) return;
    const id = setInterval(() => setHead((h) => (h + pool.length - 1) % pool.length), FEED_TICK_MS);
    return () => clearInterval(id);
  }, [inView, reduce, pool.length]);

  const items = Array.from({ length: Math.min(FEED_VISIBLE, pool.length) }, (_, i) => pool[(head + i) % pool.length]);

  return (
    <div ref={ref} className="h-full rounded-2xl border border-border bg-muted/60 p-3 sm:p-5">
      <p className="flex items-center gap-2 px-1 pt-1 text-sm font-medium text-foreground">
        <span className="wl-live-dot size-1.5 rounded-full bg-primary" aria-hidden />
        {t("systems.feedTitle")}
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item, i) => (
            <motion.li
              key={item.text}
              layout
              initial={{ opacity: 0, y: -14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
              transition={SPRING}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 sm:px-3.5 sm:py-3",
                i === 0 ? "border-primary/40" : "border-border",
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Check className="size-4" strokeWidth={2.25} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.text}</p>
                <p className="text-xs text-muted-foreground">
                  {item.system}, {times[i]}
                </p>
              </div>
              <span className="hidden shrink-0 text-xs font-medium text-primary sm:inline">{t("systems.status")}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
