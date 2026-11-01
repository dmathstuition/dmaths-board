// The graph plotter's maths, kept apart from drawing so it can be tested.
// A row can be:
//   y = 2x + 1   or just  2x + 1      a function
//   y > x^2 - 4  (<, >, <=, >=, ≤, ≥)  an inequality, drawn with shading
//   x = 3                              a vertical line
//   (1, 2), (3, -1)                    points
// Letters other than x and y (a, b, c, k, m…) are sliders.
import { compile, paramsIn, type Compiled } from "@/lib/mathExpr";

export type Ineq = "<" | ">" | "<=" | ">=";
export type Row =
  | { kind: "fn"; f: Compiled; ineq?: Ineq }
  | { kind: "vline"; x: number }
  | { kind: "points"; pts: [number, number][] }
  | { kind: "error"; error: string };
export type KeyPoint = { x: number; y: number; kind: "root" | "y-intercept" | "max" | "min" | "intersection" };

const norm = (s: string) => s.replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/−/g, "-").trim();

// The slider letters a row uses.
export function rowParams(src: string): string[] {
  const s = norm(src).replace(/^\s*[xy]\s*(<=|>=|=|<|>)/i, "");
  return paramsIn(s.replace(/[(),]/g, " ")).filter((l) => l !== "y");
}

export function parseRow(src: string, params: Record<string, number> = {}): Row | null {
  const s = norm(src);
  if (!s) return null;
  try {
    // Points: (1, 2), (3, 4)
    if (s.startsWith("(")) {
      const pts: [number, number][] = [];
      const re = /\(\s*([^,()]+(?:\([^()]*\)[^,()]*)*)\s*,\s*([^()]+(?:\([^()]*\)[^()]*)*)\s*\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(s)) && pts.length < 20) pts.push([compile(m[1], false, params)(0), compile(m[2], false, params)(0)]);
      if (!pts.length || pts.some((p) => !p.every(Number.isFinite))) return { kind: "error", error: "Write points like (1, 2)" };
      return { kind: "points", pts };
    }
    // x = 3: a vertical line
    const v = s.match(/^x\s*=\s*(.+)$/i);
    if (v && !/x/i.test(v[1])) {
      const x = compile(v[1], false, params)(0);
      return Number.isFinite(x) ? { kind: "vline", x } : { kind: "error", error: "Not a number" };
    }
    // y = …, y < …, or just an expression in x
    const m = s.match(/^y\s*(<=|>=|=|<|>)\s*(.+)$/i);
    const body = m ? m[2] : s;
    const op = m?.[1];
    return { kind: "fn", f: compile(body, false, params), ...(op && op !== "=" ? { ineq: op as Ineq } : {}) };
  } catch (e: any) {
    return { kind: "error", error: String(e?.message ?? "Check it") };
  }
}

const ok = (v: number) => Number.isFinite(v);

// Where f crosses zero between a and b (they have opposite signs).
function bisect(f: Compiled, a: number, b: number): number {
  let fa = f(a);
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2, fm = f(m);
    if (!ok(fm)) return NaN;
    if (fm === 0) return m;
    if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
  }
  return (a + b) / 2;
}

// Roots of f in [x0, x1], skipping jumps across asymptotes (like tan x, 1/x).
export function roots(f: Compiled, x0: number, x1: number, yRange: number, n = 800): number[] {
  const out: number[] = [];
  let px = x0, py = f(x0);
  for (let i = 1; i <= n && out.length < 12; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = f(x);
    if (ok(py) && ok(y)) {
      if (y === 0) out.push(x);
      else if (py !== 0 && Math.sign(py) !== Math.sign(y) && Math.abs(y - py) < yRange) {
        const r = bisect(f, px, x);
        if (ok(r) && Math.abs(f(r)) < 1e-6 * Math.max(1, yRange)) out.push(r);
      }
    }
    px = x; py = y;
  }
  return dedupe(out, (x1 - x0) / n);
}

// Turning points (local max / min) of f in [x0, x1].
export function turning(f: Compiled, x0: number, x1: number, n = 600): { x: number; y: number; kind: "max" | "min" }[] {
  const out: { x: number; y: number; kind: "max" | "min" }[] = [];
  const h = (x1 - x0) / n;
  const ys = Array.from({ length: n + 1 }, (_, i) => f(x0 + h * i));
  for (let i = 1; i < n && out.length < 12; i++) {
    const [a, b, c] = [ys[i - 1], ys[i], ys[i + 1]];
    if (!ok(a) || !ok(b) || !ok(c)) continue;
    const kind = b > a && b >= c ? "max" : b < a && b <= c ? "min" : null;
    if (!kind) continue;
    // Narrow in on it (golden-section search).
    let lo = x0 + h * (i - 1), hi = x0 + h * (i + 1);
    const better = (p: number, q: number) => (kind === "max" ? f(p) > f(q) : f(p) < f(q));
    for (let k = 0; k < 60; k++) {
      const m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618;
      if (better(m1, m2)) hi = m2; else lo = m1;
    }
    const x = (lo + hi) / 2, y = f(x);
    // A sharp spike next to an asymptote isn't a turning point.
    if (ok(y) && Math.abs(y - b) <= Math.abs(c - a) + 1e-9 + Math.abs(b) * 1e-3) out.push({ x, y, kind });
  }
  return out;
}

function dedupe(xs: number[], tol: number) {
  const out: number[] = [];
  for (const x of xs.sort((a, b) => a - b)) if (!out.length || Math.abs(x - out[out.length - 1]) > tol * 2) out.push(x);
  return out;
}

// Round off tiny floating-point noise for display (0.9999999 → 1).
export const tidy = (v: number) => (Math.abs(v - Math.round(v)) < 1e-7 ? Math.round(v) : Math.round(v * 1000) / 1000);

// Key points of every function on screen: roots, y-intercepts, turning points,
// and where the first two functions meet.
export function keyPoints(fns: Compiled[], view: { xMin: number; xMax: number; yMin: number; yMax: number }): KeyPoint[] {
  const out: KeyPoint[] = [];
  const range = view.yMax - view.yMin;
  const inView = (y: number) => y >= view.yMin && y <= view.yMax;
  for (const f of fns) {
    for (const x of roots(f, view.xMin, view.xMax, range)) out.push({ x: tidy(x), y: 0, kind: "root" });
    if (view.xMin <= 0 && view.xMax >= 0) { const y = f(0); if (ok(y) && inView(y)) out.push({ x: 0, y: tidy(y), kind: "y-intercept" }); }
    for (const t of turning(f, view.xMin, view.xMax)) if (inView(t.y)) out.push({ x: tidy(t.x), y: tidy(t.y), kind: t.kind });
  }
  if (fns.length >= 2) {
    const [f, g] = fns;
    for (const x of roots((x) => f(x) - g(x), view.xMin, view.xMax, range)) {
      const y = f(x);
      if (ok(y) && inView(y)) out.push({ x: tidy(x), y: tidy(y), kind: "intersection" });
    }
  }
  // One label where two kinds meet (a y-intercept that's also the minimum).
  const seen = new Set<string>();
  return out.filter((p) => { const k = `${p.x},${p.y}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 40);
}

// A table of values for f, centred on the view.
export function valueTable(f: Compiled, view: { xMin: number; xMax: number }, count = 7): { x: number; y: number | null }[] {
  const mid = Math.round((view.xMin + view.xMax) / 2);
  const step = Math.max(1, Math.round((view.xMax - view.xMin) / 20));
  const start = mid - Math.floor(count / 2) * step;
  return Array.from({ length: count }, (_, i) => {
    const x = start + i * step, y = f(x);
    return { x, y: ok(y) ? tidy(y) : null };
  });
}
