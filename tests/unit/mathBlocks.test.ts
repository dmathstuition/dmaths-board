import { describe, expect, it } from "vitest";
import { BOARD_W } from "@/lib/whiteboard";
import {
  DEFAULT_BLOCKS, MAX_BLOCKS, addBlock, algebraTotal, baseTenTotal, blockLabel, blockSize, cleanBlocks, markX, moveBlock, onLine, removeZeroPairs, snapChip, tidy,
  type Block,
} from "@/lib/mathBlocks";
import { cleanWidgets } from "@/lib/boardTools";

const b = (k: Block["k"], extra: Partial<Block> = {}): Block => ({ id: `${k}${Math.random()}`, k, x: 0.5, y: 0.5, ...extra });

describe("maths blocks", () => {
  it("sizes fraction bars as parts of one whole", () => {
    const whole = blockSize(b("f1"))[0];
    expect(blockSize(b("f4"))[0] * 4).toBeCloseTo(whole);
    expect(blockSize(b("f3"))[0] * 3).toBeCloseTo(whole);
    expect(blockSize(b("x", { rot: true }))).toEqual([...blockSize(b("x"))].reverse());
  });

  it("labels pieces", () => {
    expect(blockLabel(b("f8"))).toBe("1/8");
    expect(blockLabel(b("x2", { neg: true }))).toBe("−x²");
    expect(blockLabel(b("lneg"))).toBe("number line -10 to 10");
  });

  it("reads algebra tiles as an expression", () => {
    expect(algebraTotal([b("x2"), b("x2"), b("x"), b("x"), b("x"), b("u", { neg: true })])).toBe("2x² + 3x − 1");
    expect(algebraTotal([b("x", { neg: true }), b("y"), b("xy")])).toBe("xy − x + y");
    expect(algebraTotal([b("x"), b("x", { neg: true })])).toBe("0");
    expect(algebraTotal([b("f2")])).toBeNull();
  });

  it("removes zero pairs", () => {
    const left = removeZeroPairs([b("x"), b("x", { neg: true }), b("x"), b("u", { neg: true })]);
    expect(left.map((x) => blockLabel(x)).sort()).toEqual(["x", "−1"].sort());
  });

  it("adds up base ten", () => {
    expect(baseTenTotal([b("h"), b("t"), b("t"), b("o")])).toBe(121);
    expect(baseTenTotal([b("x")])).toBeNull();
  });

  it("clicks counters onto the nearest mark of a number line", () => {
    const line = b("l10", { x: 0.5, y: 0.8 });
    const [w] = blockSize(line);
    const left = 0.5 * BOARD_W - w / 2;
    const near7 = (left + markX("l10", 7) + 12) / BOARD_W;
    const chip = b("chip", { x: near7, y: 0.79 });
    expect(onLine(chip, [line])?.value).toBe(7);
    const snapped = snapChip(chip, [line, chip]);
    expect(snapped.x).toBeCloseTo((left + markX("l10", 7)) / BOARD_W);
    expect(onLine(b("chip", { x: near7, y: 0.2 }), [line])).toBeNull();
    expect(onLine(b("chip", { x: (left + markX("l1", 3)) / BOARD_W, y: 0.8 }), [b("l1", { x: 0.5, y: 0.8 })])?.value).toBe(0.3);
  });

  it("adds, moves, tidies and caps the pieces", () => {
    let s = addBlock(DEFAULT_BLOCKS, "x", { neg: true });
    expect(s.on).toBe(true);
    expect(s.items[0]).toMatchObject({ k: "x", neg: true });
    s = moveBlock(s, s.items[0].id, 2, -1);
    expect(s.items[0]).toMatchObject({ x: 1, y: 0 });
    for (let i = 0; i < MAX_BLOCKS + 5; i++) s = addBlock(s, "f2");
    expect(s.items.length).toBe(MAX_BLOCKS);
    const wall = tidy([b("f2"), b("f4"), b("f2"), b("f4")]);
    const ys = wall.map((x) => x.y);
    expect(ys[0]).toBe(ys[1]); // both halves in one row
    expect(ys[2]).toBeGreaterThan(ys[0]);
  });

  it("cleans what comes over the network", () => {
    const c = cleanBlocks({ on: 1, share: true, items: [{ id: "a", k: "x", x: 9, y: "0.2", neg: 1, rot: 1 }, { id: "a", k: "x" }, { id: "b", k: "nope" }, { id: "c", k: "chip", c: 99 }, { id: "d", k: "f2", neg: true }] });
    expect(c.on).toBe(true);
    expect(c.share).toBe(true);
    expect(c.items).toEqual([{ id: "a", k: "x", x: 1, y: 0.2, neg: true, rot: true }, { id: "c", k: "chip", x: 0.5, y: 0.5, c: 3 }, { id: "d", k: "f2", x: 0.5, y: 0.5 }]);
    expect(cleanWidgets({}).blocks).toEqual(DEFAULT_BLOCKS);
  });
});
