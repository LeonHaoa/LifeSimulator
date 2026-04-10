---
name: localization-workflow
description: Use when setting up or running a reusable app-level localization workflow that covers rollout, polishing, terminology, and validation with a portable folder structure
---

# Localization Workflow

## Overview

This folder is a portable localization workflow kit. Copy it into a project, create a project profile from the template, then use the included skills and references to run localization work with consistent rules.

## When to Use

Use this workflow when:

- a project needs a repeatable localization process
- a project is adding or cleaning up multiple locales
- a team wants one source locale, one execution policy, and one terminology baseline
- you want a portable folder that can be copied into other projects

## Entry Flow

1. Create `localization_profile.md` from `templates/localization_profile.template.md`.
2. Create `localization_terminology.md` from `templates/localization_terminology.template.md`.
3. Choose an execution mode from `references/execution-modes.md`.
4. Use:
   1. `skills/localization-rollout/SKILL.md` for structure, parity, and rollout work
   2. `skills/localization-polish/SKILL.md` for refinement, terminology cleanup, and release prep

## Recommended Defaults

1. `en` is the only source locale.
2. `zh-Hant` is the secondary priority locale.
3. Default execution mode is `three-phase`.
4. Validate after every coherent batch.

## Included Files

### Skills

1. `skills/localization-rollout/SKILL.md`
2. `skills/localization-polish/SKILL.md`

### Templates

1. `templates/localization_profile.template.md`
2. `templates/localization_terminology.template.md`
3. `templates/localization_status.template.md`

### References

1. `references/workflow.md`
2. `references/governance.md`
3. `references/execution-modes.md`
4. `references/competitor-research.md`

## Output Expectations

Each localization run should leave behind:

1. an updated profile
2. an updated terminology file
3. a status snapshot
4. a validated result

