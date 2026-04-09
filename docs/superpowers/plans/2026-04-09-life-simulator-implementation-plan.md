# LifeSimulator (中式人生模拟器) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Cloudflare-deployable Next.js demo: name → seeded stats → yearly events from a pure engine + `POST /api/year` with OpenAI-compatible LLM (retries, timeout) always returning **HTTP 200** and full state via **template fallback** when needed; client atomic apply + export JSON; milestones at 70/80/90/100.

**Architecture:** **Single Next.js app** at repository root `LifeSimulator/` (no monorepo). **Deterministic** `runSeed` / `yearSeed` drive **mulberry32** RNG inside **`advanceYear`** (no `Math.random`, no network). **Route Handler** runs validate → `advanceYear` → `buildNarrative` (LLM with **12s** timeout, **2** retries, **300ms** backoff; then template). **Static `data/events.json`** imported at build time. Client keeps `GameState` in React state; on success replaces atomically; on failure reverts in-memory snapshot. **`stream: true`** accepted in API body but **ignored** until phase 2 (README).

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5, Zod 3, Vitest 3, `fetch` + `AbortSignal` for LLM, Cloudflare Pages via current **OpenNext for Cloudflare** (or official Next-on-Workers) workflow from Cloudflare docs.

**Spec sources:** `docs/specs/2026-04-09-life-simulator-features-design.md`, `docs/life-simulator-closed-loop-spec.md`.

---

## File structure (create / own)

| Path | Responsibility |
|------|----------------|
| `package.json` | Scripts: `dev`, `build`, `start`, `test`, `test:watch`, `lint` |
| `tsconfig.json` | Strict; `paths` `@/*` → `./src/*` |
| `next.config.ts` | Next config; leave compatible with chosen CF adapter |
| `vitest.config.ts` | `environment: 'node'`; include `src/**/*.test.ts` |
| `.env.example` | `OPENAI_API_KEY=`, `OPENAI_BASE_URL=` (optional), `OPENAI_MODEL=` |
| `data/events.json` | Event pool (id, tier, weight, tags, conditions, deltas, title) |
| `src/lib/constants.ts` | `SCHEMA_VERSION`, `LLM_TIMEOUT_MS`, `LLM_MAX_RETRIES`, `LLM_RETRY_DELAY_MS`, milestone string |
| `src/lib/schemas/game.ts` | Zod: `GameState`, `YearApiRequest`, `YearApiResponse` |
| `src/lib/rng/mulberry32.ts` | Seeded PRNG |
| `src/lib/rng/seeds.ts` | `hashNameToRunSeed`, `yearSeed` |
| `src/lib/engine/types.ts` | `GameEvent`, `AdvanceYearResult` |
| `src/lib/engine/events.ts` | `loadEvents(): GameEvent[]` from JSON import |
| `src/lib/engine/filter-events.ts` | Filter by conditions + `recentTags` bias |
| `src/lib/engine/pick-events.ts` | Weighted pick 1–3 |
| `src/lib/engine/apply-deltas.ts` | Clamp attrs 0–100 |
| `src/lib/engine/advance-year.ts` | Orchestrate filter → pick → deltas → tags |
| `src/lib/engine/initial-state.ts` | `createInitialState(name)` |
| `src/lib/narrative/template.ts` | Template lines from event ids + name |
| `src/lib/narrative/llm.ts` | OpenAI-compatible JSON response + Zod |
| `src/lib/narrative/build-narrative.ts` | Try LLM → always template shape |
| `src/lib/milestones.ts` | `computeMilestoneMessage(age, prevMilestones)` |
| `src/app/api/year/route.ts` | `POST` handler, **always 200** on valid body |
| `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` | UI |
| `src/components/GameClient.tsx` | Client-only state, fetch, export, loading |
| `README.md` | Seeds, env, CF deploy, stream reserved, refresh behavior |

---

### Task 1: Scaffold project and tooling

**Files:**
- Create: `LifeSimulator/package.json`
- Create: `LifeSimulator/tsconfig.json`
- Create: `LifeSimulator/next.config.ts`
- Create: `LifeSimulator/.gitignore`
- Create: `LifeSimulator/.env.example`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "life-simulator",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Install**

Run: `cd LifeSimulator && npm install`  
Expected: `node_modules` created, no errors.

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 4b: Write `vitest.config.ts`** (alias `@` for tests)

```ts
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 5: Write `.env.example`**

```env
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-4o-mini
```

- [ ] **Step 6: Write `.gitignore`**

```gitignore
node_modules
.next
.env
.env.local
.DS_Store
dist
coverage
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts .gitignore .env.example
git commit -m "chore: scaffold Next.js app with vitest and zod"
```

---

### Task 2: Constants and Zod schemas

**Files:**
- Create: `src/lib/constants.ts`
- Create: `src/lib/schemas/game.ts`

- [ ] **Step 1: Write failing test for schema parse**

Create: `src/lib/schemas/game.test.ts`

```ts
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
```

- [ ] **Step 2: Run test (expect fail)**

Run: `npm run test -- src/lib/schemas/game.test.ts`  
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/constants.ts`**

```ts
export const SCHEMA_VERSION = 1;

/** Single LLM call timeout (ms). Spec: 10–15s; default 12s. */
export const LLM_TIMEOUT_MS = 12_000;

/** Retries after first failure (spec: 2 → max 3 outbound). */
export const LLM_MAX_RETRIES = 2;

export const LLM_RETRY_DELAY_MS = 300;

export const MILESTONE_AGES = [70, 80, 90, 100] as const;

export const MILESTONE_COPY =
  "哇哦，你达到70、80、90、100岁的门槛了\n";
```

- [ ] **Step 4: Implement `src/lib/schemas/game.ts`**

```ts
import { z } from "zod";

export const AttrsSchema = z.object({
  looks: z.number().int().min(0).max(100),
  wealth: z.number().int().min(0).max(100),
  health: z.number().int().min(0).max(100),
  luck: z.number().int().min(0).max(100),
});

export const HistoryEntrySchema = z.object({
  age: z.number().int().min(0),
  eventIds: z.array(z.string()),
  narrative: z.string(),
  fallback: z.boolean(),
});

export const GameStateSchema = z.object({
  schemaVersion: z.number().int().positive(),
  name: z.string().min(1).max(20),
  runSeed: z.number().int().min(0).max(0xffffffff),
  age: z.number().int().min(0),
  attrs: AttrsSchema,
  recentTags: z.array(z.string()).max(20),
  milestonesShown: z.record(z.string(), z.boolean()),
  history: z.array(HistoryEntrySchema),
});

export type GameState = z.infer<typeof GameStateSchema>;

export const YearApiRequestSchema = z.object({
  schemaVersion: z.number().int(),
  stream: z.boolean().optional(),
  state: GameStateSchema,
});

export type YearApiRequest = z.infer<typeof YearApiRequestSchema>;

export const YearApiResponseSchema = z.object({
  schemaVersion: z.number().int(),
  state: GameStateSchema,
  yearSummary: z.object({
    age: z.number().int(),
    eventIds: z.array(z.string()),
    narrative: z.string(),
    fallback: z.boolean(),
    engineFallback: z.boolean(),
    milestoneMessage: z.string().optional(),
  }),
});

export type YearApiResponse = z.infer<typeof YearApiResponseSchema>;

export const LlmNarrativeJsonSchema = z.object({
  text: z.string().min(1).max(2000),
});
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/lib/schemas/game.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/constants.ts src/lib/schemas/game.ts src/lib/schemas/game.test.ts
git commit -m "feat: add Zod schemas and timing constants"
```

---

### Task 3: Seeded RNG and name → runSeed

**Files:**
- Create: `src/lib/rng/mulberry32.ts`
- Create: `src/lib/rng/seeds.ts`
- Create: `src/lib/rng/seeds.test.ts`

- [ ] **Step 1: Write failing test**

Create: `src/lib/rng/seeds.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { hashNameToRunSeed, yearSeed } from "./seeds";
import { createMulberry32 } from "./mulberry32";

it("same name yields same runSeed", () => {
  expect(hashNameToRunSeed("  Alice  ")).toBe(hashNameToRunSeed("alice"));
});

it("yearSeed differs by year", () => {
  const r = 12345;
  expect(yearSeed(r, 1)).not.toBe(yearSeed(r, 2));
});

it("mulberry32 is deterministic", () => {
  const rng = createMulberry32(999);
  const a = rng();
  const b = rng();
  const rng2 = createMulberry32(999);
  expect(rng2()).toBe(a);
  expect(rng2()).toBe(b);
});
```

- [ ] **Step 2: Run test (expect fail)**

Run: `npm run test -- src/lib/rng/seeds.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement `src/lib/rng/mulberry32.ts`**

```ts
export function createMulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 4: Implement `src/lib/rng/seeds.ts`**

```ts
function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function normalizePlayerName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashNameToRunSeed(raw: string): number {
  return fnv1a32(normalizePlayerName(raw));
}

export function yearSeed(runSeed: number, ageAfterAdvance: number): number {
  return fnv1a32(`${runSeed}:${ageAfterAdvance}`);
}
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/lib/rng/seeds.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/rng/mulberry32.ts src/lib/rng/seeds.ts src/lib/rng/seeds.test.ts
git commit -m "feat: deterministic mulberry32 and seed derivation"
```

---

### Task 4: Event data and engine types

**Files:**
- Create: `data/events.json`
- Create: `src/lib/engine/types.ts`
- Create: `src/lib/engine/events.ts`

- [ ] **Step 1: Write `data/events.json`** (minimal pool; extend later)

```json
[
  {
    "id": "fallback-breath",
    "tier": "common",
    "weight": 1,
    "tags": ["fallback"],
    "conditions": {},
    "deltas": {},
    "title": "又混过了一年"
  },
  {
    "id": "brick",
    "tier": "common",
    "weight": 8,
    "tags": ["work", "poor"],
    "conditions": { "wealthMax": 35 },
    "deltas": { "wealth": 1, "health": -1 },
    "title": "工地搬砖"
  },
  {
    "id": "debut",
    "tier": "rare",
    "weight": 3,
    "tags": ["showbiz"],
    "conditions": { "looksMin": 75, "ageMin": 16 },
    "deltas": { "looks": 1, "wealth": 2 },
    "title": "被星探递名片"
  },
  {
    "id": "gaokao",
    "tier": "common",
    "weight": 6,
    "tags": ["school"],
    "conditions": { "ageMin": 17, "ageMax": 19, "wealthMax": 60 },
    "deltas": { "luck": 1, "health": -1 },
    "title": "高三，卷子比人高"
  },
  {
    "id": "tag-bonus-after-work",
    "tier": "common",
    "weight": 10,
    "tags": ["callback"],
    "conditions": { "requiresRecentTag": "work" },
    "deltas": { "wealth": 1 },
    "title": "工头觉得你手速快，多给一盒饭"
  },
  {
    "id": "easter-name-long",
    "tier": "rare",
    "weight": 50,
    "tags": ["easter"],
    "conditions": { "nameMinChars": 4 },
    "deltas": { "luck": 1 },
    "title": "名字够长，算命先生多送半句"
  }
]
```

- [ ] **Step 2: Write `src/lib/engine/types.ts`**

```ts
import type { GameState } from "@/lib/schemas/game";

export type EventConditions = {
  looksMin?: number;
  looksMax?: number;
  wealthMin?: number;
  wealthMax?: number;
  healthMin?: number;
  healthMax?: number;
  luckMin?: number;
  luckMax?: number;
  ageMin?: number;
  ageMax?: number;
  nameMinChars?: number;
  requiresRecentTag?: string;
};

export type AttrDeltas = Partial<{
  looks: number;
  wealth: number;
  health: number;
  luck: number;
}>;

export type GameEvent = {
  id: string;
  tier: "common" | "rare" | "legendary";
  weight: number;
  tags: string[];
  conditions: EventConditions;
  deltas: AttrDeltas;
  title: string;
};

export type AdvanceYearResult = {
  nextState: GameState;
  pickedEvents: GameEvent[];
  engineFallback: boolean;
};
```

- [ ] **Step 3: Write `src/lib/engine/events.ts`**

```ts
import type { GameEvent } from "./types";
import raw from "../../../data/events.json";

export function loadEvents(): GameEvent[] {
  return raw as GameEvent[];
}
```

- [ ] **Step 4: Commit**

```bash
git add data/events.json src/lib/engine/types.ts src/lib/engine/events.ts
git commit -m "feat: static event pool and engine types"
```

---

### Task 5: Engine — filter, pick, apply, advance

**Files:**
- Create: `src/lib/engine/filter-events.ts`
- Create: `src/lib/engine/pick-events.ts`
- Create: `src/lib/engine/apply-deltas.ts`
- Create: `src/lib/engine/advance-year.ts`
- Create: `src/lib/engine/advance-year.test.ts`

- [ ] **Step 1: Write failing test `src/lib/engine/advance-year.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { advanceYear } from "./advance-year";
import type { GameState } from "@/lib/schemas/game";
import { loadEvents } from "./events";

const base: GameState = {
  schemaVersion: 1,
  name: "测",
  runSeed: 777,
  age: 0,
  attrs: { looks: 50, wealth: 20, health: 50, luck: 50 },
  recentTags: [],
  milestonesShown: {},
  history: [],
};

it("increments age by 1 and returns 1–3 events", () => {
  const events = loadEvents();
  const r = advanceYear(base, events);
  expect(r.nextState.age).toBe(1);
  expect(r.pickedEvents.length).toBeGreaterThanOrEqual(1);
  expect(r.pickedEvents.length).toBeLessThanOrEqual(3);
});

it("deterministic for same state and events order", () => {
  const events = loadEvents();
  const a = advanceYear(base, events);
  const b = advanceYear(base, events);
  expect(a.pickedEvents.map((e) => e.id)).toEqual(b.pickedEvents.map((e) => e.id));
});

it("uses fallback tier when no match", () => {
  const impossible: GameState = {
    ...base,
    age: 99,
    attrs: { looks: 0, wealth: 100, health: 0, luck: 0 },
  };
  const events = loadEvents().filter((e) => e.id !== "fallback-breath");
  const r = advanceYear(impossible, events);
  expect(r.engineFallback).toBe(true);
});
```

Adjust third test if fallback always exists in full list — engineer ensures pool without matches triggers internal fallback to `fallback-breath` from full `loadEvents()`.

- [ ] **Step 2: Implement `src/lib/engine/filter-events.ts`**

```ts
import type { GameState } from "@/lib/schemas/game";
import type { GameEvent } from "./types";

function matches(event: GameEvent, state: GameState, nextAge: number): boolean {
  const c = event.conditions;
  const a = state.attrs;
  if (c.looksMin != null && a.looks < c.looksMin) return false;
  if (c.looksMax != null && a.looks > c.looksMax) return false;
  if (c.wealthMin != null && a.wealth < c.wealthMin) return false;
  if (c.wealthMax != null && a.wealth > c.wealthMax) return false;
  if (c.healthMin != null && a.health < c.healthMin) return false;
  if (c.healthMax != null && a.health > c.healthMax) return false;
  if (c.luckMin != null && a.luck < c.luckMin) return false;
  if (c.luckMax != null && a.luck > c.luckMax) return false;
  if (c.ageMin != null && nextAge < c.ageMin) return false;
  if (c.ageMax != null && nextAge > c.ageMax) return false;
  if (c.nameMinChars != null && state.name.length < c.nameMinChars) return false;
  if (c.requiresRecentTag != null) {
    if (!state.recentTags.includes(c.requiresRecentTag)) return false;
  }
  return true;
}

export function filterEvents(
  state: GameState,
  events: GameEvent[],
  nextAge: number
): GameEvent[] {
  return events.filter(
    (e) => e.id !== "fallback-breath" && matches(e, state, nextAge)
  );
}

export function getFallbackEvents(events: GameEvent[]): GameEvent[] {
  return events.filter((e) => e.id === "fallback-breath");
}
```

- [ ] **Step 3: Implement `src/lib/engine/apply-deltas.ts`**

```ts
import type { GameState } from "@/lib/schemas/game";
import type { GameEvent } from "./types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function applyEventDeltas(
  attrs: GameState["attrs"],
  picked: GameEvent[]
): GameState["attrs"] {
  let { looks, wealth, health, luck } = attrs;
  for (const e of picked) {
    const d = e.deltas;
    if (d.looks != null) looks = clamp(looks + d.looks);
    if (d.wealth != null) wealth = clamp(wealth + d.wealth);
    if (d.health != null) health = clamp(health + d.health);
    if (d.luck != null) luck = clamp(luck + d.luck);
  }
  return { looks, wealth, health, luck };
}

export function mergeRecentTags(
  prev: string[],
  picked: GameEvent[],
  max = 10
): string[] {
  const next = [...prev];
  for (const e of picked) {
    for (const t of e.tags) {
      if (t === "fallback") continue;
      if (!next.includes(t)) next.push(t);
    }
  }
  return next.slice(-max);
}
```

- [ ] **Step 4: Implement `src/lib/engine/pick-events.ts`**

```ts
import type { GameEvent } from "./types";

function totalWeight(events: GameEvent[]): number {
  return events.reduce((s, e) => s + e.weight, 0);
}

export function pickWeighted(
  rng: () => number,
  pool: GameEvent[],
  count: number
): GameEvent[] {
  const bag = [...pool];
  const out: GameEvent[] = [];
  const n = Math.max(1, Math.min(3, count));
  for (let k = 0; k < n && bag.length > 0; k++) {
    const tw = totalWeight(bag);
    let r = rng() * tw;
    let idx = 0;
    for (let i = 0; i < bag.length; i++) {
      r -= bag[i].weight;
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    out.push(bag[idx]);
    bag.splice(idx, 1);
  }
  return out;
}
```

- [ ] **Step 5: Implement `src/lib/engine/advance-year.ts`**

```ts
import type { GameState } from "@/lib/schemas/game";
import { SCHEMA_VERSION } from "@/lib/constants";
import { yearSeed } from "@/lib/rng/seeds";
import { createMulberry32 } from "@/lib/rng/mulberry32";
import type { GameEvent } from "./types";
import type { AdvanceYearResult } from "./types";
import { filterEvents, getFallbackEvents } from "./filter-events";
import { pickWeighted } from "./pick-events";
import { applyEventDeltas, mergeRecentTags } from "./apply-deltas";

export function advanceYear(
  state: GameState,
  allEvents: GameEvent[]
): AdvanceYearResult {
  const nextAge = state.age + 1;
  const seed = yearSeed(state.runSeed, nextAge);
  const rng = createMulberry32(seed);

  let pool = filterEvents(state, allEvents, nextAge);
  let engineFallback = false;
  if (pool.length === 0) {
    pool = getFallbackEvents(allEvents);
    engineFallback = true;
    if (pool.length === 0) {
      throw new Error("Event pool missing fallback-breath");
    }
  }

  const count = 1 + Math.floor(rng() * 3);
  const picked = pickWeighted(rng, pool, count);

  const attrs = applyEventDeltas(state.attrs, picked);
  const recentTags = mergeRecentTags(state.recentTags, picked);

  const nextState: GameState = {
    schemaVersion: SCHEMA_VERSION,
    name: state.name,
    runSeed: state.runSeed,
    age: nextAge,
    attrs,
    recentTags,
    milestonesShown: { ...state.milestonesShown },
    history: state.history,
  };

  return { nextState, pickedEvents: picked, engineFallback };
}
```

- [ ] **Step 6: Fix test** if fallback test used wrong filter — use empty pool path by stubbing or removing all matching events; simplest: call `advanceYear` with `events` that only contains `fallback-breath` after filter removes it from candidate list — actually filter excludes fallback from candidates; if no match, getFallbackEvents returns fallback. For "no fallback in file" test, pass `allEvents: []` and expect throw, or skip. **Replace third test** with:

```ts
it("marks engineFallback when candidate pool was empty", () => {
  const onlyFallback = loadEvents().filter((e) => e.id === "fallback-breath");
  const blocked: GameState = {
    ...base,
    age: 5,
    attrs: { looks: 1, wealth: 1, health: 1, luck: 1 },
  };
  const r = advanceYear(blocked, onlyFallback);
  expect(r.engineFallback).toBe(true);
  expect(r.pickedEvents[0].id).toBe("fallback-breath");
});
```

- [ ] **Step 7: Run tests**

Run: `npm run test -- src/lib/engine/advance-year.test.ts`  
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/engine/
git commit -m "feat: advanceYear with filter, weighted pick, fallback"
```

---

### Task 6: Initial state from name

**Files:**
- Create: `src/lib/engine/initial-state.ts`
- Create: `src/lib/engine/initial-state.test.ts`

- [ ] **Step 1: Write test `src/lib/engine/initial-state.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { createInitialState } from "./initial-state";
import { SCHEMA_VERSION } from "@/lib/constants";

it("rejects empty name", () => {
  expect(() => createInitialState("")).toThrow();
});

it("creates state with runSeed from name", () => {
  const a = createInitialState("Bob");
  const b = createInitialState("bob");
  expect(a.runSeed).toBe(b.runSeed);
  expect(a.schemaVersion).toBe(SCHEMA_VERSION);
  expect(a.age).toBe(0);
});
```

- [ ] **Step 2: Implement `src/lib/engine/initial-state.ts`**

```ts
import { SCHEMA_VERSION } from "@/lib/constants";
import { hashNameToRunSeed, normalizePlayerName } from "@/lib/rng/seeds";
import { createMulberry32 } from "@/lib/rng/mulberry32";
import type { GameState } from "@/lib/schemas/game";

const NAME_RE = /^[\p{L}\p{N}·．\s]{1,20}$/u;

export function validateNewName(raw: string): string {
  const t = raw.trim();
  if (!NAME_RE.test(t)) {
    throw new Error("名字需 1–20 字符，支持中文、字母、数字、间隔号");
  }
  return normalizePlayerName(t);
}

function rollAttr(rng: () => number): number {
  return 15 + Math.floor(rng() * 71);
}

export function createInitialState(rawName: string): GameState {
  const name = validateNewName(rawName);
  const runSeed = hashNameToRunSeed(rawName);
  const rng = createMulberry32(runSeed ^ 0x9e3779b9);

  return {
    schemaVersion: SCHEMA_VERSION,
    name,
    runSeed,
    age: 0,
    attrs: {
      looks: rollAttr(rng),
      wealth: rollAttr(rng),
      health: rollAttr(rng),
      luck: rollAttr(rng),
    },
    recentTags: [],
    milestonesShown: {},
    history: [],
  };
}
```

Note: store `name` as normalized lowercase for consistency; display can title-case in UI if desired.

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/lib/engine/initial-state.test.ts`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/engine/initial-state.ts src/lib/engine/initial-state.test.ts
git commit -m "feat: initial GameState from player name"
```

---

### Task 7: Milestones

**Files:**
- Create: `src/lib/milestones.ts`
- Create: `src/lib/milestones.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from "vitest";
import { applyMilestone, type MilestonesShown } from "./milestones";

it("fires once per age gate", () => {
  const m: MilestonesShown = {};
  const a = applyMilestone(70, m);
  expect(a.message).toBeDefined();
  const b = applyMilestone(70, a.milestonesShown);
  expect(b.message).toBeUndefined();
});
```

- [ ] **Step 2: Implement `src/lib/milestones.ts`**

```ts
import { MILESTONE_AGES, MILESTONE_COPY } from "@/lib/constants";

export type MilestonesShown = Record<string, boolean>;

export function applyMilestone(
  age: number,
  milestonesShown: MilestonesShown
): { milestonesShown: MilestonesShown; message?: string } {
  const key = String(age);
  if (!(MILESTONE_AGES as readonly number[]).includes(age)) {
    return { milestonesShown: { ...milestonesShown } };
  }
  if (milestonesShown[key]) {
    return { milestonesShown: { ...milestonesShown } };
  }
  const next = { ...milestonesShown, [key]: true };
  return { milestonesShown: next, message: MILESTONE_COPY };
}
```

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/lib/milestones.test.ts`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/milestones.ts src/lib/milestones.test.ts
git commit -m "feat: milestone copy at 70/80/90/100 once per game"
```

---

### Task 8: Narrative — template + LLM + build

**Files:**
- Create: `src/lib/narrative/template.ts`
- Create: `src/lib/narrative/llm.ts`
- Create: `src/lib/narrative/build-narrative.ts`
- Create: `src/lib/narrative/build-narrative.test.ts`

- [ ] **Step 1: Implement `src/lib/narrative/template.ts`**

```ts
export function templateNarrative(
  name: string,
  age: number,
  eventTitles: string[]
): string {
  const bits = eventTitles.join("；");
  return `${name} 在 ${age} 岁这一年：${bits}。日子还得过。`;
}
```

- [ ] **Step 2: Implement `src/lib/narrative/llm.ts`**

```ts
import {
  LLM_TIMEOUT_MS,
  LLM_MAX_RETRIES,
  LLM_RETRY_DELAY_MS,
} from "@/lib/constants";
import { LlmNarrativeJsonSchema } from "@/lib/schemas/game";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchLlmNarrative(input: {
  name: string;
  age: number;
  eventIds: string[];
}): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const base =
    process.env.OPENAI_BASE_URL?.replace(/\/$/, "") ||
    "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const body = {
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "你是中式吐槽叙事机。只输出 JSON：{\"text\":\"...\"}。1–6句中文，幽默损，不要说教。",
      },
      {
        role: "user",
        content: JSON.stringify({
          name: input.name,
          age: input.age,
          eventIds: input.eventIds,
        }),
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
      const parsed = JSON.parse(raw);
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
```

- [ ] **Step 3: Implement `src/lib/narrative/build-narrative.ts`**

```ts
import { templateNarrative } from "./template";
import { fetchLlmNarrative } from "./llm";

export async function buildNarrative(input: {
  name: string;
  age: number;
  eventIds: string[];
  eventTitles: string[];
}): Promise<{ text: string; fallback: boolean }> {
  const llm = await fetchLlmNarrative({
    name: input.name,
    age: input.age,
    eventIds: input.eventIds,
  });
  if (llm) return { text: llm, fallback: false };
  return {
    text: templateNarrative(input.name, input.age, input.eventTitles),
    fallback: true,
  };
}
```

- [ ] **Step 4: Write test with mocked fetch**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildNarrative } from "./build-narrative";

describe("buildNarrative", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses template when no API key", async () => {
    const r = await buildNarrative({
      name: "张三",
      age: 3,
      eventIds: ["x"],
      eventTitles: ["测试事件"],
    });
    expect(r.fallback).toBe(true);
    expect(r.text).toContain("张三");
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/lib/narrative/build-narrative.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/narrative/
git commit -m "feat: template narrative and OpenAI-compatible LLM with retries"
```

---

### Task 9: Wire `POST /api/year`

**Files:**
- Create: `src/app/api/year/route.ts`

- [ ] **Step 1: Implement route**

```ts
import { NextResponse } from "next/server";
import { SCHEMA_VERSION } from "@/lib/constants";
import { YearApiRequestSchema, YearApiResponseSchema } from "@/lib/schemas/game";
import { loadEvents } from "@/lib/engine/events";
import { advanceYear } from "@/lib/engine/advance-year";
import { buildNarrative } from "@/lib/narrative/build-narrative";
import { applyMilestone } from "@/lib/milestones";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const parsed = YearApiRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.schemaVersion !== SCHEMA_VERSION) {
    return NextResponse.json(
      { error: `schemaVersion must be ${SCHEMA_VERSION}` },
      { status: 400 }
    );
  }

  try {
    const events = loadEvents();
    const { nextState: advanced, pickedEvents, engineFallback } = advanceYear(
      parsed.data.state,
      events
    );

    const narrative = await buildNarrative({
      name: advanced.name,
      age: advanced.age,
      eventIds: pickedEvents.map((e) => e.id),
      eventTitles: pickedEvents.map((e) => e.title),
    });

    const { milestonesShown, message: milestoneMessage } = applyMilestone(
      advanced.age,
      advanced.milestonesShown
    );

    const withHistory = {
      ...advanced,
      milestonesShown,
      history: [
        ...advanced.history,
        {
          age: advanced.age,
          eventIds: pickedEvents.map((e) => e.id),
          narrative: narrative.text,
          fallback: narrative.fallback,
        },
      ],
    };

    const body = {
      schemaVersion: SCHEMA_VERSION,
      state: withHistory,
      yearSummary: {
        age: advanced.age,
        eventIds: pickedEvents.map((e) => e.id),
        narrative: narrative.text,
        fallback: narrative.fallback,
        engineFallback,
        milestoneMessage,
      },
    };

    YearApiResponseSchema.parse(body);
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Manual curl (dev)**

Run dev: `npm run dev`  
Run:

```bash
curl -s -X POST http://localhost:3000/api/year -H 'Content-Type: application/json' -d '{"schemaVersion":1,"state":{"schemaVersion":1,"name":"test","runSeed":1,"age":0,"attrs":{"looks":50,"wealth":50,"health":50,"luck":50},"recentTags":[],"milestonesShown":{},"history":[]}}'
```

Expected: HTTP **200**, JSON with `state.age === 1`, `yearSummary.narrative` non-empty.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/year/route.ts
git commit -m "feat: POST /api/year composes engine, narrative, milestones"
```

---

### Task 10: Client UI + atomic state + export

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/components/GameClient.tsx`

- [ ] **Step 1: `src/app/globals.css`** (minimal)

```css
:root {
  font-family: system-ui, sans-serif;
  background: #111;
  color: #eee;
}
button {
  margin: 0.25rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
```

- [ ] **Step 2: `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "中式人生模拟器",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: `src/components/GameClient.tsx`** (core UX)

```tsx
"use client";

import { useState, useCallback } from "react";
import type { GameState } from "@/lib/schemas/game";
import { SCHEMA_VERSION } from "@/lib/constants";
import { createInitialState } from "@/lib/engine/initial-state";
import type { YearApiResponse } from "@/lib/schemas/game";

export function GameClient() {
  const [nameInput, setNameInput] = useState("");
  const [state, setState] = useState<GameState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastMilestone, setLastMilestone] = useState<string | null>(null);

  const start = () => {
    setErr(null);
    setLastMilestone(null);
    try {
      setState(createInitialState(nameInput));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "起名失败");
    }
  };

  const nextYear = useCallback(async () => {
    if (!state) return;
    const snapshot = state;
    setLoading(true);
    setErr(null);
    setLastMilestone(null);
    try {
      const res = await fetch("/api/year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: SCHEMA_VERSION,
          stream: false,
          state: snapshot,
        }),
      });
      const data = (await res.json()) as YearApiResponse & { error?: string };
      if (!res.ok) {
        setErr(data.error || `HTTP ${res.status}`);
        return;
      }
      setState(data.state);
      if (data.yearSummary.milestoneMessage) {
        setLastMilestone(data.yearSummary.milestoneMessage);
      }
    } catch {
      setErr("网络错误");
    } finally {
      setLoading(false);
    }
  }, [state]);

  const exportJson = () => {
    if (!state) return;
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      game: state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "life-simulator-save.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <main style={{ maxWidth: 560, margin: "2rem auto", padding: 16 }}>
      <h1>中式人生模拟器</h1>
      {!state ? (
        <div>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="你的名字"
            maxLength={20}
            style={{ width: "100%", padding: 8 }}
          />
          <button type="button" onClick={start}>
            开局
          </button>
        </div>
      ) : (
        <div>
          <p>
            {state.name} · {state.age} 岁
          </p>
          <p>
            颜值 {state.attrs.looks} · 家境 {state.attrs.wealth} · 体质{" "}
            {state.attrs.health} · 运气 {state.attrs.luck}
          </p>
          <button type="button" disabled={loading} onClick={nextYear}>
            {loading ? "推进中…" : "下一年"}
          </button>
          <button type="button" onClick={exportJson}>
            导出存档 JSON
          </button>
          <button
            type="button"
            onClick={() => {
              setState(null);
              setNameInput("");
              setLastMilestone(null);
            }}
          >
            新开一局
          </button>
          {lastMilestone && (
            <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>
              {lastMilestone}
            </pre>
          )}
          <ul>
            {state.history
              .slice()
              .reverse()
              .map((h) => (
                <li key={h.age}>
                  <strong>{h.age} 岁</strong>：{h.narrative}
                  {h.fallback ? "（本地叙事）" : ""}
                </li>
              ))}
          </ul>
        </div>
      )}
      {err && <p style={{ color: "#f66" }}>{err}</p>}
    </main>
  );
}
```

- [ ] **Step 4: `src/app/page.tsx`**

```tsx
import { GameClient } from "@/components/GameClient";

export default function Page() {
  return <GameClient />;
}
```

- [ ] **Step 5: Run build**

Run: `npm run build`  
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/app/ src/components/
git commit -m "feat: client UI, atomic year advance, JSON export"
```

---

### Task 11: README, Cloudflare, stream reserved

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md` body** with sections: 项目目的、本地运行、`OPENAI_*`、**种子说明**（`hashNameToRunSeed`、`yearSeed(runSeed, nextAge)`）、**方案 A**（无 Key 仍 200 + 模板）、**刷新丢进度 / 导出**、`stream` 预留、**Cloudflare**（写明跟随当前官方 Next + Pages 文档安装 OpenNext 或推荐适配器、环境变量在 Pages 配置）、**Worker 时长**（若需将重试降为 1 次须写明）。

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README for seeds, fallback, CF deploy, stream reserved"
```

---

### Task 12: Full test suite and lint

- [ ] **Step 1: Run all tests**

Run: `npm run test`  
Expected: all PASS.

- [ ] **Step 2: Run lint**

Run: `npx next lint`  
Expected: no errors (fix if any).

- [ ] **Step 3: Commit** (if fixes)

```bash
git add -A && git commit -m "chore: lint fixes" || true
```

---

## Plan self-review

**1. Spec coverage**

| Requirement | Task |
|-------------|------|
| F0.1 起名校验 | Task 6 `validateNewName` + Task 10 UI |
| F0.2 runSeed 初始属性 | Task 3, 6 |
| F0.3 yearSeed 逐年 1–3 事件 | Task 5 |
| F0.4 保底 + engineFallback | Task 5 |
| F0.5 属性 delta | Task 4 JSON + Task 5 apply |
| F0.6 年度展示 | Task 10 history list |
| F0.7 POST /api/year | Task 9 |
| F0.8 方案 A / 降级 | Task 8 LLM null → template; Task 9 always narrative |
| F0.9 Zod | Task 2 + Task 9 parse |
| F0.10 无限年 + 里程碑文案 | Task 7 + Task 10 |
| F0.11 Cloudflare | Task 11 README + engineer runs official adapter |
| F1.1 stream 预留 | Request schema + README; body `stream` ignored |
| F1.2 防抖 / 50 年 | Task 10 `loading` disable; manual QA README note |
| F1.3 超时/重试/eventIds-only prompt | Task 1 constants + Task 8 |
| F1.4 README 种子 | Task 11 |
| F1.5 recentTags + 彩蛋 | Task 4 `requiresRecentTag`, `nameMinChars` |
| F1.6 测试 | Tasks 2–8, 12 |
| F1.7 导出 JSON | Task 10 |

**2. Placeholder scan:** No TBD/TODO left in plan steps.

**3. Type consistency:** `GameState` single source in `schemas/game.ts`; `advanceYear` returns `AdvanceYearResult`; API uses same shapes.

**Gap (intentional):** **500** on unexpected throw in route — spec focuses on LLM/key path **200**; invalid JSON/body remains **400**. If product demands **never 500**, wrap `advanceYear` in try/catch and return 200 with error narrative (optional follow-up).

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-09-life-simulator-implementation-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
