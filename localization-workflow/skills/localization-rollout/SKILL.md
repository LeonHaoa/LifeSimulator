---
name: localization-rollout
description: Use when adding a locale, introducing new localization keys, extracting hardcoded copy, or aligning module copy across locales with structure-first rules
---

# Localization Rollout

## Purpose

Use this skill for structural localization work: extract copy, align keys, normalize files, and roll out modules across locales without translation drift.

## Core Rules

1. `en` is the only source locale.
2. `zh-Hant` is the secondary priority locale.
3. Do not translate from one non-English locale into another.
4. Keep key order and grouping aligned with `en`.
5. Preserve placeholders and format specifiers exactly.

## Standard Flow

1. Read:
   1. `../..//templates/localization_profile.template.md` only as schema reference
   2. `../../references/workflow.md`
   3. `../../references/governance.md`
2. Confirm module scope.
3. Extract hardcoded copy into localization files.
4. Add or fix keys in `en`.
5. Sync `zh-Hant`.
6. Sync other locales.
7. Normalize ordering and grouping.
8. Run validation.

## Use This For

1. hardcoded string extraction
2. missing key alignment
3. locale parity
4. new locale onboarding
5. new module rollout

## Validation

Run the project’s configured commands from `localization_profile.md`.

Minimum expectation:

```bash
bash scripts/check-localization.sh
python3 scripts/audit_hardcoded_localizations.py --all
```

## Done Criteria

1. all target locales match source key count
2. no raw keys visible
3. no obvious mixed-language residue in high-visible UI
4. validation passes

