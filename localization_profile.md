# Localization Profile

## Project Basics
Project Name: LifeSimulator
Project Type: Next.js interactive game demo
Primary Platform: Web
Primary Source Locale: en
Secondary Priority Locale: zh-CN
Other Target Locales:
- None in current phase
Primary Markets:
- Mainland Chinese users
- English-speaking exploratory users

## Product & Audience
Core User Profile: Players who want a fast, humorous, replayable life simulation with strong visible feedback and lightweight yearly progression.
Primary Use Cases:
- Start a new character and understand the game loop quickly
- Allocate yearly points and read the resulting narrative
- Compare attributes, yearly outcomes, and long-term progression
User Motivation: Curiosity, amusement, light roleplay, and repeatable experimentation
Trust Sensitivity: Medium
Conversion Sensitivity: Low

## Brand Voice
Primary Tone: Playful and sharp
Secondary Tone: Warm and observant
Avoided Tone: Corporate, preachy, generic motivational, overly literary
Emotional Warmth: Medium-high
Mysticism Level: Low
Professionalism Level: Low-medium
CTA Intensity: Medium

## Copy Policy
Default Copy Strategy: English is the only source locale. All new or revised copy is finalized in English first, then adapted to zh-CN.
UI Copy Style: Short, direct, readable, slightly game-like, no empty flourish
Marketing Copy Style: Not in scope for current phase
Long-form Content Style: Narrative should feel coherent, witty, and character-aware; advice should be teasing but not hostile
Terminology Strictness: High for attribute names, event titles, and repeated game loop actions
Can Freely Rephrase: Yes, as long as meaning, placeholders, and gameplay semantics stay intact

## Competitor Research
Use Competitor Research: No
Competitor Apps:
- None for this phase
Research Focus:
- Not required in current phase
Approved Reference Style:
- Lightweight simulation games
- Short-form replayable narrative games
Rejected Reference Style:
- Meditation-app warmth
- Heavy RPG fantasy jargon
- Overly app-store-style hype copy

## Terminology Baseline
Preferred Terms:
- Life Simulator
- Start Life
- Next Year
- Almanac
- Skill Point
- Narrative

Protected Terms:
- LifeSimulator
- Kimi
- runSeed
- locale
- schemaVersion

## Execution Policy
Execution Mode: three-phase
Approval Checkpoints:
- Freeze profile and tone
- Review final polish direction
- Review final acceptance summary

Can Continue Without Confirmation:
- Hardcoded string extraction
- Key normalization
- Locale parity alignment
- Comment grouping and ordering
- Obvious mixed-language cleanup
- High-confidence UI copy cleanup
- Terminology consistency cleanup

Stop Conditions:
- Source English sounds mechanically translated or loses product personality
- zh-CN adaptation changes gameplay meaning
- Kimi output language control appears unstable
- Final release acceptance

Release Validation Required:
- Type check and test suite pass after localization refactor
- Manual verification for both en and zh-CN in visible screens
- Kimi prompt and fallback narrative both respect locale

## Project Integration
Localization Files Path:
- /Users/apple/Desktop/LifeGame/LifeSimulator/messages
- /Users/apple/Desktop/LifeGame/LifeSimulator/src/lib/i18n
Primary Strings File:
- /Users/apple/Desktop/LifeGame/LifeSimulator/messages/en.ts
Validation Commands:
- npm run lint
- npm run test
- npm run build

Existing Localization Scripts:
- None yet

Profile Version: v1
Last Updated: 2026-04-10
Reason For Update: Establish the first project-level localization policy before refactoring hardcoded copy into a bilingual structure.
Notes:
- Current phase only supports en and zh-CN.
- This project intentionally uses en as source locale even though the existing product copy started in Chinese.
- Kimi requests must receive the current locale and an explicit language instruction for the response.
- Dictionary foundation implemented under `messages/` and `src/lib/i18n/`.
- Event titles now resolve from `titleKey` instead of raw localized strings in data.
- Locale is currently persisted in client storage via `life-simulator.locale`.
