#!/usr/bin/env node
/**
 * Best-effort: free a TCP listen port before starting Next dev/start.
 * macOS/Linux: lsof + SIGTERM, then SIGKILL if still listening.
 * Windows: no-op (user may need to free port manually).
 */
import { execSync } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const port = process.argv[2] ?? "3001";

function pidsListening() {
  try {
    const out = execSync(
      `lsof -nP -iTCP:${port} -sTCP:LISTEN -t`,
      { encoding: "utf8" }
    ).trim();
    if (!out) return [];
    return [...new Set(out.split(/\s+/).filter(Boolean))].map((s) =>
      Number.parseInt(s, 10)
    ).filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

async function main() {
  if (process.platform === "win32") return;

  let pids = pidsListening();
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      /* ignore */
    }
  }

  await delay(400);
  pids = pidsListening();
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* ignore */
    }
  }

  await delay(100);
}

main().then(() => process.exit(0)).catch(() => process.exit(0));
