"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useCopy } from "@/app/landing/_lib/copy";
import { Container } from "@/app/landing/_components/primitives";
import { ContactCard } from "./contact-card";

const delay = (ms: number) => ({ "--wl-delay": `${ms}ms` }) as CSSProperties;

export function ContactView() {
  const { t } = useCopy();
  return (
    <section className="w-full overflow-hidden">
      {/* Sized to fit one screen. On very short screens the least important text steps aside instead of forcing a scroll. */}
      <Container className="grid items-center gap-4 py-5 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:py-6">
        <div>
          <h1 className="wl-enter text-[1.75rem] font-semibold leading-[1.12] tracking-tight text-balance text-foreground sm:text-4xl lg:text-[2.6rem]">
            {t("contact.title")}
          </h1>
          <p
            className="wl-enter mt-3 max-w-[34rem] text-[15px] leading-relaxed text-muted-foreground text-pretty max-lg:[@media(max-height:700px)]:hidden sm:text-base md:mt-5 md:text-lg"
            style={delay(80)}
          >
            {t("contact.subtitle")}
          </p>
          <NextSteps className="wl-enter mt-8 hidden lg:[@media(min-height:681px)]:block" style={delay(160)} />
        </div>

        <div className="mx-auto w-full max-w-[30rem]">
          <ContactCard />
        </div>
      </Container>
    </section>
  );
}

function NextSteps({ className, style }: { className?: string; style?: CSSProperties }) {
  const { t, get } = useCopy();
  const steps = get<{ title: string; desc: string }[]>("contact.steps");
  return (
    <div className={className} style={style}>
      <h2 className="text-base font-semibold text-foreground">{t("contact.stepsTitle")}</h2>
      <ol className="mt-5 flex flex-col">
        {steps.map((step, i) => {
          const last = i === steps.length - 1;
          return (
            <li key={step.title} className={cn("relative flex gap-4", !last && "pb-6")}>
              {!last && <span aria-hidden className="absolute left-[0.6875rem] top-7 bottom-1 w-px bg-primary/30" />}
              <span className="relative mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1 max-w-[40ch] text-[15px] leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
