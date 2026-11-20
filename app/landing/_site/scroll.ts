"use client";

import { useEffect, useRef, type RefObject } from "react";

/*
 * One scroll engine for the whole landing. Every scroll-linked effect
 * registers an element and a range; a single requestAnimationFrame loop runs
 * only while some registered element is on screen (or still settling), reads
 * its position, and eases the shown progress toward the real one. The ease
 * gives every effect a little inertia, so wheel steps read as smooth motion
 * without taking over the page scroll. It also tracks the scroll velocity,
 * which decorative effects can react to. Under reduced motion effects get
 * the final state at once.
 */

export type Range = (rect: DOMRect, vh: number) => number;
type Sub = {
  el: Element;
  range: Range;
  ease: number;
  onFrame: (p: number, rect: DOMRect) => void;
  cur: number;
  visible: boolean;
  settled: boolean;
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 0 when the element's top is at `from` of the viewport height, 1 when it reaches `to`. */
export const enter =
  (from = 0.95, to = 0.35): Range =>
  (r, vh) =>
    clamp01((vh * from - r.top) / (vh * (from - to)));

/** 0 while the element's top is at the top of the screen, 1 once `share` of it has scrolled away. */
export const leave =
  (share = 0.7): Range =>
  (r) =>
    clamp01(-r.top / Math.max(1, r.height * share));

/** 0 when the element's centre is `span` viewports below the screen centre, 1 when as far above. */
export const through =
  (span = 0.6): Range =>
  (r, vh) =>
    clamp01(0.5 - (r.top + r.height / 2 - vh / 2) / (vh * span * 2));

const subs = new Set<Sub>();
let raf = 0;
let lastY = 0;
let velocity = 0;
let io: IntersectionObserver | null = null;
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Smoothed scroll speed in px per frame, signed (positive = down). */
export function scrollVelocity() {
  return velocity;
}

function tick() {
  raf = 0;
  const y = window.scrollY;
  velocity += (y - lastY - velocity) * 0.2;
  lastY = y;
  const vh = window.innerHeight;
  let busy = Math.abs(velocity) > 0.05;
  // Read every position first, then write: interleaving reads with style
  // writes would make the browser recompute styles once per effect.
  const live: [Sub, DOMRect][] = [];
  for (const s of subs) if (s.visible || !s.settled) live.push([s, s.el.getBoundingClientRect()]);
  for (const [s, rect] of live) {
    const target = s.range(rect, vh);
    let next = s.ease >= 1 ? target : s.cur + (target - s.cur) * s.ease;
    if (Math.abs(target - next) < 0.0005) next = target;
    if (next !== s.cur || s.ease >= 1) {
      s.cur = next;
      s.onFrame(next, rect);
    }
    s.settled = next === target;
    if (!s.settled) busy = true;
  }
  if (busy) raf = requestAnimationFrame(tick);
}

function wake() {
  if (!raf) {
    lastY = window.scrollY;
    raf = requestAnimationFrame(tick);
  }
}

function observer() {
  if (!io) {
    // Scrolling and resizing only wake the loop; it sleeps again once every effect has settled.
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake, { passive: true });
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) for (const s of subs) if (s.el === e.target) s.visible = e.isIntersecting;
        wake();
      },
      { rootMargin: "15% 0px" },
    );
  }
  return io;
}

/**
 * Calls `onFrame(progress, rect)` while the element moves through `range`,
 * eased by `ease` (1 = no easing, called on every frame while on screen).
 * `rect` is the element's box for this frame. The callback should only write
 * styles: reading layout there would undo the read-then-write batching.
 */
export function useScrub<T extends Element>(ref: RefObject<T | null>, range: Range, onFrame: (p: number, rect: DOMRect) => void, ease = 0.14) {
  const cb = useRef(onFrame);
  useEffect(() => {
    cb.current = onFrame;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) {
      cb.current(1, el.getBoundingClientRect());
      return;
    }
    const sub: Sub = { el, range, ease, onFrame: (p, r) => cb.current(p, r), cur: 0, visible: false, settled: true };
    subs.add(sub);
    // First frame without easing, so nothing jumps on load or after a reload mid-page.
    const r0 = el.getBoundingClientRect();
    const p0 = range(r0, window.innerHeight);
    sub.cur = p0;
    cb.current(p0, r0);
    observer().observe(el);
    wake();
    return () => {
      subs.delete(sub);
      io?.unobserve(el);
    };
    // The range and ease are fixed per call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}

/** Counts a number up once when the element first comes into view. */
export function useCountUp<T extends HTMLElement>(ref: RefObject<T | null>, to: number, format: (v: number) => string, duration = 1200) {
  const fmt = useRef(format);
  useEffect(() => {
    fmt.current = format;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) {
      el.textContent = fmt.current(to);
      return;
    }
    el.textContent = fmt.current(0);
    let frame = 0;
    const once = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        once.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const t = clamp01((now - start) / duration);
          const k = 1 - Math.pow(1 - t, 4);
          el.textContent = fmt.current(to * k);
          if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    once.observe(el);
    return () => {
      once.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [ref, to, duration]);
}
