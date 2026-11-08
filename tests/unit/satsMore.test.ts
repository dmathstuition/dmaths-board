import { describe, expect, it } from "vitest";
import { cleanExamQuestions, cleanPageMarks, markPaper, pagesToMark, slimAnswers, teacherMax, workingKey, type ExamQ } from "@/lib/exams";
import { isWarmUp, missedSpellings, satsArithmetic, satsWarmUp, warmUpTable, warmUpTitle } from "@/lib/sats";
import { examReports, GCSE } from "@/lib/examReport";

function seeded(seed: number) { let a = seed; return () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; }
const stroke = { id: "s1", by: "me", color: "#000", w: 6, pts: [0.1, 0.1, 0.3, 0.3] };

describe("method marks", () => {
  const long: ExamQ = { q: "2,416 × 37 =", kind: "typed", options: [], answer: "89392", marks: 2, method: true };
  const plain: ExamQ = { q: "5 + 5 =", kind: "typed", options: [], answer: "10", marks: 1 };

  it("the arithmetic paper's long multiplication and division have them", () => {
    const qs = satsArithmetic(seeded(3));
    expect(qs.filter((q) => q.method).map((q) => q.marks)).toEqual([2, 2, 2, 2]);
    expect(cleanExamQuestions(qs).filter((q) => q.method)).toHaveLength(4); // kept on the way to the server
    expect(cleanExamQuestions([{ ...plain, method: true }])[0].method).toBeUndefined(); // only 2+ mark questions
  });

  it("a right answer gets full marks by itself; a wrong one with working waits for the teacher", () => {
    expect(teacherMax(long)).toBe(1);
    expect(markPaper([long], { 0: "89,392" }).score).toBe(2);
    const wrong = { 0: "89000", [workingKey(0)]: { ink: [stroke] } };
    expect(pagesToMark([long], wrong, {}, false)).toEqual([]); // not until it's handed in
    expect(pagesToMark([long], wrong, {}, true)).toEqual([0]);
    expect(pagesToMark([long], { 0: "89000" }, {}, true)).toEqual([]); // no working: nothing to mark
    expect(pagesToMark([long], { 0: "89392", [workingKey(0)]: { ink: [stroke] } }, {}, true)).toEqual([]); // right already
    expect(markPaper([long], wrong, { 0: 1 }).score).toBe(1);
    expect(markPaper([long], { 0: "89392" }, { 0: 1 }).score).toBe(2); // a method mark never lowers a right answer
    expect(cleanPageMarks([long, plain], { 0: 5, 1: 1 })).toEqual({ 0: 1 }); // at most the method mark; never on a plain question
  });

  it("working isn't sent in the teacher's lists, just whether there is any", () => {
    const slim = slimAnswers([long], { 0: "89000", [workingKey(0)]: { ink: [stroke] } });
    expect(slim).toEqual({ 0: "89000", w0: { blank: false } });
    expect(pagesToMark([long], slim, {}, true)).toEqual([0]);
  });
});

describe("the daily warm-up", () => {
  it("is 10 quick one-mark questions, different each time", () => {
    const a = satsWarmUp(seeded(1)), b = satsWarmUp(seeded(2));
    expect(a).toHaveLength(10);
    expect(a.every((q) => q.marks === 1 && q.kind === "typed" && !q.method)).toBe(true);
    expect(a.map((q) => q.q)).not.toEqual(b.map((q) => q.q));
  });
  it("is known by its title", () => {
    expect(isWarmUp(warmUpTitle(new Date("2026-11-09")))).toBe(true);
    expect(warmUpTitle(new Date("2026-11-09"))).toBe("Warm-up 9 Nov");
    expect(isWarmUp("Class test")).toBe(false);
  });
  it("tracks each learner by name: marks, time and trend", () => {
    const row = (day: number, name: string, score: number, secs: number) => ({ at: `2026-11-${String(day).padStart(2, "0")}T09:00:00Z`, name, score, total: 10, secs });
    const lines = warmUpTable([
      row(1, "Ada", 4, 500), row(2, "ada ", 5, 480), row(3, "Ada", 5, 470), row(4, "Ada", 8, 400), row(5, "Ada", 9, 380), row(6, "Ada", 10, 360),
      row(1, "Ben", 7, 300), { at: "2026-11-02", name: "Ben", score: null, total: 10, secs: null },
    ]);
    const [ada, ben] = lines;
    expect(ada.name).toBe("Ada");
    expect(ada.tries.map((t) => t.pct)).toEqual([40, 50, 50, 80, 90, 100]);
    expect(ada.trend).toBe(43); // 90 against 47
    expect(ada.speed).toBe(432);
    expect(ben.tries).toHaveLength(1); // a warm-up not handed in doesn't count
    expect(ben.trend).toBe(0);
  });
});

describe("personal spelling lists", () => {
  const spell = (w: string): ExamQ => ({ q: `A sentence with ${w}.`, kind: "spell", options: [], answer: w, marks: 1 });
  it("brings back the words a learner got wrong and hasn't spelt right since", () => {
    const newest = { questions: [spell("rhythm"), spell("yacht")], answers: { 0: "rythm", 1: "yacht" } };
    const older = { questions: [spell("yacht"), spell("queue"), spell("rhythm")], answers: { 0: "yot", 1: "que", 2: "rhythm" } };
    const got = missedSpellings([newest, older]);
    expect(got.map((q) => q.answer)).toEqual(["rhythm", "queue"]); // yacht is right now; rhythm wrong most recently
    expect(got.every((q) => q.kind === "spell" && q.hear)).toBe(true); // heard on their own phone
  });
  it("skips words already in the test and keeps to the most asked for", () => {
    const h = [{ questions: ["a", "b", "c", "d"].map((w) => spell(`word${w}`)), answers: {} }];
    expect(missedSpellings(h, ["WORDa"], 2).map((q) => q.answer)).toEqual(["wordb", "wordc"]);
  });
  it("reports count each learner's own words in their total", () => {
    const qs = [spell("rhythm")];
    const cr = examReports(qs, [
      { id: "a", name: "Ada", answers: { 0: "rhythm", 1: "queue" }, extraQs: [spell("queue")], flags: 0, flagLog: [], startedAt: null, submittedAt: null },
      { id: "b", name: "Ben", answers: { 0: "rythm" }, flags: 0, flagLog: [], startedAt: null, submittedAt: null },
    ], GCSE);
    const ada = cr.learners.find((l) => l.name === "Ada")!, ben = cr.learners.find((l) => l.name === "Ben")!;
    expect([ada.score, ada.total, ada.percent]).toEqual([2, 2, 100]);
    expect(ada.items[1]).toMatchObject({ q: "A sentence with ________. (their own word)", right: true, classRight: null });
    expect([ben.score, ben.total]).toEqual([0, 1]);
    expect(cr.items).toHaveLength(1); // the class summary is the questions everyone had
  });
});

import { missedLetters } from "@/components/study/SpellingPractice";
describe("look, cover, write, check", () => {
  const marked = (w: string, t: string) => w.split("").map((c, i) => (missedLetters(w, t)[i] ? `[${c}]` : c)).join("");
  it("highlights just the letters they missed or got wrong", () => {
    expect(marked("rhythm", "rythm")).toBe("r[h]ythm");
    expect(marked("queue", "que")).toMatch(/^que\[u\]\[e\]$|^qu\[e\]\[u\]e$/);
    expect(missedLetters("necessary", "neccesary").filter(Boolean)).toHaveLength(1);
    expect(missedLetters("yacht", "yacht").some(Boolean)).toBe(false);
    expect(missedLetters("yacht", "").every(Boolean)).toBe(true);
  });
});

import { classResults, resultsCsv } from "@/lib/classResults";
import { reviewItems } from "@/lib/exams";
import { examCsv } from "@/lib/examDownloads";
import { KS2 } from "@/lib/examReport";
describe("exam results after the class", () => {
  it("count in each learner's class total, out of every exam's marks", () => {
    const rows = classResults([{ id: "a", name: "Ada" }, { id: "b", name: "Ben" }, { id: "c", name: "Cy" }],
      [{ round_id: "r1", student_id: "a", name: "Ada", question: "Q", mark: 2, max_mark: 2 }], [], [],
      [{ id: "x1", title: "Arithmetic", total: 40 }],
      [{ exam_id: "x1", student_id: "a", name: "Ada", score: 30, total: 40, submitted: true },
       { exam_id: "x1", student_id: "b", name: "Ben", score: 12, total: 42, submitted: true }, // their own spelling words
       { exam_id: "x1", student_id: "c", name: "Cy", score: 5, total: 40, submitted: false }, // not handed in: nothing yet
       { exam_id: "other", student_id: "a", name: "Ada", score: 9, total: 9, submitted: true }]); // another class's exam
    const by = Object.fromEntries(rows.map((r) => [r.name, r]));
    expect([by.Ada.exam, by.Ada.examMax, by.Ada.total, by.Ada.totalMax]).toEqual([30, 40, 32, 42]);
    expect([by.Ben.exam, by.Ben.examMax]).toEqual([12, 42]);
    expect([by.Cy.exam, by.Cy.examMax]).toEqual([0, 40]);
    expect(resultsCsv(rows).split("\n")[0]).toContain("Exams,Exams out of");
  });
  it("a learner's look back: what they gave, the answer, marks — and what's still being marked", () => {
    const qs: ExamQ[] = [
      { q: "7 × 8 =", kind: "typed", options: [], answer: "56 | fifty-six", marks: 1 },
      { q: "Pick", kind: "choice", options: ["a", "b"], answer: 1, marks: 1 },
      { q: "2,416 × 37 =", kind: "typed", options: [], answer: "89392", marks: 2, method: true },
      { q: "Page 4", kind: "page", options: [], answer: "", marks: 3, img: "x" },
      { q: "Page 5", kind: "page", options: [], answer: "", marks: 2, img: "y" },
    ];
    const items = reviewItems(qs, { 0: "54", 1: 1, 2: "89000", w2: { ink: [stroke] }, 3: { ink: [stroke], text: "", done: "t" }, 4: { ink: [], text: "", done: "t" } }, { 3: 2 });
    expect(items[0]).toMatchObject({ given: "54", answer: "56", right: false, got: 0 });
    expect(items[1]).toMatchObject({ given: "b", answer: "b", right: true, got: 1 });
    expect(items[2]).toMatchObject({ right: false, got: 0, pending: true });
    expect(items[3]).toMatchObject({ kind: "page", given: "Written on the page", got: 2, marks: 3, right: false });
    expect(items[4]).toMatchObject({ given: "", got: 0 }); // blank page: 0, nothing to wait for
    expect(items[4].pending).toBeUndefined();
  });
  it("the exam spreadsheet uses each learner's own total", () => {
    const csv = examCsv({ title: "Spelling", total: 20 }, [
      { id: "a", name: "Ada", flags: 0, flagLog: [], score: 21, total: 22, answered: 22, submitted: true },
      { id: "b", name: "Ben", flags: 2, flagLog: [], score: null, live: 5, total: null, answered: 6, submitted: false },
    ], KS2);
    expect(csv.split("\n")).toEqual([
      "Learner,Score,Out of,Percent,Grade (KS2 SATs (estimated scaled score)),Answered,Left the page,Handed in",
      "Ada,21,22,95,HS,22,0,yes",
      "Ben,5,20,25,WTS,6,2,no",
    ]);
  });
});
