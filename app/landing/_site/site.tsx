"use client";

import { Contact } from "./contact";
import { Hero } from "./hero";
import { Integrations } from "./integrations";
import { LocaleProvider } from "./locale";
import { Manifesto } from "./manifesto";
import { Nav } from "./nav";
import { Client, Data, Faq, How, Pilot, Pricing, Speed, Swap } from "./sections";
import { Segments } from "./segments";
import { RevealRoot } from "./ui";

/*
 * The WikiAI landing: afanasieff.by's palettes and type with the WikiAI blue,
 * its own elements from the afanasieff.by moodboard, and a selling order
 * after webdad.by: promise, why, before and after, how it works, speed,
 * integrations, who it is for, a customer, the pilot, prices, data,
 * questions, contact.
 */
export function Site({ fontClass }: { fontClass: string }) {
  return (
    <LocaleProvider>
      <RevealRoot className={`ws ${fontClass}`}>
        <Nav />
        <main>
          <Hero />
          <Manifesto />
          <Swap />
          <How />
          <Speed />
          <Integrations />
          <Segments />
          <Client />
          <Pilot />
          <Pricing />
          <Data />
          <Faq />
          <Contact />
        </main>
      </RevealRoot>
    </LocaleProvider>
  );
}
