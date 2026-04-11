import type { AttrKey } from "@/lib/constants";
import type { Locale } from "@/lib/i18n/types";
import { getDictionary } from "@/lib/i18n/dictionary";
import { skillFlavorLine } from "./skill-flavor";

export function templateNarrative(
  locale: Locale,
  name: string,
  age: number,
  eventTitles: string[],
  skillKey?: AttrKey
): string {
  const copy = getDictionary(locale);
  const bits = eventTitles.join(locale === "zh-CN" ? "；" : "; ");
  let body = copy.narrative.yearLine({ name, age, events: bits });
  if (skillKey) {
    body += ` ${skillFlavorLine(locale, skillKey)}`;
  } else {
    body += ` ${copy.narrative.idleLine}`;
  }
  return body;
}

export function templateDeathNarrative(
  locale: Locale,
  name: string,
  age: number
): string {
  return getDictionary(locale).narrative.deathYear({ name, age });
}
