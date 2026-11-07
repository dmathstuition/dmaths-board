import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { writeFileSync } from "fs";
import { GCSE, WAEC, examReports, gradeOf, ordinal } from "@/lib/examReport";
import { classPdf, learnerPdf, safe } from "@/lib/examPdf";
import type { ExamQ } from "@/lib/exams";

const qs: ExamQ[] = [
  { q: "The bearing of B from A is 065°. Find the bearing of A from B.", kind: "choice", options: ["245°", "115°", "295°", "065°"], answer: 0, marks: 1 },
  { q: "A ship sails 50 km on a bearing of 040°. How far north of its start is it?", kind: "choice", options: ["32.1 km", "38.3 km", "41.9 km", "59.6 km"], answer: 1, marks: 2 },
  { q: "The exact value of tan 60° is…", kind: "choice", options: ["√3", "1/√3", "√3/2", "1/2"], answer: 0, marks: 1 },
  { q: "Write 45° as a three-figure bearing.", kind: "typed", options: [], answer: "045", marks: 1 },
];
const t0 = "2026-11-04T09:00:00Z";
const entry = (id: string, name: string, answers: Record<string, unknown>, extra: object = {}) =>
  ({ id, name, answers, flags: 0, flagLog: [], startedAt: t0, submittedAt: "2026-11-04T09:12:30Z", ...extra });
const entries = [
  entry("a", "Ada Obi", { 0: 0, 1: 1, 2: 0, 3: "045" }),                                   // 5/5
  entry("b", "Bola", { 0: 2, 1: 1, 2: 0 }, { flags: 2, flagLog: [{ at: "2026-11-04T09:05:00Z", reason: "left the page" }] }), // 3/5, one blank
  entry("c", "Chidi", { 0: 0, 1: 0, 2: 1, 3: "45" }),                                      // 1/5 ("45" isn't a 3-figure bearing match? tolerant marking decides)
  entry("d", "Dayo", { 0: 2, 1: 1, 2: 0 }),                                                // 3/5, same as Bola
];

describe("exam reports", () => {
  it("grades the WAEC way", () => {
    // The standard: UK GCSE 9–1.
    expect([100, 90, 89, 80, 70, 60, 50, 49, 40, 39, 30, 20, 10, 9, 0].map((p) => gradeOf(p))).toEqual(["9", "9", "8", "8", "7", "6", "5", "4", "4", "3", "3", "2", "1", "U", "U"]);
    expect(GCSE.pass).toBe(40);
    // WAEC, for Nigerian classes.
    expect([100, 75, 74, 70, 65, 60, 55, 50, 49, 45, 40, 39, 0].map((p) => gradeOf(p, WAEC))).toEqual(["A1", "A1", "B2", "B2", "B3", "C4", "C5", "C6", "D7", "D7", "E8", "F9", "F9"]);
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st"]);
  });

  it("works out each learner's result, position and analysis", () => {
    const cr = examReports(qs, entries);
    expect(cr.takers).toBe(4);
    const by = Object.fromEntries(cr.learners.map((l) => [l.id, l]));
    expect(by.a).toMatchObject({ score: 5, total: 5, percent: 100, grade: "9", scale: "UK GCSE (9–1)", position: 1, right: 4, wrong: 0, blank: 0, minutes: 13 });
    expect(by.b).toMatchObject({ score: 3, percent: 60, grade: "6", position: 2, right: 2, wrong: 1, blank: 1, flags: 2 });
    expect(by.d.position).toBe(2); // equal scores share a place
    expect(by.c.position).toBe(4);
    expect(by.b.items[0]).toMatchObject({ n: 1, given: "295°", correct: "245°", right: false, classRight: 50 });
    expect(by.b.items[3]).toMatchObject({ blank: true, given: "" });
    expect(by.b.remark).toMatch(/^Good work — grade 6, a strong pass\..*1 question was left unanswered.*Left the exam page 2 times/);
    // What to work on: their wrong ones, the ones most of the class got right first.
    expect(by.c.focus[0]).toMatch(/^Q2: A ship sails/);
    expect(cr.items.map((i) => i.classRight)).toEqual([50, 75, 75, by.c.items[3].right ? 50 : 25]);
    expect(cr.grades.find((g) => g.grade === "9")?.count).toBe(1);
    expect(cr.scheme.passLabel).toBe("Standard pass (4+)");
    // The same class graded the WAEC way.
    const w = examReports(qs, entries, WAEC);
    expect(w.learners.find((l) => l.id === "b")).toMatchObject({ grade: "C4", scale: "WAEC (A1–F9)" });
    expect(w.learners.find((l) => l.id === "b")!.remark).toMatch(/^Good work — C4, a credit pass\./);
    expect(cr.learners[0].id).toBe("a");
  });

  it("copes with nobody, and with a paper not handed in", () => {
    expect(examReports(qs, [])).toMatchObject({ takers: 0, average: null, learners: [] });
    const r = examReports(qs, [entry("x", "", {}, { submittedAt: null })]).learners[0];
    expect(r).toMatchObject({ name: "Learner", score: 0, blank: 4, submitted: false, minutes: null, grade: "U" });
  });

  it("writes maths symbols the PDF fonts can show", () => {
    expect(safe("√3 − θ ∠PQR ≈ 101°, x² ÷ 2 × 3")).toBe("sqrt3 - theta angle PQR ~ 101°, x² ÷ 2 × 3");
    expect(safe("日本")).toBe("??");
  });

  it("makes a PDF for one learner and for the whole class", async () => {
    const cr = examReports(qs, entries);
    const meta = { className: "SS2 Mathematics", examTitle: "Bearings test", date: "4 November 2026", teacher: "Mr B" };
    const one = await learnerPdf(meta, cr.learners[1]);
    expect((await PDFDocument.load(one)).getPageCount()).toBe(1);
    // A long class: the summary spills onto more pages, then one page (or more) each.
    const many = Array.from({ length: 40 }, (_, i) => entry(`k${i}`, `Learner ${i + 1}`, { 0: i % 4, 1: 1, 2: i % 2 }));
    const all = await classPdf(meta, examReports(qs, many));
    expect((await PDFDocument.load(all)).getPageCount()).toBeGreaterThanOrEqual(41);
    if (process.env.REPORT_PREVIEW) { writeFileSync(`${process.env.REPORT_PREVIEW}/learner.pdf`, one); writeFileSync(`${process.env.REPORT_PREVIEW}/class.pdf`, await classPdf(meta, cr)); }
  });
});
