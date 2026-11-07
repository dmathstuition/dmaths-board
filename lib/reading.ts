// Easier to read: bigger text, an easy-read font, and questions read aloud.
// Each learner sets it on their own device (kept in this browser).
import { useSyncExternalStore } from "react";

export type Reading = { size: 1 | 2 | 3; easy: boolean; voice: boolean };
const KEY = "board-reading";
const DEFAULT: Reading = { size: 1, easy: false, voice: false };
let state: Reading = DEFAULT;
let loaded = false;
const subs = new Set<() => void>();

export function cleanReading(v: unknown): Reading {
  const r = v as any;
  return { size: r?.size === 2 || r?.size === 3 ? r.size : 1, easy: !!r?.easy, voice: !!r?.voice };
}
function apply(r: Reading) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  if (r.size > 1) el.dataset.textSize = String(r.size); else delete el.dataset.textSize;
  if (r.easy) el.dataset.easyRead = "1"; else delete el.dataset.easyRead;
}
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { state = cleanReading(JSON.parse(localStorage.getItem(KEY) ?? "null")); } catch { state = DEFAULT; }
  apply(state);
}
export function setReading(p: Partial<Reading>) {
  load();
  state = cleanReading({ ...state, ...p });
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage blocked */ }
  apply(state);
  if (!state.voice) stopSpeaking();
  subs.forEach((f) => f());
}
export function useReading(): Reading {
  return useSyncExternalStore((f) => { load(); subs.add(f); return () => { subs.delete(f); }; }, () => { load(); return state; }, () => DEFAULT);
}

// Maths read the way a teacher says it.
const WORDS: [RegExp, string][] = [
  [/√\s*\(([^)]+)\)/g, " the square root of $1 "], [/√\s*/g, " root "],
  [/(\w)\s*²/g, "$1 squared"], [/(\w)\s*³/g, "$1 cubed"], [/\^\s*2\b/g, " squared"], [/\^\s*3\b/g, " cubed"], [/\^/g, " to the power "],
  [/(\d+(?:\.\d+)?)\s*°/g, "$1 degrees"], [/°/g, " degrees"],
  [/×/g, " times "], [/÷/g, " divided by "], [/−/g, " minus "], [/±/g, " plus or minus "], [/≈/g, " is about "],
  [/≤/g, " is less than or equal to "], [/≥/g, " is greater than or equal to "], [/≠/g, " is not equal to "],
  [/∠\s*/g, " angle "], [/θ/g, " theta "], [/π/g, " pi "], [/½/g, " a half "], [/¼/g, " a quarter "], [/¾/g, " three quarters "],
  [/(\d)\s*\/\s*(\d)/g, "$1 over $2"], [/\s*=\s*/g, " equals "], [/(\d)\s*%/g, "$1 percent"], [/₦\s*([\d,.]+)/g, "$1 naira"],
  [/_{2,}/g, " blank "], [/…/g, "..."],
];
export function speakable(text: string): string {
  let s = String(text ?? "");
  for (const [re, w] of WORDS) s = s.replace(re, w);
  return s.replace(/\s+/g, " ").trim();
}

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;
export function speak(text: string, onEnd?: () => void) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(speakable(text));
  const voices = synth.getVoices();
  u.voice = voices.find((v) => /en[-_](NG|GB)/i.test(v.lang)) ?? voices.find((v) => /^en/i.test(v.lang)) ?? null;
  u.lang = u.voice?.lang ?? "en-GB";
  u.rate = 0.92;
  if (onEnd) { u.onend = onEnd; u.onerror = onEnd; }
  synth.speak(u);
}
export function stopSpeaking() { if (canSpeak()) window.speechSynthesis.cancel(); }
