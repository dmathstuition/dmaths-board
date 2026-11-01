import { describe, expect, it } from "vitest";
import { EXAM_TOPICS, cleanExamQuestions, learnerPaper, markPaper, topicQuestions, typedRight, clockLeft } from "@/lib/exams";

const QS = cleanExamQuestions([
  { q: "2 + 2", kind: "choice", options: ["3", "4", "5", "6"], answer: 1, marks: 1 },
  { q: "Solve 3x = 12", kind: "typed", answer: "4", marks: 2 },
  { q: "Half of 1", kind: "typed", answer: "0.5 | 1/2", marks: 1 },
  { q: "", kind: "typed", answer: "x" },                      // no question: dropped
  { q: "Bad", kind: "choice", options: ["only one"], answer: 0 }, // too few options: dropped
]);

describe("exam mode", () => {
  it("keeps good questions only", () => {
    expect(QS.map((q) => q.q)).toEqual(["2 + 2", "Solve 3x = 12", "Half of 1"]);
  });

  it("marks typed answers fairly", () => {
    expect(typedRight("x = 4", "4")).toBe(true);
    expect(typedRight(" 4.0 ", "4")).toBe(true);
    expect(typedRight("1/2", "0.5")).toBe(true);
    expect(typedRight("−3", "-3")).toBe(true);
    expect(typedRight("Four", "4 | four")).toBe(true);
    expect(typedRight("5", "4")).toBe(false);
    expect(typedRight("", "4")).toBe(false);
  });

  it("adds up marks", () => {
    expect(markPaper(QS, { 0: 1, 1: "x=4", 2: "1/2" })).toEqual({ score: 4, total: 4, right: [true, true, true] });
    expect(markPaper(QS, { 0: 2 })).toMatchObject({ score: 0, total: 4 });
  });

  it("each learner gets their own order, the same every time, and never the answers", () => {
    const qs = cleanExamQuestions(Array.from({ length: 12 }, (_, i) => ({ q: `Q${i}`, kind: "choice", options: ["a", "b", "c", "d"], answer: 0 })));
    const a1 = learnerPaper("exam", "ada", qs), a2 = learnerPaper("exam", "ada", qs), b = learnerPaper("exam", "bo", qs);
    expect(a1).toEqual(a2);
    expect(a1.map((q) => q.n)).not.toEqual(b.map((q) => q.n));
    expect(a1.map((q) => q.n).sort((x, y) => x - y)).toEqual(qs.map((_, i) => i));
    expect(JSON.stringify(a1)).not.toContain("answer");
  });

  it("makes questions from maths topics, with right answers that mark as right", () => {
    expect(EXAM_TOPICS.length).toBeGreaterThan(20);
    for (const t of EXAM_TOPICS) {
      const qs = cleanExamQuestions(topicQuestions(t.id, "medium", 5));
      expect(qs.length, t.id).toBeGreaterThan(0);
      const all = Object.fromEntries(qs.map((q, i) => [String(i), q.kind === "choice" ? q.answer : String(q.answer)]));
      expect(markPaper(qs, all).score).toBe(markPaper(qs, all).total);
    }
  });

  it("shows the time left", () => { expect(clockLeft(125_000)).toBe("2:05"); expect(clockLeft(-5)).toBe("0:00"); });
});

import { aiExamPrompt, cleanAiExam } from "@/lib/exams";
describe("A.I exam questions", () => {
  const reply = { questions: [
    { q: "Solve 2x = 10", kind: "choice", options: ["2", "5", "8", "20"], answer: 1, marks: 1 },
    { q: "What is 3² + 4²?", kind: "typed", answer: "25", marks: 2 },
    { q: "No answer", kind: "typed" },
    { q: "Answer out of range", options: ["a", "b"], answer: 7 },
    { q: "Half of 1, as a decimal", answer: "0.5 | 1/2" }, // no kind, a text answer: typed
  ] };
  it("keeps the usable questions", () => {
    const qs = cleanAiExam(reply);
    expect(qs.map((q) => [q.q, q.kind])).toEqual([["Solve 2x = 10", "choice"], ["What is 3² + 4²?", "typed"], ["Half of 1, as a decimal", "typed"]]);
    expect(cleanAiExam(reply, "choice")).toHaveLength(1);
    expect(cleanAiExam(reply.questions, "typed")).toHaveLength(2); // a bare list works too
    expect(cleanAiExam(null)).toEqual([]);
  });
  it("asks for what the teacher chose", () => {
    expect(aiExamPrompt({ topic: "Photosynthesis", level: "JSS2", count: 8, kind: "choice", difficulty: "easy" })).toBe("Class: JSS2. Topic: Photosynthesis. Write 8 easy questions, all multiple choice.");
  });
});
