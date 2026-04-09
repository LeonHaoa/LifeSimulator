import { it, expect } from "vitest";
import { advanceYear } from "./advance-year";
import type { GameState } from "@/lib/schemas/game";
import { loadEvents } from "./events";

const base: GameState = {
  schemaVersion: 2,
  name: "测",
  runSeed: 777,
  age: 0,
  attrs: {
    happiness: 50,
    health: 50,
    wealth: 20,
    career: 50,
    study: 50,
    social: 50,
    love: 50,
    marriage: 50,
  },
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
    attrs: {
      happiness: 1,
      health: 1,
      wealth: 1,
      career: 1,
      study: 1,
      social: 1,
      love: 1,
      marriage: 1,
    },
  };
  const r = advanceYear(blocked, onlyFallback);
  expect(r.engineFallback).toBe(true);
  expect(r.pickedEvents[0].id).toBe("fallback-breath");
});
