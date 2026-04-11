import { ATTR_MAX } from "@/lib/constants";

/**
 * Simplified age-specific annual death probability (q), loosely inspired by
 * population life-table orders of magnitude — tuned for gameplay, not actuarial use.
 * `age` is the age the character turns this year (after advancing).
 */
export function baselineAnnualDeathProbability(age: number): number {
  if (age < 1) return 0;
  if (age === 1) return 0.00035;
  if (age <= 4) return 0.00009;
  if (age <= 14) return 0.000025;
  if (age <= 24) return 0.00015;
  if (age <= 34) return 0.00028;
  if (age <= 44) return 0.00055;
  if (age <= 54) return 0.0012;
  if (age <= 64) return 0.0035;
  if (age <= 74) return 0.019;
  if (age <= 84) return 0.055;
  if (age <= 94) return 0.14;
  if (age <= 99) return 0.28;
  return Math.min(0.6, 0.28 + (age - 99) * 0.08);
}

/**
 * Maps current health (0..ATTR_MAX) to a multiplier on baseline mortality.
 * Low health increases risk; high health reduces it.
 */
export function healthMortalityMultiplier(health: number): number {
  const h = Math.max(0, Math.min(ATTR_MAX, health)) / ATTR_MAX;
  return 0.38 + 1.72 * (1 - h);
}

export function annualDeathChance(nextAge: number, health: number): number {
  const raw =
    baselineAnnualDeathProbability(nextAge) * healthMortalityMultiplier(health);
  return Math.min(0.999, Math.max(0, raw));
}

/** Returns true if the character dies when entering `nextAge` (one draw vs q_eff). */
export function rollDeathThisYear(
  rng: () => number,
  nextAge: number,
  healthBeforeYear: number
): boolean {
  const p = annualDeathChance(nextAge, healthBeforeYear);
  return rng() < p;
}
