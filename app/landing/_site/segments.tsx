"use client";

import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { useRef } from "react";
import { useT } from "./locale";

/*
 * Who it is for, after Rauno Freiberg: section cards laid out on a light
 * canvas and moved sideways. Native horizontal scrolling with snap points
 * (swipe, trackpad, the arrow buttons), so the page scroll is never taken over.
 */
export function Segments() {
  const { t } = useT();
  const s = t.segments;
  const rail = useRef<HTMLDivElement>(null);

  const go = (dir: number) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".ws-seg");
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <section id="segments" className="ws-section ws-section--canvas">
      <div className="ws-container ws-segs__head" data-reveal>
        <h2 className="ws-h2">{s.title}</h2>
        <div className="ws-segs__nav">
          <button type="button" className="ws-round ws-round--lg" onClick={() => go(-1)} aria-label={s.prev}>
            <ArrowLeft size={20} strokeWidth={1.75} />
          </button>
          <button type="button" className="ws-round ws-round--lg" onClick={() => go(1)} aria-label={s.next}>
            <ArrowRight size={20} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <div ref={rail} className="ws-segs" tabIndex={0} role="region" aria-label={s.title} data-reveal="stagger">
        {s.items.map((x, i) => (
          <article key={x.id} className="ws-seg" style={{ transitionDelay: `${i * 0.09}s` }}>
            <p className="ws-micro">
              {String(i + 1).padStart(2, "0")} / {String(s.items.length).padStart(2, "0")}
            </p>
            <h3 className="ws-seg__name">{x.tab}</h3>
            <p className="ws-seg__who">{x.who}</p>
            <ul className="ws-seg__does">
              {x.does.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <figure className="ws-seg__qa">
              <p className="ws-seg__q">
                <span className="ws-micro">{x.role}</span>
                {x.question}
              </p>
              <p className="ws-seg__a">{x.answer}</p>
              <figcaption className="ws-seg__src">
                <FileText size={14} strokeWidth={1.5} aria-hidden="true" />
                {x.sources.map((src) => `${src.system}: ${src.doc}`).join("; ")}
              </figcaption>
            </figure>
          </article>
        ))}
      </div>
      <p className="ws-container ws-caption">{s.caption}</p>
    </section>
  );
}
