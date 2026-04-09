"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { GameState } from "@/lib/schemas/game";
import type { YearApiResponse } from "@/lib/schemas/game";
import {
  ATTR_KEYS,
  ATTR_LABELS,
  ATTR_MAX,
  SCHEMA_VERSION,
  SKILL_POINTS_PER_YEAR,
} from "@/lib/constants";
import type { AttrKey } from "@/lib/constants";
import { createInitialState } from "@/lib/engine/initial-state";

type Phase = "name" | "play";
type Step = "allocate" | "streaming" | "idle";

function applySkillPoint(state: GameState, key: AttrKey): GameState {
  const nextVal = Math.min(
    ATTR_MAX,
    state.attrs[key] + SKILL_POINTS_PER_YEAR
  );
  return {
    ...state,
    attrs: { ...state.attrs, [key]: nextVal },
    lastSkillAllocation: key,
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
  const [selectedSkill, setSelectedSkill] = useState<AttrKey | null>(null);
  const [streamText, setStreamText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [milestone, setMilestone] = useState<string | null>(null);

  const beginLife = () => {
    setErr(null);
    try {
      const s = createInitialState(nameInput);
      setState(s);
      setPhase("play");
      setStep("allocate");
      setSelectedSkill(null);
      setStreamText("");
      setMilestone(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "创建角色失败");
    }
  };

  const confirmYear = useCallback(async () => {
    if (!state || !selectedSkill) return;
    setErr(null);
    setBusy(true);
    setStreamText("");
    setMilestone(null);
    setStep("streaming");

    const prepared = applySkillPoint(state, selectedSkill);

    try {
      const result = await consumeYearStream(prepared, (t) => {
        setStreamText((prev) => prev + t);
      });
      setState(result.state);
      if (result.yearSummary.milestoneMessage) {
        setMilestone(result.yearSummary.milestoneMessage);
      }
      setStep("idle");
      setSelectedSkill(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "请求失败");
      setStep("allocate");
    } finally {
      setBusy(false);
    }
  }, [state, selectedSkill]);

  const prepareNextYear = () => {
    setStep("allocate");
    setStreamText("");
    setMilestone(null);
    setSelectedSkill(null);
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
        <h1>人生成长</h1>
        <Link href="/" className="life-back">
          ← 返回欢迎页
        </Link>
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
            <h2>创建角色</h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
              进入详情页后，将随机生成八大维度初始值（0–100），每年可先分配
              {SKILL_POINTS_PER_YEAR} 点再推进剧情。
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
                    <h2 style={{ marginTop: "1.25rem" }}>
                      分配 {SKILL_POINTS_PER_YEAR} 点
                    </h2>
                    <p
                      style={{
                        color: "var(--muted)",
                        fontSize: "0.88rem",
                        marginTop: 0,
                      }}
                    >
                      选择本年将点数加在哪一项上，确认后将流式展示这一年经历（并呼应你的选择）。
                    </p>
                    <div className="skill-grid">
                      {ATTR_KEYS.map((k) => (
                        <label
                          key={k}
                          className={
                            "skill-option" +
                            (selectedSkill === k ? " selected" : "")
                          }
                        >
                          <input
                            type="radio"
                            name="skill"
                            checked={selectedSkill === k}
                            onChange={() => setSelectedSkill(k)}
                          />
                          {ATTR_LABELS[k]}
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={!selectedSkill || busy}
                      onClick={() => void confirmYear()}
                    >
                      确定
                    </button>
                  </motion.div>
                )}

                {step === "streaming" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <h2 style={{ marginTop: "1.25rem" }}>这一年……</h2>
                    <div className="stream-box">{streamText}</div>
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
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={prepareNextYear}
                      style={{ marginTop: 12 }}
                    >
                      下一年
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
                          {h.skillAllocation
                            ? ` · +1 ${ATTR_LABELS[h.skillAllocation]}`
                            : ""}
                          <br />
                          {h.narrative}
                          {h.fallback ? (
                            <span style={{ color: "var(--muted)" }}>
                              {" "}
                              （本地叙事）
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
                  导出存档 JSON
                </button>
              </motion.section>
            </aside>
          </motion.div>
        )}
      </AnimatePresence>

      {err && (
        <p style={{ color: "var(--danger)", marginTop: "1rem" }}>{err}</p>
      )}
    </div>
  );
}
