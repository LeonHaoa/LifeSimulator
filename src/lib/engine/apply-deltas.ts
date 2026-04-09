import { ATTR_MAX } from "@/lib/constants";
import type { GameState } from "@/lib/schemas/game";
import type { GameEvent } from "./types";

function clamp(n: number): number {
  return Math.max(0, Math.min(ATTR_MAX, n));
}

export function applyEventDeltas(
  attrs: GameState["attrs"],
  picked: GameEvent[]
): GameState["attrs"] {
  let next = { ...attrs };
  for (const e of picked) {
    const d = e.deltas;
    (Object.keys(d) as (keyof typeof d)[]).forEach((k) => {
      const delta = d[k];
      if (delta != null && k in next) {
        next = { ...next, [k]: clamp(next[k] + delta) };
      }
    });
  }
  return next;
}

export function mergeRecentTags(
  prev: string[],
  picked: GameEvent[],
  max = 10
): string[] {
  const out = [...prev];
  for (const e of picked) {
    for (const t of e.tags) {
      if (t === "fallback") continue;
      if (!out.includes(t)) out.push(t);
    }
  }
  return out.slice(-max);
}
