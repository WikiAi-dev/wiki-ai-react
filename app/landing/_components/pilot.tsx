"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { CircleCheckBig, Headset, Plug, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopy, useHydrated } from "../_lib/copy";
import { Reveal } from "./motion";
import { ButtonLink, Container, Lead, SectionTitle } from "./primitives";

const ICONS: LucideIcon[] = [Plug, Headset, CircleCheckBig];

export function Pilot() {
  const { t, get } = useCopy();
  const steps = get<{ title: string; desc: string }[]>("pilot.steps");
  const ref = useRef<HTMLOListElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });
  // Server HTML shows the steps; they only wait off screen once the page is interactive.
  const inView = useHydrated() ? seen : true;

  return (
    <section id="pilot" className="scroll-mt-20 border-t border-border/70 py-16 md:py-24 lg:py-28">
      <Container>
        <Reveal className="max-w-[44rem]">
          <SectionTitle>{t("pilot.title")}</SectionTitle>
          <Lead className="mt-4">{t("pilot.subtitle")}</Lead>
        </Reveal>

        <ol ref={ref} className="mt-10 grid grid-cols-1 gap-8 md:mt-12 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = ICONS[i];
            const last = i === steps.length - 1;
            return (
              <li key={step.title} className="relative flex gap-4 md:block">
                {/* Connector to the next step: down on phones, across on wider screens. Draws in once the steps are on screen. */}
                {!last && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-5 top-12 -bottom-6 w-px origin-top bg-primary/40 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                      "md:bottom-auto md:left-14 md:right-[-1.5rem] md:top-5 md:h-px md:w-auto md:origin-left",
                      inView ? "scale-100" : "scale-y-0 md:scale-x-0 md:scale-y-100",
                    )}
                    style={{ transitionDelay: `${250 + i * 350}ms` }}
                  />
                )}
                <span
                  className={cn(
                    "relative grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                    inView ? "scale-100 opacity-100" : "scale-75 opacity-0",
                  )}
                  style={{ transitionDelay: `${i * 350}ms` }}
                >
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div
                  className={cn(
                    "transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none md:mt-5",
                    inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                  )}
                  style={{ transitionDelay: `${100 + i * 350}ms` }}
                >
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">{step.title}</h3>
                  <p className="mt-1.5 max-w-[36ch] text-[15px] leading-relaxed text-muted-foreground md:mt-2">{step.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <Reveal className="mt-10 md:mt-12">
          <ButtonLink href="/contact">{t("menu.cta")}</ButtonLink>
        </Reveal>
      </Container>
    </section>
  );
}
