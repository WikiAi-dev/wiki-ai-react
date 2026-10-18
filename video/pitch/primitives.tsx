import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, EASE, LIGHT, fontFamily } from "./theme";

/*
 * Building blocks of the pitch film. Every motion is a function of the
 * current frame, so the Player in the web deck and the rendered MP4 show
 * exactly the same thing.
 */

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** How much faster than real time the builds play: a whole scene settles in 1–3 s. */
export const SPEED = 3;

/**
 * The build clock: the current frame sped up by SPEED. Entrances use it;
 * live details (a call clock, a pulse, sparks on the wires) keep real time
 * through useCurrentFrame.
 */
export const useFrame = () => useCurrentFrame() * SPEED;

/** 0 → 1 between frame `at` and `at + dur`, eased. */
export const prog = (frame: number, at: number, dur = 20) => interpolate(frame, [at, at + dur], [0, 1], { ...clamp, easing: EASE });

export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const ru = (v: number, decimals: number) =>
  v.toLocaleString("ru-RU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** The stage: deep black, one soft key light that keeps drifting, a vignette and film grain. */
export function Stage({ light = LIGHT.cobalt, x = 72, y = 38, children }: { light?: string; x?: number; y?: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, color: C.ink, fontFamily, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 52% 58% at ${x + 4 * Math.sin(frame / 160)}% ${y + 3 * Math.cos(frame / 210)}%, ${light} 0%, transparent 72%)`,
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 115% 95% at 50% 50%, transparent 55%, rgba(0,0,0,0.62) 100%)" }} />
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("presentation/wikiai/grain.png")})`, opacity: 0.06, mixBlendMode: "overlay" }} />
      <AbsoluteFill style={{ scale: interpolate(frame, [0, 900], [1, 1.035], clamp) }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
}

/** Small chapter mark in the corner, so a viewer of the film knows where they are. Appendix scenes pass a label such as "П1". */
export function Chapter({ n, children }: { n: number | string; children: ReactNode }) {
  const frame = useFrame();
  return (
    <div style={{ position: "absolute", left: 140, top: 70, display: "flex", alignItems: "center", gap: 16, fontSize: 22, color: C.dim, opacity: prog(frame, 0, 16) }}>
      <span style={{ width: 28, height: 2, background: C.cobalt }} />
      <span style={{ color: C.soft, fontVariantNumeric: "tabular-nums" }}>{typeof n === "number" ? String(n).padStart(2, "0") : n}</span>
      {children}
    </div>
  );
}

/** A line of type that rises from behind its own baseline and comes into focus. */
export function Line({ at, size = 96, weight = 600, color = C.ink, children, style }: {
  at: number;
  size?: number;
  weight?: number;
  color?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const frame = useFrame();
  const p = prog(frame, at, 24);
  return (
    <div style={{ overflow: "hidden", paddingBottom: size * 0.14, marginBottom: -size * 0.14 }}>
      <div
        style={{
          fontSize: size,
          fontWeight: weight,
          lineHeight: 1.04,
          letterSpacing: "-0.04em",
          color,
          translate: `0 ${(1 - p) * 108}%`,
          filter: `blur(${(1 - p) * 10}px)`,
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Fades up into place at frame `at`. */
export function Up({ at, dist = 26, dur = 22, children, style }: { at: number; dist?: number; dur?: number; children: ReactNode; style?: CSSProperties }) {
  const frame = useFrame();
  const p = prog(frame, at, dur);
  return <div style={{ opacity: p, translate: `0 ${(1 - p) * dist}px`, ...style }}>{children}</div>;
}

/** A number that counts from `from` to `to`, Russian formatting, tabular digits. */
export function Num({ at, to, from = 0, dur = 36, decimals = 0, prefix = "", suffix = "" }: {
  at: number;
  to: number;
  from?: number;
  dur?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const frame = useFrame();
  const v = interpolate(frame, [at, at + dur], [from, to], { ...clamp, easing: EASE });
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{prefix}{ru(v, decimals)}{suffix}</span>;
}

/** Words appear one after another, like speech being transcribed. */
export function Typed({ at, text, every = 2.2 }: { at: number; text: string; every?: number }) {
  const frame = useFrame();
  const words = text.split(" ");
  return (
    <>
      {words.map((w, k) => (
        <span key={k} style={{ opacity: interpolate(frame, [at + k * every, at + k * every + 6], [0, 1], clamp) }}>
          {w}
          {k < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

/** A bar that grows from the left to `pct` of its track. */
export function Bar({ at, pct, color, height = 16, dur = 30 }: { at: number; pct: number; color: string; height?: number; dur?: number }) {
  const frame = useFrame();
  return (
    <div style={{ height, borderRadius: height / 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, borderRadius: height / 2, background: color, scale: `${prog(frame, at, dur)} 1`, transformOrigin: "left" }} />
    </div>
  );
}

/** A product window: dark glass with a title bar. It floats in from depth at `at`. */
export function Win({ at, title, right, live, width, children, style }: {
  at: number;
  title: string;
  right?: ReactNode;
  live?: boolean;
  width: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const frame = useFrame();
  const p = prog(frame, at, 34);
  return (
    <div style={{ position: "absolute", width, perspective: 1800, ...style }}>
      <div
        style={{
          background: C.glass,
          border: `1px solid ${C.glassEdge}`,
          borderRadius: 22,
          boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 40px 120px -30px rgba(0,0,0,0.85), 0 0 90px -40px rgba(91,132,255,0.55)",
          overflow: "hidden",
          opacity: p,
          translate: `${(1 - p) * 60}px ${(1 - p) * 30}px`,
          rotate: `y ${-10 + p * 4}deg`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 26px", borderBottom: `1px solid ${C.glassEdge}`, fontSize: 24, fontWeight: 600 }}>
          {live && <Pulse />}
          {title}
          <span style={{ marginLeft: "auto", fontWeight: 400, color: C.soft, fontVariantNumeric: "tabular-nums" }}>{right}</span>
        </div>
        <div style={{ padding: 26, display: "grid", gap: 18 }}>{children}</div>
      </div>
    </div>
  );
}

/** A live indicator that breathes. */
export function Pulse({ color = C.alarm }: { color?: string }) {
  const frame = useCurrentFrame();
  return <span style={{ width: 12, height: 12, borderRadius: 6, background: color, opacity: 0.55 + 0.45 * Math.cos(frame / 8), flex: "none" }} />;
}

/** Call timer reading `from` seconds at frame 0 and running in real time. */
export function Clock({ from = 0 }: { from?: number }) {
  const frame = useCurrentFrame();
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{mmss(from + frame / 30)}</span>;
}

/** Chat bubble inside a product window. */
export function Msg({ at, who, mine, children }: { at: number; who?: string; mine?: boolean; children: ReactNode }) {
  return (
    <Up at={at} dist={14} dur={16} style={{ justifySelf: mine ? "end" : "start", maxWidth: "88%" }}>
      <div
        style={{
          padding: "14px 18px",
          borderRadius: 18,
          fontSize: 25,
          lineHeight: 1.38,
          background: mine ? "rgba(91,132,255,0.16)" : "rgba(255,255,255,0.06)",
          border: mine ? "1px solid rgba(91,132,255,0.35)" : "1px solid transparent",
        }}
      >
        {who && <div style={{ fontSize: 18, color: C.soft, marginBottom: 4 }}>{who}</div>}
        {children}
      </div>
    </Up>
  );
}

/** A document found in the knowledge base. */
export function Doc({ children }: { children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 19, padding: "7px 12px", borderRadius: 10, border: `1px solid ${C.glassEdge}`, color: C.ink, background: "rgba(255,255,255,0.03)" }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: C.cobalt }} />
      {children}
    </span>
  );
}

/** Caption under a product mock-up, saying what it is. */
export function MockNote({ at, style }: { at: number; style?: CSSProperties }) {
  return <Up at={at} style={{ position: "absolute", fontSize: 18, color: C.dim, ...style }}>Макет интерфейса</Up>;
}

/** A feature line: bold lead and a quieter explanation. */
export function Point({ at, title, text, soon }: { at: number; title: string; text: string; soon?: boolean }) {
  return (
    <Up at={at} style={{ padding: "20px 0", borderTop: `1px solid ${C.rule}` }}>
      <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", color: soon ? C.soft : C.ink }}>{title}</div>
      <div style={{ fontSize: 24, color: soon ? C.dim : C.soft, marginTop: 6 }}>{text}</div>
    </Up>
  );
}
