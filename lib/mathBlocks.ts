// Maths blocks: pieces the class drags around the board — fraction bars,
// algebra tiles, base-ten blocks, number lines and counters. Pure: sizes,
// labels, totals and tidying. Positions are the piece's centre as a fraction
// of the board; sizes are in board units (lib/whiteboard BOARD_W × BOARD_H).
import { BOARD_H, BOARD_W } from "@/lib/whiteboard";

export const FRACTION_KINDS = ["f1", "f2", "f3", "f4", "f5", "f6", "f8", "f10", "f12"] as const;
export const ALGEBRA_KINDS = ["x2", "x", "u", "y2", "y", "xy"] as const;
export const BASE_TEN_KINDS = ["h", "t", "o"] as const;
export const LINE_KINDS = ["l10", "l20", "lneg", "l1"] as const; // 0–10, 0–20, −10 to 10, 0–1 in tenths
export type BlockKind = (typeof FRACTION_KINDS)[number] | (typeof ALGEBRA_KINDS)[number] | (typeof BASE_TEN_KINDS)[number] | (typeof LINE_KINDS)[number] | "chip";
export type Block = { id: string; k: BlockKind; x: number; y: number; neg?: boolean; rot?: boolean; c?: number };
export type BlocksState = { on: boolean; x: number; y: number; share: boolean; items: Block[] };

export const MAX_BLOCKS = 80;
export const CHIP_COLOURS = ["#DC2626", "#2563EB", "#16A34A", "#F59E0B"];
export const DEFAULT_BLOCKS: BlocksState = { on: false, x: 0.66, y: 0.04, share: false, items: [] };
const KINDS = new Set<string>([...FRACTION_KINDS, ...ALGEBRA_KINDS, ...BASE_TEN_KINDS, ...LINE_KINDS, "chip"]);
export const isBlockKind = (k: unknown): k is BlockKind => typeof k === "string" && KINDS.has(k);

export const isFraction = (k: BlockKind) => k[0] === "f";
export const isAlgebra = (k: BlockKind) => (ALGEBRA_KINDS as readonly string[]).includes(k);
export const isBaseTen = (k: BlockKind) => (BASE_TEN_KINDS as readonly string[]).includes(k);
export const isLine = (k: BlockKind) => (LINE_KINDS as readonly string[]).includes(k);
export const denominator = (k: BlockKind) => (isFraction(k) ? Number(k.slice(1)) : 0);

// Board units. The whole fraction bar is 720 long. Algebra tiles: the unit is
// 44, x is 160 and y is 220 (x and y are not whole numbers of units, so
// learners can't just count squares). Base ten: a cube is 28.
const WHOLE = 720, BAR_H = 64, U = 44, X = 160, Y = 220, CUBE = 28, LINE_W = 1000, LINE_H = 96, CHIP = 46;
export function blockSize(b: Pick<Block, "k" | "rot">): [number, number] {
  let s: [number, number];
  if (isFraction(b.k)) s = [WHOLE / denominator(b.k), BAR_H];
  else if (isLine(b.k)) s = [LINE_W, LINE_H];
  else s = ({ x2: [X, X], x: [X, U], u: [U, U], y2: [Y, Y], y: [Y, U], xy: [X, Y], h: [CUBE * 10, CUBE * 10], t: [CUBE * 10, CUBE], o: [CUBE, CUBE], chip: [CHIP, CHIP] } as Record<string, [number, number]>)[b.k] ?? [U, U];
  return b.rot ? [s[1], s[0]] : s;
}

// The number line's range and steps.
export function lineRange(k: BlockKind): { min: number; max: number; step: number } {
  return k === "l20" ? { min: 0, max: 20, step: 1 } : k === "lneg" ? { min: -10, max: 10, step: 1 } : k === "l1" ? { min: 0, max: 1, step: 0.1 } : { min: 0, max: 10, step: 1 };
}
const LINE_PAD = 40; // board units at each end before the first and last mark

export function blockLabel(b: Pick<Block, "k" | "neg">): string {
  const m = b.neg ? "−" : "";
  if (isFraction(b.k)) return denominator(b.k) === 1 ? "1" : `1/${denominator(b.k)}`;
  const names: Record<string, string> = { x2: "x²", x: "x", u: "1", y2: "y²", y: "y", xy: "xy", h: "100", t: "10", o: "1", chip: "counter" };
  if (isLine(b.k)) { const r = lineRange(b.k); return `number line ${r.min} to ${r.max}`; }
  return `${isAlgebra(b.k) ? m : ""}${names[b.k] ?? b.k}`;
}

// The algebra tiles as an expression, e.g. "2x² + 3x − 1" (zero pairs cancel).
const TERM_ORDER = ["x2", "y2", "xy", "x", "y", "u"] as const;
const TERM_NAME: Record<string, string> = { x2: "x²", y2: "y²", xy: "xy", x: "x", y: "y", u: "" };
export function algebraTotal(items: Block[]): string | null {
  const tiles = items.filter((b) => isAlgebra(b.k));
  if (!tiles.length) return null;
  const count: Record<string, number> = {};
  for (const b of tiles) count[b.k] = (count[b.k] ?? 0) + (b.neg ? -1 : 1);
  let out = "";
  for (const k of TERM_ORDER) {
    const n = count[k] ?? 0;
    if (!n) continue;
    const a = Math.abs(n), body = k === "u" ? String(a) : `${a === 1 ? "" : a}${TERM_NAME[k]}`;
    out += out ? ` ${n < 0 ? "−" : "+"} ${body}` : `${n < 0 ? "−" : ""}${body}`;
  }
  return out || "0";
}

export const baseTenTotal = (items: Block[]): number | null => {
  const bs = items.filter((b) => isBaseTen(b.k));
  return bs.length ? bs.reduce((a, b) => a + (b.k === "h" ? 100 : b.k === "t" ? 10 : 1), 0) : null;
};

// Take away matching positive and negative tiles (zero pairs).
export function removeZeroPairs(items: Block[]): Block[] {
  const drop = new Set<string>();
  for (const k of ALGEBRA_KINDS) {
    const pos = items.filter((b) => b.k === k && !b.neg), neg = items.filter((b) => b.k === k && b.neg);
    const n = Math.min(pos.length, neg.length);
    for (let i = 0; i < n; i++) { drop.add(pos[i].id); drop.add(neg[i].id); }
  }
  return items.filter((b) => !drop.has(b.id));
}

// Where a counter sits on a number line (its value), if it's on one.
export function onLine(chip: Block, lines: Block[]): { line: Block; value: number; x: number; y: number } | null {
  for (const l of lines) {
    const [w, h] = blockSize(l);
    const left = l.x * BOARD_W - w / 2, cy = l.y * BOARD_H;
    const px = chip.x * BOARD_W, py = chip.y * BOARD_H;
    if (px < left || px > left + w || Math.abs(py - cy) > h * 0.9) continue;
    const r = lineRange(l.k), steps = Math.round((r.max - r.min) / r.step);
    const span = w - LINE_PAD * 2;
    const i = Math.max(0, Math.min(steps, Math.round(((px - left - LINE_PAD) / span) * steps)));
    const value = Math.round((r.min + i * r.step) * 10) / 10;
    return { line: l, value, x: (left + LINE_PAD + (i / steps) * span) / BOARD_W, y: (cy - h * 0.22) / BOARD_H };
  }
  return null;
}
// A counter let go near a number line clicks onto the nearest mark.
export function snapChip(chip: Block, items: Block[]): Block {
  if (chip.k !== "chip") return chip;
  const hit = onLine(chip, items.filter((b) => isLine(b.k)));
  return hit ? { ...chip, x: hit.x, y: hit.y } : chip;
}
export const markX = (k: BlockKind, i: number) => { const r = lineRange(k), steps = Math.round((r.max - r.min) / r.step); return LINE_PAD + (i / steps) * (LINE_W - LINE_PAD * 2); };

let seq = 0;
export const blockId = () => `b${Date.now().toString(36)}${(seq++ % 1296).toString(36)}`;

// A new piece, placed a little apart from the last one so they don't stack.
export function addBlock(s: BlocksState, k: BlockKind, opts: { neg?: boolean; c?: number } = {}): BlocksState {
  if (s.items.length >= MAX_BLOCKS) return s;
  const n = s.items.length % 8;
  const x = isLine(k) ? 0.5 : 0.18 + (n % 4) * 0.1, y = isLine(k) ? 0.8 : 0.3 + Math.floor(n / 4) * 0.18;
  const b: Block = { id: blockId(), k, x, y };
  if (opts.neg && isAlgebra(k)) b.neg = true;
  if (k === "chip") b.c = Math.max(0, Math.min(CHIP_COLOURS.length - 1, opts.c ?? 0));
  return { ...s, on: true, items: [...s.items, b] };
}
export const moveBlock = (s: BlocksState, id: string, x: number, y: number): BlocksState =>
  ({ ...s, items: s.items.map((b) => (b.id === id ? { ...b, x: clamp01(x), y: clamp01(y) } : b)) });

// Line the pieces up in rows by type (fraction bars left-aligned like a wall).
export function tidy(items: Block[]): Block[] {
  const groups: Block[][] = [
    items.filter((b) => isFraction(b.k)).sort((a, b) => denominator(a.k) - denominator(b.k)),
    items.filter((b) => isAlgebra(b.k)).sort((a, b) => TERM_ORDER.indexOf(a.k as any) - TERM_ORDER.indexOf(b.k as any) || Number(!!a.neg) - Number(!!b.neg)),
    items.filter((b) => isBaseTen(b.k)).sort((a, b) => BASE_TEN_KINDS.indexOf(a.k as any) - BASE_TEN_KINDS.indexOf(b.k as any)),
  ];
  const out: Block[] = [];
  let top = 60;
  for (const g of groups) {
    if (!g.length) continue;
    let left = 60, rowH = 0;
    let lastD = -1;
    for (const b of g) {
      const [w, h] = blockSize(b);
      // Fraction bars: a new row for each denominator, so equal parts line up.
      const newRow = isFraction(b.k) ? lastD !== -1 && denominator(b.k) !== lastD : left + w > BOARD_W - 60;
      if (newRow) { top += rowH + 10; left = 60; rowH = 0; }
      lastD = denominator(b.k);
      out.push({ ...b, x: (left + w / 2) / BOARD_W, y: (top + h / 2) / BOARD_H });
      left += w + (isFraction(b.k) ? 0 : 10); rowH = Math.max(rowH, h);
    }
    top += rowH + 30;
  }
  const rest = items.filter((b) => !out.some((o) => o.id === b.id));
  return [...out.map((b) => ({ ...b, y: clamp01(b.y) })), ...rest];
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5);
export function cleanBlocks(v: unknown): BlocksState {
  const s = v as any;
  const seen = new Set<string>();
  const items: Block[] = [];
  for (const b of Array.isArray(s?.items) ? s.items.slice(0, MAX_BLOCKS) : []) {
    if (!isBlockKind(b?.k) || typeof b?.id !== "string" || !b.id || seen.has(b.id)) continue;
    seen.add(b.id);
    const it: Block = { id: b.id.slice(0, 24), k: b.k, x: clamp01(Number(b.x)), y: clamp01(Number(b.y)) };
    if (b.neg && isAlgebra(b.k)) it.neg = true;
    if (b.rot && !isLine(b.k)) it.rot = true;
    if (b.k === "chip") it.c = Math.max(0, Math.min(CHIP_COLOURS.length - 1, Math.round(Number(b.c) || 0)));
    items.push(it);
  }
  return { on: !!s?.on, x: Number.isFinite(Number(s?.x)) ? Math.min(0.95, Math.max(0, Number(s.x))) : DEFAULT_BLOCKS.x, y: Number.isFinite(Number(s?.y)) ? Math.min(0.95, Math.max(0, Number(s.y))) : DEFAULT_BLOCKS.y, share: !!s?.share, items };
}
