import type { Metadata } from "next"
import "./landing/landing.css"
import ru from "@/src/i18n/locales/ru.json"
import { NotFoundView } from "./not-found-view"

export const metadata: Metadata = {
  title: ru.landing.auth.notFound.metaTitle,
}

export default function NotFound() {
  return <NotFoundView />
}
