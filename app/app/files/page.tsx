"use client"

import { useTranslation } from "@/src/i18n"
import { AppHeader } from "@/components/app-header"
import { DocumentLibrary } from "@/components/document-library"

export default function FilesPage() {
  const { t } = useTranslation()
  return (
    <>
      <AppHeader breadcrumbs={[{ label: t("navigation.files") }]} />
      <DocumentLibrary />
    </>
  )
}
