// Three maths tools on the board — pure: the geoboard (pegs and bands), the
// equation balance and the chart maker. What each holds, how it's cleaned as
// it arrives over the class channel, and all the sums.
import type { Panel } from "@/lib/boardTools";

const clamp = (n: unknown, lo: number, hi: number, d: number) => { const v = Number(n); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const int = (n: unknown, lo: number, hi: number, d: number) => Math.round(clamp(n, lo, hi, d));
const panel = (p: any, d: Panel): Panel => ({ on: !!p?.on, x: clamp(p?.x, 0, 0.95, d.x), y: clamp(p?.y, 0, 0.95, d.y) });
const txt = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, n);
export const round = (x: number, dp = 2) => Math.round(x * 10 ** dp) / 10 ** dp;
// A number the way it's written in an exercise book: no trailing zeros.
export const tidy = (x: number, dp = 2) => String(round(x, dp));

// ═══ Geoboard ═════════════════════════════════════════════════════════════
// Pegs in a square grid, one unit apart. A band goes round pegs in order.
export type Pt = [number, number]; // column, row (row 0 at the top)
export type Band = { pts: Pt[]; closed: boolean };
export type Mirror = "none" | "v" | "h" | "d";
export type GeoState = Panel & { n: number; bands: Band[]; active: number; mirror: Mirror; reflect: boolean; area: boolean; perim: boolean; angles: boolean };
export const GEO_BANDS = 4, GEO_MAX_PTS = 12, GEO_SIZES = [5, 7, 9, 11];
export const BAND_COLOURS = ["#DC2626", "#2563EB", "#16A34A", "#9333EA"];
export const DEFAULT_GEO: GeoState = { on: false, x: 0.05, y: 0.05, n: 7, bands: [{ pts: [], closed: false }], active: 0, mirror: "none", reflect: false, area: true, perim: true, angles: false };

export function cleanGeo(g: any): GeoState {
  const d = DEFAULT_GEO, n = GEO_SIZES.includes(g?.n) ? g.n : d.n;
  const bands: Band[] = (Array.isArray(g?.bands) ? g.bands : []).slice(0, GEO_BANDS).map((b: any) => {
    const pts: Pt[] = (Array.isArray(b?.pts) ? b.pts : []).slice(0, GEO_MAX_PTS)
      .filter((p: any) => Array.isArray(p) && p.length === 2).map((p: any) => [int(p[0], 0, n - 1, 0), int(p[1], 0, n - 1, 0)] as Pt);
    return { pts, closed: !!b?.closed && pts.length >= 3 };
  });
  if (!bands.length) bands.push({ pts: [], closed: false });
  return { ...panel(g, d), n, bands, active: int(g?.active, 0, bands.length - 1, 0), mirror: ["v", "h", "d"].includes(g?.mirror) ? g.mirror : "none",
    reflect: !!g?.reflect, area: g ? g.area !== false : true, perim: g ? g.perim !== false : true, angles: !!g?.angles };
}

const same = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];
// Tap a peg: the band goes on to it; tapping the first peg again closes the
// shape; tapping the last peg takes it off again.
export function tapPeg(band: Band, p: Pt): Band {
  if (band.closed) return band;
  const { pts } = band, last = pts[pts.length - 1];
  if (last && same(last, p)) return { pts: pts.slice(0, -1), closed: false };
  if (pts.length >= 3 && same(pts[0], p)) return { pts, closed: true };
  if (pts.some((q) => same(q, p)) || pts.length >= GEO_MAX_PTS) return band; // a band goes round each peg once
  return { pts: [...pts, p], closed: false };
}

// √n written as a√b with b as small as it goes (√8 = 2√2).
export function simplifyRoot(n: number): [number, number] {
  let a = 1, b = n;
  for (let k = 2; k * k <= b; k++) while (b % (k * k) === 0) { b /= k * k; a *= k; }
  return [a, b];
}
const sides = (b: Band): [Pt, Pt][] => b.pts.map((p, i) => [p, b.pts[(i + 1) % b.pts.length]] as [Pt, Pt]).slice(0, b.closed ? b.pts.length : Math.max(0, b.pts.length - 1));
export const sideLengths = (b: Band) => sides(b).map(([p, q]) => Math.hypot(q[0] - p[0], q[1] - p[1]));
// The distance round the band: a number, and written exactly ("8 + 2√2").
export function perimeter(b: Band): { value: number; exact: string } {
  const roots = new Map<number, number>(); // radicand → how many
  let value = 0;
  for (const [p, q] of sides(b)) {
    const d2 = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2, [a, r] = simplifyRoot(d2);
    roots.set(r, (roots.get(r) ?? 0) + a); value += Math.sqrt(d2);
  }
  const terms = [...roots.entries()].sort((x, y) => x[0] - y[0]).map(([r, a]) => (r === 1 ? String(a) : `${a === 1 ? "" : a}√${r}`));
  return { value, exact: terms.join(" + ") || "0" };
}
// Shoelace formula (square units). Whole or half numbers on a peg grid.
export function area(b: Band): number {
  if (!b.closed) return 0;
  const s = b.pts.reduce((sum, p, i) => { const q = b.pts[(i + 1) % b.pts.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0);
  return Math.abs(s) / 2;
}
const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const between = (a: Pt, b: Pt, c: Pt) => Math.min(a[0], b[0]) <= c[0] && c[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= c[1] && c[1] <= Math.max(a[1], b[1]);
function crosses(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return (d1 === 0 && between(c, d, a)) || (d2 === 0 && between(c, d, b)) || (d3 === 0 && between(a, b, c)) || (d4 === 0 && between(a, b, d));
}
// A band that crosses over itself isn't a simple shape: no area or angles for it.
export function crossesItself(b: Band): boolean {
  if (!b.closed) return false;
  const s = sides(b), n = s.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (j === i + 1 || (i === 0 && j === n - 1)) continue; // neighbours share a peg
    if (crosses(s[i][0], s[i][1], s[j][0], s[j][1])) return true;
  }
  return false;
}
// The angle inside the shape at each peg, in degrees (a straight-through peg is 180°).
export function interiorAngles(b: Band): number[] {
  if (!b.closed || b.pts.length < 3) return [];
  const n = b.pts.length, turn = b.pts.reduce((s, p, i) => { const q = b.pts[(i + 1) % n]; return s + p[0] * q[1] - q[0] * p[1]; }, 0); // sign: which way round
  return b.pts.map((p, i) => {
    const a = b.pts[(i + n - 1) % n], c = b.pts[(i + 1) % n];
    const ang = (Math.atan2(cross(p, c, a), (c[0] - p[0]) * (a[0] - p[0]) + (c[1] - p[1]) * (a[1] - p[1])) * 180) / Math.PI;
    const inside = turn > 0 ? ang : -ang;
    return round((inside + 360) % 360, 1);
  });
}
const POLYGONS = ["", "", "", "triangle", "quadrilateral", "pentagon", "hexagon", "heptagon", "octagon", "nonagon", "decagon", "11-sided shape", "12-sided shape"];
const eq = (a: number, b: number) => Math.abs(a - b) < 1e-9;
// What the shape is called (pegs the band passes straight through don't count as corners).
export function shapeName(b: Band): string {
  if (!b.closed) return b.pts.length < 2 ? "" : b.pts.length === 2 ? "line" : "open path";
  if (crossesItself(b)) return "crossed band";
  const ang = interiorAngles(b), keep = b.pts.filter((_, i) => !eq(ang[i], 180));
  if (keep.length < 3) return "line";
  const c: Band = { pts: keep, closed: true }, len = sideLengths(c), a = interiorAngles(c), n = keep.length;
  if (n === 3) {
    const right = a.some((x) => eq(x, 90)), iso = eq(len[0], len[1]) || eq(len[1], len[2]) || eq(len[0], len[2]);
    return `${right ? "right-angled " : ""}${iso ? "isosceles" : "scalene"} triangle`;
  }
  if (n === 4) {
    const allSides = len.every((l) => eq(l, len[0])), allRight = a.every((x) => eq(x, 90));
    const par = (i: number) => cross([0, 0], [keep[(i + 1) % 4][0] - keep[i][0], keep[(i + 1) % 4][1] - keep[i][1]], [keep[(i + 3) % 4][0] - keep[(i + 2) % 4][0], keep[(i + 3) % 4][1] - keep[(i + 2) % 4][1]]) === 0;
    const p0 = par(0), p1 = par(1);
    if (allSides && allRight) return "square";
    if (allRight) return "rectangle";
    if (allSides) return "rhombus";
    if (p0 && p1) return "parallelogram";
    if (p0 || p1) return "trapezium";
    if ((eq(len[0], len[1]) && eq(len[2], len[3])) || (eq(len[1], len[2]) && eq(len[3], len[0]))) return a.some((x) => x > 180) ? "arrowhead (dart)" : "kite";
    return "quadrilateral";
  }
  const regular = len.every((l) => eq(l, len[0])) && a.every((x) => eq(x, a[0]));
  return `${regular ? "regular " : ""}${POLYGONS[n] ?? `${n}-sided shape`}`;
}
// A peg's image in the mirror line (through the middle of an n × n board).
export function reflectPt(p: Pt, mirror: Mirror, n: number): Pt {
  const m = n - 1;
  return mirror === "v" ? [m - p[0], p[1]] : mirror === "h" ? [p[0], m - p[1]] : mirror === "d" ? [p[1], p[0]] : p;
}
// Is the shape its own mirror image in this line?
export function symmetricIn(b: Band, mirror: Mirror, n: number): boolean {
  if (!b.closed || mirror === "none") return false;
  const key = (pts: Pt[]) => pts.map((p) => p.join(",")), a = key(b.pts), r = key(b.pts.map((p) => reflectPt(p, mirror, n)));
  const round2 = `;${[...a, ...a].join(";")};`; // the pegs, twice round: any starting peg, either way round
  return round2.includes(`;${r.join(";")};`) || round2.includes(`;${[...r].reverse().join(";")};`);
}

// ═══ Equation balance ═════════════════════════════════════════════════════
// Each pan holds x-blocks and unit weights: [x-blocks, units]. `x` is what one
// x-block really weighs (the answer), so the scale tips when the sides differ.
export type Side = [number, number];
export type Op = { kind: "add" | "take"; what: "x" | "1"; n: number } | { kind: "divide"; n: number };
export type Where = "both" | "left" | "right";
export type BalanceState = Panel & { ans: number; start: [Side, Side]; left: Side; right: Side; log: string[]; reveal: boolean; where: Where };
export const BAL_MAX_X = 8, BAL_MAX_UNITS = 30, BAL_LOG = 10;
export const DEFAULT_BALANCE: BalanceState = { on: false, x: 0.3, y: 0.06, ans: 4, start: [[2, 3], [0, 11]], left: [2, 3], right: [0, 11], log: [], reveal: false, where: "both" };

const side = (s: any, d: Side): Side => (Array.isArray(s) && s.length === 2 ? [int(s[0], 0, BAL_MAX_X, d[0]), int(s[1], 0, BAL_MAX_UNITS, d[1])] : d);
export const weight = (s: Side, ans: number) => s[0] * ans + s[1];
// As it arrives: the answer always comes from the starting equation, never from the message.
export function cleanBalance(b: any): BalanceState {
  const d = DEFAULT_BALANCE;
  const start: [Side, Side] = Array.isArray(b?.start) && b.start.length === 2 ? [side(b.start[0], d.start[0]), side(b.start[1], d.start[1])] : d.start;
  const ans = solve(start[0], start[1]);
  if (ans == null) return { ...d, ...panel(b, d) };
  return { ...panel(b, d), ans, start, left: side(b?.left, start[0]), right: side(b?.right, start[1]),
    log: (Array.isArray(b?.log) ? b.log : []).slice(-BAL_LOG).map((l: unknown) => txt(l, 70)).filter(Boolean), reveal: !!b?.reveal, where: b?.where === "left" || b?.where === "right" ? b.where : "both" };
}
// One side of the equation in words: "2x + 3", "x", "11", "0".
export function sideText(s: Side): string {
  const xs = s[0] === 0 ? "" : s[0] === 1 ? "x" : `${s[0]}x`;
  return xs && s[1] ? `${xs} + ${s[1]}` : xs || String(s[1]);
}
export const equationText = (l: Side, r: Side) => `${sideText(l)} = ${sideText(r)}`;
// The answer to ax + b = cx + d, when it's a whole number from 0 to 20.
export function solve(l: Side, r: Side): number | null {
  const a = l[0] - r[0], c = r[1] - l[1];
  if (a === 0) return null;
  const x = c / a;
  return Number.isInteger(x) && x >= 0 && x <= 20 ? x : null;
}
// Can this be done (enough blocks to take away, divides exactly, pans not overfull)?
export function canDo(s: Side, op: Op): boolean {
  if (op.kind === "divide") return op.n >= 2 && s[0] % op.n === 0 && s[1] % op.n === 0 && (s[0] > 0 || s[1] > 0);
  const i = op.what === "x" ? 0 : 1, max = i ? BAL_MAX_UNITS : BAL_MAX_X;
  return op.kind === "add" ? s[i] + op.n <= max : s[i] >= op.n;
}
export function doOp(s: Side, op: Op): Side {
  if (op.kind === "divide") return [s[0] / op.n, s[1] / op.n];
  const d = op.kind === "add" ? op.n : -op.n;
  return op.what === "x" ? [s[0] + d, s[1]] : [s[0], s[1] + d];
}
export function opText(op: Op, where: Where): string {
  const to = where === "both" ? "both sides" : `the ${where} side only`;
  if (op.kind === "divide") return `Divide ${to} by ${op.n}`;
  const what = op.what === "x" ? (op.n === 1 ? "x" : `${op.n}x`) : String(op.n);
  return op.kind === "add" ? `Add ${what} to ${to}` : `Take ${what} from ${to}`;
}
export type Tilt = "level" | "left" | "right"; // which side is heavier (goes down)
export const tilt = (l: Side, r: Side, ans: number): Tilt => { const d = weight(l, ans) - weight(r, ans); return Math.abs(d) < 1e-9 ? "level" : d > 0 ? "left" : "right"; };
// Solved: one x alone on a pan, numbers alone on the other, and still level.
export function solved(l: Side, r: Side, ans: number): boolean {
  const alone = (a: Side, b: Side) => a[0] === 1 && a[1] === 0 && b[0] === 0;
  return tilt(l, r, ans) === "level" && (alone(l, r) || alone(r, l));
}
// A new equation with a whole-number answer. Level 1: x + b = d or ax = d; 2: ax + b = d; 3: x on both sides.
export function newEquation(level: 1 | 2 | 3, rng: () => number = Math.random): { ans: number; left: Side; right: Side } {
  const pick = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
  for (let tries = 0; tries < 200; tries++) {
    const ans = pick(1, 9);
    let left: Side, right: Side;
    if (level === 1) { if (rng() < 0.5) { const b = pick(1, 9); left = [1, b]; right = [0, ans + b]; } else { const a = pick(2, 5); left = [a, 0]; right = [0, a * ans]; } }
    else if (level === 2) { const a = pick(2, 4), b = pick(1, 8); left = [a, b]; right = [0, a * ans + b]; }
    else { const c = pick(1, 3), a = c + pick(1, 3), b = pick(0, 6), d = (a - c) * ans + b; left = [a, b]; right = [c, d]; }
    if (left[1] <= BAL_MAX_UNITS && right[1] <= BAL_MAX_UNITS && left[0] <= BAL_MAX_X) return { ans, left, right };
  }
  return { ans: 4, left: [2, 3], right: [0, 11] };
}

// ═══ Chart maker ══════════════════════════════════════════════════════════
export type ChartKind = "bar" | "pie" | "line" | "hist";
export type Row = { label: string; value: number };
export type ChartState = Panel & { kind: ChartKind; title: string; rows: Row[]; list: number[]; width: number; stats: boolean; working: boolean };
export const CHART_ROWS = 10, CHART_LIST = 60;
export const DEFAULT_CHART: ChartState = { on: false, x: 0.2, y: 0.04, kind: "bar", title: "Favourite fruit",
  rows: [{ label: "Mango", value: 8 }, { label: "Orange", value: 5 }, { label: "Banana", value: 6 }, { label: "Pawpaw", value: 3 }],
  list: [12, 15, 15, 18, 21, 22, 22, 22, 25, 27, 31, 34], width: 5, stats: true, working: false };

export function cleanChart(c: any): ChartState {
  const d = DEFAULT_CHART;
  const rows: Row[] = Array.isArray(c?.rows) ? c.rows.slice(0, CHART_ROWS).map((r: any) => ({ label: txt(r?.label, 16), value: round(clamp(r?.value, 0, 1e6, 0), 2) })) : d.rows;
  const list: number[] = Array.isArray(c?.list) ? c.list.slice(0, CHART_LIST).map((n: unknown) => Number(n)).filter((n: number) => Number.isFinite(n) && Math.abs(n) <= 1e6).map((n: number) => round(n, 2)) : d.list;
  return { ...panel(c, d), kind: ["pie", "line", "hist"].includes(c?.kind) ? c.kind : "bar", title: c ? txt(c.title, 40) : d.title, rows, list,
    width: round(clamp(c?.width, 0.1, 1e5, d.width), 2), stats: c ? c.stats !== false : true, working: !!c?.working };
}
// Numbers typed with commas or spaces → a list.
export function parseList(text: string): number[] {
  return String(text ?? "").split(/[\s,;]+/).filter(Boolean).map((t) => Number(t)).filter((n) => Number.isFinite(n) && Math.abs(n) <= 1e6).slice(0, CHART_LIST).map((n) => round(n, 2));
}

export type Stats = { n: number; sum: number; mean: number; median: number; modes: number[]; min: number; max: number; range: number; sorted: number[] };
// Mean, median, mode and range of a list. No mode when every value comes up equally often.
export function stats(values: number[]): Stats | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b), n = sorted.length;
  if (!n) return null;
  const sum = sorted.reduce((a, b) => a + b, 0), mid = Math.floor(n / 2);
  const count = new Map<number, number>();
  for (const v of sorted) count.set(v, (count.get(v) ?? 0) + 1);
  const counts = [...count.values()], top = Math.max(...counts);
  const modes = top > 1 && (count.size === 1 || counts.some((c) => c < top)) ? [...count.entries()].filter(([, c]) => c === top).map(([v]) => v) : [];
  return { n, sum, mean: sum / n, median: n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2, modes, min: sorted[0], max: sorted[n - 1], range: sorted[n - 1] - sorted[0], sorted };
}
// A table whose labels are all numbers is a frequency table: score → how many.
export const isFrequencyTable = (rows: Row[]) => rows.length > 0 && rows.every((r) => r.label.trim() !== "" && Number.isFinite(Number(r.label)) && Number.isInteger(r.value));
// The list a frequency table stands for (each score written out as often as it came up).
export function expand(rows: Row[], max = 2000): number[] {
  const out: number[] = [];
  for (const r of rows) for (let k = 0; k < r.value && out.length < max; k++) out.push(Number(r.label));
  return out;
}
// The statistics for the chart: from the list (histogram), a frequency table, or the values themselves.
export function chartStats(c: Pick<ChartState, "kind" | "rows" | "list">): { of: "list" | "frequency" | "values"; s: Stats } | null {
  const of = c.kind === "hist" ? "list" : isFrequencyTable(c.rows) ? "frequency" : "values";
  const s = stats(of === "list" ? c.list : of === "frequency" ? expand(c.rows) : c.rows.map((r) => r.value));
  return s ? { of, s } : null;
}
export const modeText = (s: Stats) => (s.modes.length ? s.modes.map((m) => tidy(m)).join(" and ") : "no mode");

// Equal classes for a histogram: lo ≤ value < hi.
export type Bin = { lo: number; hi: number; f: number };
export function bins(list: number[], width: number): Bin[] {
  const vals = list.filter((v) => Number.isFinite(v));
  if (!vals.length || !(width > 0)) return [];
  const min = Math.min(...vals), max = Math.max(...vals);
  let w = width;
  while ((max - Math.floor(min / w) * w) / w > 20) w *= 2; // never more than 20 classes
  const start = Math.floor(min / w + 1e-9) * w, count = Math.max(1, Math.floor((max - start) / w + 1e-9) + 1);
  const out: Bin[] = Array.from({ length: count }, (_, i) => ({ lo: round(start + i * w, 4), hi: round(start + (i + 1) * w, 4), f: 0 }));
  for (const v of vals) out[Math.min(count - 1, Math.floor((v - start) / w + 1e-9))].f++;
  return out;
}
// A pie chart's sectors: each value's share of the total, as a percentage and an angle.
export function sectors(rows: Row[]): { label: string; value: number; pct: number; angle: number; from: number }[] {
  const total = rows.reduce((a, r) => a + Math.max(0, r.value), 0);
  let from = 0;
  return rows.filter((r) => r.value > 0).map((r) => { const angle = total ? (r.value / total) * 360 : 0, s = { label: r.label, value: r.value, pct: total ? (r.value / total) * 100 : 0, angle, from }; from += angle; return s; });
}
// A tidy axis from 0 (or below, for negatives) to just past the biggest value.
export function axis(max: number, min = 0, lines = 5): { lo: number; hi: number; step: number; ticks: number[] } {
  const lo0 = Math.min(0, min), hi0 = Math.max(max, lo0 + 1e-9), raw = (hi0 - lo0) / lines, k = 10 ** Math.floor(Math.log10(raw)), f = raw / k;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * k, lo = Math.floor(lo0 / step + 1e-9) * step, hi = Math.ceil(hi0 / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(round(v, 6));
  return { lo, hi, step, ticks };
}
