// Three more tools on the board — pure: the transformations grid, the atom
// builder and the card sort. What each holds, how it's cleaned as it arrives
// over the class channel, and the sums and facts behind them.
import type { Panel } from "@/lib/boardTools";
import { ELEMENTS, type Element } from "@/lib/scienceTools";

const clamp = (n: unknown, lo: number, hi: number, d: number) => { const v = Number(n); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const int = (n: unknown, lo: number, hi: number, d: number) => Math.round(clamp(n, lo, hi, d));
const panel = (p: any, d: Panel): Panel => ({ on: !!p?.on, x: clamp(p?.x, 0, 0.95, d.x), y: clamp(p?.y, 0, 0.95, d.y) });
const str = (x: unknown, n: number) => String(x ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
// Numbers as they're written in class: a proper minus sign, and halves as ½.
export const num = (n: number) => { const r = Math.round(n * 100) / 100, a = Math.abs(r); return `${r < 0 ? "−" : ""}${a === 0.5 ? "½" : a}`; };
export const point = (p: Pt) => `(${num(p[0])}, ${num(p[1])})`;

// ═══ Transformations grid ═════════════════════════════════════════════════
export type Pt = [number, number];
export const GRID = 8; // both axes run −8 … 8
export type TKind = "reflect" | "rotate" | "translate" | "enlarge";
export const KINDS: TKind[] = ["reflect", "rotate", "translate", "enlarge"];
export const KIND_NAMES: Record<TKind, string> = { reflect: "Reflect", rotate: "Rotate", translate: "Translate", enlarge: "Enlarge" };
export type Mirror = "x" | "y" | "y=x" | "y=-x" | "x=k" | "y=k";
export const MIRRORS: Mirror[] = ["x", "y", "y=x", "y=-x", "x=k", "y=k"];
export type ShapeId = "triangle" | "flag" | "lshape" | "rectangle" | "trapezium";
// Corners in order, from the shape's first corner (which sits at `at`).
export const SHAPES: Record<ShapeId, { name: string; pts: Pt[] }> = {
  triangle: { name: "Triangle", pts: [[0, 0], [3, 0], [0, 2]] },
  flag: { name: "Flag", pts: [[0, 0], [0, 4], [2, 3], [0, 2]] },
  lshape: { name: "L-shape", pts: [[0, 0], [2, 0], [2, 1], [1, 1], [1, 3], [0, 3]] },
  rectangle: { name: "Rectangle", pts: [[0, 0], [3, 0], [3, 2], [0, 2]] },
  trapezium: { name: "Trapezium", pts: [[0, 0], [4, 0], [3, 2], [1, 2]] },
};
export const SHAPE_IDS = Object.keys(SHAPES) as ShapeId[];
export const TURNS = [90, 180, 270] as const; // anticlockwise
export const SCALES = [2, 3, 0.5, -1, -2];
export type TransformState = Panel & {
  shape: ShapeId; at: Pt;      // which shape, and where its first corner sits
  kind: TKind;
  mirror: Mirror; k: number;   // reflection: the mirror line (k is for x = k and y = k)
  turn: 90 | 180 | 270;        // rotation, anticlockwise
  centre: Pt;                  // centre of rotation or enlargement
  by: Pt;                      // translation vector
  scale: number;               // enlargement scale factor
  show: boolean;               // the image is showing (hide it to ask the class first)
};
export const DEFAULT_TRANSFORM: TransformState = {
  on: false, x: 0.08, y: 0.03, shape: "triangle", at: [1, 1], kind: "reflect", mirror: "y", k: 0, turn: 90, centre: [0, 0], by: [-6, 2], scale: 2, show: true,
};
// Keep the whole shape on the grid.
export function clampAt(shape: ShapeId, at: Pt): Pt {
  const pts = SHAPES[shape].pts, w = Math.max(...pts.map((p) => p[0])), h = Math.max(...pts.map((p) => p[1]));
  return [int(at[0], -GRID, GRID - w, 0), int(at[1], -GRID, GRID - h, 0)];
}
const pt = (p: any, d: Pt, lo = -GRID, hi = GRID): Pt => [int(p?.[0], lo, hi, d[0]), int(p?.[1], lo, hi, d[1])];
export function cleanTransform(t: any): TransformState {
  const d = DEFAULT_TRANSFORM, shape: ShapeId = SHAPE_IDS.includes(t?.shape) ? t.shape : d.shape;
  return {
    ...panel(t, d), shape, at: clampAt(shape, pt(t?.at, d.at)), kind: KINDS.includes(t?.kind) ? t.kind : d.kind,
    mirror: MIRRORS.includes(t?.mirror) ? t.mirror : d.mirror, k: int(t?.k, -GRID, GRID, 0),
    turn: (TURNS as readonly number[]).includes(Number(t?.turn)) ? (Number(t.turn) as 90 | 180 | 270) : d.turn,
    centre: pt(t?.centre, d.centre), by: pt(t?.by, d.by, -2 * GRID, 2 * GRID), scale: SCALES.includes(Number(t?.scale)) ? Number(t.scale) : d.scale, show: t ? t.show !== false : true,
  };
}
export const objectPts = (s: Pick<TransformState, "shape" | "at">): Pt[] => SHAPES[s.shape].pts.map(([x, y]) => [x + s.at[0], y + s.at[1]]);
type Rule = Pick<TransformState, "kind" | "mirror" | "k" | "turn" | "centre" | "by" | "scale">;
export function transformPt(s: Rule, [x, y]: Pt): Pt {
  const [a, b] = s.centre;
  if (s.kind === "translate") return [x + s.by[0], y + s.by[1]];
  if (s.kind === "enlarge") return [a + s.scale * (x - a), b + s.scale * (y - b)];
  if (s.kind === "rotate") return s.turn === 90 ? [a - (y - b), b + (x - a)] : s.turn === 180 ? [2 * a - x, 2 * b - y] : [a + (y - b), b - (x - a)];
  switch (s.mirror) {
    case "x": return [x, -y];
    case "y": return [-x, y];
    case "y=x": return [y, x];
    case "y=-x": return [-y, -x];
    case "x=k": return [2 * s.k - x, y];
    default: return [x, 2 * s.k - y];
  }
}
export const imagePts = (s: TransformState): Pt[] => objectPts(s).map((p) => transformPt(s, p).map((v) => v + 0) as Pt); // + 0: no "−0"
export const offGrid = (s: TransformState) => imagePts(s).some(([x, y]) => Math.abs(x) > GRID || Math.abs(y) > GRID);
export const mirrorName = (m: Mirror, k: number) => (m === "x" ? "the x-axis" : m === "y" ? "the y-axis" : m === "y=x" ? "the line y = x" : m === "y=-x" ? "the line y = −x" : `the line ${m[0]} = ${num(k)}`);
const across = (n: number) => (n === 0 ? "" : `${Math.abs(n)} ${n > 0 ? "right" : "left"}`), updown = (n: number) => (n === 0 ? "" : `${Math.abs(n)} ${n > 0 ? "up" : "down"}`);
// The full description an examiner wants.
export function describe(s: Rule): string {
  if (s.kind === "reflect") return `Reflection in ${mirrorName(s.mirror, s.k)}`;
  if (s.kind === "rotate") return `Rotation of ${s.turn === 270 ? "90° clockwise" : s.turn === 180 ? "180°" : "90° anticlockwise"} about ${point(s.centre)}`;
  if (s.kind === "translate") { const words = [across(s.by[0]), updown(s.by[1])].filter(Boolean).join(" and "); return `Translation by the vector ${point(s.by)}${words ? `: ${words}` : ": it stays where it is"}`; }
  return `Enlargement, scale factor ${num(s.scale)}, centre ${point(s.centre)}`;
}
// What changes and what stays the same.
export function facts(s: Rule): string {
  if (s.kind === "reflect") return "Same size and shape (congruent), but flipped over. Each corner is as far behind the mirror line as it was in front.";
  if (s.kind === "rotate") return "Same size and shape (congruent), turned round. Every corner stays the same distance from the centre.";
  if (s.kind === "translate") return "Same size, same shape, same way up. Every corner slides by the same vector.";
  const k = Math.abs(s.scale), area = k * k;
  return `Same shape, different size (similar): every side is ×${num(k)} and the area is ×${num(area)}.${s.scale < 0 ? " A negative scale factor puts the image on the other side of the centre, upside down." : ""}`;
}

// ═══ Atom builder ═════════════════════════════════════════════════════════
export const MAX_P = 20, MAX_N = 28, MAX_E = 20; // the shell model runs up to calcium
export type AtomState = Panel & { p: number; n: number; e: number; hide: boolean };
export const DEFAULT_ATOM: AtomState = { on: false, x: 0.08, y: 0.04, p: 6, n: 6, e: 6, hide: false };
export const cleanAtom = (a: any): AtomState => ({ ...panel(a, DEFAULT_ATOM), p: int(a?.p, 1, MAX_P, 6), n: int(a?.n, 0, MAX_N, 6), e: int(a?.e, 0, MAX_E, 6), hide: !!a?.hide });
// Neutron numbers of the isotopes that don't break down, for hydrogen to calcium (the first is the commonest).
const STABLE: number[][] = [
  [0, 1], [2, 1], [4, 3], [5], [6, 5], [6, 7], [7, 8], [8, 9, 10], [10], [10, 11, 12],
  [12], [12, 13, 14], [14], [14, 15, 16], [16], [16, 17, 18, 20], [18, 20], [22, 18, 20], [20, 22], [20, 22, 23, 24, 26, 28],
];
export const commonN = (p: number) => STABLE[p - 1]?.[0] ?? p;
export const isStable = (p: number, n: number) => !!STABLE[p - 1]?.includes(n);
// Electrons fill the shells 2, 8, 8, 2.
export function fillShells(e: number): number[] {
  const out: number[] = [];
  let left = e;
  for (const cap of [2, 8, 8, 2]) { if (left <= 0) break; out.push(Math.min(cap, left)); left -= cap; }
  return out;
}
export const chargeText = (c: number) => (c === 0 ? "" : `${Math.abs(c) === 1 ? "" : Math.abs(c)}${c > 0 ? "+" : "−"}`);
export type AtomFacts = { el: Element; mass: number; charge: number; chargeText: string; kind: string; shells: number[]; fullOuter: boolean; stable: boolean; isotope: string };
export function atomFacts(a: Pick<AtomState, "p" | "n" | "e">): AtomFacts {
  const el = ELEMENTS[a.p - 1], charge = a.p - a.e, by = Math.abs(charge), s = by === 1 ? "" : "s";
  return {
    el, mass: a.p + a.n, charge, chargeText: chargeText(charge),
    kind: charge === 0 ? "Neutral atom: the same number of protons and electrons" : charge > 0 ? `Positive ion: it has lost ${by} electron${s}` : `Negative ion: it has gained ${by} electron${s}`,
    shells: fillShells(a.e), fullOuter: [2, 10, 18].includes(a.e), stable: isStable(a.p, a.n), isotope: `${el.name}-${a.p + a.n}`,
  };
}

// ═══ Card sort ════════════════════════════════════════════════════════════
export const MIN_GROUPS = 2, MAX_GROUPS = 4, MAX_CARDS = 20, CARD_LEN = 28, HEAD_LEN = 22;
export type SortCard = { t: string; a: number; g: number }; // the words, the heading it belongs under, and where it is now (−1: still in the pile)
export type SortState = Panel & { title: string; groups: string[]; cards: SortCard[]; check: boolean };
export type SortGroup = { name: string; cards: string[] };
export const SORT_PRESETS: { title: string; groups: SortGroup[] }[] = [
  { title: "Odd or even?", groups: [{ name: "Odd", cards: ["7", "13", "21", "35", "49"] }, { name: "Even", cards: ["8", "14", "20", "36", "50"] }] },
  { title: "Prime or not?", groups: [{ name: "Prime", cards: ["2", "5", "11", "17", "23"] }, { name: "Not prime", cards: ["1", "9", "15", "21", "27"] }] },
  { title: "More or less than a half?", groups: [{ name: "Less than ½", cards: ["1/3", "2/5", "3/8", "4/9"] }, { name: "More than ½", cards: ["2/3", "3/5", "5/8", "7/9"] }] },
  { title: "Metal or non-metal?", groups: [{ name: "Metal", cards: ["Iron", "Copper", "Sodium", "Gold", "Calcium"] }, { name: "Non-metal", cards: ["Oxygen", "Carbon", "Sulfur", "Chlorine", "Neon"] }] },
  { title: "Solid, liquid or gas at room temperature?", groups: [{ name: "Solid", cards: ["Iron", "Salt", "Sand", "Sugar"] }, { name: "Liquid", cards: ["Water", "Petrol", "Milk", "Mercury"] }, { name: "Gas", cards: ["Oxygen", "Helium", "Nitrogen", "Carbon dioxide"] }] },
  { title: "Noun, verb or adjective?", groups: [{ name: "Noun", cards: ["river", "teacher", "market", "happiness"] }, { name: "Verb", cards: ["write", "sing", "think", "carry"] }, { name: "Adjective", cards: ["tall", "bright", "noisy", "gentle"] }] },
];
// Cards typed one to a line (or with commas between them).
export const parseCards = (text: string): string[] => [...new Set(String(text ?? "").split(/[\n,;]+/).map((t) => str(t, CARD_LEN)).filter(Boolean))];
function shuffle<T>(list: T[], rnd: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
// A new sort: the cards the teacher typed under each heading, mixed into one pile.
// Null when there's nothing to sort (fewer than two headings, or no cards).
export function buildSort(title: string, groups: SortGroup[], rnd: () => number = Math.random): Pick<SortState, "title" | "groups" | "cards" | "check"> | null {
  const named = groups.map((g) => ({ name: str(g.name, HEAD_LEN), cards: g.cards.map((c) => str(c, CARD_LEN)).filter(Boolean) })).filter((g) => g.name).slice(0, MAX_GROUPS);
  const seen = new Set<string>(), cards: SortCard[] = [];
  named.forEach((g, a) => g.cards.forEach((t) => { if (!seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); cards.push({ t, a, g: -1 }); } }));
  if (named.length < MIN_GROUPS || !cards.length) return null;
  return { title: str(title, 60), groups: named.map((g) => g.name), cards: shuffle(cards.slice(0, MAX_CARDS), rnd), check: false };
}
// A fixed mix for the starting set, so the teacher's and learners' screens begin the same.
const fixed = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
export const DEFAULT_SORT: SortState = { on: false, x: 0.1, y: 0.04, ...buildSort(SORT_PRESETS[0].title, SORT_PRESETS[0].groups, fixed)! };
export function cleanSort(s: any): SortState {
  const d = DEFAULT_SORT, groups = (Array.isArray(s?.groups) ? s.groups : []).map((g: unknown) => str(g, HEAD_LEN)).filter(Boolean).slice(0, MAX_GROUPS) as string[];
  if (groups.length < MIN_GROUPS) return { ...d, ...panel(s, d) };
  const cards = (Array.isArray(s?.cards) ? s.cards : []).slice(0, MAX_CARDS)
    .map((c: any) => ({ t: str(c?.t, CARD_LEN), a: int(c?.a, 0, groups.length - 1, 0), g: int(c?.g, -1, groups.length - 1, -1) })).filter((c: SortCard) => c.t) as SortCard[];
  return { ...panel(s, d), title: str(s?.title, 60), groups, cards, check: !!s?.check };
}
export const moveCard = (s: SortState, i: number, g: number): SortState => ({ ...s, cards: s.cards.map((c, k) => (k === i ? { ...c, g: g >= -1 && g < s.groups.length ? g : -1 } : c)) });
// Everything back in the pile, mixed up again.
export const mixAgain = (s: SortState, rnd: () => number = Math.random): SortState => ({ ...s, check: false, cards: shuffle(s.cards.map((c) => ({ ...c, g: -1 })), rnd) });
export function sortScore(s: Pick<SortState, "cards">) {
  const placed = s.cards.filter((c) => c.g >= 0).length, right = s.cards.filter((c) => c.g === c.a).length;
  return { total: s.cards.length, placed, right, done: placed === s.cards.length, allRight: right === s.cards.length };
}
// The headings and their cards, as the editor shows them.
export const sortGroups = (s: Pick<SortState, "groups" | "cards">): SortGroup[] => s.groups.map((name, a) => ({ name, cards: s.cards.filter((c) => c.a === a).map((c) => c.t) }));
