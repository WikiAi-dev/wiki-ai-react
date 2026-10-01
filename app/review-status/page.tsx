import type { Metadata } from "next"
import { Suspense } from "react"
import "../landing/landing.css"
import ru from "@/src/i18n/locales/ru.json"
import { ReviewView } from "./review-view"

export const metadata: Metadata = {
  title: ru.landing.auth.review.metaTitle,
}

export default function ReviewStatusPage() {
  // useSearchParams needs a Suspense boundary for static rendering.
  return (
    <Suspense fallback={null}>
      <ReviewView />
    </Suspense>
  )
}
