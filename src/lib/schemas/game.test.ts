import { describe, expect, it } from "vitest";
import { GameStateSchema, YearApiRequestSchema } from "./game";

describe("schemas", () => {
  it("parses minimal valid GameState", () => {
    const parsed = GameStateSchema.parse({
      schemaVersion: 2,
      name: "张三",
      runSeed: 42,
      age: 0,
      attrs: {
        happiness: 10,
        health: 20,
        wealth: 30,
        career: 40,
        study: 50,
        social: 60,
        love: 70,
        marriage: 80,
      },
      recentTags: [],
      milestonesShown: {},
      history: [],
    });
    expect(parsed.age).toBe(0);
  });

  it("requires a supported locale in the yearly request", () => {
    const parsed = YearApiRequestSchema.safeParse({
      schemaVersion: 2,
      stream: true,
      locale: "zh-CN",
      state: {
        schemaVersion: 2,
        name: "Alex",
        runSeed: 1,
        age: 0,
        attrs: {
          happiness: 0,
          health: 0,
          wealth: 0,
          career: 0,
          study: 0,
          social: 0,
          love: 0,
          marriage: 0,
        },
        recentTags: [],
        milestonesShown: {},
        history: [],
      },
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.locale).toBe("zh-CN");
    }
  });
});
