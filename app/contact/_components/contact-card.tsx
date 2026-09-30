"use client";

import { useEffect, useState, type PointerEvent, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, Check, Copy, Download, Mail, Phone, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopy } from "@/app/landing/_lib/copy";
import { SPRING } from "@/app/landing/_components/motion";
import { BrandLogo, buttonClasses } from "@/app/landing/_components/primitives";

type Channel = "telegram" | "email" | "phone";

const CONTACT: Record<Channel, { display: string; copy: string; href: string; external?: boolean }> = {
  telegram: { display: "@iafanasieff", copy: "@iafanasieff", href: "https://t.me/iafanasieff", external: true },
  email: { display: "afanasieffivan@gmail.com", copy: "afanasieffivan@gmail.com", href: "mailto:afanasieffivan@gmail.com" },
  phone: { display: "+375 44 508-85-75", copy: "+375445088575", href: "tel:+375445088575" },
};

const ICONS: Record<Channel, ReactNode> = {
  telegram: <BrandLogo id="telegram" decorative className="h-5" />,
  email: <Mail className="size-5" strokeWidth={1.75} aria-hidden />,
  phone: <Phone className="size-5" strokeWidth={1.75} aria-hidden />,
};

/** vCard for "Save contact". The name comes as "Surname Given name", matching the page copy. */
function buildVcard(name: string) {
  const [family = "", ...given] = name.split(" ");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${family};${given.join(" ")};;;`,
    `FN:${name}`,
    "ORG:WikiAI",
    `TEL;TYPE=CELL:${CONTACT.phone.copy}`,
    `EMAIL;TYPE=INTERNET:${CONTACT.email.copy}`,
    `URL:${CONTACT.telegram.href}`,
    "END:VCARD",
  ].join("\r\n");
}

function saveContact(name: string) {
  const url = URL.createObjectURL(new Blob([buildVcard(name)], { type: "text/vcard;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "WikiAI.vcf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * The contact card: flies in on arrival, then leans towards the mouse with a
 * soft light sheen, floating over the same perspective grid as the landing hero.
 */
export function ContactCard() {
  const { t } = useCopy();
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState<Channel | null>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 120, damping: 18 });
  const sy = useSpring(py, { stiffness: 120, damping: 18 });
  const rotateY = useTransform(sx, (v) => v * 12);
  const rotateX = useTransform(sy, (v) => v * -10);
  const sheenX = useTransform(sx, (v) => `${50 + v * 90}%`);
  const sheenY = useTransform(sy, (v) => `${30 + v * 90}%`);
  const sheen = useMotionTemplate`radial-gradient(28rem circle at ${sheenX} ${sheenY}, color-mix(in oklab, white 10%, transparent), transparent 60%)`;
  // The sheen only shows while the mouse is over the card.
  const sheenOpacity = useSpring(0, { stiffness: 120, damping: 20 });

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
    sheenOpacity.set(1);
  };
  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
    sheenOpacity.set(0);
  };

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(null), 1800);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = async (channel: Channel) => {
    try {
      await navigator.clipboard.writeText(CONTACT[channel].copy);
      setCopied(channel);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions); the value stays selectable.
    }
  };

  return (
    <div className="relative py-3 sm:py-8" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div aria-hidden className="wl-contact-floor" />
      <div aria-hidden className="wl-contact-shadow" />

      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 48, rotateX: 30, rotateY: -18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0, scale: 1 }}
        transition={{ ...SPRING, delay: 0.12 }}
        style={{ transformPerspective: 1200 }}
      >
        <motion.article
          className="wl-contact-card relative overflow-hidden rounded-2xl border border-border bg-card"
          style={{ rotateX, rotateY, transformPerspective: 1100 }}
        >
          {!reduce && <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-10" style={{ background: sheen, opacity: sheenOpacity }} />}

          <header className="flex items-center gap-3.5 bg-primary px-4 py-4 text-primary-foreground sm:px-6 sm:py-5">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-foreground text-lg font-bold text-primary sm:size-11 sm:text-xl">
              W
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-lg font-semibold">{t("contact.name")}</p>
              <p className="mt-1 text-sm text-primary-foreground/80">WikiAI · {t("contact.tagline")}</p>
            </div>
          </header>

          <ul className="flex flex-col gap-0.5 p-2 sm:gap-1 sm:p-3">
            {(Object.keys(CONTACT) as Channel[]).map((channel) => {
              const c = CONTACT[channel];
              const isCopied = copied === channel;
              return (
                <li key={channel} className="flex items-center gap-1.5">
                  <a
                    href={c.href}
                    {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    aria-label={`${t(`contact.open.${channel}`)}: ${c.display}`}
                    className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 transition-colors sm:gap-3.5 sm:px-2.5 sm:py-2.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{ICONS[channel]}</span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-xs font-medium transition-colors", isCopied ? "text-primary" : "text-muted-foreground")}>
                        {isCopied ? t("contact.copied") : t(`contact.labels.${channel}`)}
                      </span>
                      <span className="block truncate text-[15px] font-medium text-foreground sm:text-base">{c.display}</span>
                    </span>
                    <ArrowUpRight
                      className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </a>
                  <button
                    type="button"
                    onClick={() => copy(channel)}
                    aria-label={`${t("contact.copy")}: ${c.display}`}
                    className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {isCopied ? <Check className="size-4 text-primary" strokeWidth={2.25} /> : <Copy className="size-4" strokeWidth={1.75} />}
                  </button>
                </li>
              );
            })}
          </ul>
          <p aria-live="polite" className="sr-only">
            {copied ? `${t("contact.copied")}: ${CONTACT[copied].display}` : ""}
          </p>

          <div className="flex gap-2 border-t border-border p-3 sm:p-5">
            <a href={CONTACT.telegram.href} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "flex-1")}>
              <Send className="size-4" strokeWidth={1.75} aria-hidden />
              {t("contact.primary")}
            </a>
            {/* Icon-only on phones so both actions fit on one row. */}
            <button
              type="button"
              onClick={() => saveContact(t("contact.name"))}
              aria-label={t("contact.save")}
              className={buttonClasses("secondary", "w-11 px-0 sm:w-auto sm:flex-1 sm:px-5")}
            >
              <Download className="size-4" strokeWidth={1.75} aria-hidden />
              <span className="sr-only sm:not-sr-only">{t("contact.save")}</span>
            </button>
          </div>
        </motion.article>
      </motion.div>
    </div>
  );
}
