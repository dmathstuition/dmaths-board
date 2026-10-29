import { describe, expect, it } from "vitest";
import { cleanStroke, hitTest, itemBounds, moveItem, type Stroke } from "@/lib/whiteboard";
import { TEMPLATES, makeGroups, templateItems } from "@/lib/boardTemplates";
import { cleanWidgets } from "@/lib/boardTools";

const st = (o: Partial<Stroke>): Stroke => ({ id: "a", by: "u", color: "#0B1220", w: 4, pts: [], ...o });

describe("new board items", () => {
  it("keeps the new shapes and stamps, and rejects unknown stamps", () => {
    expect(cleanStroke(st({ kind: "tri", pts: [0.1, 0.1, 0.3, 0.3], fill: true }))).toMatchObject({ kind: "tri", fill: true });
    expect(cleanStroke(st({ kind: "dline", pts: [0.1, 0.1, 0.3, 0.3], fill: true }))?.fill).toBeUndefined();
    expect(cleanStroke(st({ kind: "darrow", pts: [0.1, 0.1] }))).toBeNull();
    expect(cleanStroke(st({ kind: "stamp", text: "star", pts: [0.5, 0.5, 0.6, 0.6] }))).toMatchObject({ kind: "stamp", text: "star", pts: [0.5, 0.5] });
    expect(cleanStroke(st({ kind: "stamp", text: "skull", pts: [0.5, 0.5] }))).toBeNull();
  });
});

describe("selecting and moving", () => {
  const pen = st({ id: "pen", pts: [0.1, 0.1, 0.3, 0.1] });
  const box = st({ id: "box", kind: "rect", pts: [0.5, 0.5, 0.7, 0.7] });
  const rub = st({ id: "rub", erase: true, pts: [0.2, 0.1, 0.25, 0.1] });
  it("finds the topmost item under a point", () => {
    expect(hitTest([pen, box], 0.2, 0.105)?.id).toBe("pen");
    expect(hitTest([pen, box], 0.6, 0.6)?.id).toBe("box");
    expect(hitTest([pen, box], 0.9, 0.9)).toBeNull();
    expect(hitTest([pen, rub], 0.22, 0.1)?.id).toBe("pen"); // rubbings can't be picked
  });
  it("moves items but keeps them on the board", () => {
    expect(moveItem(box, 0.1, -0.1).pts).toEqual([0.6, 0.4, 0.8, 0.6]);
    expect(moveItem(box, 0.9, 0).pts).toEqual([0.8, 0.5, 1, 0.7]);
    const b = itemBounds(st({ kind: "note", pts: [0.95, 0.95], text: "hi" }));
    expect(b.x2).toBeLessThanOrEqual(1); expect(b.y2).toBeLessThanOrEqual(1);
  });
});

describe("lesson templates and groups", () => {
  it("every template is made of valid board items with unique ids", () => {
    for (const t of TEMPLATES) {
      const items = templateItems(t.id, "host", "x");
      expect(items.length).toBeGreaterThan(3);
      expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
      for (const i of items) expect(cleanStroke(i)).not.toBeNull();
    }
  });
  it("shares learners evenly between groups", () => {
    const names = ["A", "B", "C", "D", "E", "F", "G"];
    const g = makeGroups(names, 3, () => 0.5);
    expect(g).toHaveLength(3);
    expect(g.map((x) => x.length).sort()).toEqual([2, 2, 3]);
    expect(g.flat().sort()).toEqual(names);
    expect(makeGroups([], 3)).toEqual([]);
    expect(makeGroups(["A", "A", " "], 2)).toEqual([["A"]]);
  });
  it("cleans spotlight and groups state", () => {
    const w = cleanWidgets({ spotlight: { on: true, x: 2, r: 9 }, groups: { size: 50, groups: [["A", 7], "bad"] } });
    expect(w.spotlight).toEqual({ on: true, x: 1, y: 0.5, r: 0.45 });
    expect(w.groups.size).toBe(10);
    expect(w.groups.groups).toEqual([["A", "7"], []]);
  });
});

import { scaleItem } from "@/lib/whiteboard";
describe("pictures and resizing", () => {
  const url = "https://abc.supabase.co/storage/v1/object/public/materials/slides/s1/p-01.jpg";
  it("keeps pictures only from our storage", () => {
    expect(cleanStroke(st({ kind: "image", text: url, pts: [0.1, 0.1, 0.5, 0.4] }))).toMatchObject({ kind: "image", text: url });
    expect(cleanStroke(st({ kind: "image", text: "https://evil.example/a.jpg", pts: [0.1, 0.1, 0.5, 0.4] }))).toBeNull();
    expect(cleanStroke(st({ kind: "image", text: url, pts: [0.1, 0.1] }))).toBeNull();
  });
  it("grows and shrinks items about their centre", () => {
    const box = st({ kind: "rect", pts: [0.4, 0.4, 0.6, 0.6] });
    expect(scaleItem(box, 1.5).pts).toEqual([0.35, 0.35, 0.65, 0.65]);
    expect(scaleItem(st({ kind: "text", text: "hi", w: 4, pts: [0.1, 0.1] }), 1.5).w).toBe(6);
    const tiny = st({ kind: "rect", pts: [0.5, 0.5, 0.505, 0.505] });
    expect(scaleItem(tiny, 0.5)).toBe(tiny); // won't shrink out of reach
  });
});
