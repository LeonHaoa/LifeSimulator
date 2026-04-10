---
name: localization-polish
description: Use when localization structure is already stable and the remaining work is copy refinement, tone alignment, terminology cleanup, or release-stage language polishing
---

# Localization Polish

## Purpose

Use this skill after rollout is complete. It focuses on quality, not structure: tone, readability, consistency, and visible copy refinement.

## Polish Priorities

1. high-visible pages first
2. repeated template copy next
3. long-form content after that
4. terminology-heavy concept strings last

## Standard Flow

1. Read:
   1. `../../references/workflow.md`
   2. `../../references/governance.md`
   3. `../../references/execution-modes.md`
   4. project `localization_profile.md`
   5. project `localization_terminology.md`
2. Refine English source copy first.
3. Sync `zh-Hant`.
4. Refine other locales.
5. Review terminology consistency.
6. Validate after each coherent batch.
7. Stop when remaining issues are mostly concept-level terminology or manual page QA.

## Use This For

1. tone cleanup
2. CTA consistency
3. page-visible copy refinement
4. machine-translation tone removal
5. mixed-language cleanup
6. release-stage polish

## Validation

Run the project’s configured commands from `localization_profile.md`.

Minimum expectation:

```bash
bash scripts/check-localization.sh
python3 scripts/audit_hardcoded_localizations.py --all
```

## Stop Conditions

Pause and summarize when:

1. the remaining work is mainly `glossary.*` or `transit.*`
2. further edits would change domain meaning rather than improve clarity
3. manual product acceptance is the better next step

