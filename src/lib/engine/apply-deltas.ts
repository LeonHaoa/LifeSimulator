import type { GameState } from "@/lib/schemas/game";
import type { GameEvent } from "./types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function applyEventDeltas(
  attrs: GameState["attrs"],
  picked: GameEvent[]
): GameState["attrs"] {
  let { looks, wealth, health, luck } = attrs;
  for (const e of picked) {
    const d = e.deltas;
    if (d.looks != null) looks = clamp(looks + d.looks);
    if (d.wealth != null) wealth = clamp(wealth + d.wealth);
    if (d.health != null) health = clamp(health + d.health);
    if (d.luck != null) luck = clamp(luck + d.luck);
  }
  return { looks, wealth, health, luck };
}

export function mergeRecentTags(
  prev: string[],
  picked: GameEvent[],
  max = 10
): string[] {
  const next = [...prev];
  for (const e of picked) {
    for (const t of e.tags) {
      if (t === "fallback") continue;
      if (!next.includes(t)) next.push(t);
    }
  }
  return next.slice(-max);
}
