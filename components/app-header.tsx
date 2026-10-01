"use client"

import React, { useSyncExternalStore } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { ChevronRight, Moon, Sun } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useTranslation } from "@/src/i18n"

interface AppHeaderProps {
  breadcrumbs?: Array<{ label: string; href?: string }>
}

const subscribeNoop = () => () => {}

/** False during server render and hydration, true afterwards. */
function useHydrated() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false)
}

const toolButton =
  "inline-flex h-9 items-center justify-center rounded-full px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

/** Top bar of every app page, styled like the landing nav. */
export function AppHeader({ breadcrumbs = [] }: AppHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const { t, locale, changeLanguage } = useTranslation()
  const hydrated = useHydrated()
  const isDark = hydrated && resolvedTheme === "dark"

  const crumbs = [{ label: t("navigation.home"), href: "/app" }, ...breadcrumbs]

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background/85 px-3 backdrop-blur-md md:px-5">
      <SidebarTrigger className="rounded-full text-muted-foreground hover:text-foreground" aria-label={t("navigation.toggleSidebar")} />

      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex min-w-0 items-center gap-1 text-sm">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1
            return (
              <li key={`${index}-${crumb.label}`} className={isLast ? "min-w-0" : "hidden shrink-0 items-center gap-1 sm:flex"}>
                {isLast ? (
                  <span aria-current="page" className="block truncate font-medium text-foreground">
                    {crumb.label}
                  </span>
                ) : (
                  <>
                    {crumb.href ? (
                      <Link href={crumb.href} className="text-muted-foreground transition-colors hover:text-foreground">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{crumb.label}</span>
                    )}
                    <ChevronRight aria-hidden className="size-3.5 text-muted-foreground/70" />
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={() => changeLanguage(locale === "en" ? "ru" : "en")} className={toolButton} aria-label={t("navigation.language")}>
          {locale === "en" ? "RU" : "EN"}
        </button>
        <button type="button" onClick={() => setTheme(isDark ? "light" : "dark")} className={`${toolButton} w-9 px-0`} aria-label={t("navigation.toggleTheme")}>
          {isDark ? <Sun className="size-[18px]" strokeWidth={1.75} /> : <Moon className="size-[18px]" strokeWidth={1.75} />}
        </button>
      </div>
    </header>
  )
}
