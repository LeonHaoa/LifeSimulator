import type { GameState } from "@/lib/schemas/game";
import type { GameEvent } from "./types";

function matches(event: GameEvent, state: GameState, nextAge: number): boolean {
  const c = event.conditions;
  const a = state.attrs;
  if (c.happinessMin != null && a.happiness < c.happinessMin) return false;
  if (c.happinessMax != null && a.happiness > c.happinessMax) return false;
  if (c.wealthMin != null && a.wealth < c.wealthMin) return false;
  if (c.wealthMax != null && a.wealth > c.wealthMax) return false;
  if (c.healthMin != null && a.health < c.healthMin) return false;
  if (c.healthMax != null && a.health > c.healthMax) return false;
  if (c.careerMin != null && a.career < c.careerMin) return false;
  if (c.careerMax != null && a.career > c.careerMax) return false;
  if (c.studyMin != null && a.study < c.studyMin) return false;
  if (c.studyMax != null && a.study > c.studyMax) return false;
  if (c.socialMin != null && a.social < c.socialMin) return false;
  if (c.socialMax != null && a.social > c.socialMax) return false;
  if (c.loveMin != null && a.love < c.loveMin) return false;
  if (c.loveMax != null && a.love > c.loveMax) return false;
  if (c.marriageMin != null && a.marriage < c.marriageMin) return false;
  if (c.marriageMax != null && a.marriage > c.marriageMax) return false;
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
