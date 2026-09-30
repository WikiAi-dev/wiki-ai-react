"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Moon, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopy, useDocumentLang, useHydrated } from "../_lib/copy";
import { ButtonLink, Container } from "./primitives";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-foreground", className)}>
      <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-primary text-[15px] font-bold text-primary-foreground">
        W
      </span>
      WikiAI
    </span>
  );
}

const iconButton =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function Nav() {
  const { t, locale, setLocale } = useCopy();
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  useDocumentLang(locale);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = [
    { href: "#systems", label: t("menu.systems") },
    { href: "#how", label: t("menu.how") },
    { href: "#pilot", label: t("menu.pilot") },
    { href: "#faq", label: t("menu.faq") },
  ];

  const isDark = hydrated && resolvedTheme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");
  const toggleLocale = () => setLocale(locale === "en" ? "ru" : "en");

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <Container className="flex h-16 items-center gap-6">
        <Link href="/landing" aria-label={t("menu.home")} className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <Wordmark />
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Main">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={toggleLocale} className={iconButton} aria-label={t("menu.language")}>
            {locale === "en" ? "RU" : "EN"}
          </button>
          <button type="button" onClick={toggleTheme} className={cn(iconButton, "w-9 px-0")} aria-label={t("menu.theme")}>
            {isDark ? <Sun className="size-[18px]" strokeWidth={1.75} /> : <Moon className="size-[18px]" strokeWidth={1.75} />}
          </button>
          <Link
            href="/login"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring sm:inline-flex"
          >
            {t("menu.signIn")}
          </Link>
          <ButtonLink href="/contact" className="ml-1 hidden h-9 px-4 text-sm sm:inline-flex">
            {t("menu.cta")}
          </ButtonLink>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(iconButton, "w-9 px-0 lg:hidden")}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            aria-label={open ? t("menu.close") : t("menu.open")}
          >
            {open ? <X className="size-5" strokeWidth={1.75} /> : <Menu className="size-5" strokeWidth={1.75} />}
          </button>
        </div>
      </Container>

      <AnimatePresence>
        {open && (
          <motion.div
            id="landing-mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-border/70 bg-background lg:hidden"
          >
            <Container className="flex flex-col gap-1 py-4">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-medium text-foreground hover:bg-muted"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ButtonLink href="/login" variant="secondary">
                  {t("menu.signIn")}
                </ButtonLink>
                <ButtonLink href="/contact">{t("menu.cta")}</ButtonLink>
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
