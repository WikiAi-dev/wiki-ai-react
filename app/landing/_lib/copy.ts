"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useTranslation } from "@/src/i18n";
import en from "@/src/i18n/locales/en.json";
import ru from "@/src/i18n/locales/ru.json";

export type Locale = "en" | "ru";

/** The landing speaks to Russian-speaking store owners first. */
export const DEFAULT_LOCALE: Locale = "ru";

/** Same key the shared i18n module writes when the visitor switches language. */
const LOCALE_STORAGE_KEY = "wiki-ai-locale";

const dictionaries = { en: en.landing, ru: ru.landing };

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true afterwards. */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function savedLocale(): Locale | null {
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY);
    return value === "en" || value === "ru" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Landing copy lookup.
 *
 * Renders the default locale on the server and during hydration, so the first
 * client render matches the server HTML, then switches to the language the
 * visitor picked earlier (if any). The shared useTranslation hook is only used
 * to re-render when the language changes and to persist the choice.
 */
export function useCopy() {
  const { changeLanguage } = useTranslation();
  const hydrated = useHydrated();
  const active: Locale = (hydrated && savedLocale()) || DEFAULT_LOCALE;
  const dict = dictionaries[active];

  const get = useCallback(
    <T = string>(path: string): T => {
      let node: unknown = dict;
      for (const key of path.split(".")) {
        node = (node as Record<string, unknown> | undefined)?.[key];
      }
      return (node ?? path) as T;
    },
    [dict],
  );

  const t = useCallback((path: string) => get<string>(path), [get]);

  return { t, get, locale: active, setLocale: changeLanguage as (next: Locale) => void };
}

/** Mirrors the active locale on <html lang> for screen readers and search engines. */
export function useDocumentLang(locale: Locale) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
}
