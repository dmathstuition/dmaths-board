// An IGCSE "Alternative to Practical" paper (Cambridge Paper 6: Physics 0625,
// Chemistry 0620, Biology 0610 — one hour, about 40 marks), made from the
// lab's practicals. Each practical is done "behind the scenes" with fresh
// samples, and becomes a question the way the real paper sets them:
//   • read an instrument from a diagram (the bench's own close-up),
//   • complete the results table,
//   • plot a graph and draw the line of best fit, then find its gradient,
//   • explain and evaluate the method, and state a safety precaution;
// and the paper ends with a planning question. Readings, tables and graphs
// mark themselves; written answers come to the teacher with a mark scheme.
// Pure: the pictures are drawn by the page (components/lab/atpFigures.tsx).
import type { ExamQ, Grid } from "@/lib/exams";
import type { ItemView, Practical, Table } from "@/lib/lab/bench/types";
import { fitLine, num } from "@/lib/lab/bench/types";
import { ALL_PRACTICALS } from "@/lib/lab/bench/all";
import { checkField, doStep, seeded } from "@/lib/lab/bench/run";
import { examFor } from "@/lib/lab/bench/exam";
import { NEEDS } from "@/lib/lab/room/plans";

export type AtpSubject = "physics" | "chemistry" | "biology";
export const ATP_SUBJECTS: Record<AtpSubject, { label: string; code: string }> = {
  physics: { label: "Physics", code: "0625" },
  chemistry: { label: "Chemistry", code: "0620" },
  biology: { label: "Biology", code: "0610" },
};
export const ATP_MINUTES = 60;

export type AtpFigure = { id: string; caption: string } & (
  | { kind: "lens"; item: ItemView }                              // a close-up of an instrument's scale
  | { kind: "table"; table: Table; blanks: [number, number][] }); // a results table, some cells to fill in
export type AtpQ = Omit<ExamQ, "img"> & { fig?: string };           // fig: the figure shown with the question
export type AtpPaper = { title: string; subject: AtpSubject; minutes: number; marks: number; questions: AtpQ[]; figures: AtpFigure[]; used: string[] };

const LETTERS = "abcdefghijklmnop";
const dpOf = (s: string) => (String(s).split(".")[1] ?? "").length;
const same = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
const CALC = /calculat|work out|mean|average|titre|gradient|rate|change in|difference|total|density|speed|resist|percent|ratio|efficien|value of|find/i;
const isNumeric = (s: string) => num(s) != null;
// "Time for 10 swings" → "time for 10 swings"; "kPa", "pH" and names stay as they are.
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) && !/^(Benedict|Biuret|Boyle|Hooke|Ohm)/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const nameOf = (it: ItemView) => {
  const n = lowerFirst(String(it.props?.name || it.label || it.kind).replace(/\s*\(.*\)$/, ""));
  return /^(the|a|an)\s|^\w+ing\s/i.test(n) ? n : `the ${n}`; // "taking the pulse…" needs no "the"
};
// How well a straight line fits the points (1 = perfectly).
export function straightness(pts: [number, number][]): number {
  const { m, c } = fitLine(pts), my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  const res = pts.reduce((a, [x, y]) => a + (y - (m * x + c)) ** 2, 0), tot = pts.reduce((a, [, y]) => a + (y - my) ** 2, 0);
  return tot ? 1 - res / tot : 1;
}

// Every answer the notebook's own check accepts, next to the right one, as a
// range ("23.40..23.50"), so a reading is marked like the real mark scheme.
export function accepted(f: Parameters<typeof checkField>[0], s: unknown, values: Record<string, string>): string {
  const ans = f.answer(s, values), n = num(ans);
  if (n == null) return ans;
  const dp = dpOf(ans), step = 10 ** -dp, at = (x: number) => x.toFixed(dp);
  const ok = (x: number) => checkField(f, at(x), s, values) === true;
  if (!ok(n)) return ans;
  let lo = n, hi = n;
  for (let k = 1; k <= 60 && ok(n - k * step); k++) lo = n - k * step;
  for (let k = 1; k <= 60 && ok(n + k * step); k++) hi = n + k * step;
  return same(lo, hi) ? ans : `${at(lo)}..${at(hi)}`;
}

// Axes for a graph, as on graph paper: 10 big squares each way, each a round
// step (1, 2, 2.5 or 5 × 10ⁿ), starting at 0 unless the data sit far from it.
const NICE = [1, 2, 2.5, 5, 10];
function niceAtLeast(x: number) { const k = 10 ** Math.floor(Math.log10(x)); return NICE.map((f) => f * k).find((v) => v >= x - 1e-12) ?? 10 * k; }
export function gridFor(points: [number, number][], xLabel: string, yLabel: string): Grid {
  const axis = (vs: number[]) => {
    const lo = Math.min(...vs), hi = Math.max(...vs);
    const from = lo >= 0 && lo < 0.5 * hi ? 0 : lo;
    let st = niceAtLeast(Math.max(hi - from, Math.abs(hi) * 0.1 || 1) / 10), a = Math.floor(from / st) * st;
    for (let i = 0; i < 6 && a + 10 * st < hi - 1e-12; i++) { st = niceAtLeast(st * 1.01); a = Math.floor(from / st) * st; }
    const r = (v: number) => Number(v.toPrecision(10));
    return [r(a), r(a + 10 * st)] as const;
  };
  const [x0, x1] = axis(points.map((p) => p[0])), [y0, y1] = axis(points.map((p) => p[1]));
  return { x: xLabel, y: yLabel, x0, x1, y0, y1 };
}

type Section = { p: Practical; marks: number; qs: AtpQ[]; figs: AtpFigure[] };

// One practical as one question of the paper (number k).
export function section(p: Practical, k: number, seed: number, zoomable: (it: ItemView) => boolean): Section {
  let s = p.init(seeded(seed)), values: Record<string, string> = {};
  const snaps: { i: number; s: any; values: Record<string, string> }[] = [];
  p.steps.forEach((st, i) => {
    if (st.action.type === "record") snaps.push({ i, s: JSON.parse(JSON.stringify(s)), values: { ...values } });
    ({ s, values } = doStep(st, s, values));
  });
  const qs: AtpQ[] = [], figs: AtpFigure[] = [];
  let part = 0, figN = 0, tableN = 0;
  const label = () => `${k}(${LETTERS[part++]})`;
  // The first part carries the practical's name and aim (label() has just been called for it).
  const intro = (t: string) => (part === 1 ? `${k}  ${p.title}. ${p.aim.length > 150 ? `${p.aim.slice(0, 147)}…` : p.aim}\n\n` : "") + t;

  // The graph and the results table, as they stand at the end.
  const g = p.graph?.(s, values) ?? null;
  const pts = (g?.points ?? []).filter((q) => Number.isFinite(q[0]) && Number.isFinite(q[1]));
  const graph = g && pts.length >= 4 ? { g, pts } : null;
  const table = p.results(s, values)[0] ?? null;
  const cellNums: number[] = table ? table.rows.flatMap((r) => r.map((c) => num(String(c))).filter((x): x is number => x != null)) : [];
  const inTable = (x: number) => cellNums.some((c) => same(c, x) || Math.abs(c - x) <= 1e-6);
  const graphShownApart = !!graph && !graph.pts.every(([x, y]) => inTable(x) && inTable(y));
  const graphNums = graphShownApart ? graph!.pts.flat() : [];
  const showsAnyway = (x: number) => graphNums.some((c) => Math.abs(c - x) <= 1e-6);

  // (a) Read an instrument from its close-up.
  const asked: number[] = [];
  for (const sn of snaps) {
    if (qs.length >= 2) break;
    const st = p.steps[sn.i];
    if (st.action.type !== "record" || !st.magnify) continue;
    const it = p.layout(sn.s, sn.i).find((x) => x.id === st.magnify);
    const f = st.action.fields.find((x) => !x.options && isNumeric(x.answer(sn.s, sn.values)));
    if (!it || !f || !zoomable(it)) continue;
    const n = num(f.answer(sn.s, sn.values))!;
    if (showsAnyway(n)) continue;
    const id = `${k}.${++figN}`;
    figs.push({ id, caption: `Fig. ${id} — ${nameOf(it)}`, kind: "lens", item: it });
    qs.push({ q: intro(`${label()}  Fig. ${id} shows ${nameOf(it)}. Read and record the ${lowerFirst(f.label)}${f.unit ? `, in ${f.unit}` : ""}.`),
      kind: "typed", options: [], answer: accepted(f, sn.s, sn.values), marks: 1, fig: id });
    asked.push(n);
  }

  // (b) Complete the results table: the values worked out from the readings.
  const calcs: { label: string; unit?: string; answer: string; n: number }[] = [];
  if (table) {
    for (const sn of snaps) {
      if (calcs.length >= 2) break;
      const st = p.steps[sn.i];
      if (st.action.type !== "record" || st.magnify) continue;
      for (const f of st.action.fields) {
        if (calcs.length >= 2 || f.options) continue;
        const a = f.answer(sn.s, sn.values), n = num(a);
        if (n == null || !CALC.test(`${st.title} ${f.label}`) || !inTable(n) || showsAnyway(n) || asked.some((x) => same(x, n))) continue;
        calcs.push({ label: f.label, unit: f.unit, answer: accepted(f, sn.s, sn.values), n });
      }
    }
  }
  const hidden = [...asked, ...calcs.map((c) => c.n)];
  const blanks: [number, number][] = table ? table.rows.flatMap((r, ri) => r.map((c, ci) => [ri, ci, num(String(c))] as const)
    .filter(([, ci, v]) => ci > 0 && v != null && hidden.some((h) => Math.abs(h - v) <= 1e-6)).map(([ri, ci]) => [ri, ci] as [number, number])) : [];
  let tableId: string | null = null;
  if (table && (calcs.length || (graph && !graphShownApart))) {
    tableId = `${k}.${++tableN}`;
    figs.push({ id: `T${tableId}`, caption: `Table ${tableId} — ${table.title}`, kind: "table", table, blanks });
  }
  for (const c of calcs) {
    qs.push({ q: intro(`${label()}  Complete Table ${tableId}: work out the ${lowerFirst(c.label)}${c.unit ? `, in ${c.unit}` : ""}. Show your working.`),
      kind: "typed", options: [], answer: c.answer, marks: 2, method: true, fig: `T${tableId}` });
  }

  // (c) Plot the graph, draw the line of best fit — then its gradient.
  if (graph) {
    let gid = tableId ? `T${tableId}` : null;
    if (graphShownApart) {
      const id = `${k}.${++tableN}`;
      gid = `T${id}`;
      figs.push({ id: gid, caption: `Table ${id} — results for the graph`, kind: "table", table: { title: graph.g.title, columns: [graph.g.x, graph.g.y], rows: graph.pts.map(([x, y]) => [x, y]) }, blanks: [] });
    }
    const { m, c } = fitLine(graph.pts), curve = straightness(graph.pts) < 0.98;
    qs.push({ q: intro(`${label()}  Using the results in Table ${gid!.slice(1)}, plot a graph of ${graph.g.y} (y-axis) against ${graph.g.x} (x-axis). ${curve ? "Join the points with a smooth curve." : "Draw the straight line of best fit."}`),
      kind: "graph", options: [], answer: JSON.stringify({ p: graph.pts, m, c }), marks: curve ? 2 : 3, grid: { ...gridFor(graph.pts, graph.g.x, graph.g.y), ...(curve ? { curve: true } : {}) }, fig: gid! });
    if (!curve && Math.abs(m) > 1e-9) {
      const sig = (x: number) => Number(x.toPrecision(3));
      const lo = sig(Math.min(m * 0.88, m * 1.12)), hi = sig(Math.max(m * 0.88, m * 1.12));
      qs.push({ q: intro(`${label()}  Determine the gradient of your line. Show clearly on your working how you did this (use a large triangle).`),
        kind: "typed", options: [], answer: `${lo}..${hi}`, marks: 2, method: true });
    }
  }

  // (d) Explain and evaluate: the practical's exam-style points, as written answers.
  const ev = examFor(p.slug).filter((x) => !/^\s*-?[\d.]+\s*\S*\s*$/.test(x.right)).slice(0, 2);
  for (const x of ev) qs.push({ q: intro(`${label()}  ${x.q}`), kind: "written", options: [], answer: `${x.right}. ${x.why}`.slice(0, 400), marks: 1 });
  if (p.safety.length) qs.push({ q: intro(`${label()}  Suggest one safety precaution for this experiment, and say why it is needed.`), kind: "written", options: [], answer: `Any one: ${p.safety.join("; ")}`.slice(0, 400), marks: 1 });

  return { p, qs, figs, marks: qs.reduce((a, q) => a + q.marks, 0) };
}

// The planning question (always the last one on the paper).
export function planning(p: Practical, k: number): AtpQ {
  const aim = p.aim.replace(/^to\s+/i, "").replace(/\.$/, "");
  const needs = (NEEDS[p.slug]?.needs ?? []).slice(0, 5).join(", ");
  return {
    q: `${k}  Plan an experiment to ${lowerFirst(aim.length > 190 ? `${aim.slice(0, 187)}…` : aim)}.\n\nInclude: the apparatus; what you will change, measure and keep the same; the method, in order; a safety precaution; how you will use the results to conclude.`.slice(0, 400),
    kind: "written", options: [],
    answer: `1 mark each, max 6: apparatus${needs ? ` (e.g. ${needs})` : ""}; independent variable stated; dependent variable and how it is measured; two variables kept the same; clear method in order, with repeats/mean; a safety precaution; table/graph of results used to conclude.`.slice(0, 400),
    marks: 6,
  };
}

// The whole paper. picks: the practicals to use (the best ones are chosen otherwise).
export function buildAtp(subject: AtpSubject, o: { seed?: number; picks?: string[]; zoomable: (it: ItemView) => boolean; target?: number }): AtpPaper {
  const seed = o.seed ?? Math.floor(Math.random() * 1e9), r = seeded(seed), target = o.target ?? 40;
  const pool = ALL_PRACTICALS.filter((p) => p.subject === subject);
  const chosen = o.picks?.length ? pool.filter((p) => o.picks!.includes(p.slug)) : null;
  // Score every practical once (what kind of questions it gives), then pick.
  const scored = (chosen ?? pool).map((p) => ({ p, sec: section(p, 0, seed + p.slug.length, o.zoomable), r: r() }))
    .filter((x) => x.sec.marks >= 4)
    .sort((a, b) => (chosen ? 0 : (b.sec.qs.some((q) => q.kind === "graph") ? 1 : 0) - (a.sec.qs.some((q) => q.kind === "graph") ? 1 : 0) || b.sec.marks + 3 * b.r - (a.sec.marks + 3 * a.r)));
  const picked: Practical[] = [];
  let marks = 0;
  for (const x of scored) {
    if (picked.length >= (chosen ? chosen.length : 4) || (!chosen && marks >= target - 6 && picked.length >= 2)) break;
    picked.push(x.p); marks += x.sec.marks;
  }
  const qs: AtpQ[] = [], figs: AtpFigure[] = [];
  picked.forEach((p, i) => { const sec = section(p, i + 1, seed + p.slug.length, o.zoomable); qs.push(...sec.qs); figs.push(...sec.figs); });
  const planFrom = pool.find((p) => !picked.includes(p) && p.aim) ?? pool[0];
  if (planFrom) qs.push(planning(planFrom, picked.length + 1));
  const { label, code } = ATP_SUBJECTS[subject];
  return { title: `IGCSE ${label} (${code}) — Alternative to Practical`, subject, minutes: ATP_MINUTES, marks: qs.reduce((a, q) => a + q.marks, 0), questions: qs, figures: figs, used: picked.map((p) => p.slug) };
}

// ── A practical test (IGCSE Paper 5 style): learners do it on the bench ──
// Each practical is a "bench" question — done on the learner's own bench,
// every reading and calculation marked against their own results — then the
// questions that follow a real practical test: conclusion, method, safety.
export function buildPracticalTest(subject: AtpSubject, o: { picks?: string[]; seed?: number; count?: number } = {}): AtpPaper {
  const r = seeded(o.seed ?? Math.floor(Math.random() * 1e9));
  const pool = ALL_PRACTICALS.filter((p) => p.subject === subject && benchMarks(p) >= 3);
  const chosen = o.picks?.length ? pool.filter((p) => o.picks!.includes(p.slug))
    : [...pool].map((p) => ({ p, k: (p.graph ? 1 : 0) + r() })).sort((a, b) => b.k - a.k).slice(0, o.count ?? 2).map((x) => x.p);
  const qs: AtpQ[] = [];
  chosen.forEach((p, i) => {
    const k = i + 1;
    qs.push({ q: `${k}  ${p.title}\n\nAim: ${p.aim}\n\nDo this practical on your bench, step by step. Read every instrument carefully and record each reading in the notebook — nothing is checked as you go. Your readings and calculations are marked against your own apparatus.`.slice(0, 400),
      kind: "bench", options: [], answer: "", marks: Math.min(40, benchMarks(p)), bench: { slug: p.slug } });
    let part = 0;
    const lab = () => `${k}(${LETTERS[part++]})`;
    const ref = (() => { let s = p.init(seeded(7)), v: Record<string, string> = {}; for (const st of p.steps) ({ s, values: v } = doStep(st, s, v)); return p.conclusion(s, v); })();
    qs.push({ q: `${lab()}  Using your results, state a conclusion for this experiment.`, kind: "written", options: [], answer: `For example: ${ref}`.slice(0, 400), marks: 2 });
    for (const x of examFor(p.slug).filter((x) => !/^\s*-?[\d.]+\s*\S*\s*$/.test(x.right)).slice(0, 2)) qs.push({ q: `${lab()}  ${x.q}`, kind: "written", options: [], answer: `${x.right}. ${x.why}`.slice(0, 400), marks: 1 });
    if (p.safety.length) qs.push({ q: `${lab()}  Suggest one safety precaution you took, and say why.`, kind: "written", options: [], answer: `Any one: ${p.safety.join("; ")}`.slice(0, 400), marks: 1 });
  });
  const { label, code } = ATP_SUBJECTS[subject];
  return { title: `IGCSE ${label} (${code}) — Practical Test`, subject, minutes: chosen.length >= 3 ? 90 : chosen.length === 2 ? 60 : 45, marks: qs.reduce((a, q) => a + q.marks, 0), questions: qs, figures: [], used: chosen.map((p) => p.slug) };
}
const benchMarks = (p: Practical) => p.steps.reduce((a, st) => a + (st.action.type === "record" ? st.action.fields.length : 0), 0);
