import type { ReactNode } from "react"
import { OperatorProvider } from "@/components/telephony/operator-provider"

// The operator's call lives here, so it carries on between the telephony
// pages (live board, history, a call's page).
export default function TelephonyLayout({ children }: { children: ReactNode }) {
  return <OperatorProvider>{children}</OperatorProvider>
}
