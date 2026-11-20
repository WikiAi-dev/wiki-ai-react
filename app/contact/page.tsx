import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ContactSite } from "../landing/_site/contact-page";
import { dictionaries } from "../landing/_site/content";
import "../landing/_site/site.css";

/* The contact page, in the same style as the landing (app/landing/_site). */

const sans = Geist({ subsets: ["latin", "cyrillic"], variable: "--font-ws-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-ws-mono", display: "swap" });

export const metadata: Metadata = {
  title: dictionaries.ru.contactPage.meta.title,
  description: dictionaries.ru.contactPage.meta.description,
  authors: [{ name: "Афанасьев Иван" }],
};

export default function ContactPage() {
  return <ContactSite fontClass={`${sans.variable} ${mono.variable}`} />;
}
