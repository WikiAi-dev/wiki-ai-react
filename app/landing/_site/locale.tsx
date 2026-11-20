"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { dictionaries, type Dict, type Locale } from "./content";

/** Same key the app's own i18n writes, so the landing and the app agree on the language. */
const KEY = "wiki-ai-locale";

type Ctx = { locale: Locale; t: Dict; setLocale: (l: Locale) => void };
const LocaleContext = createContext<Ctx | null>(null);

/**
 * Russian on the server and during hydration, so the first client render
 * matches the HTML; a saved English choice applies right after.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setState] = useState<Locale>("ru");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a client-only preference
      if (saved === "en") setState("en");
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {}
  }, []);

  return <LocaleContext.Provider value={{ locale, t: dictionaries[locale], setLocale }}>{children}</LocaleContext.Provider>;
}

export function useT() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useT outside LocaleProvider");
  return ctx;
}
