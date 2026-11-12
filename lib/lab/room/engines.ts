// The lab room's apparatus behave like the real thing: each piece is driven by
// one of these models (an "engine") with its own properties. Pure functions,
// so the science can be tested without a screen.

export type Rand = () => number;
export const round = (x: number, dp = 2) => Math.round(x * 10 ** dp) / 10 ** dp;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

// ── What drives each piece of apparatus ────────────────────────────────────
export type Hazard = "corrosive" | "irritant" | "toxic" | "flammable" | "oxidising" | "harmful" | "explosive" | "hot" | "sharp" | "electrical" | "radiation" | "biological" | "glass";
export type IndicatorId = "methyl-orange" | "phenolphthalein" | "litmus" | "universal" | "bromothymol" | "methyl-red" | "congo-red" | "starch";
export type ShapeKind = "square" | "rectangle" | "triangle" | "equilateral" | "isosceles" | "scalene" | "right" | "parallelogram" | "rhombus" | "trapezium" | "kite" | "polygon" | "circle" | "semicircle" | "sector" | "segment";
export type SolidKind = "cube" | "cuboid" | "sphere" | "hemisphere" | "cylinder" | "hollow-cylinder" | "cone" | "square-pyramid" | "tri-pyramid" | "tri-prism" | "prism-n" | "tetrahedron" | "octahedron" | "dodecahedron" | "icosahedron" | "frustum-cone" | "frustum-pyramid";
export type CircuitPart = "resistor" | "lamp" | "diode" | "led" | "thermistor" | "ldr" | "cell" | "fuse" | "switch" | "rheostat" | "capacitor" | "motor" | "transformer" | "solar" | "wire" | "supply" | "ammeter" | "voltmeter" | "galvanometer" | "bell" | "relay" | "heater";
export type OpticPart = "convex" | "concave" | "concave-mirror" | "convex-mirror" | "plane" | "block" | "prism" | "grating" | "filter" | "polariser" | "fibre" | "pinhole";
export type GraphFn = "line" | "quadratic" | "cubic" | "sin" | "cos" | "tan" | "circle" | "hyperbola" | "exp";
export type MoneyCalc = "simple" | "compound" | "discount" | "profit" | "exchange" | "depreciation" | "loan" | "tax" | "budget" | "change";

export type Spec =
  | { e: "scale"; min: number; max: number; lc: number; unit: string; what: string }      // read a scale
  | { e: "vessel"; cap: number; tol: number; graduated: boolean; heat?: boolean }           // hold and measure liquid (tol: ± cm³)
  | { e: "timer"; lc: number }
  | { e: "heater"; power: number }                                                          // W
  | { e: "circuit"; part: CircuitPart; value?: number }
  | { e: "optic"; part: OpticPart; f?: number; n?: number; lines?: number }
  | { e: "spring"; k: number; limit: number }                                               // N/m, N
  | { e: "magnet"; strength: number }
  | { e: "radiation"; kind: "alpha" | "beta" | "gamma" | "detector" | "halflife"; half?: number }
  | { e: "wave"; part: "fork" | "tube" | "ripple" | "string" | "signal" | "slinky" | "speaker" | "mic"; f?: number }
  | { e: "reagent"; formula: string; kind: "acid" | "alkali" | "salt" | "metal" | "gas" | "organic" | "other"; pH: number; hazards: Hazard[]; cation?: string; anion?: string; gas?: string }
  | { e: "indicator"; ind: IndicatorId }
  | { e: "specimen"; group: string; features: string[]; habitat: string }
  | { e: "model"; parts: [string, string][] }
  | { e: "safety"; protects: Hazard[] }
  | { e: "shape"; kind: ShapeKind; sides?: number }
  | { e: "solid"; kind: SolidKind; sides?: number }
  | { e: "random"; kind: "dice" | "coin" | "spinner" | "cards" | "balls" | "rng"; sides?: number }
  | { e: "money"; calc: MoneyCalc }
  | { e: "graph"; fn: GraphFn; calculus?: "gradient" | "area" | "stationary" }
  | { e: "stats" }
  | { e: "microscope"; eyepiece: number; objectives: number[] }
  | { e: "tool"; use: string };

// ── Scales: a reading to the nearest least count ───────────────────────────
// A value somewhere on the scale (not right at the ends), exact to the least count.
export function scaleValue(s: { min: number; max: number; lc: number }, r: Rand) {
  const steps = Math.round((s.max - s.min) / s.lc), k = Math.round(steps * (0.1 + 0.8 * r()));
  return round(s.min + k * s.lc, decimals(s.lc));
}
export const decimals = (lc: number) => Math.max(0, Math.ceil(-Math.log10(lc) - 1e-9));
// Within half a division counts as right; the uncertainty is ± half a division (± one for a digital display).
export const readsRight = (given: number, want: number, lc: number) => Math.abs(given - want) <= lc / 2 + 1e-9;
export const uncertainty = (lc: number, digital = false) => (digital ? lc : lc / 2);
export const percentError = (reading: number, lc: number, digital = false) => (reading ? (uncertainty(lc, digital) / Math.abs(reading)) * 100 : Infinity);

// ── Vessels: how accurate a volume is ──────────────────────────────────────
export function vesselFill(cap: number, poured: number, tol: number) {
  const inside = Math.min(cap, Math.max(0, poured));
  return { inside, overflow: Math.max(0, poured - cap), percent: inside ? (tol / inside) * 100 : Infinity };
}

// ── Heating water: Q = Pt × efficiency = mcΔT ──────────────────────────────
export const WATER_C = 4200;
export function heatWater(power: number, seconds: number, massKg: number, start = 25, efficiency = 0.8) {
  const rise = (power * seconds * efficiency) / (massKg * WATER_C);
  const T = Math.min(100, start + rise); // it boils at 100 °C and stays there
  return { T: round(T, 1), energy: Math.round(power * seconds), boiling: start + rise >= 100 };
}

// ── Circuit parts: the current through a part for a p.d. across it ─────────
export type CircuitIn = { V: number; T?: number; lux?: number; R?: number; Np?: number; Ns?: number };
export function current(part: CircuitPart, value: number, x: CircuitIn): { I: number; R: number | null; note: string } {
  const V = x.V;
  switch (part) {
    case "resistor": case "heater": case "wire": return { I: V / value, R: value, note: "Ohmic: the current is proportional to the p.d. (straight line through the origin)." };
    case "lamp": { const I = Math.sign(V) * 0.5 * Math.abs(V / 6) ** 0.6; return { I, R: I ? V / I : null, note: "The filament gets hotter as the current rises, so its resistance goes up: the I–V graph curves." }; }
    case "diode": { const I = V > 0.6 ? (V - 0.6) / 10 : 0; return { I, R: I ? V / I : null, note: V > 0.6 ? "Forward biased: it conducts once the p.d. passes about 0.6 V." : V < 0 ? "Reverse biased: almost no current." : "Below 0.6 V a silicon diode hardly conducts." }; }
    case "led": { const I = V > 1.8 ? Math.min(0.03, (V - 1.8) / 60) : 0; return { I, R: I ? V / I : null, note: I > 0 ? "It lights: an LED conducts (and glows) above about 1.8 V, one way only." : "Off: an LED needs about 1.8 V, the right way round." }; }
    case "thermistor": { const T = (x.T ?? 25) + 273, R = value * Math.exp(3950 * (1 / T - 1 / 298)); return { I: V / R, R, note: "NTC thermistor: the hotter it is, the lower its resistance." }; }
    case "ldr": { const lux = Math.max(1, x.lux ?? 100), R = 500_000 * lux ** -0.75; return { I: V / R, R, note: "Light-dependent resistor: the brighter the light, the lower its resistance." }; }
    case "rheostat": { const R = clamp(x.R ?? value, 0.5, value); return { I: V / R, R, note: "Sliding the contact changes how much resistance wire the current flows through." }; }
    case "fuse": { const I = V / 2; return { I, R: 2, note: I > value ? `Blown: ${round(I, 1)} A is more than its ${value} A rating, so the wire melted and broke the circuit.` : `Fine: ${round(I, 2)} A is below its ${value} A rating.` }; }
    case "cell": case "supply": { const R = x.R ?? 10, r = part === "cell" ? 0.5 : 0.05, I = value / (R + r); return { I, R, note: `Terminal p.d. = e.m.f. − Ir = ${round(value - I * r, 2)} V (internal resistance ${r} Ω).` }; }
    case "solar": { const I = 0.0005 * (x.lux ?? 100) ** 0.8; return { I, R: null, note: "More light, more current: light energy is transferred to electrical energy." }; }
    case "capacitor": { const C = value * 1e-6, R = x.R ?? 10_000; return { I: 0, R: null, note: `Charge Q = CV = ${round(C * V * 1e6, 1)} μC. It charges through ${R} Ω with time constant RC = ${round(R * C, 2)} s.` }; }
    case "motor": return { I: V / 4, R: 4, note: `Turns at about ${Math.round(Math.max(0, V) * 400)} rpm; reverse the p.d. and it turns the other way.` };
    case "transformer": { const Vs = (V * (x.Ns ?? 120)) / (x.Np ?? 240); return { I: 0, R: null, note: `Vs = Vp × Ns ÷ Np = ${round(Vs, 2)} V (a.c. only — d.c. gives nothing).` }; }
    case "bell": case "relay": return { I: V / 12, R: 12, note: V >= (value || 3) ? "Works: the electromagnet pulls in the armature." : "Too little p.d. to pull in the armature." };
    default: return { I: 0, R: null, note: "" };
  }
}

// ── Optics ─────────────────────────────────────────────────────────────────
// Lenses and curved mirrors: 1/f = 1/u + 1/v (real is positive). f < 0 for diverging.
export function image(f: number, u: number) {
  if (Math.abs(u - f) < 1e-9) return { v: Infinity, m: Infinity, real: false, upright: false, nature: "No image: the rays come out parallel (the object is at the focal point)." };
  const v = (u * f) / (u - f), m = -v / u, real = v > 0;
  const size = Math.abs(m) > 1.001 ? "magnified" : Math.abs(m) < 0.999 ? "diminished" : "the same size";
  return { v, m, real, upright: !real, nature: `${real ? "Real, inverted" : "Virtual, upright"}, ${size}.` };
}
export const DEG = Math.PI / 180;
export const refract = (i: number, n: number) => { const s = Math.sin(i * DEG) / n; return Math.asin(s) / DEG; };
export const criticalAngle = (n: number) => Math.asin(1 / n) / DEG;
export const minDeviation = (n: number, apex = 60) => (2 * Math.asin(n * Math.sin((apex / 2) * DEG))) / DEG - apex;
// A grating with `lines` per mm: d sin θ = nλ.
export const gratingAngle = (lines: number, lambdaNm: number, order = 1) => { const d = 1e-3 / lines, s = (order * lambdaNm * 1e-9) / d; return s > 1 ? null : Math.asin(s) / DEG; };

// ── Springs: Hooke's law up to the limit of proportionality ────────────────
export function stretch(k: number, limit: number, F: number) {
  if (F <= limit) return { x: F / k, past: false };
  return { x: limit / k + ((F - limit) / k) * 2.5, past: true }; // beyond the limit it stretches more, and stays stretched
}

// ── Magnets: the field falls off steeply with distance (≈ 1/d³) ────────────
export const fieldAt = (strength: number, dCm: number) => (strength * 1000) / Math.max(1, dCm) ** 3; // μT (roughly)
export const compassTurn = (strength: number, dCm: number, earth = 30) => Math.atan(fieldAt(strength, dCm) / earth) / DEG; // degrees from north

// ── Radioactivity ──────────────────────────────────────────────────────────
export const BACKGROUND = 0.4; // counts per second
export type Absorber = "none" | "paper" | "aluminium" | "lead";
export function countRate(kind: "alpha" | "beta" | "gamma", absorber: Absorber, dCm: number, r: Rand, seconds = 10) {
  const base = kind === "alpha" ? 300 : kind === "beta" ? 200 : 100;
  let rate = base * (5 / Math.max(1, dCm)) ** 2;
  if (kind === "alpha" && (dCm > 5 || absorber !== "none")) rate = 0; // a few cm of air, or paper, stops alpha
  if (kind === "beta" && (absorber === "aluminium" || absorber === "lead")) rate = 0; // 3 mm of aluminium stops beta
  if (kind === "gamma" && absorber === "lead") rate *= 0.25; // lead only reduces gamma
  const mean = (rate + BACKGROUND) * seconds, counts = Math.max(0, Math.round(mean + Math.sqrt(mean) * gauss(r)));
  return { counts, perSecond: round(counts / seconds, 1), corrected: round(Math.max(0, counts / seconds - BACKGROUND), 1) };
}
export const remaining = (N0: number, t: number, half: number) => N0 * 0.5 ** (t / half);
function gauss(r: Rand) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ── Waves and sound ────────────────────────────────────────────────────────
export const soundSpeed = (T = 20) => 331 + 0.6 * T;
export const wavelength = (v: number, f: number) => v / f;
// Resonance tube (closed at one end): first resonance at λ/4, less the end correction (0.3 × diameter).
export const firstResonance = (f: number, T = 20, dCm = 3) => wavelength(soundSpeed(T), f) / 4 - 0.003 * dCm;
// A stretched string vibrating as half a wavelength: f = (1/2L) √(T/μ).
export const stringFrequency = (L: number, tension: number, mu: number) => Math.sqrt(tension / mu) / (2 * L);

// ── Chemistry: indicators and tests ────────────────────────────────────────
type Col = { name: string; hex: string };
export function indicatorColour(ind: IndicatorId, pH: number): Col {
  const pick = (cuts: [number, Col][], last: Col) => cuts.find(([c]) => pH < c)?.[1] ?? last;
  switch (ind) {
    case "methyl-orange": return pick([[3.1, { name: "red", hex: "#DC2626" }], [4.4, { name: "orange", hex: "#F97316" }]], { name: "yellow", hex: "#FACC15" });
    case "phenolphthalein": return pick([[8.2, { name: "colourless", hex: "#F8FAFC" }], [10, { name: "pink", hex: "#F472B6" }]], { name: "deep pink", hex: "#DB2777" });
    case "litmus": return pick([[5, { name: "red", hex: "#DC2626" }], [8, { name: "purple", hex: "#7C3AED" }]], { name: "blue", hex: "#2563EB" });
    case "bromothymol": return pick([[6, { name: "yellow", hex: "#FACC15" }], [7.6, { name: "green", hex: "#22C55E" }]], { name: "blue", hex: "#2563EB" });
    case "methyl-red": return pick([[4.4, { name: "red", hex: "#DC2626" }], [6.2, { name: "orange", hex: "#F97316" }]], { name: "yellow", hex: "#FACC15" });
    case "congo-red": return pick([[3, { name: "blue", hex: "#1D4ED8" }], [5, { name: "purple", hex: "#7C3AED" }]], { name: "red", hex: "#DC2626" });
    case "starch": return { name: "colourless (blue-black with iodine)", hex: "#F8FAFC" };
    default: {
      const UI: [number, Col][] = [[3, { name: "red", hex: "#DC2626" }], [5, { name: "orange", hex: "#F97316" }], [6.5, { name: "yellow", hex: "#FACC15" }], [7.5, { name: "green", hex: "#22C55E" }], [9, { name: "blue", hex: "#2563EB" }], [11, { name: "indigo", hex: "#4338CA" }]];
      return pick(UI, { name: "violet", hex: "#7C3AED" });
    }
  }
}
export const strength = (pH: number) => (pH < 3 ? "strong acid" : pH < 7 ? "weak acid" : pH === 7 ? "neutral" : pH <= 11 ? "weak alkali" : "strong alkali");

export const TESTS = ["universal indicator", "flame test", "sodium hydroxide (aq)", "aqueous ammonia", "silver nitrate (aq)", "barium chloride (aq)", "dilute hydrochloric acid", "limewater", "glowing splint", "lighted splint", "damp litmus paper", "iodine solution", "bromine water"] as const;
export type TestName = typeof TESTS[number];
type Rg = Extract<Spec, { e: "reagent" }>;
const FLAME: Record<string, string> = { "Na+": "a persistent yellow-orange flame", "K+": "a lilac flame", "Ca2+": "a brick-red flame", "Cu2+": "a blue-green flame", "Li+": "a crimson flame", "Ba2+": "an apple-green flame", "Zn2+": "no distinctive colour", "Mg2+": "no colour (a bright white glow)" };
const PPT_NAOH: Record<string, [string, string]> = {
  "Cu2+": ["a light blue precipitate", "insoluble in excess"], "Fe2+": ["a green precipitate", "insoluble in excess; it turns brown on standing"], "Fe3+": ["a red-brown precipitate", "insoluble in excess"],
  "Zn2+": ["a white precipitate", "it dissolves in excess, giving a colourless solution"], "Al3+": ["a white precipitate", "it dissolves in excess"], "Pb2+": ["a white precipitate", "it dissolves in excess"],
  "Ca2+": ["a white precipitate", "insoluble in excess"], "Mg2+": ["a white precipitate", "insoluble in excess"], "NH4+": ["no precipitate", "on warming, a gas that turns damp red litmus blue (ammonia)"],
};
const PPT_NH3: Record<string, string> = { "Cu2+": "a light blue precipitate that dissolves in excess to give a deep blue solution", "Fe2+": "a green precipitate", "Fe3+": "a red-brown precipitate", "Zn2+": "a white precipitate that dissolves in excess", "Al3+": "a white precipitate, insoluble in excess", "Pb2+": "a white precipitate, insoluble in excess", "Mg2+": "a white precipitate", "Ca2+": "no precipitate (or a very slight one)" };
// What you see when you test a substance — from its ions, pH and kind.
export function observe(r: Rg, test: TestName): string {
  switch (test) {
    case "universal indicator": { const c = indicatorColour("universal", r.pH); return `Turns ${c.name} — pH about ${r.pH} (${strength(r.pH)}).`; }
    case "flame test": return r.cation && FLAME[r.cation] ? `It gives ${FLAME[r.cation]} (${r.cation} ions).` : r.kind === "organic" ? "It burns — no metal-ion colour." : "No characteristic flame colour.";
    case "sodium hydroxide (aq)": { if (r.kind === "acid") return "No visible change — it is neutralised (the mixture warms slightly)."; const p = r.cation && PPT_NAOH[r.cation]; return p ? `It gives ${p[0]}; ${p[1]}.` : "No precipitate."; }
    case "aqueous ammonia": { const p = r.cation && PPT_NH3[r.cation]; return p ? `It gives ${p}.` : r.kind === "acid" ? "No visible change (neutralised)." : "No precipitate."; }
    case "silver nitrate (aq)": return r.anion === "Cl-" ? "A white precipitate (silver chloride): chloride ions present." : r.anion === "Br-" ? "A cream precipitate: bromide ions." : r.anion === "I-" ? "A yellow precipitate: iodide ions." : "No precipitate (acidify with dilute nitric acid first).";
    case "barium chloride (aq)": return r.anion === "SO4 2-" ? "A white precipitate (barium sulfate): sulfate ions present." : "No precipitate.";
    case "dilute hydrochloric acid": return r.anion === "CO3 2-" || r.anion === "HCO3-" ? "Effervescence: carbon dioxide is given off (it turns limewater milky)." : r.kind === "metal" && r.formula !== "Cu" ? "Bubbles of hydrogen (a lighted splint pops)." : r.kind === "alkali" ? "No visible change (neutralised, the mixture warms)." : "No visible reaction.";
    case "limewater": return r.gas === "CO2" ? "Limewater turns milky: carbon dioxide." : "Limewater stays clear.";
    case "glowing splint": return r.gas === "O2" ? "The glowing splint relights: oxygen." : "The splint does not relight.";
    case "lighted splint": return r.gas === "H2" ? "A squeaky pop: hydrogen." : r.gas === "CH4" || r.formula === "C2H5OH" ? "It burns with a blue flame." : r.gas === "O2" ? "The splint burns more brightly." : r.gas === "CO2" || r.gas === "N2" ? "The splint goes out." : "No pop.";
    case "damp litmus paper": return r.gas === "NH3" ? "Damp red litmus turns blue: ammonia." : r.gas === "Cl2" ? "Damp litmus turns red, then is bleached white: chlorine." : r.pH < 7 ? "Blue litmus turns red." : r.pH > 7 ? "Red litmus turns blue." : "No change.";
    case "iodine solution": return r.formula === "(C6H10O5)n" ? "Turns blue-black: starch present." : "Stays orange-brown.";
    case "bromine water": return r.formula === "C2H4" || r.formula === "C2H2" ? "Decolourised (orange to colourless): it is unsaturated (C=C)." : "Bromine water stays orange.";
  }
}

// ── Maths: shapes and solids ───────────────────────────────────────────────
export type Dims = { a: number; b: number; c: number; h: number; r: number; n: number; angle: number };
export function shape(kind: ShapeKind, d: Dims): { area: number; perimeter: number; angleSum: number; note: string } {
  const { a, b, c, h, r, n, angle } = d, poly = (k: number) => (k - 2) * 180;
  switch (kind) {
    case "square": return { area: a * a, perimeter: 4 * a, angleSum: 360, note: "4 equal sides, 4 right angles, 4 lines of symmetry." };
    case "rectangle": return { area: a * b, perimeter: 2 * (a + b), angleSum: 360, note: "Opposite sides equal; diagonals equal and bisect each other." };
    case "parallelogram": return { area: a * h, perimeter: 2 * (a + b), angleSum: 360, note: "Area = base × perpendicular height (not the slant side)." };
    case "rhombus": return { area: a * h, perimeter: 4 * a, angleSum: 360, note: "All sides equal; diagonals cross at right angles." };
    case "trapezium": return { area: ((a + b) / 2) * h, perimeter: a + b + 2 * Math.hypot(h, Math.abs(a - b) / 2), angleSum: 360, note: "Area = ½(a + b)h: the mean of the parallel sides × height (isosceles trapezium shown)." };
    case "kite": return { area: (a * b) / 2, perimeter: 2 * Math.hypot(a / 2, b * 0.3) + 2 * Math.hypot(a / 2, b * 0.7), angleSum: 360, note: "Area = ½ × product of the diagonals." };
    case "circle": return { area: Math.PI * r * r, perimeter: 2 * Math.PI * r, angleSum: 360, note: "Circumference = 2πr, area = πr²." };
    case "semicircle": return { area: (Math.PI * r * r) / 2, perimeter: Math.PI * r + 2 * r, angleSum: 180, note: "Half the circle's area; the perimeter includes the diameter." };
    case "sector": return { area: (angle / 360) * Math.PI * r * r, perimeter: (angle / 360) * 2 * Math.PI * r + 2 * r, angleSum: angle, note: "A fraction θ/360 of the circle." };
    case "segment": return { area: (angle / 360) * Math.PI * r * r - 0.5 * r * r * Math.sin(angle * DEG), perimeter: (angle / 360) * 2 * Math.PI * r + 2 * r * Math.sin((angle / 2) * DEG), angleSum: angle, note: "Segment = sector − triangle (½r² sin θ)." };
    case "polygon": return { area: (n * a * a) / (4 * Math.tan(Math.PI / n)), perimeter: n * a, angleSum: poly(n), note: `Each interior angle of a regular ${n}-gon is ${round(poly(n) / n, 1)}°, each exterior ${round(360 / n, 1)}°.` };
    default: { // triangles
      const s = (a + b + c) / 2, heron = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
      const ok = a + b > c && a + c > b && b + c > a;
      const area = kind === "right" ? (a * b) / 2 : heron;
      const per = kind === "right" ? a + b + Math.hypot(a, b) : a + b + c;
      return { area, perimeter: per, angleSum: 180, note: kind === "right" ? `Hypotenuse = √(a² + b²) = ${round(Math.hypot(a, b), 2)}.` : ok ? "Area by Heron's formula; the angles add up to 180°." : "These sides can't make a triangle: two sides must add up to more than the third." };
    }
  }
}
export function solid(kind: SolidKind, d: Dims): { V: number; SA: number; F: number; E: number; Vx: number } {
  const { a, b, c, h, r, n } = d, sl = (rr: number) => Math.hypot(rr, h);
  switch (kind) {
    case "cube": return { V: a ** 3, SA: 6 * a * a, F: 6, E: 12, Vx: 8 };
    case "cuboid": return { V: a * b * c, SA: 2 * (a * b + b * c + a * c), F: 6, E: 12, Vx: 8 };
    case "sphere": return { V: (4 / 3) * Math.PI * r ** 3, SA: 4 * Math.PI * r * r, F: 1, E: 0, Vx: 0 };
    case "hemisphere": return { V: (2 / 3) * Math.PI * r ** 3, SA: 3 * Math.PI * r * r, F: 2, E: 1, Vx: 0 };
    case "cylinder": return { V: Math.PI * r * r * h, SA: 2 * Math.PI * r * (r + h), F: 3, E: 2, Vx: 0 };
    case "hollow-cylinder": { const ri = Math.min(r * 0.99, a); return { V: Math.PI * (r * r - ri * ri) * h, SA: 2 * Math.PI * (r + ri) * h + 2 * Math.PI * (r * r - ri * ri), F: 4, E: 4, Vx: 0 }; }
    case "cone": return { V: (Math.PI * r * r * h) / 3, SA: Math.PI * r * (r + sl(r)), F: 2, E: 1, Vx: 1 };
    case "square-pyramid": return { V: (a * a * h) / 3, SA: a * a + 2 * a * Math.hypot(a / 2, h), F: 5, E: 8, Vx: 5 };
    case "tri-pyramid": case "tetrahedron": { const base = (Math.sqrt(3) / 4) * a * a, hh = kind === "tetrahedron" ? a * Math.sqrt(2 / 3) : h; return { V: (base * hh) / 3, SA: kind === "tetrahedron" ? Math.sqrt(3) * a * a : base + 1.5 * a * Math.hypot(a / (2 * Math.sqrt(3)), hh), F: 4, E: 6, Vx: 4 }; }
    case "tri-prism": { const base = (Math.sqrt(3) / 4) * a * a; return { V: base * h, SA: 2 * base + 3 * a * h, F: 5, E: 9, Vx: 6 }; }
    case "prism-n": { const base = (n * a * a) / (4 * Math.tan(Math.PI / n)); return { V: base * h, SA: 2 * base + n * a * h, F: n + 2, E: 3 * n, Vx: 2 * n }; }
    case "octahedron": return { V: (Math.sqrt(2) / 3) * a ** 3, SA: 2 * Math.sqrt(3) * a * a, F: 8, E: 12, Vx: 6 };
    case "dodecahedron": return { V: ((15 + 7 * Math.sqrt(5)) / 4) * a ** 3, SA: 3 * Math.sqrt(25 + 10 * Math.sqrt(5)) * a * a, F: 12, E: 30, Vx: 20 };
    case "icosahedron": return { V: ((5 * (3 + Math.sqrt(5))) / 12) * a ** 3, SA: 5 * Math.sqrt(3) * a * a, F: 20, E: 30, Vx: 12 };
    case "frustum-cone": { const R = r, rr = Math.min(r, a); return { V: (Math.PI * h * (R * R + R * rr + rr * rr)) / 3, SA: Math.PI * (R + rr) * Math.hypot(R - rr, h) + Math.PI * (R * R + rr * rr), F: 3, E: 2, Vx: 0 }; }
    case "frustum-pyramid": { const A = a * a, B = Math.min(a, b) ** 2; return { V: (h * (A + Math.sqrt(A * B) + B)) / 3, SA: A + B + 2 * (a + Math.min(a, b)) * Math.hypot((a - Math.min(a, b)) / 2, h), F: 6, E: 12, Vx: 8 }; }
  }
}

// ── Probability: throws, tallies and relative frequency ────────────────────
export function throwsOf(kind: "dice" | "coin" | "spinner" | "cards" | "balls" | "rng", sides: number, times: number, r: Rand) {
  const k = kind === "coin" ? 2 : kind === "cards" ? 4 : Math.max(2, sides); // cards: by suit
  const tally = Array.from({ length: k }, () => 0);
  for (let i = 0; i < times; i++) tally[Math.min(k - 1, Math.floor(r() * k))]++;
  return { tally, relative: tally.map((t) => round(t / Math.max(1, times), 3)), theory: round(1 / k, 3) };
}

// ── Money ──────────────────────────────────────────────────────────────────
export function money(calc: MoneyCalc, P: number, rate: number, years: number) {
  const r = rate / 100;
  switch (calc) {
    case "simple": { const I = P * r * years; return { result: P + I, line: `I = PRT/100 = ₦${fmt(I)}; amount = ₦${fmt(P + I)}` }; }
    case "compound": { const A = P * (1 + r) ** years; return { result: A, line: `A = P(1 + R/100)ⁿ = ₦${fmt(A)}; interest = ₦${fmt(A - P)}` }; }
    case "discount": return { result: P * (1 - r), line: `${rate}% off ₦${fmt(P)} = ₦${fmt(P * r)} discount; you pay ₦${fmt(P * (1 - r))}` };
    case "profit": return { result: P * (1 + r), line: `Selling at ${rate}% profit: ₦${fmt(P * (1 + r))} (profit ₦${fmt(P * r)})` };
    case "tax": return { result: P * r, line: `Tax at ${rate}% on ₦${fmt(P)} = ₦${fmt(P * r)}; total ₦${fmt(P * (1 + r))}` };
    case "exchange": return { result: P / Math.max(0.0001, rate), line: `₦${fmt(P)} at ₦${fmt(rate)} per unit = ${fmt(P / Math.max(0.0001, rate))} units` };
    case "depreciation": { const A = P * (1 - r) ** years; return { result: A, line: `Value = P(1 − R/100)ⁿ = ₦${fmt(A)} after ${years} years` }; }
    case "loan": { const n = Math.max(1, Math.round(years * 12)), m = r / 12, pay = m ? (P * m) / (1 - (1 + m) ** -n) : P / n; return { result: pay, line: `Monthly repayment = ₦${fmt(pay)} for ${n} months (total ₦${fmt(pay * n)})` }; }
    case "change": return { result: Math.max(0, rate - P), line: `Paid ₦${fmt(rate)} for ₦${fmt(P)}: change ₦${fmt(Math.max(0, rate - P))}` };
    case "budget": return { result: P - rate, line: `Income ₦${fmt(P)} − spending ₦${fmt(rate)} = ${P - rate >= 0 ? "saved" : "overspent"} ₦${fmt(Math.abs(P - rate))}` };
  }
}
const fmt = (x: number) => x.toLocaleString("en-NG", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

// ── Graphs and calculus ────────────────────────────────────────────────────
export function fnValue(fn: GraphFn, a: number, b: number, c: number, x: number): number {
  switch (fn) {
    case "line": return a * x + b;
    case "quadratic": return a * x * x + b * x + c;
    case "cubic": return a * x ** 3 + b * x * x + c * x;
    case "sin": return a * Math.sin(b * x * DEG) + c;
    case "cos": return a * Math.cos(b * x * DEG) + c;
    case "tan": return a * Math.tan(b * x * DEG) + c;
    case "exp": return a * Math.exp(b * x) + c;
    case "hyperbola": return x ? a / x + c : NaN;
    case "circle": return Math.sqrt(Math.max(0, a * a - x * x));
  }
}
export const gradientAt = (f: (x: number) => number, x: number, h = 1e-4) => (f(x + h) - f(x - h)) / (2 * h);
export function areaUnder(f: (x: number) => number, x0: number, x1: number, strips = 200) { // Simpson's rule
  const n = strips % 2 ? strips + 1 : strips, h = (x1 - x0) / n; let s = f(x0) + f(x1);
  for (let i = 1; i < n; i++) s += f(x0 + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

// ── Statistics ─────────────────────────────────────────────────────────────
export function stats(xs: number[]) {
  const v = [...xs].filter(Number.isFinite).sort((p, q) => p - q), n = v.length;
  if (!n) return null;
  const mean = v.reduce((p, q) => p + q, 0) / n, at = (q: number) => { const i = (n - 1) * q, lo = Math.floor(i); return v[lo] + (v[Math.ceil(i)] - v[lo]) * (i - lo); };
  const counts = new Map<number, number>(); v.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
  const top = Math.max(...counts.values()), modes = [...counts].filter(([, k]) => k === top).map(([x]) => x);
  const sd = Math.sqrt(v.reduce((p, x) => p + (x - mean) ** 2, 0) / n);
  return { n, mean, median: at(0.5), modes: top > 1 ? modes : [], range: v[n - 1] - v[0], q1: at(0.25), q3: at(0.75), sd, min: v[0], max: v[n - 1] };
}

// ── Microscopes ────────────────────────────────────────────────────────────
export const magnification = (eyepiece: number, objective: number) => eyepiece * objective;
export const actualSize = (imageMm: number, mag: number) => (imageMm * 1000) / mag; // μm
export const fieldOfView = (objective: number) => round(18 / objective, 2); // mm, with a 10× eyepiece

// ── Timing by hand: human reaction time ────────────────────────────────────
export const reaction = (r: Rand) => round(0.15 + r() * 0.15, 2);
