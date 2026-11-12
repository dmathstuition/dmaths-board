import { describe, expect, it } from "vitest";
import { TRIES_KEY, MAX_TRIES, belowMark, cleanRedoMinutes, cleanSay, keptOf, questionBreakdown, redoExtraMs, redoPaper, triesOf, withoutTries } from "@/lib/examRedo";
import { markPaper, workingKey, type ExamQ } from "@/lib/exams";

const qs: ExamQ[] = [
  { q: "2 + 2", kind: "typed", options: [], answer: "4", marks: 1 },
  { q: "Pick 3", kind: "choice", options: ["1", "2", "3", "4"], answer: 2, marks: 2 },
  { q: "10 ÷ 2", kind: "typed", options: [], answer: "5", marks: 1, method: true },
  { q: "Explain", kind: "written", options: [], answer: "", marks: 3 },
];
const at = "2026-11-12T10:00:00.000Z";

describe("redoPaper", () => {
  const answers = { "0": "4", "1": 0, "2": "5", [workingKey(2)]: { ink: [] }, "3": "Because" };
  const marks = { "3": 3 };

  it("a fresh start clears every answer and mark but keeps the try", () => {
    const r = redoPaper(qs, answers, marks, "fresh", at, 2);
    expect(withoutTries(r.answers)).toEqual({});
    expect(r.marks).toEqual({});
    expect(r.keep).toEqual([]);
    expect(r.tries).toEqual([{ at, score: 5, total: 7, flags: 2, mode: "fresh", keep: [] }]);
    expect(triesOf(r.answers)).toEqual(r.tries);
    expect(keptOf(r.answers)).toEqual([]);
  });

  it("only-the-wrong-ones keeps right answers, their working and their marks", () => {
    const r = redoPaper(qs, answers, marks, "wrong", at);
    expect(r.keep).toEqual([0, 2, 3]);
    expect(withoutTries(r.answers)).toEqual({ "0": "4", "2": "5", [workingKey(2)]: { ink: [] }, "3": "Because" });
    expect(r.marks).toEqual({ "3": 3 });
    expect(keptOf(r.answers)).toEqual([0, 2, 3]);
    // The new paper scores the kept marks until the wrong one is fixed.
    expect(markPaper(qs, withoutTries(r.answers), r.marks).score).toBe(5);
  });

  it("adds to earlier tries and never keeps more than the last few", () => {
    let a: Record<string, unknown> = answers;
    for (let k = 0; k < MAX_TRIES + 3; k++) a = { ...redoPaper(qs, a, {}, "fresh", `t${k}`).answers, "0": "4" };
    const t = triesOf(a);
    expect(t).toHaveLength(MAX_TRIES);
    expect(t[t.length - 1].at).toBe(`t${MAX_TRIES + 2}`);
  });
});

describe("the tries kept with the answers", () => {
  it("are ignored by marking and taken off for the screens", () => {
    const a = { "0": "4", [TRIES_KEY]: [{ at, score: 1, total: 7, flags: 0, mode: "wrong", keep: [0] }] };
    expect(markPaper(qs, a).score).toBe(1);
    expect(withoutTries(a)).toEqual({ "0": "4" });
    expect(withoutTries(null)).toEqual({});
  });
  it("are cleaned when read back", () => {
    expect(triesOf(null)).toEqual([]);
    expect(triesOf({ [TRIES_KEY]: "nope" })).toEqual([]);
    expect(triesOf({ [TRIES_KEY]: [null, { score: "3", total: 9, mode: "odd", keep: [1, 1, -2, "4"] }] })).toEqual([{ at: "", score: 3, total: 9, flags: 0, mode: "fresh", keep: [1, 4] }]);
    // Kept questions only count after an only-the-wrong-ones redo.
    expect(keptOf({ [TRIES_KEY]: [{ mode: "fresh", keep: [1] }] })).toEqual([]);
  });
});

describe("time for a redo", () => {
  const now = 1_000_000_000_000, min = 60_000;
  it("gives the minutes from now, as extra time after the exam's end", () => {
    expect(redoExtraMs(now, 10, now - 30 * min)).toBe(40 * min); // ended 30 minutes ago
    expect(redoExtraMs(now, 10, now - 30 * min, 5 * min)).toBe(42.5 * min); // 25% more for extra time
  });
  it("needs none while the exam still has longer to run, but keeps extra time", () => {
    expect(redoExtraMs(now, 10, now + 20 * min)).toBe(0);
    expect(redoExtraMs(now, 10, now + 20 * min, 5 * min)).toBe(5 * min);
  });
  it("cleans the minutes asked for", () => {
    expect(cleanRedoMinutes(15, 20)).toBe(15);
    expect(cleanRedoMinutes("x", 20)).toBe(20);
    expect(cleanRedoMinutes(999, 20)).toBe(180);
    expect(cleanRedoMinutes(0, 0)).toBe(20);
  });
});

describe("many learners at once", () => {
  const entries = [
    { id: "a", submitted: true, score: 7, total: 7, answers: { "0": "4", "1": 2, "2": "5" }, pageMarks: { "3": 3 } },
    { id: "b", submitted: true, score: 1, total: 7, answers: { "0": "4", "1": 1 } },
    { id: "c", submitted: true, score: 3, total: 7, answers: { "0": "5", "1": 2 }, pageMarks: { "3": 1 } },
    { id: "d", submitted: false, score: null, total: 7, answers: {} },
  ];
  it("picks the handed-in learners under the pass mark", () => {
    expect(belowMark(entries, 50)).toEqual(["b", "c"]);
  });
  it("shows each question's success, hardest first, and who missed it", () => {
    const rows = questionBreakdown(qs, entries);
    expect(rows.map((r) => [r.n, r.pct])).toEqual([[2, 33], [3, 33], [0, 67], [1, 67]]);
    const q0 = rows.find((r) => r.n === 0)!;
    expect(q0).toMatchObject({ right: 2, of: 3, pct: 67, wrong: ["c"] });
    expect(rows.find((r) => r.n === 3)).toMatchObject({ right: 1, wrong: ["b", "c"] });
    expect(questionBreakdown(qs, [entries[3]])).toEqual([]);
  });
  it("cleans a message to everyone", () => {
    expect(cleanSay("  Question 4:\n say   cm ")).toBe("Question 4: say cm");
    expect(cleanSay("x".repeat(500))).toHaveLength(200);
  });
});
