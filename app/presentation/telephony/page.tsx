import type { Metadata } from "next";
import "./presentation.css";
import { TelephonyDeck } from "./_components/deck";

export const metadata: Metadata = {
  title: "WikiAI Телефония | Питч",
  description: "Трёхминутный питч WikiAI Телефонии для трека 1: ИИ-ассистент для входящих звонков.",
};

export default function TelephonyPitchPage() {
  return <TelephonyDeck />;
}
