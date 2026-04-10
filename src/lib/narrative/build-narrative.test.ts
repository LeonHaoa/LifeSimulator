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
      eventIds: ["x"],
      eventTitles: ["Test event"],
      skillKey: "happiness",
    });
    expect(r.fallback).toBe(true);
    expect(r.text).toContain("Alex");
    expect(r.text.toLowerCase()).toContain("happiness");
  });
});
