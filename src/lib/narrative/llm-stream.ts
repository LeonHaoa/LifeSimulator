import {
  LLM_TIMEOUT_MS,
  LLM_MAX_RETRIES,
  LLM_RETRY_DELAY_MS,
} from "@/lib/constants";
import type { AttrKey } from "@/lib/constants";
import type { GameState } from "@/lib/schemas/game";
import {
  buildNarrativeUserJson,
  NARRATIVE_SYSTEM_PLAIN,
} from "./llm-prompt";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseSseLines(
  chunk: string,
  carry: string
): { lines: string[]; rest: string } {
  const text = carry + chunk;
  const parts = text.split("\n");
  const rest = parts.pop() ?? "";
  return { lines: parts, rest };
}

/**
 * Stream plain-text narrative tokens from OpenAI chat completions (stream: true).
 */
export async function* streamLlmNarrativePlain(input: {
  name: string;
  age: number;
  runSeed: number;
  attrs: GameState["attrs"];
  historyForSkills: { skillAllocation?: AttrKey }[];
  eventIds: string[];
  eventTitles: string[];
  skillKey?: AttrKey;
}): AsyncGenerator<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return;

  const base =
    process.env.OPENAI_BASE_URL?.replace(/\/$/, "") ||
    "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const timeoutMs =
    Number.parseInt(process.env.LLM_TIMEOUT_MS || "", 10) || LLM_TIMEOUT_MS;

  const userContent = buildNarrativeUserJson(input);

  const bodyBase = {
    model,
    stream: true,
    messages: [
      {
        role: "system",
        content: NARRATIVE_SYSTEM_PLAIN,
      },
      {
        role: "user",
        content: userContent,
      },
    ],
  };

  const preferTempOne =
    model.toLowerCase().startsWith("kimi-") || /moonshot\.cn/i.test(base);
  const tempsToTry = preferTempOne ? [1] : [0.45, 1];

  for (let attempt = 0; attempt <= LLM_MAX_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      let res: Response | null = null;
      for (const temperature of tempsToTry) {
        res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({ ...bodyBase, temperature }),
          signal: ctrl.signal,
        });
        if (res.ok) break;
        if (res.status !== 400) continue;
        // Some providers (e.g. some Moonshot models) only allow temperature=1.
        // We'll retry with temperature=1 before giving up.
      }
      clearTimeout(t);

      if (!res || !res.ok || !res.body) {
        if (attempt < LLM_MAX_RETRIES) {
          await sleep(LLM_RETRY_DELAY_MS);
          continue;
        }
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let carry = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const { lines, rest } = parseSseLines(decoder.decode(value, { stream: true }), carry);
        carry = rest;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[];
            };
            const piece = json.choices?.[0]?.delta?.content;
            if (piece) yield piece;
          } catch {
            /* ignore partial JSON */
          }
        }
      }
      return;
    } catch {
      clearTimeout(t);
      if (attempt < LLM_MAX_RETRIES) {
        await sleep(LLM_RETRY_DELAY_MS);
        continue;
      }
      return;
    }
  }
}

export async function* streamTemplateChunks(
  text: string,
  chunkSize = 4,
  delayMs = 18
): AsyncGenerator<string> {
  for (let i = 0; i < text.length; i += chunkSize) {
    yield text.slice(i, i + chunkSize);
    await sleep(delayMs);
  }
}
