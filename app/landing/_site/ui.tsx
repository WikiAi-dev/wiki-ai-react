"use client";

import { ArrowRight } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/* ---------- Brand ---------- */

/** WikiAI brand blue, the same in both themes (it is the logo, not a UI accent). */
export const BRAND = "#1E59CD";

/** The WikiAI badge: a square in the brand blue with a geometric W. */
export function MarkPaths() {
  return (
    <>
      <rect width="24" height="24" rx="5" fill={BRAND} />
      <path fill="#fff" d="M13.87 17 16.18 17 19.23 7 16.97 7 14.86 13.93 12 7.56 9.14 13.93 7.03 7 4.77 7 7.82 17 10.13 17 12 12.84Z" />
    </>
  );
}

export function Mark({ className = "ws-mark" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <MarkPaths />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="ws-wordmark">
      <Mark />
      <span>
        WikiAI<span className="ws-wordmark__tld">.by</span>
      </span>
    </span>
  );
}

/** The webdad.by button: a pill with the arrow in its own circle. */
export function Pill({ href, children, external, variant = "accent" }: { href: string; children: ReactNode; external?: boolean; variant?: "accent" | "ink" }) {
  return (
    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`ws-cta ws-cta--${variant}`}>
      <span>{children}</span>
      <span className="ws-cta__dot" aria-hidden="true">
        <ArrowRight size={16} strokeWidth={2.25} />
      </span>
    </a>
  );
}

/** Lusion's registration marks: small crosses at the corners of a frame. */
export function Crosses() {
  return (
    <>
      <span className="ws-cross ws-cross--tl" aria-hidden="true" />
      <span className="ws-cross ws-cross--tr" aria-hidden="true" />
      <span className="ws-cross ws-cross--bl" aria-hidden="true" />
      <span className="ws-cross ws-cross--br" aria-hidden="true" />
    </>
  );
}

/* ---------- Theme ---------- */

type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });
const THEME_KEY = "wikiai-landing-theme";

/** The landing keeps its own theme, light by default (the app's dark default does not apply here). */
export function useLandingTheme() {
  return useContext(ThemeContext);
}

/* ---------- Root ---------- */

/**
 * The page root: holds the theme, marks the page as scripted and adds `is-in`
 * to [data-reveal] blocks as they enter the viewport. Without JS, or with
 * reduced motion, everything is simply shown.
 */
export function RevealRoot({ children, className }: { children: ReactNode; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a client-only preference
      if (localStorage.getItem(THEME_KEY) === "dark") setTheme("dark");
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    root.classList.add("js");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.04 },
    );
    items.forEach((el) => io.observe(el));
    // Blocks mounted later (after a language switch) are shown at once.
    const mo = new MutationObserver((records) => {
      for (const r of records)
        r.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          const found = n.matches("[data-reveal]") ? [n] : Array.from(n.querySelectorAll<HTMLElement>("[data-reveal]"));
          found.forEach((el) => el.classList.add("is-in"));
        });
    });
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove("js");
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <div ref={ref} className={className} data-theme={theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
