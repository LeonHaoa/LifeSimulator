import { it, expect } from "vitest";
import { hashNameToRunSeed, yearSeed } from "./seeds";
import { createMulberry32 } from "./mulberry32";

it("same name yields same runSeed", () => {
  expect(hashNameToRunSeed("  Alice  ")).toBe(hashNameToRunSeed("alice"));
});

it("yearSeed differs by year", () => {
  const r = 12345;
  expect(yearSeed(r, 1)).not.toBe(yearSeed(r, 2));
});

it("mulberry32 is deterministic", () => {
  const rng = createMulberry32(999);
  const a = rng();
  const b = rng();
  const rng2 = createMulberry32(999);
  expect(rng2()).toBe(a);
  expect(rng2()).toBe(b);
});
