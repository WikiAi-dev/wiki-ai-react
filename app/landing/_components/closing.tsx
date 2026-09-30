"use client";

import Link from "next/link";
import { useCopy } from "../_lib/copy";
import { Wordmark } from "./nav";
import { Reveal } from "./motion";
import { ButtonLink, Container } from "./primitives";

export function FinalCta() {
  const { t } = useCopy();
  return (
    <section className="pb-16 md:pb-28">
      <Container>
        <Reveal className="relative isolate overflow-hidden rounded-2xl bg-primary px-6 py-12 sm:px-10 md:px-14 md:py-20">
          {/* The same floor grid as the hero hub, gliding towards the viewer. */}
          <div aria-hidden className="wl-cta-floor absolute inset-x-[-25%] bottom-0 -z-10 h-full" />
          <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tight text-balance text-primary-foreground md:text-5xl">
            {t("cta.title")}
          </h2>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-primary-foreground/85">{t("cta.subtitle")}</p>
          <div className="mt-9">
            <ButtonLink href="/contact" variant="inverse">
              {t("menu.cta")}
            </ButtonLink>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/** Site footer. `compact` keeps only the copyright bar (used on one-screen pages). */
export function Footer({ compact = false }: { compact?: boolean }) {
  const { t } = useCopy();
  const copyright = (
    <p className="text-sm text-muted-foreground">
      © 2026 WikiAI. {t("footer.rights")}
    </p>
  );
  if (compact) {
    return (
      <footer className="border-t border-border/70">
        <Container className="py-4">{copyright}</Container>
      </footer>
    );
  }

  const columns = [
    {
      title: t("footer.product"),
      links: [
        { href: "/landing#systems", label: t("menu.systems") },
        { href: "/landing#how", label: t("menu.how") },
        { href: "/landing#pilot", label: t("menu.pilot") },
        { href: "/pricing", label: t("footer.pricing") },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { href: "/about", label: t("footer.about") },
        { href: "/blog", label: t("footer.blog") },
        { href: "/contact", label: t("footer.contact") },
      ],
    },
  ];

  return (
    <footer className="border-t border-border/70">
      <Container className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
        <div className="col-span-2 md:col-span-1">
          <Wordmark />
          <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">{t("footer.tagline")}</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="text-sm font-semibold text-foreground">{col.title}</h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <Container className="border-t border-border/70 py-6">{copyright}</Container>
    </footer>
  );
}
