import { ATTR_KEYS, ATTR_LABELS, type AttrKey } from "@/lib/constants";
import { skillLabel } from "./skill-flavor";
import type { GameState } from "@/lib/schemas/game";

type Attrs = GameState["attrs"];

/**
 * Shared instructions + user payload for Kimi / OpenAI-compat chat.
 * Keep prompts in Chinese; code comments in English.
 */

export const NARRATIVE_SYSTEM_JSON = [
  "你是「中式人生模拟器」的年度旁白 + 人生损友。用户会给你 JSON：玩家姓名、年龄、人生种子 runSeed、本年度结算后的八维属性 currentStats（中文维度名→数值）、skillAllocation（历史加点分布与本年焦点）、本年度事件 thisYearEvents（id+title）、以及可选 skillFocus。",
  "输出结构（写在同一个 text 里，两段自然衔接，不要用标题行）：",
  "A. 年度叙事（3–6 句）：只写「这一年」发生的事；必须以事件 title 为事实锚点；多事件按顺序串成一条连贯时间线；句间要有因果/承接/转折，禁止话题瞬移。",
  "B. 建议段（2–4 句）：结合「当前岁数、八维短板/长板、加点分布暴露的偏好」给具体建议。语气要毒舌但温暖：先吐槽到位，再像靠谱损友一样把话兜回来；禁止空洞鸡汤、禁止说教腔、禁止列清单式「第一第二」。",
  "只输出 JSON：{\"text\":\"...\"}。不要 Markdown，不要代码块，不要多余字段。",
].join("\n");

export const NARRATIVE_SYSTEM_PLAIN = [
  "你是「中式人生模拟器」的年度旁白 + 人生损友。用户会给你 JSON：玩家姓名、年龄、人生种子 runSeed、本年度结算后的八维属性 currentStats、skillAllocation、本年度事件 thisYearEvents、以及可选 skillFocus。",
  "直接输出一段中文正文（不要用 Markdown、不要编号、不要 JSON）：",
  "前半 3–6 句写年度叙事（规则同 JSON 版：锚定事件 title、连贯、不跳题）；后半 2–4 句给毒舌但温暖的人生建议，必须结合岁数、属性长短处、加点偏好。",
].join("\n");

export function buildSkillAllocationSummary(
  history: { skillAllocation?: AttrKey }[],
  thisYear?: AttrKey
): {
  pointsByDimension: Record<string, number>;
  totalSkillChoices: number;
  mostFrequentDimensions: string[];
  thisYearFocus: string | null;
} {
  const counts = Object.fromEntries(ATTR_KEYS.map((k) => [k, 0])) as Record<
    AttrKey,
    number
  >;
  for (const h of history) {
    if (h.skillAllocation) counts[h.skillAllocation]++;
  }
  if (thisYear) counts[thisYear]++;

  const pointsByDimension = Object.fromEntries(
    ATTR_KEYS.map((k) => [ATTR_LABELS[k], counts[k]])
  );

  const totalSkillChoices = ATTR_KEYS.reduce((s, k) => s + counts[k], 0);
  const max = Math.max(...ATTR_KEYS.map((k) => counts[k]), 0);
  const mostFrequentDimensions =
    max > 0
      ? ATTR_KEYS.filter((k) => counts[k] === max).map((k) => ATTR_LABELS[k])
      : [];

  return {
    pointsByDimension,
    totalSkillChoices,
    mostFrequentDimensions,
    thisYearFocus: thisYear ? skillLabel(thisYear) : null,
  };
}

export function attrsToLabeledStats(attrs: Attrs): Record<string, number> {
  return Object.fromEntries(
    ATTR_KEYS.map((k) => [ATTR_LABELS[k], attrs[k]])
  );
}

export function buildNarrativeUserJson(input: {
  name: string;
  age: number;
  runSeed: number;
  attrs: Attrs;
  historyForSkills: { skillAllocation?: AttrKey }[];
  eventIds: string[];
  eventTitles: string[];
  skillKey?: AttrKey;
}): string {
  const events = input.eventIds.map((id, i) => ({
    id,
    title: input.eventTitles[i] ?? id,
  }));

  const skillAllocation = buildSkillAllocationSummary(
    input.historyForSkills,
    input.skillKey
  );

  const payload: Record<string, unknown> = {
    player: { name: input.name, age: input.age },
    lifeSeed: {
      runSeed: input.runSeed,
      runSeedHex: `0x${input.runSeed.toString(16)}`,
    },
    currentStats: attrsToLabeledStats(input.attrs),
    skillAllocation,
    thisYearEvents: events,
  };
  if (input.skillKey) {
    payload.skillFocus = skillLabel(input.skillKey);
  }
  return JSON.stringify(payload);
}
