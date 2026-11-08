// The virtual practicals: standard school practicals (WAEC / NECO / GCSE
// required practicals) done step by step on a lab bench. Pure: the state of
// the experiment, the protocol, and where every piece of apparatus stands.
import { fitLine, fix, near, num, round, type ItemView, type Practical, type Step } from "@/lib/lab/bench/types";

const SHELF = 300, BENCH = 640;
const between = (r: () => number, a: number, b: number, dp = 2) => round(a + r() * (b - a), dp);
const choice = (...opts: string[]) => opts;

// ── Chemistry: acid–alkali titration ──────────────────────────────────────
// Find the concentration of hydrochloric acid using 25.0 cm³ of 0.100 mol/dm³
// sodium hydroxide and phenolphthalein.
type Titr = { c: number; r0: number; filled: boolean; pipette: "empty" | "full"; flask: number; indicator: boolean; onTile: boolean; added: number };
const NAOH = 0.1, ALIQUOT = 25;
const veq = (s: Titr) => (NAOH * ALIQUOT) / s.c; // cm³ of acid to neutralise
const pinkness = (s: Titr) => (!s.indicator || !s.flask ? 0 : s.added >= veq(s) ? 0 : Math.min(1, Math.max(0.12, (veq(s) - s.added) / 1.2)));
export const titration: Practical<Titr> = {
  slug: "practical-titration", title: "Acid–alkali titration", subject: "chemistry",
  aim: "Find the concentration of a solution of hydrochloric acid by titrating it against 25.0 cm³ of 0.100 mol/dm³ sodium hydroxide.",
  safety: ["Wear eye protection — the acid and the alkali are irritants.", "Fill the burette below eye level, using a funnel; remove the funnel before you start.", "Use a pipette filler — never pipette by mouth."],
  init: (r) => ({ c: between(r, 0.08, 0.12, 3), r0: Math.round(between(r, 0.4, 1.6, 2) * 20) / 20, filled: false, pipette: "empty", flask: 0, indicator: false, onTile: false, added: 0 }),
  layout: (s) => [
    { id: "acid", kind: "bottle", x: 130, y: SHELF, label: "HCl (aq)", props: { liquid: "#E0F2FE", text: "HCl\n? mol/dm³", cap: "#DC2626" } },
    { id: "naoh", kind: "bottle", x: 250, y: SHELF, label: "NaOH (aq)", props: { liquid: "#F0F9FF", text: "NaOH\n0.100 mol/dm³", cap: "#2563EB", open: s.pipette === "full" } },
    { id: "phth", kind: "dropper", x: 360, y: SHELF, label: "Phenolphthalein", props: { liquid: "#F8FAFC", text: "Phenol-\nphthalein" } },
    { id: "stand", kind: "stand", x: 760, y: BENCH, z: 1,
      props: { burette: true, level: s.filled ? s.r0 + s.added : null, liquid: "#DBEAFE", flowing: false } },
    // The burette itself (pour the acid in at its top, hold its tap): from its tip up to its top.
    { id: "burette", kind: "hotspot", x: 790, y: 520, r: 160, props: { w: 60, h: 470, name: "burette" } },
    { id: "tile", kind: "tile", x: 790, y: BENCH - 12, z: 2, label: s.onTile ? "" : "White tile" },
    { id: "flask", kind: "flask", x: s.onTile ? 790 : 520, y: s.onTile ? BENCH - 22 : BENCH, z: 3, label: s.onTile ? "" : "Conical flask",
      props: { vol: s.flask + (s.flask ? s.added : 0), max: 250, colour: s.flask ? mix("#F8FAFC", "#EC4899", pinkness(s)) : "#E0F2FE" } },
    { id: "pipette", kind: "pipette", x: 1010, y: BENCH, label: "25 cm³ pipette", z: 2, props: { fill: s.pipette === "full" ? 1 : 0, liquid: "#E0F2FE" } },
    { id: "waste", kind: "beaker", x: 1180, y: BENCH, label: "Waste", props: { vol: 40, max: 250, colour: "#E2E8F0" } },
  ],
  steps: [
    { id: "fill", group: "Set up the burette", title: "Fill the burette with the acid", how: "Drag the hydrochloric acid onto the burette to pour it in through a funnel.",
      action: { type: "drag", item: "acid", onto: "burette", pour: true }, apply: (s) => ({ ...s, filled: true }),
      note: () => "Run a little acid through the tap to fill the jet, then take the funnel out." },
    { id: "r0", title: "Read the burette (initial reading)", how: "Read the bottom of the meniscus at eye level, to the nearest 0.05 cm³. The scale reads 0 at the top.", magnify: "stand",
      action: { type: "record", fields: [{ key: "r0", label: "Initial burette reading", unit: "cm³",
        check: (v, s: Titr) => (near(v, s.r0, 0.05) ? true : "Read the bottom of the meniscus — each small mark is 0.1 cm³."), answer: (s: Titr) => fix(s.r0, 2) }] } },
    { id: "draw", group: "Measure out the alkali", title: "Fill the pipette with sodium hydroxide", how: "Drag the 25 cm³ pipette (with its filler) into the sodium hydroxide. Fill it until the bottom of the meniscus sits on the line.",
      action: { type: "drag", item: "pipette", onto: "naoh" }, apply: (s) => ({ ...s, pipette: "full" }) },
    { id: "deliver", title: "Run it into the conical flask", how: "Drag the full pipette into the conical flask and let it drain. Touch the tip on the glass — don't blow out the last drop.",
      action: { type: "drag", item: "pipette", onto: "flask", pour: true }, apply: (s) => ({ ...s, pipette: "empty", flask: ALIQUOT }) },
    { id: "ind", title: "Add 3 drops of phenolphthalein", how: "Drag the phenolphthalein onto the flask.",
      action: { type: "drag", item: "phth", onto: "flask", pour: true }, apply: (s) => ({ ...s, indicator: true }),
      note: () => "The alkali turns pink: phenolphthalein is pink above pH 8.2 and colourless below it." },
    { id: "tile", title: "Put the flask on the white tile, under the burette", how: "Drag the flask onto the white tile — it makes the colour change easy to see.",
      action: { type: "drag", item: "flask", onto: "tile" }, apply: (s) => ({ ...s, onTile: true }) },
    { id: "titrate", group: "Titrate", title: "Add acid until the pink just disappears", how: "Press and hold the tap to run acid in, swirling the flask. As the pink starts to linger, let go and add the acid drop by drop.",
      action: { type: "hold", item: "burette", label: "Hold to open the tap", rate: 1.4, drop: 0.05 },
      tick: (s, sec) => ({ ...s, added: round(Math.min(50 - s.r0, s.added + sec), 2) }),
      finished: (s) => s.added >= veq(s),
      note: (s) => { const over = s.added - veq(s); return over > 0.35 ? `End point reached — but you went past it by about ${fix(over, 1)} cm³. In a real titration, do a rough run first, then add the last few cm³ drop by drop.` : "End point reached: one drop turned the flask colourless. The acid has exactly neutralised the alkali."; } },
    { id: "r1", title: "Read the burette (final reading)", how: "Read the bottom of the meniscus again, to the nearest 0.05 cm³.", magnify: "stand",
      action: { type: "record", fields: [{ key: "r1", label: "Final burette reading", unit: "cm³",
        check: (v, s: Titr) => (near(v, s.r0 + s.added, 0.05) ? true : "Look at the bottom of the meniscus in the close-up."), answer: (s: Titr) => fix(s.r0 + s.added, 2) }] } },
    { id: "titre", group: "Calculate", title: "Work out the titre", how: "Titre = final reading − initial reading.",
      action: { type: "record", fields: [{ key: "titre", label: "Titre", unit: "cm³",
        check: (v, _s, values) => { const a = num(values.r1 ?? ""), b = num(values.r0 ?? ""); return a != null && b != null && near(v, a - b, 0.02) ? true : "Take the initial reading away from the final reading."; },
        answer: (_s, values) => fix((num(values.r1 ?? "") ?? 0) - (num(values.r0 ?? "") ?? 0), 2) }] } },
    { id: "conc", title: "Calculate the acid's concentration", how: "Moles of NaOH = 0.100 × 25.0 ÷ 1000. HCl + NaOH → NaCl + H₂O (1 : 1), so concentration of HCl = moles ÷ (titre ÷ 1000).",
      action: { type: "record", fields: [{ key: "conc", label: "Concentration of HCl", unit: "mol/dm³",
        check: (v, _s, values) => { const t = num(values.titre ?? ""); if (!t) return "Work out the titre first."; const want = 2.5 / t; return near(v, want, want * 0.03) ? true : "0.0025 moles of NaOH ÷ (titre in dm³)."; },
        answer: (_s, values) => fix(2.5 / (num(values.titre ?? "") || 1), 3) }] } },
  ],
  results: (s, v) => [{ title: "Results", columns: ["", "Reading"], rows: [
    ["Final burette reading / cm³", v.r1 ?? "—"], ["Initial burette reading / cm³", v.r0 ?? "—"], ["Titre / cm³", v.titre ?? "—"], ["Concentration of HCl / mol dm⁻³", v.conc ?? "—"],
  ] }],
  conclusion: (s, v) => `The hydrochloric acid's concentration is ${v.conc ?? "…"} mol/dm³ (the true value was ${fix(s.c, 3)} mol/dm³). Repeat until two titres agree within 0.10 cm³ and use their mean.`,
};

// ── Biology: food tests ───────────────────────────────────────────────────
type Food = { benedict: boolean; inBath: boolean; temp: number; heat: number; iodine: boolean; biuret: number };
const SAMPLES = ["A: glucose", "B: starch", "C: egg white", "D: milk"];
const SAMPLE_COLOURS = ["#F1F5F9", "#F1F5F9", "#FEF9C3", "#FFFFFF"];
const HAS = { sugar: [true, false, false, true], starch: [false, true, false, false], protein: [false, false, true, true] };
export const foodTests: Practical<Food> = {
  slug: "practical-food-tests", title: "Food tests", subject: "biology",
  aim: "Test four foods for reducing sugar (Benedict's), starch (iodine) and protein (biuret), and find what food D contains.",
  safety: ["Wear eye protection.", "Benedict's and biuret reagents are irritants; iodine stains.", "Heat with a water bath, never a naked flame."],
  init: () => ({ benedict: false, inBath: false, temp: 20, heat: 0, iodine: false, biuret: 0 }),
  layout: (s) => {
    const heated = (i: number) => mix("#3B82F6", HAS.sugar[i] ? (i === 0 ? "#B91C1C" : "#EA580C") : "#3B82F6", s.heat);
    return [
      { id: "benedict", kind: "bottle", x: 130, y: SHELF, label: "Benedict's", props: { liquid: "#3B82F6", text: "Benedict's\nreagent", cap: "#1D4ED8" } },
      { id: "iodine", kind: "dropper", x: 250, y: SHELF, label: "Iodine", props: { liquid: "#B45309", text: "Iodine\nsolution", amber: true } },
      { id: "biuret", kind: "bottle", x: 360, y: SHELF, label: "Biuret", props: { liquid: "#93C5FD", text: "Biuret\nreagent", cap: "#7C3AED" } },
      { id: "bath", kind: "water-bath", x: 1060, y: BENCH, label: "Water bath", props: { temp: s.temp, on: s.temp > 20 } },
      { id: "rackA", kind: "rack", x: s.inBath ? 1060 : 600, y: s.inBath ? BENCH - 62 : BENCH, z: 3, label: s.inBath ? "" : "Tubes A–D (Benedict's)",
        props: { tubes: SAMPLES.map((n, i) => ({ label: n[0], level: s.benedict ? 0.55 : 0.3, colour: s.benedict ? heated(i) : SAMPLE_COLOURS[i] })) } },
      { id: "spot", kind: "spot-tile", x: 330, y: BENCH, label: "Spotting tile (A–D)",
        props: { wells: SAMPLES.map((_, i) => (s.iodine ? (HAS.starch[i] ? "#1E1B4B" : "#C2731B") : SAMPLE_COLOURS[i])) } },
      { id: "rackB", kind: "rack", x: 820, y: BENCH, label: "Tubes A–D (biuret)",
        props: { tubes: SAMPLES.map((n, i) => ({ label: n[0], level: s.biuret ? 0.55 : 0.3, colour: s.biuret ? mix("#5B8DEF", HAS.protein[i] ? (i === 2 ? "#7E22CE" : "#A855F7") : "#5B8DEF", s.biuret) : SAMPLE_COLOURS[i] })) } },
      { id: "clock", kind: "clock", x: 1250, y: SHELF, label: "Timer", props: { minutes: Math.round(s.heat * 5) } },
    ];
  },
  steps: [
    { id: "ben", group: "Reducing sugar — Benedict's test", title: "Add Benedict's reagent to tubes A–D", how: "Each tube already holds 2 cm³ of a food sample. Drag the Benedict's reagent onto the rack to add an equal volume to every tube.",
      action: { type: "drag", item: "benedict", onto: "rackA", pour: true }, apply: (s) => ({ ...s, benedict: true }) },
    { id: "bath", title: "Put the tubes in the water bath", how: "Drag the rack into the water bath.",
      action: { type: "drag", item: "rackA", onto: "bath" }, apply: (s) => ({ ...s, inBath: true }) },
    { id: "temp", title: "Set the water bath to 80 °C", how: "Turn the dial to 80 °C.",
      action: { type: "set", item: "bath", label: "Water bath temperature", min: 20, max: 100, step: 1, unit: "°C", target: 80, tolerance: 3 }, apply: (s, v) => ({ ...s, temp: v ?? 80 }) },
    { id: "heat", title: "Heat for 5 minutes", how: "Wait 5 minutes and watch the colours.",
      action: { type: "wait", label: "Heat for 5 minutes", minutes: 5 }, tick: (s, sec) => ({ ...s, heat: Math.min(1, s.heat + sec / 3) }), finished: (s) => s.heat >= 1,
      note: () => "Blue → green → yellow → orange → brick red shows more and more reducing sugar." },
    { id: "rsugar", title: "Which foods contain reducing sugar?", how: "Look at the colour of each tube.",
      action: { type: "record", fields: SAMPLES.map((n, i) => ({ key: `sugar${i}`, label: n, options: choice("Yes", "No"),
        check: (v) => ((v === "Yes") === HAS.sugar[i] ? true : HAS.sugar[i] ? "It changed colour from blue." : "It stayed blue."), answer: () => (HAS.sugar[i] ? "Yes" : "No") })) } },
    { id: "iod", group: "Starch — iodine test", title: "Add iodine to each food", how: "A drop of each food is on the spotting tile. Drag the iodine onto the tile.",
      action: { type: "drag", item: "iodine", onto: "spot", pour: true }, apply: (s) => ({ ...s, iodine: true }),
      note: () => "Iodine is orange-brown; it turns blue-black with starch." },
    { id: "starch", title: "Which foods contain starch?", how: "Look at each well.",
      action: { type: "record", fields: SAMPLES.map((n, i) => ({ key: `starch${i}`, label: n, options: choice("Yes", "No"),
        check: (v) => ((v === "Yes") === HAS.starch[i] ? true : HAS.starch[i] ? "Blue-black means starch." : "Orange-brown means no starch."), answer: () => (HAS.starch[i] ? "Yes" : "No") })) } },
    { id: "biu", group: "Protein — biuret test", title: "Add biuret reagent to tubes A–D", how: "Drag the biuret reagent onto the second rack, then shake gently.",
      action: { type: "drag", item: "biuret", onto: "rackB", pour: true }, apply: (s) => ({ ...s, biuret: 1 }),
      note: () => "Biuret reagent is blue; it turns purple (lilac) with protein." },
    { id: "protein", title: "Which foods contain protein?", how: "Look at each tube.",
      action: { type: "record", fields: SAMPLES.map((n, i) => ({ key: `protein${i}`, label: n, options: choice("Yes", "No"),
        check: (v) => ((v === "Yes") === HAS.protein[i] ? true : HAS.protein[i] ? "Purple means protein." : "It stayed blue."), answer: () => (HAS.protein[i] ? "Yes" : "No") })) } },
    { id: "concl", group: "Conclusion", title: "What does food D (milk) contain?", how: "Use your three results for D.",
      action: { type: "record", fields: [{ key: "concl", label: "Food D contains", options: choice("Starch only", "Reducing sugar and protein", "Protein only", "Reducing sugar, starch and protein"),
        check: (v) => (v === "Reducing sugar and protein" ? true : "Check D in each of your three tests."), answer: () => "Reducing sugar and protein" }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Food", "Benedict's (sugar)", "Iodine (starch)", "Biuret (protein)"],
    rows: SAMPLES.map((n, i) => [n, v[`sugar${i}`] ?? "—", v[`starch${i}`] ?? "—", v[`protein${i}`] ?? "—"]) }],
  conclusion: (_s, v) => (v.concl ? `Food D (milk) contains ${v.concl.toLowerCase()} — milk sugar (lactose) is a reducing sugar, and milk protein is casein.` : "Finish the tests to draw a conclusion."),
};

// ── Physics: Ohm's law (current against potential difference) ─────────────
type Ohm = { R: number; ammeter: boolean; voltmeter: boolean; on: boolean; volts: number };
const VOLTS = [1, 2, 3, 4, 5, 6];
const current = (s: Ohm, v = s.volts) => (s.on && s.ammeter ? v / s.R : 0);
const ohmSteps: Step<Ohm>[] = [
  { id: "amm", group: "Build the circuit", title: "Connect the ammeter in series", how: "Drag the ammeter into the gap in the circuit, in line with the resistor.",
    action: { type: "drag", item: "ammeter", onto: "slotA" }, apply: (s) => ({ ...s, ammeter: true }) },
  { id: "volt", title: "Connect the voltmeter in parallel", how: "Drag the voltmeter to the leads either side of the resistor.",
    action: { type: "drag", item: "voltmeter", onto: "slotV" }, apply: (s) => ({ ...s, voltmeter: true }) },
  { id: "on", title: "Switch on the power supply", how: "Tap the power switch.",
    action: { type: "tap", item: "psu", label: "Switch on" }, apply: (s) => ({ ...s, on: true }) },
  ...VOLTS.flatMap((V, k): Step<Ohm>[] => [
    { id: `set${V}`, group: k === 0 ? "Take readings" : undefined, title: `Set the p.d. to ${V}.0 V`, how: "Turn the power supply's dial until the voltmeter reads the value.",
      action: { type: "set", item: "psu", label: "Power supply output", min: 0, max: 6, step: 0.1, unit: "V", target: V, tolerance: 0.05 }, apply: (s, v) => ({ ...s, volts: round(v ?? V, 1) }) },
    { id: `I${V}`, title: `Read the ammeter at ${V}.0 V`, how: "Write the current exactly as the ammeter shows it.",
      action: { type: "record", fields: [{ key: `I${V}`, label: `Current at ${V}.0 V`, unit: "A",
        check: (v, s: Ohm) => (near(v, round(current(s, V), 3), 0.002) ? true : "Copy the reading on the ammeter's display."), answer: (s: Ohm) => fix(current(s, V), 3) }] } },
  ]),
  { id: "off", title: "Switch off", how: "Switch off between readings in a real lab, so the resistor doesn't heat up (that would change its resistance).",
    action: { type: "tap", item: "psu", label: "Switch off" }, apply: (s) => ({ ...s, on: false, volts: 0 }) },
  { id: "R", group: "Analyse", title: "Find the resistance", how: "The graph is a straight line through the origin, so the current is proportional to the p.d. Resistance R = V ÷ I (use a pair of readings or the gradient).",
    action: { type: "record", fields: [{ key: "R", label: "Resistance", unit: "Ω",
      check: (v, s: Ohm) => (near(v, s.R, s.R * 0.05) ? true : "R = V ÷ I, e.g. 6.0 V ÷ the current at 6.0 V."), answer: (s: Ohm) => fix(s.R, 1) }] } },
];
export const ohmsLaw: Practical<Ohm> = {
  slug: "practical-ohms-law", title: "Ohm's law: current and p.d.", subject: "physics",
  aim: "Investigate how the current through a resistor depends on the potential difference across it, and find its resistance.",
  safety: ["Keep the p.d. at 6 V or less.", "Switch off between readings so the resistor doesn't get hot.", "Check the circuit before switching on."],
  init: (r) => ({ R: between(r, 8, 15, 1), ammeter: false, voltmeter: false, on: false, volts: 0 }),
  layout: (s) => [
    { id: "wires", kind: "wires", x: 0, y: 0, z: 0, props: { ammeter: s.ammeter, voltmeter: s.voltmeter, on: s.on } },
    { id: "psu", kind: "power-supply", x: 260, y: BENCH, label: "Power supply (0–6 V)", z: 2, props: { on: s.on, volts: s.volts } },
    { id: "resistor", kind: "resistor", x: 760, y: BENCH, label: "Resistor", z: 2 },
    { id: "slotA", kind: "slot", x: 520, y: BENCH, r: 120, props: { show: !s.ammeter, label: "A", name: "gap in the circuit" } },
    { id: "slotV", kind: "slot", x: 1040, y: BENCH, r: 120, props: { show: !s.voltmeter, label: "V", name: "leads either side of the resistor" } },
    { id: "ammeter", kind: "meter", x: s.ammeter ? 520 : 640, y: s.ammeter ? BENCH : SHELF, label: "Ammeter", z: 3,
      props: { unit: "A", reading: s.ammeter ? fix(current(s), 3) : "", on: s.on && s.ammeter } },
    { id: "voltmeter", kind: "meter", x: s.voltmeter ? 1040 : 880, y: s.voltmeter ? BENCH : SHELF, label: "Voltmeter", z: 3,
      props: { unit: "V", reading: s.voltmeter ? fix(s.on ? s.volts : 0, 2) : "", on: s.on && s.voltmeter } },
  ],
  steps: ohmSteps,
  results: (_s, v) => [{ title: "Results", columns: ["p.d. / V", "Current / A", "V ÷ I / Ω"],
    rows: VOLTS.map((V) => { const I = num(v[`I${V}`] ?? ""); return [fix(V, 1), I != null ? fix(I, 3) : "—", I ? fix(V / I, 1) : "—"]; }) }],
  graph: (_s, v) => {
    const points = VOLTS.map((V) => [V, num(v[`I${V}`] ?? "")] as [number, number | null]).filter((p): p is [number, number] => p[1] != null);
    if (!points.length) return null;
    const { m } = fitLine(points, true);
    return { title: "Current against p.d.", x: "p.d. / V", y: "current / A", points, line: points.length > 1 ? [[0, 0], [6, 6 * m]] : undefined };
  },
  conclusion: (s, v) => `The current is directly proportional to the p.d. (a straight line through the origin), so the resistor obeys Ohm's law. Its resistance is ${v.R ?? "…"} Ω (true value ${fix(s.R, 1)} Ω).`,
};

// ── Biology: osmosis in potato ────────────────────────────────────────────
type Osm = { iso: number; cut: boolean; m0: number[]; m1: number[]; weighed: boolean; inTubes: boolean; minutes: number; blotted: boolean; reweighed: boolean };
const CONCS = [0, 0.2, 0.4, 0.6, 0.8];
const pct = (s: Osm, i: number) => ((s.m1[i] - s.m0[i]) / s.m0[i]) * 100;
export const osmosis: Practical<Osm> = {
  slug: "practical-osmosis", title: "Osmosis in potato", subject: "biology",
  aim: "Find the concentration of sucrose solution that has the same water potential as potato cells, from the change in mass of potato cylinders.",
  safety: ["Take care with the cork borer and the scalpel — cut onto a tile, away from you."],
  init: (r) => {
    const iso = between(r, 0.25, 0.4, 2);
    const m0 = CONCS.map(() => between(r, 2.3, 2.75, 2));
    const m1 = m0.map((m, i) => round(m * (1 + (0.26 * (iso - CONCS[i]) + (r() - 0.5) * 0.008)), 2));
    return { iso, cut: false, m0, m1, weighed: false, inTubes: false, minutes: 0, blotted: false, reweighed: false };
  },
  layout: (s) => {
    const where = s.inTubes && !s.blotted ? "tubes" : s.reweighed || (s.weighed && !s.inTubes) ? "balance" : s.blotted ? "towel" : "tile";
    const pos = { tile: [400, BENCH - 14], balance: [640, BENCH - 70], towel: [880, BENCH - 8], tubes: [1120, BENCH] }[where];
    return [
      { id: "potato", kind: "potato", x: 180, y: BENCH, label: "Potato" },
      { id: "borer", kind: "borer", x: 420, y: SHELF, label: "Cork borer" },
      { id: "board", kind: "tile", x: 400, y: BENCH, label: "Tile & ruler", props: { long: true } },
      { id: "balance", kind: "balance", x: 640, y: BENCH, label: "Balance", props: { reading: s.reweighed ? s.m1.reduce((a, b) => a + b, 0) : s.weighed && !s.inTubes ? s.m0.reduce((a, b) => a + b, 0) : 0 } },
      { id: "towel", kind: "towel", x: 880, y: BENCH, label: "Paper towel" },
      { id: "tubes", kind: "rack", x: 1120, y: BENCH, label: "Sucrose: 0.0–0.8 mol/dm³", z: 2,
        props: { name: "tubes of sucrose solution", tubes: CONCS.map((c) => ({ label: fix(c, 1), level: 0.7, colour: mix("#F8FAFC", "#E0F2FE", c) })), potato: s.inTubes && !s.blotted } },
      { id: "cyl", kind: "cylinders", x: pos[0], y: pos[1], z: 4, hidden: !s.cut || where === "tubes", label: "", props: { name: "potato cylinders" } },
      { id: "clock", kind: "clock", x: 1250, y: SHELF, label: "Timer", props: { minutes: s.minutes } },
    ];
  },
  steps: [
    { id: "cut", group: "Prepare", title: "Cut five potato cylinders", how: "Drag the cork borer onto the potato. Then cut each cylinder to 3 cm on the tile.",
      action: { type: "drag", item: "borer", onto: "potato" }, apply: (s) => ({ ...s, cut: true }) },
    { id: "w0", title: "Weigh each cylinder", how: "Drag the cylinders onto the balance. Each one's mass goes in your table.",
      action: { type: "drag", item: "cyl", onto: "balance" }, apply: (s) => ({ ...s, weighed: true }) },
    { id: "soak", title: "Put one cylinder in each sucrose solution", how: "Drag the cylinders into the tubes: 0.0, 0.2, 0.4, 0.6 and 0.8 mol/dm³.",
      action: { type: "drag", item: "cyl", onto: "tubes" }, apply: (s) => ({ ...s, inTubes: true }) },
    { id: "wait", title: "Leave them for an hour", how: "Wait while water moves in or out by osmosis.",
      action: { type: "wait", label: "Leave for 1 hour", minutes: 60 }, tick: (s, sec) => ({ ...s, minutes: Math.min(60, s.minutes + sec * 20) }), finished: (s) => s.minutes >= 60 },
    { id: "blot", group: "Measure again", title: "Take them out and blot them dry", how: "Drag the tubes onto the paper towel: tip out the cylinders and roll each one gently to remove surface water.",
      action: { type: "drag", item: "tubes", onto: "towel" }, apply: (s) => ({ ...s, blotted: true }) },
    { id: "w1", title: "Weigh each cylinder again", how: "Drag the cylinders onto the balance.",
      action: { type: "drag", item: "cyl", onto: "balance" }, apply: (s) => ({ ...s, reweighed: true }) },
    { id: "pct", group: "Analyse", title: "Percentage change in mass in pure water", how: "% change = (final − initial) ÷ initial × 100. Use the 0.0 mol/dm³ row.",
      action: { type: "record", fields: [{ key: "pct0", label: "% change at 0.0 mol/dm³", unit: "%",
        check: (v, s: Osm) => (near(v, pct(s, 0), 0.3) ? true : "(final − initial) ÷ initial × 100 — it's positive if the mass went up."), answer: (s: Osm) => fix(pct(s, 0), 1) }] } },
    { id: "iso", title: "Find where the line crosses zero", how: "On the graph, read the concentration where the % change is 0: there, the potato's cells neither gain nor lose water.",
      action: { type: "record", fields: [{ key: "iso", label: "Concentration with no change in mass", unit: "mol/dm³",
        check: (v, s: Osm) => { const { m, c } = fitLine(CONCS.map((x, i) => [x, pct(s, i)])); return near(v, -c / m, 0.07) ? true : "Read across where the best-fit line crosses the x-axis."; },
        answer: (s: Osm) => { const { m, c } = fitLine(CONCS.map((x, i) => [x, pct(s, i)])); return fix(-c / m, 2); } }] } },
  ],
  results: (s) => [{ title: "Results", columns: ["Sucrose / mol dm⁻³", "Initial mass / g", "Final mass / g", "% change"],
    rows: CONCS.map((c, i) => [fix(c, 1), s.weighed ? fix(s.m0[i], 2) : "—", s.reweighed ? fix(s.m1[i], 2) : "—", s.reweighed ? fix(pct(s, i), 1) : "—"]) }],
  graph: (s) => {
    if (!s.reweighed) return null;
    const points = CONCS.map((c, i) => [c, round(pct(s, i), 1)] as [number, number]);
    const { m, c } = fitLine(points);
    return { title: "% change in mass against concentration", x: "sucrose / mol dm⁻³", y: "% change", points, line: [[0, c], [0.8, 0.8 * m + c]] };
  },
  conclusion: (s, v) => `Below about ${v.iso ?? "…"} mol/dm³ the cylinders gained water by osmosis (the solution was more dilute than the cells); above it they lost water. Potato cells have the same water potential as about ${fix(s.iso, 2)} mol/dm³ sucrose.`,
};

export const PRACTICALS: Practical[] = [titration, foodTests, ohmsLaw, osmosis];
export const practicalBySlug = (slug: string) => PRACTICALS.find((p) => p.slug === slug) ?? null;

// Mix two colours (#rrggbb), t from 0 (a) to 1 (b).
export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)], k = Math.max(0, Math.min(1, t));
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("")}`;
}
export type { ItemView };
