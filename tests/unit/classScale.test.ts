import { describe, expect, it } from "vitest";
import { classScale, scaleFor, setClassSize } from "@/lib/classScale";
import { pulseNow } from "@/lib/classPulse";

describe("big classes repeat less", () => {
  it("changes nothing up to 20 people, then slows repeats", () => {
    expect(scaleFor(0)).toBe(1);
    expect(scaleFor(20)).toBe(1);
    expect(scaleFor(30)).toBe(2);
    expect(scaleFor(100)).toBe(6.5);
    expect(scaleFor(1000)).toBe(8);
    setClassSize(100); expect(classScale()).toBe(6.5);
    setClassSize(3); expect(classScale()).toBe(1);
  });
  it("keeps learners' signals counting for longer when they're sent less often", () => {
    const at = 1_000_000, e = [{ by: "a", name: "Ada", v: "up" as const, at }];
    expect(pulseNow(e, at + 60_000).up).toHaveLength(0);
    expect(pulseNow(e, at + 60_000, 6.5).up).toHaveLength(1);
  });
});
