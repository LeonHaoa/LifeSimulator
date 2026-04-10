import { describe, it, expect, afterEach } from "vitest";
import { buildNarrative } from "./build-narrative";

describe("buildNarrative", () => {
  const prev = process.env.OPENAI_API_KEY;

  afterEach(() => {
    process.env.OPENAI_API_KEY = prev;
  });

  it("uses template when no API key", async () => {
    process.env.OPENAI_API_KEY = "";
    const r = await buildNarrative({
      locale: "en",
      name: "Alex",
      age: 3,
      runSeed: 1,
      attrs: {
        happiness: 10,
        health: 10,
        wealth: 10,
        career: 10,
        study: 10,
        social: 10,
        love: 10,
        marriage: 10,
      },
      historyForSkills: [],
      eventIds: ["x"],
      eventTitles: ["Test event"],
      skillKey: "happiness",
    });
    expect(r.fallback).toBe(true);
    expect(r.text).toContain("Alex");
    expect(r.text.toLowerCase()).toContain("happiness");
  });
});
