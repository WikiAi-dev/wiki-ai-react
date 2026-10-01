"use client";

import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Bot, Database, FileText, MessagesSquare, PhoneCall, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopy } from "../_lib/copy";
import { BrandLogo } from "./primitives";

export type Focus = "gather" | "connect" | "sync" | "team" | "clients" | "api";
type TileId = "bitrix24" | "1c" | "docs" | "custom" | "team" | "api" | "chat" | "call";
type Point = { x: number; y: number };

/*
 * Scene geometry, in em. The canvas font-size follows the container width
 * (see .hub-canvas in landing.css), so the whole scene scales as one piece.
 * The floor is tilted back; tiles are counter-rotated so they stand upright
 * and face the viewer.
 */
const FLOOR = { w: 30, d: 40 };
const TILT = { x: 58, z: -14 };
const STAND = `rotateZ(${-TILT.z}deg) rotateX(${-TILT.x}deg)`;

const CORE: Point = { x: 15, y: 20 };
const SOURCES: (Point & { id: TileId })[] = [
  { id: "bitrix24", x: 8, y: 3 },
  { id: "1c", x: 22, y: 3 },
  { id: "docs", x: 8, y: 10.5 },
  { id: "custom", x: 22, y: 10.5 },
];
// Everyone who gets answers: staff and outside services first, customers (chat and calls) on the last row.
const CHANNELS: (Point & { id: TileId })[] = [
  { id: "team", x: 8, y: 29.5 },
  { id: "api", x: 22, y: 29.5 },
  { id: "chat", x: 8, y: 37 },
  { id: "call", x: 22, y: 37 },
];

const ACTIVE: Record<Focus, TileId[]> = {
  gather: ["bitrix24", "1c", "docs", "custom"],
  connect: ["bitrix24", "1c"],
  sync: ["bitrix24", "1c", "docs", "custom"],
  team: ["team"],
  clients: ["chat", "call"],
  api: ["api"],
};

const CHANNEL_ICONS = { team: Users, api: Bot, chat: MessagesSquare, call: PhoneCall } as const;

function lineStyle(from: Point, to: Point, index: number): CSSProperties {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return {
    left: `${from.x}em`,
    top: `${from.y}em`,
    width: `${Math.hypot(dx, dy)}em`,
    transform: `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)`,
    "--hub-delay": `${(index * 0.37) % 1.6}s`,
  } as CSSProperties;
}

export function Hub({ focus }: { focus: Focus }) {
  const { t, get } = useCopy();
  const channels = get<{ id: keyof typeof CHANNEL_ICONS; label: string }[]>("hero.flow.channelItems");
  const active = new Set(ACTIVE[focus]);

  // Gentle tilt towards the mouse; touch, pens and reduced motion leave the scene still.
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18 });
  const sy = useSpring(py, { stiffness: 60, damping: 18 });
  const rotateY = useTransform(sx, (v) => v * 10);
  const rotateX = useTransform(sy, (v) => v * -7);
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
  };

  const sourceLabel = (id: TileId): ReactNode => {
    if (id === "bitrix24") return <BrandLogo id="bitrix24" decorative className="h-[1.1em]" />;
    if (id === "1c") return <BrandLogo id="1c" decorative className="h-[1.5em]" />;
    // "custom" stands for any other system the customer connects.
    const Icon = id === "docs" ? FileText : Database;
    return (
      <>
        <Icon className="size-[1.1em] text-primary" strokeWidth={1.75} aria-hidden />
        {t(id === "docs" ? "hero.flow.docs" : "hero.flow.custom")}
      </>
    );
  };

  return (
    <div className="hub" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <p className="sr-only">
        {t("hero.flow.sourcesLabel")}: Bitrix24, 1C, {t("hero.flow.docs")}, {t("hero.flow.custom")}. {t("hero.flow.channelsLabel")}:{" "}
        {channels.map((c) => c.label).join(", ")}.
      </p>
      <div className="hub-canvas" aria-hidden>
        <motion.div
          className="hub-3d"
          initial={{ y: "2em", rotateX: 14, scale: 0.94 }}
          animate={{ y: 0, rotateX: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 55, damping: 16, delay: 0.25 }}
        >
          <motion.div className="hub-3d" style={{ rotateX, rotateY }}>
            <div
              className="hub-floor"
              style={{ width: `${FLOOR.w}em`, height: `${FLOOR.d}em`, transform: `translate(-50%, -50%) rotateX(${TILT.x}deg) rotateZ(${TILT.z}deg)` }}
            >
              <div className="hub-grid" />

              {SOURCES.map((s, i) => (
                <div key={`l-${s.id}`} className={cn("hub-line", active.has(s.id) && "is-active")} style={lineStyle(s, CORE, i)} />
              ))}
              {CHANNELS.map((c, i) => (
                <div key={`l-${c.id}`} className={cn("hub-line", active.has(c.id) && "is-active")} style={lineStyle(CORE, c, i + 4)} />
              ))}

              <div className="hub-ring" style={{ left: `${CORE.x}em`, top: `${CORE.y}em` }} />
              <div className="hub-ring hub-ring-delayed" style={{ left: `${CORE.x}em`, top: `${CORE.y}em` }} />

              {[...SOURCES, ...CHANNELS].map((p) => (
                <div key={`s-${p.id}`} className="hub-shadow" style={{ left: `${p.x}em`, top: `${p.y}em` }} />
              ))}

              <Standing at={CORE}>
                <div className="hub-core">
                  <span className="grid size-[1.9em] place-items-center rounded-[0.5em] bg-primary-foreground text-[1.1em] font-bold text-primary">W</span>
                  WikiAI
                </div>
              </Standing>

              {SOURCES.map((s) => (
                <Standing key={s.id} at={s}>
                  <div className={cn("hub-tile", active.has(s.id) && "is-active")}>{sourceLabel(s.id)}</div>
                </Standing>
              ))}

              {CHANNELS.map((c) => {
                const Icon = CHANNEL_ICONS[c.id as keyof typeof CHANNEL_ICONS];
                const label = channels.find((ch) => ch.id === c.id)?.label;
                return (
                  <Standing key={c.id} at={c}>
                    <div className={cn("hub-tile hub-tile-channel", active.has(c.id) && "is-active")}>
                      <Icon className="size-[1.1em]" strokeWidth={1.75} aria-hidden />
                      {label}
                    </div>
                  </Standing>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/** Places children upright on the floor, standing on the given point. */
function Standing({ at, children }: { at: Point; children: ReactNode }) {
  return (
    <div className="hub-anchor" style={{ left: `${at.x}em`, top: `${at.y}em` }}>
      <div className="hub-stand" style={{ transform: STAND }}>
        {children}
      </div>
    </div>
  );
}
