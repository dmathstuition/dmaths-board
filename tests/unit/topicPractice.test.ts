import { describe, expect, it } from "vitest";
import { PRACTICE_STYLES, cleanPractice, practicePrompt, practiceTitle } from "@/lib/topicPractice";
import { checkResult, checkedAll, checkedKey, cleanExamQuestions, learnerPaper, markPaper } from "@/lib/exams";

const ai = { questions: [
  { q: "Solve x² − 5x + 6 = 0. The roots are…", kind: "choice", options: ["2 and 3", "−2 and −3", "1 and 6", "−1 and 6"], answer: 0, marks: 1, why: "Factorise: (x − 2)(x − 3) = 0." },
  { q: "Sum of the roots of x² − 7x + 10 = 0?", kind: "typed", answer: "7", marks: 2, why: "−b/a = 7." },
  { q: "Bad one", kind: "choice", options: ["only one"], answer: 0 },
] };

describe("topic practice", () => {
  it("the A.I's questions become practice questions on the topic, each with its worked solution", () => {
    const qs = cleanPractice(ai, "Quadratic equations");
    expect(qs).toHaveLength(2);
    for (const q of qs) expect(q).toMatchObject({ practice: true, topic: "Quadratic equations" });
    expect(qs[0].why).toMatch(/Factorise/);
    expect(cleanExamQuestions(qs)).toEqual(qs); // survives the exam's own checks
    // Only choice and typed questions can be checked as you go.
    expect(cleanExamQuestions([{ q: "Explain", kind: "written", practice: true, why: "x" }])[0].practice).toBeUndefined();
  });

  it("a learner's phone never gets the answers or solutions — only that it's practice", () => {
    const qs = cleanPractice(ai, "Quadratics");
    const paper = learnerPaper("e", "s", qs, true);
    expect(paper[0]).toMatchObject({ practice: true, topic: "Quadratics" });
    const sent = JSON.stringify(paper);
    expect(sent).not.toContain("Factorise");
    expect(sent).not.toContain("−b/a");
  });

  it("checking an answer: right or not, the right answer, the solution — and again after a refresh", () => {
    const qs = cleanPractice(ai, "Quadratics");
    expect(checkResult(qs[0], 2)).toEqual({ right: false, answer: 0, why: "Factorise: (x − 2)(x − 3) = 0." });
    expect(checkResult(qs[1], " 7 ")).toMatchObject({ right: true, answer: "7" });
    const answers = { 0: 2, [checkedKey(0)]: true, 1: "7" }; // the second answered but not checked yet
    expect(Object.keys(checkedAll(qs, answers))).toEqual(["0"]);
    expect(markPaper(qs, answers).score).toBe(2); // marked as usual at the end
  });

  it("asks in the exam board's style", () => {
    expect(practicePrompt({ subject: "Physics", topic: "Moments", style: "igcse", count: 10, difficulty: "medium" })).toContain(PRACTICE_STYLES.igcse.label);
    expect(practicePrompt({ subject: "Physics", topic: "Moments", style: "waec", count: 10, difficulty: "medium" })).toContain("WAEC");
    expect(practiceTitle("Physics", "Moments")).toBe("Physics practice — Moments");
  });
});
