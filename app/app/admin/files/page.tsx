"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { DocumentLibrary } from "@/components/document-library"

export default function AdminFilesPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading } = useAuth()
  const router = useRouter()

  // Members get the read-only library at /app/files.
  useEffect(() => {
    if (!isLoading && !isAdmin) router.replace("/app/files")
  }, [isLoading, isAdmin, router])

  if (!isAdmin) return null

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t("navigation.files") }]} />
      <DocumentLibrary />
    </>
  )
}
