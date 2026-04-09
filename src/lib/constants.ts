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

/** Skill points granted before each new year (age advance). */
export const SKILL_POINTS_PER_YEAR = 1;

export const LLM_TIMEOUT_MS = 12_000;

export const LLM_MAX_RETRIES = 2;

export const LLM_RETRY_DELAY_MS = 300;

export const MILESTONE_AGES = [70, 80, 90, 100] as const;

export const MILESTONE_COPY =
  "哇哦，你达到70、80、90、100岁的门槛了\n";
