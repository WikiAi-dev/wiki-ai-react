"use client";

import { ArrowUp, ArrowUpRight, Check, Copy, Phone } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { CONTACT } from "./content";
import { useT } from "./locale";
import { useScrub } from "./scroll";
import { Crosses, Pill } from "./ui";

/*
 * The finale, after Lando Norris's signature that draws itself: the WikiAI
 * badge is drawn stroke by stroke as the block scrolls in, next to the call
 * to action and the direct contacts.
 */
export function Contact() {
  const { t } = useT();
  const c = t.contact;
  const panel = useRef<HTMLDivElement>(null);
  const box = useRef<SVGRectElement>(null);
  const w = useRef<SVGPathElement>(null);
  // The mark is drawn by the scroll: the frame first, then the W.
  // The panel is the last block, so it never reaches the upper screen: the mark
  // finishes once the whole panel is on screen.
  useScrub(panel, (r, vh) => Math.min(1, Math.max(0, (vh * 0.95 - r.top) / Math.max(1, vh * 0.95 - (vh - r.height - 24)))), (p) => {
    box.current?.style.setProperty("stroke-dashoffset", String(1 - Math.min(1, p / 0.6)));
    // Once closed, the frame drops its dash so the start and end meet without a seam.
    box.current?.style.setProperty("stroke-dasharray", p >= 0.6 ? "none" : "1");
    w.current?.style.setProperty("stroke-dashoffset", String(1 - Math.min(1, Math.max(0, (p - 0.35) / 0.65))));
  });
  return (
    <section id="contact" aria-labelledby="ws-contact-title" className="ws-section ws-final">
      <div className="ws-container">
        <div ref={panel} className="ws-final__panel" data-reveal>
          <Crosses />
          <svg viewBox="0 0 24 24" className="ws-sign" aria-hidden="true">
            <rect ref={box} x="1" y="1" width="22" height="22" rx="5" pathLength={1} className="ws-sign__box" />
            <path ref={w} d="M5.9 7 8.95 17 12 10.2 15.05 17 18.1 7" pathLength={1} className="ws-sign__w" />
          </svg>
          <div className="ws-final__copy">
            <h2 id="ws-contact-title" className="ws-final__title">
              {c.title}
            </h2>
            <p className="ws-lead">{c.lead}</p>
            <div className="ws-final__actions">
              <Pill href={CONTACT.telegram.href} external>
                {c.telegram}
              </Pill>
              <span className="ws-final__phone">
                <a href={CONTACT.phone.href}>
                  <Phone size={18} strokeWidth={1.75} aria-hidden="true" />
                  {CONTACT.phone.display}
                </a>
                <CopyButton value={CONTACT.phone.display} label={c.copy} done={c.copied} />
              </span>
            </div>
            <p className="ws-final__person">
              <b>{c.person}</b> {c.role}
              <Link href="/contact" className="ws-textlink">
                {c.all}
                <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </section>
  );
}

/** The footer shared by the landing and the contact page. */
export function SiteFooter() {
  const { t } = useT();
  const f = t.footer;
  return (
    <footer className="ws-container ws-footer">
      <p>© 2026 WikiAI.by. {f.rights}</p>
      <p className="ws-footer__links">
        <a href="https://graph.by" target="_blank" rel="noopener noreferrer">
          Graph.by
        </a>
        <a href="https://afanasieff.by" target="_blank" rel="noopener noreferrer">
          Afanasieff.by
        </a>
        <Link href="/login">{f.signIn}</Link>
      </p>
      <a href="#top" className="ws-footer__top">
        <ArrowUp size={16} strokeWidth={1.75} aria-hidden="true" />
        {t.contact.top}
      </a>
    </footer>
  );
}

export function CopyButton({ value, label, done }: { value: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="ws-round"
      aria-label={copied ? done : `${label}: ${value}`}
      title={copied ? done : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {}
      }}
    >
      {copied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={1.75} />}
    </button>
  );
}
