/**
 * UI sounds + ambient BGM via Web Audio API (no asset files).
 * Requires a user gesture before audio can play in most browsers.
 */

let ctxRef: AudioContext | null = null;

type BgmBundle = {
  oscs: OscillatorNode[];
  preGains: GainNode[];
  master: GainNode;
  compressor: DynamicsCompressorNode;
};

let bgmBundle: BgmBundle | null = null;
let bgmTeardownTimer: ReturnType<typeof setTimeout> | null = null;
let pendingBgmTeardown: BgmBundle | null = null;

export async function ensureAudioContext(): Promise<AudioContext | null> {
  if (typeof window === "undefined") return null;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    if (!ctxRef) ctxRef = new Ctx();
    if (ctxRef.state === "suspended") await ctxRef.resume();
    return ctxRef;
  } catch {
    return null;
  }
}

function beep(
  ctx: AudioContext,
  freq: number,
  durationSec: number,
  volume = 0.14,
  type: OscillatorType = "sine"
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.018);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + durationSec + 0.06);
}

export async function sfxUiClick(): Promise<void> {
  const ctx = await ensureAudioContext();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const play = (freq: number, vol: number, dur: number, start: number) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t0 + start);
    g.gain.setValueAtTime(0.0001, t0 + start);
    g.gain.exponentialRampToValueAtTime(vol, t0 + start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0 + start);
    osc.stop(t0 + start + dur + 0.04);
  };
  play(920, 0.16, 0.045, 0);
  play(1240, 0.11, 0.035, 0.038);
}

/** Skill +/- allocation tick */
export async function sfxSkillTick(direction: 1 | -1): Promise<void> {
  const ctx = await ensureAudioContext();
  if (!ctx) return;
  const f = direction === 1 ? 440 : 330;
  beep(ctx, f, 0.055, 0.12, "triangle");
}

export async function sfxYearAdvance(): Promise<void> {
  const ctx = await ensureAudioContext();
  if (!ctx) return;
  const freqs = [320, 480, 620];
  const t0 = ctx.currentTime;
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f, t0 + i * 0.09);
    g.gain.setValueAtTime(0.0001, t0 + i * 0.09);
    g.gain.exponentialRampToValueAtTime(0.15, t0 + i * 0.09 + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.09 + 0.16);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0 + i * 0.09);
    osc.stop(t0 + i * 0.09 + 0.2);
  });
}

export async function sfxYearComplete(): Promise<void> {
  const ctx = await ensureAudioContext();
  if (!ctx) return;
  const freqs = [523.25, 659.25, 783.99, 1046.5];
  const now = ctx.currentTime;
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    const start = now + i * 0.065;
    osc.frequency.setValueAtTime(f, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.13, start + 0.022);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.36);
  });
}

export async function sfxError(): Promise<void> {
  const ctx = await ensureAudioContext();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    const f = i === 0 ? 220 : 165;
    osc.frequency.setValueAtTime(f, t0 + i * 0.11);
    g.gain.setValueAtTime(0.0001, t0 + i * 0.11);
    g.gain.exponentialRampToValueAtTime(0.1, t0 + i * 0.11 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.11 + 0.18);
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 900;
    osc.connect(filt);
    filt.connect(g);
    g.connect(ctx.destination);
    osc.start(t0 + i * 0.11);
    osc.stop(t0 + i * 0.11 + 0.22);
  }
}

/** Short chord when user turns BGM on */
export async function sfxBgmPreview(): Promise<void> {
  const ctx = await ensureAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const freqs = [392, 493.88, 587.33];
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f, now + i * 0.02);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.11, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  });
}

function stopAmbientBgmImmediate(): void {
  if (bgmTeardownTimer !== null) {
    clearTimeout(bgmTeardownTimer);
    bgmTeardownTimer = null;
  }
  if (pendingBgmTeardown) {
    teardownBgm(pendingBgmTeardown);
    pendingBgmTeardown = null;
  }
  if (bgmBundle) {
    teardownBgm(bgmBundle);
    bgmBundle = null;
  }
}

function teardownBgm(bundle: BgmBundle): void {
  for (const o of bundle.oscs) {
    try {
      o.stop();
      o.disconnect();
    } catch {
      /* already stopped */
    }
  }
  for (const g of bundle.preGains) {
    try {
      g.disconnect();
    } catch {
      /* ignore */
    }
  }
  try {
    bundle.master.disconnect();
  } catch {
    /* ignore */
  }
  try {
    bundle.compressor.disconnect();
  } catch {
    /* ignore */
  }
}

export function stopAmbientBgm(): void {
  if (bgmTeardownTimer !== null) {
    clearTimeout(bgmTeardownTimer);
    bgmTeardownTimer = null;
    if (pendingBgmTeardown) {
      teardownBgm(pendingBgmTeardown);
      pendingBgmTeardown = null;
    }
  }
  const bundle = bgmBundle;
  bgmBundle = null;
  if (!bundle || !ctxRef) return;

  const ctx = ctxRef;
  const now = ctx.currentTime;
  const { master } = bundle;
  try {
    master.gain.cancelScheduledValues(now);
    const cur = Math.max(master.gain.value, 0.0001);
    master.gain.setValueAtTime(cur, now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  } catch {
    teardownBgm(bundle);
    return;
  }

  pendingBgmTeardown = bundle;
  bgmTeardownTimer = setTimeout(() => {
    bgmTeardownTimer = null;
    if (pendingBgmTeardown === bundle) {
      teardownBgm(bundle);
      pendingBgmTeardown = null;
    }
  }, 320);
}

export async function startAmbientBgm(): Promise<void> {
  const ctx = await ensureAudioContext();
  if (!ctx) return;
  stopAmbientBgmImmediate();

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -22;
  compressor.knee.value = 20;
  compressor.ratio.value = 3.2;
  compressor.attack.value = 0.03;
  compressor.release.value = 0.28;

  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(compressor);
  compressor.connect(ctx.destination);

  const layers: { f: number; type: OscillatorType; level: number; detune: number }[] =
    [
      { f: 98, type: "sine", level: 0.14, detune: 0 },
      { f: 196, type: "sine", level: 0.12, detune: 4 },
      { f: 246.94, type: "sine", level: 0.07, detune: -3 },
      { f: 293.66, type: "sine", level: 0.1, detune: 0 },
      { f: 392, type: "triangle", level: 0.085, detune: 5 },
    ];

  const oscs: OscillatorNode[] = [];
  const preGains: GainNode[] = [];

  for (const layer of layers) {
    const o = ctx.createOscillator();
    o.type = layer.type;
    o.frequency.value = layer.f * (1 + layer.detune / 1200);
    const og = ctx.createGain();
    og.gain.value = layer.level;
    o.connect(og);
    og.connect(master);
    o.start();
    oscs.push(o);
    preGains.push(og);
  }

  bgmBundle = { oscs, preGains, master, compressor };

  const t0 = ctx.currentTime;
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.42, t0 + 1.6);
}

export const STORAGE_SFX = "life-sim-sfx-enabled";
export const STORAGE_BGM = "life-sim-bgm-enabled";

export function readSfxEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(STORAGE_SFX);
  if (v === null) return true;
  return v === "1" || v === "true";
}

export function readBgmEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem(STORAGE_BGM);
  if (v === null) return false;
  return v === "1" || v === "true";
}

export function writeSfxEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_SFX, on ? "1" : "0");
}

export function writeBgmEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_BGM, on ? "1" : "0");
}
