"use client";

import { GraduationCap, Library, MessagesSquare, Timer, type LucideIcon } from "lucide-react";
import { useCopy } from "../_lib/copy";
import { Reveal } from "./motion";
import { Container, SectionTitle } from "./primitives";

const ICONS: LucideIcon[] = [Timer, MessagesSquare, GraduationCap, Library];

export function Results() {
  const { t, get } = useCopy();
  const items = get<{ title: string; desc: string }[]>("results.items");
  return (
    <section className="border-t border-border/70 py-16 md:py-24 lg:py-28">
      <Container>
        <Reveal>
          <SectionTitle>{t("results.title")}</SectionTitle>
        </Reveal>
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10 md:mt-12 lg:grid-cols-4 lg:gap-x-10">
          {items.map((item, i) => {
            const Icon = ICONS[i];
            return (
              <li key={item.title}>
                <Reveal delay={i * 0.07} className="flex gap-4 sm:block sm:border-t-2 sm:border-primary sm:pt-6">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary sm:size-auto sm:bg-transparent">
                    <Icon className="size-5 sm:size-6" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground sm:mt-4">{item.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground sm:mt-2">{item.desc}</p>
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
