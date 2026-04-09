import { describe, it, expect } from "vitest";
import { GameStateSchema } from "./game";

it("parses minimal valid GameState", () => {
  const parsed = GameStateSchema.parse({
    schemaVersion: 1,
    name: "张三",
    runSeed: 42,
    age: 0,
    attrs: { looks: 50, wealth: 50, health: 50, luck: 50 },
    recentTags: [],
    milestonesShown: {},
    history: [],
  });
  expect(parsed.age).toBe(0);
});
