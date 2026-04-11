"use client";

import React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { GameState, YearApiResponse } from "@/lib/schemas/game";
import { ATTR_KEYS, ATTR_MAX, SCHEMA_VERSION, yearlySkillPoints } from "@/lib/constants";
import type { AttrKey } from "@/lib/constants";
import {
  createInitialState,
  validateNewName,
} from "@/lib/engine/initial-state";
import { GameAmbientBg } from "@/components/GameAmbientBg";
import { t } from "@/lib/i18n/dictionary";
import { useLocale } from "@/lib/i18n/client-locale";
import type { Locale } from "@/lib/i18n/types";
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
  return Object.values(alloc).reduce((sum, value) => sum + (value ?? 0), 0);
}

function primaryKeyFromAlloc(alloc: AllocationMap): AttrKey | undefined {
  let best: { key: AttrKey; delta: number } | null = null;
  for (const key of ATTR_KEYS) {
    const delta = alloc[key] ?? 0;
    if (delta === 0) continue;
    if (!best || Math.abs(delta) > Math.abs(best.delta)) {
      best = { key, delta };
    }
  }
  return best?.key;
}

function applyAllocToState(state: GameState, alloc: AllocationMap): GameState {
  let attrs = { ...state.attrs };
  for (const key of ATTR_KEYS) {
    const delta = alloc[key] ?? 0;
    if (!delta) continue;
    attrs = { ...attrs, [key]: clampAttr(attrs[key] + delta) };
  }

  return {
    ...state,
    attrs,
    lastSkillAllocation: primaryKeyFromAlloc(alloc),
  };
}

async function consumeYearStream(
  locale: Locale,
  state: GameState,
  onDelta: (text: string) => void,
  errors: {
    streamReadFailed: string;
    streamFailed: string;
    missingFinalState: string;
  }
): Promise<YearApiResponse> {
  const res = await fetch("/api/year/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      stream: true,
      locale,
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
  if (!reader) throw new Error(errors.streamReadFailed);

  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: YearApiResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sep).trim();
      buffer = buffer.slice(sep + 2);
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
      if (msg.type === "error") throw new Error(msg.message || errors.streamFailed);
    }
  }

  if (!finalPayload) throw new Error(errors.missingFinalState);
  return finalPayload;
}

export function LifeDetailClient() {
  const { locale, messages } = useLocale();
  const reduceMotion = useReducedMotion();
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
  const [deathCurtainDismissed, setDeathCurtainDismissed] = useState(false);
  const heldStreamQueueRef = useRef("");
  const renderQueueRef = useRef("");
  const flushingRef = useRef(false);
  const streamTargetMsRef = useRef(20_000);
  const streamStartAtRef = useRef<number>(0);

  const statLabel = useCallback(
    (key: AttrKey) => messages.stats[key].label,
    [messages.stats]
  );

  const playSfx = useCallback(
    (fn: () => Promise<void>) => {
      if (!sfxEnabled) return;
      void fn();
    },
    [sfxEnabled]
  );

  const flushRenderQueue = useCallback(() => {
    if (flushingRef.current) return;
    flushingRef.current = true;

    const tick = () => {
      const queue = renderQueueRef.current;
      if (!queue) {
        flushingRef.current = false;
        return;
      }
      const elapsed = Date.now() - (streamStartAtRef.current || Date.now());
      const remainingMs = Math.max(0, streamTargetMsRef.current - elapsed);
      const perCharMs = Math.max(12, Math.min(90, remainingMs / queue.length));
      const take = Math.max(1, Math.min(3, Math.floor(36 / perCharMs)));
      const piece = queue.slice(0, take);
      renderQueueRef.current = queue.slice(take);
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setJournalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [journalOpen]);

  const beginLife = () => {
    setErr(null);
    playSfx(sfxUiClick);
    try {
      validateNewName(nameInput);
      const nextState = createInitialState(nameInput);
      setState(nextState);
      setPhase("play");
      setStep("allocate");
      setAlloc({});
      setStreamText("");
      setMilestone(null);
    } catch {
      setErr(messages.errors.invalidName);
      playSfx(sfxError);
    }
  };

  const nextAge = state ? state.age + 1 : 1;
  const isDead = state != null && state.diedAtAge != null;

  useEffect(() => {
    if (!isDead) setDeathCurtainDismissed(false);
  }, [isDead]);

  const deathCurtainOpen =
    isDead && step === "idle" && !deathCurtainDismissed && state != null;

  useEffect(() => {
    if (!deathCurtainOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDeathCurtainDismissed(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deathCurtainOpen]);

  const skillBudget = useMemo(() => yearlySkillPoints(nextAge), [nextAge]);
  const spent = useMemo(() => sumAlloc(alloc), [alloc]);
  const remaining = useMemo(() => {
    if (skillBudget >= 0) return Math.max(0, skillBudget - spent);
    return Math.max(0, Math.abs(skillBudget) - Math.abs(spent));
  }, [skillBudget, spent]);

  const mode = useMemo<"gain" | "none" | "lose">(() => {
    if (skillBudget > 0) return "gain";
    if (skillBudget < 0) return "lose";
    return "none";
  }, [skillBudget]);

  const canStartYear = useMemo(() => {
    if (!state || busy || isDead) return false;
    if (mode === "none") return true;
    return remaining === 0;
  }, [state, busy, isDead, mode, remaining]);

  const displayRound = useMemo(() => {
    if (!state) return 1;
    if (step === "idle" && state.history.length > 0) return state.history.length;
    return state.history.length + 1;
  }, [state, step]);

  const roundBadgeKey = state
    ? `${state.history.length}-${step}-${state.age}`
    : "0";

  const startYear = useCallback(async () => {
    if (!state || !canStartYear) return;

    setErr(null);
    setBusy(true);
    setStreamText("");
    setMilestone(null);
    heldStreamQueueRef.current = "";
    renderQueueRef.current = "";
    flushingRef.current = false;

    const prepared = applyAllocToState(state, alloc);
    setStep("transition");
    playSfx(sfxYearAdvance);

    void (async () => {
      try {
        const result = await consumeYearStream(
          locale,
          prepared,
          (piece) => {
            heldStreamQueueRef.current += piece;
          },
          messages.errors
        );
        renderQueueRef.current += heldStreamQueueRef.current;
        heldStreamQueueRef.current = "";
        setState(result.state);
        if (result.yearSummary.milestoneMessage) {
          setMilestone(result.yearSummary.milestoneMessage);
        }
        setAlloc({});
        playSfx(sfxYearComplete);
        setStep("streaming");
        streamStartAtRef.current = Date.now();
        flushRenderQueue();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setStep("idle");
          });
        });
      } catch (error) {
        setErr(
          error instanceof Error ? error.message : messages.errors.requestFailed
        );
        heldStreamQueueRef.current = "";
        setStep("allocate");
        playSfx(sfxError);
      } finally {
        setBusy(false);
      }
    })();
  }, [alloc, canStartYear, flushRenderQueue, locale, messages.errors, playSfx, state]);

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

  const journalTitle = messages.life.almanac.title;
  const drawerCloseLabel = locale === "zh-CN" ? "关闭" : "Close";
  const audioGroupLabel = locale === "zh-CN" ? "音频" : "Audio";
  const commandBarLabel = locale === "zh-CN" ? "指令条" : "Command bar";
  const stageLabel = locale === "zh-CN" ? "主舞台" : "Main stage";
  const readyLabel = locale === "zh-CN" ? "准备开始" : "Ready to begin";
  const noAllocationLabel =
    locale === "zh-CN" ? "本年无需分配" : "No allocation needed this year";
  const removeHintLabel =
    locale === "zh-CN" ? `待扣 ${remaining} 点` : `${remaining} point(s) to remove`;
  const remainingHintLabel =
    locale === "zh-CN" ? `剩余 ${remaining} 点` : `${remaining} point(s) left`;
  const createFirstLabel =
    locale === "zh-CN" ? "请先创建角色" : "Create a character first";

  const JournalPanel = state ? (
    <section className="life-panel life-panel--drawer">
      <h2>{messages.life.almanac.title}</h2>
      <ul className="history-list">
        {state.history.length === 0 ? (
          <li style={{ color: "var(--muted)" }}>{messages.life.almanac.empty}</li>
        ) : (
          [...state.history].reverse().map((entry) => (
            <li key={`${entry.age}-${entry.eventIds.join(",")}`}>
              <strong>
                {locale === "zh-CN" ? `${entry.age} 岁` : `Age ${entry.age}`}
              </strong>
              {entry.skillAllocation
                ? ` · +1 ${statLabel(entry.skillAllocation)}`
                : ""}
              <br />
              {entry.narrative}
              {entry.fallback ? (
                <span style={{ color: "var(--muted)" }}>
                  {" "}
                  ({messages.life.almanac.localNarrative})
                </span>
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
        {messages.life.almanac.export}
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
              ? messages.life.nextYear.start
              : messages.life.nextYear.mustSpend
            : mode === "lose"
              ? remaining === 0
                ? messages.life.nextYear.start
                : messages.life.nextYear.mustRemove
              : messages.life.nextYear.start}
        </button>
      ) : step === "idle" ? (
        isDead ? (
          <button type="button" className="life-commandbar__primary" disabled>
            {messages.life.gameOver.ended}
          </button>
        ) : (
          <button
            type="button"
            className="life-commandbar__primary"
            onClick={prepareNextYear}
          >
            {messages.life.nextYear.next}
          </button>
        )
      ) : (
        <button type="button" className="life-commandbar__primary" disabled>
          {step === "transition"
            ? messages.life.nextYear.opening
            : messages.life.nextYear.generating}
        </button>
      )
    ) : (
      <button type="button" className="life-commandbar__primary" disabled>
        {createFirstLabel}
      </button>
    );

  return (
    <>
      <GameAmbientBg variant="life" />
      <div className="life-shell">
        <div
          className={`life-page${isDead ? " life-page--deceased" : ""}`}
        >
          <header className="life-header">
            <div className="life-header__brand">
              <span className="life-hud-badge" aria-hidden="true">
                ◆ {messages.life.title} ◆
              </span>
              <div className="life-header__title-row">
                <h1>{messages.life.title}</h1>
                {phase === "play" && state && (
                  <motion.span
                    key={roundBadgeKey}
                    className={`life-round-badge${
                      isDead && step === "idle"
                        ? " life-round-badge--final"
                        : ""
                    }`}
                    initial={{ scale: 0.65, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 460, damping: 24 }}
                  >
                    {messages.life.round({ round: displayRound })}
                    {isDead && step === "idle" ? (
                      <span className="life-round-badge__sub">
                        {messages.life.gameOver.roundEnded}
                      </span>
                    ) : step === "idle" && state.history.length > 0 ? (
                      <span className="life-round-badge__sub">
                        {messages.life.settled}
                      </span>
                    ) : (
                      <span className="life-round-badge__sub">
                        {messages.life.inProgress}
                      </span>
                    )}
                  </motion.span>
                )}
              </div>
              <p className="life-header__tagline">{messages.life.tagline}</p>
            </div>
            <div className="life-header__actions">
              <div className="life-audio-bar" role="group" aria-label={audioGroupLabel}>
                <button
                  type="button"
                  className={`life-audio-btn${sfxEnabled ? " is-on" : ""}`}
                  onClick={toggleSfx}
                  aria-pressed={sfxEnabled}
                >
                  {messages.common.sfx}
                </button>
                <button
                  type="button"
                  className={`life-audio-btn${bgmEnabled ? " is-on" : ""}`}
                  onClick={toggleBgm}
                  aria-pressed={bgmEnabled}
                >
                  {messages.common.music}
                </button>
              </div>
              <Link href="/" className="life-back">
                ← {messages.common.back}
              </Link>
            </div>
          </header>

          <main className="life-stage" aria-label={stageLabel}>
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
                  <h2>{messages.life.createCharacter.title}</h2>
                  <p
                    style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}
                  >
                    {messages.life.createCharacter.description}
                  </p>
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder={messages.life.createCharacter.placeholder}
                    maxLength={20}
                  />
                  <button type="button" className="primary-btn" onClick={beginLife}>
                    {messages.life.createCharacter.submit}
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
                      className={`life-panel${
                        isDead ? " life-panel--deceased" : ""
                      }`}
                      layout
                      transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    >
                      <h2>{messages.life.status.title}</h2>
                      <p
                        style={{
                          color: "var(--muted)",
                          fontSize: "0.9rem",
                          marginTop: 0,
                        }}
                      >
                        {t(locale, "life.status.summary", {
                          name: state.name,
                          age: state.age,
                          max: ATTR_MAX,
                        })}
                        {isDead ? (
                          <span style={{ color: "var(--muted)" }}>
                            {" "}
                            · {messages.life.gameOver.badge}
                          </span>
                        ) : null}
                      </p>
                      <div className="stat-grid">
                        {ATTR_KEYS.map((key) => (
                          <motion.div
                            key={key}
                            className="stat-card"
                            data-stat={key}
                            layout
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: ATTR_KEYS.indexOf(key) * 0.03 }}
                          >
                            <div className="label">{statLabel(key)}</div>
                            <div className="value">{state.attrs[key]}</div>
                          </motion.div>
                        ))}
                      </div>

                      {step === "allocate" && !isDead && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <h2 style={{ marginTop: "1.25rem" }}>
                            {messages.life.nextYear.title}
                          </h2>
                          <p
                            style={{
                              color: "var(--muted)",
                              fontSize: "0.88rem",
                              marginTop: 0,
                            }}
                          >
                            {mode === "gain"
                              ? messages.life.nextYear.gainHint({
                                  nextAge,
                                  skillBudget,
                                  remaining,
                                })
                              : mode === "lose"
                                ? messages.life.nextYear.loseHint({
                                    nextAge,
                                    remaining: Math.abs(skillBudget),
                                  })
                                : messages.life.nextYear.noneHint({ nextAge })}
                          </p>
                          <div className="skill-step-grid">
                            {ATTR_KEYS.map((key) => {
                              const delta = alloc[key] ?? 0;
                              const canPlus = mode === "gain" && remaining > 0;
                              const canMinus =
                                (mode === "gain" && delta > 0) ||
                                (mode === "lose" &&
                                  remaining > 0 &&
                                  state.attrs[key] + delta > 0);

                              const onPlus = () => {
                                if (busy || !canPlus) return;
                                playSfx(() => sfxSkillTick(1));
                                setAlloc((prev) => ({
                                  ...prev,
                                  [key]: (prev[key] ?? 0) + 1,
                                }));
                              };

                              const onMinus = () => {
                                if (busy || !canMinus) return;
                                playSfx(() => sfxSkillTick(-1));
                                setAlloc((prev) => {
                                  const current = prev[key] ?? 0;
                                  const next = current - 1;
                                  if (next === 0) {
                                    const rest: AllocationMap = { ...prev };
                                    delete rest[key];
                                    return rest;
                                  }
                                  return { ...prev, [key]: next };
                                });
                              };

                              const preview = clampAttr(state.attrs[key] + delta);

                              return (
                                <div key={key} className="skill-step">
                                  <div className="skill-step-head">
                                    <div className="skill-step-label">
                                      {statLabel(key)}
                                    </div>
                                    <div className="skill-step-val">{preview}</div>
                                  </div>
                                  <div className="skill-step-actions">
                                    <button
                                      type="button"
                                      className="mini-btn"
                                      disabled={busy || !canMinus}
                                      onClick={onMinus}
                                      aria-label={`${statLabel(key)} -1`}
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
                                      aria-label={`${statLabel(key)} +1`}
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
                            {messages.life.nextYear.commandBarRelocated}
                          </button>
                        </motion.div>
                      )}

                      {step === "transition" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <h2 style={{ marginTop: "1.25rem" }}>
                            {messages.life.nextYear.opening}
                          </h2>
                          <div className="year-transition" style={{ marginTop: 8 }}>
                            <div className="sky" aria-hidden="true" />
                            <div className="sun-orb" aria-hidden="true" />
                            <div className="moon-orb" aria-hidden="true" />
                            <div className="caption">
                              <div className="cap-title">
                                {messages.life.nextYear.title}
                              </div>
                              <div className="cap-sub">
                                {messages.life.nextYear.openingCaption}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {step === "streaming" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <h2 style={{ marginTop: "1.25rem" }}>
                            {messages.life.nextYear.thisYear}
                          </h2>
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
                              {messages.life.nextYear.generating}
                            </p>
                          )}
                        </motion.div>
                      )}

                      {step === "idle" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <h2 style={{ marginTop: "1.25rem" }}>
                            {messages.life.nextYear.thisYear}
                          </h2>
                          <div
                            className={`stream-box${
                              isDead ? " stream-box--epitaph" : ""
                            }`}
                          >
                            {streamText}
                          </div>
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

      <div className="life-commandbar" role="group" aria-label={commandBarLabel}>
        <div className="life-commandbar__inner">
          <div className="life-commandbar__left">
            <div className="life-commandbar__hint">
              {phase === "play" && state
                ? mode === "gain"
                  ? remainingHintLabel
                  : mode === "lose"
                    ? removeHintLabel
                    : noAllocationLabel
                : readyLabel}
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
              {journalTitle}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {deathCurtainOpen && (
          <motion.div
            key="death-curtain"
            className="life-gameover-root"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0.05 : 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <motion.button
              type="button"
              className="life-gameover-backdrop"
              aria-label={messages.life.gameOver.acknowledge}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.05 : 0.4 }}
              onClick={() => setDeathCurtainDismissed(true)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="life-gameover-title"
              className="life-gameover-card"
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.9, y: 24 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.96, y: 12 }
              }
              transition={
                reduceMotion
                  ? { duration: 0.12 }
                  : { type: "spring", stiffness: 360, damping: 28 }
              }
              onClick={(e) => e.stopPropagation()}
            >
              <div className="life-gameover-ripples" aria-hidden="true">
                <span className="life-gameover-ripple" />
                <span className="life-gameover-ripple life-gameover-ripple--delay" />
              </div>
              <p className="life-gameover-kicker" aria-hidden="true">
                ◈
              </p>
              <h2 id="life-gameover-title" className="life-gameover-title">
                {messages.life.gameOver.title}
              </h2>
              <p className="life-gameover-subtitle">
                {messages.life.gameOver.subtitle({
                  age: state.diedAtAge ?? state.age,
                })}
              </p>
              <p className="life-gameover-hint">{messages.life.gameOver.hint}</p>
              <div className="life-gameover-actions">
                <button
                  type="button"
                  className="primary-btn life-gameover-btn-primary"
                  onClick={() => setDeathCurtainDismissed(true)}
                >
                  {messages.life.gameOver.acknowledge}
                </button>
                <button
                  type="button"
                  className="life-gameover-btn-secondary"
                  onClick={() => {
                    setDeathCurtainDismissed(true);
                    setJournalOpen(true);
                  }}
                >
                  {messages.life.gameOver.openAlmanac}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {journalOpen && (
        <div
          className="life-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={journalTitle}
        >
          <button
            type="button"
            className="life-drawer__overlay"
            aria-label={drawerCloseLabel}
            onClick={() => setJournalOpen(false)}
          />
          <div className="life-drawer__panel">
            <div className="life-drawer__header">
              <div className="life-drawer__title">{journalTitle}</div>
              <button
                type="button"
                className="life-drawer__close"
                onClick={() => setJournalOpen(false)}
                aria-label={drawerCloseLabel}
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
