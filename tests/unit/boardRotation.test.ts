import { describe, expect, it } from "vitest";
import { localDelta, localPoint } from "@/components/live/board/rotation";

const el = (rotated: boolean, r: { left: number; top: number; width: number; height: number }) => ({
  closest: () => (rotated ? {} : null),
  getBoundingClientRect: () => ({ ...r, right: r.left + r.width, bottom: r.top + r.height }),
}) as unknown as Element;

describe("board rotation helpers", () => {
  it("maps screen points straight through when not turned", () => {
    expect(localPoint(el(false, { left: 10, top: 20, width: 200, height: 100 }), 110, 70)).toEqual([0.5, 0.5]);
    expect(localDelta(el(false, { left: 0, top: 0, width: 200, height: 100 }), 20, 10)).toEqual([0.1, 0.1]);
  });
  it("undoes a 90° clockwise turn", () => {
    // A 200×100 board turned sideways occupies a 100-wide, 200-tall box on screen.
    const b = el(true, { left: 0, top: 0, width: 100, height: 200 });
    expect(localPoint(b, 100, 0)).toEqual([0, 0]); // board top-left is at the screen's top-right
    expect(localPoint(b, 0, 200)).toEqual([1, 1]);
    expect(localPoint(b, 50, 100)).toEqual([0.5, 0.5]);
    expect(localDelta(b, -10, 20)).toEqual([0.1, 0.1]);
  });
});
