"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { MotionConfig, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";

/** Soft, slightly damped spring used for every entrance on the page. */
export const SPRING: Transition = { type: "spring", stiffness: 70, damping: 18, mass: 0.9 };

/** Visitors who ask for reduced motion get fades only: no movement, tilt or 3D. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/**
 * Rises into place with a slight 3D tilt the first time it scrolls into view.
 * A plain div animated by CSS (.wl-reveal in landing.css) and a bare
 * IntersectionObserver: framer-motion's motion.div and useInView both shifted
 * React's useId for everything inside, so the server and client disagreed on
 * the ids of tabs and accordions.
 */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      data-shown={shown}
      className={cn("wl-reveal", className)}
      style={{ "--wl-delay": `${Math.round(delay * 1000)}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/** Card that leans a few degrees towards the mouse. Touch, pens and reduced motion leave it flat. */
export function TiltCard({ children, className, max = 4 }: { children: ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 150, damping: 20 });
  const sy = useSpring(py, { stiffness: 150, damping: 20 });
  const rotateY = useTransform(sx, (v) => v * max * 2);
  const rotateX = useTransform(sy, (v) => v * -max * 2);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <motion.div
      className={cn("h-full", className)}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
    >
      {children}
    </motion.div>
  );
}
