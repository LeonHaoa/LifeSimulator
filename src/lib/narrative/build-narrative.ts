import type { AttrKey } from "@/lib/constants";
import { templateNarrative } from "./template";
import { fetchLlmNarrative } from "./llm";

export async function buildNarrative(input: {
  name: string;
  age: number;
  eventIds: string[];
  eventTitles: string[];
  skillKey?: AttrKey;
}): Promise<{ text: string; fallback: boolean }> {
  const llm = await fetchLlmNarrative({
    name: input.name,
    age: input.age,
    eventIds: input.eventIds,
    skillKey: input.skillKey,
  });
  if (llm) return { text: llm, fallback: false };
  return {
    text: templateNarrative(
      input.name,
      input.age,
      input.eventTitles,
      input.skillKey
    ),
    fallback: true,
  };
}
