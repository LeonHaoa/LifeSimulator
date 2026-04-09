"use client";

import { useState, useCallback } from "react";
import type { GameState } from "@/lib/schemas/game";
import { SCHEMA_VERSION } from "@/lib/constants";
import { createInitialState } from "@/lib/engine/initial-state";
import type { YearApiResponse } from "@/lib/schemas/game";

export function GameClient() {
  const [nameInput, setNameInput] = useState("");
  const [state, setState] = useState<GameState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastMilestone, setLastMilestone] = useState<string | null>(null);

  const start = () => {
    setErr(null);
    setLastMilestone(null);
    try {
      setState(createInitialState(nameInput));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "起名失败");
    }
  };

  const nextYear = useCallback(async () => {
    if (!state) return;
    setLoading(true);
    setErr(null);
    setLastMilestone(null);
    try {
      const res = await fetch("/api/year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: SCHEMA_VERSION,
          stream: false,
          state,
        }),
      });
      const data = (await res.json()) as YearApiResponse & { error?: string };
      if (!res.ok) {
        setErr(data.error || `HTTP ${res.status}`);
        return;
      }
      setState(data.state);
      if (data.yearSummary.milestoneMessage) {
        setLastMilestone(data.yearSummary.milestoneMessage);
      }
    } catch {
      setErr("网络错误");
    } finally {
      setLoading(false);
    }
  }, [state]);

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
    <main style={{ maxWidth: 560, margin: "2rem auto", padding: 16 }}>
      <h1>中式人生模拟器</h1>
      {!state ? (
        <div>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="你的名字"
            maxLength={20}
            style={{ width: "100%", padding: 8 }}
          />
          <button type="button" onClick={start}>
            开局
          </button>
        </div>
      ) : (
        <div>
          <p>
            {state.name} · {state.age} 岁
          </p>
          <p>
            颜值 {state.attrs.looks} · 家境 {state.attrs.wealth} · 体质{" "}
            {state.attrs.health} · 运气 {state.attrs.luck}
          </p>
          <button type="button" disabled={loading} onClick={nextYear}>
            {loading ? "推进中…" : "下一年"}
          </button>
          <button type="button" onClick={exportJson}>
            导出存档 JSON
          </button>
          <button
            type="button"
            onClick={() => {
              setState(null);
              setNameInput("");
              setLastMilestone(null);
            }}
          >
            新开一局
          </button>
          {lastMilestone && (
            <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>
              {lastMilestone}
            </pre>
          )}
          <ul>
            {state.history
              .slice()
              .reverse()
              .map((h) => (
                <li key={h.age}>
                  <strong>{h.age} 岁</strong>：{h.narrative}
                  {h.fallback ? "（本地叙事）" : ""}
                </li>
              ))}
          </ul>
        </div>
      )}
      {err && <p style={{ color: "#f66" }}>{err}</p>}
    </main>
  );
}
