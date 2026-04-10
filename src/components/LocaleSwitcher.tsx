"use client";

import React from "react";
import { useLocale } from "@/lib/i18n/client-locale";

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="locale-switcher" role="group" aria-label="Language switcher">
      <button
        type="button"
        className="mini-btn"
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
      >
        EN
      </button>
      <button
        type="button"
        className="mini-btn"
        aria-pressed={locale === "zh-CN"}
        onClick={() => setLocale("zh-CN")}
      >
        中文
      </button>
    </div>
  );
}
