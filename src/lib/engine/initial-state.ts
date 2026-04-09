import {
  SCHEMA_VERSION,
  ATTR_INITIAL_MAX,
} from "@/lib/constants";
import { hashNameToRunSeed, normalizePlayerName } from "@/lib/rng/seeds";
import { createMulberry32 } from "@/lib/rng/mulberry32";
import type { GameState } from "@/lib/schemas/game";

const NAME_RE = /^[\p{L}\p{N}·．\s]{1,20}$/u;

export function validateNewName(raw: string): string {
  const t = raw.trim();
  if (!NAME_RE.test(t)) {
    throw new Error("名字需 1–20 字符，支持中文、字母、数字、间隔号");
  }
  return normalizePlayerName(t);
}

/** Uniform random integer in [0, ATTR_INITIAL_MAX] inclusive. */
function rollInitial(rng: () => number): number {
  return Math.floor(rng() * (ATTR_INITIAL_MAX + 1));
}

export function createInitialState(rawName: string): GameState {
  const name = validateNewName(rawName);
  const runSeed = hashNameToRunSeed(rawName);
  const rng = createMulberry32((runSeed ^ 0x9e3779b9) >>> 0);

  const attrs = {
    happiness: rollInitial(rng),
    health: rollInitial(rng),
    wealth: rollInitial(rng),
    career: rollInitial(rng),
    study: rollInitial(rng),
    social: rollInitial(rng),
    love: rollInitial(rng),
    marriage: rollInitial(rng),
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    name,
    runSeed,
    age: 0,
    attrs,
    lastSkillAllocation: undefined,
    recentTags: [],
    milestonesShown: {},
    history: [],
  };
}
