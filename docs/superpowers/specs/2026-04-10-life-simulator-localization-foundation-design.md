# LifeSimulator Localization Foundation Design

## Goal

Normalize the current project into a maintainable bilingual localization structure with:

1. `en` as the only source locale
2. first-phase support for `en` and `zh-CN`
3. one shared dictionary-driven path for UI copy, system text, event titles, fallback narrative, and LLM language control
4. explicit locale propagation into Kimi requests so the model replies in the requested language

## Current State

The project currently renders most visible copy from hardcoded Chinese strings spread across UI components, narrative helpers, and event data. This creates four problems:

1. no source-of-truth locale
2. no stable key structure
3. no locale-aware fallback narrative
4. no guarantee that Kimi responds in the current user language

## Scope

This design covers:

1. visible UI copy in welcome and life detail flows
2. structured system text such as attribute labels, status text, and common errors
3. event titles used by engine and narrative output
4. fallback narrative templates and skill-flavor text
5. Kimi prompt language control
6. request and response path updates needed to carry `locale`

This design does not cover:

1. route-level internationalization such as `/en/...`
2. browser auto-detection
3. locales beyond `en` and `zh-CN`
4. README full bilingual rewrite

## Decisions

### 1. Source Locale Policy

1. `en` is the only source locale.
2. `zh-CN` is the only secondary locale in the first phase.
3. All new keys are added in `en` first and mirrored in `zh-CN`.
4. Key order and grouping are defined by `en` and preserved in `zh-CN`.

### 2. Localization Architecture

Use a project-local dictionary layer instead of adding a full external i18n framework in this phase.

Planned structure:

```text
messages/
  en.ts
  zh-CN.ts

src/lib/i18n/
  config.ts
  types.ts
  dictionary.ts
  format.ts
  server-locale.ts
  client-locale.tsx
```

Rationale:

1. the app is currently small enough for a lightweight internal layer
2. this keeps rollout focused on copy normalization rather than framework wiring
3. the structure remains compatible with a later migration to a more formal library if needed

### 3. Content Buckets

The dictionaries should be grouped into stable domains:

1. `common`
2. `welcome`
3. `life`
4. `errors`
5. `stats`
6. `events`
7. `narrative`
8. `llm`

Rules:

1. user-visible copy always lives in dictionaries
2. business logic references keys and interpolation params rather than natural-language literals
3. `llm` content is also localized because prompt language is part of product behavior

### 4. Key Naming Rules

1. keys are semantic, not position-based
2. keys do not encode language
3. repeated concepts reuse stable terms instead of duplicating near-synonyms
4. dynamic text uses interpolation values rather than string concatenation in business code

Examples:

1. `life.createCharacter.title`
2. `life.nextYear.button`
3. `errors.stream.failed`
4. `stats.happiness.label`
5. `events.fallbackBreath.title`
6. `narrative.skillFlavor.happiness`
7. `llm.language.replyInEnglish`

### 5. Event Data Normalization

Current event data contains user-visible Chinese `title` values. That should be replaced with stable key references.

Planned direction:

1. replace event `title` with `titleKey`
2. resolve display text through dictionaries
3. keep event IDs and engine semantics unchanged

This prevents gameplay data from acting as an accidental source locale.

### 6. Locale Flow

First-phase locale values:

1. `en`
2. `zh-CN`

Flow:

1. client chooses current locale
2. locale is stored in app state or equivalent client context
3. yearly API requests include `locale`
4. narrative builders receive `locale`
5. template fallback and Kimi prompt generation both use the same locale value

### 7. Kimi Language Control

Kimi requests must include the current locale and a hard instruction about output language.

Rules:

1. every Kimi request payload includes `locale`
2. prompt must explicitly require the response language
3. prompt must explicitly forbid mixed-language output except unavoidable proper nouns or technical identifiers
4. fallback narrative must match the same locale behavior

Prompt policy:

1. if `locale === "en"`, include `Reply in English.`
2. if `locale === "zh-CN"`, include `请用中文回复。`
3. include a no-mixing rule such as `Do not mix Chinese and English in normal prose unless a proper noun must remain unchanged.`

### 8. Migration Order

To reduce churn and keep verification simple, migrate in this order:

1. introduce dictionary and locale types
2. move stable UI copy out of `WelcomeScreen` and `LifeDetailClient`
3. move stat labels and shared constants
4. move event titles to keyed dictionary entries
5. localize template fallback and skill-flavor helpers
6. update Kimi prompts to consume localized instruction fragments and `locale`
7. update schemas, API requests, and tests

## Affected Files

Expected first-wave touch points:

1. `/Users/apple/Desktop/LifeGame/LifeSimulator/src/components/WelcomeScreen.tsx`
2. `/Users/apple/Desktop/LifeGame/LifeSimulator/src/components/LifeDetailClient.tsx`
3. `/Users/apple/Desktop/LifeGame/LifeSimulator/src/lib/constants.ts`
4. `/Users/apple/Desktop/LifeGame/LifeSimulator/src/lib/narrative/template.ts`
5. `/Users/apple/Desktop/LifeGame/LifeSimulator/src/lib/narrative/skill-flavor.ts`
6. `/Users/apple/Desktop/LifeGame/LifeSimulator/src/lib/narrative/llm-prompt.ts`
7. `/Users/apple/Desktop/LifeGame/LifeSimulator/data/events.json`
8. `/Users/apple/Desktop/LifeGame/LifeSimulator/src/app/api/year/route.ts`
9. `/Users/apple/Desktop/LifeGame/LifeSimulator/src/app/api/year/stream/route.ts`
10. `/Users/apple/Desktop/LifeGame/LifeSimulator/src/lib/schemas/game.ts`

## Error Handling

1. unsupported locale falls back to `en`
2. missing dictionary keys should fail loudly in development
3. if Kimi ignores the requested language, the response should still be surfaced for now, but this must be visible during manual QA
4. fallback template generation must never depend on Kimi availability

## Testing and Validation

Minimum validation for the implementation phase:

1. dictionary type parity between `en` and `zh-CN`
2. unit coverage for locale-aware narrative/template behavior
3. API schema coverage for locale request propagation
4. manual UI verification in both locales
5. `npm run lint`
6. `npm run test`
7. `npm run build`

## Risks

1. English source copy may sound like back-translation if we migrate too literally from existing Chinese
2. event-title refactor may touch deterministic narrative assumptions if not kept purely presentational
3. Kimi may still occasionally drift in bilingual phrasing unless prompt constraints are strong and tested
4. a large copy move can create noisy diffs if we do not migrate by domain

## Recommendation

Proceed with a single localization-foundation implementation plan focused on:

1. bilingual dictionary infrastructure
2. full hardcoded copy extraction for current user-visible product text
3. locale-aware fallback narrative
4. locale-aware Kimi prompt generation

This is the smallest coherent refactor that makes the project genuinely bilingual without overcommitting to route-level i18n or multi-locale expansion.
