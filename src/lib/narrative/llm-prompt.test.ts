import { describe, expect, it } from "vitest";
import { buildNarrativeSystemPrompt } from "./llm-prompt";

describe("buildNarrativeSystemPrompt", () => {
  it("requires english output for en locale", () => {
    const prompt = buildNarrativeSystemPrompt("en", "json");
    expect(prompt).toContain("Reply in English.");
  });

  it("requires chinese output for zh-CN locale", () => {
    const prompt = buildNarrativeSystemPrompt("zh-CN", "plain");
    expect(prompt).toContain("请用中文回复。");
  });
});
