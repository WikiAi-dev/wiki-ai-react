"use client";

import { Fragment, useMemo, useRef } from "react";
import { useT } from "./locale";
import { enter, useScrub } from "./scroll";

/*
 * Olha Lazarieva's kinetic manifesto, turned into the product's idea: the
 * letters start scattered (like company knowledge) and settle into the
 * sentence in a wave as the section scrolls in (like WikiAI gathering it),
 * then the words are read from grey to ink. Scroll position drives it, so
 * scrolling back scatters them again. Static under reduced motion.
 */
export function Manifesto() {
  const { t } = useT();
  const m = t.manifesto;
  const root = useRef<HTMLElement>(null);

  // Deterministic scatter per letter: offset, rotation.
  const words = useMemo(() => {
    const hash = (n: number) => {
      const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    const out: { ch: string; dx: number; dy: number; r: number }[][] = [];
    let k = 0;
    for (const w of m.text.split(" ")) {
      const letters = [];
      for (const ch of Array.from(w)) {
        letters.push({ ch, dx: (hash(k * 3) - 0.5) * 260, dy: (hash(k * 3 + 1) - 0.5) * 220, r: (hash(k * 3 + 2) - 0.5) * 140 });
        k += 1;
      }
      out.push(letters);
    }
    return out;
  }, [m.text]);

  // Letters assemble in a wave from the first to the last, then the words are
  // "read": they turn from grey to ink, the brand word to the accent.
  // Letters and words are looked up once per text, not on every frame.
  const cache = useRef<{ text: string; spans: HTMLSpanElement[]; words: HTMLSpanElement[]; data: { dx: number; dy: number; r: number }[] } | null>(null);
  useScrub(root, enter(0.95, 0.12), (p) => {
    const el = root.current;
    if (!el) return;
    if (!cache.current || cache.current.text !== m.text) {
      cache.current = {
        text: m.text,
        spans: Array.from(el.querySelectorAll<HTMLSpanElement>(".ws-manifesto__ch")),
        words: Array.from(el.querySelectorAll<HTMLSpanElement>(".ws-manifesto__word")),
        data: words.flat(),
      };
    }
    const { spans, words: wordEls, data } = cache.current;
    const n = Math.max(1, spans.length);
    const a = Math.min(1, p / 0.62);
    spans.forEach((s, i) => {
      const d = data[i];
      if (!d) return;
      const t = Math.min(1, Math.max(0, (a - (i / n) * 0.5) / 0.5));
      const k = Math.pow(1 - t, 3);
      s.style.transform = k < 0.002 ? "none" : `translate3d(${(d.dx * k).toFixed(1)}px,${(d.dy * k).toFixed(1)}px,0) rotate(${(d.r * k).toFixed(1)}deg)`;
      s.style.opacity = String(0.12 + 0.88 * Math.min(1, t * 1.4));
    });
    const read = Math.min(1, Math.max(0, (p - 0.42) / 0.5)) * wordEls.length;
    wordEls.forEach((w, i) => w.classList.toggle("is-read", i < read));
  }, 0.22);

  return (
    <section ref={root} className="ws-section ws-manifesto" aria-label={m.label}>
      <div className="ws-container">
        <p className="ws-micro ws-manifesto__label">{m.label}</p>
        <p className="ws-manifesto__text" aria-label={m.text}>
          {words.map((w, wi) => {
            const isBrand = w.map((l) => l.ch).join("").startsWith("WikiAI");
            // The space sits between the word boxes: inside an inline-block it would collapse.
            return (
              <Fragment key={wi}>
                <span className={isBrand ? "ws-manifesto__word is-brand" : "ws-manifesto__word"} aria-hidden="true">
                  {w.map((l, li) => (
                    <span key={li} className="ws-manifesto__ch">
                      {l.ch}
                    </span>
                  ))}
                </span>
                {wi < words.length - 1 ? " " : null}
              </Fragment>
            );
          })}
        </p>
      </div>
    </section>
  );
}
