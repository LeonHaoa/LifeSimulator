import { it, expect } from "vitest";
import { createInitialState } from "./initial-state";
import { SCHEMA_VERSION } from "@/lib/constants";

it("rejects empty name", () => {
  expect(() => createInitialState("")).toThrow();
});

it("creates state with runSeed from name", () => {
  const a = createInitialState("Bob");
  const b = createInitialState("bob");
  expect(a.runSeed).toBe(b.runSeed);
  expect(a.schemaVersion).toBe(SCHEMA_VERSION);
  expect(a.age).toBe(0);
});
