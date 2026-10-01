"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCopy } from "@/app/landing/_lib/copy"
import { AuthCard, AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"

/** Shown when sign-in is refused because the organization isn't active. */
export function ReviewView() {
  const { t, get } = useCopy()
  const account = useSearchParams().get("account")
  const steps = get<string[]>("auth.review.steps")

  return (
    <AuthLayout title={t("auth.review.title")} subtitle={t("auth.review.subtitle")}>
      <AuthCard>
        {account && (
          <p className="mb-5 flex items-baseline justify-between gap-4 rounded-xl bg-muted/60 px-4 py-3 text-sm">
            <span className="text-muted-foreground">{t("auth.review.account")}</span>
            <span className="truncate font-medium">{account}</span>
          </p>
        )}
        <h2 className="font-semibold tracking-tight">{t("auth.review.whatNext")}</h2>
        <ol className="mt-3 flex flex-col gap-3">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-[15px] leading-relaxed text-muted-foreground">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href="/contact">{t("auth.review.contact")}</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/login">{t("auth.review.back")}</Link>
          </Button>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}
