import type { GameState } from "@/lib/schemas/game";
import { SCHEMA_VERSION } from "@/lib/constants";
import { mortalitySeed, yearSeed } from "@/lib/rng/seeds";
import { createMulberry32 } from "@/lib/rng/mulberry32";
import type { GameEvent } from "./types";
import type { AdvanceYearResult } from "./types";
import { filterEvents, getFallbackEvents } from "./filter-events";
import { pickWeighted } from "./pick-events";
import { applyEventDeltas, mergeRecentTags } from "./apply-deltas";
import { rollDeathThisYear } from "./mortality";

export function advanceYear(
  state: GameState,
  allEvents: GameEvent[]
): AdvanceYearResult {
  if (state.diedAtAge != null) {
    throw new Error("Cannot advance year: character is deceased");
  }

  const nextAge = state.age + 1;
  const mortalityRng = createMulberry32(mortalitySeed(state.runSeed, nextAge));
  if (rollDeathThisYear(mortalityRng, nextAge, state.attrs.health)) {
    const nextState: GameState = {
      schemaVersion: SCHEMA_VERSION,
      name: state.name,
      runSeed: state.runSeed,
      age: nextAge,
      diedAtAge: nextAge,
      attrs: { ...state.attrs },
      lastSkillAllocation: undefined,
      recentTags: [...state.recentTags],
      milestonesShown: { ...state.milestonesShown },
      history: state.history,
    };
    return {
      nextState,
      pickedEvents: [],
      engineFallback: false,
      deathOccurred: true,
    };
  }

  const seed = yearSeed(state.runSeed, nextAge);
  const rng = createMulberry32(seed);

  let pool = filterEvents(state, allEvents, nextAge);
  let engineFallback = false;
  if (pool.length === 0) {
    pool = getFallbackEvents(allEvents);
    engineFallback = true;
    if (pool.length === 0) {
      throw new Error("Event pool missing fallback-breath");
    }
  }

  const count = 1 + Math.floor(rng() * 3);
  const picked = pickWeighted(rng, pool, count);

  const attrs = applyEventDeltas(state.attrs, picked);
  const recentTags = mergeRecentTags(state.recentTags, picked);

  const nextState: GameState = {
    schemaVersion: SCHEMA_VERSION,
    name: state.name,
    runSeed: state.runSeed,
    age: nextAge,
    attrs,
    lastSkillAllocation: undefined,
    recentTags,
    milestonesShown: { ...state.milestonesShown },
    history: state.history,
  };

  return {
    nextState,
    pickedEvents: picked,
    engineFallback,
    deathOccurred: false,
  };
}
