import { describe, it, expect } from "vitest";
import { cleanTiers, splitTiers, tierFor, tiersPrompt } from "@/lib/adaptive";

describe("adaptive follow-up", () => {
  it("easier if they struggled or didn't answer, harder if they got it, same otherwise", () => {
    expect(tierFor(undefined, 3, false)).toBe("easier");   // didn't answer
    expect(tierFor(0, 1, true)).toBe("easier");            // ✗
    expect(tierFor(1, 1, true)).toBe("harder");            // ✓
    expect(tierFor(1, 3, true)).toBe("easier");            // a third
    expect(tierFor(2, 3, true)).toBe("same");              // two thirds
    expect(tierFor(3, 3, true)).toBe("harder");
    expect(tierFor(undefined, 3, true)).toBe("same");      // answered, not marked yet
  });
  it("splits a class into the three groups", () => {
    const people = [{ id: "a", name: "Ada" }, { id: "b", name: "Bola" }, { id: "c", name: "Chidi" }, { id: "d", name: "Dayo" }];
    const s = splitTiers(people, { a: 3, b: 1 }, 3, new Set(["a", "b", "c"]));
    expect(s.by).toEqual({ a: "harder", b: "easier", c: "same", d: "easier" });
    expect(s.counts).toEqual({ easier: 2, same: 1, harder: 1 });
    expect(s.names.easier).toEqual(["Bola", "Dayo"]);
  });
  it("needs three different, answered questions", () => {
    const ok = { easier: { q: "Solve x + 2 = 5", a: "x = 3", w: "Take 2" }, same: { q: "Solve x + 4 = 9", a: "5" }, harder: { question: "Solve 3x + 4 = 19", answer: "5", working: "…" } };
    expect(cleanTiers(ok)).toMatchObject({ easier: { a: "x = 3" }, harder: { q: "Solve 3x + 4 = 19", a: "5", w: "…" } });
    expect(cleanTiers({ ...ok, same: { q: "Solve x + 2 = 5", a: "3" } })).toBeNull(); // the same question twice
    expect(cleanTiers({ ...ok, harder: { q: "Solve 3x + 4 = 19", a: "" } })).toBeNull();
    expect(cleanTiers(null)).toBeNull();
    expect(tiersPrompt({ question: "Solve 2x = 8", level: "JSS 1–3" })).toContain("Solve 2x = 8");
  });
});
