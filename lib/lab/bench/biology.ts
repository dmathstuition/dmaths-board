// Biology practicals on the lab bench (see lib/lab/bench/types.ts).
import { BENCH, SHELF, between, fix, near, num, round, type Practical, type Step } from "@/lib/lab/bench/types";

const vals = (v: Record<string, string>, keys: string[]) => keys.map((k) => num(v[k] ?? ""));

// ── Photosynthesis: pondweed and light intensity ───────────────────────────
type Ps = { d: number; secs: number; noise: number[]; run: number };
const DIST = [10, 20, 30, 40];
const PLANT_X = 1000, CM = 10;
export const bubblesPerMin = (s: Ps, i: number) => { const L = 100 / DIST[i] ** 2; return Math.max(1, Math.round((60 * L) / (L + 0.3)) + s.noise[i]); };
const psPts = (v: Record<string, string>) => DIST.map((d, i) => [round(10000 / d ** 2, 1), num(v[`n${i}`] ?? "")] as const).filter((p): p is readonly [number, number] => p[1] != null).map(([x, y]) => [x, y] as [number, number]);
export const photosynthesis: Practical<Ps> = {
  slug: "photosynthesis", title: "Photosynthesis: light intensity", subject: "biology",
  aim: "Count the bubbles of oxygen given off by pondweed with a lamp at different distances, and find how light intensity affects the rate of photosynthesis.",
  safety: ["The lamp gets hot — don't touch the bulb.", "Keep water away from the lamp's plug and cable."],
  init: (r) => ({ d: 50, secs: 0, noise: DIST.map(() => Math.round((r() - 0.5) * 2)), run: -1 }),
  layout: (s) => {
    const rate = s.run >= 0 ? bubblesPerMin(s, s.run) : 0;
    return [
      { id: "plant", kind: "pondweed", x: PLANT_X, y: BENCH, label: "Pondweed in a boiling tube", props: { rate: s.secs > 0 && s.secs < 60 ? rate : s.run >= 0 ? rate * 0.6 : 3, ruler: true } },
      { id: "lamp", kind: "lamp", x: PLANT_X - s.d * CM - 55, y: BENCH, z: 2, label: "Lamp", props: { on: true } },
      { id: "tally", kind: "tally", x: 1230, y: BENCH, label: "Bubble counter", props: { count: s.run >= 0 ? Math.floor((rate * s.secs) / 60) : 0 } },
      { id: "watch", kind: "stopwatch", x: 1230, y: SHELF, label: "Stopwatch", props: { t: s.secs } },
    ];
  },
  steps: [
    ...DIST.flatMap((d, i): Step<Ps>[] => [
      { id: `d${i}`, group: i === 0 ? "Count bubbles" : undefined, title: `Put the lamp ${d} cm from the pondweed`, how: "Slide the lamp along the ruler. Then leave it 2 minutes so the plant adjusts to the new light.",
        action: { type: "set", item: "lamp", label: "Distance from the pondweed", min: 5, max: 50, step: 1, unit: "cm", target: d, tolerance: 0.5, start: 50 }, apply: (s, v) => ({ ...s, d: v ?? d, run: i, secs: 0 }) },
      { id: `c${i}`, title: "Count the bubbles for 1 minute", how: "Count each bubble of gas that leaves the cut end of the stem.",
        action: { type: "wait", label: "Count for 1 minute", minutes: 1 }, apply: (s) => ({ ...s, secs: 0.01 }),
        tick: (s, sec) => ({ ...s, secs: Math.min(60, s.secs + sec * 15) }), finished: (s) => s.secs >= 60 },
      { id: `n${i}`, title: `Record the count (${d} cm)`, how: "Copy the bubble counter.", magnify: "tally",
        action: { type: "record", fields: [{ key: `n${i}`, label: `Bubbles per minute at ${d} cm`, check: (v, s: Ps) => (near(v, bubblesPerMin(s, i), 0.01) ? true : "Copy the counter."), answer: (s: Ps) => String(bubblesPerMin(s, i)) }] } },
    ]),
    { id: "concl", group: "Conclusion", title: "What does light intensity do?", how: "Light intensity ∝ 1 ÷ distance². Look at your graph.",
      action: { type: "record", fields: [
        { key: "trend", label: "As the lamp gets closer, the rate", options: ["increases", "decreases", "stays the same"], check: (v) => (v === "increases" ? true : "Compare your counts."), answer: () => "increases" },
        { key: "level", label: "The graph levels off because", options: ["another factor (CO₂ or temperature) becomes limiting", "the plant runs out of light", "the lamp is too far away"], check: (v) => (v === "another factor (CO₂ or temperature) becomes limiting" ? true : "When more light doesn't help, something else is in short supply."), answer: () => "another factor (CO₂ or temperature) becomes limiting" },
      ] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Distance / cm", "Light intensity (10000 ÷ d²)", "Bubbles per minute"], rows: DIST.map((d, i) => [String(d), fix(10000 / d ** 2, 1), v[`n${i}`] ?? "—"]) }],
  graph: (_s, v) => { const points = psPts(v); return points.length ? { title: "Rate against light intensity", x: "light intensity (10000 ÷ d²)", y: "bubbles per minute", points } : null; },
  conclusion: () => "The closer the lamp, the more light the pondweed gets and the faster it photosynthesises, giving off more oxygen. At high light intensity the rate levels off: another factor, such as carbon dioxide or temperature, becomes limiting.",
};

// ── Enzymes: amylase and temperature ───────────────────────────────────────
type Ez = { opt: number; T: number; run: number; secs: number };
const TEMPS = [20, 30, 40, 50, 60];
export const starchGone = (s: { opt: number }, T: number) => { const r = T <= s.opt ? Math.exp(-(((T - s.opt) / 14) ** 2)) : Math.exp(-(((T - s.opt) / 7) ** 2)); return Math.min(600, Math.ceil(60 / Math.max(r, 1e-6) / 30) * 30); };
const ezPts = (v: Record<string, string>) => TEMPS.map((T, i) => [T, num(v[`t${i}`] ?? "")] as const).filter((p): p is readonly [number, number] => !!p[1]).map(([T, t]) => [T, round(1000 / t, 2)] as [number, number]);
const bestT = (v: Record<string, string>) => { const pts = TEMPS.map((T, i) => [T, num(v[`t${i}`] ?? "")] as const).filter((p) => p[1] != null) as [number, number][]; return pts.length ? pts.reduce((a, b) => (b[1] < a[1] ? b : a))[0] : null; };
export const enzymes: Practical<Ez> = {
  slug: "enzymes", title: "Enzymes: amylase and temperature", subject: "biology",
  aim: "Time how long amylase takes to break down starch at different temperatures, testing with iodine every 30 seconds, and find its optimum temperature.",
  safety: ["Wear eye protection; iodine stains and irritates.", "Take care with the hot water bath."],
  init: (r) => ({ opt: Math.round(between(r, 36, 44, 0)), T: 20, run: -1, secs: 0 }),
  layout: (s) => {
    const t = s.run >= 0 ? starchGone(s, TEMPS[s.run]) : 0, done = Math.floor(s.secs / 30);
    return [
      { id: "iodine", kind: "dropper", x: 130, y: SHELF, label: "Iodine", props: { liquid: "#B45309", text: "Iodine\nsolution", amber: true } },
      { id: "amylase", kind: "bottle", x: 250, y: SHELF, label: "Amylase", props: { liquid: "#F8FAFC", text: "Amylase\n1%", cap: "#16A34A" } },
      { id: "starch", kind: "bottle", x: 370, y: SHELF, label: "Starch", props: { liquid: "#F1F5F9", text: "Starch\n1%", cap: "#64748B" } },
      { id: "tile", kind: "spot-tile-20", x: 420, y: BENCH, label: "Spotting tile (a drop every 30 s)", props: { wells: Array.from({ length: 20 }, (_, k) => (k < done && s.run >= 0 ? ((k + 1) * 30 < t ? "#1E1B4B" : "#C2731B") : "#F1F5F9")) } },
      { id: "bath", kind: "water-bath", x: 820, y: BENCH, label: "Water bath", props: { temp: s.T, on: s.T > 20 } },
      { id: "tube", kind: "rack", x: 820, y: BENCH - 62, z: 3, props: { tubes: [{ label: "", level: 0.55, colour: "#F1F5F9" }] } },
      { id: "watch", kind: "stopwatch", x: 1160, y: BENCH, label: "Stopwatch", props: { t: s.secs } },
    ];
  },
  steps: [
    ...TEMPS.flatMap((T, i): Step<Ez>[] => [
      { id: `T${i}`, group: i === 0 ? "Time each temperature" : undefined, title: `Set the water bath to ${T} °C`, how: "Put tubes of amylase and starch in the bath to warm up for 5 minutes before mixing.",
        action: { type: "set", item: "bath", label: "Water bath temperature", min: 15, max: 70, step: 1, unit: "°C", target: T, tolerance: 0.5, start: 20 }, apply: (s, v) => ({ ...s, T: v ?? T, run: i, secs: 0 }) },
      { id: `mix${i}`, title: "Mix them, and test a drop every 30 seconds", how: "Add the amylase to the starch and start the clock. Every 30 s put a drop on the spotting tile with iodine: blue-black means starch is still there.",
        action: { type: "wait", label: "Mix and test every 30 s", minutes: 0 }, apply: (s) => ({ ...s, secs: 0 }),
        tick: (s, sec) => ({ ...s, secs: Math.min(starchGone(s, T), s.secs + sec * 120) }), finished: (s) => s.secs >= starchGone(s, T),
        note: (s) => (starchGone(s, T) >= 600 ? "Still blue-black after 10 minutes: at this temperature the amylase has been denatured." : "The iodine stayed orange-brown: all the starch has been digested.") },
      { id: `t${i}`, title: `Record the time (${T} °C)`, how: "The time of the first drop that stayed orange-brown (or 600 s if it never did).",
        action: { type: "record", fields: [{ key: `t${i}`, label: `Time at ${T} °C`, unit: "s", check: (v, s: Ez) => (near(v, starchGone(s, T), 0.5) ? true : "Count the blue-black wells: each one is 30 s."), answer: (s: Ez) => String(starchGone(s, T)) }] } },
    ]),
    { id: "opt", group: "Conclusion", title: "Find the optimum temperature", how: "The optimum is where the starch disappeared fastest.",
      action: { type: "record", fields: [{ key: "opt", label: "Optimum temperature", unit: "°C", check: (v, _s, values) => { const b = bestT(values); return b != null && near(v, b, 5) ? true : "Which temperature had the shortest time?"; }, answer: (_s, values) => String(bestT(values) ?? 40) }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Temperature / °C", "Time / s", "Rate (1000 ÷ t) / s⁻¹"], rows: TEMPS.map((T, i) => { const t = num(v[`t${i}`] ?? ""); return [String(T), t != null ? String(t) : "—", t ? fix(1000 / t, 2) : "—"]; }) }],
  graph: (_s, v) => { const points = ezPts(v); return points.length ? { title: "Rate against temperature", x: "temperature / °C", y: "1000 ÷ time / s⁻¹", points } : null; },
  conclusion: (s, v) => `Amylase works fastest at about ${v.opt ?? "…"} °C (its true optimum here was ${s.opt} °C). Below it, molecules collide less often; above it, the enzyme's active site changes shape (it is denatured), so starch no longer fits.`,
};

// ── Transpiration: the potometer ───────────────────────────────────────────
type Tp = { base: number; cond: number; secs: number; noise: number[] };
export const CONDS = ["Still air", "Moving air (fan)", "Bright light (lamp)", "Humid (plastic bag)"];
const FACTOR = [1, 2.4, 1.7, 0.35];
export const moved = (s: Tp, i: number) => Math.max(1, Math.round(s.base * FACTOR[i] + s.noise[i]));
export const potometer: Practical<Tp> = {
  slug: "transpiration", title: "Transpiration: the potometer", subject: "biology",
  aim: "Measure how far an air bubble moves in a potometer in 5 minutes, and find how wind, light and humidity affect the rate of water uptake by a leafy shoot.",
  safety: ["Cut the shoot under water with care — scalpels are sharp.", "Keep water away from the lamp and fan."],
  init: (r) => ({ base: Math.round(between(r, 10, 14, 0)), cond: -1, secs: 0, noise: CONDS.map(() => Math.round((r() - 0.5) * 2)) }),
  layout: (s) => [
    { id: "pot", kind: "potometer", x: 620, y: BENCH, label: "Potometer with a leafy shoot", props: { mm: s.cond >= 0 ? (moved(s, s.cond) * s.secs) / 300 : 0, bag: s.cond === 3, name: "potometer" } },
    { id: "fan", kind: "fan", x: 230, y: BENCH, label: "Fan", props: { on: s.cond === 1 } },
    { id: "lamp", kind: "lamp", x: 1110, y: BENCH, label: "Lamp", props: { on: s.cond === 2, flip: true } },
    { id: "watch", kind: "stopwatch", x: 1260, y: SHELF, label: "Stopwatch", props: { t: s.secs } },
  ],
  steps: [
    ...CONDS.flatMap((c, i): Step<Tp>[] => [
      { id: `set${i}`, group: i === 0 ? "Measure each condition" : undefined, title: i === 0 ? "Set the bubble to 0 in still air" : i === 1 ? "Switch on the fan" : i === 2 ? "Fan off — switch on the lamp" : "Lamp off — cover the shoot with a plastic bag",
        how: "Open the reservoir tap to push the bubble back to 0, then close it.", action: { type: "tap", item: i === 1 ? "fan" : i === 2 ? "lamp" : "pot", label: i === 0 ? "Reset the bubble" : i === 1 ? "Switch on the fan" : i === 2 ? "Switch on the lamp" : "Cover with a bag" },
        apply: (s) => ({ ...s, cond: i, secs: 0 }) },
      { id: `w${i}`, title: "Leave it for 5 minutes", how: "The leaves lose water by evaporation, so the shoot pulls water — and the bubble — along the tube.",
        action: { type: "wait", label: "Wait 5 minutes", minutes: 5 }, tick: (s, sec) => ({ ...s, secs: Math.min(300, s.secs + sec * 100) }), finished: (s) => s.secs >= 300 },
      { id: `d${i}`, title: `How far did the bubble move? (${c.toLowerCase()})`, how: "Read the scale at the bubble, in mm.", magnify: "pot", magnifyAt: { x: 1000, y: 200 },
        action: { type: "record", fields: [{ key: `d${i}`, label: `Distance moved — ${c.toLowerCase()}`, unit: "mm", check: (v, s: Tp) => (near(v, moved(s, i), 0.5) ? true : "Read the scale at the bubble's left edge."), answer: (s: Tp) => String(moved(s, i)) }] } },
    ]),
    { id: "concl", group: "Conclusion", title: "Compare the conditions", how: "Faster bubble = faster transpiration.",
      action: { type: "record", fields: [
        { key: "fast", label: "Fastest water loss", options: CONDS, check: (v) => (v === CONDS[1] ? true : "Which moved the bubble furthest?"), answer: () => CONDS[1] },
        { key: "why", label: "The bag slowed it because", options: ["the humid air lowers the water concentration gradient", "the bag blocks the light", "the bag keeps the shoot cold"], check: (v) => (v === "the humid air lowers the water concentration gradient" ? true : "Think about diffusion of water vapour out of the leaf."), answer: () => "the humid air lowers the water concentration gradient" },
      ] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Condition", "Distance in 5 min / mm", "Rate / mm per min"], rows: CONDS.map((c, i) => { const d = num(v[`d${i}`] ?? ""); return [c, d != null ? String(d) : "—", d != null ? fix(d / 5, 1) : "—"]; }) }],
  conclusion: () => "Moving air and bright light speed up transpiration (wind carries water vapour away; light opens the stomata). Humid air slows it, because the air outside the leaf is already full of water vapour.",
};

// ── Cells: preparing an onion slide and using a microscope ───────────────
type Mc = { n: number; best: number; peeled: boolean; onSlide: boolean; stained: boolean; covered: boolean; onStage: boolean; light: boolean; obj: number; focus: number };
export const microscope: Practical<Mc> = {
  slug: "cells", title: "Cells: onion cells under a microscope", subject: "biology",
  aim: "Prepare a stained slide of onion epidermis, focus it under a light microscope, and estimate the length of one cell.",
  safety: ["Iodine stains and irritates — wear eye protection.", "Never point the microscope's mirror at the Sun.", "Take care with the sharp edges of slides and coverslips."],
  init: (r) => ({ n: Math.round(between(r, 8, 12, 0)), best: Math.round(between(r, 30, 70, 0)), peeled: false, onSlide: false, stained: false, covered: false, onStage: false, light: false, obj: 4, focus: 0 }),
  layout: (s) => [
    { id: "iodine", kind: "dropper", x: 130, y: SHELF, label: "Iodine", props: { liquid: "#B45309", text: "Iodine\nsolution", amber: true } },
    { id: "onion", kind: "onion", x: 170, y: BENCH, label: "Onion" },
    { id: "forceps", kind: "forceps", x: 320, y: BENCH, z: 3, label: "Forceps", props: { skin: s.peeled && !s.onSlide } },
    { id: "slide", kind: "slide", x: 500, y: BENCH, hidden: s.onStage, z: 2, label: "Slide", props: { skin: s.onSlide, stained: s.stained, covered: s.covered } },
    { id: "cover", kind: "coverslip", x: 650, y: BENCH, hidden: s.covered, label: "Coverslip" },
    { id: "scope", kind: "microscope", x: 950, y: BENCH, label: "Light microscope", props: { slide: s.onStage, stained: s.stained, light: s.light, obj: s.obj, focus: s.focus, best: s.best, n: s.n } },
  ],
  steps: [
    { id: "peel", group: "Prepare the slide", title: "Peel a thin layer of onion skin", how: "Drag the forceps onto the onion to peel the thin epidermis from the inside of a layer.", action: { type: "drag", item: "forceps", onto: "onion" }, apply: (s) => ({ ...s, peeled: true }) },
    { id: "lay", title: "Lay it flat on the slide", how: "Drag the forceps to the slide; spread the skin flat in a drop of water without folds.", action: { type: "drag", item: "forceps", onto: "slide" }, apply: (s) => ({ ...s, onSlide: true }) },
    { id: "stain", title: "Add a drop of iodine", how: "Drag the iodine onto the slide. It stains the cells so you can see them.", action: { type: "drag", item: "iodine", onto: "slide", pour: true }, apply: (s) => ({ ...s, stained: true }) },
    { id: "cover", title: "Lower a coverslip onto it", how: "Drag the coverslip onto the slide; lower it at an angle so no air bubbles are trapped.", action: { type: "drag", item: "cover", onto: "slide" }, apply: (s) => ({ ...s, covered: true }) },
    { id: "stage", group: "Use the microscope", title: "Put the slide on the stage", how: "Drag the slide onto the microscope's stage and hold it with the clips.", action: { type: "drag", item: "slide", onto: "scope" }, apply: (s) => ({ ...s, onStage: true }) },
    { id: "light", title: "Switch on the light", how: "Switch on the lamp under the stage.", action: { type: "tap", item: "scope", label: "Switch on the light" }, apply: (s) => ({ ...s, light: true, focus: 0 }) },
    { id: "obj", title: "Turn to the ×10 objective", how: "Start with the lowest power to find the cells, then click the ×10 objective into place.", action: { type: "tap", item: "scope", label: "Turn to ×10" }, apply: (s) => ({ ...s, obj: 10 }) },
    { id: "focus", title: "Focus on the cells", how: "Turn the focus knob slowly, watching through the eyepiece, until the cells are sharp.", magnify: "scope",
      action: { type: "set", item: "scope", label: "Focus knob", min: 0, max: 100, step: 1, unit: "", target: 50, tolerance: 3, targetOf: (s: Mc) => s.best, hint: "Still blurred — turn the focus knob slowly until the cells are sharp." },
      apply: (s, v) => ({ ...s, focus: v ?? s.best }) },
    { id: "mag", group: "Observe", title: "Work out the total magnification", how: "Total magnification = eyepiece (×10) × objective (×10).",
      action: { type: "record", fields: [{ key: "mag", label: "Total magnification", unit: "×", check: (v) => (near(v, 100, 0) ? true : "Multiply the eyepiece by the objective."), answer: () => "100" }] } },
    { id: "count", title: "Count the cells across the field of view", how: "Count how many cells lie end to end along the line across the middle of the view.", magnify: "scope",
      action: { type: "record", fields: [{ key: "n", label: "Cells across the field", check: (v, s: Mc) => (near(v, s.n, 0) ? true : "Count the cells the line passes through, end to end."), answer: (s: Mc) => String(s.n) }] } },
    { id: "len", title: "Estimate the length of one cell", how: "At ×100 the field of view is 1.6 mm (1600 μm) across. Cell length = 1600 ÷ number of cells.",
      action: { type: "record", fields: [{ key: "len", label: "Length of one cell", unit: "μm", check: (v, _s, values) => { const [n] = vals(values, ["n"]); if (!n) return "Count the cells first."; return near(v, 1600 / n, (1600 / n) * 0.05) ? true : "1600 ÷ the number of cells."; }, answer: (_s, values) => fix(1600 / (num(values.n ?? "") || 1), 0) }] } },
    { id: "parts", title: "Name what you see", how: "Think about what iodine stains and what onion cells don't have.",
      action: { type: "record", fields: [
        { key: "dark", label: "Stained darkest", options: ["Nucleus", "Cell wall", "Vacuole", "Cytoplasm"], check: (v) => (v === "Nucleus" ? true : "Look for the dark dot in each cell."), answer: () => "Nucleus" },
        { key: "none", label: "Onion skin cells have no", options: ["Chloroplasts", "Cell wall", "Nucleus", "Cytoplasm"], check: (v) => (v === "Chloroplasts" ? true : "Onion skin grows underground, out of the light."), answer: () => "Chloroplasts" },
      ] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["", "Value"], rows: [["Magnification", v.mag ? `×${v.mag}` : "—"], ["Cells across 1600 μm", v.n ?? "—"], ["Length of one cell / μm", v.len ?? "—"], ["Stained darkest", v.dark ?? "—"]] }],
  conclusion: (s, v) => `Onion epidermis cells are long, box-shaped plant cells with a cell wall, cytoplasm, a large vacuole and a nucleus (stained darkest by iodine), but no chloroplasts. Each is about ${v.len ?? "…"} μm long (true value ${fix(1600 / s.n, 0)} μm).`,
};

export const BIOLOGY: Practical[] = [photosynthesis, enzymes, potometer, microscope];
