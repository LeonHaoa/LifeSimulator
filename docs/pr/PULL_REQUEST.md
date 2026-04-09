# PR 标题（建议）

**feat: 中式人生模拟器 Web Demo（Next.js / 确定性引擎 / LLM 降级）**

---

## Summary

- **Next.js 15（App Router）**：`POST /api/year` 单次请求内 **引擎 → OpenAI 兼容 LLM（12s 超时 + 2 次重试）→ 模板叙事**；无 Key / 超时 / 校验失败走 **方案 A**，仍返回 **HTTP 200** 与完整 `GameState`。
- **事件引擎**：`data/events.json` 构建期导入；`advanceYear` 纯函数 + **mulberry32** + **yearSeed**；Vitest **11** 条用例。
- **前端**：起名开局、「下一年」、**70/80/90/100** 里程碑文案、**导出 JSON**（无导入）；请求体预留 **`stream`** 字段（当前忽略）。
- **文档**：功能设计 / 闭环规格 / 实现计划；**README** 含种子说明与 **Cloudflare Pages** 部署指引。

## Test plan

- [ ] `npm run test` — 全部通过
- [ ] `npm run lint` — 无告警
- [ ] `npm run build` — 生产构建通过
- [ ] `npm run dev` — 开局 → 连续「下一年」≥10 次，年龄单调 +1
- [ ] 未配置 `OPENAI_API_KEY` 仍可玩通（模板叙事）
- [ ] （可选）配置 Key 后叙事来自 LLM

## 合并后建议

- 在 Cloudflare Pages 按官方 Next 适配流程连接本仓库并配置环境变量。
- 合并后本地执行：`git checkout main && git pull`，再视需要删除 `feat/life-simulator-demo`。

## 相关文档

- `docs/specs/2026-04-09-life-simulator-features-design.md`
- `docs/life-simulator-closed-loop-spec.md`
- `docs/superpowers/plans/2026-04-09-life-simulator-implementation-plan.md`
