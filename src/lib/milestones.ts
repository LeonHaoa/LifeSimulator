import { MILESTONE_AGES, MILESTONE_COPY } from "@/lib/constants";

export type MilestonesShown = Record<string, boolean>;

export function applyMilestone(
  age: number,
  milestonesShown: MilestonesShown
): { milestonesShown: MilestonesShown; message?: string } {
  const key = String(age);
  if (!(MILESTONE_AGES as readonly number[]).includes(age)) {
    return { milestonesShown: { ...milestonesShown } };
  }
  if (milestonesShown[key]) {
    return { milestonesShown: { ...milestonesShown } };
  }
  const next = { ...milestonesShown, [key]: true };
  return { milestonesShown: next, message: MILESTONE_COPY };
}
