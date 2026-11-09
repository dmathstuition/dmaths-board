// More practicals on the lab bench: four each for physics, chemistry and biology.
import { BENCH, SHELF, between, fitLine, fix, near, num, round, type Practical, type Rand, type Step } from "@/lib/lab/bench/types";
import { mix } from "@/lib/lab/bench/practicals";
import type { Shape } from "@/lib/lab/bench/maths";

const vals = (v: Record<string, string>, keys: string[]) => keys.map((k) => num(v[k] ?? ""));
const pts = (xs: number[], v: Record<string, string>, key: (i: number) => string) => xs.map((x, i) => [x, num(v[key(i)] ?? "")] as const).filter((p): p is readonly [number, number] => p[1] != null).map(([a, b]) => [a, b] as [number, number]);
function shuffle<T>(r: Rand, xs: T[]): T[] { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)) % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ════════════════════════════ PHYSICS ════════════════════════════════════

// ── Resistance of a wire and its length ───────────────────────────────────
type Wr = { r: number; L: number; on: boolean };
const WLEN = [20, 40, 60, 80, 100];
const ampsAt = (s: Wr, L = s.L) => round(2 / (s.r * L), 2);
export const wireResistance: Practical<Wr> = {
  slug: "wire-resistance", title: "Resistance of a wire", subject: "physics",
  aim: "Measure the current through different lengths of constantan wire at 2.0 V, work out each resistance, and find how resistance depends on length.",
  safety: ["The wire can get hot — switch off between readings.", "Keep the p.d. low (2 V)."],
  init: (r) => ({ r: between(r, 0.08, 0.14, 3), L: 50, on: false }),
  layout: (s) => [
    { id: "psu", kind: "power-supply", x: 260, y: SHELF, label: "Power supply (2.0 V)", props: { on: s.on, volts: 2 } },
    { id: "amm", kind: "meter", x: 700, y: SHELF, label: "Ammeter", props: { unit: "A", reading: s.on ? fix(ampsAt(s), 2) : "", on: s.on } },
    { id: "volt", kind: "meter", x: 1000, y: SHELF, label: "Voltmeter", props: { unit: "V", reading: s.on ? "2.00" : "", on: s.on } },
    { id: "board", kind: "wire-board", x: 720, y: BENCH, label: "Constantan wire along a metre rule", props: { L: s.L, on: s.on, name: "crocodile clip" } },
  ],
  steps: [
    { id: "on", group: "Set up", title: "Switch on", how: "The fixed clip is at 0 cm; the sliding crocodile clip sets the length of wire in the circuit.", action: { type: "tap", item: "psu", label: "Switch on" }, apply: (s) => ({ ...s, on: true }) },
    ...WLEN.flatMap((L, i): Step<Wr>[] => [
      { id: `L${i}`, group: i === 0 ? "Take readings" : undefined, title: `Move the crocodile clip to ${L} cm`, how: "Slide the clip along the wire.",
        action: { type: "set", item: "board", label: "Clip position", min: 10, max: 100, step: 5, unit: "cm", target: L, tolerance: 0, start: 50 }, apply: (s, v) => ({ ...s, L: v ?? L }) },
      { id: `r${i}`, title: `Record the current and work out R (${L} cm)`, how: "Read the ammeter. The voltmeter reads 2.00 V. R = V ÷ I.", magnify: "amm",
        action: { type: "record", fields: [
          { key: `I${i}`, label: `Current at ${L} cm`, unit: "A", check: (v, s: Wr) => (near(v, ampsAt(s, L), 0.005) ? true : "Copy the ammeter."), answer: (s: Wr) => fix(ampsAt(s, L), 2) },
          { key: `R${i}`, label: `Resistance at ${L} cm`, unit: "Ω", check: (v, _s, values) => { const I = num(values[`I${i}`] ?? ""); return I ? (near(v, 2 / I, (2 / I) * 0.02) ? true : "2.00 ÷ the current.") : "Read the current first."; }, answer: (_s, values) => fix(2 / (num(values[`I${i}`] ?? "") || 1), 2) },
        ] } },
    ]),
    { id: "grad", group: "Analyse", title: "Find the resistance per centimetre", how: "R against length is a straight line through the origin. Its gradient is the resistance of 1 cm of wire.",
      action: { type: "record", fields: [{ key: "g", label: "Resistance per cm", unit: "Ω/cm", check: (v, _s, values) => { const p = pts(WLEN, values, (i) => `R${i}`); if (p.length < 2) return "Take your readings first."; const m = fitLine(p, true).m; return near(v, m, m * 0.04) ? true : "Gradient = R ÷ length, e.g. R at 100 cm ÷ 100."; }, answer: (_s, values) => fix(fitLine(pts(WLEN, values, (i) => `R${i}`), true).m, 3) }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Length / cm", "I / A", "R / Ω"], rows: WLEN.map((L, i) => [String(L), v[`I${i}`] ?? "—", v[`R${i}`] ?? "—"]) }],
  graph: (_s, v) => { const points = pts(WLEN, v, (i) => `R${i}`); if (!points.length) return null; const { m } = fitLine(points, true); return { title: "Resistance against length", x: "length / cm", y: "R / Ω", points, line: points.length > 1 ? [[0, 0], [100, 100 * m]] : undefined }; },
  conclusion: (s, v) => `Resistance is directly proportional to length: twice the wire, twice the resistance — the electrons collide with twice as many ions. This wire has ${v.g ?? "…"} Ω per cm (true value ${fix(s.r, 3)}).`,
};

// ── Electromagnets: number of turns ───────────────────────────────────────
type Em = { k: number; turns: number; on: boolean; picked: number | null; noise: number[] };
const TURNS = [10, 20, 30, 40, 50];
const clipsAt = (s: Em, i: number) => Math.max(0, Math.round(s.k * TURNS[i]) + s.noise[i]);
export const electromagnet: Practical<Em> = {
  slug: "electromagnet", title: "Electromagnets: turns of wire", subject: "physics",
  aim: "Wind different numbers of turns of wire round an iron nail, and count how many paperclips the electromagnet can pick up.",
  safety: ["The coil gets warm — switch off between readings.", "Keep the current at 2 A or less."],
  init: (r) => ({ k: between(r, 0.18, 0.26, 3), turns: 10, on: false, picked: null, noise: TURNS.map(() => Math.round((r() - 0.5) * 2)) }),
  layout: (s) => [
    { id: "psu", kind: "power-supply", x: 260, y: SHELF, label: "Power supply (2 A)", props: { on: s.on, volts: 3 } },
    { id: "magnet", kind: "electromagnet", x: 700, y: BENCH, label: "Iron nail with a coil, over a dish of paperclips", props: { turns: s.turns, on: s.on, picked: s.picked, name: "electromagnet" } },
  ],
  steps: [
    ...TURNS.flatMap((n, i): Step<Em>[] => [
      { id: `n${i}`, group: i === 0 ? "Test each coil" : undefined, title: `Wind ${n} turns of wire`, how: "Wind the insulated wire neatly round the nail, all in the same direction.",
        action: { type: "set", item: "magnet", label: "Turns of wire", min: 0, max: 60, step: 5, unit: "turns", target: n, tolerance: 0, start: 0 }, apply: (s, v) => ({ ...s, turns: v ?? n, on: false, picked: null }) },
      { id: `p${i}`, title: "Switch on and dip it into the paperclips", how: "Lower the nail into the dish, then lift it straight up.",
        action: { type: "tap", item: "magnet", label: "Switch on & lift" }, apply: (s) => ({ ...s, on: true, picked: clipsAt(s, i) }) },
      { id: `c${i}`, title: `Count the paperclips (${n} turns)`, how: "Count the paperclips hanging from the nail.", magnify: "magnet",
        action: { type: "record", fields: [{ key: `c${i}`, label: `Paperclips with ${n} turns`, check: (v, s: Em) => (near(v, clipsAt(s, i), 0) ? true : "Count again in the close-up."), answer: (s: Em) => String(clipsAt(s, i)) }] } },
    ]),
    { id: "concl", group: "Conclusion", title: "What makes the electromagnet stronger?", how: "Look at your graph.",
      action: { type: "record", fields: [
        { key: "trend", label: "More turns makes it", options: ["stronger", "weaker", "no different"], check: (v) => (v === "stronger" ? true : "Compare the counts."), answer: () => "stronger" },
        { key: "other", label: "It would also be stronger with", options: ["a bigger current", "a plastic core", "thinner insulation"], check: (v) => (v === "a bigger current" ? true : "What else increases the magnetic field?"), answer: () => "a bigger current" },
      ] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Turns", "Paperclips"], rows: TURNS.map((n, i) => [String(n), v[`c${i}`] ?? "—"]) }],
  graph: (_s, v) => { const points = pts(TURNS, v, (i) => `c${i}`); return points.length ? { title: "Paperclips picked up against turns", x: "turns", y: "paperclips", points } : null; },
  conclusion: () => "More turns of wire make a stronger magnetic field, so the electromagnet picks up more paperclips. A bigger current or a soft iron core also makes it stronger; switching off makes it lose its magnetism.",
};

// ── Insulation: which material keeps water hot? ────────────────────────────
type In = { k: number[]; poured: boolean; min: number; log: number[][] };
export const MATS = ["No insulation", "Newspaper", "Cotton wool"];
const ROOM = 22, HOT = 80;
const tempOf = (s: In, i: number, t = s.min) => round(ROOM + (HOT - ROOM) * Math.exp(-s.k[i] * t), 1);
export const insulation: Practical<In> = {
  slug: "insulation", title: "Insulation: keeping water hot", subject: "physics",
  aim: "Fill three beakers with hot water — one bare, one wrapped in newspaper, one in cotton wool — and find which loses heat most slowly.",
  safety: ["Hot water scalds: pour carefully and keep the beakers on a heatproof mat."],
  init: (r) => ({ k: [between(r, 0.04, 0.05, 4), between(r, 0.025, 0.031, 4), between(r, 0.012, 0.017, 4)], poured: false, min: 0, log: [] }),
  layout: (s) => [
    { id: "kettle", kind: "kettle", x: 200, y: BENCH, label: "Kettle (80 °C water)", props: { liquid: "#BFDBFE" } },
    ...MATS.map((m, i) => ({ id: `b${i}`, kind: "insulated-beaker", x: 520 + i * 240, y: BENCH, label: m, props: { mat: i, T: s.poured ? tempOf(s, i) : ROOM, filled: s.poured, name: "beakers" } })),
    { id: "watch", kind: "stopwatch", x: 1240, y: SHELF, label: "Stopwatch", props: { t: s.min * 60 } },
  ],
  steps: [
    { id: "pour", group: "Start", title: "Pour 200 cm³ of hot water into each beaker", how: "Drag the kettle onto the beakers. Same volume, same starting temperature — a fair test.", action: { type: "drag", item: "kettle", onto: "b1", pour: true }, apply: (s) => ({ ...s, poured: true, min: 0, log: [[0, ...MATS.map((_, i) => tempOf(s, i, 0))]] }) },
    { id: "T0", title: "Read the starting temperature", how: "Read the thermometer in the bare beaker.", magnify: "b0",
      action: { type: "record", fields: [{ key: "T0", label: "Starting temperature", unit: "°C", check: (v) => (near(v, HOT, 0.5) ? true : "Read where the red liquid stops."), answer: () => String(HOT) }] } },
    { id: "cool", group: "Cool", title: "Leave them for 10 minutes", how: "The temperatures are recorded every 2 minutes.", action: { type: "wait", label: "Wait 10 minutes", minutes: 10 },
      tick: (s, sec) => { const min = Math.min(10, s.min + sec * 3), log = [...s.log]; for (let m = log.length * 2; m <= Math.floor(min); m += 2) log.push([m, ...MATS.map((_, i) => tempOf(s, i, m))]); return { ...s, min, log }; }, finished: (s) => s.min >= 10 },
    ...MATS.map((m, i): Step<In> => ({ id: `T${i + 1}`, group: i === 0 ? "After 10 minutes" : undefined, title: `Read the temperature: ${m.toLowerCase()}`, how: "Read the thermometer to the nearest 0.5 °C.", magnify: `b${i}`,
      action: { type: "record", fields: [{ key: `T${i + 1}`, label: `${m} after 10 min`, unit: "°C", check: (v, s: In) => (near(v, tempOf(s, i, 10), 0.5) ? true : "Read where the red liquid stops."), answer: (s: In) => fix(tempOf(s, i, 10), 1) }] } })),
    { id: "best", group: "Conclusion", title: "Which is the best insulator?", how: "The best insulator lost the least heat.",
      action: { type: "record", fields: [
        { key: "best", label: "Best insulator", options: MATS, check: (v) => (v === "Cotton wool" ? true : "Which water cooled the least?"), answer: () => "Cotton wool" },
        { key: "why", label: "It works because it", options: ["traps air, which is a poor conductor", "is white, so reflects heat", "is soft"], check: (v) => (v.startsWith("traps air") ? true : "What's in the gaps between the fibres?"), answer: () => "traps air, which is a poor conductor" },
      ] } },
  ],
  results: (s) => [{ title: "Temperature / °C", columns: ["Time / min", ...MATS], rows: s.log.map(([t, ...T]) => [String(t), ...T.map((x) => fix(x, 1))]) }],
  graph: (s) => (s.log.length ? { title: "Cooling curves", x: "time / min", y: "temperature / °C", label: MATS[0], points: s.log.map((r) => [r[0], r[1]] as [number, number]), more: [1, 2].map((i) => ({ label: MATS[i], points: s.log.map((r) => [r[0], r[i + 1]] as [number, number]) })) } : null),
  conclusion: () => "All three cooled, fastest at first when they were hottest. The cotton wool beaker lost least heat: the air trapped between its fibres is a poor conductor and can't move to carry heat away by convection.",
};

// ── Terminal velocity in oil ───────────────────────────────────────────────
type Tv = { v: number[]; ball: number | null; prog: number; dropped: number[] };
const SECT = 20, FACT = [1.38, 1.04, 1.0, 1.0];
export const lapTimes = (s: { v: number[] }, b: number) => FACT.map((f) => round((SECT / s.v[b]) * f, 2));
export const terminalVelocity: Practical<Tv> = {
  slug: "terminal-velocity", title: "Terminal velocity in oil", subject: "physics",
  aim: "Drop ball bearings into a tall tube of oil, time them between bands 20 cm apart, and find their terminal velocity.",
  safety: ["Wipe up any oil spills — they're slippery.", "Get the balls out with a magnet, not your fingers."],
  init: (r) => { const v1 = between(r, 8, 12, 1); return { v: [v1, round(v1 * between(r, 1.6, 1.9, 2), 1)], ball: null, prog: 0, dropped: [] }; },
  layout: (s) => [
    { id: "small", kind: "ball", x: 300, y: BENCH, label: "Small ball", hidden: s.dropped.includes(0), props: { size: 7, name: "small ball bearing" } },
    { id: "big", kind: "ball", x: 400, y: BENCH, label: "Big ball", hidden: s.dropped.includes(1), props: { size: 11, name: "big ball bearing" } },
    { id: "tube", kind: "oil-tube", x: 700, y: BENCH, label: "Tube of oil with bands every 20 cm", props: { ball: s.ball, prog: s.prog, big: s.ball === 1, name: "tube of oil" } },
    { id: "timer", kind: "lap-timer", x: 1060, y: BENCH, label: "Lap timer", props: { laps: s.ball == null ? [] : lapTimes(s, s.ball).slice(0, Math.floor(s.prog * 4 + 1e-9)) } },
  ],
  steps: [
    ...[0, 1].flatMap((b): Step<Tv>[] => [
      { id: `drop${b}`, group: b === 0 ? "Small ball" : "Big ball", title: `Drop the ${b ? "big" : "small"} ball into the oil`, how: "Hold it just above the oil and let go. Press the lap button as it passes each band.",
        action: { type: "drag", item: b ? "big" : "small", onto: "tube" }, apply: (s) => ({ ...s, ball: b, prog: 0, dropped: [...s.dropped, b] }) },
      { id: `fall${b}`, title: "Time it between the bands", how: "Watch it fall to the bottom.", action: { type: "wait", label: "Watch it fall", minutes: 0 },
        tick: (s, sec) => ({ ...s, prog: Math.min(1, s.prog + sec * 0.3) }), finished: (s) => s.prog >= 1 },
      { id: `t${b}`, title: `Record the lap times (${b ? "big" : "small"} ball)`, how: "Copy the time for each 20 cm section, then work out the terminal velocity = 20 cm ÷ the time once the times stop changing.", magnify: "timer",
        action: { type: "record", fields: [
          ...[0, 1, 2, 3].map((k) => ({ key: `t${b}${k}`, label: `Section ${k + 1}`, unit: "s", check: (v: string, s: Tv) => (near(v, lapTimes(s, b)[k], 0.005) ? true : "Copy the lap timer."), answer: (s: Tv) => fix(lapTimes(s, b)[k], 2) })),
          { key: `v${b}`, label: "Terminal velocity", unit: "cm/s", check: (v: string, _s: Tv, values: Record<string, string>) => { const t = num(values[`t${b}3`] ?? ""); return t ? (near(v, SECT / t, (SECT / t) * 0.03) ? true : "20 ÷ the time for the last section.") : "Copy the times first."; }, answer: (_s: Tv, values: Record<string, string>) => fix(SECT / (num(values[`t${b}3`] ?? "") || 1), 1) },
        ] } },
    ]),
    { id: "concl", group: "Conclusion", title: "Explain what you found", how: "Think about the forces on the ball.",
      action: { type: "record", fields: [
        { key: "why", label: "It stops speeding up because", options: ["drag + upthrust grow until they balance its weight", "the oil gets thicker lower down", "gravity gets weaker"], check: (v) => (v.startsWith("drag") ? true : "When are the forces balanced?"), answer: () => "drag + upthrust grow until they balance its weight" },
        { key: "big", label: "The bigger ball's terminal velocity is", options: ["higher", "lower", "the same"], check: (v) => (v === "higher" ? true : "Compare your two terminal velocities."), answer: () => "higher" },
      ] } },
  ],
  results: (_s, v) => [{ title: "Lap times / s", columns: ["Ball", "0–20 cm", "20–40", "40–60", "60–80", "Terminal v / cm s⁻¹"], rows: [0, 1].map((b) => [b ? "Big" : "Small", ...[0, 1, 2, 3].map((k) => v[`t${b}${k}`] ?? "—"), v[`v${b}`] ?? "—"]) }],
  conclusion: () => "Each ball speeds up at first, then falls at a steady terminal velocity once the drag and upthrust balance its weight. The bigger ball is heavier for its size, so it needs more drag — a higher speed — to balance.",
};

// ════════════════════════════ CHEMISTRY ══════════════════════════════════

// ── Temperature change when an acid is neutralised ─────────────────────────
type Nt = { T0: number; veq: number; vol: number };
const NVOL = [5, 10, 15, 20, 25, 30];
const tempAfter = (s: Nt, V = s.vol) => round(s.T0 + (14.6 * Math.min(V, s.veq)) / (25 + V), 1);
export const neutralisation: Practical<Nt> = {
  slug: "neutralisation", title: "Neutralisation: temperature change", subject: "chemistry",
  aim: "Add sodium hydroxide 5 cm³ at a time to 25 cm³ of 2.0 mol/dm³ hydrochloric acid in a polystyrene cup, and use the temperature to find the volume that neutralises it.",
  safety: ["Wear eye protection — both are corrosive.", "Stir with the thermometer gently, or use a stirrer."],
  init: (r) => ({ T0: Math.round(between(r, 18, 23, 0)), veq: round(between(r, 16, 24, 1), 1), vol: 0 }),
  layout: (s) => [
    { id: "naoh", kind: "bottle", x: 250, y: SHELF, label: "NaOH (aq)", props: { liquid: "#F0F9FF", text: "NaOH\n? mol/dm³", cap: "#2563EB" } },
    { id: "cup", kind: "poly-cup", x: 640, y: BENCH, label: "25 cm³ HCl in a polystyrene cup", props: { T: tempAfter(s), vol: 25 + s.vol, name: "cup" } },
    { id: "added", kind: "measuring-cylinder", x: 960, y: BENCH, label: "NaOH added (cm³)", props: { vol: s.vol, liquid: "#BFDBFE" } },
  ],
  steps: [
    { id: "T0", group: "Start", title: "Read the temperature of the acid", how: "Read the thermometer in the cup.", magnify: "cup",
      action: { type: "record", fields: [{ key: "T0", label: "Starting temperature", unit: "°C", check: (v, s: Nt) => (near(v, s.T0, 0.5) ? true : "Read where the red liquid stops."), answer: (s: Nt) => String(s.T0) }] } },
    ...NVOL.flatMap((V, i): Step<Nt>[] => [
      { id: `add${i}`, group: i === 0 ? "Add the alkali" : undefined, title: `Add 5 cm³ of sodium hydroxide (${V} cm³ in all)`, how: "Drag the sodium hydroxide onto the cup, put the lid on and stir.", action: { type: "drag", item: "naoh", onto: "cup", pour: true }, apply: (s) => ({ ...s, vol: V }) },
      { id: `T${i + 1}`, title: `Record the highest temperature (${V} cm³)`, how: "Read the thermometer when it stops rising.", magnify: "cup",
        action: { type: "record", fields: [{ key: `T${i + 1}`, label: `Temperature after ${V} cm³`, unit: "°C", check: (v, s: Nt) => (near(v, tempAfter(s, V), 0.2) ? true : "Read the thermometer to the nearest 0.1 °C."), answer: (s: Nt) => fix(tempAfter(s, V), 1) }] } },
    ]),
    { id: "veq", group: "Analyse", title: "Find the volume that neutralised the acid", how: "On the graph, draw a line through the rising points and one through the falling points. They cross at the neutralisation point. Then: moles of HCl = 2.0 × 25 ÷ 1000; concentration of NaOH = moles ÷ (volume ÷ 1000).",
      action: { type: "record", fields: [
        { key: "veq", label: "Volume of NaOH at the peak", unit: "cm³", check: (v, s: Nt) => (near(v, s.veq, 3) ? true : "Where do the two lines on the graph cross?"), answer: (s: Nt) => fix(s.veq, 1) },
        { key: "c", label: "Concentration of NaOH", unit: "mol/dm³", check: (v, _s, values) => { const V = num(values.veq ?? ""); if (!V) return "Find the volume first."; const c = 50 / V; return near(v, c, c * 0.03) ? true : "0.050 mol ÷ (volume in dm³)."; }, answer: (_s, values) => fix(50 / (num(values.veq ?? "") || 1), 2) },
      ] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["NaOH added / cm³", "Temperature / °C"], rows: [0, ...NVOL].map((V, i) => [String(V), v[`T${i}`] ?? "—"]) }],
  graph: (_s, v) => { const points = pts([0, ...NVOL], v, (i) => `T${i}`); return points.length ? { title: "Temperature against volume of NaOH", x: "NaOH added / cm³", y: "temperature / °C", points } : null; },
  conclusion: (s, v) => `Neutralisation is exothermic: the temperature rises until the acid is used up (about ${v.veq ?? "…"} cm³; true value ${fix(s.veq, 1)} cm³), then falls as cold alkali is added with nothing left to react.`,
};

// ── Making copper sulfate crystals ─────────────────────────────────────────
type Cs = { lit: boolean; added: number; filtered: boolean; onTripod: boolean; evap: number; days: number };
export const crystals: Practical<Cs> = {
  slug: "salts", title: "Making copper sulfate crystals", subject: "chemistry",
  aim: "Make pure, dry crystals of copper(II) sulfate from copper(II) oxide and dilute sulfuric acid.",
  safety: ["Wear eye protection; copper compounds are harmful.", "Don't boil the solution dry — it spits."],
  init: () => ({ lit: false, added: 0, filtered: false, onTripod: false, evap: 0, days: 0 }),
  layout: (s) => [
    { id: "cuo", kind: "dish", x: 160, y: BENCH, label: "Copper(II) oxide", props: { colour: "#111827", piece: "powder", name: "copper oxide" } },
    { id: "burner", kind: "bunsen", x: 420, y: BENCH, label: "Bunsen, tripod and gauze", props: { lit: s.lit && (!s.filtered || (s.onTripod && s.evap < 1)), air: 100 } },
    { id: "tripod", kind: "tripod", x: 420, y: BENCH, z: 1 },
    { id: "acid", kind: "beaker", x: 420, y: BENCH - 246, z: 3, hidden: s.filtered, label: "", props: { vol: 70, max: 250, colour: s.added ? mix("#E0F2FE", "#2563EB", Math.min(1, s.added / 2)) : "#E0F2FE", liquid: "#3B82F6", sediment: s.added >= 3 ? "#111827" : undefined, name: "beaker of acid" } },
    { id: "filter", kind: "filter", x: 820, y: BENCH, label: "Filter funnel over an evaporating basin", props: { used: s.filtered } },
    { id: "basin", kind: "basin", x: s.onTripod ? 420 : 820, y: s.onTripod ? BENCH - 246 : BENCH, z: 3, label: "", props: { filled: s.filtered, evap: s.evap, crystals: s.days / 3, name: "evaporating basin" } },
  ],
  steps: [
    { id: "warm", group: "React", title: "Warm the sulfuric acid", how: "Light the Bunsen under the tripod to warm 50 cm³ of dilute sulfuric acid (don't boil it).", action: { type: "tap", item: "burner", label: "Light the Bunsen" }, apply: (s) => ({ ...s, lit: true }) },
    ...[1, 2, 3].map((n): Step<Cs> => ({ id: `add${n}`, title: n < 3 ? "Add a spatula of copper(II) oxide and stir" : "Add one more spatula", how: "Drag the copper oxide onto the beaker.",
      action: { type: "drag", item: "cuo", onto: "acid" }, apply: (s) => ({ ...s, added: n }),
      note: () => (n < 3 ? "The black powder dissolves and the solution turns blue." : "Some black powder stays undissolved: all the acid has reacted.") })),
    { id: "why1", title: "Why add copper oxide until no more dissolves?", how: "Think about what's left in the beaker.",
      action: { type: "record", fields: [{ key: "why1", label: "So that", options: ["all the acid is used up", "the solution turns blue faster", "it reacts more slowly"], check: (v) => (v === "all the acid is used up" ? true : "Excess oxide means no acid is left."), answer: () => "all the acid is used up" }] } },
    { id: "filter", group: "Filter", title: "Filter out the excess copper oxide", how: "Drag the beaker onto the filter funnel. The blue solution (the filtrate) runs into the evaporating basin.", action: { type: "drag", item: "acid", onto: "filter", pour: true }, apply: (s) => ({ ...s, filtered: true }) },
    { id: "left", title: "What's left in the filter paper?", how: "Look at the filter paper.",
      action: { type: "record", fields: [{ key: "left", label: "The residue is", options: ["excess copper(II) oxide", "copper sulfate crystals", "sulfuric acid"], check: (v) => (v === "excess copper(II) oxide" ? true : "It's black…"), answer: () => "excess copper(II) oxide" }] } },
    { id: "move", group: "Crystallise", title: "Put the basin on the tripod", how: "Drag the evaporating basin onto the tripod.", action: { type: "drag", item: "basin", onto: "tripod" }, apply: (s) => ({ ...s, onTripod: true }) },
    { id: "evap", title: "Heat it to evaporate some of the water", how: "Heat gently until about half the water has gone — stop before crystals appear.", action: { type: "wait", label: "Evaporate", minutes: 5 },
      tick: (s, sec) => ({ ...s, evap: Math.min(1, s.evap + sec / 3) }), finished: (s) => s.evap >= 1 },
    { id: "cool", title: "Leave it to cool and crystallise", how: "Leave the basin somewhere warm for a few days.", action: { type: "wait", label: "Leave for 3 days", minutes: 4320 },
      tick: (s, sec) => ({ ...s, days: Math.min(3, s.days + sec) }), finished: (s) => s.days >= 3, note: () => "Blue diamond-shaped crystals have grown. Pat them dry with filter paper." },
    { id: "what", group: "Conclusion", title: "What did you make?", how: "Look at the basin.",
      action: { type: "record", fields: [
        { key: "look", label: "The product", options: ["blue crystals", "a white powder", "black crystals"], check: (v) => (v === "blue crystals" ? true : "Look at the basin."), answer: () => "blue crystals" },
        { key: "eq", label: "The reaction", options: ["copper oxide + sulfuric acid → copper sulfate + water", "copper oxide + sulfuric acid → copper + water", "copper oxide + sulfuric acid → copper sulfate + hydrogen"], check: (v) => (v.endsWith("copper sulfate + water") ? true : "Metal oxide + acid → salt + ?"), answer: () => "copper oxide + sulfuric acid → copper sulfate + water" },
      ] } },
  ],
  results: (_s, v) => [{ title: "Observations", columns: ["", "You recorded"], rows: [["Why excess oxide", v.why1 ?? "—"], ["Residue", v.left ?? "—"], ["Product", v.look ?? "—"]] }],
  conclusion: () => "An insoluble base (copper oxide) neutralises the acid: copper oxide + sulfuric acid → copper sulfate + water. Adding excess makes sure no acid is left; filtering removes the excess; slow crystallisation gives large, pure crystals.",
};

// ── Measuring gas with a gas syringe ───────────────────────────────────────
type Gs = { Vmax: number; k: number; run: number | null; t: number; logs: [number, number][][] };
export const FORMS = ["Marble chips", "Powdered marble"];
const gasAt = (s: Gs, run: number, t: number) => round(s.Vmax * (1 - Math.exp(-s.k * (run ? 3.5 : 1) * t)), 0);
export const gasSyringe: Practical<Gs> = {
  slug: "gas-syringe", title: "Rate of reaction: gas syringe", subject: "chemistry",
  aim: "Collect the carbon dioxide from marble (calcium carbonate) and acid in a gas syringe every 30 seconds, and compare chips with powder.",
  safety: ["Wear eye protection.", "Make sure the syringe plunger moves freely, so pressure can't build up."],
  init: (r) => ({ Vmax: Math.round(between(r, 80, 90, 0)), k: between(r, 0.012, 0.016, 4), run: null, t: 0, logs: [[], []] }),
  layout: (s) => [
    ...FORMS.map((f, i) => ({ id: `m${i}`, kind: "dish", x: 160 + i * 110, y: BENCH, label: f, hidden: s.logs[i].length > 0, props: { colour: "#F1F5F9", piece: i ? "powder" : "granules", name: f.toLowerCase() } })),
    { id: "flask", kind: "gas-flask", x: 560, y: BENCH, label: "Acid in a flask, bung and tube", props: { fizz: s.run != null && s.t < 180 ? (s.run ? 3 : 2) : 0, solid: s.run, name: "flask" } },
    { id: "syringe", kind: "gas-syringe", x: 900, y: BENCH, label: "Gas syringe (cm³)", props: { V: s.run == null ? 0 : gasAt(s, s.run, s.t) } },
    { id: "watch", kind: "stopwatch", x: 1230, y: SHELF, label: "Stopwatch", props: { t: s.t } },
  ],
  steps: [
    ...FORMS.flatMap((f, i): Step<Gs>[] => [
      { id: `add${i}`, group: f, title: `Add the ${f.toLowerCase()} and put the bung in`, how: "Same mass (2 g) each time, with 50 cm³ of the same acid. Start the stopwatch.", action: { type: "drag", item: `m${i}`, onto: "flask" }, apply: (s) => ({ ...s, run: i, t: 0 }) },
      { id: `go${i}`, title: "Read the syringe every 30 seconds for 3 minutes", how: "The readings go into your table.", action: { type: "wait", label: "Time 3 minutes", minutes: 3 },
        tick: (s, sec) => { const t = Math.min(180, s.t + sec * 40), logs = s.logs.map((l) => [...l]); for (let x = logs[i].length * 30; x <= Math.floor(t); x += 30) logs[i].push([x, gasAt(s, i, x)]); return { ...s, t, logs }; }, finished: (s) => s.t >= 180 },
      { id: `r${i}`, title: `Read the final volume (${f.toLowerCase()})`, how: "Read the syringe scale at the end of the plunger. Then work out the mean rate in the first minute = volume at 60 s ÷ 60.", magnify: "syringe",
        action: { type: "record", fields: [
          { key: `V${i}`, label: "Volume after 3 min", unit: "cm³", check: (v, s: Gs) => (near(v, gasAt(s, i, 180), 1) ? true : "Read the scale at the plunger."), answer: (s: Gs) => String(gasAt(s, i, 180)) },
          { key: `rate${i}`, label: "Rate in the first minute", unit: "cm³/s", check: (v, s: Gs) => { const w = gasAt(s, i, 60) / 60; return near(v, w, w * 0.04) ? true : "Volume at 60 s (from your table) ÷ 60."; }, answer: (s: Gs) => fix(gasAt(s, i, 60) / 60, 2) },
        ] } },
    ]),
    { id: "concl", group: "Conclusion", title: "Compare chips and powder", how: "Look at both curves.",
      action: { type: "record", fields: [
        { key: "fast", label: "Faster reaction", options: FORMS, check: (v) => (v === FORMS[1] ? true : "Which curve is steeper at the start?"), answer: () => FORMS[1] },
        { key: "why", label: "Because powder has", options: ["a larger surface area, so more collisions each second", "more particles altogether", "a higher temperature"], check: (v) => (v.startsWith("a larger surface") ? true : "Think about how much of the solid the acid can touch."), answer: () => "a larger surface area, so more collisions each second" },
      ] } },
  ],
  results: (s) => [{ title: "Volume of gas / cm³", columns: ["Time / s", ...FORMS], rows: (s.logs[0].length >= s.logs[1].length ? s.logs[0] : s.logs[1]).map(([t], k) => [String(t), s.logs[0][k] ? String(s.logs[0][k][1]) : "—", s.logs[1][k] ? String(s.logs[1][k][1]) : "—"]) }],
  graph: (s) => (s.logs[0].length ? { title: "Volume of gas against time", x: "time / s", y: "volume / cm³", label: FORMS[0], points: s.logs[0], more: s.logs[1].length ? [{ label: FORMS[1], points: s.logs[1] }] : [] } : null),
  conclusion: () => "The powder reacts much faster (steeper curve) because its larger surface area means more collisions with acid particles each second. Both end at the same volume, because the same mass of marble reacted.",
};

// ── Tests for ions ──────────────────────────────────────────────────────────
type Io = { cat: number[]; an: number[]; naoh: boolean; ag: boolean };
export const CATIONS = [{ ion: "Cu²⁺", ppt: "#2563EB", seen: "Blue precipitate" }, { ion: "Fe²⁺", ppt: "#4D7C0F", seen: "Green precipitate" }, { ion: "Fe³⁺", ppt: "#B45309", seen: "Orange-brown precipitate" }];
export const ANIONS = [{ ion: "Cl⁻", ppt: "#F8FAFC", seen: "White precipitate" }, { ion: "Br⁻", ppt: "#FEF3C7", seen: "Cream precipitate" }, { ion: "I⁻", ppt: "#FDE047", seen: "Yellow precipitate" }];
export const ionTests: Practical<Io> = {
  slug: "ion-tests", title: "Testing for ions", subject: "chemistry",
  aim: "Identify the metal ions in three solutions with sodium hydroxide, and the halide ions in three more with silver nitrate.",
  safety: ["Wear eye protection; sodium hydroxide is corrosive.", "Silver nitrate stains skin — wear gloves."],
  init: (r) => ({ cat: shuffle(r, [0, 1, 2]), an: shuffle(r, [0, 1, 2]), naoh: false, ag: false }),
  layout: (s) => [
    { id: "naoh", kind: "dropper", x: 160, y: SHELF, label: "NaOH (aq)", props: { liquid: "#F8FAFC", text: "Sodium\nhydroxide" } },
    { id: "ag", kind: "dropper", x: 290, y: SHELF, label: "HNO₃ then AgNO₃", props: { liquid: "#F8FAFC", text: "Nitric acid\n+ AgNO₃", amber: true } },
    { id: "rack1", kind: "rack", x: 560, y: BENCH, label: "Tubes A, B, C", props: { name: "tubes A–C", tubes: s.cat.map((c, k) => ({ label: "ABC"[k], level: 0.45, colour: c === 0 ? "#BFDBFE" : c === 1 ? "#ECFCCB" : "#FEF3C7", ppt: s.naoh ? CATIONS[c].ppt : undefined })) } },
    { id: "rack2", kind: "rack", x: 920, y: BENCH, label: "Tubes D, E, F", props: { name: "tubes D–F", tubes: s.an.map((a, k) => ({ label: "DEF"[k], level: 0.45, colour: "#F1F5F9", ppt: s.ag ? ANIONS[a].ppt : undefined })) } },
  ],
  steps: [
    { id: "naoh", group: "Metal ions", title: "Add sodium hydroxide to tubes A–C", how: "Drag the sodium hydroxide onto the rack — a few drops in each.", action: { type: "drag", item: "naoh", onto: "rack1", pour: true }, apply: (s) => ({ ...s, naoh: true }) },
    { id: "cat", title: "Identify the metal ion in each tube", how: "Blue = copper(II), green = iron(II), orange-brown = iron(III).",
      action: { type: "record", fields: [0, 1, 2].map((k) => ({ key: `c${k}`, label: `Tube ${"ABC"[k]}`, options: CATIONS.map((c) => c.ion), check: (v: string, s: Io) => (v === CATIONS[s.cat[k]].ion ? true : `It's a ${CATIONS[s.cat[k]].seen.toLowerCase()}.`), answer: (s: Io) => CATIONS[s.cat[k]].ion })) } },
    { id: "ag", group: "Halide ions", title: "Add nitric acid, then silver nitrate, to tubes D–F", how: "Drag the dropper onto the rack.", action: { type: "drag", item: "ag", onto: "rack2", pour: true }, apply: (s) => ({ ...s, ag: true }) },
    { id: "an", title: "Identify the halide ion in each tube", how: "White = chloride, cream = bromide, yellow = iodide.",
      action: { type: "record", fields: [0, 1, 2].map((k) => ({ key: `a${k}`, label: `Tube ${"DEF"[k]}`, options: ANIONS.map((a) => a.ion), check: (v: string, s: Io) => (v === ANIONS[s.an[k]].ion ? true : `It's a ${ANIONS[s.an[k]].seen.toLowerCase()}.`), answer: (s: Io) => ANIONS[s.an[k]].ion })) } },
    { id: "why", title: "Why add nitric acid first?", how: "Think about what else silver ions could react with.",
      action: { type: "record", fields: [{ key: "why", label: "To", options: ["remove carbonate ions, which would also make a precipitate", "make the colours brighter", "dissolve the precipitate"], check: (v) => (v.startsWith("remove carbonate") ? true : "Carbonates react with acid…"), answer: () => "remove carbonate ions, which would also make a precipitate" }] } },
  ],
  results: (s, v) => [{ title: "Results", columns: ["Tube", "Ion"], rows: [...[0, 1, 2].map((k) => [`${"ABC"[k]}`, v[`c${k}`] ?? "—"]), ...[0, 1, 2].map((k) => [`${"DEF"[k]}`, v[`a${k}`] ?? "—"])] }],
  conclusion: () => "Metal hydroxide precipitates identify metal ions: Cu²⁺ blue, Fe²⁺ green, Fe³⁺ orange-brown. Silver halide precipitates identify halide ions: Cl⁻ white, Br⁻ cream, I⁻ yellow.",
};

// ════════════════════════════ BIOLOGY ════════════════════════════════════

// ── Respiration in yeast ───────────────────────────────────────────────────
type Ys = { opt: number; peak: number; T: number; run: number; secs: number };
const YT = [20, 30, 40, 50, 60];
export const yeastRate = (s: { opt: number; peak: number }, T: number) => Math.max(0, Math.round(s.peak * (T <= s.opt ? Math.exp(-(((T - s.opt) / 13) ** 2)) : Math.exp(-(((T - s.opt) / 8) ** 2)))));
export const yeast: Practical<Ys> = {
  slug: "yeast", title: "Respiration in yeast", subject: "biology",
  aim: "Count the bubbles of carbon dioxide given off by yeast in glucose solution at different temperatures, and find the temperature where it respires fastest.",
  safety: ["Take care with the hot water bath.", "Limewater is an irritant — wear eye protection."],
  init: (r) => ({ opt: Math.round(between(r, 35, 40, 0)), peak: Math.round(between(r, 28, 38, 0)), T: 20, run: -1, secs: 0 }),
  layout: (s) => {
    const rate = s.run >= 0 ? yeastRate(s, YT[s.run]) : 0;
    return [
      { id: "bath", kind: "water-bath", x: 560, y: BENCH, label: "Water bath", props: { temp: s.T, on: s.T > 20 } },
      { id: "tube", kind: "yeast-tube", x: 560, y: BENCH - 62, z: 3, props: { rate: s.secs > 0 && s.secs < 60 ? rate : 0, cloudy: Math.min(1, s.run >= 0 ? 0.25 * (s.run + 1) : 0) } },
      { id: "tally", kind: "tally", x: 1000, y: BENCH, label: "Bubble counter", props: { count: s.run >= 0 ? Math.floor((rate * s.secs) / 60) : 0 } },
      { id: "watch", kind: "stopwatch", x: 1180, y: BENCH, label: "Stopwatch", props: { t: s.secs } },
    ];
  },
  steps: [
    ...YT.flatMap((T, i): Step<Ys> [] => [
      { id: `T${i}`, group: i === 0 ? "Count bubbles" : undefined, title: `Set the water bath to ${T} °C`, how: "Leave the yeast 5 minutes to reach the temperature.",
        action: { type: "set", item: "bath", label: "Water bath temperature", min: 15, max: 70, step: 1, unit: "°C", target: T, tolerance: 0.5, start: 20 }, apply: (s, v) => ({ ...s, T: v ?? T, run: i, secs: 0 }) },
      { id: `c${i}`, title: "Count the bubbles for 1 minute", how: "Count each bubble that comes out of the delivery tube into the limewater.", action: { type: "wait", label: "Count for 1 minute", minutes: 1 }, apply: (s) => ({ ...s, secs: 0.01 }),
        tick: (s, sec) => ({ ...s, secs: Math.min(60, s.secs + sec * 15) }), finished: (s) => s.secs >= 60 },
      { id: `n${i}`, title: `Record the count (${T} °C)`, how: "Copy the bubble counter.", magnify: "tally",
        action: { type: "record", fields: [{ key: `n${i}`, label: `Bubbles per minute at ${T} °C`, check: (v, s: Ys) => (near(v, yeastRate(s, T), 0) ? true : "Copy the counter."), answer: (s: Ys) => String(yeastRate(s, T)) }] } },
    ]),
    { id: "concl", group: "Conclusion", title: "What did you find?", how: "Look at your graph.",
      action: { type: "record", fields: [
        { key: "best", label: "Fastest respiration at", unit: "°C", check: (v, _s, values) => { const p = pts(YT, values, (i) => `n${i}`); const b = p.length ? p.reduce((x, y) => (y[1] > x[1] ? y : x))[0] : 40; return near(v, b, 5) ? true : "Which temperature gave most bubbles?"; }, answer: (_s, values) => { const p = pts(YT, values, (i) => `n${i}`); return String(p.length ? p.reduce((x, y) => (y[1] > x[1] ? y : x))[0] : 40); } },
        { key: "gas", label: "The limewater went cloudy because of", options: ["carbon dioxide", "oxygen", "ethanol"], check: (v) => (v === "carbon dioxide" ? true : "Limewater tests for…"), answer: () => "carbon dioxide" },
      ] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Temperature / °C", "Bubbles per minute"], rows: YT.map((T, i) => [String(T), v[`n${i}`] ?? "—"]) }],
  graph: (_s, v) => { const points = pts(YT, v, (i) => `n${i}`); return points.length ? { title: "Rate of respiration against temperature", x: "temperature / °C", y: "bubbles per minute", points } : null; },
  conclusion: (s) => `Yeast respires fastest at about ${s.opt} °C: glucose → ethanol + carbon dioxide (anaerobic). Warmer speeds up its enzymes until they start to denature; at 60 °C almost no gas is made.`,
};

// ── Testing a leaf for starch ──────────────────────────────────────────────
type Lf = { stage: number; ethanol: number };
export const leafStarch: Practical<Lf> = {
  slug: "leaf-starch", title: "Testing a leaf for starch", subject: "biology",
  aim: "Test a variegated leaf (green and white) for starch, to show that chlorophyll is needed for photosynthesis.",
  safety: ["Ethanol is highly flammable: turn off the Bunsen before you use it, and heat it in a hot water bath.", "Iodine stains — wear gloves and eye protection."],
  init: () => ({ stage: 0, ethanol: 0 }),
  layout: (s) => {
    const at = s.stage === 1 ? { x: 400, y: BENCH - 70 } : s.stage === 2 ? { x: 760, y: BENCH - 150 } : s.stage === 3 ? { x: 400, y: BENCH - 70 } : s.stage >= 4 ? { x: 1080, y: BENCH - 12 } : { x: 170, y: BENCH };
    return [
      { id: "iodine", kind: "dropper", x: 1240, y: SHELF, label: "Iodine", props: { liquid: "#B45309", text: "Iodine\nsolution", amber: true } },
      { id: "leaf", kind: "leaf", x: at.x, y: at.y, z: 4, label: s.stage === 0 ? "Variegated leaf" : "", props: { stage: s.stage, ethanol: s.ethanol, name: "leaf" } },
      { id: "boil", kind: "boiling-beaker", x: 400, y: BENCH, label: "Boiling water", props: { on: s.stage <= 1 || s.stage === 3 } },
      { id: "bath", kind: "water-bath", x: 760, y: BENCH, label: "Hot water bath (no flame)", props: { temp: 80, on: true } },
      { id: "eth", kind: "rack", x: 760, y: BENCH - 62, z: 3, props: { name: "ethanol tube", tubes: [{ label: "", level: 0.6, colour: mix("#F8FAFC", "#4ADE80", s.ethanol) }] } },
      { id: "tile", kind: "tile", x: 1080, y: BENCH, z: 2, label: "White tile" },
    ];
  },
  steps: [
    { id: "boil", group: "Prepare the leaf", title: "Boil the leaf in water for 1 minute", how: "Drag the leaf into the boiling water.", action: { type: "drag", item: "leaf", onto: "boil" }, apply: (s) => ({ ...s, stage: 1 }),
      note: () => "Boiling kills the cells and breaks their membranes, so iodine can get in later." },
    { id: "safe", title: "Why must the Bunsen be off now?", how: "You're about to use ethanol.",
      action: { type: "record", fields: [{ key: "safe", label: "Because ethanol is", options: ["highly flammable", "poisonous to plants", "too cold"], check: (v) => (v === "highly flammable" ? true : "What happens if ethanol vapour meets a flame?"), answer: () => "highly flammable" }] } },
    { id: "eth", title: "Put the leaf in hot ethanol", how: "Drag the leaf into the tube of ethanol standing in the hot water bath.", action: { type: "drag", item: "leaf", onto: "eth" }, apply: (s) => ({ ...s, stage: 2 }) },
    { id: "wait", title: "Leave it for 5 minutes", how: "Watch the leaf and the ethanol.", action: { type: "wait", label: "Wait 5 minutes", minutes: 5 },
      tick: (s, sec) => ({ ...s, ethanol: Math.min(1, s.ethanol + sec / 3) }), finished: (s) => s.ethanol >= 1, note: () => "The ethanol has turned green and the leaf is pale: the chlorophyll has dissolved out." },
    { id: "why", title: "Why use ethanol?", how: "Think about why the colour matters.",
      action: { type: "record", fields: [{ key: "why", label: "Ethanol", options: ["removes the chlorophyll, so the iodine colour shows clearly", "adds starch to the leaf", "kills bacteria"], check: (v) => (v.startsWith("removes") ? true : "What colour did the ethanol turn?"), answer: () => "removes the chlorophyll, so the iodine colour shows clearly" }] } },
    { id: "rinse", group: "Test", title: "Dip it in warm water to soften it", how: "The ethanol makes the leaf brittle. Drag it into the water.", action: { type: "drag", item: "leaf", onto: "boil" }, apply: (s) => ({ ...s, stage: 3 }) },
    { id: "spread", title: "Spread it flat on the white tile", how: "Drag the leaf onto the tile.", action: { type: "drag", item: "leaf", onto: "tile" }, apply: (s) => ({ ...s, stage: 4 }) },
    { id: "iodine", title: "Add iodine solution", how: "Drag the iodine onto the leaf.", action: { type: "drag", item: "iodine", onto: "leaf", pour: true }, apply: (s) => ({ ...s, stage: 5 }) },
    { id: "result", group: "Conclusion", title: "Which parts turned blue-black?", how: "Compare with how the leaf looked at the start.",
      action: { type: "record", fields: [
        { key: "where", label: "Blue-black (starch) where the leaf was", options: ["green", "white", "everywhere"], check: (v) => (v === "green" ? true : "Compare the pattern with the fresh leaf."), answer: () => "green" },
        { key: "concl", label: "So photosynthesis needs", options: ["chlorophyll", "a white tile", "iodine"], check: (v) => (v === "chlorophyll" ? true : "What's in the green parts but not the white?"), answer: () => "chlorophyll" },
      ] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Part of the leaf", "Colour with iodine"], rows: [["Was green", v.where === "green" ? "Blue-black (starch)" : "—"], ["Was white", v.where === "green" ? "Orange-brown (no starch)" : "—"]] }],
  conclusion: () => "Only the parts that were green made starch. The white parts have no chlorophyll, so they can't absorb light for photosynthesis — chlorophyll is needed for photosynthesis.",
};

// ── Sampling with quadrats ──────────────────────────────────────────────────
type Qu = { daisies: [number, number][]; spots: [number, number][]; n: number };
const QM = 64; // px per metre on the field
const inQuad = (s: Qu, i: number) => { const [qx, qy] = s.spots[i]; return s.daisies.filter(([x, y]) => x >= qx && x < qx + 1 && y >= qy && y < qy + 1).length; };
const fieldPx = (x: number, y: number) => ({ x: -320 + x * QM, y: -10 - y * QM });
export const quadrats: Practical<Qu> = {
  slug: "quadrats", title: "Sampling daisies with quadrats", subject: "biology",
  aim: "Throw a 1 m² quadrat at random spots in a 10 m × 5 m field, count the daisies inside, and estimate how many daisies the whole field holds.",
  safety: ["Throw the quadrat gently and low — watch out for other people."],
  init: (r) => {
    const centres = Array.from({ length: 5 }, () => [between(r, 1, 9, 2), between(r, 0.8, 4.2, 2)]), daisies: [number, number][] = [];
    for (const [cx, cy] of centres) for (let k = 0; k < 45; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 1.8; const x = cx + d * Math.cos(a), y = cy + d * Math.sin(a); if (x > 0 && x < 10 && y > 0 && y < 5) daisies.push([round(x, 2), round(y, 2)]); }
    for (let k = 0; k < 70; k++) daisies.push([round(r() * 10, 2), round(r() * 5, 2)]);
    return { daisies, spots: Array.from({ length: 5 }, () => [Math.round(r() * 90) / 10, Math.round(r() * 40) / 10] as [number, number]), n: 0 };
  },
  layout: (s, step) => {
    const shapes: Shape[] = s.daisies.flatMap(([x, y]): Shape[] => { const p = fieldPx(x, y); return [{ k: "circle", cx: p.x, cy: p.y, r: 3.6, fill: "#F8FAFC" }, { k: "circle", cx: p.x, cy: p.y, r: 1.4, fill: "#FACC15" }]; });
    for (let i = 0; i < s.n; i++) { const [qx, qy] = s.spots[i], a = fieldPx(qx, qy + 1); shapes.push({ k: "rect", x: a.x, y: a.y, w: QM, h: QM, c: i === s.n - 1 ? "#F97316" : "#FDBA74" }, { k: "text", x: a.x + 4, y: a.y + 14, t: String(i + 1), size: 12, c: "#FFF7ED" }); }
    const cur = QU_IDS[step]?.startsWith("c") && s.n ? fieldPx(s.spots[s.n - 1][0] + 0.5, s.spots[s.n - 1][1] + 0.5) : null;
    return [{ id: "field", kind: "paper", x: 700, y: BENCH, label: "A 10 m × 5 m field (seen from above)", props: { w: 640, h: 330, style: "grass", shapes, zoom: cur ? { type: "area", at: [cur.x, cur.y], k: 1.6, title: "Close-up · the quadrat" } : null, name: "field" } }];
  },
  steps: [] as Step<Qu>[],
  results: (_s, v) => [{ title: "Daisies per quadrat", columns: ["Quadrat", "Daisies"], rows: [0, 1, 2, 3, 4].map((i) => [String(i + 1), v[`c${i}`] ?? "—"]) }],
  conclusion: (s, v) => `Estimated population = mean per m² × 50 m² ≈ ${v.est ?? "…"} daisies (there are really ${s.daisies.length}). The daisies grow in clumps, so more quadrats give a better estimate.`,
};
const QU_STEPS: Step<Qu>[] = [
  ...[0, 1, 2, 3, 4].flatMap((i): Step<Qu>[] => [
    { id: `q${i}`, group: i === 0 ? "Sample" : undefined, title: `Throw quadrat ${i + 1}`, how: "Use random numbers for the coordinates, so you don't just pick the daisy-rich spots.", action: { type: "tap", item: "field", label: "Place the quadrat" }, apply: (s) => ({ ...s, n: i + 1 }) },
    { id: `c${i}`, title: `Count the daisies in quadrat ${i + 1}`, how: "Count every daisy inside the square. (Count ones on the line only on the top and left edges.)", magnify: "field",
      action: { type: "record", fields: [{ key: `c${i}`, label: `Quadrat ${i + 1}`, check: (v, s: Qu) => (near(v, inQuad(s, i), 0) ? true : "Count again in the close-up."), answer: (s: Qu) => String(inQuad(s, i)) }] } },
  ]),
  { id: "est", group: "Estimate", title: "Estimate the number of daisies in the field", how: "Mean per quadrat (per m²) × area of the field (10 × 5 = 50 m²).",
    action: { type: "record", fields: [
      { key: "mean", label: "Mean per m²", check: (v, _s, values) => { const xs = vals(values, ["c0", "c1", "c2", "c3", "c4"]); if (xs.some((x) => x == null)) return "Count all five first."; const m = xs.reduce((a, b) => (a ?? 0) + (b ?? 0), 0)! / 5; return near(v, m, 0.05) ? true : "Total ÷ 5."; }, answer: (_s, values) => fix(vals(values, ["c0", "c1", "c2", "c3", "c4"]).reduce((a, b) => (a ?? 0) + (b ?? 0), 0)! / 5, 1) },
      { key: "est", label: "Daisies in the field", check: (v, _s, values) => { const m = num(values.mean ?? ""); return m != null && near(v, m * 50, 1) ? true : "Mean × 50."; }, answer: (_s, values) => fix((num(values.mean ?? "") ?? 0) * 50, 0) },
    ] } },
];
const QU_IDS = QU_STEPS.map((x) => x.id);
quadrats.steps = QU_STEPS;

// ── Reaction time: the ruler drop ──────────────────────────────────────────
type Rx = { d: number[]; drops: number; odd: number }; // odd: a writing-hand drop that went wrong (−1: none)
const DROPS = ["Drop 1", "Drop 2", "Drop 3"], NO_ODD = "None — they agree";
const rxMean = (s: Rx, v: Record<string, string>) => { const xs = vals(v, ["d0", "d1", "d2"]).map((x) => x ?? 0).filter((_, i) => i !== s.odd); return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length); };
const HANDS = ["writing hand", "other hand"];
const reactionTime = (dcm: number) => Math.sqrt((2 * dcm) / 100 / 9.8);
export const reactionTimeP: Practical<Rx> = {
  slug: "reaction-time", title: "Reaction time: the ruler drop", subject: "biology",
  aim: "Catch a falling ruler, use the distance it falls to work out your reaction time, and compare your two hands.",
  safety: ["Drop the ruler straight down — don't flick it."],
  init: (r) => {
    const a = between(r, 11, 16, 1), b = a + between(r, 3, 6, 1);
    const d = [a, a, a, b, b, b].map((m) => Math.round((m + (r() - 0.5) * 3) * 2) / 2);
    // Most of the time one writing-hand catch goes wrong: you blinked, or guessed and grabbed early.
    const odd = r() < 0.75 ? Math.floor(r() * 3) % 3 : -1;
    if (odd >= 0) d[odd] = Math.min(28, Math.round((d[odd] + between(r, 7, 10, 1)) * 2) / 2);
    return { d, drops: 0, odd };
  },
  layout: (s) => [{ id: "ruler", kind: "ruler-drop", x: 700, y: BENCH, label: "Your partner drops the ruler; you catch it", props: { d: s.drops ? s.d[s.drops - 1] : 0, drops: s.drops, hand: s.drops > 3 ? 1 : 0 } }],
  steps: [
    ...[0, 1, 2, 3, 4, 5].flatMap((k): Step<Rx>[] => [
      { id: `drop${k}`, group: k === 0 ? "Writing hand" : k === 3 ? "Other hand" : undefined, title: `Drop ${k % 3 + 1} (${HANDS[k < 3 ? 0 : 1]})`, how: "Hold your finger and thumb open level with the 0 mark. Your partner lets go without warning — catch it as fast as you can.",
        action: { type: "tap", item: "ruler", label: "Drop!" }, apply: (s) => ({ ...s, drops: k + 1 }) },
      { id: `d${k}`, title: "Read where you caught it", how: "Read the ruler at the top of your thumb, to the nearest 0.5 cm.", magnify: "ruler",
        action: { type: "record", fields: [{ key: `d${k}`, label: `Distance (drop ${k + 1})`, unit: "cm", check: (v, s: Rx) => (near(v, s.d[k], 0.25) ? true : "Read the ruler level with the top of the thumb."), answer: (s: Rx) => fix(s.d[k], 1) }] } },
    ]),
    { id: "calc", group: "Calculate", title: "Work out the means and your reaction time", how: "First look for an anomaly: a catch far from the others (you blinked, or guessed). Leave it out of the mean. Reaction time t = √(2d ÷ g), with d in metres and g = 9.8 m/s².",
      action: { type: "record", fields: [
        { key: "a0", label: "Anomalous drop (writing hand)", options: [...DROPS, NO_ODD],
          check: (v, s: Rx) => { const want = s.odd >= 0 ? DROPS[s.odd] : NO_ODD; return v === want ? true : want === NO_ODD ? "Are any of the three far from the others?" : "Which catch is well away from the other two?"; },
          answer: (s: Rx) => (s.odd >= 0 ? DROPS[s.odd] : NO_ODD) },
        { key: "m0", label: "Mean distance, writing hand (leave out any anomaly)", unit: "cm", check: (v, s: Rx, values) => { const xs = vals(values, ["d0", "d1", "d2"]); if (xs.some((x) => x == null)) return "Measure first."; if (near(v, rxMean(s, values), 0.05)) return true; return s.odd >= 0 && near(v, (xs[0]! + xs[1]! + xs[2]!) / 3, 0.05) ? "Leave the anomalous drop out of the mean." : "Add the drops you keep and divide by how many there are."; }, answer: (s: Rx, values) => fix(rxMean(s, values), 1) },
        { key: "m1", label: "Mean distance, other hand", unit: "cm", check: (v, _s, values) => { const xs = vals(values, ["d3", "d4", "d5"]); if (xs.some((x) => x == null)) return "Measure first."; return near(v, (xs[0]! + xs[1]! + xs[2]!) / 3, 0.05) ? true : "Add the three and divide by 3."; }, answer: (_s, values) => { const xs = vals(values, ["d3", "d4", "d5"]); return fix(((xs[0] ?? 0) + (xs[1] ?? 0) + (xs[2] ?? 0)) / 3, 1); } },
        { key: "t", label: "Reaction time, writing hand", unit: "s", check: (v, _s, values) => { const m = num(values.m0 ?? ""); if (m == null) return "Find the mean first."; const t = reactionTime(m); return near(v, t, t * 0.03) ? true : "√(2 × d ÷ 9.8) with d in metres (cm ÷ 100)."; }, answer: (_s, values) => fix(reactionTime(num(values.m0 ?? "") ?? 0), 3) },
      ] } },
    { id: "cmp", title: "Compare your hands", how: "A shorter distance means a quicker reaction.",
      action: { type: "record", fields: [{ key: "fast", label: "Quicker hand", options: ["writing hand", "other hand"], check: (v, _s, values) => { const [a, b] = vals(values, ["m0", "m1"]); return v === ((a ?? 0) <= (b ?? 0) ? "writing hand" : "other hand") ? true : "Which mean distance was smaller?"; }, answer: (_s, values) => { const [a, b] = vals(values, ["m0", "m1"]); return (a ?? 0) <= (b ?? 0) ? "writing hand" : "other hand"; } }] } },
  ],
  results: (_s, v) => [{ title: "Distances / cm", columns: ["Hand", "Drop 1", "Drop 2", "Drop 3", "Mean"], rows: [0, 1].map((h) => [HANDS[h], ...[0, 1, 2].map((k) => v[`d${h * 3 + k}`] ?? "—"), v[`m${h}`] ?? "—"]) }],
  conclusion: (_s, v) => `Your writing hand caught the ruler after about ${v.m0 ?? "…"} cm: a reaction time of ${v.t ?? "…"} s. The signal travels eye → sensory neurone → brain → motor neurone → muscle; practice makes the pathway quicker, so your writing hand is usually faster.`,
};

export const MORE: Practical[] = [wireResistance, electromagnet, insulation, terminalVelocity, neutralisation, crystals, gasSyringe, ionTests, yeast, leafStarch, quadrats, reactionTimeP];
export { SHELF };
