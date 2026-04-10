# LifeSimulator — 中式人生模拟器 Demo

Next.js 全栈 Demo：起名 → 种子化初始属性 →「下一年」走 **确定性事件引擎** + **可选 LLM 叙事**（失败则 **模板叙事**）。状态在浏览器内存中；**刷新页面会丢进度**，请用 **导出 JSON** 备份。

## 文档

- [闭环与工程规格](./docs/life-simulator-closed-loop-spec.md)
- [功能设计（定稿）](./docs/specs/2026-04-09-life-simulator-features-design.md)
- [实现计划](./docs/superpowers/plans/2026-04-09-life-simulator-implementation-plan.md)

## 本地运行

要求：**Node.js 22**（或与当前 `package.json` 中 Next 15 兼容的 LTS）。

```bash
npm install
cp .env.example .env.local
# 可选：填入 OPENAI_API_KEY；不填则全程模板叙事，仍为 HTTP 200
npm run dev
```

浏览器打开 `http://localhost:3000`：

- **`/`** — 16:9 欢迎页（`public/welcome-hero.png`），点 **开局** 进入详情。
- **`/life`** — 人生成长详情：输入名字 → 八大维度随机初值（0–100）→ 每年先 **+1 技能点** 选维度 → **确定** 后 **流式** 展示当年叙事（`POST /api/year/stream`）；无 Key 时流式输出模板文案。

## 环境变量

| 变量 | 说明 |
|------|------|
| `OPENAI_API_KEY` | 可选。空或无效时 **不调用外网**，叙事为本地模板（**方案 A**：与断网、超时耗尽一致）。 |
| `OPENAI_BASE_URL` | 可选。默认 `https://api.openai.com/v1`（兼容 OpenAI 格式 `/chat/completions` 的代理可填此处）。 |
| `OPENAI_MODEL` | 可选。默认 `gpt-4o-mini`。 |

## 随机种子（可复现）

- **`runSeed`**：`fnv1a32(normalize(name))`，同名（忽略大小写与首尾空格）同种子。
- **`yearSeed`**：`fnv1a32(\`${runSeed}:${下一岁年龄}\`)`，用于当年抽签的 **mulberry32** 根。

## API

当前 **`schemaVersion`: 2**；角色属性为八维（快乐、健康、财富、事业、学业、人际关系、爱情、婚姻），单维 **0–10000**，创建时随机 **0–100**。推进年份前客户端写入 **`state.lastSkillAllocation`** 并先把该维 **+1**（受上限约束）。

### `POST /api/year/stream`（详情页默认）

- **Body：** `{ "schemaVersion": 2, "stream": true, "state": GameState }`
- **响应：** `text/event-stream`，事件：`{ type: "delta", text }` 叙事片段；`{ type: "final", payload }` 完整 `YearApiResponse`；`{ type: "done" }`。

### `POST /api/year`（非流式 JSON，仍可用）

- **Body：** `{ "schemaVersion": 2, "state": GameState }`
- **成功：** `200` + 完整 JSON。

单次请求内顺序：**引擎 → LLM 流式（若可）否则模板流式输出**；**年龄只 +1 一次**。

## 导出存档

点击「导出存档 JSON」下载 `life-simulator-save.json`，结构：`schemaVersion`、`exportedAt`、`game`。**不提供导入**（见功能设计选项 B）。

## 多语言

- Source locale：`en`
- 当前支持语言：`en`、`zh-CN`
- 当前语言通过客户端界面切换，并会随年度请求一起发送到 `/api/year` 与 `/api/year/stream`
- Kimi 请求会显式携带当前 `locale`，并明确要求模型按该语言回复

## 部署到 Cloudflare Pages

1. 以本仓库连接 **Cloudflare Pages**。  
2. 使用当前官方文档中的 **Next.js on Cloudflare** 流程（例如 **OpenNext Cloudflare** 适配器）；具体包名与构建命令以 [Cloudflare Pages 框架指南](https://developers.cloudflare.com/pages/framework-guides/nextjs/) 为准。  
3. 在 Pages **环境变量** 中配置 `OPENAI_API_KEY` 等（勿提交到 Git）。  
4. **Worker 单次请求 CPU/时长**若不足以支撑「3×12s」LLM 重试，可在实现上改为 **1 次重试** 并在此 README 注明实际策略；兜底仍为模板叙事 + `200`。

## 脚本

```bash
npm run dev      # 开发
npm run build    # 生产构建
npm run start    # 生产启动（先 build）
npm run test     # Vitest
npm run lint     # ESLint
```

## 目录结构（摘要）

- `data/events.json` — 静态事件池（构建期导入，无运行时 `fs`）
- `src/lib/engine/*` — 纯函数引擎（无网络）
- `src/lib/narrative/*` — LLM + 模板
- `src/app/api/year/route.ts` — 年度推进 API
- `src/components/GameClient.tsx` — 客户端状态与导出

## 流式（未实现）

第一版仅 **非流式**；类型与请求体保留 `stream` 字段。后续在 Cloudflare 上增加 SSE/NDJSON 时需遵守功能设计 **S1**（半段叙事不写入已提交 state）。
