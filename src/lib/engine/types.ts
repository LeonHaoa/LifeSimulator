import type { GameState } from "@/lib/schemas/game";

export type EventConditions = {
  looksMin?: number;
  looksMax?: number;
  wealthMin?: number;
  wealthMax?: number;
  healthMin?: number;
  healthMax?: number;
  luckMin?: number;
  luckMax?: number;
  ageMin?: number;
  ageMax?: number;
  nameMinChars?: number;
  requiresRecentTag?: string;
};

export type AttrDeltas = Partial<{
  looks: number;
  wealth: number;
  health: number;
  luck: number;
}>;

export type GameEvent = {
  id: string;
  tier: "common" | "rare" | "legendary";
  weight: number;
  tags: string[];
  conditions: EventConditions;
  deltas: AttrDeltas;
  title: string;
};

export type AdvanceYearResult = {
  nextState: GameState;
  pickedEvents: GameEvent[];
  engineFallback: boolean;
};
