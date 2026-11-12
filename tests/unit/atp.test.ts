import { describe, expect, it } from "vitest";
import { buildAtp, gridFor, straightness, type AtpSubject } from "@/lib/lab/atp";
import { closeup } from "@/components/lab/bench/Apparatus";
import { cleanExamQuestions, cleanGraphGiven, graphMarks, learnerPaper, markPaper, reviewItems, shownAnswer, typedRight, type ExamQ } from "@/lib/exams";

const zoomable = (it: Parameters<typeof closeup>[0]) => !!closeup(it);
const SUBJECTS: AtpSubject[] = ["physics", "chemistry", "biology"];
const asExam = (qs: ReturnType<typeof buildAtp>["questions"]): ExamQ[] => qs.map(({ fig, ...q }) => q);

describe("an IGCSE Alternative to Practical paper", () => {
  for (const sub of SUBJECTS) {
    it(`${sub}: about 40 marks over an hour, the IGCSE skills, ending with a plan`, () => {
      for (const seed of [1, 2, 3]) {
        const p = buildAtp(sub, { seed, zoomable });
        expect(p.minutes).toBe(60);
        expect(p.marks).toBeGreaterThanOrEqual(30);
        expect(p.marks).toBeLessThanOrEqual(52);
        expect(p.used.length).toBeGreaterThanOrEqual(2);
        const kinds = new Set(p.questions.map((q) => q.kind));
        expect(kinds.has("graph")).toBe(true);
        expect(kinds.has("written")).toBe(true);
        const last = p.questions[p.questions.length - 1];
        expect(last.q).toMatch(/Plan an experiment/);
        expect(last.marks).toBe(6);
        // Every question survives the exam's own checks, and every figure it points to exists.
        expect(cleanExamQuestions(asExam(p.questions))).toHaveLength(p.questions.length);
        for (const q of p.questions) if (q.fig) expect(p.figures.some((f) => f.id === q.fig)).toBe(true);
      }
    });
  }

  it("physics has instruments to read, from the bench's own close-ups", () => {
    const p = buildAtp("physics", { seed: 5, zoomable });
    const reads = p.questions.filter((q) => /Read and record/.test(q.q));
    expect(reads.length).toBeGreaterThan(0);
    for (const q of reads) expect(p.figures.find((f) => f.id === q.fig)?.kind).toBe("lens");
  });

  it("the practicals asked for are the ones used", () => {
    const p = buildAtp("chemistry", { seed: 9, zoomable, picks: ["titration", "rates"] });
    expect(p.used.sort()).toEqual(["rates", "titration"]);
  });

  it("a paper never gives its answers away in a table: answers asked for are blank cells", () => {
    const p = buildAtp("physics", { seed: 4, zoomable });
    for (const q of p.questions.filter((x) => x.kind === "typed" && /Complete Table/.test(x.q))) {
      const f = p.figures.find((x) => x.id === q.fig)!;
      expect(f.kind).toBe("table");
      if (f.kind === "table") expect(f.blanks.length).toBeGreaterThan(0);
    }
  });

  it("a curve is joined smoothly; a straight line gets a line of best fit and a gradient", () => {
    expect(straightness([[1, 2], [2, 4], [3, 6], [4, 8]])).toBeCloseTo(1);
    expect(straightness([[0, 0], [1, 9], [2, 12], [3, 13], [4, 13.5]])).toBeLessThan(0.98);
    const g = gridFor([[0.4, 1.6], [0.6, 2.4], [0.8, 3.2], [1, 4]], "L / m", "T² / s²");
    expect(g).toMatchObject({ x0: 0, y0: 0 });
    expect(g.x1).toBeGreaterThanOrEqual(1);
    expect(g.y1).toBeGreaterThanOrEqual(4);
    const far = gridFor([[0, 18], [10, 22], [20, 24], [30, 23]], "V", "T");
    expect(far.y0).toBeGreaterThan(0); // 18–24 °C isn't squashed against 0
    // Ten big squares each way, in round steps, holding every point, using at least half the paper.
    for (const sub of SUBJECTS) for (const seed of [1, 2, 3, 4]) for (const q of buildAtp(sub, { seed, zoomable }).questions.filter((x) => x.kind === "graph")) {
      const { p } = JSON.parse(String(q.answer)), gr = q.grid!;
      for (const [lo, hi, vs] of [[gr.x0, gr.x1, p.map((v: number[]) => v[0])], [gr.y0, gr.y1, p.map((v: number[]) => v[1])]] as [number, number, number[]][]) {
        const step = (hi - lo) / 10, k = 10 ** Math.floor(Math.log10(step) + 1e-9);
        expect([1, 2, 2.5, 5, 10].some((f) => Math.abs(step / k - f) < 1e-6), `${q.q} step ${step}`).toBe(true);
        expect(Math.min(...vs)).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(Math.max(...vs)).toBeLessThanOrEqual(hi + 1e-9);
        expect((Math.max(...vs) - Math.min(lo, ...vs)) / (hi - lo)).toBeGreaterThanOrEqual(0.45);
      }
    }
  });
});

describe("graph questions in an exam", () => {
  const grid = { x: "p.d. / V", y: "current / A", x0: 0, x1: 7, y0: 0, y1: 0.6 };
  const pts: [number, number][] = [[1, 0.083], [2, 0.167], [3, 0.25], [4, 0.333], [5, 0.417], [6, 0.5]];
  const q: ExamQ = cleanExamQuestions([{ q: "Plot it", kind: "graph", grid, answer: JSON.stringify({ p: pts, m: 0.0833, c: 0 }), marks: 3 }])[0];

  it("plots and a good line earn every mark; a missed point loses one; a bad line loses the line mark", () => {
    const line: [[number, number], [number, number]] = [[0, 0], [6, 0.5]];
    expect(graphMarks(q, JSON.stringify({ p: pts, l: line }))).toBe(3);
    expect(graphMarks(q, JSON.stringify({ p: pts.slice(1), l: line }))).toBe(2);
    expect(graphMarks(q, JSON.stringify({ p: pts.map(([x, y]) => [x + 0.05, y + 0.005]), l: line }))).toBe(3); // within half a small square
    expect(graphMarks(q, JSON.stringify({ p: pts, l: [[0, 0], [6, 0.3]] }))).toBe(2);
    expect(graphMarks(q, JSON.stringify({ p: pts, l: null }))).toBe(2);
    expect(graphMarks(q, "")).toBe(0);
    expect(graphMarks(q, JSON.stringify({ p: [[1, 0.3], [2, 0.1]], l: null }))).toBe(0);
  });

  it("a smooth curve: the marks are for the plots", () => {
    const c = cleanExamQuestions([{ q: "Plot it", kind: "graph", grid: { ...grid, curve: true }, answer: JSON.stringify({ p: pts, m: 0, c: 0 }), marks: 2 }])[0];
    expect(graphMarks(c, JSON.stringify({ p: pts, l: null }))).toBe(2);
    expect(graphMarks(c, JSON.stringify({ p: pts.slice(2), l: null }))).toBe(0);
  });

  it("learners get the axes, never the points; marking and the review add it up", () => {
    const paper = learnerPaper("e1", "s1", [q]);
    expect(paper[0].grid).toEqual(grid);
    expect(JSON.stringify(paper)).not.toContain("0.083");
    const answers = { 0: cleanGraphGiven({ p: pts.slice(1), l: [[0, 0], [6, 0.5]] }) };
    expect(markPaper([q], answers)).toMatchObject({ score: 2, total: 3 });
    const [r] = reviewItems([q], answers);
    expect(r).toMatchObject({ got: 2, marks: 3, right: false, given: "5 points plotted, line drawn" });
    expect(r.answer).toMatch(/^Points: \(1, 0\.083\)/);
  });

  it("drops junk: a broken grid, or a learner's answer that isn't a graph", () => {
    expect(cleanExamQuestions([{ q: "x", kind: "graph", grid: { x0: 5, x1: 1, y0: 0, y1: 1 }, answer: JSON.stringify({ p: pts, m: 1, c: 0 }) }])).toEqual([]);
    expect(cleanGraphGiven("not json")).toBe("");
    expect(JSON.parse(cleanGraphGiven({ p: Array.from({ length: 50 }, (_, i) => [i, i]), l: [[0, 0], [0, 0]] })).p).toHaveLength(20);
  });
});

describe("readings marked like the mark scheme", () => {
  it("a range accepts anything inside it", () => {
    expect(typedRight("23.45", "23.40..23.50")).toBe(true);
    expect(typedRight("23.4", "23.40..23.50")).toBe(true);
    expect(typedRight("23.55", "23.40..23.50")).toBe(false);
    expect(typedRight("-4.5", "-5.12..-4.02")).toBe(true);
    expect(typedRight("abc", "1..2")).toBe(false);
    expect(shownAnswer("23.40..23.50")).toBe("23.40 to 23.50");
    expect(shownAnswer("12 | twelve")).toBe("12");
  });

  it("every reading and calculation's own answer is accepted", () => {
    for (const sub of SUBJECTS) {
      const p = buildAtp(sub, { seed: 11, zoomable });
      for (const q of p.questions.filter((x) => x.kind === "typed")) {
        const a = String(q.answer), lo = a.includes("..") ? a.split("..")[0] : a;
        expect(typedRight(lo, a), `${q.q} → ${a}`).toBe(true);
      }
    }
  });
});

describe("each question on the paper", () => {
  it("opens with the practical's name and aim, once", () => {
    const p = buildAtp("physics", { seed: 3, zoomable, picks: ["circuits"] });
    const ones = p.questions.filter((q) => /^1\(/.test(q.q) || /^1 {2}/.test(q.q));
    expect(p.questions[0].q).toMatch(/^1 {2}Ohm's law: current and p\.d\.\. .+\n\n1\(a\)/s);
    expect(ones.filter((q) => q.q.includes("Ohm's law: current and p.d.")).length).toBe(1);
  });
});

describe("graph data", () => {
  it("comes from the results table when it's all there — not a second copy", () => {
    const p = buildAtp("physics", { seed: 3, zoomable, picks: ["circuits"] });
    expect(p.figures.filter((f) => f.kind === "table")).toHaveLength(1);
    expect(p.questions.find((q) => q.kind === "graph")?.q).toMatch(/Table 1\.1/);
  });
});
