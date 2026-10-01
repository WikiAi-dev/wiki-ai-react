import type { Metadata } from "next"
import { Suspense } from "react"
import "../landing/landing.css"
import ru from "@/src/i18n/locales/ru.json"
import { InviteView } from "./invite-view"

export const metadata: Metadata = {
  title: ru.landing.auth.invite.metaTitle,
}

export default function InvitePage() {
  // useSearchParams needs a Suspense boundary for static rendering.
  return (
    <Suspense fallback={null}>
      <InviteView />
    </Suspense>
  )
}
