import { describe, expect, it } from "vitest";
import { JAMB_SIZES, cbtBatches, cbtTitle, isCbt, sectionScores, sectionsOf } from "@/lib/cbt";
import { cleanExamQuestions, learnerOrder, learnerPaper, type ExamQ } from "@/lib/exams";

const q = (sec: string, k: number): ExamQ => ({ q: `${sec} question ${k}`, kind: "choice", options: ["A", "B", "C", "D"], answer: k % 4, marks: 1, sec });
const paper = [...[0, 1, 2, 3].map((k) => q("Use of English", k)), ...[0, 1].map((k) => q("Mathematics", k)), ...[0, 1].map((k) => q("Physics", k)), ...[0, 1].map((k) => q("Chemistry", k))];

describe("JAMB UTME on the CBT screen", () => {
  it("each subject is a section, kept through the exam's checks", () => {
    const clean = cleanExamQuestions(paper);
    expect(clean).toHaveLength(paper.length);
    expect(sectionsOf(clean)).toEqual(["Use of English", "Mathematics", "Physics", "Chemistry"]);
    expect(isCbt(clean)).toBe(true);
    expect(isCbt(cleanExamQuestions([{ q: "x", kind: "choice", options: ["a", "b"], answer: 0 }]))).toBe(false);
  });

  it("a full UTME paper fits: 180 questions", () => {
    const big = [...Array.from({ length: 60 }, (_, k) => q("Use of English", k)), ...["Mathematics", "Physics", "Chemistry"].flatMap((s) => Array.from({ length: 40 }, (_, k) => q(s, k)))];
    expect(cleanExamQuestions(big)).toHaveLength(180);
    expect(JAMB_SIZES.full).toMatchObject({ english: 60, other: 40, minutes: 120 });
  });

  it("every candidate gets the subjects in order, but their own order inside each — and the phone shows each question's subject", () => {
    const a = learnerOrder("e1", "ada", paper), b = learnerOrder("e1", "bola", paper);
    for (const o of [a, b]) expect(o.order.map((n) => paper[n].sec)).toEqual(paper.map((x) => x.sec)); // sections stay together, in order
    expect(a.order.join()).not.toBe(b.order.join());
    expect(learnerPaper("e1", "ada", paper)[0].sec).toBe("Use of English");
  });

  it("scored like JAMB: each subject out of 100, total out of 400", () => {
    // All English right, half of Maths, none of Physics, all of Chemistry.
    const answers: Record<string, unknown> = {};
    paper.forEach((x, i) => { if (x.sec === "Use of English" || x.sec === "Chemistry" || (x.sec === "Mathematics" && i === 4)) answers[String(i)] = x.answer; else answers[String(i)] = ((x.answer as number) + 1) % 4; });
    const r = sectionScores(paper, answers);
    expect(r.sections.map((s) => s.score)).toEqual([100, 50, 0, 100]);
    expect(r.total).toBe(250);
    expect(r.outOf).toBe(400);
  });

  it("asks the A.I for each subject in batches, and names the paper", () => {
    expect(cbtBatches("Physics", 40).map((b) => b.count)).toEqual([25, 15]);
    expect(cbtBatches("Use of English", 60).map((b) => b.count)).toEqual([25, 25, 10]);
    expect(cbtBatches("Physics", 40)[0].topic).toMatch(/JAMB UTME Physics/);
    expect(cbtTitle(["Mathematics", "Physics", "Chemistry"])).toBe("JAMB UTME practice — Use of English, Mathematics, Physics, Chemistry");
  });
});
