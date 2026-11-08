// Chemistry practicals on the lab bench (see lib/lab/bench/types.ts).
import { BENCH, SHELF, between, fitLine, fix, near, num, round, type Practical, type Step } from "@/lib/lab/bench/types";
import { mix } from "@/lib/lab/bench/practicals";

const vals = (v: Record<string, string>, keys: string[]) => keys.map((k) => num(v[k] ?? ""));
const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length) % xs.length];

// ── Rates: the disappearing cross ──────────────────────────────────────────
type Rt = { k: number; noise: number[]; vol: number; run: number; acid: boolean; t: number };
const VOLS = [50, 40, 30, 20];
const crossTime = (s: Rt, i: number) => round((s.k * 50) / VOLS[i] + s.noise[i], 1);
const ratePts = (v: Record<string, string>) => VOLS.map((V, i) => [V, num(v[`t${i}`] ?? "")] as const).filter((p): p is readonly [number, number] => !!p[1]).map(([V, t]) => [V, round(1000 / t, 1)] as [number, number]);
export const rates: Practical<Rt> = {
  slug: "rates", title: "Rates of reaction: the disappearing cross", subject: "chemistry",
  aim: "Find how the concentration of sodium thiosulfate affects the rate of its reaction with hydrochloric acid, timing how long a cross takes to disappear.",
  safety: ["Wear eye protection.", "The reaction gives off sulfur dioxide — work in a ventilated room, and pour the mixture away straight after."],
  init: (r) => ({ k: between(r, 18, 26, 1), noise: VOLS.map(() => round((r() - 0.5) * 1.2, 1)), vol: 0, run: -1, acid: false, t: 0 }),
  layout: (s) => {
    const T = s.run >= 0 ? crossTime(s, s.run) : 1, cloud = s.acid ? Math.min(1, s.t / T) : 0;
    return [
      { id: "thio", kind: "bottle", x: 130, y: SHELF, label: "Thiosulfate", props: { liquid: "#F1F5F9", text: "Na₂S₂O₃\n40 g/dm³", cap: "#0EA5E9" } },
      { id: "acid", kind: "bottle", x: 250, y: SHELF, label: "Acid", props: { liquid: "#E0F2FE", text: "HCl\n2 mol/dm³", cap: "#DC2626" } },
      { id: "water", kind: "bottle", x: 370, y: SHELF, label: "Water", props: { liquid: "#DBEAFE", text: "Distilled\nwater", cap: "#64748B" } },
      { id: "flask", kind: "flask", x: 640, y: BENCH, label: "Flask on a paper cross", props: { vol: s.vol ? 50 + (s.acid ? 10 : 0) : 0, colour: mix("#E0F2FE", "#FBF3D5", cloud), cloud, cross: true } },
      { id: "watch", kind: "stopwatch", x: 940, y: BENCH, label: "Stopwatch", props: { t: s.acid ? s.t : 0 } },
    ];
  },
  steps: [
    ...VOLS.flatMap((V, i): Step<Rt>[] => [
      { id: `v${i}`, group: i === 0 ? "Timing runs" : undefined, title: `Make up ${V} cm³ of thiosulfate to 50 cm³`, how: `Measure ${V} cm³ of sodium thiosulfate and ${50 - V} cm³ of water, and pour them into the clean flask on the cross.`,
        action: { type: "set", item: "flask", label: "Volume of thiosulfate", min: 10, max: 50, step: 5, unit: "cm³", target: V, tolerance: 0.1, start: 50 },
        apply: (s, v) => ({ ...s, vol: v ?? V, run: i, acid: false, t: 0 }) },
      { id: `a${i}`, title: "Add the acid and start the stopwatch", how: "Drag the hydrochloric acid onto the flask (10 cm³), swirl once, and start timing.",
        action: { type: "drag", item: "acid", onto: "flask", pour: true }, apply: (s) => ({ ...s, acid: true, t: 0 }) },
      { id: `w${i}`, title: "Watch the cross from above", how: "Look down through the flask. Stop the clock when you can no longer see the cross.", magnify: "flask",
        action: { type: "wait", label: "Watch until the cross disappears", minutes: 0 },
        tick: (s, sec) => ({ ...s, t: Math.min(crossTime(s, i), round(s.t + sec * 12, 1)) }), finished: (s) => s.t >= crossTime(s, i),
        note: () => "A pale yellow cloud of sulfur forms and hides the cross." },
      { id: `t${i}`, title: `Record the time (${V} cm³)`, how: "Copy the stopwatch reading.", magnify: "watch",
        action: { type: "record", fields: [{ key: `t${i}`, label: `Time with ${V} cm³ of thiosulfate`, unit: "s", check: (v, s: Rt) => (near(v, crossTime(s, i), 0.05) ? true : "Copy the stopwatch."), answer: (s: Rt) => fix(crossTime(s, i), 1) }] } },
    ]),
    { id: "concl", group: "Conclusion", title: "What does concentration do to the rate?", how: "Rate ∝ 1 ÷ time. Look at your graph.",
      action: { type: "record", fields: [{ key: "concl", label: "As the concentration goes up, the rate", options: ["goes up (proportionally)", "goes down", "stays the same"],
        check: (v) => (v === "goes up (proportionally)" ? true : "Shorter time means a faster reaction."), answer: () => "goes up (proportionally)" }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Thiosulfate / cm³", "Water / cm³", "Time / s", "Rate (1000 ÷ t) / s⁻¹"],
    rows: VOLS.map((V, i) => { const t = num(v[`t${i}`] ?? ""); return [String(V), String(50 - V), t != null ? fix(t, 1) : "—", t ? fix(1000 / t, 1) : "—"]; }) }],
  graph: (_s, v) => { const points = ratePts(v); if (!points.length) return null; const { m } = fitLine(points, true);
    return { title: "Rate against volume of thiosulfate", x: "thiosulfate / cm³", y: "1000 ÷ time / s⁻¹", points, line: points.length > 1 ? [[0, 0], [50, 50 * m]] : undefined }; },
  conclusion: () => "The rate is proportional to the concentration: twice as many thiosulfate particles in the same volume means twice as many collisions with acid particles each second.",
};

// ── Reactivity of metals with acid ─────────────────────────────────────────
type Rc = { added: number; watch: number };
export const METALS = [
  { name: "Magnesium", colour: "#CBD5E1", fizz: 3, seen: "Lots of bubbles, fizzes fast" },
  { name: "Zinc", colour: "#94A3B8", fizz: 2, seen: "Steady bubbles" },
  { name: "Iron", colour: "#475569", fizz: 1, seen: "A few slow bubbles" },
  { name: "Copper", colour: "#C2410C", fizz: 0, seen: "No bubbles" },
];
const SEEN = ["Lots of bubbles, fizzes fast", "Steady bubbles", "A few slow bubbles", "No bubbles"];
export const reactivity: Practical<Rc> = {
  slug: "reactivity", title: "Reactivity of metals with acid", subject: "chemistry",
  aim: "Add four metals to dilute hydrochloric acid, compare how fast they react, and put them in order of reactivity.",
  safety: ["Wear eye protection.", "Dilute acid is an irritant.", "Hydrogen is flammable — no flames nearby."],
  init: () => ({ added: 0, watch: 0 }),
  layout: (s) => [
    { id: "rack", kind: "rack", x: 780, y: BENCH, label: "Dilute HCl in 4 tubes", props: { name: "rack of tubes",
      tubes: METALS.map((m, i) => ({ label: m.name.slice(0, 2), level: 0.45, colour: "#E0F2FE", metal: i < s.added ? m.colour : undefined, bubbles: i < s.added ? m.fizz : 0 })) } },
    ...METALS.map((m, i) => ({ id: `m${i}`, kind: "dish", x: 190 + i * 110, y: BENCH, label: m.name, hidden: i < s.added, props: { colour: m.colour, piece: i === 0 ? "ribbon" : i === 3 ? "turnings" : "granules", name: m.name.toLowerCase() } })),
    { id: "timer", kind: "stopwatch", x: 1080, y: BENCH, label: "Stopwatch", props: { t: s.watch * 60 } },
  ],
  steps: [
    ...METALS.map((m, i): Step<Rc> => ({ id: `add${i}`, group: i === 0 ? "Add the metals" : undefined, title: `Add ${m.name.toLowerCase()} to tube ${i + 1}`,
      how: `Drag the ${m.name.toLowerCase()} onto the rack — a similar-sized piece in each tube, so it's a fair test.`,
      action: { type: "drag", item: `m${i}`, onto: "rack" }, apply: (s) => ({ ...s, added: i + 1 }) })),
    { id: "watch", title: "Watch for 2 minutes", how: "Compare how fast bubbles of gas come off each metal.", action: { type: "wait", label: "Watch for 2 minutes", minutes: 2 },
      tick: (s, sec) => ({ ...s, watch: Math.min(2, s.watch + sec * 0.7) }), finished: (s) => s.watch >= 2 },
    { id: "seen", group: "Observations", title: "What did you see in each tube?", how: "Describe the bubbling.",
      action: { type: "record", fields: METALS.map((m, i) => ({ key: `seen${i}`, label: m.name, options: SEEN, check: (v: string) => (v === m.seen ? true : "Look at that tube again."), answer: () => m.seen })) } },
    { id: "order", group: "Conclusion", title: "Put them in order of reactivity", how: "The faster it fizzes, the more reactive the metal.",
      action: { type: "record", fields: [
        { key: "order", label: "Most → least reactive", options: ["Mg > Zn > Fe > Cu", "Zn > Mg > Cu > Fe", "Cu > Fe > Zn > Mg", "Mg > Fe > Zn > Cu"], check: (v) => (v === "Mg > Zn > Fe > Cu" ? true : "Use your observations."), answer: () => "Mg > Zn > Fe > Cu" },
        { key: "gas", label: "The gas given off", options: ["Hydrogen", "Oxygen", "Carbon dioxide", "Chlorine"], check: (v) => (v === "Hydrogen" ? true : "Metal + acid → salt + ?"), answer: () => "Hydrogen" },
      ] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Metal", "What you saw"], rows: METALS.map((m, i) => [m.name, v[`seen${i}`] ?? "—"]) }],
  conclusion: () => "Order of reactivity: magnesium > zinc > iron > copper. Metals above hydrogen in the reactivity series react with dilute acid to give a salt and hydrogen (it burns with a squeaky pop); copper is below hydrogen, so it doesn't react.",
};

// ── Boyle's law ────────────────────────────────────────────────────────────
type By = { k: number; p: number };
const PRESSURES = [150, 200, 250, 300];
const volAt = (s: By, p = s.p) => s.k / p;
const boylePts = (v: Record<string, string>) => [100, ...PRESSURES].map((p, i) => [num(v[`V${i}`] ?? ""), p] as const).filter((q): q is readonly [number, number] => !!q[0]).map(([V, p]) => [round(1 / V, 4), p] as [number, number]);
export const gasLaws: Practical<By> = {
  slug: "gas-laws", title: "Boyle's law: pressure and volume", subject: "chemistry",
  aim: "Pump up the pressure on a trapped column of air, read its volume, and show that pressure × volume stays constant.",
  safety: ["Wear eye protection — the glass tube is under pressure.", "Don't go above 350 kPa."],
  init: (r) => ({ k: 100 * Math.round(between(r, 38, 46, 0)), p: 100 }),
  layout: (s) => [
    { id: "boyle", kind: "boyle", x: 640, y: BENCH, label: "Air trapped above oil, with a pressure gauge", props: { V: volAt(s), p: s.p } },
    { id: "pump", kind: "pump", x: 1000, y: BENCH, label: "Foot pump" },
  ],
  steps: [
    { id: "V0", group: "Take readings", title: "Read the volume at atmospheric pressure", how: "Read the scale where the top of the oil is, at eye level. The gauge reads 100 kPa.", magnify: "boyle",
      action: { type: "record", fields: [{ key: "V0", label: "Volume at 100 kPa", unit: "cm³", check: (v, s: By) => (near(v, volAt(s, 100), 0.5) ? true : "Read the scale at the oil level."), answer: (s: By) => fix(volAt(s, 100), 1) }] } },
    ...PRESSURES.flatMap((p, i): Step<By>[] => [
      { id: `p${i}`, title: `Pump the pressure up to ${p} kPa`, how: "Pump slowly, then wait a minute so the air goes back to room temperature.",
        action: { type: "set", item: "boyle", label: "Pressure", min: 100, max: 350, step: 10, unit: "kPa", target: p, tolerance: 0.5, start: 100 }, apply: (s, v) => ({ ...s, p: v ?? p }) },
      { id: `V${i + 1}`, title: `Read the volume at ${p} kPa`, how: "Read the scale at the top of the oil.", magnify: "boyle",
        action: { type: "record", fields: [{ key: `V${i + 1}`, label: `Volume at ${p} kPa`, unit: "cm³", check: (v, s: By) => (near(v, volAt(s, p), 0.5) ? true : "Read the scale at the oil level, to the nearest 0.5 cm³."), answer: (s: By) => fix(volAt(s, p), 1) }] } },
    ]),
    { id: "pV", group: "Analyse", title: "Work out p × V", how: "Multiply each pressure by its volume. What do you notice?",
      action: { type: "record", fields: [{ key: "pV", label: "p × V (mean)", unit: "kPa cm³",
        check: (v, _s, values) => { const pv = [100, ...PRESSURES].map((p, i) => { const V = num(values[`V${i}`] ?? ""); return V ? p * V : null; }).filter((x): x is number => x != null); if (!pv.length) return "Take your readings first."; const m = pv.reduce((a, b) => a + b, 0) / pv.length; return near(v, m, m * 0.03) ? true : "Multiply each pressure by its volume and take the mean."; },
        answer: (_s, values) => { const pv = [100, ...PRESSURES].map((p, i) => p * (num(values[`V${i}`] ?? "") ?? 0)); return fix(pv.reduce((a, b) => a + b, 0) / pv.length, 0); } }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["p / kPa", "V / cm³", "p × V"], rows: [100, ...PRESSURES].map((p, i) => { const V = num(v[`V${i}`] ?? ""); return [String(p), V != null ? fix(V, 1) : "—", V != null ? fix(p * V, 0) : "—"]; }) }],
  graph: (_s, v) => { const points = boylePts(v); if (!points.length) return null; const { m } = fitLine(points, true); const x = Math.max(...points.map((q) => q[0]));
    return { title: "Pressure against 1 / volume", x: "1/V / cm⁻³", y: "p / kPa", points, line: points.length > 1 ? [[0, 0], [x, x * m]] : undefined }; },
  conclusion: (s, v) => `p × V stays the same (about ${v.pV ?? "…"} kPa cm³; true value ${s.k}): at constant temperature, the pressure of a gas is inversely proportional to its volume — Boyle's law.`,
};

// ── Electrolysis of copper sulfate with copper electrodes ─────────────────
type Ec = { m0: number; eff: number; where: "bench" | "balance" | "cell" | "back"; on: boolean; I: number; min: number };
const gained = (s: Ec) => round((s.I * s.min * 60 * 63.5 * s.eff) / (2 * 96500), 3);
const mass = (s: Ec) => round(s.m0 + gained(s), 2);
export const electrolysis: Practical<Ec> = {
  slug: "electrolysis", title: "Electrolysis of copper sulfate", subject: "chemistry",
  aim: "Pass a current through copper sulfate solution with copper electrodes, and find the mass of copper deposited on the cathode.",
  safety: ["Wear eye protection; copper sulfate is harmful.", "Keep the power supply low voltage and dry."],
  init: (r) => ({ m0: between(r, 4.2, 5.6, 2), eff: between(r, 0.96, 1, 3), where: "bench", on: false, I: 0, min: 0 }),
  layout: (s) => { const inCell = s.where === "cell" && (s.on || s.min < 30); return [
    { id: "cathode", kind: "electrode", x: s.where === "balance" || s.where === "back" ? 300 : s.where === "cell" ? 686 : 160, y: s.where === "balance" || s.where === "back" ? BENCH - 68 : s.where === "cell" ? BENCH - 30 : BENCH, hidden: inCell, z: 3,
      label: s.where === "bench" ? "Copper cathode" : "", props: { plated: Math.min(1, s.min / 30), name: "cathode" } },
    { id: "balance", kind: "balance", x: 300, y: BENCH, label: "Balance", props: { reading: s.where === "balance" ? s.m0 : s.where === "back" ? mass(s) : 0 } },
    { id: "cell", kind: "electrolysis-cell", x: 640, y: BENCH, label: "CuSO₄(aq) with a copper anode", props: { cathode: inCell, on: s.on, plated: Math.min(1, s.min / 30) } },
    { id: "psu", kind: "power-supply", x: 950, y: BENCH, label: "Power supply + rheostat", props: { on: s.on, volts: s.on ? 4 : 0 } },
    { id: "amm", kind: "meter", x: 1200, y: BENCH, label: "Ammeter", props: { unit: "A", reading: fix(s.on ? s.I : 0, 2), on: s.on } },
  ]; },
  steps: [
    { id: "w0", group: "Before", title: "Weigh the clean cathode", how: "Drag the copper cathode onto the balance.", action: { type: "drag", item: "cathode", onto: "balance" }, apply: (s) => ({ ...s, where: "balance" }) },
    { id: "m0", title: "Record its mass", how: "Copy the balance reading.", magnify: "balance",
      action: { type: "record", fields: [{ key: "m0", label: "Mass of cathode before", unit: "g", check: (v, s: Ec) => (near(v, s.m0, 0.005) ? true : "Copy the balance."), answer: (s: Ec) => fix(s.m0, 2) }] } },
    { id: "in", group: "Electrolysis", title: "Put the cathode in the solution", how: "Drag it into the beaker and connect it to the negative (black) terminal.", action: { type: "drag", item: "cathode", onto: "cell" }, apply: (s) => ({ ...s, where: "cell" }) },
    { id: "on", title: "Switch on", how: "Switch on the power supply.", action: { type: "tap", item: "psu", label: "Switch on" }, apply: (s) => ({ ...s, on: true, I: 0.2 }) },
    { id: "I", title: "Set the current to 0.50 A", how: "Adjust the rheostat until the ammeter reads 0.50 A.",
      action: { type: "set", item: "psu", label: "Current", min: 0.1, max: 1, step: 0.05, unit: "A", target: 0.5, tolerance: 0.001, start: 0.2 }, apply: (s, v) => ({ ...s, I: round(v ?? 0.5, 2) }) },
    { id: "run", title: "Leave it for 30 minutes", how: "Keep the current steady at 0.50 A.", action: { type: "wait", label: "Run for 30 minutes", minutes: 30 },
      tick: (s, sec) => ({ ...s, min: Math.min(30, s.min + sec * 10) }), finished: (s) => s.min >= 30, note: () => "The cathode is coated in fresh pink copper; the anode has got thinner." },
    { id: "off", title: "Switch off", how: "Switch off the power supply.", action: { type: "tap", item: "psu", label: "Switch off" }, apply: (s) => ({ ...s, on: false }) },
    { id: "w1", group: "After", title: "Rinse, dry and reweigh the cathode", how: "Rinse it with water then propanone, let it dry, and drag it onto the balance.", action: { type: "drag", item: "cathode", onto: "balance" }, apply: (s) => ({ ...s, where: "back" }) },
    { id: "m1", title: "Record its new mass", how: "Copy the balance reading.", magnify: "balance",
      action: { type: "record", fields: [{ key: "m1", label: "Mass of cathode after", unit: "g", check: (v, s: Ec) => (near(v, mass(s), 0.005) ? true : "Copy the balance."), answer: (s: Ec) => fix(mass(s), 2) }] } },
    { id: "gain", group: "Results", title: "Work out the mass of copper deposited", how: "Mass gained = after − before.",
      action: { type: "record", fields: [
        { key: "gain", label: "Copper deposited", unit: "g", check: (v, _s, values) => { const [a, b] = vals(values, ["m1", "m0"]); return a != null && b != null && near(v, a - b, 0.005) ? true : "After − before."; }, answer: (_s, values) => { const [a, b] = vals(values, ["m1", "m0"]); return fix((a ?? 0) - (b ?? 0), 2); } },
        { key: "where", label: "At the cathode", options: ["Copper was deposited", "Oxygen bubbled off", "Copper dissolved", "Hydrogen bubbled off"], check: (v) => (v === "Copper was deposited" ? true : "The cathode got heavier."), answer: () => "Copper was deposited" },
      ] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["", "Value"], rows: [["Cathode before / g", v.m0 ?? "—"], ["Cathode after / g", v.m1 ?? "—"], ["Copper deposited / g", v.gain ?? "—"], ["Current / A", "0.50"], ["Time / min", "30"]] }],
  conclusion: (s, v) => `At the cathode Cu²⁺ + 2e⁻ → Cu, so it gained ${v.gain ?? "…"} g of copper; at the anode Cu → Cu²⁺ + 2e⁻, so it lost about the same. (Theory for 0.50 A for 30 min: ${fix(0.5 * 1800 * 63.5 / 193000, 2)} g.)`,
};

// ── Paper chromatography ──────────────────────────────────────────────────
type Cg = { front: number; mixOf: [number, number]; spotted: boolean; place: "bench" | "beaker" | "out"; progress: number };
export const DYES = [{ c: "#DC2626", rf: 0.62 }, { c: "#2563EB", rf: 0.41 }, { c: "#EAB308", rf: 0.84 }, { c: "#7C3AED", rf: 0.22 }];
export const INKS = [[0], [1, 2], [3]]; // A red, B green (blue + yellow), C purple
const xDyes = (s: Cg) => [...INKS[s.mixOf[0]], ...INKS[s.mixOf[1]]];
const topSpot = (s: Cg) => round(Math.max(...xDyes(s).map((d) => DYES[d].rf)) * s.front, 1);
const INK_PAIRS: [number, number][] = [[0, 1], [0, 2], [1, 2]];
const pairName = (p: [number, number]) => `${"ABC"[p[0]]} and ${"ABC"[p[1]]}`;
export const chromatography: Practical<Cg> = {
  slug: "chromatography", title: "Paper chromatography of inks", subject: "chemistry",
  aim: "Separate three inks and an unknown mixture X on chromatography paper, measure Rf values and find which inks are in X.",
  safety: ["Wear eye protection.", "Draw the start line in pencil — ink would run."],
  init: (r) => ({ front: round(between(r, 7, 8.5, 1), 1), mixOf: pick(r, INK_PAIRS), spotted: false, place: "bench", progress: 0 }),
  layout: (s, step) => [
    { id: "pen", kind: "dropper", x: 150, y: SHELF, label: "Inks A, B, C, X (capillary)", props: { liquid: "#1E293B", text: "Inks\nA B C X" } },
    { id: "paper", kind: "chroma-paper", x: s.place === "beaker" ? 640 : s.place === "out" ? 960 : 360, y: s.place === "beaker" ? BENCH - 4 : BENCH, z: 3, label: s.place === "beaker" ? "" : "Chromatography paper",
      props: { spotted: s.spotted, front: s.front, progress: s.progress, lanes: [INKS[0], INKS[1], INKS[2], xDyes(s)], out: s.place === "out", focus: step >= 5 ? "spot" : "front", name: "paper" } },
    { id: "beaker", kind: "beaker", x: 640, y: BENCH, label: "Beaker with 1 cm of water", props: { vol: 22, max: 250, colour: "#DBEAFE", front: s.place === "beaker" } },
  ],
  steps: [
    { id: "spot", group: "Prepare", title: "Spot the inks on the pencil line", how: "Drag the capillary tube onto the paper to put a small spot of each ink, A, B, C and X, on the pencil line.",
      action: { type: "drag", item: "pen", onto: "paper" }, apply: (s) => ({ ...s, spotted: true }) },
    { id: "in", title: "Hang the paper in the beaker", how: "Drag the paper into the beaker. The pencil line must be above the water, or the inks would dissolve into it.",
      action: { type: "drag", item: "paper", onto: "beaker" }, apply: (s) => ({ ...s, place: "beaker" }) },
    { id: "run", group: "Run", title: "Let the water soak up the paper", how: "Wait while the water (the solvent) rises up the paper, carrying the dyes.",
      action: { type: "wait", label: "Wait 15 minutes", minutes: 15 }, tick: (s, sec) => ({ ...s, progress: Math.min(1, s.progress + sec / 3) }), finished: (s) => s.progress >= 1,
      note: () => "Each dye moved a different distance: the more soluble it is, the further it goes." },
    { id: "out", title: "Take it out and mark the solvent front", how: "Before it dries, mark how far the water reached with a pencil line.",
      action: { type: "tap", item: "paper", label: "Take it out & mark the front" }, apply: (s) => ({ ...s, place: "out" }) },
    { id: "front", group: "Measure", title: "Measure how far the solvent moved", how: "Measure from the pencil start line to the solvent front, to the nearest mm.", magnify: "paper",
      action: { type: "record", fields: [{ key: "front", label: "Solvent front from the start line", unit: "cm", check: (v, s: Cg) => (near(v, s.front, 0.05) ? true : "Read the ruler at the solvent front line."), answer: (s: Cg) => fix(s.front, 1) }] } },
    { id: "dist", title: "Measure X's highest spot", how: "Measure from the start line to the middle of X's spot that moved furthest.", magnify: "paper",
      action: { type: "record", fields: [{ key: "dist", label: "Distance moved by X's top spot", unit: "cm", check: (v, s: Cg) => (near(v, topSpot(s), 0.1) ? true : "Measure to the middle of the spot."), answer: (s: Cg) => fix(topSpot(s), 1) }] } },
    { id: "rf", group: "Analyse", title: "Work out its Rf value", how: "Rf = distance moved by the spot ÷ distance moved by the solvent.",
      action: { type: "record", fields: [{ key: "rf", label: "Rf of X's top spot", check: (v, _s, values) => { const [d, f] = vals(values, ["dist", "front"]); if (!d || !f) return "Measure both distances first."; return near(v, d / f, 0.02) ? true : "Spot distance ÷ solvent distance (it's always less than 1)."; }, answer: (_s, values) => { const [d, f] = vals(values, ["dist", "front"]); return fix((d ?? 0) / (f || 1), 2); } }] } },
    { id: "which", title: "Which inks are in X?", how: "Match X's spots with the spots of A, B and C at the same heights.",
      action: { type: "record", fields: [{ key: "which", label: "X contains inks", options: ["A and B", "A and C", "B and C"], check: (v, s: Cg) => (v === pairName(s.mixOf) ? true : "Line up each of X's spots with a spot at the same height."), answer: (s: Cg) => pairName(s.mixOf) }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["", "Value"], rows: [["Solvent front / cm", v.front ?? "—"], ["X's top spot / cm", v.dist ?? "—"], ["Rf", v.rf ?? "—"], ["X contains", v.which ?? "—"]] }],
  conclusion: (s) => `X is a mixture of inks ${pairName(s.mixOf)}: each of its spots matches a spot of one of them at the same height (the same Rf). A pure substance gives a single spot.`,
};

// ── Flame tests ────────────────────────────────────────────────────────────
type Ft = { lit: boolean; air: number; loop: number | null; inFlame: boolean; done: number; x: number };
export const SALTS = [
  { name: "Lithium chloride", ion: "Lithium", colour: "#E11D48", seen: "Crimson red" },
  { name: "Sodium chloride", ion: "Sodium", colour: "#F59E0B", seen: "Yellow-orange" },
  { name: "Potassium chloride", ion: "Potassium", colour: "#C084FC", seen: "Lilac" },
  { name: "Copper(II) chloride", ion: "Copper", colour: "#14B8A6", seen: "Blue-green" },
];
const COLOURS = SALTS.map((x) => x.seen);
const saltOf = (s: Ft, i: number) => (i < 4 ? SALTS[i] : SALTS[s.x]);
export const flameTests: Practical<Ft> = {
  slug: "flame-tests", title: "Flame tests", subject: "chemistry",
  aim: "Hold metal salts in a hot Bunsen flame, record the colour each gives, and identify the metal ion in an unknown salt X.",
  safety: ["Wear eye protection; tie hair back.", "Use a heatproof mat; the loop gets very hot.", "Use the blue (hot) flame, not the yellow one."],
  init: (r) => ({ lit: false, air: 0, loop: null, inFlame: false, done: 0, x: Math.floor(r() * 4) % 4 }),
  layout: (s) => {
    const salt = s.loop != null ? saltOf(s, s.loop) : null;
    return [
      { id: "bunsen", kind: "bunsen", x: 640, y: BENCH, label: "Bunsen burner", props: { lit: s.lit, air: s.air, colour: s.inFlame && salt ? salt.colour : null } },
      { id: "loop", kind: "loop", x: s.inFlame ? 700 : 1180, y: s.inFlame ? BENCH - 38 : BENCH, tilt: s.inFlame ? -40 : 0, z: 4, label: s.inFlame ? "" : "Nichrome loop (in acid)", props: { salt: salt?.colour ?? null, name: "loop" } },
      ...[0, 1, 2, 3, 4].map((i) => ({ id: `d${i}`, kind: "dish", x: 160 + i * 95, y: BENCH, label: i < 4 ? SALTS[i].ion : "X", props: { colour: "#F8FAFC", piece: "powder", name: i < 4 ? SALTS[i].name.toLowerCase() : "unknown salt X" } })),
    ];
  },
  steps: [
    { id: "light", group: "Set up", title: "Light the Bunsen burner", how: "With the air hole closed, light it: you get a yellow, sooty flame.", action: { type: "tap", item: "bunsen", label: "Light it" }, apply: (s) => ({ ...s, lit: true }) },
    { id: "air", title: "Open the air hole", how: "Turn the collar to open the air hole fully, for a hot blue flame that doesn't colour the test.",
      action: { type: "set", item: "bunsen", label: "Air hole", min: 0, max: 100, step: 10, unit: "% open", target: 100, tolerance: 0.5 }, apply: (s, v) => ({ ...s, air: v ?? 100 }) },
    ...[0, 1, 2, 3, 4].flatMap((i): Step<Ft>[] => {
      const name = i < 4 ? SALTS[i].name.toLowerCase() : "unknown salt X";
      return [
        { id: `dip${i}`, group: i === 0 ? "Test each salt" : i === 4 ? "The unknown" : undefined, title: `Dip the loop in the ${name}`, how: "Clean the loop in acid first, then dip it in the salt so a little sticks to it.",
          action: { type: "drag", item: "loop", onto: `d${i}` }, apply: (s) => ({ ...s, loop: i, inFlame: false }) },
        { id: `hold${i}`, title: "Hold it in the flame", how: "Drag the loop into the edge of the blue flame.", action: { type: "drag", item: "loop", onto: "bunsen" }, apply: (s) => ({ ...s, inFlame: true }) },
        { id: `c${i}`, title: `What colour is the flame?`, how: "Look at the colour the salt gives the flame.",
          action: { type: "record", fields: [{ key: `c${i}`, label: i < 4 ? SALTS[i].ion : "X", options: COLOURS, check: (v, s: Ft) => (v === saltOf(s, i).seen ? true : "Look at the flame again."), answer: (s: Ft) => saltOf(s, i).seen }] } },
      ];
    }),
    { id: "id", group: "Conclusion", title: "Identify the metal ion in X", how: "Match X's flame colour with your results.",
      action: { type: "record", fields: [{ key: "id", label: "X contains", options: SALTS.map((x) => x.ion), check: (v, s: Ft) => (v === SALTS[s.x].ion ? true : "Which known salt gave the same colour?"), answer: (s: Ft) => SALTS[s.x].ion }] } },
  ],
  results: (s, v) => [{ title: "Results", columns: ["Salt", "Flame colour"], rows: [...SALTS.map((x, i) => [x.name, v[`c${i}`] ?? "—"]), ["X", v.c4 ?? "—"]] }],
  conclusion: (s) => `X gives a ${SALTS[s.x].seen.toLowerCase()} flame, so it contains ${SALTS[s.x].ion.toLowerCase()} ions. Each metal ion's electrons give out light of its own colours when heated.`,
};

// ── pH and universal indicator ─────────────────────────────────────────────
type Ph = { ui: boolean; probe: boolean; x: number };
export const SOLUTIONS = [{ name: "Hydrochloric acid", pH: 1 }, { name: "Lemon juice", pH: 3 }, { name: "Pure water", pH: 7 }, { name: "Baking soda", pH: 9 }, { name: "Soap solution", pH: 11 }, { name: "Sodium hydroxide", pH: 13 }];
export const UI_COLOURS = ["#DC2626", "#EA580C", "#F97316", "#F59E0B", "#EAB308", "#A3E635", "#22C55E", "#14B8A6", "#0EA5E9", "#2563EB", "#4F46E5", "#6D28D9", "#7E22CE", "#86198F"];
export const uiColour = (pH: number) => UI_COLOURS[Math.max(0, Math.min(13, Math.round(pH) - 1))];
const KINDS = ["Strong acid", "Weak acid", "Neutral", "Weak alkali", "Strong alkali"];
const kindOf = (pH: number) => (pH < 3 ? KINDS[0] : pH < 6.5 ? KINDS[1] : pH <= 7.5 ? KINDS[2] : pH <= 11 ? KINDS[3] : KINDS[4]);
export const phIndicators: Practical<Ph> = {
  slug: "ph-indicators", title: "pH and universal indicator", subject: "chemistry",
  aim: "Find the pH of six solutions with universal indicator, then measure the pH of an unknown solution X with a pH meter.",
  safety: ["Wear eye protection — the acid and alkali are corrosive.", "Rinse the pH probe with distilled water between solutions."],
  init: (r) => ({ ui: false, probe: false, x: round(pick(r, [[2.1, 2.7], [4.2, 5.6], [8.4, 9.8], [11.8, 12.6]].map(([a, b]) => a + r() * (b - a))), 1) }),
  layout: (s) => [
    { id: "ui", kind: "dropper", x: 130, y: SHELF, label: "Universal indicator", props: { liquid: "#22C55E", text: "Universal\nindicator" } },
    { id: "chart", kind: "ph-chart", x: 560, y: SHELF, label: "pH colour chart" },
    { id: "rack", kind: "rack", x: 520, y: BENCH, label: "Six solutions", props: { name: "rack of solutions", tubes: SOLUTIONS.map((x, i) => ({ label: String(i + 1), level: 0.5, colour: s.ui ? uiColour(x.pH) : "#F1F5F9" })) } },
    { id: "X", kind: "beaker", x: 900, y: BENCH, label: "Solution X", props: { vol: 90, max: 250, colour: "#F1F5F9" } },
    { id: "meter", kind: "ph-meter", x: 1160, y: BENCH, label: "pH meter", props: { reading: s.probe ? s.x : null, probe: s.probe } },
  ],
  steps: [
    { id: "add", group: "Universal indicator", title: "Add universal indicator to every tube", how: "Drag the indicator onto the rack — a few drops in each of the six solutions.", action: { type: "drag", item: "ui", onto: "rack", pour: true }, apply: (s) => ({ ...s, ui: true }) },
    { id: "ph", title: "Read the pH of each solution", how: "Match each tube's colour with the chart on the shelf.",
      action: { type: "record", fields: SOLUTIONS.map((x, i) => ({ key: `ph${i}`, label: `${i + 1}. ${x.name}`, unit: "pH", check: (v: string) => (near(v, x.pH, 1) ? true : "Match the colour with the chart."), answer: () => String(x.pH) })) } },
    { id: "probe", group: "pH meter", title: "Measure X with the pH meter", how: "Rinse the probe, then drag the pH meter onto solution X to dip the probe in.", action: { type: "drag", item: "meter", onto: "X" }, apply: (s) => ({ ...s, probe: true }) },
    { id: "x", title: "Record the pH of X", how: "Copy the meter reading — it's more precise than the indicator.", magnify: "meter",
      action: { type: "record", fields: [{ key: "x", label: "pH of X", check: (v, s: Ph) => (near(v, s.x, 0.05) ? true : "Copy the meter's display."), answer: (s: Ph) => fix(s.x, 1) }] } },
    { id: "kind", title: "What kind of solution is X?", how: "Below 7 is acidic, 7 is neutral, above 7 is alkaline; the further from 7, the stronger.",
      action: { type: "record", fields: [{ key: "kind", label: "X is a", options: KINDS, check: (v, s: Ph) => (v === kindOf(s.x) ? true : "Look at how far its pH is from 7."), answer: (s: Ph) => kindOf(s.x) }] } },
  ],
  results: (s, v) => [{ title: "Results", columns: ["Solution", "pH"], rows: [...SOLUTIONS.map((x, i) => [x.name, v[`ph${i}`] ?? "—"]), ["X (pH meter)", v.x ?? "—"]] }],
  conclusion: (s) => `Acids have a pH below 7 and turn universal indicator red to yellow; alkalis are above 7 and turn it blue to purple; neutral solutions are green. X (pH ${fix(s.x, 1)}) is a ${kindOf(s.x).toLowerCase()}.`,
};

export const CHEMISTRY: Practical[] = [rates, reactivity, gasLaws, electrolysis, chromatography, flameTests, phIndicators];
