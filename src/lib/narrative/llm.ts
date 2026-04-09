import {
  LLM_TIMEOUT_MS,
  LLM_MAX_RETRIES,
  LLM_RETRY_DELAY_MS,
} from "@/lib/constants";
import type { AttrKey } from "@/lib/constants";
import { skillLabel } from "./skill-flavor";
import { LlmNarrativeJsonSchema } from "@/lib/schemas/game";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchLlmNarrative(input: {
  name: string;
  age: number;
  eventIds: string[];
  skillKey?: AttrKey;
}): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const base =
    process.env.OPENAI_BASE_URL?.replace(/\/$/, "") ||
    "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const userPayload: Record<string, unknown> = {
    name: input.name,
    age: input.age,
    eventIds: input.eventIds,
  };
  if (input.skillKey) {
    userPayload.skillFocus = skillLabel(input.skillKey);
  }

  const body = {
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          '你是中式吐槽叙事机。只输出 JSON：{"text":"..."}。3–8句中文，幽默损；若给出 skillFocus，要在结尾自然呼应这个维度（快乐/健康等），不要说教。',
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
      if (!res.ok) {
        if (attempt < LLM_MAX_RETRIES) {
          await sleep(LLM_RETRY_DELAY_MS);
          continue;
        }
        return null;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) {
        if (attempt < LLM_MAX_RETRIES) {
          await sleep(LLM_RETRY_DELAY_MS);
          continue;
        }
        return null;
      }
      const parsed = JSON.parse(raw) as unknown;
      const z = LlmNarrativeJsonSchema.safeParse(parsed);
      if (!z.success) {
        if (attempt < LLM_MAX_RETRIES) {
          await sleep(LLM_RETRY_DELAY_MS);
          continue;
        }
        return null;
      }
      return z.data.text;
    } catch {
      clearTimeout(t);
      if (attempt < LLM_MAX_RETRIES) {
        await sleep(LLM_RETRY_DELAY_MS);
        continue;
      }
      return null;
    }
  }
  return null;
}
