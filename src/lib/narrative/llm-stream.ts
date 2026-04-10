import {
  LLM_TIMEOUT_MS,
  LLM_MAX_RETRIES,
  LLM_RETRY_DELAY_MS,
} from "@/lib/constants";
import type { AttrKey } from "@/lib/constants";
import type { Locale } from "@/lib/i18n/types";
import { skillLabel } from "./skill-flavor";
import { buildNarrativeSystemPrompt } from "./llm-prompt";

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
  locale: Locale;
  name: string;
  age: number;
  eventIds: string[];
  skillKey?: AttrKey;
}): AsyncGenerator<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return;

  const base =
    process.env.OPENAI_BASE_URL?.replace(/\/$/, "") ||
    "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const userPayload: Record<string, unknown> = {
    name: input.name,
    age: input.age,
    eventIds: input.eventIds,
    locale: input.locale,
  };
  if (input.skillKey) {
    userPayload.skillFocus = skillLabel(input.locale, input.skillKey);
  }

  const body = {
    model,
    temperature: 0.45,
    stream: true,
    messages: [
      {
        role: "system",
        content: [
          buildNarrativeSystemPrompt(input.locale, "plain"),
          "Output plain text only. Do not use Markdown, numbering, or JSON.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify(userPayload),
      },
    ],
  };

  for (let attempt = 0; attempt <= LLM_MAX_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(t);

      if (!res.ok || !res.body) {
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
