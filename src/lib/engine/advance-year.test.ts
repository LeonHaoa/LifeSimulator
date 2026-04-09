import { describe, it, expect } from "vitest";
import { advanceYear } from "./advance-year";
import type { GameState } from "@/lib/schemas/game";
import { loadEvents } from "./events";

const base: GameState = {
  schemaVersion: 1,
  name: "测",
  runSeed: 777,
  age: 0,
  attrs: { looks: 50, wealth: 20, health: 50, luck: 50 },
  recentTags: [],
  milestonesShown: {},
  history: [],
};

it("increments age by 1 and returns 1–3 events", () => {
  const events = loadEvents();
  const r = advanceYear(base, events);
  expect(r.nextState.age).toBe(1);
  expect(r.pickedEvents.length).toBeGreaterThanOrEqual(1);
  expect(r.pickedEvents.length).toBeLessThanOrEqual(3);
});

it("deterministic for same state and events order", () => {
  const events = loadEvents();
  const a = advanceYear(base, events);
  const b = advanceYear(base, events);
  expect(a.pickedEvents.map((e) => e.id)).toEqual(
    b.pickedEvents.map((e) => e.id)
  );
});

it("marks engineFallback when candidate pool was empty", () => {
  const onlyFallback = loadEvents().filter((e) => e.id === "fallback-breath");
  const blocked: GameState = {
    ...base,
    age: 5,
    attrs: { looks: 1, wealth: 1, health: 1, luck: 1 },
  };
  const r = advanceYear(blocked, onlyFallback);
  expect(r.engineFallback).toBe(true);
  expect(r.pickedEvents[0].id).toBe("fallback-breath");
});
