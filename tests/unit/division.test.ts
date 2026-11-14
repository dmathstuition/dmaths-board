import { describe, expect, it } from "vitest";
import { DIV_METHODS, answerText, breakdown, checkText, cleanDivision, decimalOf, fitDiv, randomDiv, tryPlan, type DivMethod, type RemForm } from "@/lib/division";
import { seeded } from "@/lib/lab/bench/run";

const all = (a: number, b: number, rem: RemForm = "r") => DIV_METHODS.map((m) => ({ m: m.k, d: breakdown({ a, b, method: m.k, rem }) }));

describe("division, broken down", () => {
  it("every method gets the same answer, and ends with the check", () => {
    for (const [a, b] of [[96, 4], [57, 5], [7, 2], [3, 7], [48, 8]] as [number, number][]) {
      for (const { m, d } of all(a, b)) {
        const [x, y] = fitDiv(m, a, b);
        expect(d.answer, `${m} ${x}÷${y}`).toBe(answerText(x, y, "r"));
        expect(d.steps[d.steps.length - 1].say).toContain(checkText(x, y));
        expect(d.steps.length).toBeGreaterThan(2);
      }
    }
  });

  it("the remainder as a remainder, a fraction or a decimal", () => {
    expect(answerText(57, 5, "r")).toBe("11 r 2");
    expect(answerText(57, 5, "fraction")).toBe("11 2/5");
    expect(answerText(58, 4, "fraction")).toBe("14 1/2"); // simplified
    expect(answerText(57, 5, "decimal")).toBe("11.4");
    expect(answerText(10, 3, "decimal")).toBe("3.3333…");
    expect(decimalOf(10, 3)).toMatchObject({ recurring: true, exact: false });
    expect(decimalOf(7, 8)).toMatchObject({ text: "0.875", exact: true });
    expect(answerText(96, 4, "fraction")).toBe("24");
    expect(checkText(57, 5)).toBe("11 × 5 + 2 = 57");
  });

  it("sharing: counters go round the groups until there aren't enough", () => {
    const d = breakdown({ a: 14, b: 4, method: "share", rem: "r" });
    expect(d.share![0]).toEqual({ groups: [0, 0, 0, 0], left: 14 });
    expect(d.share![3]).toEqual({ groups: [3, 3, 3, 3], left: 2 });
    expect(d.share!.length).toBe(d.steps.length);
  });

  it("grouping: one jump back per step, then the remainder before 0", () => {
    const d = breakdown({ a: 23, b: 5, method: "group", rem: "r" });
    expect(d.jumps!.slice(0, 6)).toEqual([0, 1, 2, 3, 4, 4]);
    expect(d.steps[4].say).toBe("Jump 4: 8 − 5 = 3.");
  });

  it("chunking: big, easy multiples first, adding up to the quotient", () => {
    const d = breakdown({ a: 432, b: 6, method: "chunk", rem: "r" });
    expect(d.chunks!.map((c) => c.m)).toEqual([50, 20, 2]);
    expect(d.chunks!.reduce((s, c) => s + c.m, 0)).toBe(72);
    expect(d.chunks![d.chunks!.length - 1].to).toBe(0);
  });

  it("short division: a digit at a time, carrying the remainder", () => {
    const d = breakdown({ a: 7248, b: 6, method: "short", rem: "r" }).short!;
    expect(d.q).toEqual(["1", "2", "0", "8"]);
    expect(d.carry).toEqual([undefined, 1, null, 4, null]); // 7 → 1 carried, 12 → none, 4 → 4 carried, 48 → none
    const dec = breakdown({ a: 57, b: 4, method: "short", rem: "decimal" });
    expect(dec.short!.q.join("")).toBe("1425");
    expect(dec.short!.dot).toBe(2);
    expect(dec.answer).toBe("14.25");
    const rec = breakdown({ a: 10, b: 3, method: "short", rem: "decimal" });
    expect(rec.steps.some((s) => /recurring/.test(s.say))).toBe(true);
  });

  it("asks the class before each answer is shown", () => {
    for (const { d } of all(57, 5)) expect(d.steps.filter((s) => s.ask).length).toBeGreaterThan(1);
  });

  it("keeps the numbers to what each method can draw, and cleans what arrives", () => {
    expect(fitDiv("share", 500, 3)).toEqual([47, 3]); // at most 15 rounds
    expect(fitDiv("short", 5, 50)).toEqual([5, 12]);
    const s = cleanDivision({ on: true, a: 57, b: 5, method: "chunk", step: 999, rem: "decimal", ask: true });
    expect(s).toMatchObject({ on: true, a: 57, b: 5, method: "chunk", rem: "decimal", ask: true });
    expect(s.step).toBe(breakdown(s).steps.length - 1);
    expect(cleanDivision({ method: "nope" }).method).toBe("short");
    const r = seeded(4);
    for (const m of DIV_METHODS.map((x) => x.k) as DivMethod[]) for (let i = 0; i < 30; i++) { const [a, b] = randomDiv(m, r); expect(fitDiv(m, a, b)).toEqual([a, b]); }
  });

  it("learners do it themselves: how many go, and what's left, digit by digit", () => {
    const p = tryPlan(7248, 6);
    expect(p).toHaveLength(8);
    expect(p.map((x) => x.answer)).toEqual([1, 1, 2, 0, 0, 4, 8, 0]);
    expect(p[0].ask).toBe("How many 6s in 7?");
    expect(p[7].ask).toMatch(/remainder/);
  });
});
