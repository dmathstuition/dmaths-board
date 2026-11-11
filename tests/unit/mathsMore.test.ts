import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANGLES, DEFAULT_BAR, DEFAULT_CHANCE, DEFAULT_MACHINE, MAX_TRIALS, PAIR_AT, barModel, cellShown, cleanAngles, cleanBar, cleanChance, cleanColumn, cleanMachine, fitSum, fraction, inverseSteps,
  lineAngles, moveCorner, outcomes, pairFact, parallelAngles, randomSum, readAnswer, resetChance, restAngle, ruleFormula, ruleWords, runMachine, spin, triAngles, triType, trials, working,
  type ColOp, type FStep,
} from "@/lib/mathsMore";
import { DEFAULT_WIDGETS, cleanWidgets } from "@/lib/boardTools";

// A repeatable stream of "random" numbers.
const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

describe("column methods", () => {
  it("adds with carrying, a place at a time", () => {
    const w = working({ op: "add", a: 478, b: 356 });
    expect(w.answer).toBe("834");
    expect(w.steps[1]).toBe("Ones: 8 + 6 = 14. Write 4 and carry 1 to the tens.");
    expect(w.steps[2]).toBe("Tens: 7 + 5 + 1 carried = 13. Write 3 and carry 1 to the hundreds.");
    expect(w.steps[3]).toBe("Hundreds: 4 + 3 + 1 carried = 8. Write 8.");
    expect(w.steps[w.steps.length - 1]).toBe("So 478 + 356 = 834.");
    expect(w.cells.filter((c) => c.kind === "carry")).toHaveLength(2);
    expect(readAnswer(working({ op: "add", a: 999, b: 1 }))).toBe("1000");
    expect(working({ op: "add", a: 95, b: 7 }).steps[2]).toBe("Tens: 9 + 1 carried = 10. Write 10.");
  });
  it("shows nothing but the sum at the start, and more with each step", () => {
    const w = working({ op: "add", a: 478, b: 356 });
    expect(w.cells.filter((c) => cellShown(c, 0)).every((c) => c.kind === "given" || c.kind === "sign")).toBe(true);
    expect(w.cells.filter((c) => cellShown(c, 1) && c.kind === "answer").map((c) => c.t)).toEqual(["4"]);
  });
  it("subtracts by exchanging, even across a zero", () => {
    const w = working({ op: "sub", a: 523, b: 278 });
    expect(w.answer).toBe("245");
    expect(w.steps[1]).toBe("Ones: 3 − 8 can't be done, so exchange 1 ten for 10 ones: the tens become 1, the ones become 13.");
    expect(w.steps[2]).toBe("Ones: 13 − 8 = 5. Write 5.");
    expect(w.steps[3]).toContain("exchange 1 hundred for 10 tens: the hundreds become 4, the tens become 11");
    const zero = working({ op: "sub", a: 302, b: 157 });
    expect(zero.answer).toBe("145");
    expect(zero.steps[1]).toContain("the hundreds become 2, the tens become 9, the ones become 12");
    expect(readAnswer(working({ op: "sub", a: 1000, b: 1 }))).toBe("999");
    expect(readAnswer(working({ op: "sub", a: 302, b: 257 }))).toBe("45"); // no zero written at the front
    // The tens were changed twice in 523 − 278: the first little number is rubbed out.
    const tens = w.cells.filter((c) => c.kind === "carry" && c.c === 2);
    expect(tens.map((c) => c.t)).toEqual(["1", "11"]);
    expect(tens[0].until).toBe(tens[1].from);
  });
  it("does short and long multiplication", () => {
    const short = working({ op: "mul", a: 36, b: 7 });
    expect(short.answer).toBe("252");
    expect(short.steps[1]).toBe("6 × 7 = 42. Write 2 and carry 4.");
    expect(short.steps[2]).toBe("3 × 7 = 21, plus the 4 carried is 25. Write 25.");
    const long = working({ op: "mul", a: 243, b: 36 });
    expect(long.answer).toBe("8748");
    expect(long.steps.some((s) => s.includes("It stands for 30, so write a 0 first"))).toBe(true);
    expect(long.steps).toContain("Now add the rows, starting with the ones.");
    expect(readAnswer(long)).toBe("8748");
    expect(readAnswer(working({ op: "mul", a: 405, b: 207 }))).toBe(String(405 * 207));
  });
  it("does long division, with zeros in the answer and remainders", () => {
    const w = working({ op: "div", a: 5362, b: 7 });
    expect(w.answer).toBe("766");
    expect(w.steps[1]).toBe("7 into 5 doesn't go, so take the next digit as well: 53.");
    expect(w.steps[2]).toBe("7 into 53 goes 7 times, because 7 × 7 = 49. Write 7 above the 3, and 49 underneath.");
    expect(w.steps[3]).toBe("Subtract: 53 − 49 = 4. Bring down the 6 to make 46.");
    expect(working({ op: "div", a: 817, b: 4 }).answer).toBe("204 r 1");
    expect(working({ op: "div", a: 817, b: 4 }).steps.some((s) => s.includes("goes 0 times. Write 0 above the 1"))).toBe(true);
    expect(readAnswer(working({ op: "div", a: 817, b: 4 }))).toBe("204r1");
    expect(working({ op: "div", a: 3, b: 7 }).answer).toBe("0 r 3");
    expect(working({ op: "div", a: 9126, b: 39 }).answer).toBe("234");
  });
  it("gets every sum right (500 of each kind)", () => {
    const rnd = seeded(11), r = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
    for (let i = 0; i < 500; i++) {
      const cases: [ColOp, number, number, string][] = [];
      const a = r(1, 99999), b = r(1, 99999), [x, y] = fitSum("sub", a, b), m1 = r(2, 9999), m2 = r(2, 999), d1 = r(1, 99999), d2 = r(2, 99);
      cases.push(["add", a, b, String(a + b)], ["sub", x, y, String(x - y)], ["mul", m1, m2, String(m1 * m2)], ["div", d1, d2, `${Math.floor(d1 / d2)}${d1 % d2 ? `r${d1 % d2}` : ""}`]);
      for (const [op, p, q, want] of cases) {
        const w = working({ op, a: p, b: q });
        expect(readAnswer(w), `${p} ${op} ${q}`).toBe(want);
        expect(w.answer.replace(/ /g, "")).toBe(want);
        for (const c of w.cells) { expect(c.c).toBeGreaterThanOrEqual(0); expect(c.c).toBeLessThan(w.cols); expect(c.r).toBeLessThan(w.rows); expect(c.from).toBeLessThan(w.steps.length); }
        const spots = new Map<string, number>(); // nothing is ever written on top of something else
        for (const c of w.cells.filter((k) => cellShown(k, w.steps.length - 1))) { const key = `${c.r},${c.c}`; spots.set(key, (spots.get(key) ?? 0) + 1); }
        expect([...spots.values()].every((n) => n === 1), `${p} ${op} ${q}: overlapping digits`).toBe(true);
      }
    }
  });
  it("keeps the numbers in range and cleans what arrives", () => {
    expect(fitSum("sub", 12, 500)).toEqual([500, 12]);
    expect(fitSum("mul", 123456, 5000)).toEqual([9999, 999]);
    expect(fitSum("div", 100, 1)).toEqual([100, 2]);
    expect(cleanColumn({ on: true, op: "div", a: 5362, b: 7, step: 999 })).toMatchObject({ on: true, op: "div", a: 5362, b: 7, step: working({ op: "div", a: 5362, b: 7 }).steps.length - 1 });
    expect(cleanColumn({ op: "magic", a: "x" })).toMatchObject({ op: "add", a: 478, step: 0 });
    for (const op of ["add", "sub", "mul", "div"] as ColOp[]) { const [a, b] = randomSum(op, seeded(5)); expect(fitSum(op, a, b)).toEqual([a, b]); }
  });
});

describe("bar model", () => {
  it("shares a total in a ratio", () => {
    const m = barModel({ ...DEFAULT_BAR, parts: [2, 3], known: "total", value: 60 });
    expect(m.question).toBe("Ada and Ben share 60 in the ratio 2 : 3. How much does each get?");
    expect(m.unit).toBe(12);
    expect(m.bars.map((b) => [b.name, b.boxes, b.total])).toEqual([["Ada", 2, 24], ["Ben", 3, 36]]);
    expect(m.working).toEqual(["2 + 3 = 5 equal parts altogether", "One part = 60 ÷ 5 = 12", "Ada: 2 × 12 = 24", "Ben: 3 × 12 = 36"]);
    expect(m.working[m.unitLine]).toContain("One part");
    expect(m.answer).toBe("Ada 24, Ben 36");
  });
  it("works back from one share, or from the difference", () => {
    const one = barModel({ ...DEFAULT_BAR, parts: [2, 3, 5], known: "p1", value: 45 });
    expect(one.unit).toBe(15);
    expect(one.working).toEqual(["Ben's 3 parts = 45", "One part = 45 ÷ 3 = 15", "Ada: 2 × 15 = 30", "Chi: 5 × 15 = 75", "Total: 10 × 15 = 150"]);
    const diff = barModel({ ...DEFAULT_BAR, parts: [5, 3], known: "diff", value: 18 });
    expect(diff.unit).toBe(9);
    expect(diff.question).toContain("Ada gets 18 more than Ben");
    expect(diff.bars.map((b) => b.total)).toEqual([45, 27]);
  });
  it("finds a fraction of an amount, and the whole from a part", () => {
    const f = barModel({ ...DEFAULT_BAR, mode: "fraction", parts: [3, 5], known: "whole", value: 40 });
    expect(f.question).toBe("Find 3/5 of 40.");
    expect([f.unit, f.answer, f.bars[0].boxes, f.bars[0].shaded]).toEqual([8, "24", 5, 3]);
    const back = barModel({ ...DEFAULT_BAR, mode: "fraction", parts: [3, 5], known: "part", value: 24 });
    expect(back.answer).toBe("40");
    expect(back.working[2]).toBe("The whole is 5 parts = 5 × 8 = 40");
  });
  it("finds a percentage, and the whole from a percentage", () => {
    const p = barModel({ ...DEFAULT_BAR, mode: "percent", parts: [30], known: "whole", value: 250 });
    expect([p.unit, p.answer, p.bars[0].shaded]).toEqual([25, "75", 3]);
    expect(p.working).toEqual(["100% = 250", "10% = 250 ÷ 10 = 25", "30% = 3 × 25 = 75"]);
    expect(barModel({ ...DEFAULT_BAR, mode: "percent", parts: [35], known: "whole", value: 80 }).working).toContain("35% = 35 × 0.8 = 28");
    expect(barModel({ ...DEFAULT_BAR, mode: "percent", parts: [20], known: "part", value: 14 }).answer).toBe("70");
  });
  it("cleans what arrives", () => {
    expect(cleanBar({ on: 1, mode: "ratio", parts: [3, 3], known: "diff", value: -5, reveal: 9, names: ["", "Zainab the Great!!"] })).toMatchObject({ on: true, parts: [3, 3], known: "total", value: 1, reveal: 2, names: ["Ada", "Zainab the Gre", "Chi"] });
    expect(cleanBar({ mode: "fraction", parts: [9, 4] })).toMatchObject({ parts: [4, 4], known: "whole" });
    expect(cleanBar({ mode: "percent", parts: [250], known: "part" })).toMatchObject({ parts: [100], known: "part" });
    expect(cleanBar({ mode: "ratio", parts: [2], known: "p2" })).toMatchObject({ parts: [2, 3], known: "total" });
  });
});

describe("function machine", () => {
  const two: FStep[] = [{ op: "×", n: 3 }, { op: "+", n: 2 }];
  it("runs a number through the machine, and back again", () => {
    expect(runMachine(two, 4)).toBe(14);
    expect(ruleWords(two)).toBe("× 3, then + 2");
    expect(inverseSteps(two)).toEqual([{ op: "−", n: 2 }, { op: "÷", n: 3 }]);
    expect(runMachine(inverseSteps(two), 14)).toBe(4);
    expect(runMachine([{ op: "÷", n: 4 }], 10)).toBe(2.5);
  });
  it("writes the rule as algebra", () => {
    expect(ruleFormula(two)).toBe("y = 3x + 2");
    expect(ruleFormula([{ op: "+", n: 2 }, { op: "×", n: 3 }])).toBe("y = 3x + 6");
    expect(ruleFormula([{ op: "−", n: 5 }])).toBe("y = x − 5");
    expect(ruleFormula([{ op: "÷", n: 2 }, { op: "+", n: 1 }])).toBe("y = x/2 + 1");
    expect(ruleFormula([{ op: "+", n: 3 }, { op: "÷", n: 2 }])).toBe("y = x/2 + 3/2");
    expect(ruleFormula([{ op: "×", n: 4 }, { op: "÷", n: 6 }])).toBe("y = 2x/3");
    expect(ruleFormula([{ op: "×", n: 2 }, { op: "÷", n: 2 }])).toBe("y = x");
  });
  it("cleans what arrives", () => {
    expect(cleanMachine({ on: 1, steps: [{ op: "×", n: 99 }, { op: "?" }, { op: "+", n: 7 }], input: 999, hide: "rule", table: [1, 1, 2, 3, 4, 5, 6, 7], back: 1 }))
      .toMatchObject({ on: true, steps: [{ op: "×", n: 12 }], input: 50, hide: "rule", table: [1, 2, 3, 4, 5, 6], back: true });
    expect(cleanMachine({ steps: [] }).steps).toEqual(DEFAULT_MACHINE.steps);
  });
});

describe("probability", () => {
  it("knows the chance of each outcome", () => {
    expect(outcomes({ kind: "coin", slices: [] }).map((o) => fraction(o.num, o.den))).toEqual(["1/2", "1/2"]);
    expect(outcomes({ kind: "dice", slices: [] })).toHaveLength(6);
    const sp = outcomes({ kind: "spinner", slices: [2, 1, 1, 0] });
    expect(sp.map((o) => [o.name, fraction(o.num, o.den)])).toEqual([["Red", "1/2"], ["Blue", "1/4"], ["Green", "1/4"]]);
    expect(fraction(3, 6)).toBe("1/2");
  });
  it("tallies goes, and many goes come close to the chance", () => {
    let s = spin(DEFAULT_CHANCE, 1, () => 0.6); // 0.6 of 4 slices = 2.4: past red's two, into blue
    expect([s.counts, s.last, s.turn]).toEqual([[0, 1, 0], 1, 1]);
    s = spin(resetChance(s), 4000, seeded(3));
    expect(trials(s)).toBe(4000);
    expect(s.counts[0] / 4000).toBeGreaterThan(0.46); expect(s.counts[0] / 4000).toBeLessThan(0.54);
    expect(s.counts[1] / 4000).toBeGreaterThan(0.21); expect(s.counts[1] / 4000).toBeLessThan(0.29);
    const dice = spin(cleanChance({ kind: "dice" }), 6000, seeded(9));
    for (const n of dice.counts) { expect(n).toBeGreaterThan(880); expect(n).toBeLessThan(1120); }
    expect(trials(spin({ ...s, counts: [MAX_TRIALS - 2, 0, 0] }, 100))).toBe(MAX_TRIALS);
    expect(resetChance(s)).toMatchObject({ counts: [0, 0, 0], last: -1 });
  });
  it("rests the pointer in the middle of the colour that came up", () => {
    expect(restAngle(DEFAULT_CHANCE, 0)).toBe(90);   // red is the first half
    expect(restAngle(DEFAULT_CHANCE, 1)).toBe(225);  // blue is the third quarter
    expect(restAngle(DEFAULT_CHANCE, -1)).toBe(0);
  });
  it("cleans what arrives", () => {
    expect(cleanChance({ kind: "spinner", slices: [9, 0, 0, 0], counts: [5, 5], last: 7 })).toMatchObject({ slices: [2, 1, 1, 0], counts: [5, 5, 0], last: 2 });
    expect(cleanChance({ kind: "coin", counts: [3, 4, 9], last: 1 })).toMatchObject({ counts: [3, 4], last: 1 });
  });
});

describe("angle facts", () => {
  it("measures a triangle so the angles add up to 180", () => {
    expect(triAngles([[0, 0], [100, 0], [0, 100]])).toEqual([90, 45, 45]);
    expect(triType([90, 45, 45])).toBe("Isosceles, right-angled");
    expect(triType([60, 60, 60])).toBe("Equilateral, acute-angled");
    expect(triType([110, 40, 30])).toBe("Scalene, obtuse-angled");
    const rnd = seeded(4);
    for (let i = 0; i < 300; i++) {
      const tri = [[rnd() * 400, rnd() * 280], [rnd() * 400, rnd() * 280], [rnd() * 400, rnd() * 280]] as any;
      expect(triAngles(tri).reduce((a: number, b: number) => a + b, 0)).toBe(180);
    }
  });
  it("won't let the triangle be squashed flat", () => {
    const s = DEFAULT_ANGLES;
    expect(moveCorner(s, 2, [200, 229])).toBe(s); // nearly on the base
    expect(moveCorner(s, 2, [200, 100]).tri[2]).toEqual([200, 100]);
    expect(moveCorner(s, 2, [9999, -50]).tri[2]).toEqual([380, 20]);
  });
  it("knows the angle facts for parallel lines", () => {
    const a = parallelAngles(60);
    expect(a).toEqual([120, 60, 60, 120, 120, 60, 60, 120]);
    for (const k of ["corresponding", "alternate", "opposite"] as const) expect(a[PAIR_AT[k][0]]).toBe(a[PAIR_AT[k][1]]);
    expect(a[PAIR_AT.cointerior[0]] + a[PAIR_AT.cointerior[1]]).toBe(180);
    expect(pairFact("alternate", 60)).toBe("Alternate angles are equal (a Z shape): both are 60°.");
    expect(pairFact("cointerior", 60)).toBe("Co-interior angles add up to 180° (a C shape): 120° + 60° = 180°.");
    expect(lineAngles(70)).toEqual([110, 70]);
  });
  it("cleans what arrives", () => {
    expect(cleanAngles({ kind: "parallel", t: 999, pair: "zig", hide: 7 })).toMatchObject({ kind: "parallel", t: 155, pair: "none", hide: 7 });
    expect(cleanAngles({ kind: "triangle", hide: 7, tri: [[0, 0], [1, 1], [2, 2]] })).toMatchObject({ hide: 2, tri: DEFAULT_ANGLES.tri });
  });
});

describe("on the board", () => {
  it("the five tools travel with the board's other tools", () => {
    const w = cleanWidgets({ ...DEFAULT_WIDGETS, column: { ...DEFAULT_WIDGETS.column, on: true, op: "mul", a: 36, b: 7 }, barmodel: { ...DEFAULT_WIDGETS.barmodel, mode: "percent", parts: [30] }, machine: { ...DEFAULT_WIDGETS.machine, input: 9 }, chance: { ...DEFAULT_WIDGETS.chance, kind: "coin" }, angles: { ...DEFAULT_WIDGETS.angles, kind: "line" } });
    expect(w.column).toMatchObject({ on: true, op: "mul", a: 36, b: 7 });
    expect([w.barmodel.mode, w.machine.input, w.chance.kind, w.angles.kind]).toEqual(["percent", 9, "coin", "line"]);
    const old = cleanWidgets({});
    expect([old.column.on, old.barmodel.on, old.machine.on, old.chance.on, old.angles.on]).toEqual([false, false, false, false, false]);
  });
});
