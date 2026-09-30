"use client";

import { DoorOpen, GraduationCap, Hourglass, type LucideIcon } from "lucide-react";
import { useCopy } from "../_lib/copy";
import { Reveal } from "./motion";
import { Container, SectionTitle } from "./primitives";

const ICONS: LucideIcon[] = [Hourglass, GraduationCap, DoorOpen];

export function Pains() {
  const { t, get } = useCopy();
  const items = get<{ title: string; desc: string }[]>("pains.items");
  return (
    <section className="border-y border-border/70 bg-muted/40 py-16 md:py-24">
      <Container className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <Reveal>
          <SectionTitle className="max-w-[16ch]">{t("pains.title")}</SectionTitle>
        </Reveal>
        <ul className="flex flex-col gap-6 md:gap-8">
          {items.map((item, i) => {
            const Icon = ICONS[i];
            return (
              <li key={item.title}>
                <Reveal delay={i * 0.08} className="flex gap-4 md:gap-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground md:size-11">
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">{item.title}</h3>
                    <p className="mt-1 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground md:mt-1.5 md:text-base">{item.desc}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
