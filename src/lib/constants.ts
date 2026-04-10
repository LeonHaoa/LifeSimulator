export const SCHEMA_VERSION = 2;

export const ATTR_MAX = 10_000;

/** Initial roll range [0, 100] inclusive; stats cap at ATTR_MAX. */
export const ATTR_INITIAL_MAX = 100;

export const ATTR_KEYS = [
  "happiness",
  "health",
  "wealth",
  "career",
  "study",
  "social",
  "love",
  "marriage",
] as const;

export type AttrKey = (typeof ATTR_KEYS)[number];

export const EVENT_TITLE_KEYS = {
  "fallback-breath": "fallbackBreath",
  brick: "brick",
  debut: "debut",
  gaokao: "gaokao",
  "tag-bonus-after-work": "tagBonusAfterWork",
  "easter-name-long": "easterNameLong",
} as const;

export const ATTR_LABELS: Record<AttrKey, string> = {
  happiness: "快乐",
  health: "健康",
  wealth: "财富",
  career: "事业",
  study: "学业",
  social: "人际关系",
  love: "爱情",
  marriage: "婚姻",
};

/**
 * Skill points rule (based on the next age after advancing).
 * - 1–30: gain `age` points
 * - 31–40: gain 0
 * - 41–59: gain 1
 * - 60+: lose 2 (user must allocate the deductions)
 */
export function yearlySkillPoints(nextAge: number): number {
  if (nextAge >= 60) return -2;
  if (nextAge >= 41) return 1;
  if (nextAge >= 31) return 0;
  if (nextAge >= 1) return nextAge;
  return 0;
}

export const LLM_TIMEOUT_MS = 12_000;

export const LLM_MAX_RETRIES = 2;

export const LLM_RETRY_DELAY_MS = 300;

export const MILESTONE_AGES = [70, 80, 90, 100] as const;

export const MILESTONE_COPY =
  "哇哦，你达到70、80、90、100岁的门槛了\n";
