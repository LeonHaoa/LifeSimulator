import { describe, expect, it } from "vitest";
import { ATTR_MAX } from "@/lib/constants";
import {
  annualDeathChance,
  baselineAnnualDeathProbability,
  healthMortalityMultiplier,
  rollDeathThisYear,
} from "./mortality";

describe("mortality", () => {
  it("increases baseline q with age", () => {
    expect(baselineAnnualDeathProbability(20)).toBeLessThan(
      baselineAnnualDeathProbability(80)
    );
  });

  it("reduces risk at high health and raises it at low health", () => {
    expect(healthMortalityMultiplier(ATTR_MAX)).toBeLessThan(
      healthMortalityMultiplier(0)
    );
  });

  it("clamps annualDeathChance to [0, 0.999]", () => {
    expect(annualDeathChance(120, 0)).toBeLessThanOrEqual(0.999);
    expect(annualDeathChance(1, ATTR_MAX)).toBeGreaterThanOrEqual(0);
  });

  it("dies when rng draw is below effective probability", () => {
    expect(rollDeathThisYear(() => 0, 40, ATTR_MAX)).toBe(true);
    expect(rollDeathThisYear(() => 1, 40, ATTR_MAX)).toBe(false);
  });
});
