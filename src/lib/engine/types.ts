import type { GameState } from "@/lib/schemas/game";
import type { Messages } from "@/lib/i18n/types";

export type EventConditions = {
  happinessMin?: number;
  happinessMax?: number;
  wealthMin?: number;
  wealthMax?: number;
  healthMin?: number;
  healthMax?: number;
  careerMin?: number;
  careerMax?: number;
  studyMin?: number;
  studyMax?: number;
  socialMin?: number;
  socialMax?: number;
  loveMin?: number;
  loveMax?: number;
  marriageMin?: number;
  marriageMax?: number;
  ageMin?: number;
  ageMax?: number;
  nameMinChars?: number;
  requiresRecentTag?: string;
};

export type AttrDeltas = Partial<{
  happiness: number;
  health: number;
  wealth: number;
  career: number;
  study: number;
  social: number;
  love: number;
  marriage: number;
}>;

export type GameEvent = {
  id: string;
  tier: "common" | "rare" | "legendary";
  weight: number;
  tags: string[];
  conditions: EventConditions;
  deltas: AttrDeltas;
  titleKey: keyof Messages["events"];
};

export type AdvanceYearResult = {
  nextState: GameState;
  pickedEvents: GameEvent[];
  engineFallback: boolean;
};
