import { Suspense } from "react"
import { TelephonySettingsView } from "./settings-view"

export default function TelephonySettingsPage() {
  // The tab lives in ?tab=, and useSearchParams needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <TelephonySettingsView />
    </Suspense>
  )
}
