import { SCHEMA_VERSION } from "@/lib/constants";
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

function rollAttr(rng: () => number): number {
  return 15 + Math.floor(rng() * 71);
}

export function createInitialState(rawName: string): GameState {
  const name = validateNewName(rawName);
  const runSeed = hashNameToRunSeed(rawName);
  const rng = createMulberry32((runSeed ^ 0x9e3779b9) >>> 0);

  return {
    schemaVersion: SCHEMA_VERSION,
    name,
    runSeed,
    age: 0,
    attrs: {
      looks: rollAttr(rng),
      wealth: rollAttr(rng),
      health: rollAttr(rng),
      luck: rollAttr(rng),
    },
    recentTags: [],
    milestonesShown: {},
    history: [],
  };
}
