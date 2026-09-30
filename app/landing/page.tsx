import type { Metadata } from "next";
import "./landing.css";
import { Nav } from "./_components/nav";
import { Hero } from "./_components/hero";
import { Pains } from "./_components/pains";
import { Systems } from "./_components/systems";
import { HowItWorks } from "./_components/how-it-works";
import { Results } from "./_components/results";
import { Pilot } from "./_components/pilot";
import { Faq } from "./_components/faq";
import { FinalCta, Footer } from "./_components/closing";
import { MotionRoot } from "./_components/motion";

export const metadata: Metadata = {
  title: "WikiAI | База знаний компании, которая подключается к Битрикс24 и 1С",
  description:
    "WikiAI собирает данные из Битрикс24, 1С, документов и других систем в одну базу знаний, сам её обновляет и отвечает сотрудникам, клиентам и ИИ-агентам со ссылкой на источник.",
};

export default function LandingPage() {
  return (
    <MotionRoot>
      <div className="wl min-h-[100dvh] bg-background font-sans text-foreground antialiased">
        <Nav />
        <main>
          <Hero />
          <Pains />
          <Systems />
          <HowItWorks />
          <Results />
          <Pilot />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </MotionRoot>
  );
}
