"use client";

import { ArrowUpRight, Check, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { useT } from "./locale";
import { enter, scrollVelocity, through, useCountUp, useScrub } from "./scroll";
import { Crosses, Pill } from "./ui";

/* "Done by hand / What happens instead", the webdad.by table. */
export function Swap() {
  const { t } = useT();
  const s = t.swap;
  return (
    <section className="ws-section">
      <div className="ws-container ws-swap">
        <div className="ws-swap__head" data-reveal>
          <h2 className="ws-h2">{s.title}</h2>
          <p className="ws-lead">{s.lead}</p>
          <p className="ws-swap__note">{s.note}</p>
        </div>
        <div className="ws-swap__table" data-reveal>
          <div className="ws-swap__cols" aria-hidden="true">
            <span>{s.before}</span>
            <span>{s.after}</span>
          </div>
          {s.rows.map((r) => (
            <SwapRow key={r.who} {...r} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* As a row scrolls up, "before" is struck through and "instead" slides in. */
function SwapRow({ who, before, after, detail }: { who: string; before: string; after: string; detail: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrub(ref, enter(0.88, 0.5), (p) => ref.current?.style.setProperty("--p", p.toFixed(3)));
  return (
    <div ref={ref} className="ws-swap__row">
      <div>
        <p className="ws-swap__who">{who}</p>
        <p className="ws-swap__before">
          <span>{before}</span>
        </p>
      </div>
      <div className="ws-swap__instead">
        <p className="ws-swap__after">{after}</p>
        <p className="ws-swap__detail">{detail}</p>
      </div>
    </div>
  );
}

/* Three steps in Linear's quiet columns, each with a small live picture. */
export function How() {
  const { t, locale } = useT();
  const h = t.how;
  const ru = locale === "ru";
  const pictures = [
    <PicConnect key="c" names={t.integrations.items.slice(0, 4).map((x) => x.name)} />,
    <PicVectors key="v" />,
    <PicAnswer key="a" q={ru ? "Можно сдать товар?" : "Can I return it?"} a={ru ? "Да, 14 дней с чеком" : "Yes, 14 days with a receipt"} time={ru ? "0,86 с" : "0.86 s"} />,
  ];
  return (
    <section id="how" className="ws-section">
      <div className="ws-container">
        <h2 className="ws-h2" data-reveal>
          {h.title}
        </h2>
        <ol className="ws-how" data-reveal="stagger">
          {h.items.map((x, i) => (
            <li key={i} style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="ws-how__pic">{pictures[i]}</div>
              <p className="ws-how__n">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="ws-h3">{x.title}</h3>
              <p className="ws-body">{x.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function PicConnect({ names }: { names: string[] }) {
  return (
    <div className="pic-connect" aria-hidden="true">
      {names.map((x, i) => (
        <span key={x} style={{ animationDelay: `${i * 0.6}s` }}>
          {x}
        </span>
      ))}
    </div>
  );
}

function PicVectors() {
  // A small cluster: grey records, three blue neighbours of the question.
  const dots = Array.from({ length: 46 }, (_, i) => {
    const a = i * 2.39996;
    const r = Math.sqrt((i + 0.5) / 46) * 58;
    // Rounded so the server and the browser render identical numbers.
    const round = (v: number) => Math.round(v * 10) / 10;
    return { x: round(110 + Math.cos(a) * r * 1.3), y: round(70 + Math.sin(a) * r * 0.75), hit: i === 3 || i === 11 || i === 19 };
  });
  return (
    <svg viewBox="0 0 220 140" className="pic-vectors" aria-hidden="true">
      {dots.map((d, i) => (
        <rect key={i} x={d.x - 2} y={d.y - 2} width={4} height={4} className={d.hit ? "is-hit" : ""} />
      ))}
      <circle cx={dots[3].x} cy={dots[3].y} r={18} className="pic-vectors__ring" />
    </svg>
  );
}

function PicAnswer({ q, a, time }: { q: string; a: string; time: string }) {
  return (
    <div className="pic-answer" aria-hidden="true">
      <span className="pic-answer__q">{q}</span>
      <span className="pic-answer__a">{a}</span>
      <span className="pic-answer__t">{time}</span>
    </div>
  );
}

/* Measured speed over Antoine Wodniack's field of wave lines. */
export function Speed() {
  const { t } = useT();
  const s = t.speed;
  return (
    <section id="speed" className="ws-speed">
      <WaveLines />
      <div className="ws-container ws-speed__inner">
        <div data-reveal>
          <h2 className="ws-h2">{s.title}</h2>
          <p className="ws-lead">{s.lead}</p>
        </div>
        <dl className="ws-speed__metrics" data-reveal>
          {s.metrics.map((m) => (
            <div key={m.label}>
              <dt>{m.label}</dt>
              <dd>
                <CountUp value={m.value} />
                {m.unit && <span>{m.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
        <p className="ws-micro" data-reveal>
          {s.note}
        </p>
      </div>
    </section>
  );
}

/** A number from the copy ("860", "1,2", "2 490", "2,490") that counts up once it is seen. */
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { locale } = useT();
  let v = value.replace(/[\s\u00a0]/g, "");
  v = /^\d{1,3}(,\d{3})+$/.test(v) ? v.replace(/,/g, "") : v.replace(",", ".");
  const num = Number(v);
  const decimals = v.includes(".") ? v.split(".")[1].length : 0;
  const fmt = (x: number) =>
    Number.isFinite(num) ? x.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : value;
  useCountUp(ref, Number.isFinite(num) ? num : 0, fmt);
  return <span ref={ref}>{value}</span>;
}

function WaveLines() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let accent = "#1e59cd";
    const read = () => {
      accent = getComputedStyle(canvas).getPropertyValue("--accent").trim() || accent;
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
    const LINES = 34;
    let energy = 0;
    const draw = (time: number) => {
      // Scrolling stirs the lines: the faster the page moves, the taller the wave.
      energy += (Math.min(3, Math.abs(scrollVelocity()) / 12) - energy) * 0.08;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      const tt = time * 0.0004;
      // A voice-like bump travels along the lines, the way a reply goes out.
      const bump = ((time * 0.00012) % 1.4) - 0.2;
      for (let l = 0; l < LINES; l++) {
        const base = h * 0.18 + (l / (LINES - 1)) * h * 0.78;
        ctx.globalAlpha = 0.1 + (l / LINES) * 0.32;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const u = x / w;
          const env = Math.exp(-((u - bump) ** 2) / 0.012);
          const y =
            base +
            Math.sin(u * 9 + tt + l * 0.3) * 6 +
            Math.sin(u * 23 - tt * 1.6 + l * 0.5) * 3 * env * 3 -
            env * 26 * (1 + energy) * Math.sin(l * 0.4 + tt) +
            Math.sin(u * 14 + tt * 3 + l * 0.7) * 4 * energy;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
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
      else draw(2000);
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
    draw(2000);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
    };
  }, []);
  return <canvas ref={ref} className="ws-speed__waves" aria-hidden="true" />;
}

/* One customer, framed with registration crosses. */
export function Client() {
  const { t } = useT();
  const c = t.client;
  const box = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLAnchorElement>(null);
  useScrub(box, through(0.7), (p) => {
    if (name.current) name.current.style.transform = `translate3d(${((0.5 - p) * 9).toFixed(2)}%,0,0)`;
  });
  return (
    <section className="ws-section">
      <div className="ws-container">
        <div ref={box} className="ws-case" data-reveal>
          <Crosses />
          <p className="ws-micro">{c.eyebrow}</p>
          <a ref={name} className="ws-case__name" href="https://belinnovation.by" target="_blank" rel="noopener noreferrer">
            {c.name}
            <ArrowUpRight className="ws-case__arrow" strokeWidth={1.5} aria-hidden="true" />
          </a>
          <div className="ws-case__grid">
            <p className="ws-case__sector">{c.sector}</p>
            <div>
              <p className="ws-case__text">{c.text}</p>
              <ul className="ws-chips">
                {c.tags.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* The free pilot on the webdad.by grid panel with a corner glow. */
export function Pilot() {
  const { t } = useT();
  const p = t.pilot;
  return (
    <section id="pilot" className="ws-section">
      <div className="ws-container">
        <div className="ws-offer" data-reveal>
          <div className="ws-offer__copy">
            <h2 className="ws-h2">{p.title}</h2>
            <p className="ws-lead">{p.lead}</p>
            <Pill href="#contact">{t.nav.cta}</Pill>
          </div>
          <ol className="ws-offer__card">
            {p.steps.map((s, i) => (
              <li key={i}>
                <span className="ws-offer__n">{i + 1}</span>
                <div>
                  <p className="ws-offer__when">{s.when}</p>
                  <h3 className="ws-h3">{s.title}</h3>
                  <p className="ws-body">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* Prices from the pitch deck: plans in quiet columns, modules as arrow rows. */
export function Pricing() {
  const { t } = useT();
  const p = t.pricing;
  return (
    <section id="pricing" className="ws-section">
      <div className="ws-container">
        <div className="ws-head" data-reveal>
          <h2 className="ws-h2">{p.title}</h2>
          <p className="ws-lead">{p.lead}</p>
        </div>
        <p className="ws-micro" data-reveal>
          {p.coreName}
        </p>
        <div className="ws-plans" data-reveal="stagger">
          {p.plans.map((x, i) => (
            <div key={x.name} className="ws-plan" style={{ transitionDelay: `${i * 0.08}s` }}>
              <p className="ws-plan__name">{x.name}</p>
              <p className="ws-plan__price">
                <CountUp value={x.price} />
                <span>{p.perMonth}</span>
              </p>
              <p className="ws-plan__inc">
                <Check size={16} strokeWidth={2} aria-hidden="true" />
                {x.includes}
              </p>
            </div>
          ))}
        </div>
        <p className="ws-plans__note" data-reveal>
          {p.coreNote}
        </p>
        <div className="ws-modules" data-reveal>
          <p className="ws-micro">{p.modulesTitle}</p>
          <ul>
            {p.modules.map((m) => (
              <li key={m.name}>
                <a href="#contact">
                  <span className="ws-modules__name">{m.name}</span>
                  <span className="ws-modules__note">{m.note}</span>
                  <span className="ws-modules__price">
                    {m.price} <span>{m.unit}</span>
                  </span>
                  <ArrowUpRight className="ws-modules__arrow" size={18} strokeWidth={1.75} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
          <p className="ws-modules__setup">
            <b>{p.setupTitle}.</b> {p.setup}
          </p>
        </div>
      </div>
    </section>
  );
}

/* Where the data lives and who sees it. */
export function Data() {
  const { t } = useT();
  const d = t.data;
  return (
    <section id="data" className="ws-section">
      <div className="ws-container">
        <h2 className="ws-h2" data-reveal>
          {d.title}
        </h2>
        <dl className="ws-data" data-reveal="stagger">
          {d.items.map((x, i) => (
            <div key={x.title} style={{ transitionDelay: `${i * 0.08}s` }}>
              <span className="ws-data__plus" aria-hidden="true" />
              <dt>{x.title}</dt>
              <dd>{x.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* Native <details>: works without JS, keyboard and screen readers included. */
export function Faq() {
  const { t } = useT();
  const f = t.faq;
  return (
    <section id="faq" className="ws-section">
      <div className="ws-container ws-faq">
        <h2 className="ws-h2" data-reveal>
          {f.title}
        </h2>
        <div className="ws-faq__list" data-reveal>
          {f.items.map((x) => (
            <details key={x.q} className="ws-faq__item">
              <summary>
                <span>{x.q}</span>
                <Plus className="ws-faq__icon" size={20} strokeWidth={1.75} aria-hidden="true" />
              </summary>
              <p>{x.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
