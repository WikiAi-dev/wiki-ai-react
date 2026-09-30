"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCopy } from "../_lib/copy";
import { Reveal } from "./motion";
import { Container, SectionTitle } from "./primitives";

export function Faq() {
  const { t, get } = useCopy();
  const items = get<{ q: string; a: string }[]>("faq.items");
  return (
    <section id="faq" className="scroll-mt-20 border-t border-border/70 py-16 md:py-24 lg:py-28">
      <Container className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <SectionTitle>{t("faq.title")}</SectionTitle>
          <p className="mt-4 text-muted-foreground">{t("faq.subtitle")}</p>
        </Reveal>
        <Reveal delay={0.08}>
          <Accordion type="single" collapsible className="border-t border-border">
            {items.map((item, i) => (
              <AccordionItem key={item.q} value={`faq-${i}`} className="border-border">
                <AccordionTrigger className="py-4 text-base font-medium md:py-5 text-foreground hover:no-underline focus-visible:ring-ring/40 [&>svg]:size-5">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="max-w-[62ch] pb-5 text-[15px] leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </Container>
    </section>
  );
}
