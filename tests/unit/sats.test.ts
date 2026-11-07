import { describe, expect, it } from "vitest";
import { SATS_ARITHMETIC, SPELLING_LISTS, commas, parseSpellings, satsArithmetic } from "@/lib/sats";
import { cleanExamQuestions, gapped, isRight, keepsOrder, learnerPaper, markPaper, spelledRight, spokenSpelling, typedRight, type ExamQ } from "@/lib/exams";
import { KS2, examReports, gradeOf, ks2Scaled } from "@/lib/examReport";

function seeded(seed: number) { let a = seed; return () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; }

// Works a question out from its own wording, independently of the generator.
function value(expr: string): number {
  const js = expr
    .replace(/,(?=\d{3})/g, "")
    .replace(/(\d+) (\d+)\/(\d+)/g, "($1+$2/$3)")
    .replace(/(\d+(?:\.\d+)?)% of (\d+(?:\.\d+)?)/g, "($1/100*$2)")
    .replace(/(\d+)\/(\d+) of /g, "($1/$2)*")
    .replace(/(\d+)²/g, "($1**2)").replace(/(\d+)³/g, "($1**3)")
    .replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  if (!/^[\d+\-*/(). ]+$/.test(js)) throw new Error(`unexpected: ${expr} → ${js}`);
  return Function(`return (${js});`)() as number;
}
const firstAnswer = (a: string) => a.split("|")[0].trim();

describe("SATs arithmetic paper", () => {
  it("is laid out like Paper 1: 36 questions, 40 marks, four 2-mark long calculations", () => {
    const qs = satsArithmetic(seeded(1));
    expect(qs).toHaveLength(SATS_ARITHMETIC.questions);
    expect(qs.reduce((s, q) => s + q.marks, 0)).toBe(40);
    expect(qs.filter((q) => q.marks === 2)).toHaveLength(4);
    expect(cleanExamQuestions(qs)).toHaveLength(36); // nothing is dropped on the way to the server
  });

  it("every answer is right, over hundreds of papers", () => {
    for (let seed = 1; seed <= 300; seed++) {
      for (const q of satsArithmetic(seeded(seed))) {
        const ans = String(q.answer);
        if (q.q.includes("□")) {
          const [l, r] = q.q.replace("□", `(${firstAnswer(ans)})`).split("=");
          expect(Math.abs(value(l) - value(r)), q.q).toBeLessThan(1e-9);
        } else {
          const want = value(q.q.replace(/=\s*$/, ""));
          expect(typedRight(String(want), ans), `${q.q} ${ans} (want ${want})`).toBe(true);
          // every form the answer lists is the same number
          for (const alt of ans.split("|")) expect(typedRight(alt.trim(), String(want)) || typedRight(String(want), alt.trim()), `${q.q} alt ${alt}`).toBe(true);
        }
      }
    }
  });

  it("long division stays a 4-digit number, as on the paper", () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const q of satsArithmetic(seeded(seed)).filter((x) => x.q.includes("÷") && x.marks === 2)) {
        expect(Number(q.q.split("÷")[0].replace(/,/g, "").trim())).toBeLessThan(10_000);
      }
    }
  });

  it("writes thousands with commas", () => {
    expect(commas(56382)).toBe("56,382");
    expect(commas(999)).toBe("999");
    expect(commas(1234567)).toBe("1,234,567");
  });
});

describe("answers learners type", () => {
  it("accepts mixed numbers and equal fractions", () => {
    expect(typedRight("1 3/8", "1 3/8 | 11/8")).toBe(true);
    expect(typedRight("11/8", "1 3/8 | 11/8")).toBe(true);
    expect(typedRight("22/16", "1 3/8 | 11/8")).toBe(true);
    expect(typedRight("1.375", "1 3/8 | 11/8")).toBe(true);
    expect(typedRight("1 3/9", "1 3/8 | 11/8")).toBe(false);
    expect(typedRight("13/8", "1 3/8 | 11/8")).toBe(false);
    expect(typedRight("56,382", "56382")).toBe(true);
  });
});

describe("spelling tests", () => {
  const q: ExamQ = { q: "I did a rough sketch before starting my painting.", kind: "spell", options: [], answer: "rough", marks: 1, hear: true };

  it("reads the lines a teacher writes", () => {
    const got = parseSpellings("1. I did a *rough* sketch.\nThe map caused a lot of ________. | confusion\n\nno word here\nBats are *nocturnal* animals.");
    expect(got.map((x) => [x.q, x.answer])).toEqual([
      ["I did a rough sketch.", "rough"],
      ["The map caused a lot of confusion.", "confusion"],
      ["Bats are nocturnal animals.", "nocturnal"],
    ]);
    expect(got.every((x) => x.kind === "spell" && x.hear)).toBe(true);
    expect(parseSpellings("A *word*.", false)[0].hear).toBe(false);
  });

  it("the ready-made lists each have 20 words, each in its sentence", () => {
    for (const l of SPELLING_LISTS) {
      const got = parseSpellings(l.lines.join("\n"));
      expect(got, l.id).toHaveLength(20);
      for (const x of got) expect(gapped(x), x.q).toContain("________");
    }
  });

  it("learners see a gap, and the word only when they may hear it on their phone", () => {
    expect(gapped(q)).toBe("I did a ________ sketch before starting my painting.");
    expect(gapped({ q: "Roughly speaking, rough is right.", answer: "rough" })).toBe("Roughly speaking, ________ is right.");
    const [heard] = learnerPaper("e1", "s1", [q]);
    expect(heard.q).not.toContain("rough sketch");
    expect(heard.say).toBe(spokenSpelling(q, 1));
    expect(heard.say).toBe("Spelling 1. The word is rough. I did a rough sketch before starting my painting. The word is rough.");
    const [quiet] = learnerPaper("e1", "s1", [{ ...q, hear: false }]);
    expect(JSON.stringify(quiet)).not.toMatch(/rough/);
  });

  it("marks letter for letter", () => {
    expect(spelledRight(" Rough. ", "rough")).toBe(true);
    expect(spelledRight("ruff", "rough")).toBe(false);
    expect(spelledRight("", "rough")).toBe(false);
    expect(spelledRight("don’t", "don't")).toBe(true);
    expect(isRight(q, "rough")).toBe(true);
    expect(isRight(q, "rouhg")).toBe(false);
    expect(markPaper([q, q], { 0: "rough", 1: "ruff" }).score).toBe(1);
  });

  it("the server keeps spelling questions and drops bad ones", () => {
    const got = cleanExamQuestions([q, { ...q, answer: "" }, { ...q, answer: "<script>" }, { ...q, hear: false }]);
    expect(got).toHaveLength(2);
    expect(got[1].hear).toBeUndefined();
  });
});

describe("papers keep their order", () => {
  const img = "https://x.supabase.co/storage/v1/object/public/materials/slides/abc/1.jpg";
  const qs: ExamQ[] = Array.from({ length: 12 }, (_, i) => ({ q: `Q${i}`, kind: "choice", options: ["a", "b", "c", "d"], answer: 0, marks: 1 }));

  it("shuffles a normal test, but not when the teacher asks — or for a paper or a spelling test", () => {
    const order = (x: ExamQ[], inOrder = false) => learnerPaper("exam", "learner", x, inOrder).map((q) => q.n);
    expect(order(qs)).not.toEqual(qs.map((_, i) => i));
    expect(order(qs, true)).toEqual(qs.map((_, i) => i));
    expect(learnerPaper("exam", "learner", qs, true)[0].options.map((o) => o.i)).toEqual([0, 1, 2, 3]);
    const paper = [...qs, { q: "Question 1", kind: "typed" as const, options: [], answer: "5", marks: 1, img }];
    expect(keepsOrder(paper)).toBe(true);
    expect(order(paper)).toEqual(paper.map((_, i) => i));
    expect(learnerPaper("exam", "learner", paper).at(-1)?.img).toBe(img);
  });

  it("only takes pictures from the class's own storage", () => {
    const got = cleanExamQuestions([{ q: "Q1", kind: "typed", answer: "5", img }, { q: "Q2", kind: "typed", answer: "5", img: "https://evil.example/x.jpg" }]);
    expect(got[0].img).toBe(img);
    expect(got[1].img).toBeUndefined();
  });
});

describe("KS2 SATs grading", () => {
  it("estimates a scaled score: about half the marks is 100, 85% is 110", () => {
    expect(ks2Scaled(0)).toBe(80);
    expect(ks2Scaled(50)).toBe(100);
    expect(ks2Scaled(85)).toBe(110);
    expect(ks2Scaled(100)).toBe(120);
    expect(ks2Scaled(70)).toBeGreaterThan(100);
    expect(ks2Scaled(70)).toBeLessThan(110);
  });
  it("bands: high score, expected standard, working towards", () => {
    expect(gradeOf(90, KS2)).toBe("HS");
    expect(gradeOf(60, KS2)).toBe("EXS");
    expect(gradeOf(40, KS2)).toBe("WTS");
  });
  it("reports carry the scaled score and a SATs comment", () => {
    const qs: ExamQ[] = Array.from({ length: 10 }, (_, i) => ({ q: `${i} + 1 =`, kind: "typed", options: [], answer: String(i + 1), marks: 1 }));
    const answers = (right: number) => Object.fromEntries(qs.map((q, i) => [String(i), i < right ? String(q.answer) : "x"]));
    const cr = examReports(qs, [
      { id: "a", name: "Ada", answers: answers(9), flags: 0, flagLog: [], startedAt: null, submittedAt: null },
      { id: "b", name: "Ben", answers: answers(6), flags: 0, flagLog: [], startedAt: null, submittedAt: null },
      { id: "c", name: "Cy", answers: answers(3), flags: 0, flagLog: [], startedAt: null, submittedAt: null },
    ], KS2);
    const [ada, ben, cy] = cr.learners;
    expect([ada.grade, ben.grade, cy.grade]).toEqual(["HS", "EXS", "WTS"]);
    expect(ben.scaled).toBe(ks2Scaled(60));
    expect(ben.remark).toMatch(/estimated scaled score of 10\d, at the expected standard/);
    expect(cy.remark).toMatch(/working towards the expected standard/);
    expect(cr.passed).toBe(2);
    expect(cr.strong).toBe(1);
  });
  it("spelling questions show with a gap in reports", () => {
    const sq: ExamQ = { q: "Bats are nocturnal animals.", kind: "spell", options: [], answer: "nocturnal", marks: 1 };
    const cr = examReports([sq], [{ id: "a", name: "Ada", answers: { 0: "noctur" }, flags: 0, flagLog: [], startedAt: null, submittedAt: null }], KS2);
    expect(cr.items[0]).toMatchObject({ q: "Bats are ________ animals.", correct: "nocturnal" });
    expect(cr.learners[0].items[0]).toMatchObject({ given: "noctur", right: false });
  });
});
