"use client";

import React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { defaultLocale, isSupportedLocale } from "./config";
import { getDictionary } from "./dictionary";
import type { Locale, Messages } from "./types";

const STORAGE_KEY = "life-simulator.locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Messages;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function syncDocumentLocale(locale: Locale) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    syncDocumentLocale(locale);
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isSupportedLocale(saved)) {
      setLocaleState(saved);
      syncDocumentLocale(saved);
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale(nextLocale) {
        setLocaleState(nextLocale);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, nextLocale);
        }
        syncDocumentLocale(nextLocale);
      },
      messages: getDictionary(locale),
    }),
    [locale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used within LocaleProvider");
  return value;
}
