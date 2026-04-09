import type { GameState } from "@/lib/schemas/game";
import type { GameEvent } from "./types";

function matches(event: GameEvent, state: GameState, nextAge: number): boolean {
  const c = event.conditions;
  const a = state.attrs;
  if (c.looksMin != null && a.looks < c.looksMin) return false;
  if (c.looksMax != null && a.looks > c.looksMax) return false;
  if (c.wealthMin != null && a.wealth < c.wealthMin) return false;
  if (c.wealthMax != null && a.wealth > c.wealthMax) return false;
  if (c.healthMin != null && a.health < c.healthMin) return false;
  if (c.healthMax != null && a.health > c.healthMax) return false;
  if (c.luckMin != null && a.luck < c.luckMin) return false;
  if (c.luckMax != null && a.luck > c.luckMax) return false;
  if (c.ageMin != null && nextAge < c.ageMin) return false;
  if (c.ageMax != null && nextAge > c.ageMax) return false;
  if (c.nameMinChars != null && state.name.length < c.nameMinChars) return false;
  if (c.requiresRecentTag != null) {
    if (!state.recentTags.includes(c.requiresRecentTag)) return false;
  }
  return true;
}

export function filterEvents(
  state: GameState,
  events: GameEvent[],
  nextAge: number
): GameEvent[] {
  return events.filter(
    (e) => e.id !== "fallback-breath" && matches(e, state, nextAge)
  );
}

export function getFallbackEvents(events: GameEvent[]): GameEvent[] {
  return events.filter((e) => e.id === "fallback-breath");
}
