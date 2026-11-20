"use client";

import { Menu, Moon, Sun, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useT } from "./locale";
import { useLandingTheme, Wordmark } from "./ui";

/*
 * The webdad.by navigation: a floating pill over the page. At the very top
 * it is transparent; once the page scrolls it gets a surface and a shadow.
 * Phones open a sheet with the links.
 */
/** `base` prefixes the section links ("/landing" on other pages); `ctaHref` is where the pill goes. */
export function Nav({ base = "", ctaHref = "#contact" }: { base?: string; ctaHref?: string }) {
  const { t, locale, setLocale } = useT();
  const { theme, toggle } = useLandingTheme();
  const bar = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    // A sentinel at the top of the page: when it leaves the viewport, the pill gets its surface.
    const sentinel = document.createElement("div");
    sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none";
    document.body.prepend(sentinel);
    const io = new IntersectionObserver(([e]) => {
      el.dataset.scrolled = String(!e.isIntersecting);
    });
    io.observe(sentinel);
    return () => {
      io.disconnect();
      sentinel.remove();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header ref={bar} className="ws-nav" data-scrolled="false">
      <div className="ws-nav__pill">
        <Link href="/landing" aria-label={t.nav.home} className="ws-nav__home">
          <Wordmark />
        </Link>
        <nav aria-label={t.nav.menu} className="ws-nav__links">
          {t.nav.links.map((l) => (
            <a key={l.href} href={base + l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ws-nav__tools">
          <button type="button" className="ws-round ws-round--text" onClick={() => setLocale(locale === "ru" ? "en" : "ru")} aria-label={t.nav.language}>
            {t.nav.languageShort}
          </button>
          <button type="button" className="ws-round" onClick={toggle} aria-label={theme === "dark" ? t.nav.toLight : t.nav.toDark}>
            {theme === "dark" ? <Sun size={17} strokeWidth={1.75} /> : <Moon size={17} strokeWidth={1.75} />}
          </button>
          <Link href="/login" className="ws-nav__signin">
            {t.nav.signIn}
          </Link>
          <a href={ctaHref} className="ws-nav__cta">
            {t.nav.cta}
          </a>
          <button type="button" className="ws-round ws-nav__burger" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="ws-sheet" aria-label={open ? t.nav.close : t.nav.menu}>
            {open ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="ws-sheet" className="ws-sheet" aria-label={t.nav.menu}>
          {t.nav.links.map((l) => (
            <a key={l.href} href={base + l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            {t.nav.signIn}
          </Link>
          <a href={ctaHref} className="ws-nav__cta" onClick={() => setOpen(false)}>
            {t.nav.cta}
          </a>
        </nav>
      )}
    </header>
  );
}
