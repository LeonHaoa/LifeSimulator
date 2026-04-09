import type { AttrKey } from "@/lib/constants";
import { ATTR_LABELS } from "@/lib/constants";

const FLAVOR: Record<AttrKey, string> = {
  happiness:
    "你把这点心思花在「快乐」上，这一年心里像开了小灯，容易笑出声。",
  health:
    "你更在意「健康」，作息或心态上悄悄挪了一步，身体少跟你闹别扭。",
  wealth:
    "你押注在「财富」上，对钱更敏感一点，机会与抠门同时上门。",
  career:
    "你投资「事业」，职场上多了一点存在感，也多一点背锅风险。",
  study:
    "你加在「学业」上，脑子多转了几圈，卷子和头发一起变多。",
  social:
    "你强化「人际关系」，饭局消息变密，人情债也悄悄记账。",
  love:
    "你把点加在「爱情」上，心动与误会轮流值班，剧情略狗血。",
  marriage:
    "你关注「婚姻」议题，承诺与琐事同框出现，像开联名账户。",
};

export function skillFlavorLine(key: AttrKey): string {
  return FLAVOR[key];
}

export function skillLabel(key: AttrKey): string {
  return ATTR_LABELS[key];
}
