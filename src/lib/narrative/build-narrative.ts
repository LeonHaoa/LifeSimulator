import type { AttrKey } from "@/lib/constants";
import type { Locale } from "@/lib/i18n/types";
import { templateNarrative } from "./template";
import { fetchLlmNarrative } from "./llm";

export async function buildNarrative(input: {
  locale: Locale;
  name: string;
  age: number;
  eventIds: string[];
  eventTitles: string[];
  skillKey?: AttrKey;
}): Promise<{ text: string; fallback: boolean }> {
  const llm = await fetchLlmNarrative({
    locale: input.locale,
    name: input.name,
    age: input.age,
    eventIds: input.eventIds,
    skillKey: input.skillKey,
  });
  if (llm) return { text: llm, fallback: false };
  return {
    text: templateNarrative(
      input.locale,
      input.name,
      input.age,
      input.eventTitles,
      input.skillKey
    ),
    fallback: true,
  };
}
