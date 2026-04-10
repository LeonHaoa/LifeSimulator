"use client";

import React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { GameState, YearApiResponse } from "@/lib/schemas/game";
import { ATTR_KEYS, ATTR_MAX, SCHEMA_VERSION, yearlySkillPoints } from "@/lib/constants";
import type { AttrKey } from "@/lib/constants";
import {
  createInitialState,
  validateNewName,
} from "@/lib/engine/initial-state";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { t } from "@/lib/i18n/dictionary";
import { useLocale } from "@/lib/i18n/client-locale";
import type { Locale } from "@/lib/i18n/types";

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
      if (msg.type === "error") {
        throw new Error(msg.message || errors.streamFailed);
      }
    }
  }

  if (!finalPayload) throw new Error(errors.missingFinalState);
  return finalPayload;
}

export function LifeDetailClient() {
  const { locale, messages } = useLocale();
  const [phase, setPhase] = useState<Phase>("name");
  const [step, setStep] = useState<Step>("allocate");
  const [nameInput, setNameInput] = useState("");
  const [state, setState] = useState<GameState | null>(null);
  const [alloc, setAlloc] = useState<AllocationMap>({});
  const [streamText, setStreamText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [milestone, setMilestone] = useState<string | null>(null);
  const transitionTimerRef = useRef<number | null>(null);

  const renderQueueRef = useRef("");
  const flushingRef = useRef(false);
  const streamTargetMsRef = useRef(20_000);
  const streamStartAtRef = useRef<number>(0);

  const statLabel = useCallback(
    (key: AttrKey) => messages.stats[key].label,
    [messages.stats]
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
    return () => {
      renderQueueRef.current = "";
      flushingRef.current = false;
      if (transitionTimerRef.current != null) {
        window.clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, []);

  const beginLife = () => {
    setErr(null);
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
    }
  };

  const nextAge = state ? state.age + 1 : 1;
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
    if (!state || busy) return false;
    if (mode === "none") return true;
    return remaining === 0;
  }, [state, busy, mode, remaining]);

  const startYear = useCallback(async () => {
    if (!state || !canStartYear) return;

    setErr(null);
    setBusy(true);
    setStreamText("");
    setMilestone(null);
    setStep("transition");

    const prepared = applyAllocToState(state, alloc);
    const transitionMs = 5_000;

    if (transitionTimerRef.current != null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      setStep("streaming");
      renderQueueRef.current = "";
      flushingRef.current = false;
      streamStartAtRef.current = Date.now();

      void (async () => {
        try {
          const result = await consumeYearStream(
            locale,
            prepared,
            (piece) => {
              renderQueueRef.current += piece;
              flushRenderQueue();
            },
            messages.errors
          );
          setState(result.state);
          if (result.yearSummary.milestoneMessage) {
            setMilestone(result.yearSummary.milestoneMessage);
          }
          setStep("idle");
          setAlloc({});
        } catch (e) {
          setErr(
            e instanceof Error ? e.message : messages.errors.requestFailed
          );
          setStep("allocate");
        } finally {
          setBusy(false);
        }
      })();
    }, transitionMs);
  }, [alloc, canStartYear, flushRenderQueue, locale, messages.errors, state]);

  const prepareNextYear = () => {
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

  return (
    <div className="life-page">
      <header className="life-header">
        <h1>{messages.life.title}</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <LocaleSwitcher />
          <Link href="/" className="life-back">
            ← {messages.common.back}
          </Link>
        </div>
      </header>

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
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
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
                className="life-panel"
                layout
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
              >
                <h2>{messages.life.status.title}</h2>
                <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 0 }}>
                  {t(locale, "life.status.summary", {
                    name: state.name,
                    age: state.age,
                    max: ATTR_MAX,
                  })}
                </p>
                <div className="stat-grid">
                  {ATTR_KEYS.map((key) => (
                    <motion.div
                      key={key}
                      className="stat-card"
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

                {step === "allocate" && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <h2 style={{ marginTop: "1.25rem" }}>{messages.life.nextYear.title}</h2>
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
                          setAlloc((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
                        };

                        const onMinus = () => {
                          if (busy || !canMinus) return;
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
                              <div className="skill-step-label">{statLabel(key)}</div>
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
                        <div className="cap-title">{messages.life.nextYear.title}</div>
                        <div className="cap-sub">{messages.life.nextYear.openingCaption}</div>
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
                    <div className="stream-box">{streamText}</div>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={prepareNextYear}
                      style={{ marginTop: 12 }}
                    >
                      {messages.life.nextYear.next}
                    </button>
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

            <aside>
              <motion.section
                className="life-panel"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
              >
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
              </motion.section>
            </aside>
          </motion.div>
        )}
      </AnimatePresence>

      {err && <p style={{ color: "var(--danger)", marginTop: "1rem" }}>{err}</p>}
    </div>
  );
}
