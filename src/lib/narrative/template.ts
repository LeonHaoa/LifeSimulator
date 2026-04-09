import type { AttrKey } from "@/lib/constants";
import { skillFlavorLine } from "./skill-flavor";

export function templateNarrative(
  name: string,
  age: number,
  eventTitles: string[],
  skillKey?: AttrKey
): string {
  const bits = eventTitles.join("；");
  let body = `${name} 在 ${age} 岁这一年：${bits}。`;
  if (skillKey) {
    body += skillFlavorLine(skillKey);
  } else {
    body += "日子还得过。";
  }
  return body;
}
