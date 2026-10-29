// Board activities built from ordinary board items, so they sync, save and
// replay like everything else:
//   • sorting  — category zones and shuffled cards to drag into them,
//   • matching — prompts with a slot beside each, and shuffled answer cards,
//   • checking — which cards sit in the right zone.
import { roundPt, type Stroke } from "@/lib/whiteboard";

export const CARD_COLORS = ["#DBEAFE", "#FCE7F3", "#DCFCE7", "#FEF3C7", "#EDE9FE", "#FFE4E6"];
const ZONE_COLORS = ["#1657C9", "#DB2777", "#16A34A", "#D97706"];
export const CARD_H = 0.075;
// Card width from its text (board fractions).
export const cardWidth = (text: string) => Math.min(0.3, Math.max(0.09, 0.035 + text.trim().length * 0.0105));

function shuffle<T>(a: T[], rng: () => number): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

type Mk = { by: string; idp: string; t?: number };
const maker = ({ by, idp, t }: Mk) => {
  let n = 0;
  return (s: Omit<Stroke, "id" | "by">): Stroke => ({ id: `${idp}-a${n++}`, by, ...s, ...(t != null ? { t } : {}) });
};
const box = (x1: number, y1: number, x2: number, y2: number) => [x1, y1, x2, y2].map(roundPt);

// Lay cards out in rows across a band of the board.
function layCards(texts: { text: string; group: number }[], top: number, bottom: number, mk: ReturnType<typeof maker>, rng: () => number): Stroke[] {
  const out: Stroke[] = [];
  let x = 0.04, y = top;
  for (const [i, c] of texts.entries()) {
    const w = cardWidth(c.text);
    if (x + w > 0.96) { x = 0.04; y += CARD_H + 0.02; }
    if (y + CARD_H > bottom) y = bottom - CARD_H;
    out.push(mk({ kind: "card", color: CARD_COLORS[(i + Math.floor(rng() * 3)) % CARD_COLORS.length], w: 4, text: c.text.trim().slice(0, 80), group: c.group, pts: box(x, y, x + w, y + CARD_H) }));
    x += w + 0.015;
  }
  return out;
}

export type SortingInput = { title: string; groups: { name: string; items: string[] }[] };
export function buildSorting(input: SortingInput, mk0: Mk, rng: () => number = Math.random): Stroke[] {
  const mk = maker(mk0);
  const groups = input.groups.filter((g) => g.name.trim()).slice(0, 4);
  if (groups.length < 2) return [];
  const out: Stroke[] = [];
  if (input.title.trim()) out.push(mk({ kind: "text", color: "#0B1220", w: 6, text: input.title.trim().slice(0, 80), pts: [0.04, 0.025] }));
  const gap = 0.02, zw = (0.92 - gap * (groups.length - 1)) / groups.length;
  groups.forEach((g, i) => {
    const x = 0.04 + i * (zw + gap);
    out.push(mk({ kind: "zone", color: ZONE_COLORS[i], w: 4, text: g.name.trim().slice(0, 40), group: i, pts: box(x, 0.1, x + zw, 0.66) }));
  });
  const cards = shuffle(groups.flatMap((g, i) => g.items.map((t) => t.trim()).filter(Boolean).slice(0, 10).map((text) => ({ text, group: i }))), rng).slice(0, 24);
  return out.concat(layCards(cards, 0.71, 0.97, mk, rng));
}

export type MatchingInput = { title: string; pairs: { left: string; right: string }[] };
export function buildMatching(input: MatchingInput, mk0: Mk, rng: () => number = Math.random): Stroke[] {
  const mk = maker(mk0);
  const pairs = input.pairs.filter((p) => p.left.trim() && p.right.trim()).slice(0, 6);
  if (pairs.length < 2) return [];
  const out: Stroke[] = [];
  if (input.title.trim()) out.push(mk({ kind: "text", color: "#0B1220", w: 6, text: input.title.trim().slice(0, 80), pts: [0.04, 0.025] }));
  const rowH = Math.min(0.1, 0.6 / pairs.length);
  pairs.forEach((p, i) => {
    const y = 0.1 + i * rowH;
    out.push(mk({ kind: "card", color: "#F1F5F9", w: 4, text: p.left.trim().slice(0, 80), pts: box(0.04, y + 0.01, 0.4, y + 0.01 + CARD_H) }));
    out.push(mk({ kind: "zone", color: ZONE_COLORS[i % 4], w: 4, group: i, pts: box(0.45, y, 0.96, y + rowH - 0.005) }));
  });
  const cards = shuffle(pairs.map((p, i) => ({ text: p.right, group: i })), rng);
  return out.concat(layCards(cards, 0.1 + pairs.length * rowH + 0.03, 0.97, mk, rng));
}

const centre = (s: Stroke) => [(s.pts[0] + s.pts[2]) / 2, (s.pts[1] + s.pts[3]) / 2];
const inside = (z: Stroke, x: number, y: number) =>
  x >= Math.min(z.pts[0], z.pts[2]) && x <= Math.max(z.pts[0], z.pts[2]) && y >= Math.min(z.pts[1], z.pts[3]) && y <= Math.max(z.pts[1], z.pts[3]);

// Answer cards (with a group) are the ones learners may drag.
export const isAnswerCard = (s: Stroke) => s.kind === "card" && s.group != null;

// Marks for every answer card: right zone → ok, wrong zone → no, not placed → none.
export function checkCards(items: Stroke[]): Map<string, "ok" | "no" | undefined> {
  const zones = items.filter((s) => s.kind === "zone" && s.group != null);
  const out = new Map<string, "ok" | "no" | undefined>();
  for (const c of items) {
    if (c.kind !== "card" || c.group == null) continue;
    const [x, y] = centre(c);
    const z = zones.filter((z) => inside(z, x, y)).pop();
    out.set(c.id, z ? (z.group === c.group ? "ok" : "no") : undefined);
  }
  return out;
}
export const parseLines = (text: string) => text.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
