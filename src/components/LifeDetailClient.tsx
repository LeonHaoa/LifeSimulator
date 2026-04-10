"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { GameState } from "@/lib/schemas/game";
import type { YearApiResponse } from "@/lib/schemas/game";
import {
  ATTR_KEYS,
  ATTR_LABELS,
  ATTR_MAX,
  SCHEMA_VERSION,
  yearlySkillPoints,
} from "@/lib/constants";
import type { AttrKey } from "@/lib/constants";
import { createInitialState } from "@/lib/engine/initial-state";
import { GameAmbientBg } from "@/components/GameAmbientBg";
import {
  ensureAudioContext,
  readBgmEnabled,
  readSfxEnabled,
  sfxBgmPreview,
  sfxError,
  sfxSkillTick,
  sfxUiClick,
  sfxYearAdvance,
  sfxYearComplete,
  startAmbientBgm,
  stopAmbientBgm,
  writeBgmEnabled,
  writeSfxEnabled,
} from "@/lib/audio/game-audio";

type Phase = "name" | "play";
type Step = "allocate" | "transition" | "streaming" | "idle";

type AllocationMap = Partial<Record<AttrKey, number>>;

function clampAttr(n: number): number {
  return Math.max(0, Math.min(ATTR_MAX, n));
}

function sumAlloc(alloc: AllocationMap): number {
  return Object.values(alloc).reduce((s, v) => s + (v ?? 0), 0);
}

function primaryKeyFromAlloc(alloc: AllocationMap): AttrKey | undefined {
  let best: { k: AttrKey; v: number } | null = null;
  for (const k of ATTR_KEYS) {
    const v = alloc[k] ?? 0;
    if (v === 0) continue;
    const score = Math.abs(v);
    if (!best || score > Math.abs(best.v)) best = { k, v };
  }
  return best?.k;
}

function applyAllocToState(state: GameState, alloc: AllocationMap): GameState {
  let attrs = { ...state.attrs };
  for (const k of ATTR_KEYS) {
    const delta = alloc[k] ?? 0;
    if (!delta) continue;
    attrs = { ...attrs, [k]: clampAttr(attrs[k] + delta) };
  }
  return {
    ...state,
    attrs,
    lastSkillAllocation: primaryKeyFromAlloc(alloc),
  };
}

async function consumeYearStream(
  state: GameState,
  onDelta: (t: string) => void
): Promise<YearApiResponse> {
  const res = await fetch("/api/year/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      stream: true,
      state,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err === "object" && err && "error" in err
        ? String((err as { error: string }).error)
        : `HTTP ${res.status}`
    );
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("无法读取流式响应");

  const dec = new TextDecoder();
  let buf = "";
  let finalPayload: YearApiResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });

    let sep: number;
    while ((sep = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, sep).trim();
      buf = buf.slice(sep + 2);
      if (!block.startsWith("data:")) continue;
      const raw = block.slice(5).trim();
      let msg: {
        type: string;
        text?: string;
        payload?: YearApiResponse;
        message?: string;
      };
      try {
        msg = JSON.parse(raw) as typeof msg;
      } catch {
        continue;
      }
      if (msg.type === "delta" && msg.text) onDelta(msg.text);
      if (msg.type === "final" && msg.payload) finalPayload = msg.payload;
      if (msg.type === "error")
        throw new Error(msg.message || "流式叙事失败");
    }
  }

  if (!finalPayload) throw new Error("未收到完整游戏状态");
  return finalPayload;
}

export function LifeDetailClient() {
  const [phase, setPhase] = useState<Phase>("name");
  const [step, setStep] = useState<Step>("allocate");
  const [nameInput, setNameInput] = useState("");
  const [state, setState] = useState<GameState | null>(null);
  const [alloc, setAlloc] = useState<AllocationMap>({});
  const [streamText, setStreamText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [bgmEnabled, setBgmEnabled] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  /** Narrative chunks while sun/moon runs; flushed after request settles. */
  const heldStreamQueueRef = useRef("");

  // Slower client-side rendering: buffer deltas and type them out.
  const renderQueueRef = useRef<string>("");
  const flushingRef = useRef(false);
  const streamTargetMsRef = useRef(20_000);
  const streamStartAtRef = useRef<number>(0);

  const flushRenderQueue = useCallback(() => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    const tick = () => {
      const q = renderQueueRef.current;
      if (!q) {
        flushingRef.current = false;
        return;
      }
      const elapsed = Date.now() - (streamStartAtRef.current || Date.now());
      const remainingMs = Math.max(0, streamTargetMsRef.current - elapsed);
      // Aim to finish around target duration, but keep it readable.
      const perCharMs = Math.max(12, Math.min(90, remainingMs / q.length));
      const take = Math.max(1, Math.min(3, Math.floor(36 / perCharMs)));
      const piece = q.slice(0, take);
      renderQueueRef.current = q.slice(take);
      setStreamText((prev) => prev + piece);
      window.setTimeout(tick, perCharMs);
    };
    tick();
  }, []);

  useEffect(() => {
    setSfxEnabled(readSfxEnabled());
    setBgmEnabled(readBgmEnabled());
  }, []);

  useEffect(() => {
    if (!bgmEnabled || phase !== "play") {
      stopAmbientBgm();
      return;
    }
    let cancelled = false;
    void ensureAudioContext().then(() => {
      if (!cancelled && bgmEnabled && phase === "play") void startAmbientBgm();
    });
    return () => {
      cancelled = true;
      stopAmbientBgm();
    };
  }, [bgmEnabled, phase]);

  useEffect(() => {
    return () => {
      renderQueueRef.current = "";
      heldStreamQueueRef.current = "";
      flushingRef.current = false;
      stopAmbientBgm();
    };
  }, []);

  useEffect(() => {
    if (!journalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setJournalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [journalOpen]);

  const beginLife = () => {
    setErr(null);
    playSfx(sfxUiClick);
    try {
      const s = createInitialState(nameInput);
      setState(s);
      setPhase("play");
      setStep("allocate");
      setAlloc({});
      setStreamText("");
      setMilestone(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "创建角色失败");
    }
  };

  const nextAge = state ? state.age + 1 : 1;
  const skillBudget = useMemo(() => yearlySkillPoints(nextAge), [nextAge]);
  const spent = useMemo(() => sumAlloc(alloc), [alloc]);
  const remaining = useMemo(() => {
    if (skillBudget >= 0) return Math.max(0, skillBudget - spent);
    // budget is negative: user must allocate -2 total (e.g. -2).
    return Math.max(0, Math.abs(skillBudget) - Math.abs(spent));
  }, [skillBudget, spent]);

  const mode = useMemo<"gain" | "none" | "lose">(() => {
    if (skillBudget > 0) return "gain";
    if (skillBudget < 0) return "lose";
    return "none";
  }, [skillBudget]);

  const canStartYear = useMemo(() => {
    if (!state || busy) return false;
    if (mode === "none") return true;
    return remaining === 0;
  }, [state, busy, mode, remaining]);

  const displayRound = useMemo(() => {
    if (!state) return 1;
    if (step === "idle" && state.history.length > 0) return state.history.length;
    return state.history.length + 1;
  }, [state, step]);

  const roundBadgeKey = state
    ? `${state.history.length}-${step}-${state.age}`
    : "0";

  const playSfx = useCallback(
    (fn: () => Promise<void>) => {
      if (!sfxEnabled) return;
      void fn();
    },
    [sfxEnabled]
  );

  const startYear = useCallback(async () => {
    if (!state) return;
    if (!canStartYear) return;
    setErr(null);
    setBusy(true);
    setStreamText("");
    setMilestone(null);
    heldStreamQueueRef.current = "";
    renderQueueRef.current = "";
    flushingRef.current = false;

    const prepared = applyAllocToState(state, alloc);

    // 1) Sun/moon immediately. 2) Request fires without waiting for animation.
    setStep("transition");
    playSfx(sfxYearAdvance);

    void (async () => {
      try {
        const result = await consumeYearStream(prepared, (t) => {
          heldStreamQueueRef.current += t;
        });
        renderQueueRef.current += heldStreamQueueRef.current;
        heldStreamQueueRef.current = "";
        setState(result.state);
        if (result.yearSummary.milestoneMessage) {
          setMilestone(result.yearSummary.milestoneMessage);
        }
        setAlloc({});
        playSfx(sfxYearComplete);
        // One painted frame of gradient streaming UI before settling to idle.
        setStep("streaming");
        streamStartAtRef.current = Date.now();
        flushRenderQueue();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setStep("idle");
          });
        });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "请求失败");
        heldStreamQueueRef.current = "";
        setStep("allocate");
        playSfx(sfxError);
      } finally {
        setBusy(false);
      }
    })();
  }, [state, alloc, canStartYear, flushRenderQueue, playSfx]);

  const prepareNextYear = () => {
    playSfx(sfxUiClick);
    setStep("allocate");
    setStreamText("");
    setMilestone(null);
    setAlloc({});
  };

  const exportJson = () => {
    if (!state) return;
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      game: state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "life-simulator-save.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const toggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    writeSfxEnabled(next);
    if (next) void sfxUiClick();
  };

  const toggleBgm = () => {
    const next = !bgmEnabled;
    setBgmEnabled(next);
    writeBgmEnabled(next);
    void ensureAudioContext();
    if (next && sfxEnabled) void sfxBgmPreview();
  };

  const JournalPanel = state ? (
    <section className="life-panel life-panel--drawer">
      <h2>年鉴</h2>
      <ul className="history-list">
        {state.history.length === 0 ? (
          <li style={{ color: "var(--muted)" }}>暂无记录</li>
        ) : (
          [...state.history]
            .reverse()
            .map((h) => (
              <li key={`${h.age}-${h.eventIds.join(",")}`}>
                <strong>{h.age} 岁</strong>
                {h.skillAllocation ? ` · +1 ${ATTR_LABELS[h.skillAllocation]}` : ""}
                <br />
                {h.narrative}
                {h.fallback ? (
                  <span style={{ color: "var(--muted)" }}> （本地叙事）</span>
                ) : null}
              </li>
            ))
        )}
      </ul>
      <button
        type="button"
        className="primary-btn"
        style={{
          marginTop: 12,
          background: "var(--panel2)",
          border: "1px solid var(--border)",
        }}
        onClick={exportJson}
      >
        导出存档 JSON
      </button>
    </section>
  ) : null;

  const primaryCta =
    phase === "play" && state ? (
      step === "allocate" ? (
        <button
          type="button"
          className="life-commandbar__primary"
          disabled={!canStartYear}
          onClick={() => void startYear()}
        >
          {mode === "gain"
            ? remaining === 0
              ? "开启下一年"
              : "先分配完点数"
            : mode === "lose"
              ? remaining === 0
                ? "开启下一年"
                : "先扣完点数"
              : "开启下一年"}
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
    );

  return (
    <>
      <GameAmbientBg variant="life" />
      <div className="life-shell">
        <div className="life-page">
          <header className="life-header">
            <div className="life-header__brand">
              <span className="life-hud-badge" aria-hidden="true">
                ◆ 人生模拟 ◆
              </span>
              <div className="life-header__title-row">
                <h1>人生成长</h1>
                {phase === "play" && state && (
                  <motion.span
                    key={roundBadgeKey}
                    className="life-round-badge"
                    initial={{ scale: 0.65, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 460, damping: 24 }}
                  >
                    第 {displayRound} 回合
                    {step === "idle" && state.history.length > 0 ? (
                      <span className="life-round-badge__sub">已结算</span>
                    ) : (
                      <span className="life-round-badge__sub">进行中</span>
                    )}
                  </motion.span>
                )}
              </div>
              <p className="life-header__tagline">技能 · 流年 · 叙事</p>
            </div>
            <div className="life-header__actions">
              <div className="life-audio-bar" role="group" aria-label="音频">
                <button
                  type="button"
                  className={`life-audio-btn${sfxEnabled ? " is-on" : ""}`}
                  onClick={toggleSfx}
                  aria-pressed={sfxEnabled}
                >
                  音效
                </button>
                <button
                  type="button"
                  className={`life-audio-btn${bgmEnabled ? " is-on" : ""}`}
                  onClick={toggleBgm}
                  aria-pressed={bgmEnabled}
                >
                  音乐
                </button>
              </div>
              <Link href="/" className="life-back">
                ← 返回欢迎页
              </Link>
            </div>
          </header>

          <main className="life-stage" aria-label="主舞台">
            <AnimatePresence mode="wait">
        {phase === "name" && (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="life-panel name-form"
          >
            <h2>创建角色</h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
              进入详情页后，将随机生成八大维度初始值（0–100），每年可先分配
              技能点再推进剧情（规则与年龄相关）。
            </p>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="你的名字"
              maxLength={20}
            />
            <button type="button" className="primary-btn" onClick={beginLife}>
              开始人生
            </button>
          </motion.div>
        )}

        {phase === "play" && state && (
          <motion.div
            key="play"
            className="life-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            <div>
              <motion.section
                className="life-panel"
                layout
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
              >
                <h2>角色状态</h2>
                <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 0 }}>
                  {state.name} · {state.age} 岁 · 上限 {ATTR_MAX} 点 / 维
                </p>
                <div className="stat-grid">
                  {ATTR_KEYS.map((k) => (
                    <motion.div
                      key={k}
                      className="stat-card"
                      data-stat={k}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: ATTR_KEYS.indexOf(k) * 0.03 }}
                    >
                      <div className="label">{ATTR_LABELS[k]}</div>
                      <div className="value">{state.attrs[k]}</div>
                    </motion.div>
                  ))}
                </div>

                {step === "allocate" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <h2 style={{ marginTop: "1.25rem" }}>开启下一年</h2>
                    <p
                      style={{
                        color: "var(--muted)",
                        fontSize: "0.88rem",
                        marginTop: 0,
                      }}
                    >
                      {mode === "gain"
                        ? `下一年（${nextAge} 岁）可分配：${skillBudget} 点，剩余 ${remaining} 点。`
                        : mode === "lose"
                          ? `下一年（${nextAge} 岁）需扣除：${Math.abs(skillBudget)} 点，剩余 ${remaining} 点（不允许扣到 0 以下）。`
                          : `下一年（${nextAge} 岁）不获得技能点，直接开启。`}
                    </p>
                    <div className="skill-step-grid">
                      {ATTR_KEYS.map((k) => {
                        const delta = alloc[k] ?? 0;
                        const canPlus = mode === "gain" && remaining > 0;
                        const canMinus =
                          (mode === "gain" && delta > 0) ||
                          (mode === "lose" &&
                            remaining > 0 &&
                            state.attrs[k] + delta > 0);

                        const onPlus = () => {
                          if (busy) return;
                          if (!canPlus) return;
                          playSfx(() => sfxSkillTick(1));
                          setAlloc((prev) => ({ ...prev, [k]: (prev[k] ?? 0) + 1 }));
                        };

                        const onMinus = () => {
                          if (busy) return;
                          if (!canMinus) return;
                          playSfx(() => sfxSkillTick(-1));
                          setAlloc((prev) => {
                            const cur = prev[k] ?? 0;
                            const next = cur - 1;
                            if (next === 0) {
                              // Remove key to keep alloc map small.
                              const rest: AllocationMap = { ...prev };
                              delete rest[k];
                              return rest;
                            }
                            return { ...prev, [k]: next };
                          });
                        };

                        const preview = clampAttr(state.attrs[k] + delta);

                        return (
                          <div key={k} className="skill-step">
                            <div className="skill-step-head">
                              <div className="skill-step-label">{ATTR_LABELS[k]}</div>
                              <div className="skill-step-val">{preview}</div>
                            </div>
                            <div className="skill-step-actions">
                              <button
                                type="button"
                                className="mini-btn"
                                disabled={busy || !canMinus}
                                onClick={onMinus}
                                aria-label={`${ATTR_LABELS[k]} -1`}
                              >
                                -
                              </button>
                              <div className="skill-step-delta" aria-label="delta">
                                {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "0"}
                              </div>
                              <button
                                type="button"
                                className="mini-btn"
                                disabled={busy || !canPlus}
                                onClick={onPlus}
                                aria-label={`${ATTR_LABELS[k]} +1`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="primary-btn"
                      disabled
                      aria-disabled="true"
                    >
                      操作已移到底部指令条
                    </button>
                  </motion.div>
                )}

                {step === "transition" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <h2 style={{ marginTop: "1.25rem" }}>下一年开启中…</h2>
                    <div className="year-transition" style={{ marginTop: 8 }}>
                      <div className="sky" aria-hidden="true" />
                      <div className="sun-orb" aria-hidden="true" />
                      <div className="moon-orb" aria-hidden="true" />
                      <div className="caption">
                        <div className="cap-title">开启下一年</div>
                        <div className="cap-sub">
                          日出日落之间，你又长大了一点点
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === "streaming" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <h2 style={{ marginTop: "1.25rem" }}>这一年……</h2>
                    <div className="stream-box stream-sun">
                      <div className="sun-overlay" aria-hidden="true" />
                      <div className="sun-light" aria-hidden="true" />
                      <div className="stream-text">{streamText}</div>
                    </div>
                    {busy && (
                      <p
                        style={{
                          color: "var(--muted)",
                          fontSize: "0.85rem",
                          marginTop: 8,
                        }}
                      >
                        叙事生成中
                      </p>
                    )}
                  </motion.div>
                )}

                {step === "idle" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <h2 style={{ marginTop: "1.25rem" }}>这一年……</h2>
                    <div className="stream-box">{streamText}</div>
                  </motion.div>
                )}

                {milestone && (
                  <motion.div
                    className="milestone-banner"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    {milestone}
                  </motion.div>
                )}
              </motion.section>
            </div>
          </motion.div>
        )}
            </AnimatePresence>
          </main>

          {err && (
            <p style={{ color: "var(--danger)", marginTop: "1rem" }}>{err}</p>
          )}
        </div>
      </div>

      <div className="life-commandbar" role="group" aria-label="指令条">
        <div className="life-commandbar__inner">
          <div className="life-commandbar__left">
            <div className="life-commandbar__hint">
              {phase === "play" && state
                ? mode === "gain"
                  ? `剩余 ${remaining} 点`
                  : mode === "lose"
                    ? `待扣 ${remaining} 点`
                    : "本年无需分配"
                : "准备开始"}
            </div>
          </div>
          <div className="life-commandbar__center">{primaryCta}</div>
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

      {journalOpen && (
        <div
          className="life-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="年鉴"
        >
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
      )}
    </>
  );
}
