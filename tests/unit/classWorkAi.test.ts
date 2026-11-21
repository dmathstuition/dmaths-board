import { describe, it, expect } from "vitest";
import { cleanWorkItems, clampCount, workPrompt, MAX_WORK_ITEMS } from "@/lib/classWorkAi";

describe("A.I. class work", () => {
  it("keeps questions that have an answer, tidied, without repeats", () => {
    const items = cleanWorkItems({ items: [
      { q: "Solve 2x + 3 = 11", a: "x = 4", w: "2x = 8\\nx = 4" },
      { q: "solve 2x + 3 = 11", a: "x = 4" },             // a repeat
      { q: "Find 15% of 80", a: "" },                      // no answer
      { question: "Area of a circle, r = 7 cm (π = 22/7)", answer: "154 cm²", working: "πr² = 22/7 × 49" }, // other key names
      { q: "ab", a: "x" },                                 // too short
    ] });
    expect(items).toEqual([
      { q: "Solve 2x + 3 = 11", a: "x = 4", w: "2x = 8\\nx = 4" },
      { q: "Area of a circle, r = 7 cm (π = 22/7)", a: "154 cm²", w: "πr² = 22/7 × 49" },
    ]);
    expect(cleanWorkItems("nonsense")).toEqual([]);
    expect(cleanWorkItems(Array.from({ length: 40 }, (_, i) => ({ q: `Question number ${i}`, a: String(i) })))).toHaveLength(MAX_WORK_ITEMS);
  });
  it("asks for the level, how hard, and a sensible number", () => {
    expect(clampCount(0)).toBe(8); expect(clampCount(99)).toBe(20); expect(clampCount(5)).toBe(5);
    const p = workPrompt({ topic: "Percentages", level: "JSS 1–3", count: 6, hard: "hard" });
    expect(p).toContain("Topic: Percentages"); expect(p).toContain("Level: JSS 1–3"); expect(p).toContain("Write 6 questions, all hard");
    expect(workPrompt({ topic: "Ratio", hard: "silly" })).toContain("from easy to hard");
  });
});
