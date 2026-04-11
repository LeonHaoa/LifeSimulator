import { z } from "zod";
import { ATTR_KEYS, ATTR_MAX } from "@/lib/constants";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";

const attrNum = z.number().int().min(0).max(ATTR_MAX);

export const AttrKeySchema = z.enum(ATTR_KEYS);
export const LocaleSchema = z.enum(SUPPORTED_LOCALES);

export const AttrsSchema = z.object({
  happiness: attrNum,
  health: attrNum,
  wealth: attrNum,
  career: attrNum,
  study: attrNum,
  social: attrNum,
  love: attrNum,
  marriage: attrNum,
});

export const HistoryEntrySchema = z.object({
  age: z.number().int().min(0),
  eventIds: z.array(z.string()),
  narrative: z.string(),
  fallback: z.boolean(),
  skillAllocation: AttrKeySchema.optional(),
});

export const GameStateSchema = z.object({
  schemaVersion: z.number().int().positive(),
  name: z.string().min(1).max(20),
  runSeed: z.number().int().min(0).max(0xffffffff),
  age: z.number().int().min(0),
  attrs: AttrsSchema,
  /** If set, the character died at this age; no further years may be advanced. */
  diedAtAge: z.number().int().min(0).optional(),
  /** Set by client before advancing year; cleared in stored state after resolve. */
  lastSkillAllocation: AttrKeySchema.optional(),
  recentTags: z.array(z.string()).max(20),
  milestonesShown: z.record(z.string(), z.boolean()),
  history: z.array(HistoryEntrySchema),
});

export type GameState = z.infer<typeof GameStateSchema>;
export type AttrKey = z.infer<typeof AttrKeySchema>;

export const YearApiRequestSchema = z.object({
  schemaVersion: z.number().int(),
  stream: z.boolean().optional(),
  locale: LocaleSchema,
  state: GameStateSchema,
});

export type YearApiRequest = z.infer<typeof YearApiRequestSchema>;

export const YearSummarySchema = z.object({
  age: z.number().int(),
  eventIds: z.array(z.string()),
  narrative: z.string(),
  fallback: z.boolean(),
  engineFallback: z.boolean(),
  milestoneMessage: z.string().optional(),
});

export const YearApiResponseSchema = z.object({
  schemaVersion: z.number().int().positive(),
  state: GameStateSchema,
  yearSummary: YearSummarySchema,
});

export type YearApiResponse = z.infer<typeof YearApiResponseSchema>;

export const LlmNarrativeJsonSchema = z.object({
  text: z.string().min(1).max(6000),
});
