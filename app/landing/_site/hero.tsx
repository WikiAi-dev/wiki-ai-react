"use client";

import { ArrowDown } from "lucide-react";
import { useEffect, useRef } from "react";
import { useT } from "./locale";
import { leave, useScrub } from "./scroll";
import { Crosses, Pill } from "./ui";

/*
 * Hero, built from the afanasieff.by moodboard but not from afanasieff.by:
 *  - a thin frame with registration crosses (Lusion) around a breathing
 *    field of grain particles (Keita Yamada);
 *  - the brand word set edge to edge with a live object living in the gap
 *    between its letters (Nothin'): here a turning cloud of vectors;
 *  - a rotating ring of text as the way down (Olha Lazarieva).
 * In the grain, a "question" now and then lights its nearest points: that is
 * what WikiAI's vector search does.
 */
export function Hero() {
  const { t } = useT();
  const h = t.hero;
  const root = useRef<HTMLElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const wiki = useRef<HTMLSpanElement>(null);
  const ai = useRef<HTMLSpanElement>(null);
  const gap = useRef<HTMLSpanElement>(null);
  const grain = useRef<HTMLDivElement>(null);

  // On the way out the word comes apart: "Wiki" and "AI" drift to the sides,
  // the vector cloud between them grows, the copy lifts away, the grain fades.
  useScrub(root, leave(0.8), (p) => {
    const e = p * p * (3 - 2 * p);
    if (wiki.current) wiki.current.style.transform = `translate3d(${(-e * 16).toFixed(2)}vw,0,0)`;
    if (ai.current) ai.current.style.transform = `translate3d(${(e * 16).toFixed(2)}vw,0,0)`;
    if (gap.current) gap.current.style.transform = `scale(${(1 + e * 0.85).toFixed(3)}) rotate(${(e * 40).toFixed(1)}deg)`;
    if (copy.current) {
      copy.current.style.transform = `translate3d(0,${(-e * 70).toFixed(1)}px,0)`;
      copy.current.style.opacity = String(Math.max(0, 1 - e * 1.6));
    }
    if (grain.current) grain.current.style.opacity = String(1 - e * 0.75);
  }, 0.22);

  return (
    <section id="top" ref={root} className="ws-hero">
      <div className="ws-frame">
        <Crosses />
        <div ref={grain} className="ws-grain-wrap">
          <GrainField />
        </div>
        <div className="ws-frame__top">
          <p className="ws-micro">{h.cornerTop}</p>
          <p className="ws-micro ws-micro--right">{h.cornerBottom}</p>
        </div>
        <div className="ws-hero__body" ref={copy}>
          <div className="ws-hero__copy">
            <h1 className="ws-hero__title hero-in" style={{ animationDelay: "0.1s" }}>
              {h.title}
            </h1>
            <p className="ws-hero__lead hero-in" style={{ animationDelay: "0.25s" }}>
              {h.lead}
            </p>
            <div className="ws-hero__actions hero-in" style={{ animationDelay: "0.4s" }}>
              <Pill href="#contact">{t.nav.cta}</Pill>
            </div>
          </div>
          <TextRing text={h.ring} href="#how" label={h.secondary} />
        </div>
        <p className="ws-giant" aria-label="WikiAI">
          <span ref={wiki} className="ws-giant__part" aria-hidden="true">
            Wiki
          </span>
          <span className="ws-giant__gap" aria-hidden="true">
            <span ref={gap} className="ws-giant__orb">
              <VectorCluster />
            </span>
          </span>
          <span ref={ai} className="ws-giant__part" aria-hidden="true">
            AI
          </span>
        </p>
      </div>
    </section>
  );
}

/** Olha Lazarieva's ring of text, slowly turning, with the way down in the middle. */
function TextRing({ text, href, label }: { text: string; href: string; label: string }) {
  return (
    <a href={href} className="ws-ring" aria-label={label}>
      <svg viewBox="0 0 120 120" className="ws-ring__text" aria-hidden="true">
        <defs>
          <path id="ws-ring-path" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1 -92 0" />
        </defs>
        <text>
          <textPath href="#ws-ring-path" textLength="288">
            {text}
          </textPath>
        </text>
      </svg>
      <span className="ws-ring__core">
        <ArrowDown size={22} strokeWidth={1.75} />
      </span>
    </a>
  );
}

function readVar(el: Element, name: string, fallback: string) {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

/** Keita Yamada's breathing grain, with vector-search pulses in the accent. */
function GrainField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2;
    // A soft blob of grain, denser at its centre, sitting right of the copy.
    const N = 1900;
    const pts = Array.from({ length: N }, () => ({ x: gauss() * 0.9, y: gauss() * 0.75, ph: rnd() * Math.PI * 2, sp: 0.4 + rnd() }));

    let colors = { fg: "#121316", accent: "#1e59cd" };
    const read = () => {
      colors = { fg: readVar(canvas, "--fg", colors.fg), accent: readVar(canvas, "--accent", colors.accent) };
    };
    read();

    let w = 1;
    let h = 1;
    let dpr = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
    };
    resize();

    // One question every 3.4 s; its nearest grains light up for a moment.
    const period = 3400;
    let qIndex = -1;
    let hits: number[] = [];
    const pickQuery = (k: number) => {
      const i = Math.floor(((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1 * N);
      const p = pts[i];
      hits = pts
        .map((o, j) => [j, (o.x - p.x) ** 2 + (o.y - p.y) ** 2] as const)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 9)
        .map(([j]) => j);
      qIndex = k;
    };

    const draw = (time: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const desktop = w > 900;
      // Phones: the grain sits low, behind the brand word, clear of the copy.
      const cx = desktop ? w * 0.68 : w * 0.5;
      const cy = desktop ? h * 0.44 : h * 0.84;
      const S = Math.min(w, h) * (desktop ? 0.62 : 0.5);
      const breath = 1 + Math.sin(time * 0.0006) * 0.04;
      ctx.fillStyle = colors.fg;
      for (let i = 0; i < N; i++) {
        const p = pts[i];
        const jx = Math.sin(time * 0.0007 * p.sp + p.ph) * 0.012;
        const jy = Math.cos(time * 0.0006 * p.sp + p.ph) * 0.012;
        const x = cx + (p.x + jx) * S * breath;
        const y = cy + (p.y + jy) * S * breath;
        const r2 = p.x * p.x + p.y * p.y;
        ctx.globalAlpha = Math.max(0.05, 0.42 - r2 * 0.32);
        ctx.fillRect(x, y, 1.3, 1.3);
      }
      const k = Math.floor(time / period);
      if (k !== qIndex) pickQuery(k);
      const phase = (time % period) / period;
      const on = phase > 0.12 && phase < 0.7 ? 1 : phase >= 0.7 && phase < 0.85 ? 1 - (phase - 0.7) / 0.15 : 0;
      if (on > 0 && hits.length) {
        const q = pts[hits[0]];
        const qx = cx + q.x * S * breath;
        const qy = cy + q.y * S * breath;
        ctx.globalAlpha = on;
        ctx.fillStyle = colors.accent;
        for (const j of hits) {
          const p = pts[j];
          ctx.fillRect(cx + p.x * S * breath - 2, cy + p.y * S * breath - 2, 4, 4);
        }
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(qx, qy, 10 + Math.min(1, phase / 0.3) * 26, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    let raf = 0;
    let visible = false;
    const loop = (time: number) => {
      draw(time);
      if (visible) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !reduce;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
      else draw(1500);
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    ro.observe(canvas);
    const mo = new MutationObserver(() => {
      read();
      draw(performance.now());
    });
    const themeRoot = canvas.closest(".ws");
    if (themeRoot) mo.observe(themeRoot, { attributes: true, attributeFilter: ["data-theme"] });
    draw(1500);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="ws-grain" aria-hidden="true" />;
}

/** The object between the letters: a small turning sphere of vectors in the accent. */
function VectorCluster() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const N = 220;
    const pts = Array.from({ length: N }, (_, i) => {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      return { x: Math.cos(th) * r, y, z: Math.sin(th) * r };
    });
    let accent = "#1e59cd";
    let fg = "#121316";
    const read = () => {
      accent = readVar(canvas, "--accent", accent);
      fg = readVar(canvas, "--fg", fg);
    };
    read();
    let size = 1;
    let dpr = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = r.width;
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    resize();
    const draw = (time: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const R = size * 0.4;
      const c = size / 2;
      const a = time * 0.0005;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const tilt = 0.45;
      for (let i = 0; i < N; i++) {
        const p = pts[i];
        const x1 = p.x * ca - p.z * sa;
        const z1 = p.x * sa + p.z * ca;
        const y1 = p.y * Math.cos(tilt) - z1 * Math.sin(tilt);
        const z2 = p.y * Math.sin(tilt) + z1 * Math.cos(tilt);
        const s = 2.4 / (2.4 - z2);
        const depth = (z2 + 1) / 2;
        const d = Math.max(1, size * 0.018) * s;
        ctx.globalAlpha = 0.25 + depth * 0.75;
        ctx.fillStyle = i % 9 === 0 ? fg : accent;
        ctx.fillRect(c + x1 * R * s - d / 2, c + y1 * R * s - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
    };
    let raf = 0;
    let visible = false;
    const loop = (time: number) => {
      draw(time);
      if (visible) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !reduce;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
      else draw(900);
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    ro.observe(canvas);
    const mo = new MutationObserver(read);
    const themeRoot = canvas.closest(".ws");
    if (themeRoot) mo.observe(themeRoot, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="ws-giant__cluster" />;
}
