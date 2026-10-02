"use client"

import Link from "next/link"
import { useCopy } from "@/app/landing/_lib/copy"
import { AuthCard, AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"

/** What any unknown address shows, in the site's own layout. */
export function NotFoundView() {
  const { t } = useCopy()
  return (
    <AuthLayout title={t("auth.notFound.title")} subtitle={t("auth.notFound.subtitle")}>
      <AuthCard>
        <p className="text-sm font-medium text-muted-foreground">{t("auth.notFound.code")}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href="/">{t("auth.notFound.home")}</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/app">{t("auth.notFound.app")}</Link>
          </Button>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}
