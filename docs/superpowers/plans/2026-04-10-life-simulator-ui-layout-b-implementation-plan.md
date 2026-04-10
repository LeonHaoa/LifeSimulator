# UI Layout (方案 B：居中舞台 + 底部指令条 + 年鉴抽屉) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `/life` 页面改成“游戏常见布局”：单列居中舞台（Stage）+ 固定底部指令条（Command Bar）+ 年鉴抽屉（Drawer），提升视觉居中与操作一致性。

**Architecture:** 继续复用 `LifeDetailClient` 内现有状态机（`phase/step`）与现有 CSS 主题变量；仅重排 DOM 结构与 CSS。年鉴从常驻 `<aside>` 改为 Drawer（遮罩 + 面板），按钮入口统一到 Command Bar。

**Tech Stack:** Next.js App Router, React, TypeScript, CSS（`src/app/globals.css`）, framer-motion（仅用于现有 round badge 与页面段落动画，不新增重动效）。

---

## File structure (modify / create)

**Modify:**
- `src/components/LifeDetailClient.tsx`
- `src/app/globals.css`

**No new deps.**

---

### Task 1: 新增布局容器与“舞台”结构（不改功能）

**Files:**
- Modify: `src/components/LifeDetailClient.tsx`

- [ ] **Step 1: 在 JSX 外层引入 shell/stage 容器**

把现有：

```tsx
<>
  <GameAmbientBg variant="life" />
  <div className="life-page">
    <header className="life-header">...</header>
    ...
  </div>
</>
```

改为：

```tsx
<>
  <GameAmbientBg variant="life" />
  <div className="life-shell">
    <div className="life-page">
      <header className="life-header">...</header>
      <main className="life-stage" aria-label="主舞台">
        {/* 原来的 AnimatePresence 内容放进来 */}
      </main>
    </div>
  </div>
</>
```

- [ ] **Step 2: 运行类型检查与构建**

Run: `npm run build`  
Expected: PASS

---

### Task 2: 把年鉴 `<aside>` 改成 Drawer（仍可从 UI 打开）

**Files:**
- Modify: `src/components/LifeDetailClient.tsx`

- [ ] **Step 1: 增加抽屉开关 state**

在 `LifeDetailClient` state 区添加：

```tsx
const [journalOpen, setJournalOpen] = useState(false);
```

- [ ] **Step 2: 把 `<aside>...</aside>` 内容抽成可复用片段**

保留原有年鉴 section 的 DOM（`<motion.section className="life-panel">` 内的标题、列表、导出按钮），但不要再放在 `<aside>` 常驻列中。

建议提取为：

```tsx
const JournalPanel = (
  <section className="life-panel life-panel--drawer">
    {/* 原 aside 里的内容（年鉴 ul + 导出按钮） */}
  </section>
);
```

（注意：如果继续使用 `motion.section` 也可，但 drawer 内动效可先不要，避免视觉噪音。）

- [ ] **Step 3: 在组件末尾渲染 Drawer**

在 `return` 的最底部（仍在 `life-shell` 内）添加：

```tsx
{journalOpen ? (
  <div className="life-drawer" role="dialog" aria-modal="true" aria-label="年鉴">
    <button
      type="button"
      className="life-drawer__overlay"
      aria-label="关闭年鉴"
      onClick={() => setJournalOpen(false)}
    />
    <div className="life-drawer__panel">
      <div className="life-drawer__header">
        <div className="life-drawer__title">年鉴</div>
        <button
          type="button"
          className="life-drawer__close"
          onClick={() => setJournalOpen(false)}
          aria-label="关闭"
        >
          ✕
        </button>
      </div>
      <div className="life-drawer__body">{JournalPanel}</div>
    </div>
  </div>
) : null}
```

- [ ] **Step 4: Esc 关闭**

添加 effect：

```tsx
useEffect(() => {
  if (!journalOpen) return;
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") setJournalOpen(false);
  };
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [journalOpen]);
```

- [ ] **Step 5: 运行 lint**

Run: `npm run lint`  
Expected: PASS

---

### Task 3: 引入固定底部指令条（Command Bar）并迁移主要按钮

**Files:**
- Modify: `src/components/LifeDetailClient.tsx`

- [ ] **Step 1: 在 `life-shell` 内、drawer 之前渲染 command bar**

添加：

```tsx
<div className="life-commandbar" role="group" aria-label="指令条">
  <div className="life-commandbar__inner">
    <div className="life-commandbar__left">
      {/* 状态提示：gain/lose/none + remaining */}
    </div>
    <div className="life-commandbar__center">
      {/* 主按钮：按 phase/step 显示 */}
    </div>
    <div className="life-commandbar__right">
      <button
        type="button"
        className="life-commandbar__btn"
        onClick={() => setJournalOpen(true)}
        disabled={phase !== "play" || !state}
      >
        年鉴
      </button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: 迁移 step=allocate 内的“开启下一年”按钮**

删除原来在 `step === "allocate"` 分支里的大按钮（`className="primary-btn"` 那个），改由 command bar 中心按钮承载：

```tsx
{phase === "play" && state ? (
  step === "allocate" ? (
    <button
      type="button"
      className="life-commandbar__primary"
      disabled={!canStartYear}
      onClick={() => void startYear()}
    >
      {/* 文案沿用原逻辑 */}
    </button>
  ) : step === "idle" ? (
    <button
      type="button"
      className="life-commandbar__primary"
      onClick={prepareNextYear}
    >
      下一年
    </button>
  ) : (
    <button type="button" className="life-commandbar__primary" disabled>
      {step === "transition" ? "下一年开启中…" : "叙事生成中…"}
    </button>
  )
) : (
  <button type="button" className="life-commandbar__primary" disabled>
    请先创建角色
  </button>
)}
```

- [ ] **Step 3: command bar 左侧提示文案**

左侧建议显示：

```tsx
{phase === "play" && state ? (
  <div className="life-commandbar__hint">
    {mode === "gain"
      ? `剩余 ${remaining} 点`
      : mode === "lose"
        ? `待扣 ${remaining} 点`
        : "本年无需分配"}
  </div>
) : (
  <div className="life-commandbar__hint">准备开始</div>
)}
```

- [ ] **Step 4: 构建通过**

Run: `npm run build`  
Expected: PASS

---

### Task 4: CSS：居中舞台、固定指令条、抽屉样式（移动优先）

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: 新增 shell/stage/commandbar/drawer 样式**

追加（放在 life page 段落附近即可，保持同类聚合）：

```css
.life-shell {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding-bottom: calc(96px + env(safe-area-inset-bottom));
}

.life-page {
  max-width: min(980px, calc(100vw - 2rem));
  margin: 0 auto;
  padding: 1.25rem 0 2.5rem;
}

.life-stage {
  display: grid;
  gap: 1.1rem;
}

.life-commandbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
  background: linear-gradient(
    180deg,
    rgba(7, 9, 16, 0) 0%,
    rgba(7, 9, 16, 0.72) 35%,
    rgba(7, 9, 16, 0.92) 100%
  );
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.life-commandbar__inner {
  max-width: min(980px, calc(100vw - 2rem));
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0.75rem;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 0.7rem 0.8rem;
  background: rgba(18, 22, 34, 0.62);
  box-shadow: 0 12px 50px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(0, 0, 0, 0.25) inset,
    0 0 42px rgba(91, 140, 255, 0.10);
}

.life-commandbar__left,
.life-commandbar__right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.life-commandbar__right {
  justify-content: flex-end;
}

.life-commandbar__hint {
  font-size: 0.82rem;
  color: var(--muted);
  letter-spacing: 0.06em;
}

.life-commandbar__btn {
  height: 40px;
  padding: 0 0.9rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  font-weight: 700;
  cursor: pointer;
}

.life-commandbar__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.life-commandbar__primary {
  height: 44px;
  min-width: 220px;
  padding: 0 1.25rem;
  border: none;
  border-radius: 14px;
  color: #fff;
  font-weight: 800;
  letter-spacing: 0.08em;
  cursor: pointer;
  background: linear-gradient(
    135deg,
    var(--accent) 0%,
    var(--accent2) 60%,
    #5a4fcf 100%
  );
  box-shadow: 0 10px 36px rgba(91, 140, 255, 0.35);
}

.life-commandbar__primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.life-drawer {
  position: fixed;
  inset: 0;
  z-index: 30;
}

.life-drawer__overlay {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.55);
}

.life-drawer__panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: min(86vh, 720px);
  border-radius: 18px 18px 0 0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(18, 22, 34, 0.92);
  box-shadow: 0 -24px 80px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

.life-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.life-drawer__title {
  font-weight: 900;
  letter-spacing: 0.06em;
}

.life-drawer__close {
  height: 36px;
  width: 36px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  cursor: pointer;
}

.life-drawer__body {
  padding: 1rem;
  overflow: auto;
}
```

- [ ] **Step 2: 移除两列布局**

把 `.life-grid` 保持为单列；删除/改写：

```css
@media (min-width: 860px) {
  .life-grid { grid-template-columns: 1fr 340px; }
}
```

改为不再生成第二列（可以直接删掉该 media 块，或保留但仍 `1fr`）。

- [ ] **Step 3: 预留内容不被指令条遮挡**

确保 `life-shell` 的 `padding-bottom` 大于 command bar 高度（已在 Step 1 给出）。

- [ ] **Step 4: lint/build**

Run: `npm run lint && npm run build`  
Expected: PASS

---

### Task 5: 手动验收脚本（开发态）

**Files:** none

- [ ] **Step 1: 清缓存启动（避免 dev chunk 问题）**

Run: `npm run dev:fresh`

- [ ] **Step 2: 验证布局**

在 `/life`：
- 创建角色后，舞台内容居中，左右留白明显
- 页面可滚动，但底部指令条固定
- “开启下一年/下一年”只出现在指令条中
- 点击“年鉴”打开 Drawer；点击遮罩/右上角 ✕ / Esc 可关闭

- [ ] **Step 3: 验证关键流程不回归**

- 分配技能点、推进一年、流式叙事、结算、下一年循环仍正常
- 音效/音乐开关仍正常

