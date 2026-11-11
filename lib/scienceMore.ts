// Three more science tools on the board — pure: the equation balancer, ray
// diagrams and the food web builder. What each holds, how it's cleaned as it
// arrives over the class channel, and the chemistry, optics and ecology
// behind them.
import type { Panel } from "@/lib/boardTools";

const clamp = (n: unknown, lo: number, hi: number, d: number) => { const v = Number(n); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const int = (n: unknown, lo: number, hi: number, d: number) => Math.round(clamp(n, lo, hi, d));
const panel = (p: any, d: Panel): Panel => ({ on: !!p?.on, x: clamp(p?.x, 0, 0.95, d.x), y: clamp(p?.y, 0, 0.95, d.y) });
const str = (x: unknown, n: number) => String(x ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const r2 = (x: number) => Math.round(x * 100) / 100;
export const neat = (x: number) => { const r = r2(x); return `${r < 0 ? "−" : ""}${Math.abs(r)}`; };

// ═══ Equation balancer ════════════════════════════════════════════════════
export type Atoms = Record<string, number>;
export type Species = { formula: string; atoms: Atoms };
export type Equation = { left: Species[]; right: Species[] };
export const MAX_COEF = 12, MAX_SPECIES = 5;
// "Ca(OH)2" → { Ca: 1, O: 2, H: 2 }. Null if it isn't a formula.
export function parseFormula(f: string): Atoms | null {
  const s = f.replace(/\s+/g, "");
  if (!s || s.length > 24 || !/^[A-Za-z0-9()]+$/.test(s)) return null;
  let i = 0;
  const number = () => { const m = /^\d+/.exec(s.slice(i)); if (!m) return 1; i += m[0].length; return Number(m[0]); };
  function group(depth: number): Atoms | null {
    const out: Atoms = {};
    while (i < s.length) {
      const ch = s[i];
      if (ch === "(") {
        i++;
        const inner = depth < 3 ? group(depth + 1) : null;
        if (!inner || s[i] !== ")") return null;
        i++;
        const n = number();
        for (const [el, k] of Object.entries(inner)) out[el] = (out[el] ?? 0) + k * n;
      } else if (ch === ")") { return depth ? out : null; }
      else if (/[A-Z]/.test(ch)) {
        const m = /^[A-Z][a-z]?/.exec(s.slice(i))!;
        i += m[0].length;
        const n = number();
        if (!n) return null;
        out[m[0]] = (out[m[0]] ?? 0) + n;
      } else return null;
    }
    return depth ? null : out;
  }
  const atoms = group(0);
  return atoms && Object.keys(atoms).length ? atoms : null;
}
// "Fe + O2 -> Fe2O3" (any numbers in front are dropped). Null if it can't be read,
// or the two sides aren't made of the same elements.
export function parseEquation(text: string): Equation | null {
  const sides = String(text ?? "").split(/->|→|=/);
  if (sides.length !== 2) return null;
  const side = (t: string): Species[] | null => {
    const out: Species[] = [];
    for (const raw of t.split("+")) {
      const formula = raw.trim().replace(/^\d+\s*/, "").replace(/\s+/g, ""), atoms = parseFormula(formula);
      if (!atoms) return null;
      out.push({ formula, atoms });
    }
    return out;
  };
  const left = side(sides[0]), right = side(sides[1]);
  if (!left || !right || left.length + right.length > MAX_SPECIES) return null;
  const els = (sp: Species[]) => [...new Set(sp.flatMap((x) => Object.keys(x.atoms)))].sort().join(",");
  return els(left) === els(right) ? { left, right } : null;
}
export const speciesOf = (eq: Equation) => [...eq.left, ...eq.right];
export function countAtoms(side: Species[], coef: number[]): Atoms {
  const out: Atoms = {};
  side.forEach((sp, i) => { for (const [el, n] of Object.entries(sp.atoms)) out[el] = (out[el] ?? 0) + n * (coef[i] ?? 1); });
  return out;
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export function checkBalance(eq: Equation, coef: number[]) {
  const left = countAtoms(eq.left, coef.slice(0, eq.left.length)), right = countAtoms(eq.right, coef.slice(eq.left.length));
  const elements = [...new Set(eq.left.flatMap((s) => Object.keys(s.atoms)))];
  const balanced = elements.every((el) => left[el] === right[el]);
  return { elements, left, right, balanced, simplest: coef.reduce(gcd, 0) === 1 };
}
// The smallest whole numbers that balance it (null if none up to MAX_COEF).
export function solveEquation(eq: Equation): number[] | null {
  const sp = speciesOf(eq), n = sp.length, coef = new Array<number>(n).fill(1);
  let best: number[] | null = null;
  const walk = (i: number) => {
    if (best) return;
    if (i === n) { if (checkBalance(eq, coef).balanced) best = [...coef]; return; }
    for (let k = 1; k <= MAX_COEF && !best; k++) { coef[i] = k; walk(i + 1); }
  };
  walk(0);
  if (!best) return null;
  const g = (best as number[]).reduce(gcd, 0);
  return (best as number[]).map((k) => k / g);
}
export const EQUATIONS: { text: string; name: string }[] = [
  { text: "H2 + O2 -> H2O", name: "Hydrogen burning" },
  { text: "Mg + O2 -> MgO", name: "Magnesium burning" },
  { text: "Na + Cl2 -> NaCl", name: "Making salt" },
  { text: "N2 + H2 -> NH3", name: "Making ammonia" },
  { text: "CH4 + O2 -> CO2 + H2O", name: "Methane burning" },
  { text: "Zn + HCl -> ZnCl2 + H2", name: "Zinc and acid" },
  { text: "Na + H2O -> NaOH + H2", name: "Sodium and water" },
  { text: "H2O2 -> H2O + O2", name: "Hydrogen peroxide breaking down" },
  { text: "Fe + O2 -> Fe2O3", name: "Rusting" },
  { text: "Al + O2 -> Al2O3", name: "Aluminium and oxygen" },
  { text: "Ca(OH)2 + HCl -> CaCl2 + H2O", name: "Neutralisation" },
  { text: "KClO3 -> KCl + O2", name: "Heating potassium chlorate" },
  { text: "Fe2O3 + CO -> Fe + CO2", name: "The blast furnace" },
  { text: "C3H8 + O2 -> CO2 + H2O", name: "Propane burning" },
  { text: "CO2 + H2O -> C6H12O6 + O2", name: "Photosynthesis" },
];
export type BalancerState = Panel & { text: string; coef: number[]; counts: boolean }; // counts: the atom tally is showing
export const DEFAULT_BALANCER: BalancerState = { on: false, x: 0.08, y: 0.05, text: EQUATIONS[0].text, coef: [1, 1, 1], counts: true };
// An equation a teacher typed: fine to use only if it reads and can be balanced.
export function usable(text: string): Equation | null { const eq = parseEquation(text); return eq && solveEquation(eq) ? eq : null; }
export function cleanBalancer(b: any): BalancerState {
  const d = DEFAULT_BALANCER, text = str(b?.text, 80), eq = usable(text);
  if (!eq) return { ...d, ...panel(b, d) };
  const n = speciesOf(eq).length;
  return { ...panel(b, d), text, coef: Array.from({ length: n }, (_, i) => int(b?.coef?.[i], 1, MAX_COEF, 1)), counts: b ? b.counts !== false : true };
}
// A formula in pieces, so the small numbers can be written low: "H2O" → H, ₂, O.
export function formulaParts(f: string): { t: string; sub: boolean }[] {
  return (f.match(/\d+|[^\d]+/g) ?? []).map((t) => ({ t, sub: /^\d+$/.test(t) }));
}

// ═══ Ray diagrams ═════════════════════════════════════════════════════════
export type Optic = "convex" | "concave" | "concave-mirror" | "convex-mirror" | "plane";
export const OPTICS: Optic[] = ["convex", "concave", "concave-mirror", "convex-mirror", "plane"];
export const OPTIC_NAMES: Record<Optic, string> = { convex: "Convex lens", concave: "Concave lens", "concave-mirror": "Concave mirror", "convex-mirror": "Convex mirror", plane: "Plane mirror" };
export const isMirror = (o: Optic) => o !== "convex" && o !== "concave";
export const U_MIN = 4, U_MAX = 60, H_MIN = 4, H_MAX = 14, FOCALS = [10, 15, 20];
export type RayState = Panel & { optic: Optic; u: number; f: number; h: number; show: boolean }; // object distance, focal length, object height (cm); image showing
export const DEFAULT_RAYS: RayState = { on: false, x: 0.06, y: 0.05, optic: "convex", u: 30, f: 15, h: 8, show: true };
export const cleanRays = (r: any): RayState => ({
  ...panel(r, DEFAULT_RAYS), optic: OPTICS.includes(r?.optic) ? r.optic : "convex", u: int(r?.u, U_MIN, U_MAX, 30),
  f: FOCALS.includes(Number(r?.f)) ? Number(r.f) : 15, h: int(r?.h, H_MIN, H_MAX, 8), show: r ? r.show !== false : true,
});
// The focal length with its sign (real-is-positive): converging +, diverging −, plane ∞.
export const signedF = (s: Pick<RayState, "optic" | "f">) => (s.optic === "plane" ? Infinity : s.optic === "convex" || s.optic === "concave-mirror" ? s.f : -s.f);
export type ImageFacts = { v: number; m: number; atInfinity: boolean; real: boolean; upright: boolean; size: "magnified" | "diminished" | "the same size"; x: number; hi: number };
// Where the image forms. v is real-is-positive; x and hi place it on the diagram
// (the lens or mirror is at x = 0 with the object at x = −u).
export function imageOf(s: Pick<RayState, "optic" | "u" | "f" | "h">): ImageFacts {
  const f = signedF(s);
  if (s.u === f) return { v: Infinity, m: Infinity, atInfinity: true, real: false, upright: false, size: "magnified", x: Infinity, hi: Infinity };
  const v = s.optic === "plane" ? -s.u : (s.u * f) / (s.u - f), m = -v / s.u, am = Math.abs(m);
  return { v, m, atInfinity: false, real: v > 0, upright: m > 0, size: Math.abs(am - 1) < 0.005 ? "the same size" : am > 1 ? "magnified" : "diminished", x: isMirror(s.optic) ? -v : v, hi: m * s.h };
}
export function describeImage(s: Pick<RayState, "optic" | "u" | "f" | "h">): string {
  const im = imageOf(s);
  if (im.atInfinity) return "No image: the rays leave parallel, so the image is at infinity";
  return `${im.real ? "Real" : "Virtual"}, ${im.upright ? "upright" : "inverted"} and ${im.size}`;
}
export function whereText(s: Pick<RayState, "optic" | "u" | "f" | "h">): string {
  const im = imageOf(s), mirror = isMirror(s.optic);
  if (im.atInfinity) return "The object is at the focal point.";
  const side = mirror ? (im.real ? "in front of the mirror" : "behind the mirror") : im.real ? "on the far side of the lens" : "on the same side as the object";
  return `Image ${neat(Math.abs(im.v))} cm from the ${mirror ? "mirror" : "lens"}, ${side}. Magnification ×${neat(Math.abs(im.m))}.`;
}
export function formulaText(s: Pick<RayState, "optic" | "u" | "f" | "h">): string {
  if (s.optic === "plane") return `A plane mirror: image distance = object distance = ${s.u} cm`;
  const f = signedF(s), im = imageOf(s);
  return `1/v = 1/f − 1/u = 1/${f < 0 ? `(${neat(f)})` : f} − 1/${s.u}${im.atInfinity ? " = 0" : `, so v = ${neat(im.v)} cm${im.real ? "" : " (the minus sign means virtual)"}`}`;
}
export type Seg = { a: [number, number]; b: [number, number]; dashed: boolean; ray: 0 | 1 };
// The two construction rays from the top of the object: one parallel to the
// axis, one through the centre (lens) or the pole (mirror). Dashed pieces are
// traced back to a virtual image. `far` is how far (cm) to run the rays out.
export function raySegments(s: Pick<RayState, "optic" | "u" | "f" | "h">, far = 120): Seg[] {
  const im = imageOf(s), mirror = isMirror(s.optic), f = signedF(s), O: [number, number] = [-s.u, s.h], P: [number, number] = [0, s.h], C: [number, number] = [0, 0];
  const I: [number, number] = [im.x, im.hi], out: Seg[] = [], away = mirror ? -far : far;
  const run = (from: [number, number], d: [number, number]): [number, number] => { const t = away / d[0]; return [from[0] + d[0] * t, from[1] + d[1] * t]; };
  // Ray 0: parallel to the axis, then through (or as if from) the focal point.
  const dA: [number, number] = im.atInfinity ? [mirror ? -f : f, -s.h] : im.real ? [I[0] - P[0], I[1] - P[1]] : [P[0] - I[0], P[1] - I[1]];
  out.push({ a: O, b: P, dashed: false, ray: 0 }, { a: P, b: run(P, dA), dashed: false, ray: 0 });
  // Ray 1: straight through the centre of a lens; off the pole of a mirror at an equal angle.
  out.push({ a: O, b: C, dashed: false, ray: 1 }, { a: C, b: run(C, mirror ? [-s.u, -s.h] : [s.u, -s.h]), dashed: false, ray: 1 });
  if (!im.atInfinity && !im.real) {
    out.push({ a: P, b: I, dashed: true, ray: 0 });
    if (mirror) out.push({ a: C, b: I, dashed: true, ray: 1 }); else if (I[0] < O[0]) out.push({ a: O, b: I, dashed: true, ray: 1 });
  }
  return out;
}

// ═══ Food web builder ═════════════════════════════════════════════════════
export type WebId = "savanna" | "pond" | "farm";
export type Organism = { id: string; name: string; emoji: string; row: number }; // row 0 is the bottom (producers)
export type Web = { name: string; organisms: Organism[]; links: [string, string][] }; // each link: [food, eater]
const o = (id: string, name: string, emoji: string, row: number): Organism => ({ id, name, emoji, row });
export const WEBS: Record<WebId, Web> = {
  savanna: {
    name: "Savanna",
    organisms: [o("grass", "Grass", "🌾", 0), o("acacia", "Acacia tree", "🌳", 0), o("grasshopper", "Grasshopper", "🦗", 1), o("zebra", "Zebra", "🦓", 1), o("antelope", "Antelope", "🦌", 1), o("giraffe", "Giraffe", "🦒", 1),
      o("lizard", "Lizard", "🦎", 2), o("lion", "Lion", "🦁", 2), o("leopard", "Leopard", "🐆", 2), o("eagle", "Eagle", "🦅", 3)],
    links: [["grass", "grasshopper"], ["grass", "zebra"], ["grass", "antelope"], ["acacia", "antelope"], ["acacia", "giraffe"], ["grasshopper", "lizard"], ["zebra", "lion"], ["antelope", "lion"], ["giraffe", "lion"], ["antelope", "leopard"], ["lizard", "eagle"]],
  },
  pond: {
    name: "Pond",
    organisms: [o("algae", "Algae", "🦠", 0), o("pondweed", "Pondweed", "🌿", 0), o("mayfly", "Mayfly nymph", "🪰", 1), o("tadpole", "Tadpole", "🐸", 1), o("snail", "Water snail", "🐌", 1),
      o("beetle", "Water beetle", "🪲", 2), o("fish", "Small fish", "🐟", 2), o("heron", "Heron", "🐦", 3)],
    links: [["algae", "mayfly"], ["algae", "tadpole"], ["algae", "snail"], ["pondweed", "tadpole"], ["pondweed", "snail"], ["mayfly", "beetle"], ["tadpole", "beetle"], ["mayfly", "fish"], ["tadpole", "fish"], ["snail", "fish"], ["beetle", "heron"], ["fish", "heron"]],
  },
  farm: {
    name: "Farm",
    organisms: [o("maize", "Maize", "🌽", 0), o("grass", "Grass", "🌾", 0), o("grasshopper", "Grasshopper", "🦗", 1), o("rat", "Rat", "🐀", 1), o("lizard", "Lizard", "🦎", 2), o("hen", "Hen", "🐔", 2),
      o("snake", "Snake", "🐍", 3), o("hawk", "Hawk", "🦅", 4)],
    links: [["maize", "grasshopper"], ["grass", "grasshopper"], ["maize", "rat"], ["maize", "hen"], ["grasshopper", "hen"], ["grasshopper", "lizard"], ["rat", "snake"], ["lizard", "snake"], ["rat", "hawk"], ["hen", "hawk"], ["snake", "hawk"]],
  },
};
export const WEB_IDS = Object.keys(WEBS) as WebId[];
export type FoodWebState = Panel & { web: WebId; drawn: number[]; removed: string[]; roles: boolean }; // drawn: arrows on show (their place in the web's list); roles: feeding levels named
export const DEFAULT_FOODWEB: FoodWebState = { on: false, x: 0.06, y: 0.04, web: "savanna", drawn: [], removed: [], roles: false };
export function cleanFoodWeb(w: any): FoodWebState {
  const d = DEFAULT_FOODWEB, web: WebId = WEB_IDS.includes(w?.web) ? w.web : d.web, W = WEBS[web];
  return {
    ...panel(w, d), web,
    drawn: [...new Set((Array.isArray(w?.drawn) ? w.drawn : []).map((k: unknown) => Math.round(Number(k))).filter((k: number) => k >= 0 && k < W.links.length))] as number[],
    removed: [...new Set((Array.isArray(w?.removed) ? w.removed : []).filter((id: unknown) => W.organisms.some((x) => x.id === id)))] as string[], roles: !!w?.roles,
  };
}
export const organism = (web: Web, id: string) => web.organisms.find((x) => x.id === id)!;
const plural = (name: string) => (/(fish|s)$/i.test(name) ? name : `${name}s`);
export const foodsOf = (web: Web, id: string) => web.links.filter((l) => l[1] === id).map((l) => l[0]);
export const eatersOf = (web: Web, id: string) => web.links.filter((l) => l[0] === id).map((l) => l[1]);
export function roleOf(web: Web, id: string): string {
  const foods = foodsOf(web, id), plant = (x: string) => !foodsOf(web, x).length;
  if (!foods.length) return "Producer";
  if (foods.every(plant)) return "Herbivore (primary consumer)";
  if (foods.some(plant)) return "Omnivore";
  return eatersOf(web, id).length ? "Carnivore" : "Top predator";
}
// The teacher tapped the food, then the animal that eats it.
export function tryLink(web: Web, food: string, eater: string): { ok: true; index: number } | { ok: false; why: string } {
  const index = web.links.findIndex((l) => l[0] === food && l[1] === eater), a = organism(web, food).name, b = organism(web, eater).name;
  if (index >= 0) return { ok: true, index };
  if (web.links.some((l) => l[0] === eater && l[1] === food)) return { ok: false, why: `Other way round: the arrow points from the food to the feeder, so it goes from ${b} to ${a}.` };
  return { ok: false, why: `In this web, ${b.toLowerCase()} doesn't eat ${a.toLowerCase()}.` };
}
export type Effect = { dir: "up" | "down"; sure: boolean; why: string };
// What happens to the others when some organisms are taken out.
export function effectsOf(web: Web, removed: string[]): Record<string, Effect> {
  const out: Record<string, Effect> = {}, gone = new Set(removed), name = (id: string) => organism(web, id).name.toLowerCase();
  const set = (id: string, e: Effect) => { if (!gone.has(id) && !out[id]) out[id] = e; };
  for (const r of removed) for (const eater of eatersOf(web, r)) {
    const left = foodsOf(web, eater).filter((f) => !gone.has(f));
    set(eater, left.length ? { dir: "down", sure: false, why: `Less to eat: no ${name(r)}, so it must rely on ${left.map(name).join(" and ")}.` } : { dir: "down", sure: true, why: `Nothing left to eat: it dies out or moves away.` });
  }
  for (const r of removed) for (const food of foodsOf(web, r)) set(food, { dir: "up", sure: false, why: `No longer eaten by ${name(r)}, so more survive (at first).` });
  // One step further: what the hungry feeders turn to, and what the extra survivors eat.
  const first = Object.entries(out);
  for (const [id, e] of first) {
    if (e.dir === "down") for (const food of foodsOf(web, id)) set(food, { dir: "down", sure: false, why: `${plural(organism(web, id).name)} eat more of it instead.` });
    else for (const food of foodsOf(web, id)) set(food, { dir: "down", sure: false, why: `More ${plural(name(id))} are feeding on it.` });
  }
  return out;
}
// Where each organism sits in a w × h picture: producers along the bottom.
export function layoutWeb(web: Web, w = 600, h = 340): Record<string, [number, number]> {
  const rows = Math.max(...web.organisms.map((x) => x.row)) + 1, out: Record<string, [number, number]> = {};
  for (let r = 0; r < rows; r++) {
    const inRow = web.organisms.filter((x) => x.row === r);
    inRow.forEach((x, i) => { out[x.id] = [Math.round((w * (i + 0.5)) / inRow.length), Math.round(h - 30 - (r * (h - 60)) / Math.max(1, rows - 1))]; });
  }
  return out;
}
