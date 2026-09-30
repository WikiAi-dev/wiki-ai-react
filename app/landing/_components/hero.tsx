"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCopy } from "../_lib/copy";
import { Hub, type Focus } from "./hub";
import { ButtonLink, Container } from "./primitives";

type Phrase = { text: string; focus: Focus };

const ROTATE_MS = 2800;

const delay = (ms: number) => ({ "--wl-delay": `${ms}ms` }) as CSSProperties;

export function Hero() {
  const { t, get } = useCopy();
  const phrases = get<Phrase[]>("hero.phrases");
  const [{ current, previous }, setSlot] = useState({ current: 0, previous: -1 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setSlot(({ current: c }) => ({ current: (c + 1) % phrases.length, previous: c })), ROTATE_MS);
    return () => clearInterval(id);
  }, [reduce, phrases.length]);

  const lead = t("hero.lead");

  return (
    <section className="overflow-hidden">
      <Container className="grid items-center gap-6 pb-14 pt-10 sm:gap-10 md:pt-14 lg:min-h-[min(calc(100dvh-4rem),860px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 lg:py-16">
        <div>
          <h1 className="wl-enter text-[1.9rem] font-semibold leading-[1.12] tracking-tight text-foreground sm:text-5xl lg:text-[3.1rem] xl:text-[3.4rem]">
            <span className="sr-only">{`${lead} ${phrases.map((p) => p.text).join(", ")}`}</span>
            <span aria-hidden className="block text-balance">
              {lead}
            </span>
            {/* Every phrase shares one grid cell, so the heading is as tall as the longest phrase and never jumps. */}
            <span aria-hidden className="grid pb-1">
              {phrases.map((p, i) => (
                <span
                  key={p.text}
                  className={cn(
                    "col-start-1 row-start-1 text-balance text-primary transition-[opacity,transform,filter] ease-[cubic-bezier(0.16,1,0.3,1)]",
                    // The outgoing phrase leaves quickly; the incoming one waits for it, so the two barely overlap.
                    i === current
                      ? "translate-y-0 opacity-100 blur-0 delay-150 duration-700"
                      : i === previous
                        ? "-translate-y-3 opacity-0 blur-[6px] duration-300"
                        : "translate-y-3 opacity-0 blur-[6px] duration-0",
                  )}
                >
                  {p.text}
                </span>
              ))}
            </span>
          </h1>
          <p className="wl-enter mt-5 max-w-[36rem] text-[17px] leading-relaxed text-muted-foreground text-pretty md:mt-6 md:text-xl" style={delay(80)}>
            {t("hero.subtitle")}
          </p>
          <div className="wl-enter mt-7 flex flex-wrap gap-3 md:mt-8" style={delay(160)}>
            <ButtonLink href="/contact">{t("menu.cta")}</ButtonLink>
            <ButtonLink href="#how" variant="secondary">
              {t("menu.secondary")}
            </ButtonLink>
          </div>
        </div>
        <div className="wl-enter mx-auto w-full max-w-[34rem]" style={delay(200)}>
          <Hub focus={phrases[current]?.focus ?? "gather"} />
        </div>
      </Container>
    </section>
  );
}
