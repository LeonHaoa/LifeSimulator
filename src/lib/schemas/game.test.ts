import { it, expect } from "vitest";
import { GameStateSchema } from "./game";

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
