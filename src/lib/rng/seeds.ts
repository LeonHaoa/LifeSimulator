function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function normalizePlayerName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashNameToRunSeed(raw: string): number {
  return fnv1a32(normalizePlayerName(raw));
}

export function yearSeed(runSeed: number, ageAfterAdvance: number): number {
  return fnv1a32(`${runSeed}:${ageAfterAdvance}`);
}
