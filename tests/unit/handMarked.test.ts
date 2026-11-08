import { describe, expect, it } from "vitest";
import { cleanExamQuestions, cleanPageAnswer, cleanPageMarks, currentPage, isHandMarked, learnerPaper, markPaper, pageBlank, pageDone, pagesToMark, reviewItems, slimAnswers, type ExamQ } from "@/lib/exams";
import { examReports, GCSE } from "@/lib/examReport";

const img = (n: number) => `https://x.supabase.co/storage/v1/object/public/materials/slides/abc/p${n}.jpg`;
const page = (n: number, marks: number): ExamQ => ({ q: `Page ${n}`, kind: "page", options: [], answer: "", marks, img: img(n) });
const paper = [page(4, 2), page(5, 3), page(6, 5)]; // 10 marks
const stroke = { id: "s1", by: "me", color: "#0B1220", w: 6, pts: [0.1, 0.1, 0.2, 0.2] };
const wrote = (extra: object = {}) => ({ ink: [stroke], text: "", ...extra });

describe("a paper the teacher marks page by page", () => {
  it("keeps pages (with their picture and marks) and drops ones without a page", () => {
    const got = cleanExamQuestions([...paper, { q: "Page 7", kind: "page", marks: 99, img: img(7) }, { q: "Page 8", kind: "page", marks: 2 }]);
    expect(got).toHaveLength(4);
    expect(got[3].marks).toBe(20); // at most 20 a page
    expect(isHandMarked(got)).toBe(true);
    expect(learnerPaper("e", "s", got).map((q) => q.n)).toEqual([0, 1, 2, 3]); // always in order
  });

  it("cleans what a learner writes on a page (no sneaking in a 'done' or other stuff)", () => {
    const p = cleanPageAnswer({ ink: [stroke, { bad: 1 }], text: "Q4: Emma\r\n", done: "2026-01-01", extra: "x" });
    expect(p).toEqual({ ink: [expect.objectContaining({ id: "s1" })], text: "Q4: Emma\n" });
    expect(cleanPageAnswer(null)).toEqual({ ink: [], text: "" });
  });

  it("knows which page they're on, and which are handed in or blank", () => {
    const answers = { 0: wrote({ done: "t1" }), 1: wrote() };
    expect(currentPage(paper, answers)).toBe(1);
    expect(currentPage(paper, { 0: wrote({ done: "t" }), 1: wrote({ done: "t" }), 2: wrote({ done: "t" }) })).toBe(-1);
    expect(pageDone(answers[0])).toBe(true);
    expect(pageDone(answers[1])).toBe(false);
    expect(pageBlank({ ink: [], text: "  " })).toBe(true);
    expect(pageBlank({ ink: [{ ...stroke, erase: true }], text: "" })).toBe(true); // only rubbing out
    expect(pageBlank(wrote())).toBe(false);
    expect(pageBlank({ ink: [], text: "42" })).toBe(false);
  });

  it("lists the pages waiting for the teacher: handed in, written on, not marked", () => {
    const answers = { 0: wrote({ done: "t1" }), 1: { ink: [], text: "", done: "t2" }, 2: wrote() };
    expect(pagesToMark(paper, answers, {})).toEqual([0]); // page 2 blank, page 3 not handed in
    expect(pagesToMark(paper, answers, { 0: 2 })).toEqual([]);
    expect(pagesToMark(paper, answers, {}, true)).toEqual([0, 2]); // handed in the whole paper
  });

  it("adds up the teacher's marks for the pages", () => {
    const marks = cleanPageMarks(paper, { 0: 2, 1: 1, 2: 9, 5: 3, x: 1 });
    expect(marks).toEqual({ 0: 2, 1: 1, 2: 5 }); // never more than a page is worth; only real pages
    const m = markPaper(paper, {}, marks);
    expect(m).toEqual({ score: 8, total: 10, right: [true, false, true] });
    expect(markPaper(paper, {}).score).toBe(0); // nothing marked yet
    expect(cleanPageMarks(paper, { 0: null, 1: -1 })).toEqual({});
  });

  it("works alongside questions marked automatically", () => {
    const mixed: ExamQ[] = [{ q: "2 + 2 =", kind: "typed", options: [], answer: "4", marks: 1 }, page(4, 3)];
    expect(markPaper(mixed, { 0: "4" }, { 1: 2 }).score).toBe(3);
  });

  it("leaves out the writing in lists (it's big), but keeps the page they're on", () => {
    const answers = { 0: wrote({ done: "t1" }), 1: wrote({ text: "hello" }) };
    const slim = slimAnswers(paper, answers, 1);
    expect(slim[0]).toEqual({ done: "t1", blank: false, text: "" });
    expect(slim[1]).toEqual(answers[1]);
    expect(pageBlank(slim[0])).toBe(false);
    expect(pageDone(slim[0])).toBe(true);
    expect(JSON.stringify(slimAnswers(paper, answers))).not.toContain("pts");
  });

  it("reports show each page's mark and the total", () => {
    const cr = examReports(paper, [
      { id: "a", name: "Ada", answers: slimAnswers(paper, { 0: wrote({ done: "t" }), 1: wrote({ done: "t" }), 2: { ink: [], text: "", done: "t" } }), pageMarks: { 0: 2, 1: 2 }, flags: 0, flagLog: [], startedAt: null, submittedAt: "t" },
    ], GCSE);
    const ada = cr.learners[0];
    expect([ada.score, ada.total, ada.percent]).toEqual([4, 10, 40]);
    expect(ada.items.map((x) => x.given)).toEqual(["2 / 2 marks", "2 / 3 marks", ""]);
    expect(ada.items[2].blank).toBe(true);
    expect(ada.items[0]).toMatchObject({ right: true, correct: "Marked by the teacher" });
  });
});

describe("a reading paper's written answers (marked by the teacher)", () => {
  const w = (marks: number, notes = ""): ExamQ => ({ q: "Why did Sam hide the key? Explain.", kind: "written", options: [], answer: notes, marks });
  const qs: ExamQ[] = [w(3, "Award 1 for each reason from the text"), w(1), { q: "Tick one", kind: "choice", options: ["a", "b"], answer: 0, marks: 1 }];

  it("are kept with their mark-scheme notes, which learners don't get while it's on", () => {
    const got = cleanExamQuestions([...qs, { q: "", kind: "written", marks: 2 }]);
    expect(got.map((q) => q.kind)).toEqual(["written", "written", "choice"]);
    expect(got[0]).toMatchObject({ marks: 3, answer: "Award 1 for each reason from the text" });
    expect(JSON.stringify(learnerPaper("e", "s", got))).not.toContain("Award 1");
  });

  it("wait for the teacher once handed in — a blank one is just 0", () => {
    const answers = { 0: "Because she was scared of the dog.", 1: "  ", 2: 0 };
    expect(pagesToMark(qs, answers, {}, false)).toEqual([]);
    expect(pagesToMark(qs, answers, {}, true)).toEqual([0]);
    expect(markPaper(qs, answers, {}).score).toBe(1); // just the tick-one
    expect(markPaper(qs, answers, { 0: 2 }).score).toBe(3);
    expect(cleanPageMarks(qs, { 0: 9, 2: 1 })).toEqual({ 0: 3 }); // never more than the question's marks; never on a tick-one
  });

  it("are cut short in the teacher's lists, whole for the learner and on the marking desk", () => {
    const long = "x".repeat(300);
    expect(String(slimAnswers(qs, { 0: long }, -1, true)[0])).toHaveLength(121);
    expect(slimAnswers(qs, { 0: long })[0]).toBe(long);
    expect(pagesToMark(qs, slimAnswers(qs, { 0: long }, -1, true), {}, true)).toEqual([0]);
  });

  it("show in reports and in the learner's look back", () => {
    const cr = examReports(qs, [{ id: "a", name: "Ada", answers: { 0: "Because she was scared.", 2: 0 }, pageMarks: { 0: 2 }, flags: 0, flagLog: [], startedAt: null, submittedAt: "t" }], GCSE);
    expect(cr.learners[0].items[0]).toMatchObject({ given: "Because she was scared. (2 / 3 marks)", correct: "Marked by the teacher", right: false });
    expect(cr.learners[0].score).toBe(3);
    const items = reviewItems(qs, { 0: "Because she was scared.", 1: "" }, { 0: 2 });
    expect(items[0]).toMatchObject({ kind: "written", given: "Because she was scared.", answer: "Award 1 for each reason from the text", got: 2 });
    expect(items[0].pending).toBeUndefined();
    expect(reviewItems(qs, { 0: "An answer" }, {})[0].pending).toBe(true);
    expect(items[1]).toMatchObject({ given: "", got: 0 });
  });
});
