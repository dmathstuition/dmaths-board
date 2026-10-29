import { describe, expect, it } from "vitest";
import { HOME, clampView, cleanView, panBy, pinch, toBoard, toScreen, zoomAt } from "@/lib/boardView";

describe("zooming and moving around the board", () => {
  it("maps screen points to the board and back", () => {
    const v = { z: 2, x: 0.25, y: 0.5 };
    expect(toBoard(v, 0.5, 0.5)).toEqual([0.5, 0.75]);
    expect(toScreen(v, 0.5, 0.75)).toEqual([0.5, 0.5]);
    expect(toBoard(HOME, 0.3, 0.7)).toEqual([0.3, 0.7]);
  });
  it("keeps the point under the cursor still while zooming", () => {
    const v = zoomAt(HOME, 2, 0.8, 0.2);
    const [bx, by] = toBoard(v, 0.8, 0.2);
    expect(bx).toBeCloseTo(0.8, 3); expect(by).toBeCloseTo(0.2, 3);
    expect(v.z).toBe(2);
  });
  it("never zooms out past the whole board or off its edges", () => {
    expect(zoomAt(HOME, 0.5)).toEqual(HOME);
    expect(clampView({ z: 9, x: 2, y: -1 })).toEqual({ z: 5, x: 0.8, y: 0 });
    expect(panBy({ z: 2, x: 0, y: 0 }, -1, -1)).toEqual({ z: 2, x: 0.5, y: 0.5 });
    expect(panBy(HOME, 0.3, 0.3)).toEqual(HOME);
    expect(cleanView({ z: "x" })).toEqual(HOME);
  });
  it("follows two fingers: spreading zooms in around them", () => {
    const v = pinch(HOME, [0.4, 0.5], [0.6, 0.5], [0.3, 0.5], [0.7, 0.5]);
    expect(v.z).toBe(2);
    const [bx] = toBoard(v, 0.5, 0.5);
    expect(bx).toBeCloseTo(0.5, 3);
  });
});
