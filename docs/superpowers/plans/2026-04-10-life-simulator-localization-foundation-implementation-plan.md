# LifeSimulator Localization Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the current hardcoded Chinese-only app into a bilingual `en` + `zh-CN` product flow with `en` as source locale, locale-aware fallback narrative, keyed event titles, and explicit locale instructions in every Kimi request.

**Architecture:** Add a small project-local i18n layer under `messages/` and `src/lib/i18n/`, then migrate visible UI copy, repeated labels, event titles, template narrative, and LLM prompt text onto that layer. Use a client locale context backed by `localStorage` for first-phase language selection, pass `locale` through both yearly APIs, and require both streaming and non-streaming narrative builders to produce text in the selected language.

**Tech Stack:** Next.js App Router, React, TypeScript, Zod, Vitest, existing OpenAI-compatible/Kimi integration, project-local dictionaries.

---

## File structure (modify / create)

| Path | Responsibility |
|------|----------------|
| `messages/en.ts` | Source locale dictionary and key ordering |
| `messages/zh-CN.ts` | zh-CN dictionary matching `en.ts` exactly |
| `src/lib/i18n/types.ts` | `Locale`, dictionary shape, translation key helpers |
| `src/lib/i18n/config.ts` | supported locales and fallback locale |
| `src/lib/i18n/dictionary.ts` | dictionary lookup and interpolation helpers |
| `src/lib/i18n/client-locale.tsx` | locale context, `localStorage` persistence, `useLocale`, `useTranslations` |
| `src/components/LocaleSwitcher.tsx` | reusable `en` / `zh-CN` toggle UI |
| `src/lib/constants.ts` | remove hardcoded visible labels; keep neutral constants only |
| `data/events.json` | replace event `title` with `titleKey` |
| `src/lib/engine/types.ts` | event type uses `titleKey` instead of localized title |
| `src/lib/engine/events.ts` | load typed event data with `titleKey` |
| `src/lib/schemas/game.ts` | add locale to yearly request schema |
| `src/app/layout.tsx` | wrap body with locale provider and update metadata baseline |
| `src/app/page.tsx` | localized loading label |
| `src/components/WelcomeScreen.tsx` | localized CTA + image alt + language switcher |
| `src/components/LifeDetailClient.tsx` | localized UI/system/error copy and locale-aware API requests |
| `src/lib/narrative/template.ts` | locale-aware fallback narrative |
| `src/lib/narrative/skill-flavor.ts` | locale-aware flavor lines and skill labels |
| `src/lib/narrative/llm-prompt.ts` | locale-aware prompt fragments and payload labels |
| `src/lib/narrative/llm.ts` | pass locale into JSON narrative requests |
| `src/lib/narrative/llm-stream.ts` | pass locale into streaming requests |
| `src/lib/narrative/build-narrative.ts` | central locale-aware narrative orchestration |
| `src/app/api/year/route.ts` | pass locale to buildNarrative and resolve event titles from keys |
| `src/app/api/year/stream/route.ts` | pass locale to streaming/template narrative and resolve event titles from keys |
| `src/lib/narrative/build-narrative.test.ts` | locale-aware fallback coverage |
| `src/lib/schemas/game.test.ts` | locale schema coverage |
| `src/lib/i18n/dictionary.test.ts` | dictionary parity and translation helper coverage |

**Implementation assumption:** first-phase language selection is a client-only toggle stored in `localStorage` under `life-simulator.locale`, with no route-level i18n.

---

### Task 1: Create the dictionary foundation and locale types

**Files:**
- Create: `messages/en.ts`
- Create: `messages/zh-CN.ts`
- Create: `src/lib/i18n/types.ts`
- Create: `src/lib/i18n/config.ts`
- Create: `src/lib/i18n/dictionary.ts`
- Test: `src/lib/i18n/dictionary.test.ts`

- [ ] **Step 1: Write the failing dictionary test**

```ts
import { describe, expect, it } from "vitest";
import { defaultLocale, isSupportedLocale } from "./config";
import { getDictionary, t } from "./dictionary";

describe("dictionary", () => {
  it("falls back to english for unsupported locales", () => {
    expect(defaultLocale).toBe("en");
    expect(isSupportedLocale("zh-CN")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(false);
  });

  it("keeps en and zh-CN dictionaries aligned", () => {
    const en = JSON.stringify(getDictionary("en"));
    const zh = JSON.stringify(getDictionary("zh-CN"));

    expect(Object.keys(JSON.parse(en))).toEqual(Object.keys(JSON.parse(zh)));
  });

  it("interpolates translated copy", () => {
    expect(
      t("en", "life.status.summary", {
        name: "Alex",
        age: 3,
        max: 10000,
      })
    ).toContain("Alex");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/lib/i18n/dictionary.test.ts`  
Expected: FAIL with missing module errors for `src/lib/i18n/*`.

- [ ] **Step 3: Define locale and dictionary types**

```ts
export const SUPPORTED_LOCALES = ["en", "zh-CN"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type MessageLeaf = string | ((params?: Record<string, string | number>) => string);

export type Messages = {
  common: {
    languageName: string;
    loading: string;
    back: string;
    audio: string;
    sfx: string;
    music: string;
  };
  welcome: {
    heroAlt: string;
    start: string;
  };
  life: {
    title: string;
    createCharacter: {
      title: string;
      description: string;
      placeholder: string;
      submit: string;
    };
    status: {
      title: string;
      summary: MessageLeaf;
    };
  };
  errors: {
    streamReadFailed: string;
    streamFailed: string;
    missingFinalState: string;
    createCharacterFailed: string;
    requestFailed: string;
  };
  stats: Record<
    | "happiness"
    | "health"
    | "wealth"
    | "career"
    | "study"
    | "social"
    | "love"
    | "marriage",
    { label: string }
  >;
  events: Record<string, { title: string }>;
  narrative: {
    idleLine: string;
    yearLine: MessageLeaf;
    skillFlavor: Record<string, string>;
  };
  llm: {
    roleJson: string;
    rolePlain: string;
    replyInEnglish: string;
    replyInChinese: string;
    noLanguageMixing: string;
  };
};
```

- [ ] **Step 4: Implement config and dictionary access**

```ts
import en from "../../../messages/en";
import zhCN from "../../../messages/zh-CN";
import { SUPPORTED_LOCALES, type Locale, type Messages } from "./types";

export const defaultLocale: Locale = "en";

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

const dictionaries: Record<Locale, Messages> = {
  en,
  "zh-CN": zhCN,
};

export function getDictionary(locale: string): Messages {
  return dictionaries[isSupportedLocale(locale) ? locale : defaultLocale];
}

export function t(
  locale: string,
  key: "life.status.summary",
  params: { name: string; age: number; max: number }
): string {
  const entry = getDictionary(locale).life.status.summary;
  return typeof entry === "function" ? entry(params) : entry;
}
```

- [ ] **Step 5: Add the first full dictionaries**

```ts
const en = {
  common: {
    languageName: "English",
    loading: "Loading",
    back: "Back to welcome",
    audio: "Audio",
    sfx: "SFX",
    music: "Music",
  },
  welcome: {
    heroAlt: "Life Simulator welcome screen",
    start: "Start Life",
  },
  life: {
    title: "Life Journey",
    createCharacter: {
      title: "Create Character",
      description:
        "Your eight starting attributes will be rolled from 0 to 100. Each year you assign skill points before the story advances.",
      placeholder: "Your name",
      submit: "Begin Life",
    },
    status: {
      title: "Character Status",
      summary: ({ name, age, max }) => `${name} · age ${age} · cap ${max} per stat`,
    },
  },
  errors: {
    streamReadFailed: "Unable to read streaming response",
    streamFailed: "Streaming narrative failed",
    missingFinalState: "Missing final game state",
    createCharacterFailed: "Failed to create character",
    requestFailed: "Request failed",
  },
  stats: {
    happiness: { label: "Happiness" },
    health: { label: "Health" },
    wealth: { label: "Wealth" },
    career: { label: "Career" },
    study: { label: "Study" },
    social: { label: "Social" },
    love: { label: "Love" },
    marriage: { label: "Marriage" },
  },
  events: {
    fallbackBreath: { title: "Another year somehow passed" },
    brick: { title: "You hauled bricks at the worksite" },
  },
  narrative: {
    idleLine: "Life keeps moving.",
    yearLine: ({ name, age, events }) => `${name} at age ${age}: ${events}.`,
    skillFlavor: {
      happiness: "You put your effort into happiness, and your mood carried a little more light this year.",
    },
  },
  llm: {
    roleJson: "You are the yearly narrator and blunt best friend of Life Simulator.",
    rolePlain: "Write a single plain-text yearly narrative.",
    replyInEnglish: "Reply in English.",
    replyInChinese: "请用中文回复。",
    noLanguageMixing:
      "Do not mix Chinese and English in normal prose unless a proper noun must remain unchanged.",
  },
} satisfies Messages;

export default en;
```

- [ ] **Step 6: Re-run the dictionary test**

Run: `npm run test -- src/lib/i18n/dictionary.test.ts`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add messages/en.ts messages/zh-CN.ts src/lib/i18n/types.ts src/lib/i18n/config.ts src/lib/i18n/dictionary.ts src/lib/i18n/dictionary.test.ts
git commit -m "feat: add bilingual dictionary foundation"
```

---

### Task 2: Add client locale state and language switcher

**Files:**
- Create: `src/lib/i18n/client-locale.tsx`
- Create: `src/components/LocaleSwitcher.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/WelcomeScreen.tsx`

- [ ] **Step 1: Write the failing locale provider test**

Create: `src/lib/i18n/client-locale.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider, useLocale } from "./client-locale";

function Probe() {
  const { locale } = useLocale();
  return <div>{locale}</div>;
}

describe("LocaleProvider", () => {
  it("defaults to english", () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    expect(screen.getByText("en")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/lib/i18n/client-locale.test.tsx`  
Expected: FAIL because `LocaleProvider` does not exist yet.

- [ ] **Step 3: Implement locale context with localStorage persistence**

```tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultLocale, isSupportedLocale } from "./config";
import type { Locale } from "./types";

const STORAGE_KEY = "life-simulator.locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isSupportedLocale(saved)) setLocaleState(saved);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale(next: Locale) {
        setLocaleState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.lang = next;
      },
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used within LocaleProvider");
  return value;
}
```

- [ ] **Step 4: Wrap the app and add a shared switcher**

```tsx
import { LocaleProvider } from "@/lib/i18n/client-locale";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
```

```tsx
"use client";

import { useLocale } from "@/lib/i18n/client-locale";

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="locale-switcher" role="group" aria-label="Language switcher">
      <button
        type="button"
        data-active={locale === "en"}
        onClick={() => setLocale("en")}
      >
        EN
      </button>
      <button
        type="button"
        data-active={locale === "zh-CN"}
        onClick={() => setLocale("zh-CN")}
      >
        中文
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Localize the welcome page entry points**

```tsx
const { locale } = useLocale();
const copy = getDictionary(locale);

<img alt={copy.welcome.heroAlt} ... />
<LocaleSwitcher />
<Link href="/life" className="welcome-btn">
  {copy.welcome.start}
</Link>
```

And in `src/app/page.tsx`:

```tsx
loading: () => (
  <div className="welcome-root" aria-busy="true" aria-label="Loading" />
),
```

- [ ] **Step 6: Re-run the provider test and type-check**

Run: `npm run test -- src/lib/i18n/client-locale.test.tsx`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/i18n/client-locale.tsx src/lib/i18n/client-locale.test.tsx src/components/LocaleSwitcher.tsx src/app/layout.tsx src/app/page.tsx src/components/WelcomeScreen.tsx
git commit -m "feat: add client locale switching"
```

---

### Task 3: Migrate shared labels, event titles, and yearly request schema

**Files:**
- Modify: `src/lib/constants.ts`
- Modify: `data/events.json`
- Modify: `src/lib/engine/types.ts`
- Modify: `src/lib/engine/events.ts`
- Modify: `src/lib/schemas/game.ts`
- Test: `src/lib/schemas/game.test.ts`

- [ ] **Step 1: Write the failing locale-schema test**

```ts
import { describe, expect, it } from "vitest";
import { YearApiRequestSchema } from "./game";

describe("YearApiRequestSchema", () => {
  it("requires a supported locale", () => {
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
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/lib/schemas/game.test.ts`  
Expected: FAIL because `locale` is not part of the schema yet.

- [ ] **Step 3: Make constants locale-neutral**

```ts
export const ATTR_KEYS = [
  "happiness",
  "health",
  "wealth",
  "career",
  "study",
  "social",
  "love",
  "marriage",
] as const;

export type AttrKey = (typeof ATTR_KEYS)[number];

export const EVENT_KEY_BY_ID = {
  "fallback-breath": "fallbackBreath",
  brick: "brick",
  debut: "debut",
  gaokao: "gaokao",
  "tag-bonus-after-work": "tagBonusAfterWork",
  "easter-name-long": "easterNameLong",
} as const;
```

- [ ] **Step 4: Replace event titles with title keys**

```json
{
  "id": "fallback-breath",
  "tier": "common",
  "weight": 1,
  "tags": ["fallback"],
  "conditions": {},
  "deltas": {},
  "titleKey": "fallbackBreath"
}
```

And in the event type:

```ts
export type GameEvent = {
  id: string;
  tier: "common" | "rare";
  weight: number;
  tags: string[];
  conditions: EventConditions;
  deltas: Partial<Record<AttrKey, number>>;
  titleKey: keyof Messages["events"];
};
```

- [ ] **Step 5: Add locale to the request schema**

```ts
import { z } from "zod";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";

export const LocaleSchema = z.enum(SUPPORTED_LOCALES);

export const YearApiRequestSchema = z.object({
  schemaVersion: z.number().int(),
  stream: z.boolean().optional(),
  locale: LocaleSchema,
  state: GameStateSchema,
});
```

- [ ] **Step 6: Re-run the schema test**

Run: `npm run test -- src/lib/schemas/game.test.ts`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/constants.ts data/events.json src/lib/engine/types.ts src/lib/engine/events.ts src/lib/schemas/game.ts src/lib/schemas/game.test.ts
git commit -m "feat: add locale-aware schema and event title keys"
```

---

### Task 4: Localize the life screen and send locale in yearly requests

**Files:**
- Modify: `src/components/LifeDetailClient.tsx`
- Modify: `src/lib/constants.ts` (remove `ATTR_LABELS` consumers)

- [ ] **Step 1: Write the failing UI request test**

Create: `src/components/LifeDetailClient.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/lib/i18n/client-locale";
import { LifeDetailClient } from "./LifeDetailClient";

describe("LifeDetailClient", () => {
  it("shows english character creation copy by default", () => {
    render(
      <LocaleProvider>
        <LifeDetailClient />
      </LocaleProvider>
    );

    expect(screen.getByText("Create Character")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/components/LifeDetailClient.test.tsx`  
Expected: FAIL because the component still renders Chinese hardcoded copy.

- [ ] **Step 3: Replace hardcoded labels with dictionary lookups**

```tsx
const { locale } = useLocale();
const copy = getDictionary(locale);

async function consumeYearStream(
  locale: Locale,
  state: GameState,
  onDelta: (t: string) => void
): Promise<YearApiResponse> {
  const res = await fetch("/api/year/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      stream: true,
      locale,
      state,
    }),
  });

  if (!res.body) {
    throw new Error(copy.errors.streamReadFailed);
  }
}
```

- [ ] **Step 4: Resolve stat labels through translations instead of `ATTR_LABELS`**

```tsx
{ATTR_KEYS.map((key) => (
  <div key={key} className="stat-card">
    <div className="stat-card__label">{copy.stats[key].label}</div>
    <div className="stat-card__value">{state.attrs[key]}</div>
  </div>
))}
```

For repeated dynamic lines, move string assembly into dictionaries:

```tsx
<p>{t(locale, "life.status.summary", { name: state.name, age: state.age, max: ATTR_MAX })}</p>
```

- [ ] **Step 5: Add the switcher and pass locale to both flow entry points**

```tsx
<div className="life-header__tools">
  <LocaleSwitcher />
  <Link href="/" className="mini-btn">
    {copy.common.back}
  </Link>
</div>
```

And in `startYear`:

```tsx
const result = await consumeYearStream(locale, prepared, (t) => {
  heldStreamQueueRef.current += t;
});
```

- [ ] **Step 6: Re-run the UI test and build**

Run: `npm run test -- src/components/LifeDetailClient.test.tsx`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/LifeDetailClient.tsx src/components/LifeDetailClient.test.tsx
git commit -m "feat: localize life detail UI and request locale"
```

---

### Task 5: Make fallback narrative and skill flavor locale-aware

**Files:**
- Modify: `src/lib/narrative/template.ts`
- Modify: `src/lib/narrative/skill-flavor.ts`
- Modify: `src/lib/narrative/build-narrative.ts`
- Test: `src/lib/narrative/build-narrative.test.ts`

- [ ] **Step 1: Write the failing fallback-locale test**

```ts
import { afterEach, describe, expect, it } from "vitest";
import { buildNarrative } from "./build-narrative";

describe("buildNarrative", () => {
  const prev = process.env.OPENAI_API_KEY;

  afterEach(() => {
    process.env.OPENAI_API_KEY = prev;
  });

  it("uses english fallback narrative when locale is en", async () => {
    process.env.OPENAI_API_KEY = "";
    const result = await buildNarrative({
      locale: "en",
      name: "Alex",
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
      eventIds: ["fallback-breath"],
      eventTitles: ["Another year somehow passed"],
      skillKey: "happiness",
    });

    expect(result.fallback).toBe(true);
    expect(result.text).toContain("Alex");
    expect(result.text).toContain("happiness");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/lib/narrative/build-narrative.test.ts`  
Expected: FAIL because fallback narrative is still hardcoded in Chinese.

- [ ] **Step 3: Make templateNarrative and skillFlavorLine accept locale**

```ts
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";

export function skillFlavorLine(locale: Locale, key: AttrKey): string {
  return getDictionary(locale).narrative.skillFlavor[key];
}

export function skillLabel(locale: Locale, key: AttrKey): string {
  return getDictionary(locale).stats[key].label;
}

export function templateNarrative(
  locale: Locale,
  name: string,
  age: number,
  eventTitles: string[],
  skillKey?: AttrKey
): string {
  const copy = getDictionary(locale);
  const eventText = eventTitles.join(locale === "zh-CN" ? "；" : "; ");
  let body = typeof copy.narrative.yearLine === "function"
    ? copy.narrative.yearLine({ name, age, events: eventText })
    : copy.narrative.yearLine;

  body += skillKey
    ? ` ${skillFlavorLine(locale, skillKey)}`
    : ` ${copy.narrative.idleLine}`;

  return body;
}
```

- [ ] **Step 4: Thread locale through buildNarrative**

```ts
export async function buildNarrative(input: {
  locale: Locale;
  name: string;
  age: number;
  runSeed: number;
  attrs: GameState["attrs"];
  historyForSkills: GameState["history"];
  eventIds: string[];
  eventTitles: string[];
  skillKey?: AttrKey;
}): Promise<{ text: string; fallback: boolean }> {
  const llm = await fetchLlmNarrative(input);
  if (llm) return { text: llm, fallback: false };

  return {
    text: templateNarrative(
      input.locale,
      input.name,
      input.age,
      input.eventTitles,
      input.skillKey
    ),
    fallback: true,
  };
}
```

- [ ] **Step 5: Re-run narrative tests**

Run: `npm run test -- src/lib/narrative/build-narrative.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/narrative/template.ts src/lib/narrative/skill-flavor.ts src/lib/narrative/build-narrative.ts src/lib/narrative/build-narrative.test.ts
git commit -m "feat: localize fallback narrative output"
```

---

### Task 6: Localize Kimi prompt generation and both yearly APIs

**Files:**
- Modify: `src/lib/narrative/llm-prompt.ts`
- Modify: `src/lib/narrative/llm.ts`
- Modify: `src/lib/narrative/llm-stream.ts`
- Modify: `src/app/api/year/route.ts`
- Modify: `src/app/api/year/stream/route.ts`

- [ ] **Step 1: Write the failing prompt-language test**

Create: `src/lib/narrative/llm-prompt.test.ts`

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/lib/narrative/llm-prompt.test.ts`  
Expected: FAIL because prompts are still fixed in Chinese constants.

- [ ] **Step 3: Replace prompt constants with locale-aware prompt builders**

```ts
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";

export function buildNarrativeSystemPrompt(
  locale: Locale,
  mode: "json" | "plain"
): string {
  const copy = getDictionary(locale).llm;
  const replyInstruction =
    locale === "en" ? copy.replyInEnglish : copy.replyInChinese;

  return [
    mode === "json" ? copy.roleJson : copy.rolePlain,
    replyInstruction,
    copy.noLanguageMixing,
  ].join("\n");
}
```

- [ ] **Step 4: Thread locale into both LLM callers**

```ts
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
  const userContent = buildNarrativeUserJson(input);
  const messages = [
    { role: "system", content: buildNarrativeSystemPrompt(input.locale, "json") },
    { role: "user", content: userContent },
  ];
}
```

And in stream mode:

```ts
messages: [
  {
    role: "system",
    content: buildNarrativeSystemPrompt(input.locale, "plain"),
  },
  {
    role: "user",
    content: userContent,
  },
],
```

- [ ] **Step 5: Resolve event titles from title keys inside both APIs**

```ts
const locale = parsed.data.locale;
const copy = getDictionary(locale);

const eventIds = pickedEvents.map((event) => event.id);
const eventTitles = pickedEvents.map((event) => copy.events[event.titleKey].title);

const narrative = await buildNarrative({
  locale,
  name: advanced.name,
  age: advanced.age,
  runSeed: advanced.runSeed,
  attrs: advanced.attrs,
  historyForSkills: parsed.data.state.history,
  eventIds,
  eventTitles,
  skillKey: skillAlloc,
});
```

And in the stream route:

```ts
const locale = parsed.data.locale;
const eventTitles = pickedEvents.map((event) => copy.events[event.titleKey].title);

const templateText = templateNarrative(
  locale,
  advanced.name,
  advanced.age,
  eventTitles,
  skillAlloc
);
```

- [ ] **Step 6: Re-run prompt and API-adjacent tests**

Run: `npm run test -- src/lib/narrative/llm-prompt.test.ts src/lib/narrative/build-narrative.test.ts src/lib/schemas/game.test.ts`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/narrative/llm-prompt.ts src/lib/narrative/llm-prompt.test.ts src/lib/narrative/llm.ts src/lib/narrative/llm-stream.ts src/app/api/year/route.ts src/app/api/year/stream/route.ts
git commit -m "feat: localize kimi prompts and yearly narrative APIs"
```

---

### Task 7: Final validation, documentation touch-ups, and manual QA checklist

**Files:**
- Modify: `README.md`
- Modify: `localization_profile.md`
- Modify: `localization_terminology.md`

- [ ] **Step 1: Update README language notes**

Add a concise section like:

```md
## Localization

- Source locale: `en`
- Supported locales in current phase: `en`, `zh-CN`
- The current locale is selected in the client UI and sent to yearly APIs.
- Kimi requests explicitly instruct the model to answer in the selected language.
```

- [ ] **Step 2: Mark profile and terminology progress**

Append brief status notes:

```md
Notes:
- Dictionary foundation implemented
- Event titles now resolve from `titleKey`
- Locale is persisted in client storage during the current phase
```

- [ ] **Step 3: Run the full automated validation**

Run: `npm run lint`  
Expected: PASS

Run: `npm run test`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

- [ ] **Step 4: Run manual bilingual QA**

Check these flows manually:

1. Switch to `EN` on the welcome page, then enter `/life` and confirm UI labels remain English.
2. Create a character in `EN`, advance one year, and confirm fallback narrative is English when `OPENAI_API_KEY` is empty.
3. Switch to `中文`, repeat the same flow, and confirm all visible labels and fallback narrative are Chinese.
4. With Kimi enabled, inspect server logs or response content and confirm the generated narrative matches the selected locale in both JSON and stream paths.
5. Confirm event titles, stat labels, and error messages do not leak the wrong language.

- [ ] **Step 5: Commit**

```bash
git add README.md localization_profile.md localization_terminology.md
git commit -m "docs: document bilingual localization flow"
```

---

## Self-review checklist

Spec coverage check:

1. source locale policy is implemented in Task 1 dictionary ownership and Task 3 schema/event normalization
2. visible UI copy migration is implemented in Task 2 and Task 4
3. event title key normalization is implemented in Task 3 and consumed in Task 6
4. locale-aware fallback narrative is implemented in Task 5
5. Kimi language control is implemented in Task 6
6. validation requirements are covered in Task 7

Placeholder scan:

1. no `TODO` or `TBD` placeholders remain in tasks
2. each code-changing task includes concrete file paths, code snippets, and run commands

Type consistency check:

1. locale type is always `Locale`
2. request payload always uses `locale`
3. event display data always uses `titleKey`

