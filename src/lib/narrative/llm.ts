import {
  LLM_TIMEOUT_MS,
  LLM_MAX_RETRIES,
  LLM_RETRY_DELAY_MS,
} from "@/lib/constants";
import type { AttrKey } from "@/lib/constants";
import type { Locale } from "@/lib/i18n/types";
import { LlmNarrativeJsonSchema, type GameState } from "@/lib/schemas/game";
import {
  buildNarrativeSystemPrompt,
  buildNarrativeUserJson,
} from "./llm-prompt";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function tryParseJsonObjectish(raw: string): unknown | null {
  const text = raw.trim();
  if (!text) return null;

  const unfenced = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const first = unfenced.indexOf("{");
  const last = unfenced.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;

  const slice = unfenced.slice(first, last + 1);
  try {
    return JSON.parse(slice) as unknown;
  } catch {
    return null;
  }
}

export async function fetchLlmNarrative(input: {
  locale: Locale;
  name: string;
  age: number;
  runSeed: number;
  attrs: GameState["attrs"];
  historyForSkills: { skillAllocation?: AttrKey }[];
  eventIds: string[];
  eventTitles: string[];
  skillKey?: AttrKey;
}): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  const debug = process.env.LLM_DEBUG === "1";

  if (debug) {
    console.warn(
      `[llm] debug enabled: keyPresent=${Boolean(key)} base=${
        process.env.OPENAI_BASE_URL?.replace(/\/$/, "") || "https://api.openai.com/v1"
      } model=${process.env.OPENAI_MODEL || "gpt-4o-mini"} locale=${input.locale}`
    );
  }
  if (!key) {
    if (debug) console.warn("[llm] OPENAI_API_KEY missing; using template fallback");
    return null;
  }

  const base =
    process.env.OPENAI_BASE_URL?.replace(/\/$/, "") ||
    "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const timeoutMs =
    Number.parseInt(process.env.LLM_TIMEOUT_MS || "", 10) || LLM_TIMEOUT_MS;

  const userContent = buildNarrativeUserJson(input);
  const messages = [
    { role: "system", content: buildNarrativeSystemPrompt(input.locale, "json") },
    { role: "user", content: userContent },
  ];

  function makeBody(opts: { withResponseFormat: boolean; temperature: number }) {
    const body: Record<string, unknown> = {
      model,
      temperature: opts.temperature,
      messages,
    };
    if (opts.withResponseFormat) {
      body.response_format = { type: "json_object" };
    }
    return body;
  }

  async function readErrorText(res: Response): Promise<string> {
    try {
      return await res.text();
    } catch {
      return "";
    }
  }

  function isInvalidTemperature(msg: string): boolean {
    return /invalid temperature/i.test(msg);
  }

  const preferTempOne =
    model.toLowerCase().startsWith("kimi-") || /moonshot\.cn/i.test(base);
  const tempsToTry = preferTempOne ? [1] : [0.4, 1];

  for (let attempt = 0; attempt <= LLM_MAX_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const callOnce = async (body: unknown) =>
        fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });

      const bodiesToTry: Array<{ withResponseFormat: boolean; temperature: number }> = [];
      for (const temperature of tempsToTry) bodiesToTry.push({ withResponseFormat: true, temperature });
      for (const temperature of tempsToTry) bodiesToTry.push({ withResponseFormat: false, temperature });

      let res: Response | null = null;
      let lastErrText = "";
      for (const opts of bodiesToTry) {
        res = await callOnce(makeBody(opts));
        if (res.ok) break;
        if (res.status !== 400) continue;
        lastErrText = await readErrorText(res);
        if (debug && lastErrText) {
          console.warn(
            `[llm] 400 from provider (will retry compat variants): ${lastErrText.slice(0, 240)}`
          );
        }
        if (!isInvalidTemperature(lastErrText) && opts.withResponseFormat === false) {
          break;
        }
      }

      clearTimeout(timer);

      if (!res || !res.ok) {
        if (debug) {
          const errText = res ? await readErrorText(res) : lastErrText;
          console.warn(
            `[llm] non-OK response: status=${
              res ? res.status : "no_response"
            } base=${base} model=${model} body=${errText.slice(0, 400)}`
          );
        }
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

      const parsed = tryParseJsonObjectish(raw);
      if (!parsed) {
        if (debug) {
          console.warn(`[llm] could not parse JSON from content: ${raw.slice(0, 400)}`);
        }
        if (attempt < LLM_MAX_RETRIES) {
          await sleep(LLM_RETRY_DELAY_MS);
          continue;
        }
        return null;
      }

      const zodResult = LlmNarrativeJsonSchema.safeParse(parsed);
      if (!zodResult.success) {
        if (debug) {
          console.warn(
            `[llm] JSON parsed but schema invalid: ${JSON.stringify(
              zodResult.error.flatten()
            ).slice(0, 400)}`
          );
        }
        if (attempt < LLM_MAX_RETRIES) {
          await sleep(LLM_RETRY_DELAY_MS);
          continue;
        }
        return null;
      }

      return zodResult.data.text;
    } catch (error) {
      clearTimeout(timer);
      if (debug) {
        console.warn(
          `[llm] request failed (attempt ${attempt + 1}/${LLM_MAX_RETRIES + 1}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      if (attempt < LLM_MAX_RETRIES) {
        await sleep(LLM_RETRY_DELAY_MS);
        continue;
      }
      return null;
    }
  }

  return null;
}
