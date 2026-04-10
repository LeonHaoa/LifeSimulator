import type { AttrKey } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
export function skillFlavorLine(locale: Locale, key: AttrKey): string {
  return getDictionary(locale).narrative.skillFlavor[key];
}

export function skillLabel(locale: Locale, key: AttrKey): string {
  return getDictionary(locale).stats[key].label;
}
