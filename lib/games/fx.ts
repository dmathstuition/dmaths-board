"use client";
// Game sound effects and phone vibration — no audio files to download: every
// sound is a few synthesised notes (Web Audio). Learners switch sound and
// vibration on or off (remembered on this device); both stay off in low-data
// mode, and vibration also respects "reduce motion".
import { useCallback, useEffect, useState } from "react";

export type Sfx = "correct" | "wrong" | "combo" | "lightning" | "chest" | "best" | "levelUp" | "finish" | "tick";
type Prefs = { sound: boolean; haptics: boolean };
const KEY = "game-fx";
const DEFAULTS: Prefs = { sound: true, haptics: true };

// Notes as [frequency Hz, start s, length s].
const TUNES: Record<Sfx, { wave: OscillatorType; notes: [number, number, number][]; gain?: number }> = {
  correct: { wave: "triangle", notes: [[660, 0, 0.08], [990, 0.07, 0.12]] },
  wrong: { wave: "sawtooth", notes: [[220, 0, 0.12], [165, 0.1, 0.18]], gain: 0.05 },
  combo: { wave: "square", notes: [[523, 0, 0.07], [659, 0.07, 0.07], [784, 0.14, 0.07], [1047, 0.21, 0.16]], gain: 0.05 },
  lightning: { wave: "square", notes: [[1200, 0, 0.05], [900, 0.05, 0.05], [1500, 0.1, 0.12]], gain: 0.05 },
  chest: { wave: "triangle", notes: [[784, 0, 0.09], [988, 0.09, 0.09], [1175, 0.18, 0.09], [1568, 0.27, 0.25]] },
  best: { wave: "triangle", notes: [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.35]] },
  levelUp: { wave: "square", notes: [[392, 0, 0.1], [523, 0.1, 0.1], [659, 0.2, 0.1], [784, 0.3, 0.1], [1047, 0.4, 0.4]], gain: 0.05 },
  finish: { wave: "triangle", notes: [[784, 0, 0.12], [659, 0.12, 0.12], [523, 0.24, 0.3]] },
  tick: { wave: "sine", notes: [[1000, 0, 0.03]], gain: 0.04 },
};
const BUZZ: Partial<Record<Sfx, number | number[]>> = {
  correct: 18, wrong: [40, 30, 40], combo: [20, 30, 20, 30, 60], lightning: [15, 20, 15], chest: [30, 40, 80], best: [60, 40, 120], levelUp: [80, 50, 80, 50, 160],
};

let ctx: AudioContext | null = null;
const lowData = () => typeof document !== "undefined" && document.documentElement.hasAttribute("data-lowdata");
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function readPrefs(): Prefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return DEFAULTS; }
}

export function play(name: Sfx, prefs: Prefs = readPrefs()) {
  if (typeof window === "undefined" || lowData()) return;
  if (prefs.haptics && BUZZ[name] && !reducedMotion()) { try { navigator.vibrate?.(BUZZ[name]!); } catch { /* not supported */ } }
  if (!prefs.sound) return;
  try {
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return;
    ctx = ctx ?? new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const tune = TUNES[name], t0 = ctx.currentTime;
    for (const [freq, start, len] of tune.notes) {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = tune.wave; osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0 + start);
      g.gain.exponentialRampToValueAtTime(tune.gain ?? 0.08, t0 + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + len);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0 + start); osc.stop(t0 + start + len + 0.02);
    }
  } catch { /* audio blocked — silently skip */ }
}

// Sound + vibration settings for a game screen, plus a ready-made `fx(name)`.
export function useGameFx() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [low, setLow] = useState(false);
  useEffect(() => { setPrefs(readPrefs()); setLow(lowData()); }, []);
  const update = useCallback((p: Partial<Prefs>) => {
    setPrefs((cur) => {
      const next = { ...cur, ...p };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
      return next;
    });
  }, []);
  const fx = useCallback((name: Sfx) => play(name, prefs), [prefs]);
  return { prefs, update, fx, lowData: low };
}
