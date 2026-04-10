# LifeSimulator — 中式人生模拟器 Demo

Next.js 全栈 Demo：起名 → 种子化初始属性 →「下一年」走 **确定性事件引擎** + **可选 LLM 叙事**（失败则 **模板叙事**）。状态在浏览器内存中；**刷新页面会丢进度**，请用 **导出 JSON** 备份。

## 文档

- [闭环与工程规格](./docs/life-simulator-closed-loop-spec.md)
- [功能设计（定稿）](./docs/specs/2026-04-09-life-simulator-features-design.md)
- [实现计划](./docs/superpowers/plans/2026-04-09-life-simulator-implementation-plan.md)

## 本地运行

要求：**Node.js 22**（或与当前 `package.json` 中 Next 15 兼容的 LTS）。

**必须在项目目录下执行**（有 `package.json` 的那一层）：

```bash
cd LifeSimulator
npm install
cp .env.example .env.local
```

Kimi（Moonshot）示例（仍使用 `OPENAI_*` 变量名，协议与 OpenAI 兼容）：

```bash
# .env.local
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=kimi-k2.5
OPENAI_API_KEY=你的_key
```

**推荐开发启动**（固定 `127.0.0.1:3001`，启动前会自动尝试释放 3001 端口，并用 polling 缓解 macOS 上 `EMFILE` watcher 报错）：

```bash
npm run dev:stable
```

若开发中曾出现 **`SegmentViewNode` / `React Client Manifest`**、**`Cannot find module './611.js'`** 等错误，多半是 **`.next` 缓存与 HMR 不一致**。请先 **停掉 dev**，再执行：

```bash
npm run dev:fresh
```

（等价于删除 `.next` 后重新 `dev:stable`。）项目已在 `next.config.ts` 中关闭 **`experimental.devtoolSegmentExplorer`**，减轻 Next DevTools 相关 bundler 报错概率。

浏览器打开 `http://127.0.0.1:3001`：

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

## 部署到 Cloudflare Pages

1. 以本仓库连接 **Cloudflare Pages**。  
2. 使用当前官方文档中的 **Next.js on Cloudflare** 流程（例如 **OpenNext Cloudflare** 适配器）；具体包名与构建命令以 [Cloudflare Pages 框架指南](https://developers.cloudflare.com/pages/framework-guides/nextjs/) 为准。  
3. 在 Pages **环境变量** 中配置 `OPENAI_API_KEY` 等（勿提交到 Git）。  
4. **Worker 单次请求 CPU/时长**若不足以支撑「3×12s」LLM 重试，可在实现上改为 **1 次重试** 并在此 README 注明实际策略；兜底仍为模板叙事 + `200`。

## 脚本

```bash
npm run dev            # 开发（默认 Next）
npm run dev:local      # 开发（释放 3001 + 固定 127.0.0.1:3001）
npm run dev:stable     # 开发（释放 3001 + polling + LLM 超时 20s，推荐）
npm run dev:fresh      # 删除 .next 后 dev:stable（HMR/缓存异常时用）
npm run dev:turbo      # 开发（释放 3001 + Turbopack）
npm run build    # 生产构建
npm run start    # 生产启动（先 build）
npm run start:local    # 生产（释放 3001 + 固定 127.0.0.1:3001 + LLM 超时 20s）
npm run test     # Vitest
npm run lint     # ESLint
```

### 如何确认叙事来自 Kimi

推进一年后，接口返回里 `yearSummary.fallback === false` 表示使用了外部模型；`true` 表示走了本地模板兜底。

### 端口仍被占用（Windows）

`scripts/free-port.mjs` 在 Windows 上为 no-op。请自行结束占用 3001 的进程，或临时改端口：

```bash
npx next dev --hostname 127.0.0.1 --port 3002
```

## 目录结构（摘要）

- `data/events.json` — 静态事件池（构建期导入，无运行时 `fs`）
- `src/lib/engine/*` — 纯函数引擎（无网络）
- `src/lib/narrative/*` — LLM + 模板
- `src/app/api/year/route.ts` — 年度推进 API
- `src/components/GameClient.tsx` — 客户端状态与导出

## 流式（未实现）

第一版仅 **非流式**；类型与请求体保留 `stream` 字段。后续在 Cloudflare 上增加 SSE/NDJSON 时需遵守功能设计 **S1**（半段叙事不写入已提交 state）。
