import type { Metadata } from "next";
import "../telephony/presentation.css";
import "./wikiai.css";
import { PlatformDeck } from "./_components/deck";

export const metadata: Metadata = {
  title: "WikiAI | Питч платформы",
  description: "Трёхминутный питч WikiAI: RAG-платформа, которая отвечает клиенту в звонке, подсказывает оператору и сама ведёт CRM.",
};

export default function PlatformPitchPage() {
  return <PlatformDeck />;
}
