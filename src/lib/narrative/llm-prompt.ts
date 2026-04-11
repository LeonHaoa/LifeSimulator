import { ATTR_KEYS, type AttrKey } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import type { GameState } from "@/lib/schemas/game";
import { skillLabel } from "./skill-flavor";

type Attrs = GameState["attrs"];

export function buildNarrativeSystemPrompt(
  locale: Locale,
  mode: "json" | "plain"
): string {
  const copy = getDictionary(locale).llm;

  if (mode === "json") {
    return [
      copy.roleJson,
      locale === "en" ? copy.replyInEnglish : copy.replyInChinese,
      copy.noLanguageMixing,
      'Only output JSON: {"text":"..."}',
    ].join("\n");
  }

  return [
    copy.rolePlain,
    locale === "en" ? copy.replyInEnglish : copy.replyInChinese,
    copy.noLanguageMixing,
    "Output plain text only. Do not use Markdown, numbering, or JSON.",
  ].join("\n");
}

export function buildSkillAllocationSummary(
  locale: Locale,
  history: { skillAllocation?: AttrKey }[],
  thisYear?: AttrKey
): {
  pointsByDimension: Record<string, number>;
  totalSkillChoices: number;
  mostFrequentDimensions: string[];
  thisYearFocus: string | null;
} {
  const labels = getDictionary(locale).stats;
  const counts = Object.fromEntries(ATTR_KEYS.map((key) => [key, 0])) as Record<
    AttrKey,
    number
  >;

  for (const entry of history) {
    if (entry.skillAllocation) counts[entry.skillAllocation]++;
  }
  if (thisYear) counts[thisYear]++;

  const pointsByDimension = Object.fromEntries(
    ATTR_KEYS.map((key) => [labels[key].label, counts[key]])
  );

  const totalSkillChoices = ATTR_KEYS.reduce((sum, key) => sum + counts[key], 0);
  const max = Math.max(...ATTR_KEYS.map((key) => counts[key]), 0);
  const mostFrequentDimensions =
    max > 0
      ? ATTR_KEYS.filter((key) => counts[key] === max).map(
          (key) => labels[key].label
        )
      : [];

  return {
    pointsByDimension,
    totalSkillChoices,
    mostFrequentDimensions,
    thisYearFocus: thisYear ? skillLabel(locale, thisYear) : null,
  };
}

export function attrsToLabeledStats(
  locale: Locale,
  attrs: Attrs
): Record<string, number> {
  const labels = getDictionary(locale).stats;
  return Object.fromEntries(
    ATTR_KEYS.map((key) => [labels[key].label, attrs[key]])
  );
}

export function buildNarrativeUserJson(input: {
  locale: Locale;
  name: string;
  age: number;
  runSeed: number;
  attrs: Attrs;
  historyForSkills: { skillAllocation?: AttrKey }[];
  eventIds: string[];
  eventTitles: string[];
  skillKey?: AttrKey;
  deceased?: boolean;
}): string {
  const events = input.eventIds.map((id, index) => ({
    id,
    title: input.eventTitles[index] ?? id,
  }));

  const skillAllocation = buildSkillAllocationSummary(
    input.locale,
    input.historyForSkills,
    input.skillKey
  );

  const payload: Record<string, unknown> = {
    locale: input.locale,
    player: { name: input.name, age: input.age },
    lifeSeed: {
      runSeed: input.runSeed,
      runSeedHex: `0x${input.runSeed.toString(16)}`,
    },
    currentStats: attrsToLabeledStats(input.locale, input.attrs),
    skillAllocation,
    thisYearEvents: events,
  };

  if (input.deceased) {
    payload.lifeStatus = "deceased";
  }

  if (input.skillKey) {
    payload.skillFocus = skillLabel(input.locale, input.skillKey);
  }

  return JSON.stringify(payload);
}
