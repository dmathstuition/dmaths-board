import { describe, it, expect } from "vitest";
import { cleanAiLesson, lessonToBoard, textHeight } from "@/lib/aiLesson";
import { cleanBoard } from "@/lib/whiteboard";

const reply = {
  title: "Quadratic equations", subject: "Mathematics",
  objectives: ["Recognise a quadratic equation", "Solve by factorising", "Use the formula"],
  pages: [
    { heading: "What is a quadratic?", points: ["An equation where the highest power of x is 2", "General form: ax² + bx + c = 0, a ≠ 0"], tryIt: "Is x² − 4 = 0 a quadratic?" },
    { heading: "Solving by factorising", points: ["Write it as (x + p)(x + q) = 0", "Set each bracket to zero"],
      example: { question: "Solve x² + 5x + 6 = 0", steps: ["Find two numbers that multiply to 6 and add to 5: 2 and 3", "(x + 2)(x + 3) = 0", "x + 2 = 0 or x + 3 = 0"], answer: "x = −2 or x = −3" } },
    { heading: "", points: ["no heading: dropped"] },
    { heading: "The formula", points: Array.from({ length: 9 }, (_, i) => `Point ${i} `.repeat(20)),
      example: { question: "Solve 2x² + 3x − 2 = 0 using the formula", steps: Array.from({ length: 7 }, (_, i) => `Step ${i}: `.repeat(9)), answer: "x = ½ or x = −2" } },
  ],
  practice: ["Solve x² − 9 = 0", "Solve x² + 7x + 12 = 0"],
  quiz: [
    { q: "Which is a quadratic?", options: ["2x + 1", "x² + 1", "x³", "1/x"], answer: 1 },
    { q: "Bad: 3 options", options: ["a", "b", "c"], answer: 0 },
    { q: "Bad answer index", options: ["a", "b", "c", "d"], answer: 7 },
  ],
};

describe("A.I lesson maker", () => {
  const l = cleanAiLesson(reply)!;

  it("keeps a usable lesson and drops broken parts", () => {
    expect(l.title).toBe("Quadratic equations");
    expect(l.pages.map((p) => p.heading)).toEqual(["What is a quadratic?", "Solving by factorising", "The formula"]);
    expect(l.pages[3]).toBeUndefined();
    expect(l.pages[2].points).toHaveLength(5); // capped
    expect(l.quiz).toHaveLength(1);
    expect(cleanAiLesson({ pages: [] })).toBeNull();
    expect(cleanAiLesson("nonsense")).toBeNull();
  });

  it("lays the lesson out as board pages that survive saving", () => {
    const board = lessonToBoard(l, "t1", 1000);
    const saved = cleanBoard(board);
    expect(saved.pages.length).toBe(board.pages.length);
    expect(saved.pages.flat().length).toBe(board.pages.flat().length); // nothing rejected
    const texts = board.pages.map((p) => p.map((s) => s.text ?? "").join(" | "));
    expect(texts[0]).toContain("Quadratic equations");
    expect(texts[0]).toContain("Solve by factorising");
    expect(texts.some((t) => t.includes("Example: Solve x² + 5x + 6 = 0") && t.includes("1.  Find two numbers") && t.includes("Answer: x = −2 or x = −3"))).toBe(true);
    expect(texts.some((t) => t.includes("Try it: Is x² − 4 = 0 a quadratic?"))).toBe(true);
    expect(texts.at(-1)).toContain("Practice");
    expect(board.paper.at(-1)).toBe("lines");
  });

  it("starts a new page instead of running off the bottom", () => {
    const board = lessonToBoard(l, "t1");
    for (const page of board.pages) {
      for (const s of page) expect(s.pts[1] + textHeight(s.text ?? "", s.w, s.pts[0])).toBeLessThanOrEqual(1);
    }
    expect(board.pages.some((p) => p.some((s) => s.text === "The formula: worked example"))).toBe(true);
  });
});
