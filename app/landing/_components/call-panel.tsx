"use client";

import { useRef, useState, type CSSProperties } from "react";
import { useInView } from "framer-motion";
import { ArrowRightLeft, FileText, PhoneIncoming, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopy } from "../_lib/copy";

export type CallMode = "operator" | "bot";

export type CallLineData =
  | { type: "customer" | "operator"; text: string }
  | { type: "hint"; title: string; text: string; source: string }
  | { type: "bot"; text: string; source: string }
  | { type: "handoff" };

const FIRST_LINE_MS = 300;
const LINE_GAP_MS = 1100;

/**
 * A live call: the customer's questions and either WikiAI's prompts to the
 * operator or WikiAI answering by voice. The lines play in with CSS delays once
 * the panel scrolls into view (see .wl-call in landing.css). Every line is
 * always in the DOM, so the panel never changes height. Switching mode or
 * pressing replay remounts the list, which replays it.
 */
export function CallPanel({ mode }: { mode: CallMode }) {
  const { t, get } = useCopy();
  const lines = get<CallLineData[]>(`call.${mode}Lines`);
  const [run, setRun] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useInView(ref, { once: true, amount: 0.35 });

  return (
    <div ref={ref} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_32px_64px_-32px_var(--wl-shadow)]">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
        <span className="hidden size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary sm:grid">
          <PhoneIncoming className="size-4" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium text-foreground">{t("call.incoming")}</p>
          <p className="hidden font-mono text-xs text-muted-foreground sm:block">+375 29 ••• •• 18</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-[var(--live)]">
          <span className="wl-live-dot size-1.5 rounded-full bg-[var(--live)]" aria-hidden />
          {t("call.live")}
        </span>
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          aria-label={t("call.replay")}
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring motion-reduce:hidden"
        >
          <RotateCcw className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <ol key={`${mode}-${run}`} data-started={started} className="wl-call flex flex-col gap-3 p-3.5 sm:p-5">
        {lines.map((line, i) => (
          <li
            key={i}
            className="flex flex-col"
            style={{ "--wl-delay": `${FIRST_LINE_MS + i * LINE_GAP_MS}ms` } as CSSProperties}
          >
            <CallLine line={line} />
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SourceNote({ source }: { source: string }) {
  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
      <FileText className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
      {source}
    </p>
  );
}

function CallLine({ line }: { line: CallLineData }) {
  const { t } = useCopy();

  if (line.type === "handoff") {
    return (
      <p className="flex items-center gap-2 self-center rounded-full bg-muted px-3.5 py-1.5 text-center text-xs font-medium text-foreground">
        <ArrowRightLeft className="size-3.5 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
        {t("call.handoff")}
      </p>
    );
  }

  if (line.type === "hint") {
    return (
      <div className="rounded-xl border border-primary/25 bg-primary/[0.07] p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" strokeWidth={1.75} aria-hidden />
          {t("call.hint")}: {line.title}
        </p>
        <p className="mt-1.5 text-[14px] leading-snug text-foreground">{line.text}</p>
        <SourceNote source={line.source} />
      </div>
    );
  }

  const fromCustomer = line.type === "customer";
  return (
    <div className={cn("max-w-[88%]", fromCustomer ? "self-start" : "self-end")}>
      <p className={cn("text-xs font-medium", line.type === "bot" ? "text-right text-primary" : "text-muted-foreground", line.type === "operator" && "text-right")}>
        {t(`call.${line.type}`)}
      </p>
      <div
        className={cn(
          "mt-1 rounded-xl px-3.5 py-2.5",
          fromCustomer ? "bg-muted" : line.type === "bot" ? "border border-primary/25 bg-primary/[0.07]" : "border border-border bg-card",
        )}
      >
        <p className="text-[14px] leading-snug text-foreground">{line.text}</p>
        {line.type === "bot" && <SourceNote source={line.source} />}
      </div>
    </div>
  );
}
