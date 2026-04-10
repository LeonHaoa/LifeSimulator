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
      name: "张三",
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
      eventTitles: ["测试事件"],
      skillKey: "happiness",
    });
    expect(r.fallback).toBe(true);
    expect(r.text).toContain("张三");
    expect(r.text).toContain("快乐");
  });
});
