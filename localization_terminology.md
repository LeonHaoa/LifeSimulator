# Localization Terminology

## Usage

Use this file to record product-level terminology decisions. Keep it short, stable, and high-signal.

## Source Rules

1. `en` is the only source locale.
2. `zh-CN` aligns to `en` meaning, not literal sentence shape.
3. Protected terms should not be casually rewritten.
4. Repeated gameplay actions must use the same wording across UI, fallback narrative, and LLM prompts when user-visible.

## Preferred Terms

| English | Preferred Product Term | Notes |
|---|---|---|
| Life Simulator | 人生模拟器 | Product-facing generic term |
| Start Life | 开始人生 | Primary start CTA |
| Next Year | 下一年 | Core yearly progression action |
| Almanac | 年鉴 | History panel label |
| Skill Point | 技能点 | Point allocation unit |
| Narrative | 叙事 | User-visible yearly text block |
| Character | 角色 | Used in creation and status areas |
| Attribute | 维度 | Player stat dimension |
| Happiness | 快乐 | Stable attribute label |
| Health | 健康 | Stable attribute label |
| Wealth | 财富 | Stable attribute label |
| Career | 事业 | Stable attribute label |
| Study | 学业 | Stable attribute label |
| Social | 人际关系 | Stable attribute label |
| Love | 爱情 | Stable attribute label |
| Marriage | 婚姻 | Stable attribute label |
| Local narrative | 本地叙事 | Used when fallback text is shown |

## Protected Terms

| Term | Notes |
|---|---|
| LifeSimulator | Repo and project identifier |
| Kimi | Model/provider name should remain Kimi |
| runSeed | Internal deterministic seed field |
| locale | Request field name |
| schemaVersion | API/schema field name |
| JSON | Keep as JSON in both locales when technical |
| SSE | Keep as SSE in technical contexts |

## Locale Notes

### zh-CN

- Prefer concise modern Simplified Chinese.
- Keep the playful, teasing tone, but avoid regional slang that reduces readability.
- Do not force English sentence rhythm onto Chinese copy.
- For buttons and labels, prefer shorter options when meaning stays intact.

### en

- English source should read as product copy, not as a literal back-translation from Chinese.
- Prefer short, punchy, natural UI wording.
- Narrative English should feel witty and conversational, not meme-heavy or archaic.

## Open Decisions

- Whether `Life Simulator` should later become a more distinctive branded English subtitle.
- Whether `Almanac` should remain the long-term label or be changed to `History` for broader clarity.

## Current Status

- Implemented bilingual dictionaries for `en` and `zh-CN`.
- UI, fallback narrative, event titles, and Kimi prompt language control now use locale-aware dictionary data.
