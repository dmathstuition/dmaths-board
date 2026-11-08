// Maths practicals on the lab bench: measuring with a ruler and protractor on
// paper, rolling dice, stacking cups, filling a tin. Each one hides values the
// learner finds by measuring. Drawings on paper are in the paper's own px,
// with (0, 0) at the middle of its bottom edge (see components/lab/bench/kit/maths.tsx).
import { BENCH, SHELF, between, deg, fitLine, fix, near, num, round, type ItemView, type Practical, type Rand, type Step } from "@/lib/lab/bench/types";

export type Shape =
  | { k: "line"; x1: number; y1: number; x2: number; y2: number; c?: string; w?: number; dash?: boolean }
  | { k: "poly"; pts: number[]; fill?: string; c?: string; w?: number; dash?: boolean }
  | { k: "circle"; cx: number; cy: number; r: number; fill?: string; c?: string; w?: number }
  | { k: "rect"; x: number; y: number; w: number; h: number; fill?: string; c?: string; rx?: number }
  | { k: "path"; d: string; fill?: string; c?: string; w?: number }
  | { k: "text"; x: number; y: number; t: string; size?: number; c?: string; anchor?: "start" | "middle" | "end" }
  | { k: "dot"; x: number; y: number; c?: string; r?: number };
export type PaperZoom =
  | { type: "ruler"; a: [number, number]; b: [number, number]; len: number; title?: string }
  | { type: "protractor"; p: [number, number]; base: number; ray: number; title?: string }
  | { type: "area"; at: [number, number]; k: number; title?: string };

type Pt = { x: number; y: number };
const vals = (v: Record<string, string>, keys: string[]) => keys.map((k) => num(v[k] ?? ""));
const angOf = (p: Pt, q: Pt) => (Math.atan2(-(q.y - p.y), q.x - p.x) * 180) / Math.PI; // maths angle (y up), degrees
const between3 = (p: Pt, a: Pt, b: Pt) => { let d = Math.abs(angOf(p, a) - angOf(p, b)) % 360; if (d > 180) d = 360 - d; return d; };
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const ruler = (a: Pt, b: Pt, len: number, title?: string): PaperZoom => ({ type: "ruler", a: [a.x, a.y], b: [b.x, b.y], len, title });
const prot = (p: Pt, a: Pt, b: Pt, title?: string): PaperZoom => ({ type: "protractor", p: [p.x, p.y], base: angOf(p, a), ray: angOf(p, b), title });
const paper = (label: string, shapes: Shape[], zoom: PaperZoom | null, extra: Record<string, unknown> = {}): ItemView =>
  ({ id: "paper", kind: "paper", x: 700, y: BENCH, label, props: { w: 640, h: 330, shapes, zoom, name: "paper", ...extra } });
const pen = "#1E293B";
const seg = (a: Pt, b: Pt, c = pen, w = 2.5): Shape => ({ k: "line", x1: a.x, y1: a.y, x2: b.x, y2: b.y, c, w });
const label = (p: Pt, t: string, dx = 0, dy = 0, size = 14): Shape => ({ k: "text", x: p.x + dx, y: p.y + dy, t, size, c: pen, anchor: "middle" });

// ── Pythagoras: measure two triangles ─────────────────────────────────────
type Py = { a1: number; b1: number; a2: number; b2: number };
const PX = 20; // px per cm on paper
const triA = (s: Py) => { const P = { x: -280, y: -50 }; return { P, A: { x: P.x + s.a1 * PX, y: P.y }, B: { x: P.x, y: P.y - s.b1 * PX } }; };
const triB = (s: Py) => { const P = { x: 40, y: -50 }, t = deg(100); return { P, A: { x: P.x + s.a2 * PX, y: P.y }, B: { x: P.x + s.b2 * PX * Math.cos(t), y: P.y - s.b2 * PX * Math.sin(t) } }; };
const sides = (s: Py) => { const A = triA(s), B = triB(s); return { A: [s.a1, s.b1, dist(A.A, A.B) / PX], B: [s.a2, s.b2, dist(B.A, B.B) / PX] }; };
const PY_STEPS: Step<Py>[] = [
  ...(["A", "B"] as const).flatMap((T) => (["a", "b", "c"] as const).map((side, k): Step<Py> => ({
    id: `${T}${side}`, group: k === 0 ? `Triangle ${T}` : undefined, title: `Measure side ${side} of triangle ${T}`, how: "The close-up shows the ruler at the end of the side; it starts at 0 at the other end. Measure to the nearest mm.", magnify: "paper",
    action: { type: "record", fields: [{ key: `${T}${side}`, label: `Triangle ${T}: ${side}`, unit: "cm", check: (v, s: Py) => (near(v, sides(s)[T][k], 0.1) ? true : "Read the ruler where the side ends."), answer: (s: Py) => fix(sides(s)[T][k], 1) }] },
  }))),
  { id: "sq", group: "Test Pythagoras", title: "Work out a² + b² and c² for each triangle", how: "Square each side. If a² + b² = c², the triangle has a right angle.",
    action: { type: "record", fields: (["A", "B"] as const).flatMap((T) => [
      { key: `${T}ab`, label: `${T}: a² + b²`, unit: "cm²", check: (v: string, _s: unknown, values: Record<string, string>) => { const [a, b] = vals(values, [`${T}a`, `${T}b`]); if (a == null || b == null) return "Measure the sides first."; const w = a * a + b * b; return near(v, w, w * 0.01) ? true : "a × a + b × b."; }, answer: (_s: unknown, values: Record<string, string>) => { const [a, b] = vals(values, [`${T}a`, `${T}b`]); return fix((a ?? 0) ** 2 + (b ?? 0) ** 2, 1); } },
      { key: `${T}cc`, label: `${T}: c²`, unit: "cm²", check: (v: string, _s: unknown, values: Record<string, string>) => { const [c] = vals(values, [`${T}c`]); if (c == null) return "Measure c first."; return near(v, c * c, c * c * 0.01) ? true : "c × c."; }, answer: (_s: unknown, values: Record<string, string>) => fix((num(values[`${T}c`] ?? "") ?? 0) ** 2, 1) },
    ]) } },
  { id: "which", title: "Which triangle is right-angled?", how: "Compare a² + b² with c² for each.",
    action: { type: "record", fields: [{ key: "which", label: "Right-angled", options: ["Triangle A", "Triangle B", "Both", "Neither"], check: (v) => (v === "Triangle A" ? true : "Where is a² + b² (almost) equal to c²?"), answer: () => "Triangle A" }] } },
  { id: "check", title: "Check the corner with a protractor", how: "Measure the angle between sides a and b of triangle A.", magnify: "paper",
    action: { type: "record", fields: [{ key: "angle", label: "Angle between a and b (A)", unit: "°", check: (v) => (near(v, 90, 1) ? true : "Read the protractor along side b."), answer: () => "90" }] } },
];
const pyZoom = (s: Py, id?: string): PaperZoom | null => {
  if (!id) return null;
  const A = triA(s), B = triB(s), sd = sides(s);
  if (id === "Aa") return ruler(A.P, A.A, sd.A[0]); if (id === "Ab") return ruler(A.P, A.B, sd.A[1]); if (id === "Ac") return ruler(A.A, A.B, sd.A[2]);
  if (id === "Ba") return ruler(B.P, B.A, sd.B[0]); if (id === "Bb") return ruler(B.P, B.B, sd.B[1]); if (id === "Bc") return ruler(B.A, B.B, sd.B[2]);
  if (id === "check") return prot(A.P, A.A, A.B);
  return null;
};
export const pythagoras: Practical<Py> = {
  slug: "pythagoras", title: "Pythagoras: which corner is square?", subject: "maths",
  aim: "Measure the sides of two triangles with a ruler and use Pythagoras' theorem to find which one has a right angle.",
  safety: ["Keep the ruler's 0 exactly on the end of each side."],
  init: (r) => ({ a1: between(r, 5, 8, 1), b1: between(r, 6, 9, 1), a2: between(r, 6, 9, 1), b2: between(r, 5, 8, 1) }),
  layout: (s, step) => {
    const A = triA(s), B = triB(s);
    const shapes: Shape[] = [
      { k: "poly", pts: [A.P.x, A.P.y, A.A.x, A.A.y, A.B.x, A.B.y], fill: "#DBEAFE", c: pen, w: 2.5 },
      { k: "poly", pts: [B.P.x, B.P.y, B.A.x, B.A.y, B.B.x, B.B.y], fill: "#FCE7F3", c: pen, w: 2.5 },
      label({ x: (A.P.x + A.A.x) / 2, y: A.P.y }, "a", 0, 20), label({ x: A.P.x, y: (A.P.y + A.B.y) / 2 }, "b", -14, 0), label({ x: (A.A.x + A.B.x) / 2, y: (A.A.y + A.B.y) / 2 }, "c", 14, -6),
      label({ x: (B.P.x + B.A.x) / 2, y: B.P.y }, "a", 0, 20), label({ x: (B.P.x + B.B.x) / 2, y: (B.P.y + B.B.y) / 2 }, "b", -14, 0), label({ x: (B.A.x + B.B.x) / 2, y: (B.A.y + B.B.y) / 2 }, "c", 14, -6),
      label({ x: (A.P.x + A.A.x + A.B.x) / 3, y: (A.P.y + A.A.y + A.B.y) / 3 + 8 }, "A", 0, 0, 22), label({ x: (B.P.x + B.A.x + B.B.x) / 3, y: (B.P.y + B.A.y + B.B.y) / 3 + 8 }, "B", 0, 0, 22),
    ];
    return [paper("Two triangles drawn on paper", shapes, pyZoom(s, PY_STEPS[step]?.id))];
  },
  steps: PY_STEPS,
  results: (_s, v) => [{ title: "Results", columns: ["", "a / cm", "b / cm", "c / cm", "a² + b²", "c²"], rows: (["A", "B"] as const).map((T) => [`Triangle ${T}`, v[`${T}a`] ?? "—", v[`${T}b`] ?? "—", v[`${T}c`] ?? "—", v[`${T}ab`] ?? "—", v[`${T}cc`] ?? "—"]) }],
  conclusion: () => "In triangle A, a² + b² = c² (to within measuring error), so it has a right angle — and the protractor shows 90°. In triangle B, c² is bigger than a² + b², so its angle is more than 90°.",
};

// ── Statistics: leaf lengths ───────────────────────────────────────────────
type St = { L: number[]; rest: boolean };
const leafAt = (i: number) => ({ x: i % 2 ? 160 : -160, y: -290 + Math.floor(i / 2) * 60 });
const leafPts = (s: St, i: number) => { const c = leafAt(i), h = (s.L[i] * PX) / 2; return { a: { x: c.x - h, y: c.y }, b: { x: c.x + h, y: c.y } }; };
const allLeaves = (s: St, v: Record<string, string>) => s.L.map((L, i) => (i < 3 ? num(v[`L${i}`] ?? "") : s.rest ? L : null));
const leafNums = (s: St, v: Record<string, string>) => allLeaves(s, v).filter((x): x is number => x != null);
const median = (xs: number[]) => { const a = [...xs].sort((p, q) => p - q), m = a.length / 2; return a.length % 2 ? a[Math.floor(m)] : (a[m - 1] + a[m]) / 2; };
const ST_STEPS: Step<St>[] = [
  ...[0, 1, 2].map((i): Step<St> => ({ id: `L${i}`, group: i === 0 ? "Measure" : undefined, title: `Measure leaf ${i + 1}`, how: "Measure from tip to tip (not the stalk), to the nearest mm.", magnify: "paper",
    action: { type: "record", fields: [{ key: `L${i}`, label: `Leaf ${i + 1}`, unit: "cm", check: (v, s: St) => (near(v, s.L[i], 0.05) ? true : "Read the ruler at the leaf's tip."), answer: (s: St) => fix(s.L[i], 1) }] } })),
  { id: "rest", title: "Measure the other 7 leaves", how: "They go in your results table.", action: { type: "wait", label: "Measure the rest", minutes: 0 }, tick: (s) => ({ ...s, rest: true }), finished: (s) => s.rest },
  { id: "avg", group: "Averages", title: "Work out the mean, median and range", how: "Mean = total ÷ 10. Median = middle value (put them in order; with 10 values, it's halfway between the 5th and 6th). Range = biggest − smallest.",
    action: { type: "record", fields: [
      { key: "mean", label: "Mean", unit: "cm", check: (v, s: St, values) => { const xs = leafNums(s, values); const m = xs.reduce((a, b) => a + b, 0) / xs.length; return near(v, m, 0.05) ? true : "Add all 10 lengths and divide by 10."; }, answer: (s: St, values) => { const xs = leafNums(s, values); return fix(xs.reduce((a, b) => a + b, 0) / xs.length, 2); } },
      { key: "median", label: "Median", unit: "cm", check: (v, s: St, values) => (near(v, median(leafNums(s, values)), 0.05) ? true : "Order them and find the middle."), answer: (s: St, values) => fix(median(leafNums(s, values)), 2) },
      { key: "range", label: "Range", unit: "cm", check: (v, s: St, values) => { const xs = leafNums(s, values); return near(v, Math.max(...xs) - Math.min(...xs), 0.05) ? true : "Biggest − smallest."; }, answer: (s: St, values) => { const xs = leafNums(s, values); return fix(Math.max(...xs) - Math.min(...xs), 1); } },
    ] } },
];
export const statistics: Practical<St> = {
  slug: "statistics", title: "Averages: measuring leaves", subject: "maths",
  aim: "Measure the lengths of 10 leaves and work out the mean, median and range.",
  safety: ["Measure every leaf the same way — tip to tip, without the stalk."],
  init: (r) => ({ L: Array.from({ length: 10 }, () => between(r, 4, 9, 1)), rest: false }),
  layout: (s, step) => {
    const shapes: Shape[] = s.L.flatMap((L, i): Shape[] => { const { a, b } = leafPts(s, i), w = L * 2.2;
      return [{ k: "path", d: `M${a.x},${a.y} Q${(a.x + b.x) / 2},${a.y - w * 2} ${b.x},${b.y} Q${(a.x + b.x) / 2},${a.y + w * 2} ${a.x},${a.y} Z`, fill: "#4ADE80", c: "#15803D", w: 1.5 },
        seg(a, b, "#15803D", 1.2), seg(b, { x: b.x + 14, y: b.y + 3 }, "#15803D", 2.5), label({ x: a.x - 16, y: a.y + 5 }, String(i + 1), 0, 0, 12)]; });
    const id = ST_STEPS[step]?.id, i = id && /^L\d$/.test(id) ? Number(id[1]) : -1;
    return [paper("10 leaves", shapes, i >= 0 ? ruler(leafPts(s, i).a, leafPts(s, i).b, s.L[i]) : null)];
  },
  steps: ST_STEPS,
  results: (s, v) => [{ title: "Leaf lengths / cm", columns: ["Leaf", "Length / cm"], rows: allLeaves(s, v).map((L, i) => [String(i + 1), L != null ? fix(L, 1) : "—"]) }],
  conclusion: (_s, v) => `Mean ${v.mean ?? "…"} cm, median ${v.median ?? "…"} cm, range ${v.range ?? "…"} cm. The mean uses every value; the median isn't pulled about by one very long or short leaf; the range shows how spread out they are.`,
};

// ── Transformations with tracing paper ─────────────────────────────────────
type Tf = { bx: number; by: number; u: number; v: number; dx: number; dy: number; mode: "none" | "move" | "flip" | "turn"; rot: number };
const U = 20, O = { x: 0, y: -165 };
const gp = (x: number, y: number) => ({ x: O.x + x * U, y: O.y - y * U });
const tri = (s: Tf) => [[s.bx, s.by], [s.bx + 3, s.by], [s.bx, s.by + 2]] as [number, number][];
const image = (s: Tf): [number, number][] => tri(s).map(([x, y]) => (s.mode === "move" ? [x + s.dx, y + s.dy] : s.mode === "flip" ? [-x, y] : s.mode === "turn" ? [Math.round(x * Math.cos(deg(s.rot)) - y * Math.sin(deg(s.rot))), Math.round(x * Math.sin(deg(s.rot)) + y * Math.cos(deg(s.rot)))] : [x, y]));
const coordField = (key: string, label: string, want: (s: Tf) => [number, number]) => [
  { key: `${key}x`, label: `${label}: x`, check: (v: string, s: Tf) => (near(v, want(s)[0], 0) ? true : "Count squares across from the y-axis."), answer: (s: Tf) => String(want(s)[0]) },
  { key: `${key}y`, label: `${label}: y`, check: (v: string, s: Tf) => (near(v, want(s)[1], 0) ? true : "Count squares up (or down) from the x-axis."), answer: (s: Tf) => String(want(s)[1]) },
];
export const transformations: Practical<Tf> = {
  slug: "transformations", title: "Transformations with tracing paper", subject: "maths",
  aim: "Use tracing paper to translate, reflect and rotate a triangle on a grid, and find where its corners go.",
  safety: ["Hold the tracing paper still at the centre of rotation with a pencil point."],
  init: (r) => ({ bx: 1 + Math.floor(r() * 4), by: 1 + Math.floor(r() * 3), u: -3 - Math.floor(r() * 4), v: -2 - Math.floor(r() * 3), dx: 0, dy: 0, mode: "none", rot: 0 }),
  layout: (s, step) => {
    const shapes: Shape[] = [];
    const A = tri(s).map(([x, y]) => gp(x, y)), I = image(s).map(([x, y]) => gp(x, y));
    const reading = { t1: 0, r1: 1, r2: 2 }[TF_IDS[step] as "t1" | "r1" | "r2"];
    if (reading != null && s.mode !== "none") { const q = I[reading]; shapes.push({ k: "line", x1: q.x, y1: q.y, x2: q.x, y2: O.y, c: "#B91C1C", w: 1.2, dash: true }, { k: "line", x1: q.x, y1: q.y, x2: O.x, y2: q.y, c: "#B91C1C", w: 1.2, dash: true }); }
    shapes.push({ k: "poly", pts: A.flatMap((p) => [p.x, p.y]), fill: "#93C5FD", c: "#1D4ED8", w: 2 }, label(gp(s.bx + 1, s.by + 0.6), "A", 0, 0, 13));
    shapes.push({ k: "text", x: A[0].x - 8, y: A[0].y + 14, t: "P", size: 12, c: "#1D4ED8" }, { k: "text", x: A[1].x + 8, y: A[1].y + 14, t: "Q", size: 12, c: "#1D4ED8" }, { k: "text", x: A[2].x - 10, y: A[2].y - 4, t: "R", size: 12, c: "#1D4ED8" });
    if (s.mode !== "none") {
      shapes.push({ k: "poly", pts: I.flatMap((p) => [p.x, p.y]), fill: "#FCA5A5", c: "#B91C1C", w: 2, dash: true });
      ["P′", "Q′", "R′"].forEach((t, k) => shapes.push({ k: "dot", x: I[k].x, y: I[k].y, c: "#B91C1C", r: 3.5 }, { k: "text", x: I[k].x + 10, y: I[k].y - 6, t, size: 12, c: "#B91C1C" }));
    }
    if (s.mode === "flip") shapes.push({ k: "line", x1: O.x, y1: -320, x2: O.x, y2: -10, c: "#7C3AED", w: 2.5, dash: true });
    return [paper("Grid paper with tracing paper on top", shapes, null, { grid: { unit: U, ox: O.x, oy: O.y, nx: 15, ny: 7 } })];
  },
  steps: [
    { id: "dx", group: "Translation", title: "Slide the tracing paper across", how: "Trace triangle A. Slide the tracing paper so every corner moves the same way: first across…",
      action: { type: "set", item: "paper", label: "Across (x)", min: -10, max: 10, step: 1, unit: "squares", target: 0, tolerance: 0, targetOf: (s: Tf) => s.u, hint: "Check the vector: how many squares across?" }, apply: (s, v) => ({ ...s, mode: "move", dx: v ?? s.u, dy: 0 }) },
    { id: "dy", title: "…then up or down", how: "Now slide it up or down.",
      action: { type: "set", item: "paper", label: "Up/down (y)", min: -10, max: 10, step: 1, unit: "squares", target: 0, tolerance: 0, targetOf: (s: Tf) => s.v, hint: "Check the vector: how many squares up or down?" }, apply: (s, v) => ({ ...s, mode: "move", dy: v ?? s.v }) },
    { id: "t1", title: "Where did P go?", how: "Read the coordinates of P′ from the grid.",
      action: { type: "record", fields: coordField("t", "P′", (s) => [s.bx + s.u, s.by + s.v]) } },
    { id: "flip", group: "Reflection", title: "Reflect A in the y-axis", how: "Trace A and the y-axis, then turn the tracing paper over, keeping the y-axis on top of itself.",
      action: { type: "tap", item: "paper", label: "Flip the tracing paper" }, apply: (s) => ({ ...s, mode: "flip" }) },
    { id: "r1", title: "Where did Q go?", how: "Read the coordinates of Q′.", action: { type: "record", fields: coordField("f", "Q′", (s) => [-(s.bx + 3), s.by]) } },
    { id: "turn", group: "Rotation", title: "Rotate A 90° anticlockwise about O", how: "Pin the tracing paper at the origin O with your pencil and turn it.",
      action: { type: "set", item: "paper", label: "Turn (anticlockwise)", min: 0, max: 270, step: 15, unit: "°", target: 90, tolerance: 0 }, apply: (s, v) => ({ ...s, mode: "turn", rot: v ?? 90 }) },
    { id: "r2", title: "Where did R go?", how: "Read the coordinates of R′.", action: { type: "record", fields: coordField("o", "R′", (s) => [-(s.by + 2), s.bx]) } },
    { id: "rule", group: "Rule", title: "Spot the rule for the rotation", how: "Compare R and R′.",
      action: { type: "record", fields: [{ key: "rule", label: "90° anticlockwise about O takes (x, y) to", options: ["(−y, x)", "(y, −x)", "(−x, y)", "(x, −y)"], check: (v) => (v === "(−y, x)" ? true : "R was at (x, y); where is R′?"), answer: () => "(−y, x)" }] } },
  ],
  results: (s, v) => [{ title: "Results", columns: ["Transformation", "Corner", "Image"], rows: [/*tf*/
    [`Translation (${s.u}, ${s.v})`, `P (${s.bx}, ${s.by})`, v.tx != null ? `(${v.tx}, ${v.ty})` : "—"],
    ["Reflection in the y-axis", `Q (${s.bx + 3}, ${s.by})`, v.fx != null ? `(${v.fx}, ${v.fy})` : "—"],
    ["Rotation 90° about O", `R (${s.bx}, ${s.by + 2})`, v.ox != null ? `(${v.ox}, ${v.oy})` : "—"],
  ] }],
  conclusion: () => "A translation moves every point by the same vector; a reflection in the y-axis changes the sign of x; a rotation of 90° anticlockwise about O takes (x, y) to (−y, x). In all three the image is the same size and shape (congruent).",
};

const TF_IDS = ["dx", "dy", "t1", "flip", "r1", "turn", "r2", "rule"];

// ── Quadratics: the biggest rectangle from 40 cm of string ────────────────
type Qd = { w: number };
const WIDTHS = [3, 6, 10, 14, 17];
const QPX = 12, QC = { x: -250, y: -40 };
const qdPts = (v: Record<string, string>) => WIDTHS.map((w, i) => [w, num(v[`A${i}`] ?? "")] as const).filter((p): p is readonly [number, number] => p[1] != null).map(([w, A]) => [w, A] as [number, number]);
export const quadratics: Practical<Qd> = {
  slug: "quadratics", title: "Quadratics: the biggest rectangle", subject: "maths",
  aim: "Make rectangles from a 40 cm loop of string round four pins, measure them, and find the width that gives the biggest area.",
  safety: ["Push the pins in firmly, and keep the loop tight."],
  init: () => ({ w: 8 }),
  layout: (s, step) => {
    const l = 20 - s.w, a = QC, b = { x: a.x + s.w * QPX, y: a.y }, c = { x: b.x, y: a.y - l * QPX }, d = { x: a.x, y: c.y };
    const shapes: Shape[] = [
      { k: "poly", pts: [a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y], fill: "#FEF3C7", c: "#DC2626", w: 3 },
      ...[a, b, c, d].map((p): Shape => ({ k: "circle", cx: p.x, cy: p.y, r: 6, fill: "#2563EB", c: "#1E3A8A", w: 1.5 })),
      label({ x: (a.x + b.x) / 2, y: a.y }, `${s.w} cm`, 0, 22, 13), label(b, "?", 18, -l * QPX / 2, 16),
      { k: "text", x: 120, y: -280, t: "String loop: 40 cm", size: 15, c: pen, anchor: "middle" },
      { k: "text", x: 120, y: -255, t: "(perimeter of the rectangle)", size: 12, c: "#475569", anchor: "middle" },
    ];
    const rec = /^r\d$/.test(QD_STEPS[step]?.id ?? "");
    return [paper("Cork board, pins and a loop of string", shapes, rec ? ruler(b, c, l) : null, { style: "cork" })];
  },
  steps: [] as Step<Qd>[],
  results: (_s, v) => [{ title: "Results", columns: ["Width / cm", "Length / cm", "Area / cm²"], rows: WIDTHS.map((w, i) => [String(w), v[`l${i}`] ?? "—", v[`A${i}`] ?? "—"]) }],
  graph: (_s, v) => { const points = qdPts(v); return points.length ? { title: "Area against width", x: "width / cm", y: "area / cm²", points } : null; },
  conclusion: () => "Area = w × (20 − w), a quadratic: the graph is a parabola that is highest in the middle. The biggest area, 100 cm², comes from a width of 10 cm — a square.",
};
const QD_STEPS: Step<Qd>[] = [
  ...WIDTHS.flatMap((w, i): Step<Qd>[] => [
    { id: `w${i}`, group: i === 0 ? "Make rectangles" : undefined, title: `Make the rectangle ${w} cm wide`, how: "Move the two right-hand pins. The string keeps the perimeter at 40 cm.",
      action: { type: "set", item: "paper", label: "Width", min: 1, max: 19, step: 1, unit: "cm", target: w, tolerance: 0, start: 8 }, apply: (s, v) => ({ ...s, w: v ?? w }) },
    { id: `r${i}`, title: "Measure the other side and work out the area", how: "Measure the side marked ?, then area = width × length.", magnify: "paper",
      action: { type: "record", fields: [
        { key: `l${i}`, label: `Length (width ${w} cm)`, unit: "cm", check: (v) => (near(v, 20 - w, 0.05) ? true : "Read the ruler at the top pin."), answer: () => String(20 - w) },
        { key: `A${i}`, label: `Area (width ${w} cm)`, unit: "cm²", check: (v, _s, values) => { const l = num(values[`l${i}`] ?? ""); return l != null && near(v, w * l, 0.01) ? true : "Width × length."; }, answer: (_s, values) => fix(w * (num(values[`l${i}`] ?? "") ?? 0), 0) },
      ] } },
  ]),
  { id: "max", group: "The biggest area", title: "Find the biggest area", how: "Look at your table and graph.",
    action: { type: "record", fields: [
      { key: "maxA", label: "Biggest area you found", unit: "cm²", check: (v, _s, values) => { const m = Math.max(...qdPts(values).map((p) => p[1])); return near(v, m, 0.5) ? true : "The largest area in your table."; }, answer: (_s, values) => String(Math.max(...qdPts(values).map((p) => p[1]))) },
      { key: "shape", label: "The biggest rectangle is a", options: ["square", "long thin rectangle", "any rectangle — they're all the same"], check: (v) => (v === "square" ? true : "Look at its width and length."), answer: () => "square" },
    ] } },
];
quadratics.steps = QD_STEPS;

// ── Unit circle: a turning wheel ───────────────────────────────────────────
type Uc = { th: number };
const ANG = [30, 90, 150, 210, 270, 330];
const WPX = 12, WC = { x: -120, y: -20 - 15 * WPX }, GROUND = -20, RULE_X = 150;
const height = (th: number) => round(15 + 10 * Math.sin(deg(th)), 1);
const ucPts = (v: Record<string, string>) => ANG.map((a, i) => [a, num(v[`h${i}`] ?? "")] as const).filter((p): p is readonly [number, number] => p[1] != null).map(([a, h]) => [a, h] as [number, number]);
const UC_STEPS: Step<Uc>[] = [
  ...ANG.flatMap((a, i): Step<Uc>[] => [
    { id: `t${i}`, group: i === 0 ? "Turn the wheel" : undefined, title: `Turn the wheel to ${a}°`, how: "Turn it anticlockwise from the start line (the red dot level with the axle, on the right).",
      action: { type: "set", item: "paper", label: "Angle turned", min: 0, max: 360, step: 15, unit: "°", target: a, tolerance: 0, start: 0 }, apply: (s, v) => ({ ...s, th: v ?? a }) },
    { id: `h${i}`, title: `Measure the dot's height (${a}°)`, how: "Read the ruler level with the red dot — its height above the ground. Then work out sin θ = (height − 15) ÷ 10 (the axle is 15 cm up; the radius is 10 cm).", magnify: "paper",
      action: { type: "record", fields: [
        { key: `h${i}`, label: `Height at ${a}°`, unit: "cm", check: (v) => (near(v, height(a), 0.1) ? true : "Read the ruler level with the dot."), answer: () => fix(height(a), 1) },
        { key: `s${i}`, label: `sin ${a}°`, check: (v, _s, values) => { const h = num(values[`h${i}`] ?? ""); return h != null && near(v, (h - 15) / 10, 0.02) ? true : "(height − 15) ÷ 10."; }, answer: (_s, values) => fix(((num(values[`h${i}`] ?? "") ?? 15) - 15) / 10, 2) },
      ] } },
  ]),
  { id: "shape", group: "Conclusion", title: "What shape is the graph?", how: "Look at the graph of height against angle.",
    action: { type: "record", fields: [{ key: "shape", label: "The height follows", options: ["a sine curve: h = 15 + 10 sin θ", "a straight line", "a circle"], check: (v) => (v === "a sine curve: h = 15 + 10 sin θ" ? true : "Up, down, and back again…"), answer: () => "a sine curve: h = 15 + 10 sin θ" }] } },
];
export const unitCircle: Practical<Uc> = {
  slug: "unit-circle", title: "Sine from a turning wheel", subject: "maths",
  aim: "Turn a wheel of radius 10 cm, measure the height of a dot on its rim at different angles, and see the sine curve appear.",
  safety: ["Keep fingers out of the spokes."],
  init: () => ({ th: 0 }),
  layout: (s, step) => {
    const R = 10 * WPX, D = { x: WC.x + R * Math.cos(deg(s.th)), y: WC.y - R * Math.sin(deg(s.th)) };
    const shapes: Shape[] = [
      seg({ x: -300, y: GROUND }, { x: 300, y: GROUND }, "#475569", 3),
      { k: "line", x1: WC.x, y1: WC.y, x2: WC.x - 50, y2: GROUND, c: "#64748B", w: 6 }, { k: "line", x1: WC.x, y1: WC.y, x2: WC.x + 50, y2: GROUND, c: "#64748B", w: 6 },
      { k: "circle", cx: WC.x, cy: WC.y, r: R, c: "#1F2937", w: 8 },
      ...[0, 60, 120, 180, 240, 300].map((k): Shape => ({ k: "line", x1: WC.x, y1: WC.y, x2: WC.x + R * Math.cos(deg(k + s.th)), y2: WC.y - R * Math.sin(deg(k + s.th)), c: "#94A3B8", w: 1.5 })),
      { k: "line", x1: WC.x, y1: WC.y, x2: WC.x + R + 30, y2: WC.y, c: "#94A3B8", w: 1, dash: true },
      { k: "circle", cx: WC.x, cy: WC.y, r: 6, fill: "#1F2937" },
      { k: "line", x1: D.x, y1: D.y, x2: RULE_X, y2: D.y, c: "#DC2626", w: 1.5, dash: true },
      { k: "circle", cx: D.x, cy: D.y, r: 7, fill: "#DC2626" },
      { k: "rect", x: RULE_X, y: GROUND - 300, w: 22, h: 300, fill: "#F1E3BC", c: "#C8B07A" },
      ...Array.from({ length: 26 }, (_, c): Shape => ({ k: "line", x1: RULE_X, y1: GROUND - c * WPX, x2: RULE_X + (c % 5 ? 6 : 12), y2: GROUND - c * WPX, c: "#5B4A26", w: 1 })),
      ...[0, 5, 10, 15, 20, 25].map((c): Shape => ({ k: "text", x: RULE_X + 36, y: GROUND - c * WPX + 4, t: String(c), size: 11, c: pen, anchor: "middle" })),
      { k: "text", x: -300, y: -310, t: "Axle 15 cm above the ground · radius 10 cm", size: 12, c: "#475569", anchor: "start" },
    ];
    const id = UC_STEPS[step]?.id, zoom = id && /^h\d$/.test(id) ? ruler({ x: RULE_X, y: GROUND }, { x: RULE_X, y: D.y }, height(s.th), "Close-up · the ruler level with the dot") : null;
    return [paper("A wheel with a red dot, and a ruler", shapes, zoom, { style: "board" })];
  },
  steps: UC_STEPS,
  results: (_s, v) => [{ title: "Results", columns: ["θ / °", "Height / cm", "sin θ"], rows: ANG.map((a, i) => [String(a), v[`h${i}`] ?? "—", v[`s${i}`] ?? "—"]) }],
  graph: (_s, v) => { const points = ucPts(v); return points.length ? { title: "Height against angle", x: "angle / °", y: "height / cm", points } : null; },
  conclusion: () => "The dot's height above the axle is 10 sin θ, so the height goes up and down in a sine curve: sin θ is positive for 0°–180° and negative for 180°–360°, biggest (1) at 90° and smallest (−1) at 270°.",
};

// ── Circle theorems with a protractor ──────────────────────────────────────
type Ct = { phi: number; c1: number; c2: number; d: number; moved: boolean };
const C1 = { x: -150, y: -165 }, CR = 120, C2 = { x: 170, y: -165 }, CR2 = 110;
const onC = (c: Pt, r: number, a: number) => ({ x: c.x + r * Math.cos(deg(a)), y: c.y - r * Math.sin(deg(a)) });
const ctPts = (s: Ct) => ({ A: onC(C1, CR, 270 - s.phi / 2), B: onC(C1, CR, 270 + s.phi / 2), C: onC(C1, CR, s.moved ? s.c2 : s.c1), P: onC(C2, CR2, 180), Q: onC(C2, CR2, 0), D: onC(C2, CR2, s.d) });
const CT_STEPS: Step<Ct>[] = [
  { id: "c1", group: "Centre and circumference", title: "Measure angle AOB at the centre", how: "Put the protractor's centre on O and its zero line along OA.", magnify: "paper",
    action: { type: "record", fields: [{ key: "aob", label: "Angle AOB", unit: "°", check: (v, s: Ct) => (near(v, s.phi, 1) ? true : "Read the scale that starts at 0 on OA."), answer: (s: Ct) => String(s.phi) }] } },
  { id: "c2", title: "Measure angle ACB at the circumference", how: "Now put the protractor on C, zero line along CA.", magnify: "paper",
    action: { type: "record", fields: [{ key: "acb", label: "Angle ACB", unit: "°", check: (v, s: Ct) => (near(v, s.phi / 2, 1) ? true : "Read the angle between CA and CB."), answer: (s: Ct) => String(s.phi / 2) }] } },
  { id: "move", title: "Move C to another point on the circle", how: "Draw a new point C on the big arc, joined to A and B.", action: { type: "tap", item: "paper", label: "Move C" }, apply: (s) => ({ ...s, moved: true }) },
  { id: "c3", title: "Measure angle ACB again", how: "Measure the angle at the new C.", magnify: "paper",
    action: { type: "record", fields: [{ key: "acb2", label: "Angle ACB (new C)", unit: "°", check: (v, s: Ct) => (near(v, s.phi / 2, 1) ? true : "Read the angle between CA and CB."), answer: (s: Ct) => String(s.phi / 2) }] } },
  { id: "rule1", title: "What do you notice?", how: "Compare the angle at the centre with the angles at the circumference.",
    action: { type: "record", fields: [{ key: "rule1", label: "The angle at the centre is", options: ["twice the angle at the circumference", "equal to the angle at the circumference", "half the angle at the circumference"], check: (v) => (v === "twice the angle at the circumference" ? true : "Compare your numbers."), answer: () => "twice the angle at the circumference" }] } },
  { id: "semi", group: "Semicircle", title: "Measure angle PDQ in the semicircle", how: "PQ is a diameter of the second circle. Measure the angle at D.", magnify: "paper",
    action: { type: "record", fields: [{ key: "pdq", label: "Angle PDQ", unit: "°", check: (v) => (near(v, 90, 1) ? true : "Read the angle between DP and DQ."), answer: () => "90" }] } },
  { id: "rule2", title: "The angle in a semicircle", how: "Would it change if D moved?",
    action: { type: "record", fields: [{ key: "rule2", label: "The angle in a semicircle is", options: ["always 90°", "always 45°", "different for each D"], check: (v) => (v === "always 90°" ? true : "It's half the angle at the centre — and that's 180°."), answer: () => "always 90°" }] } },
];
export const circleTheorems: Practical<Ct> = {
  slug: "circle-theorems", title: "Circle theorems with a protractor", subject: "maths",
  aim: "Measure angles in circles with a protractor to discover two circle theorems.",
  safety: ["Line the protractor's zero line up exactly along one arm of the angle."],
  init: (r) => ({ phi: 2 * Math.round(between(r, 35, 70, 0)), c1: Math.round(between(r, 60, 80, 0)), c2: Math.round(between(r, 110, 130, 0)), d: Math.round(between(r, 55, 125, 0)), moved: false }),
  layout: (s, step) => {
    const { A, B, C, P, Q, D } = ctPts(s);
    const shapes: Shape[] = [
      { k: "circle", cx: C1.x, cy: C1.y, r: CR, c: pen, w: 2 }, { k: "circle", cx: C2.x, cy: C2.y, r: CR2, c: pen, w: 2 },
      seg(A, C1, "#2563EB"), seg(B, C1, "#2563EB"), seg(A, C, "#DC2626"), seg(B, C, "#DC2626"),
      seg(P, Q, pen), seg(P, D, "#16A34A"), seg(Q, D, "#16A34A"),
      { k: "dot", x: C1.x, y: C1.y }, { k: "dot", x: C2.x, y: C2.y },
      label(C1, "O", 14, -6), label(A, "A", -12, 14), label(B, "B", 12, 14), label(C, "C", 0, -12),
      label(P, "P", -14, 4), label(Q, "Q", 14, 4), label(D, "D", 0, -12),
    ];
    const id = CT_STEPS[step]?.id;
    const zoom = id === "c1" ? prot(C1, A, B) : id === "c2" || id === "c3" ? prot(C, A, B) : id === "semi" ? prot(D, P, Q) : null;
    return [paper("Circles drawn with compasses", shapes, zoom)];
  },
  steps: CT_STEPS,
  results: (_s, v) => [{ title: "Results", columns: ["Angle", "Measured / °"], rows: [["AOB (centre)", v.aob ?? "—"], ["ACB (circumference)", v.acb ?? "—"], ["ACB (new C)", v.acb2 ?? "—"], ["PDQ (semicircle)", v.pdq ?? "—"]] }],
  conclusion: () => "The angle at the centre is twice the angle at the circumference standing on the same arc, wherever C is. So the angle in a semicircle is half of 180°: always 90°.",
};

// ── Fractions: folding a paper strip ───────────────────────────────────────
type Fr = { L: number; n: number; k: number };
const FPX = 13;
const frStrip = (s: Fr) => ({ x0: (-s.L * FPX) / 2, y: -190, h: 54 });
const FOLDS: [number, number][] = [[4, 3], [8, 6], [3, 2], [6, 5]];
const FR_STEPS: Step<Fr>[] = [
  ...FOLDS.flatMap(([n, k], i): Step<Fr>[] => [
    { id: `f${i}`, group: i === 0 ? "Fold and measure" : undefined, title: `Fold the strip into ${n} equal parts and shade ${k}`, how: n === 8 ? "Fold it in half, in half again, and again." : n === 3 ? "Fold it into three, like a letter." : n === 6 ? "Fold it into three, then in half." : "Fold it in half, and in half again.",
      action: { type: "tap", item: "paper", label: `Fold into ${n}` }, apply: (s) => ({ ...s, n, k }) },
    { id: `m${i}`, title: `Measure ${k}/${n} of the strip`, how: "Measure from the left end to the end of the shaded part.", magnify: "paper",
      action: { type: "record", fields: [{ key: `m${i}`, label: `${k}/${n} of the strip`, unit: "cm", check: (v, s: Fr) => (near(v, (s.L * k) / n, 0.05) ? true : "Read the ruler at the end of the shading."), answer: (s: Fr) => fix((s.L * k) / n, 1) }] } },
  ]),
  { id: "cmp", group: "Compare", title: "Compare the fractions", how: "Use your measurements.",
    action: { type: "record", fields: [
      { key: "eq", label: "3/4 and 6/8 are", options: ["equivalent (the same size)", "different sizes"], check: (v) => (v === "equivalent (the same size)" ? true : "Compare their lengths."), answer: () => "equivalent (the same size)" },
      { key: "big", label: "Which is bigger?", options: ["3/4", "2/3", "They're the same"], check: (v) => (v === "3/4" ? true : "Which shading was longer?"), answer: () => "3/4" },
      { key: "dec", label: "5/6 as a decimal", check: (v) => (near(v, 5 / 6, 0.01) ? true : "5 ÷ 6."), answer: () => "0.83" },
    ] } },
];
export const fractions: Practical<Fr> = {
  slug: "fractions", title: "Fractions: folding a paper strip", subject: "maths",
  aim: "Fold a paper strip into equal parts, measure fractions of it, and compare and find equivalent fractions.",
  safety: ["Crease each fold firmly so the parts are equal."],
  init: (r) => ({ L: [24, 30, 36][Math.floor(r() * 3) % 3], n: 1, k: 0 }),
  layout: (s, step) => {
    const { x0, y, h } = frStrip(s), W = s.L * FPX;
    const shapes: Shape[] = [
      { k: "rect", x: x0, y: y - h, w: (W * s.k) / s.n, h, fill: "#FCD34D" },
      { k: "rect", x: x0, y: y - h, w: W, h, c: pen },
      ...Array.from({ length: s.n - 1 }, (_, j): Shape => ({ k: "line", x1: x0 + (W * (j + 1)) / s.n, y1: y - h, x2: x0 + (W * (j + 1)) / s.n, y2: y, c: "#64748B", w: 1.5, dash: true })),
      { k: "text", x: 0, y: y + 30, t: `Strip: ${s.L} cm long`, size: 14, c: pen, anchor: "middle" },
    ];
    const id = FR_STEPS[step]?.id, zoom = id && /^m\d$/.test(id) ? ruler({ x: x0, y }, { x: x0 + (W * s.k) / s.n, y }, (s.L * s.k) / s.n) : null;
    return [paper("A paper strip", shapes, zoom)];
  },
  steps: FR_STEPS,
  results: (_s, v) => [{ title: "Results", columns: ["Fraction", "Length / cm"], rows: FOLDS.map(([n, k], i) => [`${k}/${n}`, v[`m${i}`] ?? "—"]) }],
  conclusion: (s) => `3/4 and 6/8 of the strip are both ${fix((s.L * 3) / 4, 1)} cm: they're equivalent fractions. 3/4 (${fix((s.L * 3) / 4, 1)} cm) is bigger than 2/3 (${fix((s.L * 2) / 3, 1)} cm).`,
};

// ── Angles in a polygon ────────────────────────────────────────────────────
type Pg = { pts: Pt[] };
const interior = (s: Pg, i: number) => { const n = s.pts.length; return between3(s.pts[i], s.pts[(i + n - 1) % n], s.pts[(i + 1) % n]); };
function pentagon(r: Rand): Pt[] {
  for (let tries = 0; tries < 50; tries++) {
    const pts = Array.from({ length: 5 }, (_, i) => { const a = 90 + i * 72 + (r() - 0.5) * 24, rr = between(r, 100, 140, 0); return { x: rr * Math.cos(deg(a)), y: -170 - rr * Math.sin(deg(a)) }; });
    const ok = pts.every((_, i) => { const a = pts[(i + 4) % 5], b = pts[i], c = pts[(i + 1) % 5]; return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) < 0; });
    if (ok) return pts;
  }
  return Array.from({ length: 5 }, (_, i) => ({ x: 120 * Math.cos(deg(90 + i * 72)), y: -170 - 120 * Math.sin(deg(90 + i * 72)) }));
}
const PG_STEPS: Step<Pg>[] = [
  ...[0, 1, 2, 3, 4].map((i): Step<Pg> => ({ id: `a${i}`, group: i === 0 ? "Measure the angles" : undefined, title: `Measure the angle at ${"ABCDE"[i]}`, how: "Put the protractor's centre on the corner and its zero line along one side.", magnify: "paper",
    action: { type: "record", fields: [{ key: `a${i}`, label: `Angle ${"ABCDE"[i]}`, unit: "°", check: (v, s: Pg) => (near(v, interior(s, i), 1) ? true : "Read the scale that starts at 0 on one side."), answer: (s: Pg) => fix(interior(s, i), 0) }] } })),
  { id: "sum", group: "Add them up", title: "Add up the five angles", how: "Add your five measurements.",
    action: { type: "record", fields: [{ key: "sum", label: "Sum of the angles", unit: "°", check: (v, _s, values) => { const xs = vals(values, ["a0", "a1", "a2", "a3", "a4"]); if (xs.some((x) => x == null)) return "Measure all five first."; return near(v, xs.reduce((a, b) => a + (b ?? 0), 0), 0.5) ? true : "Add them again."; }, answer: (_s, values) => String(vals(values, ["a0", "a1", "a2", "a3", "a4"]).reduce((a, b) => (a ?? 0) + (b ?? 0), 0)) }] } },
  { id: "rule", title: "Find the rule", how: "A pentagon splits into 3 triangles from one corner.",
    action: { type: "record", fields: [
      { key: "rule", label: "Angle sum of an n-sided polygon", options: ["(n − 2) × 180°", "n × 180°", "n × 90°"], check: (v) => (v === "(n − 2) × 180°" ? true : "5 sides gives 540°."), answer: () => "(n − 2) × 180°" },
      { key: "hex", label: "So a hexagon's angles add up to", unit: "°", check: (v) => (near(v, 720, 0) ? true : "(6 − 2) × 180."), answer: () => "720" },
    ] } },
];
export const polygons: Practical<Pg> = {
  slug: "polygons", title: "Angles in a polygon", subject: "maths",
  aim: "Measure the interior angles of a pentagon with a protractor, add them up, and find the rule for any polygon.",
  safety: ["Extend short sides with a ruler if they don't reach the protractor's scale."],
  init: (r) => ({ pts: pentagon(r) }),
  layout: (s, step) => {
    const n = s.pts.length, c = s.pts.reduce((a, p) => ({ x: a.x + p.x / n, y: a.y + p.y / n }), { x: 0, y: 0 });
    const shapes: Shape[] = [{ k: "poly", pts: s.pts.flatMap((p) => [p.x, p.y]), fill: "#E0E7FF", c: pen, w: 2.5 },
      ...s.pts.map((p, i): Shape => label({ x: p.x + (p.x - c.x) * 0.18, y: p.y + (p.y - c.y) * 0.18 + 5 }, "ABCDE"[i], 0, 0, 15))];
    const id = PG_STEPS[step]?.id, i = id && /^a\d$/.test(id) ? Number(id[1]) : -1;
    return [paper("A pentagon drawn on paper", shapes, i >= 0 ? prot(s.pts[i], s.pts[(i + 4) % 5], s.pts[(i + 1) % 5]) : null)];
  },
  steps: PG_STEPS,
  results: (_s, v) => [{ title: "Results", columns: ["Corner", "Angle / °"], rows: [...[0, 1, 2, 3, 4].map((i) => ["ABCDE"[i], v[`a${i}`] ?? "—"]), ["Total", v.sum ?? "—"]] }],
  conclusion: () => "The angles of any pentagon add up to 540° (measuring errors make it a degree or two out). From one corner a polygon splits into n − 2 triangles of 180° each, so the angle sum is (n − 2) × 180°.",
};

// ── Probability: is the dice fair? ─────────────────────────────────────────
type Pr = { biased: boolean; rolls: number[]; n: number };
const CHECKS = [20, 100, 500];
const sixes = (s: Pr, n = s.n) => s.rolls.slice(0, n).filter((x) => x === 6).length;
export const probability: Practical<Pr> = {
  slug: "probability", title: "Probability: is the dice fair?", subject: "maths",
  aim: "Roll a dice many times, record how often it lands on six, and decide whether it is fair.",
  safety: ["Roll it into the tray, so it doesn't fly off the bench."],
  init: (r) => { const biased = r() < 0.5, p6 = biased ? 0.3 : 1 / 6; return { biased, n: 0, rolls: Array.from({ length: 500 }, () => (r() < p6 ? 6 : 1 + (Math.floor(r() * 5) % 5))) }; },
  layout: (s) => {
    const counts = [1, 2, 3, 4, 5, 6].map((f) => s.rolls.slice(0, s.n).filter((x) => x === f).length);
    return [
      { id: "dice", kind: "dice", x: 420, y: BENCH, label: "Dice in a tray", props: { face: s.n ? s.rolls[s.n - 1] : 1, rolling: s.n > 0 && !CHECKS.includes(s.n), n: s.n } },
      { id: "chart", kind: "tally-chart", x: 900, y: BENCH, label: "Tally chart", props: { labels: ["1", "2", "3", "4", "5", "6"], counts, total: s.n } },
    ];
  },
  steps: [
    { id: "theory", group: "Predict", title: "What should happen with a fair dice?", how: "There are 6 equally likely faces.",
      action: { type: "record", fields: [{ key: "theory", label: "P(six) for a fair dice", check: (v) => (near(v, 1 / 6, 0.005) ? true : "1 out of 6 — write it as 1/6 or 0.167."), answer: () => "1/6" }] } },
    ...CHECKS.flatMap((N, i): Step<Pr>[] => [
      { id: `roll${i}`, group: i === 0 ? "Experiment" : undefined, title: `Roll the dice until you have ${N} rolls`, how: "Make a tally mark for every roll.",
        action: { type: "wait", label: `Roll to ${N}`, minutes: 0 }, tick: (s, sec) => ({ ...s, n: Math.min(N, Math.max(s.n + 1, Math.floor(s.n + sec * N * 0.6))) }), finished: (s) => s.n >= N },
      { id: `six${i}`, title: `How many sixes in ${N} rolls?`, how: "Read the frequency of 6 from the tally chart, then work out the relative frequency = sixes ÷ rolls.", magnify: "chart",
        action: { type: "record", fields: [
          { key: `k${i}`, label: `Sixes in ${N} rolls`, check: (v, s: Pr) => (near(v, sixes(s, N), 0) ? true : "Read the frequency column for 6."), answer: (s: Pr) => String(sixes(s, N)) },
          { key: `f${i}`, label: "Relative frequency", check: (v, _s, values) => { const k = num(values[`k${i}`] ?? ""); return k != null && near(v, k / N, 0.005) ? true : `Sixes ÷ ${N}.`; }, answer: (_s, values) => fix((num(values[`k${i}`] ?? "") ?? 0) / N, 3) },
        ] } },
    ]),
    { id: "fair", group: "Decide", title: "Is the dice fair?", how: "With lots of rolls, the relative frequency should be close to 1/6 (0.167).",
      action: { type: "record", fields: [{ key: "fair", label: "The dice is", options: ["fair — about 1 roll in 6 is a six", "biased — it lands on six too often"], check: (v, s: Pr) => ((v.startsWith("biased")) === s.biased ? true : "Compare your relative frequency after 500 rolls with 0.167."), answer: (s: Pr) => (s.biased ? "biased — it lands on six too often" : "fair — about 1 roll in 6 is a six") }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Rolls", "Sixes", "Relative frequency"], rows: CHECKS.map((N, i) => [String(N), v[`k${i}`] ?? "—", v[`f${i}`] ?? "—"]) }],
  graph: (_s, v) => { const points = CHECKS.map((N, i) => [N, num(v[`f${i}`] ?? "")] as const).filter((p): p is readonly [number, number] => p[1] != null).map(([a, b]) => [a, b] as [number, number]);
    return points.length ? { title: "Relative frequency of a six", x: "rolls", y: "relative frequency", points, line: [[0, 1 / 6], [500, 1 / 6]] } : null; },
  conclusion: (s) => (s.biased ? "After 500 rolls, sixes come up about 3 times in 10 — far more than 1/6. The dice is biased. With few rolls you can't tell; the more trials, the more reliable the relative frequency." : "After 500 rolls the relative frequency is close to 1/6 (0.167), so the dice looks fair. After only 20 rolls it could be well off — more trials give a more reliable estimate."),
};

// ── Straight-line graphs: stacking cups ───────────────────────────────────
type Cu = { H: number; d: number; n: number };
const stackH = (s: Cu, n = s.n) => round(n ? s.H + (n - 1) * s.d : 0, 1);
const cupPts = (v: Record<string, string>) => [1, 2, 3, 4, 5].map((n) => [n, num(v[`h${n}`] ?? "")] as const).filter((p): p is readonly [number, number] => p[1] != null).map(([a, b]) => [a, b] as [number, number]);
export const linearGraphs: Practical<Cu> = {
  slug: "linear-graphs", title: "Straight-line graphs: stacking cups", subject: "maths",
  aim: "Measure the height of a stack of cups as you add cups, plot the graph, find its equation and predict the height of a tall stack.",
  safety: ["Stack the cups gently, straight down."],
  init: (r) => ({ H: between(r, 9, 11, 1), d: between(r, 1, 1.6, 1), n: 0 }),
  layout: (s) => [
    { id: "pile", kind: "cups", x: 300, y: BENCH, label: "Cups", props: { n: 5 - s.n, ruler: false } },
    { id: "stack", kind: "cups", x: 700, y: BENCH, label: "Stack & ruler", props: { n: s.n, H: s.H, d: s.d, ruler: true, h: stackH(s) } },
  ],
  steps: [
    ...[1, 2, 3, 4, 5].flatMap((n): Step<Cu>[] => [
      { id: `add${n}`, group: n === 1 ? "Measure" : undefined, title: n === 1 ? "Stand one cup by the ruler" : `Add cup ${n}`, how: "Drag a cup onto the stack.", action: { type: "drag", item: "pile", onto: "stack" }, apply: (s) => ({ ...s, n }) },
      { id: `h${n}`, title: `Measure the height (${n} cup${n > 1 ? "s" : ""})`, how: "Read the ruler level with the top of the stack, to the nearest mm.", magnify: "stack",
        action: { type: "record", fields: [{ key: `h${n}`, label: `Height of ${n} cup${n > 1 ? "s" : ""}`, unit: "cm", check: (v, s: Cu) => (near(v, stackH(s, n), 0.05) ? true : "Read the ruler at the top rim."), answer: (s: Cu) => fix(stackH(s, n), 1) }] } },
    ]),
    { id: "eq", group: "The equation", title: "Find the equation of the line", how: "Height h = m × n + c. The gradient m is how much each extra cup adds; c is where the line meets the h axis (n = 0).",
      action: { type: "record", fields: [
        { key: "m", label: "Gradient m", unit: "cm per cup", check: (v, _s, values) => { const p = cupPts(values); if (p.length < 2) return "Measure first."; const m = fitLine(p).m; return near(v, m, 0.05) ? true : "Rise ÷ run: (height of 5 cups − height of 1 cup) ÷ 4."; }, answer: (_s, values) => fix(fitLine(cupPts(values)).m, 2) },
        { key: "c", label: "Intercept c", unit: "cm", check: (v, _s, values) => { const p = cupPts(values); if (p.length < 2) return "Measure first."; const c = fitLine(p).c; return near(v, c, 0.1) ? true : "Height of 1 cup − one gradient."; }, answer: (_s, values) => fix(fitLine(cupPts(values)).c, 1) },
      ] } },
    { id: "predict", title: "Predict the height of 20 cups", how: "Put n = 20 into h = m × n + c.",
      action: { type: "record", fields: [{ key: "p20", label: "Height of 20 cups", unit: "cm", check: (v, _s, values) => { const [m, c] = vals(values, ["m", "c"]); if (m == null || c == null) return "Find m and c first."; const w = m * 20 + c; return near(v, w, Math.max(0.2, w * 0.01)) ? true : "m × 20 + c."; }, answer: (_s, values) => { const [m, c] = vals(values, ["m", "c"]); return fix((m ?? 0) * 20 + (c ?? 0), 1); } }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Cups", "Height / cm"], rows: [1, 2, 3, 4, 5].map((n) => [String(n), v[`h${n}`] ?? "—"]) }],
  graph: (_s, v) => { const points = cupPts(v); if (!points.length) return null; const { m, c } = fitLine(points); return { title: "Height against number of cups", x: "cups", y: "height / cm", points, line: points.length > 1 ? [[0, c], [6, 6 * m + c]] : undefined }; },
  conclusion: (s, v) => `The points lie on a straight line, h = ${v.m ?? "m"}n + ${v.c ?? "c"}: each cup adds the height of its rim (${fix(s.d, 1)} cm), and c is the part of one cup below its rim. A stack of 20 would be about ${v.p20 ?? "…"} cm (really ${fix(stackH(s, 20), 1)} cm).`,
};

// ── Mensuration: volume of a tin ───────────────────────────────────────────
type Mn = { r: number; h: number; zoom: "d" | "h" | null; poured: boolean };
const tinVol = (s: Mn) => Math.PI * s.r * s.r * s.h;
export const mensuration: Practical<Mn> = {
  slug: "mensuration", title: "Volume of a tin can", subject: "maths",
  aim: "Measure a tin can, calculate its volume with V = πr²h, and check it by filling it with water.",
  safety: ["Tin edges can be sharp — use one with a rolled rim."],
  init: (r) => ({ r: between(r, 3.5, 4.5, 2), h: between(r, 9, 12, 1), zoom: null, poured: false }),
  layout: (s, step) => {
    const id = MN_IDS[step];
    return [
      { id: "tin", kind: "can", x: 560, y: BENCH, label: "Tin can (full of water once poured)", props: { r: s.r, h: s.h, zoom: id === "d" ? "d" : id === "h" ? "h" : null, full: !s.poured } },
      { id: "jug", kind: "measuring-cylinder", x: 900, y: BENCH, label: "Measuring cylinder (cm³)", props: { vol: s.poured ? Math.round(tinVol(s) / 10) * 10 : 0, scale: 10, liquid: "#BFDBFE" } },
    ];
  },
  steps: [] as Step<Mn>[],
  results: (_s, v) => [{ title: "Results", columns: ["", "Value"], rows: [["Diameter / cm", v.d ?? "—"], ["Height / cm", v.h ?? "—"], ["Calculated volume / cm³", v.V ?? "—"], ["Measured volume / cm³", v.W ?? "—"]] }],
  conclusion: (_s, v) => `V = πr²h gave ${v.V ?? "…"} cm³ and the water measured ${v.W ?? "…"} cm³ — within a few per cent. The difference comes from measuring to the nearest mm and the thickness of the tin.`,
};
const MN_STEPS: Step<Mn>[] = [
  { id: "d", group: "Measure", title: "Measure the diameter", how: "Measure straight across the top, through the middle, to the nearest mm.", magnify: "tin",
    action: { type: "record", fields: [{ key: "d", label: "Diameter", unit: "cm", check: (v, s: Mn) => (near(v, 2 * s.r, 0.1) ? true : "Read the ruler at the far side of the rim."), answer: (s: Mn) => fix(2 * s.r, 1) }] } },
  { id: "h", title: "Measure the height", how: "Stand the ruler beside the tin.", magnify: "tin",
    action: { type: "record", fields: [{ key: "h", label: "Height", unit: "cm", check: (v, s: Mn) => (near(v, s.h, 0.1) ? true : "Read the ruler level with the top."), answer: (s: Mn) => fix(s.h, 1) }] } },
  { id: "V", group: "Calculate", title: "Calculate the volume", how: "r = diameter ÷ 2. V = π × r × r × h.",
    action: { type: "record", fields: [{ key: "V", label: "Volume", unit: "cm³", check: (v, _s, values) => { const [d, h] = vals(values, ["d", "h"]); if (!d || !h) return "Measure first."; const w = Math.PI * (d / 2) ** 2 * h; return near(v, w, w * 0.01) ? true : "π × (d ÷ 2)² × h."; }, answer: (_s, values) => { const [d, h] = vals(values, ["d", "h"]); return fix(Math.PI * ((d ?? 0) / 2) ** 2 * (h ?? 0), 0); } }] } },
  { id: "pour", group: "Check", title: "Fill the tin with water and pour it into the measuring cylinder", how: "Drag the full tin onto the measuring cylinder.", action: { type: "drag", item: "tin", onto: "jug", pour: true }, apply: (s) => ({ ...s, poured: true }) },
  { id: "W", title: "Read the volume of water", how: "Read the bottom of the meniscus. Each small mark is 10 cm³.", magnify: "jug",
    action: { type: "record", fields: [{ key: "W", label: "Volume of water", unit: "cm³", check: (v, s: Mn) => (near(v, Math.round(tinVol(s) / 10) * 10, 5) ? true : "Read the scale at the meniscus."), answer: (s: Mn) => String(Math.round(tinVol(s) / 10) * 10) }] } },
];
const MN_IDS = MN_STEPS.map((x) => x.id);
mensuration.steps = MN_STEPS;

export const MATHS: Practical[] = [probability, pythagoras, statistics, transformations, quadratics, unitCircle, circleTheorems, linearGraphs, mensuration, fractions, polygons];
export { SHELF };
