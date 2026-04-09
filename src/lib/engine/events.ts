import type { GameEvent } from "./types";
import raw from "../../../data/events.json";

export function loadEvents(): GameEvent[] {
  return raw as GameEvent[];
}
