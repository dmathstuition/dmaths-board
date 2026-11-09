// Virtual practicals: a lab bench with real apparatus and a lab notebook that
// walks through the protocol step by step (components/lab/bench/BenchLab.tsx).
// A practical is data plus small pure functions, so the whole protocol can be
// run in tests without a screen.

export type Rand = () => number;

// One piece of apparatus where it stands now. x, y: the middle of its base, on
// a 1400 × 800 bench (the shelf top is at y = 300, the bench top at y = 640).
export type ItemView = {
  id: string; kind: string; x: number; y: number;
  label?: string;            // the tag under it
  props?: Record<string, any>;
  hidden?: boolean;
  z?: number;                // drawn above lower numbers
  r?: number;                // how close a drop must land (default 110)
  tilt?: number;             // degrees (a bottle pouring)
};

export type Field = {
  key: string; label: string; unit?: string;
  options?: string[];        // a choice instead of a number
  // Right? Return true, or a short hint saying what to look at again.
  check: (value: string, s: any, values: Record<string, string>) => true | string;
  answer: (s: any, values: Record<string, string>) => string; // shown after three tries
};

export type Action =
  | { type: "drag"; item: string; onto: string; pour?: boolean } // move one thing onto another
  | { type: "tap"; item: string; label: string }                 // a switch or a button on the apparatus
  | { type: "hold"; item: string; label: string; rate: number; drop: number } // hold to run (a burette tap); "drop" per tap
  | { type: "set"; item: string; label: string; min: number; max: number; step: number; unit: string; target: number; tolerance: number;
      hint?: string; targetOf?: (s: any) => number; start?: number }              // targetOf: when the right setting depends on the samples                                              // "hint": adjust until it looks right (the target isn't given away)
  | { type: "wait"; label: string; minutes: number }               // time passing (fast-forwarded)
  | { type: "record"; fields: Field[] };                           // write readings in the notebook

export type Step<S> = {
  id: string;
  group?: string;            // a heading in the protocol (several steps under it)
  title: string;             // what to do, in a few words
  how: string;               // how to do it
  action: Action;
  apply?: (s: S, value?: number) => S;      // what happens when it's done (value: a set step's value)
  tick?: (s: S, seconds: number) => S;      // while holding / waiting
  finished?: (s: S) => boolean;             // a hold step ends when this is true
  note?: (s: S) => string | null;           // what you see afterwards
  magnify?: string;                         // show a close-up of this item (reading a scale)
  magnifyAt?: { x: number; y: number };     // where the close-up goes (default: beside the item)
  show?: (s: S, values: Record<string, string>) => Table; // a table to look at while doing the step (repeat readings)
};

export type Table = { title: string; columns: string[]; rows: (string | number)[][] };
export type Graph = { title: string; x: string; y: string; points: [number, number][]; line?: [number, number][];
  label?: string; more?: { label: string; points: [number, number][] }[] }; // more: extra series, joined, with a key

export type Practical<S = any> = {
  slug: string; title: string; subject: "maths" | "physics" | "chemistry" | "biology";
  aim: string;
  safety: string[];
  init: (rand: Rand) => S;
  layout: (s: S, step: number) => ItemView[];
  steps: Step<S>[];
  results: (s: S, values: Record<string, string>) => Table[];
  graph?: (s: S, values: Record<string, string>) => Graph | null;
  conclusion: (s: S, values: Record<string, string>) => string;
};

export const num = (v: string) => {
  const t = String(v ?? "").replace(/,/g, "").trim(), f = t.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/); // "3/4" is a number too
  if (f) return Number(f[2]) ? Number(f[1]) / Number(f[2]) : null;
  const n = Number(t); return Number.isFinite(n) && t !== "" ? n : null;
};
export const near = (v: string, want: number, tol: number) => { const n = num(v); return n != null && Math.abs(n - want) <= tol + 1e-9; };
export const round = (x: number, dp = 2) => Math.round(x * 10 ** dp) / 10 ** dp;
export const fix = (x: number, dp = 2) => (Math.round(x * 10 ** dp) / 10 ** dp).toFixed(dp);
// Least-squares line through the points (and through the origin when asked).
export function fitLine(pts: [number, number][], origin = false): { m: number; c: number } {
  if (!pts.length) return { m: 0, c: 0 };
  if (origin) { const sxy = pts.reduce((a, [x, y]) => a + x * y, 0), sxx = pts.reduce((a, [x]) => a + x * x, 0); return { m: sxx ? sxy / sxx : 0, c: 0 }; }
  const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
  const sxx = pts.reduce((a, [x]) => a + (x - mx) ** 2, 0), sxy = pts.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0);
  const m = sxx ? sxy / sxx : 0;
  return { m, c: my - m * mx };
}

// Shared by the practicals: where the shelf and bench tops are, and a random value in a range.
export const SHELF = 300, BENCH = 640;
export const between = (r: Rand, a: number, b: number, dp = 2) => round(a + r() * (b - a), dp);
export const deg = (x: number) => (x * Math.PI) / 180;
