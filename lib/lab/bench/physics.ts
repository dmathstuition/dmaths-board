// Physics practicals on the lab bench (see lib/lab/bench/types.ts). Each one
// hides a true value (g, a spring constant, a refractive index…) that the
// learner finds from their own readings.
import { BENCH, SHELF, between, deg, fitLine, fix, near, num, round, type Practical, type Step } from "@/lib/lab/bench/types";

const vals = (v: Record<string, string>, keys: string[]) => keys.map((k) => num(v[k] ?? ""));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

// ── Simple pendulum: g from T² against L ───────────────────────────────────
type Pend = { g: number; L: number; noise: number[]; t: number; swinging: boolean; run: number };
const LENGTHS = [0.4, 0.6, 0.8, 1.0];
const periodOf = (L: number, g: number) => 2 * Math.PI * Math.sqrt(L / g);
const t10 = (s: Pend, i: number) => round(10 * periodOf(LENGTHS[i], s.g) + s.noise[i], 2);
const pendT2 = (v: Record<string, string>) => LENGTHS.map((L, i) => [L, num(v[`t${i}`] ?? "")] as const)
  .filter((p): p is readonly [number, number] => p[1] != null).map(([L, t]) => [L, round((t / 10) ** 2, 3)] as [number, number]);
export const pendulum: Practical<Pend> = {
  slug: "pendulum", title: "Simple pendulum: finding g", subject: "physics",
  aim: "Measure the period of a simple pendulum for different lengths, and use a graph of T² against L to find g.",
  safety: ["Clamp the stand firmly, or weight its base, so it can't topple.", "Keep the swings small (under 10°) and stand clear of the bob."],
  init: (r) => ({ g: between(r, 9.78, 9.84, 3), L: 0.3, noise: LENGTHS.map(() => round((r() - 0.5) * 0.24, 2)), t: 0, swinging: false, run: -1 }),
  layout: (s) => [
    { id: "pend", kind: "pendulum", x: 620, y: BENCH, label: "Pendulum & metre rule", props: { L: s.L, swinging: s.swinging, period: periodOf(s.L, s.g) } },
    { id: "watch", kind: "stopwatch", x: 1010, y: BENCH, label: "Stopwatch", props: { t: s.t } },
  ],
  steps: [
    ...LENGTHS.flatMap((L, i): Step<Pend>[] => [
      { id: `L${i}`, group: i === 0 ? "Take readings" : undefined, title: `Set the length to ${L.toFixed(2)} m`,
        how: "Loosen the clamp and pull the string through the split cork until the length from the cork to the middle of the bob is right.",
        action: { type: "set", item: "pend", label: "Length of the pendulum", min: 0.2, max: 1, step: 0.05, unit: "m", target: L, tolerance: 0.001, start: 0.3 },
        apply: (s, v) => ({ ...s, L: round(v ?? L, 2), t: 0, swinging: false }) },
      { id: `swing${i}`, title: "Release it and time 10 swings",
        how: "Pull the bob aside by a small angle and let go. Start the stopwatch as it passes the middle, and stop it after 10 complete swings.",
        action: { type: "wait", label: "Release and time 10 swings", minutes: 0 },
        apply: (s) => ({ ...s, t: 0, swinging: true, run: i }),
        tick: (s, sec) => { const t = Math.min(t10(s, i), round(s.t + sec * 5, 2)); return { ...s, t, swinging: t < t10(s, i) }; },
        finished: (s) => s.t >= t10(s, i) },
      { id: `t${i}`, title: `Write down the time (${L.toFixed(2)} m)`, how: "Copy the stopwatch reading.", magnify: "watch",
        action: { type: "record", fields: [{ key: `t${i}`, label: `Time for 10 swings at ${L.toFixed(2)} m`, unit: "s",
          check: (v, s: Pend) => (near(v, t10(s, i), 0.005) ? true : "Copy the stopwatch reading exactly."), answer: (s: Pend) => fix(t10(s, i), 2) }] } },
    ]),
    { id: "g", group: "Analyse", title: "Find g from your graph", how: "T = time for 10 swings ÷ 10. The graph of T² against L is a straight line through the origin with gradient 4π² ÷ g, so g = 4π² ÷ gradient.",
      action: { type: "record", fields: [{ key: "g", label: "g", unit: "m/s²",
        check: (v, _s, values) => { const pts = pendT2(values); if (pts.length < 2) return "Take your readings first."; const want = (4 * Math.PI ** 2) / fitLine(pts, true).m; return near(v, want, want * 0.03) ? true : "g = 4π² ÷ (the gradient of T² against L)."; },
        answer: (_s, values) => fix((4 * Math.PI ** 2) / fitLine(pendT2(values), true).m, 2) }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["L / m", "10 swings / s", "T / s", "T² / s²"],
    rows: LENGTHS.map((L, i) => { const t = num(v[`t${i}`] ?? ""); return [fix(L, 2), t != null ? fix(t, 2) : "—", t != null ? fix(t / 10, 3) : "—", t != null ? fix((t / 10) ** 2, 3) : "—"]; }) }],
  graph: (_s, v) => { const points = pendT2(v); if (!points.length) return null; const { m } = fitLine(points, true);
    return { title: "T² against L", x: "L / m", y: "T² / s²", points, line: points.length > 1 ? [[0, 0], [1, m]] : undefined }; },
  conclusion: (s, v) => `T² is proportional to L (a straight line through the origin). From the gradient, g = ${v.g ?? "…"} m/s² (the true value here was ${fix(s.g, 2)} m/s²). Timing 10 swings, not one, makes the reaction-time error ten times smaller.`,
};

// ── Hooke's law: a spring's extension ──────────────────────────────────────
type Hk = { k: number; x0: number; n: number };
const pointer = (s: Hk, n = s.n) => round(s.x0 + (n / s.k) * 100, 1);
const hookPts = (v: Record<string, string>) => { const x0 = num(v.x0 ?? ""); if (x0 == null) return [];
  return [1, 2, 3, 4, 5].map((n) => [num(v[`x${n}`] ?? ""), n] as const).filter((p): p is readonly [number, number] => p[0] != null).map(([x, n]) => [round((x - x0) / 100, 4), n] as [number, number]); };
export const hooke: Practical<Hk> = {
  slug: "hooke", title: "Hooke's law: stretching a spring", subject: "physics",
  aim: "Measure how a spring's extension depends on the force stretching it, and find its spring constant.",
  safety: ["Wear eye protection — a spring can fly off.", "Keep your feet clear of the masses; put a tray of sand under them."],
  init: (r) => ({ k: between(r, 18, 30, 1), x0: round(between(r, 8, 11, 1), 1), n: 0 }),
  layout: (s) => [
    { id: "rig", kind: "spring-stand", x: 600, y: BENCH, label: "Spring, pointer & rule", props: { pos: pointer(s), n: s.n } },
    { id: "weights", kind: "masses", x: 960, y: BENCH, label: "1 N slotted masses", props: { left: 5 - s.n } },
  ],
  steps: [
    { id: "x0", group: "Take readings", title: "Read the pointer with no load", how: "Read where the pointer crosses the rule, at eye level. Each small mark is 1 mm.", magnify: "rig",
      action: { type: "record", fields: [{ key: "x0", label: "Pointer reading (0 N)", unit: "cm",
        check: (v, s: Hk) => (near(v, pointer(s, 0), 0.05) ? true : "Read the rule where the pointer is — to the nearest millimetre (0.1 cm)."), answer: (s: Hk) => fix(pointer(s, 0), 1) }] } },
    ...[1, 2, 3, 4, 5].flatMap((n): Step<Hk>[] => [
      { id: `add${n}`, title: `Add a 1 N mass (${n}.0 N in all)`, how: "Drag a slotted mass onto the hanger and let the spring stop bouncing.",
        action: { type: "drag", item: "weights", onto: "rig" }, apply: (s) => ({ ...s, n: n }) },
      { id: `x${n}`, title: `Read the pointer (${n}.0 N)`, how: "Read the pointer at eye level, to the nearest millimetre.", magnify: "rig",
        action: { type: "record", fields: [{ key: `x${n}`, label: `Pointer reading (${n}.0 N)`, unit: "cm",
          check: (v, s: Hk) => (near(v, pointer(s, n), 0.05) ? true : "Read the rule where the pointer is."), answer: (s: Hk) => fix(pointer(s, n), 1) }] } },
    ]),
    { id: "k", group: "Analyse", title: "Find the spring constant", how: "Extension = reading − reading with no load. The graph of force against extension (in metres) is a straight line; its gradient is the spring constant k.",
      action: { type: "record", fields: [{ key: "k", label: "Spring constant k", unit: "N/m",
        check: (v, _s, values) => { const pts = hookPts(values); if (pts.length < 2) return "Take your readings first."; const want = fitLine(pts, true).m; return near(v, want, want * 0.05) ? true : "k = force ÷ extension in metres (e.g. 5.0 N ÷ 0.20 m = 25 N/m)."; },
        answer: (_s, values) => fix(fitLine(hookPts(values), true).m, 1) }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Force / N", "Reading / cm", "Extension / cm"],
    rows: [0, 1, 2, 3, 4, 5].map((n) => { const x = num(v[n ? `x${n}` : "x0"] ?? ""), x0 = num(v.x0 ?? ""); return [fix(n, 1), x != null ? fix(x, 1) : "—", x != null && x0 != null ? fix(x - x0, 1) : "—"]; }) }],
  graph: (_s, v) => { const points = hookPts(v); if (!points.length) return null; const { m } = fitLine(points, true); const e = Math.max(...points.map((p) => p[0]));
    return { title: "Force against extension", x: "extension / m", y: "force / N", points, line: points.length > 1 ? [[0, 0], [e, e * m]] : undefined }; },
  conclusion: (s, v) => `Force is proportional to extension (a straight line through the origin), so the spring obeys Hooke's law. k = ${v.k ?? "…"} N/m (true value ${fix(s.k, 1)} N/m).`,
};

// ── Density of an irregular solid (displacement) ──────────────────────────
type Dn = { m: number; V: number; v0: number; where: "bench" | "balance" | "cyl"; water: boolean };
export const density: Practical<Dn> = {
  slug: "density", title: "Density of a stone", subject: "physics",
  aim: "Find the density of an irregular stone by weighing it and measuring its volume by displacement of water.",
  safety: ["Lower the stone on a thread — dropping it can crack the cylinder.", "Mop up spills straight away."],
  init: (r) => { const V = Math.round(between(r, 14, 26, 0)); return { V, m: round(V * between(r, 2.5, 2.9, 3), 2), v0: Math.round(between(r, 40, 52, 0)), where: "bench", water: false }; },
  layout: (s) => [
    { id: "stone", kind: "stone", x: s.where === "balance" ? 560 : 330, y: s.where === "balance" ? BENCH - 68 : BENCH, hidden: s.where === "cyl", z: 3, label: s.where === "bench" ? "Stone (on a thread)" : "", props: { name: "stone" } },
    { id: "balance", kind: "balance", x: 560, y: BENCH, label: "Balance", props: { reading: s.where === "balance" ? s.m : 0 } },
    { id: "cyl", kind: "measuring-cylinder", x: 860, y: BENCH, label: "Measuring cylinder", props: { vol: s.water ? s.v0 + (s.where === "cyl" ? s.V : 0) : 0, stone: s.where === "cyl", liquid: "#BFDBFE" } },
    { id: "water", kind: "beaker", x: 1110, y: BENCH, label: "Water", props: { vol: 190, max: 250, colour: "#BFDBFE", liquid: "#BFDBFE" } },
  ],
  steps: [
    { id: "weigh", group: "Mass", title: "Weigh the stone", how: "Drag the stone onto the balance.", action: { type: "drag", item: "stone", onto: "balance" }, apply: (s) => ({ ...s, where: "balance" }) },
    { id: "m", title: "Record its mass", how: "Copy the balance reading.", magnify: "balance",
      action: { type: "record", fields: [{ key: "m", label: "Mass of the stone", unit: "g", check: (v, s: Dn) => (near(v, s.m, 0.005) ? true : "Copy the balance display."), answer: (s: Dn) => fix(s.m, 2) }] } },
    { id: "fill", group: "Volume", title: "Half-fill the measuring cylinder", how: "Drag the beaker of water onto the measuring cylinder to pour some in.",
      action: { type: "drag", item: "water", onto: "cyl", pour: true }, apply: (s) => ({ ...s, water: true }) },
    { id: "v0", title: "Read the water level", how: "Read the bottom of the meniscus at eye level, to the nearest 1 cm³.", magnify: "cyl",
      action: { type: "record", fields: [{ key: "v0", label: "Volume of water", unit: "cm³", check: (v, s: Dn) => (near(v, s.v0, 0.5) ? true : "Read the bottom of the meniscus — each mark is 1 cm³."), answer: (s: Dn) => String(s.v0) }] } },
    { id: "lower", title: "Lower the stone into the water", how: "Drag the stone into the cylinder. Lower it gently on its thread so no water splashes out.",
      action: { type: "drag", item: "stone", onto: "cyl" }, apply: (s) => ({ ...s, where: "cyl" }), note: () => "The water rises: the stone pushes aside (displaces) its own volume of water." },
    { id: "v1", title: "Read the new water level", how: "Read the bottom of the meniscus again.", magnify: "cyl",
      action: { type: "record", fields: [{ key: "v1", label: "Volume of water + stone", unit: "cm³", check: (v, s: Dn) => (near(v, s.v0 + s.V, 0.5) ? true : "Read the bottom of the meniscus."), answer: (s: Dn) => String(s.v0 + s.V) }] } },
    { id: "V", group: "Calculate", title: "Work out the stone's volume", how: "Volume of stone = new reading − first reading.",
      action: { type: "record", fields: [{ key: "V", label: "Volume of the stone", unit: "cm³",
        check: (v, _s, values) => { const [a, b] = vals(values, ["v1", "v0"]); return a != null && b != null && near(v, a - b, 0.1) ? true : "Take the first reading from the second."; },
        answer: (_s, values) => { const [a, b] = vals(values, ["v1", "v0"]); return String((a ?? 0) - (b ?? 0)); } }] } },
    { id: "rho", title: "Work out its density", how: "Density = mass ÷ volume.",
      action: { type: "record", fields: [{ key: "rho", label: "Density", unit: "g/cm³",
        check: (v, _s, values) => { const [m, V] = vals(values, ["m", "V"]); if (!m || !V) return "Find the mass and volume first."; return near(v, m / V, (m / V) * 0.02) ? true : "Divide the mass by the volume."; },
        answer: (_s, values) => { const [m, V] = vals(values, ["m", "V"]); return fix((m ?? 0) / (V || 1), 2); } }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["", "Value"], rows: [["Mass / g", v.m ?? "—"], ["Water / cm³", v.v0 ?? "—"], ["Water + stone / cm³", v.v1 ?? "—"], ["Volume of stone / cm³", v.V ?? "—"], ["Density / g cm⁻³", v.rho ?? "—"]] }],
  conclusion: (s, v) => `The stone's density is ${v.rho ?? "…"} g/cm³ (true value ${fix(s.m / s.V, 2)} g/cm³) — more than water's 1.0 g/cm³, so it sinks.`,
};

// ── The principle of moments ───────────────────────────────────────────────
type Mo = { M: number; left: number | null; right: number | null };
const PIVOT_Y = BENCH - 200, CM = 8; // the rule's top edge rests on the pivot here; 8 px per cm
const torque = (s: Mo) => (s.left == null ? 0 : 100 * (50 - s.left)) - (s.right == null ? 0 : s.M * (s.right - 50));
const balanceAt = (s: Mo) => 50 + (100 * (50 - (s.left ?? 20))) / s.M;
const tiltOf = (s: Mo) => (Math.abs(torque(s)) < s.M * 0.5 ? 0 : Math.max(-7, Math.min(7, -torque(s) / 250)));
const hookAt = (s: Mo, pos: number) => { const t = deg(tiltOf(s)), dx = (pos - 50) * CM; return { x: 700 + dx * Math.cos(t), y: PIVOT_Y + dx * Math.sin(t) + 120 }; };
export const moments: Practical<Mo> = {
  slug: "moments", title: "The principle of moments", subject: "physics",
  aim: "Balance a metre rule on a pivot with a known and an unknown mass, and use the principle of moments to find the unknown mass.",
  safety: ["Keep the masses low over the bench, so nothing falls far."],
  init: (r) => ({ M: Math.round(between(r, 130, 230, 0)), left: null, right: null }),
  layout: (s) => {
    const L = s.left != null ? hookAt(s, s.left) : { x: 210, y: BENCH }, R = s.right != null ? hookAt(s, s.right) : { x: 1210, y: BENCH };
    return [
      { id: "beam", kind: "beam", x: 700, y: BENCH, label: "Metre rule on a pivot (50 cm mark)", props: { tilt: tiltOf(s) } },
      { id: "known", kind: "mass-hanger", x: L.x, y: L.y, z: 3, label: s.left == null ? "100 g" : "", props: { text: "100 g", hung: s.left != null, name: "100 g mass" } },
      { id: "unknown", kind: "mass-hanger", x: R.x, y: R.y, z: 3, label: s.right == null ? "Unknown mass" : "", props: { text: "?", hung: s.right != null, big: true, name: "unknown mass" } },
    ];
  },
  steps: [
    { id: "hang1", group: "Balance the rule", title: "Hang the 100 g mass on the left", how: "Drag the 100 g mass onto the left half of the rule.",
      action: { type: "drag", item: "known", onto: "beam" }, apply: (s) => ({ ...s, left: 35 }), note: () => "The rule tips down on the left: the mass has a turning effect (a moment) about the pivot." },
    { id: "slide1", title: "Slide it to the 20 cm mark", how: "Move its loop along the rule to the 20 cm mark — 30 cm from the pivot.",
      action: { type: "set", item: "known", label: "Position of the 100 g mass", min: 0, max: 49, step: 0.5, unit: "cm", target: 20, tolerance: 0.25, start: 35 },
      apply: (s, v) => ({ ...s, left: v ?? 20 }) },
    { id: "hang2", title: "Hang the unknown mass on the right", how: "Drag the unknown mass onto the right half of the rule.",
      action: { type: "drag", item: "unknown", onto: "beam" }, apply: (s) => ({ ...s, right: 95 }) },
    { id: "slide2", title: "Slide it until the rule balances", how: "Move the unknown mass along the rule until the rule is level.",
      action: { type: "set", item: "unknown", label: "Position of the unknown mass", min: 51, max: 100, step: 0.5, unit: "cm", target: 75, tolerance: 0.5, targetOf: balanceAt, start: 95,
        hint: "The rule still tips — slide the mass until the rule hangs level." },
      apply: (s, v) => ({ ...s, right: v ?? 75 }), note: () => "Balanced: the anticlockwise moment equals the clockwise moment." },
    { id: "d", group: "Calculate", title: "Measure both distances from the pivot", how: "The pivot is at the 50 cm mark. Distance = how far each loop is from it.",
      action: { type: "record", fields: [
        { key: "d1", label: "100 g mass from the pivot", unit: "cm", check: (v, s: Mo) => (near(v, 50 - (s.left ?? 0), 0.25) ? true : "50 cm − where the 100 g mass hangs."), answer: (s: Mo) => fix(50 - (s.left ?? 0), 1) },
        { key: "d2", label: "Unknown mass from the pivot", unit: "cm", check: (v, s: Mo) => (near(v, (s.right ?? 0) - 50, 0.25) ? true : "Where the unknown mass hangs − 50 cm."), answer: (s: Mo) => fix((s.right ?? 0) - 50, 1) },
      ] } },
    { id: "M", title: "Work out the unknown mass", how: "Anticlockwise moment = clockwise moment: 100 g × d₁ = M × d₂.",
      action: { type: "record", fields: [{ key: "M", label: "Unknown mass", unit: "g",
        check: (v, _s, values) => { const [a, b] = vals(values, ["d1", "d2"]); if (!a || !b) return "Measure the distances first."; const want = (100 * a) / b; return near(v, want, want * 0.02) ? true : "M = 100 × d₁ ÷ d₂."; },
        answer: (_s, values) => { const [a, b] = vals(values, ["d1", "d2"]); return fix((100 * (a ?? 0)) / (b || 1), 0); } }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["", "Value"], rows: [["d₁ (100 g) / cm", v.d1 ?? "—"], ["d₂ (unknown) / cm", v.d2 ?? "—"], ["Unknown mass / g", v.M ?? "—"]] }],
  conclusion: (s, v) => `When the rule balances, the anticlockwise moment equals the clockwise moment, so the unknown mass is ${v.M ?? "…"} g (true value ${s.M} g).`,
};

// ── Refraction through a glass block ───────────────────────────────────────
type Rf = { n: number; on: boolean; i: number };
const ANGLES = [20, 30, 40, 50, 60];
export const refractAngle = (i: number, n: number) => (Math.asin(Math.sin(deg(i)) / n) * 180) / Math.PI;
const sinPts = (v: Record<string, string>) => ANGLES.map((i, k) => [num(v[`r${k}`] ?? ""), i] as const).filter((p): p is readonly [number, number] => p[0] != null)
  .map(([r, i]) => [round(Math.sin(deg(r)), 3), round(Math.sin(deg(i)), 3)] as [number, number]);
export const refraction: Practical<Rf> = {
  slug: "refraction", title: "Refraction in a glass block", subject: "physics",
  aim: "Measure the angle of refraction for different angles of incidence, and find the refractive index of glass.",
  safety: ["The ray box gets hot — hold it by its handle.", "Work in a dimmed room; don't look straight into the beam."],
  init: (r) => ({ n: between(r, 1.46, 1.54, 2), on: false, i: 0 }),
  layout: (s) => [{ id: "sheet", kind: "ray-sheet", x: 700, y: BENCH, label: "Ray box and glass block on paper — seen from above", props: { on: s.on, i: s.i, n: s.n } }],
  steps: [
    { id: "on", group: "Set up", title: "Switch on the ray box", how: "The block is drawn round on the paper, with a normal at the point where the ray will enter.",
      action: { type: "tap", item: "sheet", label: "Switch on the ray box" }, apply: (s) => ({ ...s, on: true, i: 10 }) },
    ...ANGLES.flatMap((i, k): Step<Rf>[] => [
      { id: `i${k}`, group: k === 0 ? "Take readings" : undefined, title: `Set the angle of incidence to ${i}°`, how: "Turn the ray box so the ray meets the normal at this angle (measured from the normal).",
        action: { type: "set", item: "sheet", label: "Angle of incidence", min: 0, max: 80, step: 1, unit: "°", target: i, tolerance: 0.5, start: 10 }, apply: (s, v) => ({ ...s, i: v ?? i }) },
      { id: `r${k}`, title: `Measure the angle of refraction (i = ${i}°)`, how: "Read the protractor where the ray inside the block crosses it — the angle from the normal, to the nearest degree.", magnify: "sheet", magnifyAt: { x: 1180, y: 260 },
        action: { type: "record", fields: [{ key: `r${k}`, label: `Angle of refraction at ${i}°`, unit: "°",
          check: (v, s: Rf) => (near(v, refractAngle(i, s.n), 1) ? true : "Measure from the normal (the dashed line), not from the block's edge."), answer: (s: Rf) => fix(refractAngle(i, s.n), 0) }] } },
    ]),
    { id: "n", group: "Analyse", title: "Find the refractive index", how: "n = sin i ÷ sin r — the gradient of the graph of sin i against sin r.",
      action: { type: "record", fields: [{ key: "n", label: "Refractive index n", check: (v, _s, values) => { const pts = sinPts(values); if (pts.length < 2) return "Take your readings first."; const want = fitLine(pts, true).m; return near(v, want, want * 0.03) ? true : "n = sin i ÷ sin r; use the gradient of your graph."; },
        answer: (_s, values) => fix(fitLine(sinPts(values), true).m, 2) }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["i / °", "r / °", "sin i", "sin r"],
    rows: ANGLES.map((i, k) => { const r = num(v[`r${k}`] ?? ""); return [String(i), r != null ? String(r) : "—", fix(Math.sin(deg(i)), 3), r != null ? fix(Math.sin(deg(r)), 3) : "—"]; }) }],
  graph: (_s, v) => { const points = sinPts(v); if (!points.length) return null; const { m } = fitLine(points, true); const x = Math.max(...points.map((p) => p[0]));
    return { title: "sin i against sin r", x: "sin r", y: "sin i", points, line: points.length > 1 ? [[0, 0], [x, x * m]] : undefined }; },
  conclusion: (s, v) => `The ray bends towards the normal as it enters the glass. sin i ÷ sin r is constant (Snell's law): the refractive index is ${v.n ?? "…"} (true value ${fix(s.n, 2)}).`,
};

// ── Focal length of a convex lens ──────────────────────────────────────────
type Ln = { f: number; u: number; s: number; on: boolean };
const US = [25, 30, 40];
export const imageAt = (s: { f: number; u: number }) => s.u + (s.u * s.f) / (s.u - s.f);
const lensF = (v: Record<string, string>) => { const fs = US.map((u, k) => num(v[`v${k}`] ?? "")).map((vv, k) => (vv ? 1 / (1 / US[k] + 1 / vv) : null)).filter((x): x is number => x != null); return fs.length ? mean(fs) : null; };
export const lens: Practical<Ln> = {
  slug: "lens", title: "Focal length of a convex lens", subject: "physics",
  aim: "Form sharp images of a lamp with a convex lens, measure object and image distances, and find the lens's focal length.",
  safety: ["The lamp box gets hot.", "Never look at the Sun through a lens."],
  init: (r) => ({ f: between(r, 10, 14, 1), u: 50, s: 95, on: false }),
  layout: (s) => [
    { id: "bench", kind: "optical-bench", x: 700, y: BENCH, label: "Lamp (object) · lens · screen on a metre rule", props: { u: s.u, s: s.s, f: s.f, on: s.on } },
    { id: "lens", kind: "hotspot", x: 250 + s.u * 9, y: BENCH - 20, props: { w: 60, h: 230, name: "lens" } },
    { id: "screen", kind: "hotspot", x: 250 + s.s * 9, y: BENCH - 20, props: { w: 90, h: 250, name: "screen", screen: true, u: s.u, s: s.s, f: s.f, on: s.on } },
  ],
  steps: [
    { id: "on", group: "Set up", title: "Switch on the lamp", how: "The lamp lights up an arrow-shaped hole (the object) at the 0 cm mark.", action: { type: "tap", item: "bench", label: "Switch on the lamp" }, apply: (s) => ({ ...s, on: true }) },
    ...US.flatMap((u, k): Step<Ln>[] => [
      { id: `u${k}`, group: k === 0 ? "Take readings" : undefined, title: `Put the lens ${u} cm from the object`, how: `Slide the lens to the ${u} cm mark.`,
        action: { type: "set", item: "lens", label: "Lens position", min: 15, max: 60, step: 1, unit: "cm", target: u, tolerance: 0.4, start: 50 }, apply: (s, v) => ({ ...s, u: v ?? u }) },
      { id: `s${k}`, title: "Move the screen until the image is sharp", how: "Slide the screen along the rule and watch the close-up: stop where the image is sharpest.", magnify: "screen", magnifyAt: { x: 1180, y: 190 },
        action: { type: "set", item: "screen", label: "Screen position", min: 30, max: 100, step: 0.5, unit: "cm", target: 60, tolerance: 0.6, targetOf: imageAt, start: 95, hint: "The image is still blurred — move the screen until it is sharp." },
        apply: (s, v) => ({ ...s, s: v ?? 60 }), note: () => "A sharp image: real, upside down — formed where the light rays meet again." },
      { id: `v${k}`, title: "Measure the image distance", how: "v = distance from the lens to the screen = screen mark − lens mark.",
        action: { type: "record", fields: [{ key: `v${k}`, label: `Image distance v (u = ${u} cm)`, unit: "cm",
          check: (v, s: Ln) => (near(v, s.s - s.u, 0.15) ? true : "Screen position − lens position."), answer: (s: Ln) => fix(s.s - s.u, 1) }] } },
    ]),
    { id: "f", group: "Analyse", title: "Work out the focal length", how: "1/f = 1/u + 1/v for each pair; take the mean.",
      action: { type: "record", fields: [{ key: "f", label: "Focal length f", unit: "cm",
        check: (v, _s, values) => { const want = lensF(values); if (!want) return "Take your readings first."; return near(v, want, want * 0.04) ? true : "f = 1 ÷ (1/u + 1/v); work it out for each pair and average."; },
        answer: (_s, values) => fix(lensF(values) ?? 0, 1) }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["u / cm", "v / cm", "f / cm"], rows: US.map((u, k) => { const vv = num(v[`v${k}`] ?? ""); return [String(u), vv != null ? fix(vv, 1) : "—", vv ? fix(1 / (1 / u + 1 / vv), 1) : "—"]; }) }],
  conclusion: (s, v) => `The lens's focal length is ${v.f ?? "…"} cm (true value ${fix(s.f, 1)} cm). As the object moves closer to the lens, the image moves further away and gets bigger.`,
};

// ── Heating curve of water ─────────────────────────────────────────────────
type Ht = { T0: number; melt: number; rate: number; on: boolean; min: number; log: [number, number][] };
export const tempAt = (s: Ht, t: number) => { const a = -s.T0 / 4, b = a + s.melt, c = b + 100 / s.rate;
  return round(t < a ? s.T0 + 4 * t : t < b ? 0 : t < c ? (t - b) * s.rate : 100, 1); };
export const heating: Practical<Ht> = {
  slug: "heating-curve", title: "Heating curve of water", subject: "physics",
  aim: "Heat crushed ice steadily, record its temperature every minute until the water boils, and explain the flat parts of the graph.",
  safety: ["The hotplate and boiling water scald — don't touch the beaker.", "Clamp the thermometer; don't stir with it."],
  init: (r) => ({ T0: Math.round(between(r, -12, -6, 0)), melt: between(r, 5, 7, 1), rate: between(r, 9, 11, 1), on: false, min: 0, log: [] }),
  layout: (s) => [
    { id: "heat", kind: "heating", x: 600, y: BENCH, label: "Ice in a beaker on a hotplate", props: { T: tempAt(s, s.min), on: s.on, min: s.min, melt: s.melt, T0: s.T0 } },
    { id: "watch", kind: "stopwatch", x: 1010, y: BENCH, label: "Stopwatch", props: { t: s.min * 60 } },
  ],
  steps: [
    { id: "T0", group: "Start", title: "Read the temperature of the ice", how: "Read the thermometer at eye level, to the nearest degree.", magnify: "heat",
      action: { type: "record", fields: [{ key: "T0", label: "Starting temperature", unit: "°C", check: (v, s: Ht) => (near(v, s.T0, 0.5) ? true : "Read where the red liquid stops — it's below 0 °C."), answer: (s: Ht) => String(s.T0) }] } },
    { id: "on", title: "Switch on the hotplate", how: "Set it to a steady heat, so energy goes in at the same rate all the time.", action: { type: "tap", item: "heat", label: "Switch on the hotplate" }, apply: (s) => ({ ...s, on: true }) },
    { id: "heat", group: "Heat", title: "Heat it, reading the temperature every minute", how: "The readings go into your results table every minute. Stir gently.",
      action: { type: "wait", label: "Heat for 25 minutes", minutes: 25 },
      tick: (s, sec) => { const min = Math.min(25, s.min + sec * 8), log = [...s.log]; for (let m = log.length; m <= Math.floor(min); m++) log.push([m, tempAt(s, m)]); return { ...s, min, log }; },
      finished: (s) => s.min >= 25, note: () => "The temperature stopped rising twice: while the ice melted, and while the water boiled." },
    { id: "flat", group: "Analyse", title: "Read the flat parts of your graph", how: "Look at the Results tab for the graph.",
      action: { type: "record", fields: [
        { key: "mp", label: "Temperature while the ice melts", unit: "°C", check: (v) => (near(v, 0, 1) ? true : "Read the first flat part of the graph."), answer: () => "0" },
        { key: "bp", label: "Temperature while the water boils", unit: "°C", check: (v) => (near(v, 100, 1) ? true : "Read the second flat part of the graph."), answer: () => "100" },
      ] } },
    { id: "why", title: "Why doesn't the temperature rise while it melts?", how: "Energy is still going in.",
      action: { type: "record", fields: [{ key: "why", label: "The energy", options: ["breaks the bonds between particles", "makes the particles move faster", "is all lost to the room"],
        check: (v) => (v === "breaks the bonds between particles" ? true : "The particles don't speed up (the temperature is steady) — so where does the energy go?"), answer: () => "breaks the bonds between particles" }] } },
  ],
  results: (s) => [{ title: "Temperature every minute", columns: ["Time / min", "Temperature / °C"], rows: s.log.filter(([m]) => m % 2 === 0 || m === 25).map(([m, T]) => [String(m), fix(T, 0)]) }],
  graph: (s) => (s.log.length ? { title: "Temperature against time", x: "time / min", y: "temperature / °C", points: s.log.map(([m, T]) => [m, T] as [number, number]) } : null),
  conclusion: () => "The temperature stays at 0 °C while ice melts and at 100 °C while water boils: the energy supplied breaks bonds between particles (latent heat) instead of raising the temperature.",
};

// ── Specific heat capacity of aluminium ───────────────────────────────────
type Sh = { c: number; T0: number; heater: boolean; thermo: boolean; on: boolean; sec: number };
const POWER = 48, LOSS = 0.9;
const shT = (s: Sh) => round(s.T0 + (POWER * s.sec * LOSS) / s.c, 1);
export const specificHeat: Practical<Sh> = {
  slug: "specific-heat", title: "Specific heat capacity of aluminium", subject: "physics",
  aim: "Heat a 1.00 kg aluminium block with an electric heater, measure the energy supplied and the temperature rise, and find its specific heat capacity.",
  safety: ["The heater and block get hot — don't touch them until they've cooled.", "Keep water away from the power supply."],
  init: (r) => ({ c: Math.round(between(r, 860, 940, 0)), T0: Math.round(between(r, 18, 23, 0)), heater: false, thermo: false, on: false, sec: 0 }),
  layout: (s) => [
    { id: "therm", kind: "thermometer", x: 260, y: BENCH, hidden: s.thermo, label: "Thermometer", props: { T: 21 } },
    { id: "heater", kind: "heater", x: 400, y: BENCH, hidden: s.heater, label: "Immersion heater" },
    { id: "block", kind: "metal-block", x: 640, y: BENCH, label: "1.00 kg aluminium block", props: { heater: s.heater, thermo: s.thermo, T: shT(s), on: s.on } },
    { id: "psu", kind: "power-supply", x: 940, y: BENCH, label: "12 V supply", props: { on: s.on, volts: 12 } },
    { id: "jm", kind: "joulemeter", x: 1200, y: BENCH, label: "Joulemeter", props: { J: Math.round(POWER * s.sec), on: s.on } },
  ],
  steps: [
    { id: "heater", group: "Set up", title: "Put the heater in the block", how: "Drag the immersion heater into the large hole.", action: { type: "drag", item: "heater", onto: "block" }, apply: (s) => ({ ...s, heater: true }) },
    { id: "therm", title: "Put the thermometer in the small hole", how: "Drag the thermometer in. (A drop of oil in the hole helps it touch the metal.)", action: { type: "drag", item: "therm", onto: "block" }, apply: (s) => ({ ...s, thermo: true }) },
    { id: "T0", title: "Read the starting temperature", how: "Read the thermometer at eye level.", magnify: "block",
      action: { type: "record", fields: [{ key: "T0", label: "Starting temperature", unit: "°C", check: (v, s: Sh) => (near(v, s.T0, 0.5) ? true : "Read where the red liquid stops."), answer: (s: Sh) => String(s.T0) }] } },
    { id: "on", group: "Heat", title: "Switch on and start timing", how: "The joulemeter counts the energy supplied.", action: { type: "tap", item: "psu", label: "Switch on" }, apply: (s) => ({ ...s, on: true }) },
    { id: "heat", title: "Heat for 10 minutes", how: "Wait while the block warms up.", action: { type: "wait", label: "Heat for 10 minutes", minutes: 10 },
      tick: (s, sec) => ({ ...s, sec: Math.min(600, s.sec + sec * 200) }), finished: (s) => s.sec >= 600 },
    { id: "off", title: "Switch off", how: "Switch off after exactly 10 minutes.", action: { type: "tap", item: "psu", label: "Switch off" }, apply: (s) => ({ ...s, on: false }) },
    { id: "T1", group: "Readings", title: "Read the highest temperature", how: "Read the thermometer to the nearest 0.5 °C.", magnify: "block",
      action: { type: "record", fields: [{ key: "T1", label: "Final temperature", unit: "°C", check: (v, s: Sh) => (near(v, shT(s), 0.5) ? true : "Read where the red liquid stops."), answer: (s: Sh) => fix(shT(s), 1) }] } },
    { id: "E", title: "Read the joulemeter", how: "Copy the energy supplied.", magnify: "jm",
      action: { type: "record", fields: [{ key: "E", label: "Energy supplied", unit: "J", check: (v, s: Sh) => (near(v, POWER * s.sec, 1) ? true : "Copy the joulemeter's display."), answer: (s: Sh) => String(Math.round(POWER * s.sec)) }] } },
    { id: "c", group: "Calculate", title: "Work out the specific heat capacity", how: "c = E ÷ (m × ΔT), with m = 1.00 kg and ΔT = final − starting temperature.",
      action: { type: "record", fields: [{ key: "c", label: "Specific heat capacity", unit: "J/kg °C",
        check: (v, _s, values) => { const [E, a, b] = vals(values, ["E", "T1", "T0"]); if (!E || a == null || b == null || a === b) return "Take the readings first."; const want = E / (a - b); return near(v, want, want * 0.03) ? true : "c = E ÷ (1.00 × temperature rise)."; },
        answer: (_s, values) => { const [E, a, b] = vals(values, ["E", "T1", "T0"]); return fix((E ?? 0) / ((a ?? 1) - (b ?? 0) || 1), 0); } }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["", "Value"], rows: [["Mass / kg", "1.00"], ["Starting temperature / °C", v.T0 ?? "—"], ["Final temperature / °C", v.T1 ?? "—"], ["Energy / J", v.E ?? "—"], ["c / J kg⁻¹ °C⁻¹", v.c ?? "—"]] }],
  conclusion: (s, v) => `Your value, ${v.c ?? "…"} J/kg °C, is higher than the true ${s.c} J/kg °C: some energy heated the air instead of the block, so the temperature rise was smaller. Insulating the block would make it more accurate.`,
};

// ── Free fall: g from drop times ──────────────────────────────────────────
type Ff = { g: number; delay: number; h: number; dropped: boolean };
const HEIGHTS = [0.4, 0.6, 0.8, 1.0];
const dropTime = (s: Ff, h = s.h) => round(Math.sqrt((2 * h) / s.g) + s.delay, 3);
const MAG_Y = (h: number) => BENCH - 40 - h * 400;
const ffPts = (v: Record<string, string>) => HEIGHTS.map((h, k) => [num(v[`t${k}`] ?? ""), h] as const).filter((p): p is readonly [number, number] => p[0] != null).map(([t, h]) => [round(t * t, 4), h] as [number, number]);
export const freeFall: Practical<Ff> = {
  slug: "free-fall", title: "Free fall: measuring g", subject: "physics",
  aim: "Time a steel ball falling from different heights with an electromagnet and trapdoor timer, and find g from a graph of h against t².",
  safety: ["Clamp the stand firmly.", "Keep fingers clear of the trapdoor."],
  init: (r) => ({ g: between(r, 9.78, 9.83, 3), delay: between(r, 0.001, 0.003, 3), h: 0.3, dropped: false }),
  layout: (s) => [
    { id: "rig", kind: "drop-rig", x: 600, y: BENCH, label: "Electromagnet, trapdoor & rule", props: { h: s.h, magnet: !s.dropped } },
    { id: "ball", kind: "ball", x: 600, y: s.dropped ? BENCH - 34 : MAG_Y(s.h) + 26, z: 3 },
    { id: "timer", kind: "timer", x: 1000, y: BENCH, label: "Electronic timer", props: { t: s.dropped ? dropTime(s) : 0 } },
  ],
  steps: [
    ...HEIGHTS.flatMap((h, k): Step<Ff>[] => [
      { id: `h${k}`, group: k === 0 ? "Take readings" : undefined, title: `Set the height to ${h.toFixed(2)} m`, how: "Move the electromagnet so the bottom of the ball is this far above the trapdoor. The magnet picks the ball up again.",
        action: { type: "set", item: "rig", label: "Height of the ball", min: 0.2, max: 1.2, step: 0.05, unit: "m", target: h, tolerance: 0.001, start: 0.3 }, apply: (s, v) => ({ ...s, h: round(v ?? h, 2), dropped: false }) },
      { id: `drop${k}`, title: "Release the ball", how: "Switching off the magnet starts the timer; the ball hitting the trapdoor stops it.",
        action: { type: "tap", item: "rig", label: "Switch off the magnet" }, apply: (s) => ({ ...s, dropped: true }) },
      { id: `t${k}`, title: `Record the time (${h.toFixed(2)} m)`, how: "Copy the timer reading.", magnify: "timer",
        action: { type: "record", fields: [{ key: `t${k}`, label: `Time to fall ${h.toFixed(2)} m`, unit: "s", check: (v, s: Ff) => (near(v, dropTime(s, h), 0.0005) ? true : "Copy the timer reading."), answer: (s: Ff) => fix(dropTime(s, h), 3) }] } },
    ]),
    { id: "g", group: "Analyse", title: "Find g from your graph", how: "h = ½ g t², so the graph of h against t² is a straight line with gradient g ÷ 2. g = 2 × gradient.",
      action: { type: "record", fields: [{ key: "g", label: "g", unit: "m/s²",
        check: (v, _s, values) => { const pts = ffPts(values); if (pts.length < 2) return "Take your readings first."; const want = 2 * fitLine(pts, true).m; return near(v, want, want * 0.03) ? true : "g = 2 × the gradient of h against t²."; },
        answer: (_s, values) => fix(2 * fitLine(ffPts(values), true).m, 2) }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["h / m", "t / s", "t² / s²"], rows: HEIGHTS.map((h, k) => { const t = num(v[`t${k}`] ?? ""); return [fix(h, 2), t != null ? fix(t, 3) : "—", t != null ? fix(t * t, 4) : "—"]; }) }],
  graph: (_s, v) => { const points = ffPts(v); if (!points.length) return null; const { m } = fitLine(points, true); const x = Math.max(...points.map((p) => p[0]));
    return { title: "h against t²", x: "t² / s²", y: "h / m", points, line: points.length > 1 ? [[0, 0], [x, x * m]] : undefined }; },
  conclusion: (s, v) => `The height is proportional to t², so the ball accelerates uniformly. g = ${v.g ?? "…"} m/s² (true value ${fix(s.g, 2)} m/s²); the magnet letting go a little late makes every time slightly too long.`,
};

// ── Waves in a ripple tank ────────────────────────────────────────────────
type Wv = { v: number; on: boolean; f: number };
const FREQS = [10, 15, 20];
export const tenWaves = (s: { v: number }, f: number) => round((s.v / f) * 100 * 10, 1); // cm
const wvSpeeds = (v: Record<string, string>) => FREQS.map((f, k) => { const L = num(v[`L${k}`] ?? ""); return L ? f * (L / 10 / 100) : null; }).filter((x): x is number => x != null);
export const waves: Practical<Wv> = {
  slug: "waves", title: "Waves in a ripple tank", subject: "physics",
  aim: "Measure the wavelength of water waves at different frequencies, and use v = f λ to find their speed.",
  safety: ["Water and electricity: keep the power supply away from the tank, and mop spills.", "The strobe light can trigger epilepsy — warn the class first."],
  init: (r) => ({ v: between(r, 0.22, 0.3, 3), on: false, f: 5 }),
  layout: (s) => [
    { id: "tank", kind: "ripple-tank", x: 580, y: BENCH, label: "Ripple tank — waves seen on the paper below", props: { on: s.on, f: s.f, lambda: (s.v / s.f) * 100 } },
    { id: "gen", kind: "signal-gen", x: 1170, y: BENCH, label: "Signal generator", props: { on: s.on, f: s.f } },
  ],
  steps: [
    { id: "on", group: "Set up", title: "Switch on the lamp and the vibrating bar", how: "The lamp above the tank shines through the waves, making bright and dark lines on the paper underneath.",
      action: { type: "tap", item: "gen", label: "Switch on" }, apply: (s) => ({ ...s, on: true }) },
    ...FREQS.flatMap((f, k): Step<Wv>[] => [
      { id: `f${k}`, group: k === 0 ? "Take readings" : undefined, title: `Set the frequency to ${f} Hz`, how: "Turn the signal generator's dial.",
        action: { type: "set", item: "gen", label: "Frequency", min: 5, max: 25, step: 1, unit: "Hz", target: f, tolerance: 0.5 }, apply: (s, v) => ({ ...s, f: v ?? f }) },
      { id: `L${k}`, title: `Measure 10 wavelengths (${f} Hz)`, how: "The waves start at the 0 mark. Read the ruler at the 10th bright line — the length of 10 waves, to the nearest millimetre.", magnify: "tank", magnifyAt: { x: 1150, y: 230 },
        action: { type: "record", fields: [{ key: `L${k}`, label: `Length of 10 waves at ${f} Hz`, unit: "cm", check: (v, s: Wv) => (near(v, tenWaves(s, f), 0.15) ? true : "Read the ruler at the 10th bright line."), answer: (s: Wv) => fix(tenWaves(s, f), 1) }] } },
    ]),
    { id: "v", group: "Analyse", title: "Work out the wave speed", how: "λ = length ÷ 10 (in metres). v = f × λ for each frequency; take the mean.",
      action: { type: "record", fields: [{ key: "v", label: "Wave speed", unit: "m/s", check: (v, _s, values) => { const sp = wvSpeeds(values); if (!sp.length) return "Take your readings first."; const want = mean(sp); return near(v, want, want * 0.05) ? true : "v = f × λ, with λ in metres."; },
        answer: (_s, values) => fix(mean(wvSpeeds(values)), 3) }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["f / Hz", "10 λ / cm", "λ / m", "v / m s⁻¹"], rows: FREQS.map((f, k) => { const L = num(v[`L${k}`] ?? ""); return [String(f), L != null ? fix(L, 1) : "—", L != null ? fix(L / 1000, 4) : "—", L != null ? fix((f * L) / 1000, 3) : "—"]; }) }],
  conclusion: (s, v) => `Higher frequency gives shorter waves, but f × λ stays the same: the waves travel at ${v.v ?? "…"} m/s (true value ${fix(s.v, 3)} m/s). The speed depends on the water's depth, not the frequency.`,
};

export const PHYSICS: Practical[] = [pendulum, hooke, density, moments, refraction, lens, heating, specificHeat, freeFall, waves];
export { SHELF };
