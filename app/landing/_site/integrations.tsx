"use client";

import { ArrowLeftRight, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "./locale";
import { through, useScrub } from "./scroll";

const ROWS = 5;
const EVERY_MS = 3600;

/**
 * Update feed: every few seconds a new change arrives at the top and the
 * older ones move down and age. It only runs while on screen, and stands
 * still under reduced motion.
 */
function Feed() {
  const { t } = useT();
  const s = t.integrations;
  const [tick, setTick] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    let timer: number | undefined;
    const start = () => {
      if (timer === undefined)
        timer = window.setInterval(() => setTick((n) => n + 1), EVERY_MS);
    };
    const stop = () => {
      window.clearInterval(timer);
      timer = undefined;
    };
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting && !document.hidden ? start() : stop()),
      { threshold: 0.2 },
    );
    io.observe(el);
    const onVis = () => (document.hidden ? stop() : undefined);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // One extra row below the visible five: while the list slides down by one
  // row, the frame it starts from is exactly the previous one.
  const n = s.feed.length;
  const rows = Array.from({ length: ROWS + 1 }, (_, i) => {
    const k = tick - i;
    return { key: k, item: s.feed[((k % n) + n) % n], time: s.feedTimes[i] };
  });

  return (
    <figure className="ws-integrations__feed">
      <div className="ws-feed" ref={ref}>
        <div className="ws-feed__head">
          <span>{s.logTitle}</span>
          <span className="ws-feed__status ws-mono">
            <span className="ws-feed__live" aria-hidden="true" />
            {s.feedStatus}
          </span>
        </div>
        <div className="ws-feed__viewport">
          <ol
            key={tick}
            className={tick > 0 ? "ws-feed__list is-moving" : "ws-feed__list"}
          >
            {rows.map((r, i) => (
              <li
                key={r.key}
                className="ws-feed__row"
                aria-hidden={i === ROWS || undefined}
              >
                <span className="ws-feed__code ws-mono">200</span>
                <span className="ws-feed__sys ws-mono">{r.item.system}</span>
                <span className="ws-feed__text">{r.item.text}</span>
                <span className="ws-feed__time ws-mono">{r.time}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <figcaption className="ws-caption">{s.feedCaption}</figcaption>
    </figure>
  );
}

export function Integrations() {
  const { t } = useT();
  const s = t.integrations;
  const how: Record<string, string> = {
    self: s.self,
    setup: s.setup,
    custom: s.custom,
  };
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const list = useRef<HTMLOListElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const focus = useRef<HTMLDivElement>(null);

  /*
   * The viewfinder (desktop only). On every scroll frame only two things are
   * decided, from the track's box: which name is nearest the middle of the
   * screen (so fast scrolling never skips one) and whether the list is well
   * enough on screen to show the brackets. Rows have equal height, so nothing
   * is measured while scrolling.
   */
  useScrub(
    track,
    through(1.4),
    (_p, r) => {
      const box = focus.current;
      const n = list.current?.children.length ?? 0;
      if (!box || !n || !window.matchMedia("(min-width: 1024px)").matches) return;
      const vh = window.innerHeight;
      const row = r.height / n;
      const best = Math.min(n - 1, Math.max(0, Math.floor((vh / 2 - r.top) / row)));
      if (best !== activeRef.current) {
        activeRef.current = best;
        setActive(best);
      }
      box.classList.toggle("is-on", r.top < vh * 0.72 && r.bottom > vh * 0.28);
    },
    1,
  );

  // When the active name changes, the brackets lock onto it (moving and fitting
  // its width) and the other names fade and step aside by their distance.
  useEffect(() => {
    const el = list.current;
    const box = focus.current;
    if (!el || !box) return;
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    Array.from(el.children).forEach((node, i) => {
      const li = node as HTMLElement;
      const a = Math.min(Math.abs(i - active), 4);
      li.style.opacity = desktop ? String(Math.max(0.28, 1 - a * 0.24)) : "";
      li.style.transform = desktop ? `translate3d(${a * 10}px,0,0)` : "";
    });
    const li = el.children[active] as HTMLElement | undefined;
    const name = li?.querySelector<HTMLElement>(".ws-finder__name");
    if (!li || !name) return;
    box.style.setProperty("--y", `${li.offsetTop}px`);
    box.style.width = `${Math.round(name.offsetWidth + 56)}px`;
  }, [active, s]);

  const cur = s.items[active];
  return (
    <section id="integrations" className="ws-section">
      <div className="ws-container">
        <div className="ws-head" data-reveal>
          <h2 className="ws-h2">{s.title}</h2>
          <p className="ws-lead">{s.lead}</p>
        </div>
        <div className="ws-finder">
          <div className="ws-finder__listwrap">
            <div className="ws-finder__track" ref={track}>
              <div ref={focus} className="ws-finder__focus" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
              <ol ref={list} className="ws-finder__list">
                {s.items.map((x, i) => (
                  <li
                    key={x.name}
                    data-i={i}
                    className={i === active ? "is-active" : ""}
                  >
                    <span className="ws-finder__name">{x.name}</span>
                    <span className="ws-finder__inline">
                      <span className={`ws-tag is-${x.how}`}>{how[x.how]}</span>
                      {x.what}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="ws-finder__detail" aria-live="polite">
            <div key={active} className="ws-finder__detailin">
              <p className="ws-micro">
                {String(active + 1).padStart(2, "0")} /{" "}
                {String(s.items.length).padStart(2, "0")}
              </p>
              <p className="ws-finder__dname">{cur.name}</p>
              <p className="ws-finder__dwhat">{cur.what}</p>
              <span className={`ws-tag is-${cur.how}`}>{how[cur.how]}</span>
            </div>
          </div>
        </div>
        <div className="ws-integrations__row">
          <div className="ws-twoway" data-reveal>
            <ArrowLeftRight
              size={22}
              strokeWidth={1.75}
              aria-hidden="true"
              className="ws-twoway__icon"
            />
            <h3 className="ws-h3">{s.twoWayTitle}</h3>
            <ul>
              {s.twoWay.map((x) => (
                <li key={x}>
                  <Check size={16} strokeWidth={2} aria-hidden="true" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal>
            <Feed />
          </div>
        </div>
      </div>
    </section>
  );
}
