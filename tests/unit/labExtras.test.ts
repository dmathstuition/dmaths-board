import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { ALL_PRACTICALS, practicalFor } from "@/lib/lab/bench/all";
import { checkField, doStep, runAll, seeded, tablesOf } from "@/lib/lab/bench/run";
import { keptMean, planRepeats, repeatReadings } from "@/lib/lab/bench/repeats";
import { EXAM, examFor } from "@/lib/lab/bench/exam";
import { makeWriteup, pdfText } from "@/lib/lab/writeupPdf";
import { addReport, cleanProgress, sortEntries, statusOf, summary, type LabEntry } from "@/lib/lab/labTrack";

describe("repeat readings and anomalies", () => {
  it("repeats scatter a little, and the anomaly stands well apart", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rep = planRepeats(seeded(seed));
      const xs = repeatReadings(20, rep, { spread: 0.01, off: 0.1, step: 0.01 });
      expect(xs).toHaveLength(3);
      xs.forEach((x, i) => {
        if (i === rep.odd) expect(Math.abs(x - 20)).toBeGreaterThanOrEqual(1.9);
        else expect(Math.abs(x - 20)).toBeLessThanOrEqual(0.21);
      });
    }
  });
  it("most runs have an anomaly, some don't", () => {
    const odd = Array.from({ length: 400 }, (_, i) => planRepeats(seeded(i + 1)).odd);
    expect(odd.filter((k) => k >= 0).length).toBeGreaterThan(250);
    expect(odd.filter((k) => k < 0).length).toBeGreaterThan(40);
    expect(odd.every((k) => k === -1 || k === 1 || k === 2)).toBe(true);
  });
  it("the mean leaves the anomaly out", () => {
    expect(keptMean([10, 10.2, 13], 2)).toBeCloseTo(10.1);
    expect(keptMean([10, 10.2, 10.4], -1)).toBeCloseTo(10.2);
  });
  for (const slug of ["titration", "pendulum", "free-fall", "rates"]) {
    it(`${slug}: spotting the anomaly and averaging it in are caught`, () => {
      const p = practicalFor(slug)!;
      let hits = 0;
      for (let seed = 1; seed <= 30; seed++) {
        let s = p.init(seeded(seed)), values: Record<string, string> = {};
        for (const step of p.steps) {
          if (step.id.endsWith("-check") && step.action.type === "record") {
            const [odd, mean] = step.action.fields;
            const right = doStep(step, s, values).values;
            const table = step.show!(s, values);
            expect(table.rows[0]).toHaveLength(3);
            if (right[odd.key] !== "None — they agree") {
              hits++;
              const all = table.rows[0].map(Number), avg = all.reduce((a, b) => a + b, 0) / 3;
              expect(checkField(mean, avg.toFixed(4), s, { ...values, ...right })).toBe("Leave the anomalous reading out of the mean.");
              expect(checkField(odd, "None — they agree", s, values)).not.toBe(true);
            }
          }
          ({ s, values } = doStep(step, s, values));
        }
        expect(tablesOf(p, s, values).length).toBeGreaterThan(p.results(s, values).length);
      }
      expect(hits).toBeGreaterThan(10);
    });
  }
  it("reaction time: the odd catch is left out of the mean", () => {
    const p = practicalFor("reaction-time")!;
    let hits = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const { s, values } = runAll(p, seeded(seed));
      if (s.odd < 0) { expect(values.a0).toBe("None — they agree"); continue; }
      hits++;
      const d = [0, 1, 2].map((k) => Number(values[`d${k}`])), keep = d.filter((_, k) => k !== s.odd);
      expect(Math.abs(Number(values.m0) - keep.reduce((a, b) => a + b, 0) / 2)).toBeLessThanOrEqual(0.051); // rounded to 1 dp
      expect(d[s.odd]).toBeLessThanOrEqual(28);
    }
    expect(hits).toBeGreaterThan(15);
  });
});

describe("exam-style questions", () => {
  it("every practical has at least three, and they're well formed", () => {
    for (const p of ALL_PRACTICALS) {
      const qs = examFor(p.slug);
      expect(qs.length, p.slug).toBeGreaterThanOrEqual(3);
      for (const q of qs) {
        expect(q.q.trim().length, p.slug).toBeGreaterThan(4);
        expect(q.wrong.length, `${p.slug}: ${q.q}`).toBeGreaterThanOrEqual(2);
        expect(new Set([q.right, ...q.wrong]).size, `${p.slug}: ${q.q}`).toBe(q.wrong.length + 1);
        expect(q.why.length, p.slug).toBeGreaterThan(5);
      }
    }
    // No questions for a practical that doesn't exist.
    const slugs = new Set(ALL_PRACTICALS.map((p) => p.slug));
    for (const k of Object.keys(EXAM)) expect(slugs.has(k), k).toBe(true);
  });
});

describe("the write-up PDF", () => {
  it("is made for every practical, finished or not", async () => {
    for (const p of ALL_PRACTICALS) {
      const { s, values, notes } = runAll(p, seeded(3));
      const noteMap = Object.fromEntries(notes.map((n, i) => [i, n]).filter(([, n]) => n)) as Record<number, string>;
      const exam = examFor(p.slug).map((q, k) => ({ q, picked: k ? q.right : q.wrong[0] }));
      const bytes = await makeWriteup({ p, s, values, notes: noteMap, step: p.steps.length, shown: [], name: "Ada Obi", date: "9 November 2026", exam });
      expect(new TextDecoder().decode(bytes.slice(0, 5)), p.slug).toBe("%PDF-");
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount(), p.slug).toBeGreaterThanOrEqual(1);
      expect(doc.getPageCount(), p.slug).toBeLessThanOrEqual(5);
      const half = await makeWriteup({ p, s: p.init(seeded(3)), values: {}, notes: {}, step: 0, shown: [], date: "today" });
      expect(half.length).toBeGreaterThan(1000);
    }
  }, 60_000);
  it("writes science symbols with the fonts it has", () => {
    expect(pdfText("Cu²⁺ + 2e⁻ → Cu")).toBe("Cu2+ + 2e- -> Cu");
    expect(pdfText("R = 10 Ω, λ = 2 cm, H₂O")).toBe("R = 10  ohm, lambda = 2 cm, H2O");
  });
});

describe("the live lab tracker", () => {
  const base = { by: "u1", name: "Ada", v: 1, slug: "titration", step: 3, total: 14, title: "Add 3 drops", done: false, misses: 0, onStep: 10, shown: 0, readings: [{ l: "Initial reading", v: "0.50 cm³" }], exam: null };
  it("cleans what arrives", () => {
    expect(cleanProgress(null)).toBeNull();
    expect(cleanProgress({ ...base, by: 5 })).toBeNull();
    const p = cleanProgress({ ...base, name: "x".repeat(200), step: 99, misses: -4, readings: Array.from({ length: 90 }, (_, i) => ({ l: `r${i}`, v: "1" })), exam: { score: 9, of: 3 } })!;
    expect(p.name).toHaveLength(60);
    expect(p.step).toBe(14);
    expect(p.misses).toBe(0);
    expect(p.readings).toHaveLength(40);
    expect(p.exam).toBeNull();
  });
  it("keeps the newest report", () => {
    let m: Record<string, LabEntry> = {};
    m = addReport(m, cleanProgress({ ...base, v: 5, step: 6 }), 1000);
    m = addReport(m, cleanProgress({ ...base, v: 4, step: 2 }), 2000);
    expect(m.u1.step).toBe(6);
    m = addReport(m, cleanProgress({ ...base, v: 1, slug: "pendulum", step: 1 }), 3000); // a new practical starts again
    expect(m.u1.slug).toBe("pendulum");
  });
  it("knows who is stuck, working, finished or away", () => {
    const at = 100_000, e = (x: Partial<LabEntry>): LabEntry => ({ ...base, at, ...x } as LabEntry);
    expect(statusOf(e({}), at).status).toBe("working");
    expect(statusOf(e({ misses: 3 }), at).status).toBe("stuck");
    expect(statusOf(e({ onStep: 100 }), at + 25_000).status).toBe("stuck"); // time keeps counting between reports
    expect(statusOf(e({ done: true, exam: { score: 2, of: 3 } }), at).why).toContain("2/3");
    expect(statusOf(e({}), at + 60_000).status).toBe("away");
    const list = [e({ by: "a", name: "A", done: true }), e({ by: "b", name: "B", misses: 4 }), e({ by: "c", name: "C", step: 9 }), e({ by: "d", name: "D", step: 2 })];
    expect(sortEntries(list, at).map((x) => x.by)).toEqual(["b", "d", "c", "a"]);
    expect(summary(list, at)).toMatchObject({ total: 4, stuck: 1, done: 1, working: 2 });
  });
});
