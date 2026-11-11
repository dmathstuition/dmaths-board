// Times tables — pure. Two tools share this file:
//  • the times-table square, a panel on the board the teacher works; and
//  • the drill: each learner (joined by PIN, no login) answers on their own
//    screen, and the teacher's screen marks every answer and remembers which
//    facts each learner finds hard.
//
// Drill messages: "drill" (teacher → all, signed, re-sent every few seconds)
// carries the drill and how many answers the teacher has from each learner;
// "drill-ans" (learner → teacher) carries all of that learner's answers so
// far, so a lost message heals itself. A learner's questions come from the
// drill's seed and their id, so the teacher's screen works out the same
// questions and does the marking itself.
import type { Panel } from "@/lib/boardTools";

const clamp = (n: unknown, lo: number, hi: number, d: number) => { const v = Number(n); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const int = (n: unknown, lo: number, hi: number, d: number) => Math.round(clamp(n, lo, hi, d));
const str = (x: unknown, n: number) => String(x ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, n);

// ═══ Times-table square ═══════════════════════════════════════════════════
export const SQUARE = 12;
export type SquareState = Panel & {
  table: number;                 // 0: none picked; else the table to light up
  sel: [number, number] | null;  // the fact in focus: [row, column]
  hide: boolean;                 // answers covered (quiz)
  shown: number[];               // covered answers the teacher has uncovered: row * 13 + column
};
export const DEFAULT_SQUARE: SquareState = { on: false, x: 0.05, y: 0.03, table: 0, sel: null, hide: false, shown: [] };
export const cellId = (r: number, c: number) => r * (SQUARE + 1) + c;
export function cleanSquare(s: any): SquareState {
  const d = DEFAULT_SQUARE, ok = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= SQUARE;
  return {
    on: !!s?.on, x: clamp(s?.x, 0, 0.95, d.x), y: clamp(s?.y, 0, 0.95, d.y), table: int(s?.table, 0, SQUARE, 0),
    sel: Array.isArray(s?.sel) && ok(s.sel[0]) && ok(s.sel[1]) ? [s.sel[0], s.sel[1]] : null, hide: !!s?.hide,
    shown: [...new Set((Array.isArray(s?.shown) ? s.shown : []).map((k: unknown) => Math.round(Number(k))).filter((k: number) => k > SQUARE && k <= cellId(SQUARE, SQUARE) && k % (SQUARE + 1) !== 0))] as number[],
  };
}
export const cellShown = (s: Pick<SquareState, "hide" | "shown">, r: number, c: number) => !s.hide || s.shown.includes(cellId(r, c));
// The four facts that go together: 7 × 8, 8 × 7, 56 ÷ 7, 56 ÷ 8.
export function family(a: number, b: number): string[] {
  const p = a * b;
  return a === b ? [`${a} × ${a} = ${p}`, `${p} ÷ ${a} = ${a}`] : [`${a} × ${b} = ${p}`, `${b} × ${a} = ${p}`, `${p} ÷ ${a} = ${b}`, `${p} ÷ ${b} = ${a}`];
}
// A covered fact to ask next (from the lit table, if one is picked).
export function randomHidden(s: SquareState, rnd: () => number = Math.random): [number, number] | null {
  const open: [number, number][] = [];
  for (let r = 1; r <= SQUARE; r++) for (let c = 1; c <= SQUARE; c++) if (!s.shown.includes(cellId(r, c)) && (!s.table || r === s.table)) open.push([r, c]);
  return open.length ? open[Math.floor(rnd() * open.length)] : null;
}

// ═══ Drill ════════════════════════════════════════════════════════════════
export const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export type Op = "times" | "divide" | "missing";
export const OPS: Op[] = ["times", "divide", "missing"];
export const OP_NAMES: Record<Op, string> = { times: "7 × 8 = ?", divide: "56 ÷ 7 = ?", missing: "7 × ? = 56" };
export const COUNTS = [10, 20, 30];
export const LIMITS = [0, 10, 6];  // seconds for each question (0: no limit). Six is the Year 4 check's time.
export const QUICK_MS = 6000;      // an answer inside this is "quick"
export const TIMED_OUT = -1;
export type Fact = [number, number];
export type Setup = { tables: number[]; ops: Op[]; count: number; limit: number };
export const DEFAULT_SETUP: Setup = { tables: [2, 5, 10], ops: ["times"], count: 10, limit: 0 };
export type Drill = { id: string; setup: Setup; seed: number; open: boolean; own: Record<string, Fact[]> }; // own: a learner's personal facts (their weak ones)
export type Q = { a: number; b: number; op: Op; text: string; ans: number };
export type Done = [number, number][]; // each answer: [what they typed (−1: ran out of time), milliseconds taken]

export function cleanSetup(s: any): Setup {
  const tables = [...new Set((Array.isArray(s?.tables) ? s.tables : []).map(Number).filter((t: number) => TABLES.includes(t)))].sort((a, b) => (a as number) - (b as number)) as number[];
  const ops = OPS.filter((o) => Array.isArray(s?.ops) && s.ops.includes(o));
  return { tables: tables.length ? tables : DEFAULT_SETUP.tables, ops: ops.length ? ops : ["times"], count: COUNTS.includes(Number(s?.count)) ? Number(s.count) : 10, limit: LIMITS.includes(Number(s?.limit)) ? Number(s.limit) : 0 };
}
const cleanFacts = (f: unknown): Fact[] => (Array.isArray(f) ? f : []).slice(0, 24).map((x: any) => [Number(x?.[0]), Number(x?.[1])] as Fact).filter(([a, b]) => Number.isInteger(a) && Number.isInteger(b) && a >= 2 && a <= 12 && b >= 2 && b <= 12);
export function cleanDrill(d: any): Drill | null {
  if (!d || typeof d !== "object" || typeof d.id !== "string" || !d.id) return null;
  const own: Record<string, Fact[]> = {};
  for (const [k, v] of Object.entries(d.own && typeof d.own === "object" ? d.own : {}).slice(0, 60)) { const f = cleanFacts(v); if (f.length) own[str(k, 80)] = f; }
  return { id: str(d.id, 40), setup: cleanSetup(d.setup), seed: int(d.seed, 0, 2 ** 31, 1), open: !!d.open, own };
}
export const newDrill = (setup: Setup, now: number, own: Record<string, Fact[]> = {}): Drill =>
  ({ id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, setup: cleanSetup(setup), seed: Math.floor(Math.random() * 2 ** 31), open: true, own });

// A small seeded generator, so the teacher's screen and the learner's make the same questions.
function seeded(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function shuffled<T>(list: T[], rnd: () => number): T[] { const o = [...list]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; }
export function ask(a: number, b: number, op: Op, swap = false): Q {
  const p = a * b;
  if (op === "divide") return { a, b, op, text: `${p} ÷ ${a} =`, ans: b };
  if (op === "missing") return { a, b, op, text: swap ? `? × ${a} = ${p}` : `${a} × ? = ${p}`, ans: b };
  return { a, b, op, text: swap ? `${b} × ${a} =` : `${a} × ${b} =`, ans: p };
}
// This learner's questions: every fact once before any comes round again.
export function questionsFor(d: Pick<Drill, "setup" | "seed" | "own">, learner: string): Q[] {
  const rnd = seeded(d.seed ^ hash(learner)), mine = d.own[learner];
  const pool: Fact[] = mine?.length ? mine : d.setup.tables.flatMap((t) => TABLES.map((b) => [t, b] as Fact));
  const out: Q[] = [];
  while (out.length < d.setup.count) {
    let round = shuffled(pool, rnd);
    const last = out[out.length - 1];
    if (last && round.length > 1 && round[0][0] === last.a && round[0][1] === last.b) round = [...round.slice(1), round[0]];
    for (const [a, b] of round) { if (out.length >= d.setup.count) break; out.push(ask(a, b, d.setup.ops[Math.floor(rnd() * d.setup.ops.length)], rnd() < 0.5)); }
  }
  return out;
}
export function cleanDone(p: unknown, max: number): Done {
  return (Array.isArray(p) ? p : []).slice(0, max).map((x: any) => [int(x?.[0], TIMED_OUT, 999, TIMED_OUT), int(x?.[1], 0, 600_000, 0)] as [number, number]);
}
export const isRight = (q: Q, a: [number, number]) => a[0] === q.ans;
export const factText = (q: Pick<Q, "a" | "b">) => `${q.a} × ${q.b} = ${q.a * q.b}`;
// The marks for the answers so far.
export function mark(qs: Q[], done: Done) {
  const n = Math.min(done.length, qs.length);
  let right = 0, ms = 0, quick = 0;
  const missed: Q[] = [];
  for (let i = 0; i < n; i++) {
    if (isRight(qs[i], done[i])) { right++; ms += done[i][1]; if (done[i][1] <= QUICK_MS) quick++; }
    else if (!missed.some((m) => factKey(m.a, m.b) === factKey(qs[i].a, qs[i].b))) missed.push(qs[i]);
  }
  return { n, total: qs.length, right, wrong: n - right, quick, avgMs: right ? Math.round(ms / right) : 0, missed, finished: n >= qs.length };
}

// ── What a learner knows, fact by fact (kept on the teacher's device) ──
// 7 × 8 and 8 × 7 are the same fact.
export const factKey = (a: number, b: number) => `${Math.min(a, b)}x${Math.max(a, b)}`;
export type Known = { r: number; w: number; ms: number; ok: boolean }; // times right, times wrong, usual time when right, and whether the last go was right
export type Mastery = Record<string, Known>;
export type Level = "new" | "wrong" | "slow" | "quick";
export const levelOf = (k: Known | undefined): Level => (!k ? "new" : !k.ok ? "wrong" : k.ms > QUICK_MS ? "slow" : "quick");
// Fold answers from index `from` onwards into the record.
export function learn(m: Mastery, qs: Q[], done: Done, from = 0): Mastery {
  const out = { ...m };
  for (let i = from; i < Math.min(done.length, qs.length); i++) {
    const key = factKey(qs[i].a, qs[i].b), k = out[key] ?? { r: 0, w: 0, ms: 0, ok: false }, ok = isRight(qs[i], done[i]);
    out[key] = ok ? { r: k.r + 1, w: k.w, ms: k.r ? Math.round(k.ms * 0.5 + done[i][1] * 0.5) : done[i][1], ok: true } : { ...k, w: k.w + 1, ok: false };
  }
  return out;
}
export function cleanMastery(m: any): Mastery {
  const out: Mastery = {};
  if (!m || typeof m !== "object") return out;
  for (const [k, v] of Object.entries(m as Record<string, any>).slice(0, 200)) {
    if (/^\d{1,2}x\d{1,2}$/.test(k) && v && typeof v === "object") out[k] = { r: int(v.r, 0, 9999, 0), w: int(v.w, 0, 9999, 0), ms: int(v.ms, 0, 600_000, 0), ok: !!v.ok };
  }
  return out;
}
// The facts to work on: wrong ones first, then slow ones.
export function weakFacts(m: Mastery, limit = 12): Fact[] {
  const rank = { wrong: 0, slow: 1, quick: 2, new: 3 };
  return Object.entries(m).filter(([, k]) => levelOf(k) === "wrong" || levelOf(k) === "slow")
    .sort((x, y) => rank[levelOf(x[1])] - rank[levelOf(y[1])] || y[1].w - x[1].w || y[1].ms - x[1].ms || x[0].localeCompare(y[0]))
    .slice(0, limit).map(([k]) => k.split("x").map(Number) as Fact);
}
export function masteryCount(m: Mastery, tables: number[] = TABLES) {
  const c = { quick: 0, slow: 0, wrong: 0, new: 0, total: 0 }, seen = new Set<string>();
  for (const a of tables) for (const b of TABLES) { const k = factKey(a, b); if (seen.has(k)) continue; seen.add(k); c[levelOf(m[k])]++; c.total++; }
  return c;
}
export const DRILL_GAME_ID = "times-drill";
export const masteryStoreKey = (name: string) => `dm-tables:${name.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 60)}`;
export const seconds = (ms: number) => `${(Math.round(ms / 100) / 10).toFixed(1)} s`;
