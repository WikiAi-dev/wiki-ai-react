"use client";

import { Fragment, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { ArrowUp, FileText, RotateCcw, SearchCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopy } from "../_lib/copy";

type Turn = { question: string; answer: string; sources: string[] };
type AskTab = { id: string; label: string; role: string; turns: Turn[] };

const FIRST_LINE_MS = 300;
const LINE_GAP_MS = 900;
/** While nobody has picked a department, the panel moves on to the next one on its own. */
const AUTO_ADVANCE_MS = 8000;

/**
 * Employees from different departments asking WikiAI. Every department's
 * exchange sits in the same grid cell, so the panel is always as tall as the
 * longest one and never changes height. The active one plays in line by line
 * (see .wl-play in landing.css) once the panel is on screen.
 */
export function AskPanel({ className }: { className?: string }) {
  const { t, get } = useCopy();
  const tabs = get<AskTab[]>("how.ask.tabs");
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0);
  const [picked, setPicked] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const started = useInView(ref, { once: true, amount: 0.35 });
  const visible = useInView(ref, { amount: 0.35 });
  const reduce = useReducedMotion();
  const uid = useId();
  const tabId = (i: number) => `${uid}-tab-${i}`;
  const panelId = `${uid}-panel`;

  useEffect(() => {
    if (picked || reduce || !visible) return;
    const id = setInterval(() => setActive((i) => (i + 1) % tabs.length), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [picked, reduce, visible, tabs.length]);

  const select = (i: number) => {
    setPicked(true);
    setActive(i);
  };

  // Arrow keys move between departments, as in any tab list.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (active + step + tabs.length) % tabs.length;
    select(next);
    document.getElementById(tabId(next))?.focus();
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        role="tablist"
        aria-label={t("how.ask.title")}
        onKeyDown={onKeyDown}
        className="flex max-w-full gap-1 self-start overflow-x-auto rounded-full border border-border bg-card p-1 [scrollbar-width:none]"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            id={tabId(i)}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-controls={panelId}
            tabIndex={active === i ? 0 : -1}
            onClick={() => select(i)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              active === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        ref={ref}
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(active)}
        className="mt-5 flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_32px_64px_-32px_var(--wl-shadow)]"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            W
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-foreground">{t("how.ask.assistant")}</p>
            <p className="truncate text-xs text-muted-foreground">{t("how.ask.connected")}</p>
          </div>
          <button
            type="button"
            onClick={() => setRun((r) => r + 1)}
            aria-label={t("how.ask.replay")}
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring motion-reduce:hidden"
          >
            <RotateCcw className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div className="grid flex-1">
          {tabs.map((tab, i) => {
            const on = i === active;
            return (
              <ol
                // A new key restarts the line-by-line entrance: on switching department and on replay.
                key={on ? `${tab.id}-${run}` : tab.id}
                data-started={on && started}
                aria-hidden={!on}
                className={cn("wl-play col-start-1 row-start-1 flex flex-col gap-3 p-3.5 sm:p-5", !on && "invisible")}
              >
                {tab.turns.map((turn, n) => {
                  // Play order: question, the search (first turn only), answer; then the next turn.
                  const q = n === 0 ? 0 : 2 * n + 1;
                  return (
                    <Fragment key={turn.question}>
                      <Line index={q} className="max-w-[88%] self-end">
                        {n === 0 && <p className="text-right text-xs font-medium text-muted-foreground">{tab.role}</p>}
                        <p className="mt-1 rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[14px] leading-snug text-primary-foreground">{turn.question}</p>
                      </Line>
                      {n === 0 && (
                        <Line index={1} className="self-start">
                          <p className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                            <SearchCheck className="size-3.5 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
                            {t("how.ask.status")}
                          </p>
                        </Line>
                      )}
                      <Line index={n === 0 ? 2 : q + 1} className="max-w-[92%] self-start">
                        <div className="rounded-xl border border-primary/25 bg-primary/[0.07] p-3.5">
                          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                            <Sparkles className="size-3.5" strokeWidth={1.75} aria-hidden />
                            WikiAI
                          </p>
                          <p className="mt-1.5 text-[14px] leading-snug text-foreground">{turn.answer}</p>
                          <div className="mt-2 flex flex-col gap-1">
                            {turn.sources.map((source) => (
                              <SourceNote key={source} source={source} className="mt-0" />
                            ))}
                          </div>
                        </div>
                      </Line>
                    </Fragment>
                  );
                })}
              </ol>
            );
          })}
        </div>

        {/* A still picture of the question box, not a real input. */}
        <div aria-hidden className="flex items-center gap-2 border-t border-border p-3 sm:px-5">
          <span className="flex h-10 min-w-0 flex-1 items-center rounded-full border border-border px-4 text-sm text-muted-foreground">
            <span className="truncate">{t("how.ask.placeholder")}</span>
          </span>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <ArrowUp className="size-4" strokeWidth={2} />
          </span>
        </div>
      </div>
    </div>
  );
}

function Line({ index, className, children }: { index: number; className?: string; children: ReactNode }) {
  return (
    <li className={cn("flex flex-col", className)} style={{ "--wl-delay": `${FIRST_LINE_MS + index * LINE_GAP_MS}ms` } as CSSProperties}>
      {children}
    </li>
  );
}

export function SourceNote({ source, className }: { source: string; className?: string }) {
  return (
    <p className={cn("mt-2 flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <FileText className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
      {source}
    </p>
  );
}
