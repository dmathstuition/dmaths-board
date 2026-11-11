// Three more science tools on the board — pure: the particle model, the pH
// scale and forces. What each holds, how it's cleaned as it arrives over the
// class channel, and the science behind them.
import type { Panel } from "@/lib/boardTools";

const clamp = (n: unknown, lo: number, hi: number, d: number) => { const v = Number(n); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const int = (n: unknown, lo: number, hi: number, d: number) => Math.round(clamp(n, lo, hi, d));
const panel = (p: any, d: Panel): Panel => ({ on: !!p?.on, x: clamp(p?.x, 0, 0.95, d.x), y: clamp(p?.y, 0, 0.95, d.y) });
export const neat = (x: number) => { const r = Math.round(x * 100) / 100; return `${r < 0 ? "−" : ""}${Math.abs(r)}`; };

// ═══ Particle model ═══════════════════════════════════════════════════════
export type Substance = { id: string; name: string; melt: number; boil: number; colour: string };
export const SUBSTANCES: Substance[] = [
  { id: "water", name: "Water", melt: 0, boil: 100, colour: "#3B82F6" },
  { id: "ethanol", name: "Ethanol (alcohol)", melt: -114, boil: 78, colour: "#8B5CF6" },
  { id: "wax", name: "Candle wax", melt: 60, boil: 370, colour: "#F59E0B" },
  { id: "salt", name: "Salt", melt: 801, boil: 1413, colour: "#64748B" },
  { id: "iron", name: "Iron", melt: 1538, boil: 2862, colour: "#B45309" },
  { id: "oxygen", name: "Oxygen", melt: -219, boil: -183, colour: "#EF4444" },
];
export const substance = (id: string) => SUBSTANCES.find((s) => s.id === id) ?? SUBSTANCES[0];
// The thermometer runs from well below the melting point to well above the boiling point.
export function tempRange(s: Substance): [number, number] {
  const pad = Math.max(10, Math.round((s.boil - s.melt) / 2));
  return [Math.max(-273, s.melt - pad), s.boil + pad];
}
export type ParticleState = Panel & { sub: string; temp: number };
export const DEFAULT_PARTICLES: ParticleState = { on: false, x: 0.08, y: 0.05, sub: "water", temp: -25 };
export function cleanParticles(p: any): ParticleState {
  const s = substance(String(p?.sub ?? "")), [lo, hi] = tempRange(s);
  return { ...panel(p, DEFAULT_PARTICLES), sub: s.id, temp: int(p?.temp, lo, hi, Math.round(lo + (s.melt - lo) / 2)) };
}
export type Matter = "solid" | "melting" | "liquid" | "boiling" | "gas";
export const matterAt = (s: Substance, temp: number): Matter => (temp < s.melt ? "solid" : temp === s.melt ? "melting" : temp < s.boil ? "liquid" : temp === s.boil ? "boiling" : "gas");
export const MATTER_NAMES: Record<Matter, string> = { solid: "Solid", melting: "Melting", liquid: "Liquid", boiling: "Boiling", gas: "Gas" };
// How lively the particles are, from 0 (coldest on the thermometer) to 1 (hottest).
export function energyAt(s: Substance, temp: number): number { const [lo, hi] = tempRange(s); return (temp - lo) / (hi - lo); }
export const MATTER_FACTS: Record<Matter, string[]> = {
  solid: ["Packed close together in a regular pattern.", "They vibrate about fixed places.", "Strong forces hold them, so a solid keeps its shape."],
  melting: ["The solid is melting.", "The heat is breaking particles free of their fixed places.", "The temperature stays the same until it has all melted."],
  liquid: ["Close together, but in no pattern.", "They slide past one another.", "So a liquid flows and takes the shape of its container."],
  boiling: ["The liquid is boiling.", "The heat is pulling particles right away from each other.", "The temperature stays the same until it has all boiled."],
  gas: ["Far apart.", "They move fast in every direction and bounce off the walls.", "So a gas fills its container and can be squashed."],
};
// Where the dot sits on the heating curve (both from 0 to 1): the line rises,
// goes flat while it melts, rises, goes flat while it boils, then rises again.
export const CURVE: [number, number][] = [[0, 0], [0.25, 0.3], [0.42, 0.3], [0.62, 0.7], [0.8, 0.7], [1, 1]];
export function curvePoint(s: Substance, temp: number): [number, number] {
  const [lo, hi] = tempRange(s), m = matterAt(s, temp), along = (a: number, b: number, from: number, to: number) => (temp - from) / (to - from) * (b - a) + a;
  if (m === "solid") return [along(0, 0.25, lo, s.melt), along(0, 0.3, lo, s.melt)];
  if (m === "melting") return [0.335, 0.3];
  if (m === "liquid") return [along(0.42, 0.62, s.melt, s.boil), along(0.3, 0.7, s.melt, s.boil)];
  if (m === "boiling") return [0.71, 0.7];
  return [along(0.8, 1, s.boil, hi), along(0.7, 1, s.boil, hi)];
}

// ═══ pH scale ═════════════════════════════════════════════════════════════
export type Indicator = "universal" | "litmus" | "phenolphthalein" | "methyl-orange";
export const INDICATORS: Indicator[] = ["universal", "litmus", "phenolphthalein", "methyl-orange"];
export const INDICATOR_NAMES: Record<Indicator, string> = { universal: "Universal indicator", litmus: "Litmus", phenolphthalein: "Phenolphthalein", "methyl-orange": "Methyl orange" };
const UNIVERSAL = ["#B91C1C", "#DC2626", "#EA580C", "#F97316", "#F59E0B", "#FACC15", "#BEDB39", "#22C55E", "#14B8A6", "#0EA5E9", "#2563EB", "#4338CA", "#6D28D9", "#7E22CE", "#581C87"];
export type Shade = { colour: string; name: string };
export function indicatorColour(ind: Indicator, ph: number): Shade {
  if (ind === "litmus") return ph < 7 ? { colour: "#DC2626", name: "red" } : ph > 7 ? { colour: "#2563EB", name: "blue" } : { colour: "#7E22CE", name: "purple" };
  if (ind === "phenolphthalein") return ph < 8.5 ? { colour: "#F8FAFC", name: "colourless" } : { colour: "#EC4899", name: "pink" };
  if (ind === "methyl-orange") return ph < 3.5 ? { colour: "#DC2626", name: "red" } : ph <= 4.5 ? { colour: "#F97316", name: "orange" } : { colour: "#FACC15", name: "yellow" };
  const k = Math.max(0, Math.min(14, Math.round(ph)));
  return { colour: UNIVERSAL[k], name: k <= 2 ? "red" : k <= 4 ? "orange" : k <= 6 ? "yellow" : k === 7 ? "green" : k <= 10 ? "blue" : "purple" };
}
export const phClass = (ph: number) => (ph < 3 ? "Strong acid" : ph < 7 ? "Weak acid" : ph === 7 ? "Neutral" : ph <= 11 ? "Weak alkali" : "Strong alkali");
export const PH_ITEMS: { name: string; ph: number }[] = [
  { name: "Car battery acid", ph: 1 }, { name: "Stomach acid", ph: 1.5 }, { name: "Lemon juice", ph: 2 }, { name: "Vinegar", ph: 3 }, { name: "Orange juice", ph: 3.5 }, { name: "Tomato", ph: 4 },
  { name: "Black coffee", ph: 5 }, { name: "Rain water", ph: 5.5 }, { name: "Milk", ph: 6.5 }, { name: "Pure water", ph: 7 }, { name: "Blood", ph: 7.5 }, { name: "Sea water", ph: 8 },
  { name: "Baking soda", ph: 9 }, { name: "Soap", ph: 10 }, { name: "Milk of magnesia", ph: 10.5 }, { name: "Ammonia cleaner", ph: 11.5 }, { name: "Bleach", ph: 12.5 }, { name: "Oven cleaner", ph: 13.5 },
];
export type PhState = Panel & { ph: number; ind: Indicator; hide: boolean; item: string }; // hide: the number is covered (quiz). item: the example in the beaker ("" for none)
export const DEFAULT_PH: PhState = { on: false, x: 0.08, y: 0.05, ph: 7, ind: "universal", hide: false, item: "Pure water" };
export function cleanPh(given: any): PhState {
  const p = given ?? DEFAULT_PH, ph = Math.round(clamp(p?.ph, 0, 14, 7) * 2) / 2, item = PH_ITEMS.find((i) => i.name === p?.item && i.ph === ph);
  return { ...panel(p, DEFAULT_PH), ph, ind: INDICATORS.includes(p?.ind) ? p.ind : "universal", hide: !!p?.hide, item: item ? item.name : "" };
}
// "pH 4 is 1,000 times more acidic than pure water" (whole-number pH only).
export function strengthText(ph: number): string {
  if (ph === 7) return "Neutral: neither acid nor alkali.";
  if (!Number.isInteger(ph)) return ph < 7 ? "The lower the pH, the stronger the acid." : "The higher the pH, the stronger the alkali.";
  const times = (10 ** Math.abs(7 - ph)).toLocaleString("en-GB");
  return `Each step on the scale is ×10, so pH ${ph} is ${times} times more ${ph < 7 ? "acidic" : "alkaline"} than pure water.`;
}
export const itemsNear = (ph: number) => PH_ITEMS.filter((i) => Math.abs(i.ph - ph) <= 0.5);

// ═══ Forces ═══════════════════════════════════════════════════════════════
export type Dir = "up" | "down" | "left" | "right";
export const DIRS: Dir[] = ["up", "down", "left", "right"];
export type Scene = { id: string; name: string; emoji: string; mass: number; by: number; f: Record<Dir, number>; names: Record<Dir, string>; ground: boolean };
export const SCENES: Scene[] = [
  { id: "box", name: "Box pushed along a table", emoji: "📦", mass: 5, by: 5, ground: true, f: { up: 50, down: 50, right: 30, left: 10 }, names: { up: "Reaction", down: "Weight", right: "Push", left: "Friction" } },
  { id: "car", name: "Car", emoji: "🚗", mass: 1000, by: 500, ground: true, f: { up: 10000, down: 10000, right: 3000, left: 1000 }, names: { up: "Reaction", down: "Weight", right: "Driving force", left: "Drag" } },
  { id: "skydiver", name: "Skydiver", emoji: "🪂", mass: 80, by: 100, ground: false, f: { up: 300, down: 800, right: 0, left: 0 }, names: { up: "Air resistance", down: "Weight", right: "Wind", left: "Wind" } },
  { id: "rocket", name: "Rocket", emoji: "🚀", mass: 1000, by: 1000, ground: false, f: { up: 15000, down: 10000, right: 0, left: 0 }, names: { up: "Thrust", down: "Weight", right: "Side push", left: "Side push" } },
  { id: "tug", name: "Tug of war", emoji: "🪢", mass: 150, by: 50, ground: true, f: { up: 0, down: 0, right: 400, left: 400 }, names: { up: "Reaction", down: "Weight", right: "Team B pulls", left: "Team A pulls" } },
  { id: "boat", name: "Boat", emoji: "⛵", mass: 500, by: 100, ground: false, f: { up: 5000, down: 5000, right: 800, left: 600 }, names: { up: "Upthrust", down: "Weight", right: "Thrust", left: "Drag" } },
];
export const scene = (id: string) => SCENES.find((s) => s.id === id) ?? SCENES[0];
export const F_MAX = 20000, M_MAX = 5000;
export type ForceState = Panel & Record<Dir, number> & { scene: string; mass: number; show: boolean }; // show: the resultant is on show
export const sceneState = (id: string): Pick<ForceState, Dir | "scene" | "mass"> => { const s = scene(id); return { scene: s.id, mass: s.mass, ...s.f }; };
export const DEFAULT_FORCES: ForceState = { on: false, x: 0.08, y: 0.05, ...sceneState("box"), show: true };
export function cleanForces(f: any): ForceState {
  const s = scene(String(f?.scene ?? "")), d = DEFAULT_FORCES;
  return { ...panel(f, d), scene: s.id, mass: int(f?.mass, 1, M_MAX, s.mass), up: int(f?.up, 0, F_MAX, s.f.up), down: int(f?.down, 0, F_MAX, s.f.down), left: int(f?.left, 0, F_MAX, s.f.left), right: int(f?.right, 0, F_MAX, s.f.right), show: f ? f.show !== false : true };
}
export type Resultant = { x: number; y: number; size: number; balanced: boolean; where: string; accel: number };
export function resultant(f: Pick<ForceState, Dir | "mass">): Resultant {
  const x = f.right - f.left, y = f.up - f.down, size = Math.hypot(x, y), across = x > 0 ? "to the right" : "to the left", vert = y > 0 ? "upwards" : "downwards";
  const tilt = Math.round((Math.atan2(Math.abs(y), Math.abs(x)) * 180) / Math.PI);
  return { x, y, size, balanced: size === 0, where: size === 0 ? "" : y === 0 ? across : x === 0 ? vert : `${vert} and ${across}, ${tilt}° from the horizontal`, accel: size / f.mass };
}
export function motionText(f: Pick<ForceState, Dir | "mass">): string {
  const r = resultant(f);
  if (r.balanced) return "The forces are balanced: the resultant force is 0 N. It stays still, or keeps moving at a steady speed in a straight line.";
  return `The forces are unbalanced. Resultant force = ${neat(r.size)} N ${r.where}. It accelerates that way: a = F ÷ m = ${neat(r.size)} ÷ ${f.mass} = ${neat(r.accel)} m/s².`;
}
// How each pair of forces compares, in words.
export function workingText(f: Pick<ForceState, Dir>): string[] {
  const out: string[] = [];
  if (f.right || f.left) out.push(`Across: ${neat(Math.max(f.right, f.left))} − ${neat(Math.min(f.right, f.left))} = ${neat(Math.abs(f.right - f.left))} N${f.right === f.left ? " (balanced)" : f.right > f.left ? " to the right" : " to the left"}`);
  if (f.up || f.down) out.push(`Up and down: ${neat(Math.max(f.up, f.down))} − ${neat(Math.min(f.up, f.down))} = ${neat(Math.abs(f.up - f.down))} N${f.up === f.down ? " (balanced)" : f.up > f.down ? " upwards" : " downwards"}`);
  return out.length ? out : ["No forces are acting."];
}
