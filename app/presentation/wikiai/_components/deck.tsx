"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, NotebookText } from "lucide-react";
import { cn } from "@/lib/utils";
import { APPENDIX, DECK, SCRIPT } from "@/video/pitch/script";

const ScenePlayer = dynamic(() => import("./scene-player").then((m) => m.ScenePlayer), { ssr: false });
const ScenePreview = dynamic(() => import("./scene-player").then((m) => m.ScenePreview), { ssr: false });

const pad = (n: number) => String(n).padStart(2, "0");
const MOVE = "wd-move";
const NARROW = "(max-width: 819px)";

/*
 * Where the presentation is: the scene comes from the URL hash (#3 is the
 * third scene, so a link or a reload lands there); whether to show it already
 * built (after stepping back) lives next to it. The appendix follows the
 * pitch in the same sequence.
 */
let instant = false;

function readScene() {
  const n = parseInt(window.location.hash.slice(1), 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(DECK.length - 1, n - 1)) : 0;
}

function readPosition() {
  return `${readScene()}|${instant ? 1 : 0}`;
}

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener(MOVE, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener(MOVE, onChange);
  };
}

function moveTo(scene: number, atOnce: boolean) {
  instant = atOnce;
  window.history.replaceState(window.history.state, "", `#${scene + 1}`);
  window.dispatchEvent(new Event(MOVE));
}

/** The next scene, played from the start. */
function next() {
  const scene = readScene();
  if (scene < DECK.length - 1) moveTo(scene + 1, false);
}

/** The previous scene, shown already built. */
function prev() {
  const scene = readScene();
  if (scene > 0) moveTo(scene - 1, true);
}

function subscribeNarrow(onChange: () => void) {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen();
}

export function PlatformDeck() {
  const position = useSyncExternalStore(subscribe, readPosition, () => "0|0");
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches, () => false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [idle, setIdle] = useState(false);

  const [index, atOnce] = position.split("|").map(Number);
  const cue = DECK[index];
  const extra = index >= SCRIPT.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest("input, textarea")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        next();
      } else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) {
        e.preventDefault();
        prev();
      } else if (e.key === "Home") moveTo(0, false);
      else if (e.key === "End") moveTo(SCRIPT.length - 1, true);
      else if (["a", "A", "ф", "Ф"].includes(e.key)) moveTo(SCRIPT.length, false);
      else if (["n", "N", "т", "Т"].includes(e.key)) setNotesOpen((open) => !open);
      else if (["f", "F", "а", "А"].includes(e.key)) toggleFullscreen();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // The presenter bar and the cursor fade out when the mouse rests.
  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), 2500);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), 2500);
    };
    window.addEventListener("mousemove", wake);
    window.addEventListener("touchstart", wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("touchstart", wake);
    };
  }, []);

  if (narrow) {
    return (
      <div className="tp wd">
        <main className="wd-list">
          {DECK.map((c, k) => (
            <section key={c.id} aria-label={`${k + 1}: ${c.section}`}>
              <ScenePreview cue={c} />
              <p><b>{k < SCRIPT.length ? pad(k + 1) : `П${k - SCRIPT.length + 1}`}</b> {c.section}</p>
            </section>
          ))}
        </main>
      </div>
    );
  }

  const pace = { main: "Главное", quick: "Быстро", qa: "Вопросы" }[cue.pace];

  return (
    <div className={cn("tp wd", idle && !notesOpen && "idle")}>
      <main className="viewport wd-screen" onClick={next} aria-roledescription="презентация" aria-label={`${index + 1} из ${DECK.length}: ${cue.section}`}>
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            className="wd-frame"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.35 } }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
          >
            <ScenePlayer cue={cue} built={atOnce === 1} />
          </motion.div>
        </AnimatePresence>
      </main>

      {notesOpen && (
        <aside className="notes" aria-live="polite">
          <div className="t">
            {cue.time}
            <span className={cn("wd-pace", cue.pace)}>{pace}</span>
          </div>
          <div>{cue.note}</div>
        </aside>
      )}

      <nav className="nav" aria-label="Сцены">
        <button type="button" aria-label="Назад" onClick={prev}>
          <ChevronLeft />
        </button>
        <span className="count">
          {extra ? `П${index - SCRIPT.length + 1} / П${APPENDIX.length}` : `${pad(index + 1)} / ${pad(SCRIPT.length)}`}
        </span>
        <button type="button" aria-label="Дальше" onClick={next}>
          <ChevronRight />
        </button>
        <span className="wd-section">
          {cue.section}
          <span className={cn("wd-pace", cue.pace)}>{pace}</span>
        </span>
        <div className="dots">
          {DECK.map((c, k) => (
            <button
              key={c.id}
              type="button"
              aria-label={k < SCRIPT.length ? `Сцена ${k + 1}: ${c.section}` : c.section}
              aria-current={k === index}
              className={cn(c.pace, k === SCRIPT.length && "first-qa", k === index && "on")}
              onClick={() => moveTo(k, false)}
            />
          ))}
        </div>
        <span className="hint">→ дальше · A приложение · N заметки</span>
        <button type="button" aria-label="Во весь экран" onClick={toggleFullscreen}>
          <Expand />
        </button>
        <button type="button" aria-pressed={notesOpen} onClick={() => setNotesOpen((open) => !open)}>
          <NotebookText />
          Заметки
        </button>
      </nav>
    </div>
  );
}
