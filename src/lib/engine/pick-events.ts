import type { GameEvent } from "./types";

function totalWeight(events: GameEvent[]): number {
  return events.reduce((s, e) => s + e.weight, 0);
}

export function pickWeighted(
  rng: () => number,
  pool: GameEvent[],
  count: number
): GameEvent[] {
  const bag = [...pool];
  const out: GameEvent[] = [];
  const n = Math.max(1, Math.min(3, count));
  for (let k = 0; k < n && bag.length > 0; k++) {
    const tw = totalWeight(bag);
    let r = rng() * tw;
    let idx = 0;
    for (let i = 0; i < bag.length; i++) {
      r -= bag[i].weight;
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    out.push(bag[idx]);
    bag.splice(idx, 1);
  }
  return out;
}
