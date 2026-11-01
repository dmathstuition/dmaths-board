// Class tools on the whiteboard — pure. The host controls them; their state is
// broadcast so every learner sees the same timer, dice, chosen name, screen
// shade, ruler and protractor.

export type Timer = { seconds: number; endsAt: number | null; left: number | null; mode: "down" | "up"; startedAt: number | null };
export type Placed = { on: boolean; x: number; y: number; rot: number }; // x,y = centre as a fraction of the board
export type Panel = { on: boolean; x: number; y: number }; // x,y = top-left as a fraction of the board
// A slider value for a letter in the graph rows (a, b, c, k, m…).
export type GraphSlider = { v: number; min: number; max: number; step: number };
export type GraphState = Panel & {
  exprs: string[]; xMin: number; xMax: number; yMin: number; yMax: number;
  params: Record<string, GraphSlider>; keys: boolean; table: boolean; big: boolean;
};
export const GRAPH_ROWS = 6;
export type CalcState = Panel & { expr: string; result: string; deg: boolean };
export type LineState = Panel & { min: number; max: number; step: number; marks: number[] };
export type ClockState = Panel & { h: number; m: number; digital: boolean; words: boolean };
export type FractionBar = { d: number; on: number[] };
export type FractionState = Panel & { bars: FractionBar[] };
export type HundredState = Panel & { marks: number[] };
export type PlaceState = Panel & { digits: number[] };
export type WordCardState = Panel & { word: string; kind: string; meaning: string; example: string; reveal: boolean };
export type SentenceState = Panel & { words: string[]; order: number[]; built: number[]; checked: boolean };
export type SpellState = Panel & { word: string; guessed: string[]; reveal: boolean };
export type SpotState = { on: boolean; x: number; y: number; r: number }; // centre, radius as fractions of the board width
export type GroupsState = Panel & { size: number; groups: string[][] };
export type Widgets = {
  timer: Timer | null;
  dice: { values: number[]; at: number } | null;
  picker: { name: string; at: number } | null;
  shade: { on: boolean; pct: number };
  ruler: Placed;
  protractor: Placed;
  graph: GraphState;
  calc: CalcState;
  numberLine: LineState;
  clock: ClockState;
  fractions: FractionState;
  hundred: HundredState;
  placeValue: PlaceState;
  wordCard: WordCardState;
  sentence: SentenceState;
  spell: SpellState;
  spotlight: SpotState;
  groups: GroupsState;
};

export const DEFAULT_WIDGETS: Widgets = {
  timer: null, dice: null, picker: null,
  shade: { on: false, pct: 50 },
  ruler: { on: false, x: 0.5, y: 0.6, rot: 0 },
  protractor: { on: false, x: 0.5, y: 0.6, rot: 0 },
  graph: { on: false, x: 0.03, y: 0.04, exprs: ["x^2 - 4", "", "", "", "", ""], xMin: -10, xMax: 10, yMin: -10, yMax: 10, params: {}, keys: false, table: false, big: false },
  calc: { on: false, x: 0.7, y: 0.04, expr: "", result: "", deg: true },
  numberLine: { on: false, x: 0.08, y: 0.74, min: -10, max: 10, step: 1, marks: [] },
  clock: { on: false, x: 0.72, y: 0.06, h: 3, m: 0, digital: true, words: true },
  fractions: { on: false, x: 0.04, y: 0.06, bars: [{ d: 1, on: [] }, { d: 2, on: [] }, { d: 4, on: [] }, { d: 8, on: [] }] },
  hundred: { on: false, x: 0.04, y: 0.04, marks: [] },
  placeValue: { on: false, x: 0.2, y: 0.08, digits: [0, 0, 0, 0, 0, 0, 0] },
  wordCard: { on: false, x: 0.3, y: 0.1, word: "", kind: "noun", meaning: "", example: "", reveal: false },
  sentence: { on: false, x: 0.1, y: 0.62, words: [], order: [], built: [], checked: false },
  spell: { on: false, x: 0.5, y: 0.32, word: "", guessed: [], reveal: false },
  spotlight: { on: false, x: 0.5, y: 0.5, r: 0.14 },
  groups: { on: false, x: 0.3, y: 0.08, size: 3, groups: [] },
};

export const WORD_KINDS = ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "interjection"] as const;

export const NUMBER_LINES: { label: string; min: number; max: number; step: number }[] = [
  { label: "−10 to 10", min: -10, max: 10, step: 1 }, { label: "0 to 20", min: 0, max: 20, step: 1 },
  { label: "0 to 100", min: 0, max: 100, step: 10 }, { label: "0 to 1 (tenths)", min: 0, max: 1, step: 0.1 },
  { label: "−5 to 5 (halves)", min: -5, max: 5, step: 0.5 },
];

const clamp = (n: unknown, lo: number, hi: number, d: number) => { const v = Number(n); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const placed = (p: any, d: Placed): Placed => ({ on: !!p?.on, x: clamp(p?.x, 0, 1, d.x), y: clamp(p?.y, 0, 1, d.y), rot: ((Math.round(clamp(p?.rot, -720, 720, 0)) % 360) + 360) % 360 });

export function cleanWidgets(v: unknown): Widgets {
  const w = v as any;
  const t = w?.timer;
  return {
    timer: t ? {
      seconds: clamp(t.seconds, 0, 3 * 3600, 60), mode: t.mode === "up" ? "up" : "down",
      endsAt: t.endsAt != null ? clamp(t.endsAt, 0, 9e15, 0) : null, left: t.left != null ? clamp(t.left, 0, 3 * 3600, 0) : null,
      startedAt: t.startedAt != null ? clamp(t.startedAt, 0, 9e15, 0) : null,
    } : null,
    dice: Array.isArray(w?.dice?.values) ? { values: w.dice.values.slice(0, 3).map((n: unknown) => clamp(n, 1, 6, 1)), at: clamp(w.dice.at, 0, 9e15, 0) } : null,
    picker: w?.picker?.name ? { name: String(w.picker.name).slice(0, 60), at: clamp(w.picker.at, 0, 9e15, 0) } : null,
    shade: { on: !!w?.shade?.on, pct: clamp(w?.shade?.pct, 5, 95, 50) },
    ruler: placed(w?.ruler, DEFAULT_WIDGETS.ruler),
    protractor: placed(w?.protractor, DEFAULT_WIDGETS.protractor),
    graph: cleanGraph(w?.graph),
    calc: {
      ...panel(w?.calc, DEFAULT_WIDGETS.calc),
      expr: String(w?.calc?.expr ?? "").slice(0, 120), result: String(w?.calc?.result ?? "").slice(0, 60), deg: w?.calc?.deg !== false,
    },
    numberLine: cleanLine(w?.numberLine),
    ...cleanExtras(w),
    spotlight: { on: !!w?.spotlight?.on, x: clamp(w?.spotlight?.x, 0, 1, 0.5), y: clamp(w?.spotlight?.y, 0, 1, 0.5), r: clamp(w?.spotlight?.r, 0.05, 0.45, 0.14) },
    groups: {
      ...panel(w?.groups, DEFAULT_WIDGETS.groups), size: Math.round(clamp(w?.groups?.size, 2, 10, 3)),
      groups: (Array.isArray(w?.groups?.groups) ? w.groups.groups : []).slice(0, 12)
        .map((g: unknown) => (Array.isArray(g) ? g.slice(0, 40).map((n) => String(n).slice(0, 60)).filter(Boolean) : [])),
    },
  };
}

const txt = (v: unknown, n: number) => String(v ?? "").slice(0, n);
const ints = (v: unknown, lo: number, hi: number, max: number) =>
  [...new Set((Array.isArray(v) ? v : []).map((n) => Math.round(Number(n))).filter((n) => Number.isFinite(n) && n >= lo && n <= hi))].slice(0, max);
function cleanExtras(w: any): Pick<Widgets, "clock" | "fractions" | "hundred" | "placeValue" | "wordCard" | "sentence" | "spell"> {
  const D = DEFAULT_WIDGETS;
  const c = w?.clock, f = w?.fractions, pv = w?.placeValue, wc = w?.wordCard, se = w?.sentence, sp = w?.spell;
  const bars = Array.isArray(f?.bars) ? f.bars.slice(0, 5).map((b: any) => { const d = Math.round(clamp(b?.d, 1, 12, 2)); return { d, on: ints(b?.on, 0, d - 1, d) }; }) : D.fractions.bars;
  const words = (Array.isArray(se?.words) ? se.words : []).slice(0, 20).map((x: unknown) => txt(x, 30)).filter(Boolean);
  const n = words.length;
  const order = ints(se?.order, 0, n - 1, n);
  const word = txt(sp?.word, 24).toUpperCase().replace(/[^A-Z' -]/g, "");
  return {
    clock: { ...panel(c, D.clock), h: Math.round(clamp(c?.h, 0, 11, D.clock.h)), m: Math.round(clamp(c?.m, 0, 59, 0)), digital: c ? c.digital !== false : true, words: c ? c.words !== false : true },
    fractions: { ...panel(f, D.fractions), bars: bars.length ? bars : D.fractions.bars },
    hundred: { ...panel(w?.hundred, D.hundred), marks: ints(w?.hundred?.marks, 1, 100, 100) },
    placeValue: { ...panel(pv, D.placeValue), digits: Array.from({ length: 7 }, (_, i) => Math.round(clamp(pv?.digits?.[i], 0, 9, 0))) },
    wordCard: {
      ...panel(wc, D.wordCard), word: txt(wc?.word, 40), kind: (WORD_KINDS as readonly string[]).includes(wc?.kind) ? wc.kind : "noun",
      meaning: txt(wc?.meaning, 200), example: txt(wc?.example, 200), reveal: !!wc?.reveal,
    },
    sentence: { ...panel(se, D.sentence), words, order: order.length === n ? order : words.map((_: string, i: number) => i), built: ints(se?.built, 0, n - 1, n), checked: !!se?.checked },
    spell: { ...panel(sp, D.spell), word, guessed: [...new Set((Array.isArray(sp?.guessed) ? sp.guessed : []).map((g: unknown) => String(g).toUpperCase()).filter((g: string) => /^[A-Z]$/.test(g)))].slice(0, 26) as string[], reveal: !!sp?.reveal },
  };
}

const panel = (p: any, d: Panel): Panel => ({ on: !!p?.on, x: clamp(p?.x, 0, 0.95, d.x), y: clamp(p?.y, 0, 0.95, d.y) });
function cleanGraph(g: any): GraphState {
  const d = DEFAULT_WIDGETS.graph;
  const exprs = Array.from({ length: GRAPH_ROWS }, (_, i) => String(g?.exprs?.[i] ?? (g ? "" : d.exprs[i])).slice(0, 120));
  let xMin = clamp(g?.xMin, -1e6, 1e6, d.xMin), xMax = clamp(g?.xMax, -1e6, 1e6, d.xMax);
  let yMin = clamp(g?.yMin, -1e6, 1e6, d.yMin), yMax = clamp(g?.yMax, -1e6, 1e6, d.yMax);
  if (xMax <= xMin) [xMin, xMax] = [d.xMin, d.xMax];
  if (yMax <= yMin) [yMin, yMax] = [d.yMin, d.yMax];
  const params: Record<string, GraphSlider> = {};
  for (const [k, raw] of Object.entries(g?.params && typeof g.params === "object" ? g.params : {}).slice(0, 10)) {
    if (!/^[a-z]$/.test(k)) continue;
    const r = raw as any;
    let min = clamp(r?.min, -1e4, 1e4, -10), max = clamp(r?.max, -1e4, 1e4, 10);
    if (max <= min) [min, max] = [-10, 10];
    const step = clamp(r?.step, 1e-4, 1e4, 0.1);
    params[k] = { v: clamp(r?.v, min, max, 1), min, max, step };
  }
  return { ...panel(g, d), exprs, xMin, xMax, yMin, yMax, params, keys: !!g?.keys, table: !!g?.table, big: !!g?.big };
}
function cleanLine(l: any): LineState {
  const d = DEFAULT_WIDGETS.numberLine;
  let min = clamp(l?.min, -1e6, 1e6, d.min), max = clamp(l?.max, -1e6, 1e6, d.max);
  if (max <= min) [min, max] = [d.min, d.max];
  let step = clamp(l?.step, 1e-6, 1e6, d.step);
  if ((max - min) / step > 100) step = (max - min) / 100;
  const marks = (Array.isArray(l?.marks) ? l.marks : []).slice(0, 12).map((m: unknown) => Number(m)).filter((m: number) => Number.isFinite(m) && m >= min && m <= max);
  return { ...panel(l, d), min, max, step, marks };
}

// ── Timer ──
export const startTimer = (seconds: number, now: number): Timer => ({ seconds, mode: "down", endsAt: now + seconds * 1000, left: null, startedAt: null });
export const startStopwatch = (now: number): Timer => ({ seconds: 0, mode: "up", endsAt: null, left: null, startedAt: now });
// Seconds to show: remaining for a countdown, elapsed for a stopwatch.
export function timerShows(t: Timer, now: number): number {
  if (t.mode === "up") return t.left != null ? t.left : t.startedAt != null ? Math.floor((now - t.startedAt) / 1000) : 0;
  if (t.left != null) return t.left;
  return t.endsAt != null ? Math.max(0, Math.ceil((t.endsAt - now) / 1000)) : t.seconds;
}
export const timerRunning = (t: Timer) => t.left == null && (t.mode === "up" ? t.startedAt != null : t.endsAt != null);
export function pauseTimer(t: Timer, now: number): Timer { return { ...t, left: timerShows(t, now) }; }
export function resumeTimer(t: Timer, now: number): Timer {
  if (t.left == null) return t;
  return t.mode === "up" ? { ...t, startedAt: now - t.left * 1000, left: null } : { ...t, endsAt: now + t.left * 1000, left: null };
}
export const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// ── Dice & name picker ──
export function rollDice(count: number, rng: () => number = Math.random): number[] {
  return Array.from({ length: Math.max(1, Math.min(3, count)) }, () => 1 + Math.floor(rng() * 6));
}
// A random learner — not the same one twice in a row when there's a choice.
export function pickName(names: string[], last: string | null, rng: () => number = Math.random): string | null {
  const pool = names.length > 1 && last ? names.filter((n) => n !== last) : names;
  return pool.length ? pool[Math.floor(rng() * pool.length)] : null;
}

// ── Protractor: the angle a point makes about the centre, 0–180 along the base ──
export function protractorAngle(cx: number, cy: number, px: number, py: number, rotDeg: number): number {
  const a = (Math.atan2(cy - py, px - cx) * 180) / Math.PI + rotDeg;
  return Math.round(((a % 360) + 360) % 360);
}
