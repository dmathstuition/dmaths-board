// Reading instruments (a drill on five common scales) and the sonometer
// (resonance with tuning forks). See lib/lab/bench/types.ts.
import { BENCH, fitLine, fix, near, num, round, type Practical, type Rand, type Step } from "@/lib/lab/bench/types";

const pick = <T,>(r: Rand, xs: T[]) => xs[Math.floor(r() * xs.length) % xs.length];
const int = (r: Rand, a: number, b: number) => a + Math.floor(r() * (b - a + 1));

// ── Reading instruments: a drill ───────────────────────────────────────────
type Rd = { T: number; I: number; V: number; vol: number; bur: number };
// Each instrument: what one small division is worth (a choice), then the reading.
type Inst = { id: string; name: string; unit: string; div: string; divs: string[]; tol: number; dp: number; value: (s: Rd) => number; how: string };
export const INSTRUMENTS: Inst[] = [
  { id: "thermo", name: "Thermometer", unit: "°C", div: "1 °C", divs: ["0.1 °C", "0.5 °C", "1 °C", "2 °C"], tol: 0.3, dp: 0, value: (s) => s.T,
    how: "Count the marks between two numbers to find what one small division is worth, then read the top of the red thread." },
  { id: "amm", name: "Ammeter", unit: "A", div: "0.02 A", divs: ["0.01 A", "0.02 A", "0.05 A", "0.1 A"], tol: 0.006, dp: 2, value: (s) => s.I,
    how: "From 0 to 0.1 A there are 5 small divisions. Read where the needle points, looking straight at it (the mirror strip helps)." },
  { id: "volt", name: "Voltmeter", unit: "V", div: "0.1 V", divs: ["0.05 V", "0.1 V", "0.2 V", "0.5 V"], tol: 0.03, dp: 1, value: (s) => s.V,
    how: "From 0 to 1 V there are 10 small divisions. Read where the needle points." },
  { id: "cyl", name: "Measuring cylinder", unit: "cm³", div: "1 cm³", divs: ["0.5 cm³", "1 cm³", "2 cm³", "5 cm³"], tol: 0.5, dp: 0, value: (s) => s.vol,
    how: "Read the bottom of the meniscus, with your eye level with it." },
  { id: "bur", name: "Burette", unit: "cm³", div: "0.1 cm³", divs: ["0.05 cm³", "0.1 cm³", "0.5 cm³", "1 cm³"], tol: 0.05, dp: 2, value: (s) => s.bur,
    how: "A burette's numbers go DOWN the tube (0 at the top). Read the bottom of the meniscus to the nearest half division, e.g. 23.45 cm³." },
];
export const readings: Practical<Rd> = {
  slug: "reading-instruments", title: "Reading instruments: a drill", subject: "physics",
  aim: "Read a thermometer, an ammeter, a voltmeter, a measuring cylinder and a burette correctly: work out what one small division is worth, and avoid parallax.",
  safety: ["Thermometers are glass: lay them down so they can't roll off the bench.", "Never stand a burette with its tap open over your hand."],
  init: (r) => ({ T: int(r, 18, 92), I: round(int(r, 6, 48) * 0.02, 2), V: int(r, 6, 48) / 10, vol: int(r, 18, 92), bur: round(int(r, 60, 900) * 0.05, 2) }),
  layout: (s) => [
    { id: "thermo", kind: "thermo-beaker", x: 170, y: BENCH, label: "Thermometer", props: { T: s.T } },
    { id: "amm", kind: "dial-meter", x: 400, y: BENCH, label: "Ammeter", props: { value: round(s.I, 2), max: 1, unit: "A", major: 0.1, minor: 0.02, every: 0.2 } },
    { id: "volt", kind: "dial-meter", x: 620, y: BENCH, label: "Voltmeter", props: { value: s.V, max: 5, unit: "V", major: 0.5, minor: 0.1, every: 1 } },
    { id: "cyl", kind: "measuring-cylinder", x: 830, y: BENCH, label: "Measuring cylinder", props: { vol: s.vol, liquid: "#BFDBFE" } },
    { id: "bur", kind: "stand", x: 1080, y: BENCH, label: "Burette", props: { level: s.bur, liquid: "#BFDBFE" } },
  ],
  steps: [
    ...INSTRUMENTS.map((x, i): Step<Rd> => ({
      id: x.id, group: i === 0 ? "Read each instrument" : undefined, title: `Read the ${x.name.toLowerCase()}`, how: x.how, magnify: x.id,
      action: { type: "record", fields: [
        { key: `${x.id}Div`, label: "One small division is", options: x.divs, check: (v) => (v === x.div ? true : "Take the difference between two numbered marks and divide by the number of spaces between them."), answer: () => x.div },
        { key: x.id, label: `${x.name} reading`, unit: x.unit,
          check: (v, s: Rd) => (near(v, x.value(s), x.tol) ? true : x.id === "bur" ? "Read downwards from 0, at the bottom of the meniscus." : "Read it again, at eye level — count the small divisions from the last number."),
          answer: (s: Rd) => fix(x.value(s), x.dp) },
      ] },
    })),
    { id: "eye", group: "Good habits", title: "Avoiding errors", how: "How you look at a scale matters as much as the scale.",
      action: { type: "record", fields: [
        { key: "parallax", label: "To avoid parallax error, your eye should be…", options: ["Level with the mark, looking at right angles to the scale", "Above the mark, looking down", "Below the mark, looking up", "As far from the scale as possible"],
          check: (v) => (v.startsWith("Level") ? true : "Looking at an angle makes the mark seem to move against the scale."), answer: () => "Level with the mark, looking at right angles to the scale" },
        { key: "menis", label: "For water in a cylinder or burette, read the…", options: ["Bottom of the meniscus", "Top of the meniscus", "Middle of the glass", "Highest drop on the side"],
          check: (v) => (v === "Bottom of the meniscus" ? true : "Water curves up at the glass: read the bottom of the curve."), answer: () => "Bottom of the meniscus" },
      ] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Instrument", "One division", "Reading"],
    rows: INSTRUMENTS.map((x) => [x.name, v[`${x.id}Div`] ?? "—", v[x.id] != null ? `${v[x.id]} ${x.unit}` : "—"]) }],
  conclusion: (s, v) => `Readings: ${INSTRUMENTS.map((x) => `${x.name.toLowerCase()} ${v[x.id] ?? "…"} ${x.unit}`).join(", ")} (true: ${INSTRUMENTS.map((x) => fix(x.value(s), x.dp)).join(", ")}). Work out what one small division is worth before reading any scale, keep your eye level with the mark, and read the bottom of a meniscus.`,
};

// ── Sonometer: frequency and length ────────────────────────────────────────
export const FORKS = [256, 288, 320, 384, 512];
type Sn = { m: number; mu: number; L: number; fork: number | null; Ls: number[] };
export const waveSpeed = (s: Sn) => Math.sqrt((s.m * 10) / s.mu); // g = 10 N/kg
export const resonantL = (s: Sn, i: number) => (100 * waveSpeed(s)) / (2 * FORKS[i]); // cm
const RES_TOL = 0.5;
export const ringsAt = (s: Sn, i: number | null, L = s.L) => i != null && Math.abs(L - resonantL(s, i)) <= RES_TOL + 1e-9;
const snPts = (v: Record<string, string>) => FORKS.map((f, i) => [1 / f, num(v[`L${i}`] ?? "")] as const)
  .filter((p): p is readonly [number, number] => p[1] != null).map(([x, L]) => [round(x * 1000, 3), round(L / 100, 4)] as [number, number]); // 1/f in ms⁻¹… kept as 10⁻³ s
export const sonometer: Practical<Sn> = {
  slug: "sonometer", title: "The sonometer: frequency and length", subject: "physics",
  aim: "Use tuning forks to find the resonant length of a stretched wire for each frequency, show that length is proportional to 1/f, and find the speed of waves on the wire and its mass per unit length.",
  safety: ["Strike tuning forks on a rubber pad, never on the bench.", "Keep your feet clear of the hanging mass in case the wire snaps."],
  init: (r) => ({ m: pick(r, [1.0, 1.5, 2.0]), mu: round(0.0006 + r() * 0.0006, 5), L: 40, fork: null, Ls: [] }),
  layout: (s) => [
    { id: "sono", kind: "sonometer", x: 620, y: BENCH, label: "Sonometer", r: 300, props: { L: s.L, m: s.m, ring: s.fork != null, res: ringsAt(s, s.fork), f: s.fork != null ? FORKS[s.fork] : null } },
    { id: "forks", kind: "fork-set", x: 1230, y: BENCH, label: "Tuning forks", props: { freqs: FORKS, current: s.fork } },
  ],
  steps: [
    ...FORKS.flatMap((f, i): Step<Sn>[] => [
      { id: `strike${i}`, group: i === 0 ? "Find each resonant length" : undefined, title: `Strike the ${f} Hz fork`, how: "Strike it on the rubber pad and stand its stem on the sonometer box. A small paper rider sits on the middle of the wire.",
        action: { type: "tap", item: "forks", label: `Strike ${f} Hz` }, apply: (s) => ({ ...s, fork: i }) },
      { id: `tune${i}`, title: "Move the bridge until the rider jumps off", how: "Start with the bridges close together and slowly move the movable bridge out. At resonance the wire vibrates strongly and the paper rider is thrown off.",
        action: { type: "set", item: "sono", label: "Movable bridge (length of wire)", min: 5, max: 60, step: 0.5, unit: "cm", target: 30, tolerance: RES_TOL,
          targetOf: (s: Sn) => Math.round(resonantL(s, i) * 2) / 2, hint: "The rider hasn't moved — keep sliding the bridge slowly. Higher notes need a shorter wire.", start: 5 },
        apply: (s, v) => ({ ...s, L: v ?? s.L }) },
      { id: `L${i}`, title: `Record the resonant length (${f} Hz)`, how: "Read the length of wire between the two bridges on the scale.", magnify: "sono",
        action: { type: "record", fields: [{ key: `L${i}`, label: `Resonant length at ${f} Hz`, unit: "cm",
          check: (v, s: Sn) => (near(v, s.L, 0.25) ? true : "Read the scale at the movable bridge (the fixed bridge is at 0)."), answer: (s: Sn) => fix(s.L, 1) }] },
        apply: (s) => ({ ...s, Ls: [...s.Ls.slice(0, i), s.L] }) },
    ]),
    { id: "v", group: "Analyse", title: "Find the speed of the waves", how: "Plot L (in m) against 1/f. It is a straight line through the origin: the wire is half a wavelength, so L = v ÷ 2f and the gradient is v ÷ 2. So v = 2 × gradient.",
      action: { type: "record", fields: [{ key: "v", label: "Speed of the waves on the wire", unit: "m/s",
        check: (v, _s, values) => { const pts = snPts(values); if (pts.length < 2) return "Find the lengths first."; const want = 2 * fitLine(pts, true).m * 1000; return near(v, want, want * 0.04) ? true : "v = 2 × gradient of L against 1/f (or v = 2fL for each fork, then the mean)."; },
        answer: (_s, values) => fix(2 * fitLine(snPts(values), true).m * 1000, 0) }] } },
    { id: "mu", title: "Find the wire's mass per unit length", how: "The tension is the weight hanging on the wire, T = mg (g = 10 N/kg). v = √(T ÷ μ), so μ = T ÷ v². Give μ in g/m (× 1000).",
      action: { type: "record", fields: [{ key: "mu", label: "Mass per unit length μ", unit: "g/m",
        check: (v, s: Sn, values) => { const sp = num(values.v ?? ""); if (!sp) return "Find v first."; const want = ((s.m * 10) / sp ** 2) * 1000; return near(v, want, want * 0.06) ? true : `μ = T ÷ v² with T = ${fix(s.m * 10, 0)} N, then × 1000 for g/m.`; },
        answer: (s: Sn, values) => fix(((s.m * 10) / (num(values.v ?? "") || 1) ** 2) * 1000, 2) }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["f / Hz", "1/f / 10⁻³ s", "L / cm"],
    rows: FORKS.map((f, i) => [String(f), fix(1000 / f, 3), v[`L${i}`] ?? "—"]) }],
  graph: (_s, v) => { const points = snPts(v); if (!points.length) return null; const { m } = fitLine(points, true); const x = Math.max(...points.map((p) => p[0]));
    return { title: "L against 1/f", x: "1/f / 10⁻³ s", y: "L / m", points, line: points.length > 1 ? [[0, 0], [x, x * m]] : undefined }; },
  conclusion: (s, v) => `The resonant length is proportional to 1/f — a higher note needs a shorter wire. Waves travel at ${v.v ?? "…"} m/s on this wire (true ${fix(waveSpeed(s), 0)} m/s), so its mass per unit length is ${v.mu ?? "…"} g/m (true ${fix(s.mu * 1000, 2)} g/m).`,
};

export const INSTRUMENT_PRACTICALS: Practical[] = [readings, sonometer];
