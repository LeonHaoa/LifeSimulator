import { z } from "zod";

export const AttrsSchema = z.object({
  looks: z.number().int().min(0).max(100),
  wealth: z.number().int().min(0).max(100),
  health: z.number().int().min(0).max(100),
  luck: z.number().int().min(0).max(100),
});

export const HistoryEntrySchema = z.object({
  age: z.number().int().min(0),
  eventIds: z.array(z.string()),
  narrative: z.string(),
  fallback: z.boolean(),
});

export const GameStateSchema = z.object({
  schemaVersion: z.number().int().positive(),
  name: z.string().min(1).max(20),
  runSeed: z.number().int().min(0).max(0xffffffff),
  age: z.number().int().min(0),
  attrs: AttrsSchema,
  recentTags: z.array(z.string()).max(20),
  milestonesShown: z.record(z.string(), z.boolean()),
  history: z.array(HistoryEntrySchema),
});

export type GameState = z.infer<typeof GameStateSchema>;

export const YearApiRequestSchema = z.object({
  schemaVersion: z.number().int(),
  stream: z.boolean().optional(),
  state: GameStateSchema,
});

export type YearApiRequest = z.infer<typeof YearApiRequestSchema>;

export const YearApiResponseSchema = z.object({
  schemaVersion: z.number().int(),
  state: GameStateSchema,
  yearSummary: z.object({
    age: z.number().int(),
    eventIds: z.array(z.string()),
    narrative: z.string(),
    fallback: z.boolean(),
    engineFallback: z.boolean(),
    milestoneMessage: z.string().optional(),
  }),
});

export type YearApiResponse = z.infer<typeof YearApiResponseSchema>;

export const LlmNarrativeJsonSchema = z.object({
  text: z.string().min(1).max(2000),
});
