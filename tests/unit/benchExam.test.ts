import { describe, expect, it } from "vitest";
import { ALL_PRACTICALS, practicalFor } from "@/lib/lab/bench/all";
import { doStep, seeded } from "@/lib/lab/bench/run";
import { benchFields, benchForTeacher, benchLines, cleanBenchSave, markBench, withMarks, type BenchSave } from "@/lib/lab/benchExam";
import { buildPracticalTest } from "@/lib/lab/atp";
import { benchGot, cleanExamQuestions, hideBenchMarks, learnerPaper, markPaper, reviewItems } from "@/lib/exams";

// Do a practical the way a learner's bench does, saving the bench at each recording.
function doIt(slug: string, seed: number, wrong: string[] = []): BenchSave {
  const p = practicalFor(slug)!;
  let s = p.init(seeded(seed)), values: Record<string, string> = {};
  const snaps: Record<string, unknown> = {};
  p.steps.forEach((st, i) => {
    if (st.action.type === "record") {
      snaps[String(i)] = JSON.parse(JSON.stringify(s));
      for (const f of st.action.fields) values[f.key] = wrong.includes(f.key) ? (f.options ? f.options.find((o) => o !== f.answer(s, values)) ?? "?" : "999") : f.answer(s, values);
      return;
    }
    ({ s, values } = doStep(st, s, values));
  });
  return { step: p.steps.length, of: p.steps.length, values, snaps, s, notes: {}, obs: [] };
}

describe("a practical test, marked against the learner's own bench", () => {
  it("every practical: doing it right earns every mark, with anyone's samples", () => {
    for (const p of ALL_PRACTICALS) {
      if (!benchFields(p.slug).length) continue;
      for (const seed of [1, 99]) {
        const m = markBench(p.slug, doIt(p.slug, seed));
        expect(m.got, `${p.slug} (seed ${seed})`).toBe(m.of);
      }
    }
  });

  it("each learner's samples differ, and a reading is marked against their own", () => {
    const a = doIt("titration", 1), b = doIt("titration", 2);
    expect(a.values.r0).not.toBe(b.values.r0);
    const swapped = { ...a, values: { ...a.values, r0: b.values.r0 } }; // someone else's reading
    expect(markBench("titration", swapped).right.r0).toBe(false);
  });

  it("a wrong reading loses its mark; a calculation from it can still earn its own (error carried forward)", () => {
    const f = benchFields("titration"), first = f[0].f.key;
    const m = markBench("titration", doIt("titration", 4, [first]));
    expect(m.right[first]).toBe(false);
    expect(m.got).toBeLessThan(m.of);
  });

  it("nothing recorded, nothing earned — and only the server's mark counts", () => {
    expect(markBench("titration", null).got).toBe(0);
    expect(markBench("titration", cleanBenchSave({ values: {}, snaps: {} })).got).toBe(0);
    const saved = withMarks("titration", { ...doIt("titration", 5), got: 999 })!;
    expect(saved.got).toBe(markBench("titration", saved).got);
    expect(cleanBenchSave("nope")).toBeNull();
    expect(benchLines("titration", saved)[0]).toMatch(/^✓ /);
  });

  it("in the exam: learners never see their mark until they hand in; the paper adds it up", () => {
    const t = buildPracticalTest("chemistry", { picks: ["titration"], seed: 3 });
    const qs = cleanExamQuestions(t.questions.map(({ fig: _f, ...q }) => q));
    expect(qs[0]).toMatchObject({ kind: "bench", bench: { slug: "titration" }, marks: benchFields("titration").length });
    expect(learnerPaper("e", "s", qs, true)[0].bench).toEqual({ slug: "titration" });
    const answers = { 0: withMarks("titration", doIt("titration", 6)) };
    expect(benchGot(qs[0], answers[0])).toBe(qs[0].marks);
    expect((hideBenchMarks(qs, answers)[0] as BenchSave).got).toBeUndefined();
    expect(markPaper(qs, answers).score).toBe(qs[0].marks);
    expect(reviewItems(qs, answers)[0]).toMatchObject({ got: qs[0].marks, right: true });
    expect(reviewItems(qs, answers)[0].given).toMatch(/^Did \d+ of \d+ steps · recorded \d+ readings/);
  });

  it("a practical test: the practicals on the bench, then conclusion, method and safety", () => {
    for (const sub of ["physics", "chemistry", "biology"] as const) {
      const t = buildPracticalTest(sub, { seed: 8 });
      expect(t.used).toHaveLength(2);
      expect(t.minutes).toBe(60);
      expect(t.questions.filter((q) => q.kind === "bench")).toHaveLength(2);
      expect(t.questions.some((q) => /state a conclusion/.test(q.q))).toBe(true);
      expect(cleanExamQuestions(t.questions.map(({ fig: _f, ...q }) => q))).toHaveLength(t.questions.length);
    }
  });
});

describe("the teacher's view of a practical", () => {
  it("is short — the readings marked, not the whole bench — and agrees with the mark", () => {
    const qs = [{ kind: "typed" }, { kind: "bench", bench: { slug: "titration" } }];
    const full = doIt("titration", 12, [benchFields("titration")[0].f.key]);
    const out = benchForTeacher(qs, { 0: "5", 1: { ...full, obs: ["It turned pink"] } });
    const sum = out[1] as { step: number; of: number; got: number; lines: string[]; obs: string[] };
    expect(out[0]).toBe("5");
    expect(sum.got).toBe(markBench("titration", full).got);
    expect(sum.lines).toHaveLength(benchFields("titration").length);
    expect(sum.lines[0]).toMatch(/^✗ /);
    expect(sum.obs).toEqual(["It turned pink"]);
    expect(JSON.stringify(sum).length).toBeLessThan(JSON.stringify(full).length / 3);
    expect(benchGot({ marks: 99 }, sum)).toBe(sum.got); // marks still add up from the summary
  });
});
