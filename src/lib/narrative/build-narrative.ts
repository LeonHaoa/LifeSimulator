import { templateNarrative } from "./template";
import { fetchLlmNarrative } from "./llm";

export async function buildNarrative(input: {
  name: string;
  age: number;
  eventIds: string[];
  eventTitles: string[];
}): Promise<{ text: string; fallback: boolean }> {
  const llm = await fetchLlmNarrative({
    name: input.name,
    age: input.age,
    eventIds: input.eventIds,
  });
  if (llm) return { text: llm, fallback: false };
  return {
    text: templateNarrative(input.name, input.age, input.eventTitles),
    fallback: true,
  };
}
