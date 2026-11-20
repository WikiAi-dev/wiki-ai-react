import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { dictionaries } from "./_site/content";
import { Site } from "./_site/site";
import "./_site/site.css";

/*
 * WikiAI landing (November 2026, WAI-258) in the owner's brand system from
 * afanasieff.by (BusinessCardSite): the concrete (light) and graphite (dark)
 * palettes and Geist, with the WikiAI blue as the accent. Its elements are
 * its own, after the afanasieff.by moodboard (giant word with an object in
 * the gap, grain, text ring, kinetic manifesto, bracket viewfinder, webhook
 * log, wave lines, horizontal rail, self-drawing mark) and webdad.by (pill
 * nav and CTAs, before/after rows). Scroll effects: ./_site/scroll.ts.
 * Audience, pains and prices: Docs/WikiAI_economics_KP_CJM.xlsx, the deck.
 * /contact uses the same style (./_site/contact-page.tsx); the previous
 * landing's components in ./_components still serve /login and the other
 * auth pages.
 */

// The afanasieff.by brand faces: Geist and Geist Mono, both with Cyrillic.
const sans = Geist({ subsets: ["latin", "cyrillic"], variable: "--font-ws-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-ws-mono", display: "swap" });

export const metadata: Metadata = {
  title: dictionaries.ru.meta.title,
  description: dictionaries.ru.meta.description,
  authors: [{ name: "Афанасьев Иван" }],
};

export default function LandingPage() {
  return <Site fontClass={`${sans.variable} ${mono.variable}`} />;
}
