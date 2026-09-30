"use client";

import type { PointerEvent, ReactNode } from "react";
import { MotionConfig, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";

/** Soft, slightly damped spring used for every entrance on the page. */
export const SPRING: Transition = { type: "spring", stiffness: 70, damping: 18, mass: 0.9 };

/** Visitors who ask for reduced motion get fades only: no movement, tilt or 3D. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Rises into place with a slight 3D tilt the first time it scrolls into view. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28, rotateX: 10 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ ...SPRING, delay }}
      style={{ transformPerspective: 1200, transformOrigin: "50% 100%" }}
    >
      {children}
    </motion.div>
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
