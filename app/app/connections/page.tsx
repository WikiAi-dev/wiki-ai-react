import { Suspense } from "react"
import { ConnectionsView } from "./connections-view"

export default function ConnectionsPage() {
  // The tab lives in ?tab=, and useSearchParams needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ConnectionsView />
    </Suspense>
  )
}
