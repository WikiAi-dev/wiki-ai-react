"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useTheme } from "next-themes";
import { ChevronLeft, ChevronRight, Moon, NotebookText, Scale, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { SLIDES, SlideActive } from "./slides";

const pad = (n: number) => String(n).padStart(2, "0");
const SLIDE_EVENT = "tp-slide";

/*
 * The URL hash holds the open slide (#3 is the third), so a link or a reload
 * lands on the same slide. Moving between slides replaces the hash rather than
 * adding history entries.
 */
function readSlide() {
  const n = parseInt(window.location.hash.slice(1), 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(SLIDES.length - 1, n - 1)) : 0;
}

function subscribeSlide(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener(SLIDE_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener(SLIDE_EVENT, onChange);
  };
}

function go(n: number) {
  const next = Math.max(0, Math.min(SLIDES.length - 1, n));
  window.history.replaceState(window.history.state, "", `#${next + 1}`);
  window.dispatchEvent(new Event(SLIDE_EVENT));
}

const noopSubscribe = () => () => {};

export function TelephonyDeck() {
  const index = useSyncExternalStore(subscribeSlide, readSlide, () => 0);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [scale, setScale] = useState(0.5);
  const viewportRef = useRef<HTMLElement>(null);
  const touchX = useRef<number | null>(null);
  const { resolvedTheme, setTheme } = useTheme();

  // Scale the 1280x720 stage to whatever space the viewport really has.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const fit = () => {
      const { clientWidth: w, clientHeight: h } = viewport;
      if (w && h) setScale(Math.min(w / 1280, h / 720) * 0.96);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest("input, textarea")) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(readSlide() + 1);
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(readSlide() - 1);
      } else if (e.key === "Home") go(0);
      else if (e.key === "End") go(SLIDES.length - 1);
      else if (["n", "N", "т", "Т"].includes(e.key)) setNotesOpen((open) => !open);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const isDark = hydrated && resolvedTheme === "dark";
  const slide = SLIDES[index];

  return (
    <div className="tp">
      <main
        ref={viewportRef}
        className="viewport"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const x0 = touchX.current;
          touchX.current = null;
          if (x0 === null || window.innerWidth < 820) return;
          const dx = e.changedTouches[0].clientX - x0;
          if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        <div className="stage" style={{ "--s": scale.toFixed(4) } as CSSProperties}>
          {SLIDES.map((s, k) => (
            <section key={k} className={cn("slide", s.className, k === index && "is-active")}>
              <SlideActive.Provider value={k === index}>{s.body}</SlideActive.Provider>
            </section>
          ))}
        </div>
      </main>

      {notesOpen && (
        <aside className="notes" aria-live="polite">
          <div className="t">{slide.time}</div>
          <div>{slide.note}</div>
        </aside>
      )}

      <nav className="nav" aria-label="Слайды">
        <button type="button" aria-label="Назад" onClick={() => go(index - 1)}>
          <ChevronLeft />
        </button>
        <span className="count">
          {pad(index + 1)} / {pad(SLIDES.length)}
        </span>
        <button type="button" aria-label="Вперёд" onClick={() => go(index + 1)}>
          <ChevronRight />
        </button>
        <div className="dots">
          {SLIDES.map((_, k) => (
            <button
              key={k}
              type="button"
              aria-label={`Слайд ${k + 1}`}
              aria-current={k === index}
              className={cn(k === index && "on")}
              onClick={() => go(k)}
            />
          ))}
        </div>
        <a className="navlink" href="/presentation/legal" target="_blank" rel="noopener noreferrer"><Scale />Правовые вопросы</a>
        <span className="hint">← → · N — заметки</span>
        <button
          type="button"
          aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <Sun /> : <Moon />}
        </button>
        <button type="button" aria-pressed={notesOpen} onClick={() => setNotesOpen((open) => !open)}>
          <NotebookText />
          Заметки
        </button>
      </nav>
    </div>
  );
}
