import { SUPPORTED_LOCALES, type Locale } from "./types";

export const defaultLocale: Locale = "en";

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
