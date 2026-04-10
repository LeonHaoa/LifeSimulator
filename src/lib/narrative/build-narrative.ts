import type { AttrKey } from "@/lib/constants";
import type { GameState } from "@/lib/schemas/game";
import { templateNarrative } from "./template";
import { fetchLlmNarrative } from "./llm";

export async function buildNarrative(input: {
  name: string;
  age: number;
  runSeed: number;
  attrs: GameState["attrs"];
  historyForSkills: GameState["history"];
  eventIds: string[];
  eventTitles: string[];
  skillKey?: AttrKey;
}): Promise<{ text: string; fallback: boolean }> {
  const llm = await fetchLlmNarrative({
    name: input.name,
    age: input.age,
    runSeed: input.runSeed,
    attrs: input.attrs,
    historyForSkills: input.historyForSkills,
    eventIds: input.eventIds,
    eventTitles: input.eventTitles,
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
