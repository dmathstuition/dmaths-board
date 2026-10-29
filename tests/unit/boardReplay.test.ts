import { describe, expect, it } from "vitest";
import { buildTimeline, delayBefore, frameAt, partial } from "@/lib/boardReplay";
import type { Stroke } from "@/lib/whiteboard";

const st = (id: string, t?: number, extra: Partial<Stroke> = {}): Stroke => ({ id, by: "u", color: "#000000", w: 4, pts: [0, 0, 0.1, 0.1, 0.2, 0.2, 0.3, 0.3], ...(t != null ? { t } : {}), ...extra });

describe("board replay", () => {
  it("orders items by when they were written, across pages", () => {
    const tl = buildTimeline([[st("a", 100), st("c", 300)], [st("b", 200)]]);
    expect(tl.map((e) => e.item.id)).toEqual(["a", "b", "c"]);
    expect(tl.map((e) => e.page)).toEqual([0, 1, 0]);
  });
  it("plays older boards (no times) in the order things were added", () => {
    expect(buildTimeline([[st("x"), st("y")], [st("z")]]).map((e) => e.item.id)).toEqual(["x", "y", "z"]);
  });
  it("shows the page being written on, with only what was there by then", () => {
    const tl = buildTimeline([[st("a", 100), st("c", 300)], [st("b", 200)]]);
    expect(frameAt(tl, 1)).toEqual({ page: 0, items: [tl[0].item] });
    expect(frameAt(tl, 2).page).toBe(1);
    expect(frameAt(tl, 3).items.map((s) => s.id)).toEqual(["a", "c"]);
    expect(frameAt([], 5)).toEqual({ page: 0, items: [] });
  });
  it("squeezes long pauses and draws freehand strokes bit by bit", () => {
    const tl = buildTimeline([[st("a", 0), st("b", 60_000), st("c", 60_400)]]);
    expect(delayBefore(tl, 1)).toBe(1200);
    expect(delayBefore(tl, 2, 2)).toBe(200);
    expect(partial(tl[0].item, 0.5).pts).toHaveLength(4);
    const box = st("r", 0, { kind: "rect", pts: [0, 0, 1, 1] });
    expect(partial(box, 0.1)).toBe(box);
  });
});
