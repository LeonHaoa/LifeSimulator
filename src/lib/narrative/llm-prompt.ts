import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";

export function buildNarrativeSystemPrompt(
  locale: Locale,
  mode: "json" | "plain"
): string {
  const copy = getDictionary(locale).llm;

  return [
    mode === "json" ? copy.roleJson : copy.rolePlain,
    locale === "en" ? copy.replyInEnglish : copy.replyInChinese,
    copy.noLanguageMixing,
  ].join("\n");
}
