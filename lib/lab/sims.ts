// Pure maths & science models behind the E-Laboratory experiments.
// Kept free of React so every number a learner sees can be unit-tested.

// ── Probability ───────────────────────────────────────────────────────────
export type ProbMode = "coin" | "die" | "twoDice" | "spinner";

export const SPINNER = [
  { label: "Red", weight: 1 / 2, color: "#F43F5E" },
  { label: "Blue", weight: 1 / 4, color: "#38BDF8" },
  { label: "Green", weight: 1 / 8, color: "#34D399" },
  { label: "Yellow", weight: 1 / 8, color: "#FACC15" },
];

export function outcomes(mode: ProbMode): string[] {
  switch (mode) {
    case "coin": return ["Heads", "Tails"];
    case "die": return ["1", "2", "3", "4", "5", "6"];
    case "twoDice": return Array.from({ length: 11 }, (_, i) => String(i + 2));
    case "spinner": return SPINNER.map((s) => s.label);
  }
}

// Theoretical probability of each outcome, in `outcomes(mode)` order.
export function theoretical(mode: ProbMode): number[] {
  switch (mode) {
    case "coin": return [0.5, 0.5];
    case "die": return Array(6).fill(1 / 6);
    case "twoDice": return Array.from({ length: 11 }, (_, i) => (6 - Math.abs(i + 2 - 7)) / 36);
    case "spinner": return SPINNER.map((s) => s.weight);
  }
}

// One random trial → index into `outcomes(mode)`. For twoDice also returns
// the two faces so the UI can draw them.
export function sample(mode: ProbMode, rng: () => number = Math.random): { index: number; faces?: [number, number] } {
  switch (mode) {
    case "coin": return { index: rng() < 0.5 ? 0 : 1 };
    case "die": return { index: Math.min(5, Math.floor(rng() * 6)) };
    case "twoDice": {
      const a = Math.min(6, Math.floor(rng() * 6) + 1);
      const b = Math.min(6, Math.floor(rng() * 6) + 1);
      return { index: a + b - 2, faces: [a, b] };
    }
    case "spinner": {
      const r = rng();
      let acc = 0;
      for (let i = 0; i < SPINNER.length; i++) {
        acc += SPINNER[i].weight;
        if (r < acc) return { index: i };
      }
      return { index: SPINNER.length - 1 };
    }
  }
}

// Relative frequencies from raw counts (all zeros when nothing has run yet).
export function relativeFrequencies(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  return counts.map((c) => (total ? c / total : 0));
}

// ── Statistics ────────────────────────────────────────────────────────────
export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
// Every value that appears most often (several when tied; none if all unique).
export function modes(xs: number[]): number[] {
  const counts = new Map<number, number>();
  xs.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
  const top = Math.max(0, ...counts.values());
  if (top <= 1) return [];
  return [...counts.entries()].filter(([, c]) => c === top).map(([v]) => v).sort((a, b) => a - b);
}
export function range(xs: number[]): number {
  return xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
}

// ── Pythagoras ────────────────────────────────────────────────────────────
export function hypotenuse(a: number, b: number): number {
  return Math.sqrt(a * a + b * b);
}
export function isPythagoreanTriple(a: number, b: number): boolean {
  const c = hypotenuse(a, b);
  return Number.isInteger(a) && Number.isInteger(b) && Math.abs(c - Math.round(c)) < 1e-9;
}

// ── Pendulum ──────────────────────────────────────────────────────────────
export const GRAVITY = [
  { label: "Earth", g: 9.81 },
  { label: "Moon", g: 1.62 },
  { label: "Mars", g: 3.71 },
  { label: "Jupiter", g: 24.79 },
];
// Small-angle period T = 2π√(L/g), in seconds.
export function pendulumPeriod(lengthM: number, g: number): number {
  return 2 * Math.PI * Math.sqrt(lengthM / g);
}
// Angle (degrees) at time t for amplitude a0, using the small-angle solution.
export function pendulumAngle(a0Deg: number, lengthM: number, g: number, t: number): number {
  return a0Deg * Math.cos((2 * Math.PI * t) / pendulumPeriod(lengthM, g));
}

// ── Ohm's law ─────────────────────────────────────────────────────────────
export function current(volts: number, ohms: number): number {
  return ohms > 0 ? volts / ohms : 0;
}
export function power(volts: number, ohms: number): number {
  return ohms > 0 ? (volts * volts) / ohms : 0;
}
// Bulb glow 0–1 from power, log-scaled so small circuits still show a glow.
export function bulbBrightness(watts: number): number {
  return Math.max(0, Math.min(1, Math.log10(1 + watts) / Math.log10(1 + 30)));
}

// ── Titration (strong acid in flask, strong base from burette) ────────────
const KW = 1e-14;
// pH after `baseMl` of base (conc cb) is added to `acidMl` of acid (conc ca).
// Uses the exact charge balance so the curve is smooth through equivalence.
export function titrationPH(acidMl: number, ca: number, baseMl: number, cb: number): number {
  const totalL = (acidMl + baseMl) / 1000;
  const excessH = (ca * acidMl - cb * baseMl) / 1000 / totalL; // mol/L, negative = excess OH-
  const h = (excessH + Math.sqrt(excessH * excessH + 4 * KW)) / 2;
  return -Math.log10(h);
}
export function equivalenceVolume(acidMl: number, ca: number, cb: number): number {
  return (ca * acidMl) / cb;
}

export type Indicator = "universal" | "phenolphthalein" | "methylOrange" | "bromothymolBlue";

type Stop = [number, [number, number, number, number]]; // pH, rgba
const INDICATOR_STOPS: Record<Indicator, Stop[]> = {
  universal: [
    [1, [220, 38, 38, 0.85]], [3, [249, 115, 22, 0.85]], [5, [250, 204, 21, 0.85]],
    [7, [34, 197, 94, 0.85]], [9, [14, 165, 233, 0.85]], [11, [59, 76, 202, 0.85]], [13, [124, 58, 237, 0.85]],
  ],
  phenolphthalein: [[8.1, [255, 255, 255, 0.12]], [8.3, [255, 182, 222, 0.45]], [10, [236, 72, 153, 0.85]], [12, [190, 24, 93, 0.9]]],
  methylOrange: [[3.1, [220, 38, 38, 0.85]], [4.4, [250, 204, 21, 0.85]]],
  bromothymolBlue: [[6, [250, 204, 21, 0.85]], [7, [74, 222, 128, 0.85]], [7.6, [37, 99, 235, 0.85]]],
};

// Solution colour for an indicator at a pH, as an rgba() string.
export function indicatorColor(ind: Indicator, ph: number): string {
  const stops = INDICATOR_STOPS[ind];
  let c = stops[0][1];
  if (ph >= stops[stops.length - 1][0]) c = stops[stops.length - 1][1];
  else {
    for (let i = 0; i < stops.length - 1; i++) {
      const [p0, c0] = stops[i];
      const [p1, c1] = stops[i + 1];
      if (ph >= p0 && ph <= p1) {
        const t = (ph - p0) / (p1 - p0);
        c = c0.map((v, k) => v + (c1[k] - v) * t) as Stop[1];
        break;
      }
    }
  }
  const [r, g, b, a] = c;
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(2)})`;
}

// ── Photosynthesis (pondweed bubbles) ─────────────────────────────────────
export type Limiting = "light" | "CO₂" | "temperature";
const MAX_RATE = 60; // bubbles per minute at saturation

// Each factor's potential, 0–1. Light & CO₂ saturate; temperature is an enzyme
// curve peaking near 35 °C and collapsing above ~45 °C (denaturing).
export function photoFactors(light: number, co2: number, tempC: number) {
  const l = 1 - Math.exp(-Math.max(0, light) / 30);
  const c = 1 - Math.exp(-Math.max(0, co2) / 30);
  const t = tempC <= 0 ? 0 : tempC <= 35
    ? Math.exp(-(((tempC - 35) / 14) ** 2))
    : Math.exp(-(((tempC - 35) / 6) ** 2));
  return { light: l, co2: c, temp: t };
}
export function photosynthesisRate(light: number, co2: number, tempC: number): number {
  const f = photoFactors(light, co2, tempC);
  return Math.round(MAX_RATE * Math.min(f.light, f.co2) * f.temp);
}
export function limitingFactor(light: number, co2: number, tempC: number): Limiting {
  const f = photoFactors(light, co2, tempC);
  const min = Math.min(f.light, f.co2, f.temp);
  return min === f.temp ? "temperature" : min === f.light ? "light" : "CO₂";
}

// ── Density: sink or float ────────────────────────────────────────────────
export const OBJECTS = [
  { label: "Cork", rho: 0.24, emoji: "🍾" },
  { label: "Pine wood", rho: 0.5, emoji: "🪵" },
  { label: "Apple", rho: 0.8, emoji: "🍎" },
  { label: "Ice", rho: 0.92, emoji: "🧊" },
  { label: "Egg", rho: 1.03, emoji: "🥚" },
  { label: "Plastic (PET)", rho: 1.38, emoji: "🧴" },
  { label: "Aluminium", rho: 2.7, emoji: "🥫" },
  { label: "Iron", rho: 7.87, emoji: "🔩" },
  { label: "Gold", rho: 19.3, emoji: "🪙" },
];
export const LIQUIDS = [
  { label: "Cooking oil", rho: 0.92, color: "rgba(250, 204, 21, 0.45)" },
  { label: "Water", rho: 1.0, color: "rgba(56, 189, 248, 0.40)" },
  { label: "Salt water", rho: 1.2, color: "rgba(45, 212, 191, 0.45)" },
  { label: "Honey", rho: 1.42, color: "rgba(217, 119, 6, 0.65)" },
  { label: "Mercury", rho: 13.6, color: "rgba(203, 213, 225, 0.85)" },
];
// Fraction of the object below the surface (1 = fully submerged → sinks).
export function submergedFraction(objectRho: number, liquidRho: number): number {
  return Math.min(1, objectRho / liquidRho);
}
export function floats(objectRho: number, liquidRho: number): boolean {
  return objectRho < liquidRho;
}

// ── Quadratic graphs y = ax² + bx + c ─────────────────────────────────────
export function quadValue(a: number, b: number, c: number, x: number): number {
  return a * x * x + b * x + c;
}
export function discriminant(a: number, b: number, c: number): number {
  return b * b - 4 * a * c;
}
// Real roots, smallest first (none, one repeated, or two). Linear if a = 0.
export function quadRoots(a: number, b: number, c: number): number[] {
  if (a === 0) return b === 0 ? [] : [-c / b];
  const D = discriminant(a, b, c);
  if (D < -1e-12) return [];
  if (Math.abs(D) <= 1e-12) return [-b / (2 * a)];
  const r = Math.sqrt(D);
  return [(-b - r) / (2 * a), (-b + r) / (2 * a)].sort((m, n) => m - n);
}
export function vertex(a: number, b: number, c: number): { x: number; y: number } {
  const x = -b / (2 * a);
  return { x, y: quadValue(a, b, c, x) };
}

// ── Unit circle & trig ─────────────────────────────────────────────────────
export function unitPoint(deg: number): { x: number; y: number } {
  const r = (deg * Math.PI) / 180;
  // Snap tiny float noise so cos 90° shows as 0, not 6e-17.
  const snap = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
  return { x: snap(Math.cos(r)), y: snap(Math.sin(r)) };
}
export function quadrant(deg: number): 1 | 2 | 3 | 4 | null {
  const d = ((deg % 360) + 360) % 360;
  if (d % 90 === 0) return null; // on an axis
  return (Math.floor(d / 90) + 1) as 1 | 2 | 3 | 4;
}
// "All Students Take Calculus": which ratios are positive in each quadrant.
export const ASTC: Record<1 | 2 | 3 | 4, string> = { 1: "All", 2: "Sin", 3: "Tan", 4: "Cos" };

// ── Transformations on a grid ──────────────────────────────────────────────
export type Pt = [number, number];
export function translate(pts: Pt[], dx: number, dy: number): Pt[] {
  return pts.map(([x, y]) => [x + dx, y + dy]);
}
export type Mirror = "x-axis" | "y-axis" | "y=x" | "y=-x";
export function reflect(pts: Pt[], m: Mirror): Pt[] {
  return pts.map(([x, y]) => (m === "x-axis" ? [x, -y] : m === "y-axis" ? [-x, y] : m === "y=x" ? [y, x] : [-y, -x]));
}
// Anticlockwise rotation about (cx, cy) by a multiple of 90°.
export function rotate(pts: Pt[], deg: 90 | 180 | 270, cx = 0, cy = 0): Pt[] {
  return pts.map(([x, y]) => {
    const u = x - cx, v = y - cy;
    const [p, q] = deg === 90 ? [-v, u] : deg === 180 ? [-u, -v] : [v, -u];
    return [p + cx, q + cy];
  });
}
export function enlarge(pts: Pt[], k: number, cx = 0, cy = 0): Pt[] {
  return pts.map(([x, y]) => [cx + k * (x - cx), cy + k * (y - cy)]);
}
// Signed area (shoelace) — enlargement by k scales area by k².
export function polygonArea(pts: Pt[]): number {
  let s = 0;
  pts.forEach(([x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; s += x * y2 - x2 * y; });
  return Math.abs(s) / 2;
}

// ── Projectile motion (no air resistance, launched from ground level) ──────
export function flightTime(v: number, angleDeg: number, g = 9.81): number {
  return (2 * v * Math.sin((angleDeg * Math.PI) / 180)) / g;
}
export function projectileRange(v: number, angleDeg: number, g = 9.81): number {
  return (v * v * Math.sin((2 * angleDeg * Math.PI) / 180)) / g;
}
export function maxHeight(v: number, angleDeg: number, g = 9.81): number {
  const vy = v * Math.sin((angleDeg * Math.PI) / 180);
  return (vy * vy) / (2 * g);
}
export function projectilePos(v: number, angleDeg: number, t: number, g = 9.81): { x: number; y: number } {
  const r = (angleDeg * Math.PI) / 180;
  return { x: v * Math.cos(r) * t, y: Math.max(0, v * Math.sin(r) * t - 0.5 * g * t * t) };
}

// ── Hooke's law: a spring with an elastic limit ────────────────────────────
export const SPRINGS = [
  { label: "Soft spring", k: 50, limitN: 6 },
  { label: "Medium spring", k: 80, limitN: 12 },
  { label: "Stiff spring", k: 200, limitN: 20 },
];
// Extension (m) for a load (N). Linear (F = kx) up to the elastic limit, then
// the spring yields and stretches disproportionately.
export function springExtension(loadN: number, k: number, limitN: number): number {
  if (loadN <= limitN) return loadN / k;
  const over = loadN - limitN;
  return limitN / k + (over / k) * (1 + over / limitN) * 2;
}
// Has the spring been stretched past its limit (it won't return to length)?
export function beyondLimit(loadN: number, limitN: number): boolean {
  return loadN > limitN;
}

// ── Refraction & total internal reflection ─────────────────────────────────
export const MEDIA = [
  { label: "Air", n: 1.0 },
  { label: "Water", n: 1.33 },
  { label: "Glass", n: 1.5 },
  { label: "Diamond", n: 2.42 },
];
// Snell's law n₁ sin θ₁ = n₂ sin θ₂. Returns the refracted angle in degrees,
// or null when the ray is totally internally reflected.
export function refractedAngle(n1: number, n2: number, incidentDeg: number): number | null {
  const s = (n1 / n2) * Math.sin((incidentDeg * Math.PI) / 180);
  if (s > 1 + 1e-12) return null;
  return (Math.asin(Math.min(1, s)) * 180) / Math.PI;
}
// Critical angle (degrees) going from dense n1 into less dense n2; null if none.
export function criticalAngle(n1: number, n2: number): number | null {
  return n1 > n2 ? (Math.asin(n2 / n1) * 180) / Math.PI : null;
}

// ── Reactivity series ──────────────────────────────────────────────────────
// Vigour 0–1 with dilute acid and with cold water, plus what you'd observe.
export const METALS = [
  { label: "Potassium", symbol: "K", acid: 1, water: 1, note: "Explodes in acid — far too dangerous to test! Fizzes violently on water with a lilac flame." },
  { label: "Sodium", symbol: "Na", acid: 0.95, water: 0.85, note: "Too dangerous with acid. Whizzes around on water, melting into a ball." },
  { label: "Calcium", symbol: "Ca", acid: 0.8, water: 0.5, note: "Fizzes quickly; the water turns cloudy (calcium hydroxide)." },
  { label: "Magnesium", symbol: "Mg", acid: 0.65, water: 0.04, note: "Fizzes strongly in acid and gets warm; barely reacts with cold water." },
  { label: "Zinc", symbol: "Zn", acid: 0.35, water: 0, note: "Steady bubbles of hydrogen in acid; no reaction with water." },
  { label: "Iron", symbol: "Fe", acid: 0.15, water: 0, note: "A few slow bubbles in acid; rusts only slowly in water." },
  { label: "Copper", symbol: "Cu", acid: 0, water: 0, note: "No reaction — copper is below hydrogen in the series." },
  { label: "Gold", symbol: "Au", acid: 0, water: 0, note: "No reaction at all. That's why gold stays shiny for centuries." },
] as const;
export type Reagent = "acid" | "water";
export function bubbleRate(metal: (typeof METALS)[number], reagent: Reagent): number {
  return reagent === "acid" ? metal.acid : metal.water;
}
// Safe to test in a school lab? (Group 1 metals in acid are not.)
export function safeToTest(metal: (typeof METALS)[number], reagent: Reagent): boolean {
  return !(reagent === "acid" && (metal.symbol === "K" || metal.symbol === "Na"));
}

// ── Rates of reaction: marble chips (CaCO₃) + hydrochloric acid ────────────
// CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂. 10 cm³ of acid; gas at 24 000 cm³/mol,
// so a 0.1–0.5 g sample fills a 120 cm³ gas syringe at most.
export const ACID_VOLUME_CM3 = 10;
export function finalGasVolume(massG: number, acidConc: number): number {
  const molCaCO3 = massG / 100;
  const molHCl = (acidConc * ACID_VOLUME_CM3) / 1000;
  return Math.min(molCaCO3, molHCl / 2) * 24000;
}
// First-order rate constant (per second): ∝ concentration and surface area,
// and doubling for every 10 °C rise above 20 °C.
export function rateConstant(acidConc: number, tempC: number, surface: "chips" | "small" | "powder"): number {
  const area = surface === "chips" ? 1 : surface === "small" ? 2.2 : 6;
  return 0.012 * acidConc * area * 2 ** ((tempC - 20) / 10);
}
export function gasVolumeAt(t: number, finalV: number, k: number): number {
  return finalV * (1 - Math.exp(-k * t));
}

// ── Gas laws (fixed amount of gas) ─────────────────────────────────────────
export const toKelvin = (c: number) => c + 273;
// Boyle: pV constant at fixed T.
export function boyleVolume(p: number, p0: number, v0: number): number {
  return (p0 * v0) / p;
}
// Charles: V/T constant at fixed p (T in kelvin).
export function charlesVolume(tK: number, t0K: number, v0: number): number {
  return (v0 * tK) / t0K;
}
// Pressure law: p/T constant at fixed V.
export function pressureAt(tK: number, t0K: number, p0: number): number {
  return (p0 * tK) / t0K;
}

// ── Osmosis: potato cylinders in sucrose solution ──────────────────────────
// % change in mass; zero at the isotonic point (~0.3 mol/dm³), levelling off
// once cells are fully turgid or fully plasmolysed.
export const ISOTONIC = 0.3;
export function osmosisMassChange(conc: number): number {
  const raw = 60 * (ISOTONIC - conc);
  return Math.max(-28, Math.min(18, raw));
}

// ── Enzymes: starch digestion by amylase-type enzymes ──────────────────────
export const ENZYMES = [
  { label: "Salivary amylase", optimumPH: 7, optimumT: 37 },
  { label: "Pepsin (stomach)", optimumPH: 2, optimumT: 37 },
  { label: "Trypsin (small intestine)", optimumPH: 8, optimumT: 37 },
];
// Relative activity 0–1: rises with temperature to the optimum, collapses as
// the enzyme denatures above ~45 °C; bell-shaped around the optimum pH.
export function enzymeActivity(tempC: number, pH: number, optimumPH: number, optimumT = 37): number {
  const t = tempC <= 0 ? 0 : tempC <= optimumT
    ? Math.exp(-(((tempC - optimumT) / 18) ** 2))
    : Math.exp(-(((tempC - optimumT) / 7) ** 2));
  const p = Math.exp(-(((pH - optimumPH) / 1.6) ** 2));
  return t * p;
}
// Minutes until the iodine test stops turning blue-black (capped at 20).
export function digestionTime(activity: number): number {
  return activity < 0.05 ? 20 : Math.min(20, 1 / activity);
}

// ── Cell explorer ──────────────────────────────────────────────────────────
export type CellPart = { id: string; label: string; plant: boolean; animal: boolean; job: string };
export const CELL_PARTS: CellPart[] = [
  { id: "membrane", label: "Cell membrane", plant: true, animal: true, job: "Controls what enters and leaves the cell." },
  { id: "cytoplasm", label: "Cytoplasm", plant: true, animal: true, job: "Jelly where most chemical reactions happen." },
  { id: "nucleus", label: "Nucleus", plant: true, animal: true, job: "Holds the DNA and controls the cell's activities." },
  { id: "mitochondria", label: "Mitochondria", plant: true, animal: true, job: "Release energy from glucose by aerobic respiration." },
  { id: "ribosomes", label: "Ribosomes", plant: true, animal: true, job: "Where proteins are made." },
  { id: "wall", label: "Cell wall", plant: true, animal: false, job: "Cellulose layer that supports and strengthens the cell." },
  { id: "vacuole", label: "Permanent vacuole", plant: true, animal: false, job: "Filled with cell sap; keeps the cell firm (turgid)." },
  { id: "chloroplasts", label: "Chloroplasts", plant: true, animal: false, job: "Contain chlorophyll to absorb light for photosynthesis." },
];
export function partsOf(cell: "plant" | "animal"): CellPart[] {
  return CELL_PARTS.filter((p) => p[cell]);
}

// ── Moments (principle of moments) ──────────────────────────────────────
// Masses hang on a uniform beam pivoted at its centre; distances in cm from the
// pivot, masses in g. A positive net moment turns the beam clockwise (right side down).
export type Load = { massG: number; distCm: number; side: "left" | "right" };
export function momentNcm(massG: number, distCm: number, g = 9.81): number {
  return (massG / 1000) * g * distCm;
}
export function netMoment(loads: Load[], g = 9.81): number {
  return loads.reduce((s, l) => s + (l.side === "right" ? 1 : -1) * momentNcm(l.massG, l.distCm, g), 0);
}
export function balanced(loads: Load[], tolNcm = 0.01): boolean {
  return Math.abs(netMoment(loads)) <= tolNcm;
}
// Beam tilt for drawing: proportional to the imbalance, capped at ±maxDeg.
export function beamTilt(loads: Load[], maxDeg = 14): number {
  const n = netMoment(loads);
  if (Math.abs(n) < 0.01) return 0;
  return Math.max(-maxDeg, Math.min(maxDeg, n * 0.6 + Math.sign(n) * 2));
}
// The distance a mass must sit at to balance a given moment (cm).
export function balancingDistance(momentToBalanceNcm: number, massG: number, g = 9.81): number {
  return momentToBalanceNcm / ((massG / 1000) * g);
}

// ── Convex lens (real-is-positive, distances in cm) ─────────────────────
export function imageDistance(u: number, f: number): number | null {
  if (Math.abs(u - f) < 1e-9) return null; // object at F: image at infinity
  return (u * f) / (u - f);
}
export function magnification(u: number, f: number): number | null {
  const v = imageDistance(u, f);
  return v === null ? null : v / u;
}
export function imageNature(u: number, f: number): { real: boolean; inverted: boolean; size: "magnified" | "diminished" | "same size" } | null {
  const v = imageDistance(u, f);
  if (v === null) return null;
  const m = Math.abs(v / u);
  return {
    real: v > 0,
    inverted: v > 0,
    size: Math.abs(m - 1) < 0.02 ? "same size" : m > 1 ? "magnified" : "diminished",
  };
}

// ── Heating curve of water (constant heater power) ──────────────────────
export const WATER = { cIce: 2100, cWater: 4200, cSteam: 2010, Lf: 334_000, Lv: 2_260_000 } as const;
export type Phase = "ice" | "melting" | "water" | "boiling" | "steam";
// Energy (J) needed to take m kg of ice at startC (≤ 0) up to each stage boundary.
export function heatingStages(m: number, startC = -20) {
  const e1 = m * WATER.cIce * (0 - startC);
  const e2 = e1 + m * WATER.Lf;
  const e3 = e2 + m * WATER.cWater * 100;
  const e4 = e3 + m * WATER.Lv;
  return { warmIce: e1, melted: e2, toBoil: e3, boiledAway: e4 };
}
export function heatingState(energyJ: number, m: number, startC = -20): { tempC: number; phase: Phase; fractionChanged: number } {
  const s = heatingStages(m, startC);
  const E = Math.max(0, energyJ);
  if (E < s.warmIce) return { tempC: startC + E / (m * WATER.cIce), phase: "ice", fractionChanged: 0 };
  if (E < s.melted) return { tempC: 0, phase: "melting", fractionChanged: (E - s.warmIce) / (m * WATER.Lf) };
  if (E < s.toBoil) return { tempC: (E - s.melted) / (m * WATER.cWater), phase: "water", fractionChanged: 1 };
  if (E < s.boiledAway) return { tempC: 100, phase: "boiling", fractionChanged: (E - s.toBoil) / (m * WATER.Lv) };
  return { tempC: 100 + (E - s.boiledAway) / (m * WATER.cSteam), phase: "steam", fractionChanged: 1 };
}

// ── Waves: v = fλ ───────────────────────────────────────────────────────
export const WAVE_MEDIA = [
  { id: "rope", label: "Rope", speed: 4 },
  { id: "water", label: "Shallow water", speed: 0.3 },
  { id: "sound", label: "Sound in air", speed: 340 },
  { id: "steel", label: "Sound in steel", speed: 5000 },
] as const;
export function wavelength(speed: number, freq: number): number {
  return freq > 0 ? speed / freq : Infinity;
}
export function wavePeriod(freq: number): number {
  return freq > 0 ? 1 / freq : Infinity;
}
// Displacement of a travelling wave at position x (m) and time t (s).
export function waveY(x: number, t: number, amp: number, speed: number, freq: number): number {
  const k = (2 * Math.PI) / wavelength(speed, freq);
  return amp * Math.sin(k * x - 2 * Math.PI * freq * t);
}

// ── Electrolysis of copper(II) sulfate with copper electrodes ───────────
export const FARADAY = 96_500;
export function chargeC(currentA: number, timeS: number): number {
  return currentA * timeS;
}
// Cu²⁺ + 2e⁻ → Cu at the cathode; the anode loses the same mass.
export function copperDepositedG(currentA: number, timeS: number): number {
  return (chargeC(currentA, timeS) / (2 * FARADAY)) * 63.5;
}

// ── Paper chromatography ────────────────────────────────────────────────
export const DYES = [
  { id: "yellow", label: "Yellow", color: "#FACC15", rf: 0.85 },
  { id: "red", label: "Red", color: "#EF4444", rf: 0.62 },
  { id: "blue", label: "Blue", color: "#3B82F6", rf: 0.4 },
  { id: "purple", label: "Purple", color: "#A855F7", rf: 0.22 },
  { id: "green", label: "Green", color: "#22C55E", rf: 0.5 },
] as const;
export type DyeId = (typeof DYES)[number]["id"];
export const INKS: { id: string; label: string; dyes: DyeId[] }[] = [
  { id: "A", label: "Ink A", dyes: ["yellow", "blue"] },
  { id: "B", label: "Ink B", dyes: ["red", "purple"] },
  { id: "C", label: "Ink C", dyes: ["red", "yellow", "blue"] },
  { id: "D", label: "Ink D", dyes: ["green"] },
];
export function rf(spotCm: number, solventCm: number): number {
  return solventCm > 0 ? spotCm / solventCm : 0;
}
// How far each dye has moved when the solvent front is at frontCm.
export function spotPositions(dyes: DyeId[], frontCm: number): { id: DyeId; cm: number }[] {
  return dyes.map((id) => ({ id, cm: (DYES.find((d) => d.id === id)?.rf ?? 0) * frontCm }));
}

// ── Flame tests ─────────────────────────────────────────────────────────
export const FLAME_IONS = [
  { ion: "Li⁺", name: "Lithium", color: "#E11D48", colourName: "crimson red" },
  { ion: "Na⁺", name: "Sodium", color: "#F59E0B", colourName: "golden yellow" },
  { ion: "K⁺", name: "Potassium", color: "#C084FC", colourName: "lilac" },
  { ion: "Ca²⁺", name: "Calcium", color: "#EA580C", colourName: "brick red" },
  { ion: "Cu²⁺", name: "Copper(II)", color: "#14B8A6", colourName: "blue-green" },
  { ion: "Ba²⁺", name: "Barium", color: "#A3E635", colourName: "apple green" },
] as const;
export function flameColour(ion: string): string | null {
  return FLAME_IONS.find((f) => f.ion === ion)?.colourName ?? null;
}

// ── Food tests ──────────────────────────────────────────────────────────
export type FoodTest = "benedicts" | "iodine" | "biuret" | "emulsion";
export const FOOD_TESTS: { id: FoodTest; label: string; detects: string; negative: string; positive: string; negColor: string; posColor: string; needsHeat: boolean }[] = [
  { id: "benedicts", label: "Benedict's", detects: "reducing sugar", negative: "stays blue", positive: "brick-red precipitate", negColor: "#3B82F6", posColor: "#C2410C", needsHeat: true },
  { id: "iodine", label: "Iodine", detects: "starch", negative: "stays orange-brown", positive: "blue-black", negColor: "#D97706", posColor: "#1E1B4B", needsHeat: false },
  { id: "biuret", label: "Biuret", detects: "protein", negative: "stays blue", positive: "purple / lilac", negColor: "#60A5FA", posColor: "#7E22CE", needsHeat: false },
  { id: "emulsion", label: "Ethanol emulsion", detects: "fat / oil", negative: "stays clear", positive: "cloudy white emulsion", negColor: "#CBD5E1", posColor: "#F8FAFC", needsHeat: false },
];
export const FOODS: { id: string; label: string; has: FoodTest[] }[] = [
  { id: "glucose", label: "Glucose solution", has: ["benedicts"] },
  { id: "starch", label: "Starch (cassava flour)", has: ["iodine"] },
  { id: "egg", label: "Egg white", has: ["biuret"] },
  { id: "oil", label: "Groundnut oil", has: ["emulsion"] },
  { id: "milk", label: "Milk", has: ["benedicts", "biuret", "emulsion"] },
  { id: "bread", label: "Bread", has: ["iodine", "biuret"] },
  { id: "water", label: "Distilled water", has: [] },
];
// Result of one test: Benedict's only reacts when heated.
export function foodTestResult(foodId: string, test: FoodTest, heated: boolean): boolean {
  const food = FOODS.find((f) => f.id === foodId);
  if (!food) return false;
  if (test === "benedicts" && !heated) return false;
  return food.has.includes(test);
}

// ── Transpiration (bubble potometer) ────────────────────────────────────
// Relative rate: rises with light, wind and temperature; falls with humidity.
// Inputs: light 0–100 %, wind 0–3 (still → strong), humidity 20–100 %, temp 10–40 °C.
export function transpirationRate(light: number, wind: number, humidity: number, tempC: number): number {
  const L = 0.25 + 0.75 * Math.min(1, light / 100);          // stomata open with light
  const W = 1 + 0.45 * Math.max(0, Math.min(3, wind));         // wind removes humid air
  const H = Math.max(0.05, (100 - humidity) / 80);             // steeper gradient in dry air
  const T = 0.5 + Math.max(0, Math.min(40, tempC) - 10) / 30;  // faster evaporation
  return +(L * W * H * T).toFixed(3);                          // mm of bubble movement per minute
}
export function bubbleDistanceMm(rate: number, minutes: number): number {
  return rate * minutes * 4;
}

// ── Genetics: monohybrid cross ──────────────────────────────────────────
export type Genotype = "AA" | "Aa" | "aa";
export function gametes(g: Genotype): [string, string] {
  return [g[0], g[1]] as [string, string];
}
export function punnett(p1: Genotype, p2: Genotype): Genotype[][] {
  const [a, b] = gametes(p1), [c, d] = gametes(p2);
  const join = (x: string, y: string) => ([x, y].sort((m, n) => (m === "A" ? -1 : n === "A" ? 1 : 0)).join("") as Genotype);
  return [[join(a, c), join(a, d)], [join(b, c), join(b, d)]];
}
export function crossRatios(p1: Genotype, p2: Genotype) {
  const cells = punnett(p1, p2).flat();
  const count = (g: Genotype) => cells.filter((c) => c === g).length;
  const dominant = cells.filter((c) => c.includes("A")).length;
  return { AA: count("AA"), Aa: count("Aa"), aa: count("aa"), dominant, recessive: 4 - dominant };
}

// ── Circle theorems ─────────────────────────────────────────────────────
// Points on a circle given by angles (degrees). The angle subtended at the
// centre by arc AB, and at a point P on the major arc.
export function centralAngle(aDeg: number, bDeg: number): number {
  let d = Math.abs(aDeg - bDeg) % 360;
  if (d > 180) d = 360 - d;
  return d;
}
export function inscribedAngle(aDeg: number, bDeg: number, pDeg: number): number {
  const pt = (deg: number) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
  const [ax, ay] = pt(aDeg), [bx, by] = pt(bDeg), [px, py] = pt(pDeg);
  const v1 = [ax - px, ay - py], v2 = [bx - px, by - py];
  const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}
// Is P on the major arc (the side away from the minor arc AB)?
export function onMajorArc(aDeg: number, bDeg: number, pDeg: number): boolean {
  const norm = (x: number) => ((x % 360) + 360) % 360;
  const a = norm(aDeg), b = norm(bDeg), p = norm(pDeg);
  const span = norm(b - a);
  const inside = norm(p - a) < span; // P between A and B going anticlockwise
  return span <= 180 ? !inside : inside;
}

// ── Straight lines & simultaneous equations ─────────────────────────────
export function intersection(m1: number, c1: number, m2: number, c2: number): { x: number; y: number } | "parallel" | "same" {
  if (Math.abs(m1 - m2) < 1e-9) return Math.abs(c1 - c2) < 1e-9 ? "same" : "parallel";
  const x = (c2 - c1) / (m1 - m2);
  return { x, y: m1 * x + c1 };
}

// ── Mensuration ─────────────────────────────────────────────────────────
export type Solid = "cylinder" | "cone" | "sphere" | "cuboid";
export function solidVolume(s: Solid, r: number, h: number, w = r): number {
  switch (s) {
    case "cylinder": return Math.PI * r * r * h;
    case "cone": return (Math.PI * r * r * h) / 3;
    case "sphere": return (4 / 3) * Math.PI * r ** 3;
    case "cuboid": return r * w * h;
  }
}
export function solidSurface(s: Solid, r: number, h: number, w = r): number {
  switch (s) {
    case "cylinder": return 2 * Math.PI * r * (r + h);
    case "cone": return Math.PI * r * (r + Math.hypot(r, h));
    case "sphere": return 4 * Math.PI * r * r;
    case "cuboid": return 2 * (r * w + r * h + w * h);
  }
}

// ── Fraction wall ─────────────────────────────────────────────────────────
export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export function simplify(n: number, d: number): [number, number] {
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
}
export const equivalent = (a: [number, number], b: [number, number]) => a[0] * b[1] === b[0] * a[1];
// -1, 0 or 1 like a comparator: is a/b less than, equal to or greater than c/d?
export const compareFractions = (a: [number, number], b: [number, number]) => Math.sign(a[0] * b[1] - b[0] * a[1]);
export function addFractions(a: [number, number], b: [number, number]): [number, number] {
  return simplify(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
}

// ── Angles in polygons ────────────────────────────────────────────────────
export const interiorSum = (n: number) => (n - 2) * 180;
export const interiorAngle = (n: number) => interiorSum(n) / n;   // regular polygon
export const exteriorAngle = (n: number) => 360 / n;              // regular polygon
// Regular polygon with this exterior angle? (Only if 360 divides exactly.)
export const sidesFromExterior = (ext: number) => (ext > 0 && Number.isInteger(360 / ext) && 360 / ext >= 3 ? 360 / ext : null);
export const POLYGON_NAMES: Record<number, string> = { 3: "Triangle", 4: "Quadrilateral", 5: "Pentagon", 6: "Hexagon", 7: "Heptagon", 8: "Octagon", 9: "Nonagon", 10: "Decagon", 12: "Dodecagon" };

// ── Free fall ─────────────────────────────────────────────────────────────
export const PLANETS = [
  { id: "earth", label: "Earth", g: 9.81 },
  { id: "moon", label: "Moon", g: 1.62 },
  { id: "mars", label: "Mars", g: 3.71 },
  { id: "jupiter", label: "Jupiter", g: 24.79 },
] as const;
// Time to fall h metres from rest with no air resistance: t = √(2h/g).
export const fallTime = (h: number, g: number) => Math.sqrt((2 * h) / g);
export const fallSpeed = (h: number, g: number) => Math.sqrt(2 * g * h);
// What a learner calculates from a timed drop: g = 2h / t².
export const gFromDrop = (h: number, t: number) => (2 * h) / (t * t);
// A stopwatch reading with human reaction error (±reaction seconds).
export function timedDrop(h: number, g: number, reaction = 0.08, rng: () => number = Math.random): number {
  return Math.max(0.01, fallTime(h, g) + (rng() * 2 - 1) * reaction);
}

// ── Specific heat capacity ────────────────────────────────────────────────
export const BLOCKS = [
  { id: "aluminium", label: "Aluminium", c: 900 },
  { id: "copper", label: "Copper", c: 385 },
  { id: "iron", label: "Iron", c: 450 },
  { id: "water", label: "Water", c: 4200 },
] as const;
// Temperature rise when a P-watt heater runs for t seconds into m kg: ΔT = Pt / (mc).
// `loss` (0–1) is the fraction of energy lost to the surroundings.
export const tempRise = (powerW: number, seconds: number, massKg: number, c: number, loss = 0) =>
  (powerW * seconds * (1 - loss)) / (massKg * c);
export const shcFrom = (powerW: number, seconds: number, massKg: number, rise: number) =>
  rise > 0 ? (powerW * seconds) / (massKg * rise) : 0;

// ── pH and indicators ─────────────────────────────────────────────────────
export const SUBSTANCES = [
  { id: "battery", label: "Battery acid", ph: 0.5 },
  { id: "lemon", label: "Lemon juice", ph: 2.2 },
  { id: "vinegar", label: "Vinegar", ph: 2.9 },
  { id: "soda", label: "Fizzy drink", ph: 3.3 },
  { id: "rain", label: "Rain water", ph: 5.6 },
  { id: "milk", label: "Milk", ph: 6.6 },
  { id: "water", label: "Pure water", ph: 7 },
  { id: "blood", label: "Blood", ph: 7.4 },
  { id: "baking", label: "Baking soda solution", ph: 8.3 },
  { id: "antacid", label: "Antacid (milk of magnesia)", ph: 10.5 },
  { id: "ammonia", label: "Household ammonia", ph: 11.6 },
  { id: "bleach", label: "Bleach", ph: 12.6 },
  { id: "drain", label: "Drain cleaner (NaOH)", ph: 13.8 },
] as const;
export type PhIndicator = "universal" | "litmus" | "phenolphthalein" | "methyl-orange";
export function phCategory(ph: number): string {
  if (ph < 3) return "strong acid";
  if (ph < 7) return "weak acid";
  if (ph === 7) return "neutral";
  if (ph <= 11) return "weak alkali";
  return "strong alkali";
}
// Universal indicator colour for a pH (the classic red → purple scale).
export function universalColour(ph: number): { name: string; hex: string } {
  const scale = [
    { max: 2, name: "red", hex: "#DC2626" }, { max: 4, name: "orange", hex: "#F97316" }, { max: 6, name: "yellow", hex: "#FACC15" },
    { max: 7.5, name: "green", hex: "#22C55E" }, { max: 9, name: "blue-green", hex: "#14B8A6" }, { max: 11, name: "blue", hex: "#2563EB" },
    { max: 15, name: "purple", hex: "#7C3AED" },
  ];
  return scale.find((s) => ph <= s.max)!;
}
export function indicatorColour(ind: PhIndicator, ph: number): { name: string; hex: string } {
  switch (ind) {
    case "universal": return universalColour(ph);
    case "litmus": return ph < 7 ? { name: "red", hex: "#DC2626" } : ph > 7 ? { name: "blue", hex: "#2563EB" } : { name: "purple (no change)", hex: "#7C3AED" };
    case "phenolphthalein": return ph >= 8.2 ? { name: "pink", hex: "#EC4899" } : { name: "colourless", hex: "#E2E8F0" };
    case "methyl-orange": return ph < 3.1 ? { name: "red", hex: "#DC2626" } : ph > 4.4 ? { name: "yellow", hex: "#FACC15" } : { name: "orange", hex: "#F97316" };
  }
}

// ── Exercise and heart rate ───────────────────────────────────────────────
export const ACTIVITIES = [
  { id: "rest", label: "Resting", intensity: 0 },
  { id: "walk", label: "Walking", intensity: 0.3 },
  { id: "jog", label: "Jogging", intensity: 0.6 },
  { id: "sprint", label: "Sprinting", intensity: 0.95 },
] as const;
export const maxHeartRate = (age: number) => 220 - age;
// Heart rate after `seconds` of an activity, rising towards a steady level.
export function heartRate(resting: number, age: number, intensity: number, seconds: number, fitness = 0.5): number {
  const target = resting + intensity * (maxHeartRate(age) - resting) * (1 - 0.25 * fitness);
  const tau = 40 - 15 * fitness;
  return resting + (target - resting) * (1 - Math.exp(-seconds / tau));
}
// After stopping: the rate falls back towards resting; fitter people recover faster.
export function recoveryRate(from: number, resting: number, seconds: number, fitness = 0.5): number {
  const tau = 90 - 50 * fitness;
  return resting + (from - resting) * Math.exp(-seconds / tau);
}
// Seconds until within 5 bpm of resting.
export function recoveryTime(from: number, resting: number, fitness = 0.5): number {
  if (from - resting <= 5) return 0;
  const tau = 90 - 50 * fitness;
  return Math.ceil(tau * Math.log((from - resting) / 5));
}
