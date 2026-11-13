import { describe, expect, it } from "vitest";
import { LICENCE_PASS, LICENCE_SIZE, SYMBOLS, bankSize, licenceQuiz, licenceRight, looksOf, passed, readLicence } from "@/lib/lab/licence";
import { seeded } from "@/lib/lab/bench/run";

describe("the lab safety licence", () => {
  it("ten questions — four hazard symbols, six lab rules — with the right answer among the options", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const qs = licenceQuiz(seeded(seed));
      expect(qs).toHaveLength(LICENCE_SIZE);
      expect(qs.filter((q) => q.symbol)).toHaveLength(4);
      expect(new Set(qs.map((q) => q.id)).size).toBe(LICENCE_SIZE);
      for (const q of qs) {
        expect(q.options).toHaveLength(4);
        expect(q.options[q.answer]).toBe(q.symbol ? SYMBOLS[q.symbol].name : licenceRight(q.q));
        expect(q.why.length).toBeGreaterThan(10);
      }
    }
  });
  it("a retake asks different questions, in a different order", () => {
    const a = licenceQuiz(seeded(1)).map((q) => q.id).join(), b = licenceQuiz(seeded(2)).map((q) => q.id).join();
    expect(a).not.toBe(b);
    expect(bankSize()).toBeGreaterThan(25);
  });
  it("every symbol is described for a screen reader without naming it", () => {
    for (const [s, v] of Object.entries(SYMBOLS)) expect(looksOf(s as keyof typeof SYMBOLS).toLowerCase()).not.toContain(v.name.toLowerCase().split(" ")[0]);
  });
  it("8 of 10 passes; only a pass is kept", () => {
    expect(passed(LICENCE_PASS)).toBe(true);
    expect(passed(LICENCE_PASS - 1)).toBe(false);
    expect(readLicence(JSON.stringify({ at: 1, score: 9, of: 10, name: "Ada" }))).toEqual({ at: 1, score: 9, of: 10, name: "Ada" });
    expect(readLicence(JSON.stringify({ at: 1, score: 5, of: 10 }))).toBeNull();
    expect(readLicence("junk")).toBeNull();
    expect(readLicence(null)).toBeNull();
  });
});
