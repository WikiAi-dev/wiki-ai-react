import type { Metadata } from "next";
import "../landing/landing.css";
import ru from "@/src/i18n/locales/ru.json";
import { Nav } from "../landing/_components/nav";
import { Footer } from "../landing/_components/closing";
import { MotionRoot } from "../landing/_components/motion";
import { ContactView } from "./_components/contact-view";

export const metadata: Metadata = {
  title: ru.landing.contact.metaTitle,
  description: ru.landing.contact.metaDescription,
};

export default function ContactPage() {
  return (
    <MotionRoot>
      {/* One screen: nav, the card centred in the remaining space, and a thin copyright bar. */}
      <div className="wl flex min-h-[100dvh] flex-col bg-background font-sans text-foreground antialiased">
        <Nav showCta={false} />
        <main className="flex flex-1 items-center">
          <ContactView />
        </main>
        <Footer compact />
      </div>
    </MotionRoot>
  );
}
