import { describe, it, expect } from "vitest";
import { recognizeShape } from "@/lib/shapeNeat";
import { BOARD_W, BOARD_H, type Stroke } from "@/lib/whiteboard";

// Build a pen stroke from board-pixel points, with a little hand wobble.
let seed = 3;
const wobble = (n: number) => { seed = (seed * 16807) % 2147483647; return ((seed / 2147483647) - 0.5) * n; };
const pen = (pts: [number, number][], shake = 4): Stroke => ({
  id: "s1", by: "me", color: "#0B1220", w: 4, t: 1,
  pts: pts.flatMap(([x, y]) => [(x + wobble(shake)) / BOARD_W, (y + wobble(shake)) / BOARD_H]),
});
const along = (a: [number, number], b: [number, number], n = 30) => Array.from({ length: n }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n] as [number, number]);
const poly = (v: [number, number][], closeGap = 8) => {
  const out = v.flatMap((a, i) => along(a, v[(i + 1) % v.length]));
  out.push([v[0][0] + closeGap, v[0][1] + closeGap]); // hands rarely close a shape exactly
  return out;
};
const ring = (cx: number, cy: number, rx: number, ry: number, turn = 0.95) =>
  Array.from({ length: 60 }, (_, i) => { const a = (i / 60) * Math.PI * 2 * turn; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as [number, number]; });

describe("neat shapes", () => {
  it("straightens a rough line and levels a nearly flat one", () => {
    const r = recognizeShape(pen(along([200, 300], [900, 318], 40)))!;
    expect(r.kind).toBe("line");
    expect(r.item.kind).toBe("line");
    expect(r.item.pts[1]).toBe(r.item.pts[3]); // made exactly level
    expect(r.item).toMatchObject({ id: "s1", color: "#0B1220", w: 4 });
  });

  it("keeps a sloping line sloping", () => {
    const r = recognizeShape(pen(along([200, 200], [700, 600], 40)))!;
    expect(r.kind).toBe("line");
    expect(r.item.pts[1]).not.toBe(r.item.pts[3]);
  });

  it("turns a wobbly loop into a circle", () => {
    const r = recognizeShape(pen(ring(800, 500, 200, 205)))!;
    expect(r.kind).toBe("ellipse");
    const [x1, y1, x2, y2] = r.item.pts;
    expect(Math.abs((x2 - x1) * BOARD_W - (y2 - y1) * BOARD_H)).toBeLessThan(2); // round, not squashed
  });

  it("keeps a wide oval an oval", () => {
    const r = recognizeShape(pen(ring(800, 500, 350, 150)))!;
    expect(r.kind).toBe("ellipse");
    const [x1, y1, x2, y2] = r.item.pts;
    expect((x2 - x1) * BOARD_W).toBeGreaterThan((y2 - y1) * BOARD_H * 1.8);
  });

  it("turns a box into a rectangle", () => {
    const r = recognizeShape(pen(poly([[300, 200], [900, 205], [895, 600], [305, 598]])))!;
    expect(r.kind).toBe("rect");
    expect(r.item.kind).toBe("rect");
  });

  it("keeps a tilted square tilted, with straight sides", () => {
    const r = recognizeShape(pen(poly([[800, 200], [1050, 450], [800, 700], [550, 450]])))!;
    expect(r.kind).toBe("quad");
    expect(r.item.kind ?? "pen").toBe("pen");
  });

  it("turns a rough triangle into a clean one with its own corners", () => {
    const r = recognizeShape(pen(poly([[400, 700], [700, 200], [1100, 650]])))!;
    expect(r.kind).toBe("triangle");
    const xs = r.item.pts.filter((_, i) => i % 2 === 0).map((x) => x * BOARD_W);
    expect(Math.min(...xs)).toBeLessThan(410);
    expect(Math.max(...xs)).toBeGreaterThan(1090);
  });

  it("leaves handwriting, scribbles and small marks alone", () => {
    const zero = ring(500, 500, 20, 30);           // a small "0"
    expect(recognizeShape(pen(zero, 1))).toBeNull();
    const s = Array.from({ length: 60 }, (_, i) => [400 + 120 * Math.sin(i / 6), 300 + i * 6] as [number, number]); // an "S"-like curve
    expect(recognizeShape(pen(s))).toBeNull();
    const zig = Array.from({ length: 40 }, (_, i) => [300 + i * 15, 400 + (i % 2 ? 80 : 0)] as [number, number]);
    expect(recognizeShape(pen(zig, 1))).toBeNull();
  });

  it("only tidies the pen", () => {
    const loop = ring(800, 500, 200, 200);
    expect(recognizeShape({ ...pen(loop), kind: "hl" })).toBeNull();
    expect(recognizeShape({ ...pen(loop), erase: true })).toBeNull();
  });
});
