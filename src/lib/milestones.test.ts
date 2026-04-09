import { it, expect } from "vitest";
import { applyMilestone, type MilestonesShown } from "./milestones";

it("fires once per age gate", () => {
  const m: MilestonesShown = {};
  const a = applyMilestone(70, m);
  expect(a.message).toBeDefined();
  const b = applyMilestone(70, a.milestonesShown);
  expect(b.message).toBeUndefined();
});
