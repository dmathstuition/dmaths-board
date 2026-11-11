import { describe, expect, it } from "vitest";
import {
  area, axis, bins, canDo, chartStats, cleanBalance, cleanChart, cleanGeo, crossesItself, doOp, equationText, expand, interiorAngles, isFrequencyTable, modeText,
  newEquation, opText, parseList, perimeter, reflectPt, sectors, shapeName, simplifyRoot, solve, solved, stats, symmetricIn, tapPeg, tilt,
  type Band, type Pt, type Side,
} from "@/lib/mathTools";
import { DEFAULT_WIDGETS, cleanWidgets } from "@/lib/boardTools";
import { seeded } from "@/lib/lab/bench/run";

const shape = (...pts: Pt[]): Band => ({ pts, closed: true });

describe("geoboard", () => {
  it("a band goes round pegs as they're tapped, and closes on the first peg", () => {
    let b: Band = { pts: [], closed: false };
    for (const p of [[0, 0], [3, 0], [3, 2]] as Pt[]) b = tapPeg(b, p);
    expect(b).toEqual({ pts: [[0, 0], [3, 0], [3, 2]], closed: false });
    expect(tapPeg(b, [3, 0])).toEqual(b);                       // each peg once
    expect(tapPeg(b, [3, 2]).pts).toHaveLength(2);              // tap the last peg: it comes off
    b = tapPeg(b, [0, 0]);
    expect(b.closed).toBe(true);
    expect(tapPeg(b, [1, 1])).toEqual(b);                       // a closed band stays as it is
    expect(tapPeg({ pts: [[0, 0], [1, 0]], closed: false }, [0, 0]).closed).toBe(false); // two pegs don't make a shape
  });
  it("finds area and perimeter", () => {
    const rect = shape([0, 0], [4, 0], [4, 3], [0, 3]);
    expect(area(rect)).toBe(12);
    expect(perimeter(rect)).toEqual({ value: 14, exact: "14" });
    const tri = shape([0, 0], [3, 0], [0, 4]);
    expect(area(tri)).toBe(6);
    expect(perimeter(tri)).toEqual({ value: 12, exact: "12" }); // 3, 4, 5
    const slanted = shape([0, 0], [2, 0], [2, 2]);              // sides 2, 2, 2√2
    expect(area(slanted)).toBe(2);
    expect(perimeter(slanted).exact).toBe("4 + 2√2");
    expect(perimeter(slanted).value).toBeCloseTo(6.828, 3);
    expect(perimeter(shape([1, 0], [3, 1], [2, 3], [0, 2])).exact).toBe("4√5"); // a tilted square
    expect(area(shape([1, 0], [3, 1], [2, 3], [0, 2]))).toBe(5);
    expect(area({ pts: [[0, 0], [3, 0], [0, 4]], closed: false })).toBe(0); // not a shape until it's closed
    expect(simplifyRoot(8)).toEqual([2, 2]);
    expect(simplifyRoot(9)).toEqual([3, 1]);
    expect(simplifyRoot(5)).toEqual([1, 5]);
  });
  it("measures the angle at every corner, whichever way round the band goes", () => {
    const sq: Pt[] = [[0, 0], [2, 0], [2, 2], [0, 2]];
    expect(interiorAngles(shape(...sq))).toEqual([90, 90, 90, 90]);
    expect(interiorAngles(shape(...[...sq].reverse()))).toEqual([90, 90, 90, 90]);
    expect(interiorAngles(shape([0, 0], [2, 0], [2, 2]))).toEqual([45, 90, 45]);
    const L = shape([0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]);
    expect(interiorAngles(L)).toEqual([90, 90, 90, 270, 90, 90]); // the inside corner is a reflex angle
    expect(interiorAngles(L).reduce((a, b) => a + b, 0)).toBe(720); // (6 − 2) × 180
    expect(interiorAngles(shape([0, 0], [1, 0], [2, 0], [2, 2], [0, 2]))[1]).toBe(180); // a peg on a straight side
  });
  it("names the shape", () => {
    expect(shapeName(shape([0, 0], [2, 0], [2, 2], [0, 2]))).toBe("square");
    expect(shapeName(shape([1, 0], [3, 1], [2, 3], [0, 2]))).toBe("square");
    expect(shapeName(shape([0, 0], [4, 0], [4, 2], [0, 2]))).toBe("rectangle");
    expect(shapeName(shape([1, 0], [4, 0], [3, 2], [0, 2]))).toBe("parallelogram");
    expect(shapeName(shape([2, 0], [4, 1], [2, 2], [0, 1]))).toBe("rhombus");
    expect(shapeName(shape([1, 0], [3, 0], [4, 2], [0, 2]))).toBe("trapezium");
    expect(shapeName(shape([2, 0], [3, 1], [2, 4], [1, 1]))).toBe("kite");
    expect(shapeName(shape([0, 0], [3, 0], [0, 4]))).toBe("right-angled scalene triangle");
    expect(shapeName(shape([0, 0], [2, 0], [2, 2]))).toBe("right-angled isosceles triangle");
    expect(shapeName(shape([0, 2], [4, 2], [2, 0]))).toBe("right-angled isosceles triangle");
    expect(shapeName(shape([0, 3], [4, 3], [2, 0]))).toBe("isosceles triangle");
    expect(shapeName(shape([0, 0], [1, 0], [2, 0], [2, 2], [0, 2]))).toBe("square"); // the straight-through peg isn't a corner
    expect(shapeName(shape([0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]))).toBe("hexagon");
    expect(shapeName(shape([0, 0], [2, 2], [2, 0], [0, 2]))).toBe("crossed band");
    expect(shapeName({ pts: [[0, 0], [2, 0]], closed: false })).toBe("line");
  });
  it("knows a band that crosses itself", () => {
    expect(crossesItself(shape([0, 0], [2, 2], [2, 0], [0, 2]))).toBe(true);
    expect(crossesItself(shape([0, 0], [2, 0], [2, 2], [0, 2]))).toBe(false);
  });
  it("reflects in a mirror line and spots symmetry", () => {
    expect(reflectPt([1, 2], "v", 7)).toEqual([5, 2]);
    expect(reflectPt([1, 2], "h", 7)).toEqual([1, 4]);
    expect(reflectPt([1, 2], "d", 7)).toEqual([2, 1]);
    const centred = shape([2, 2], [4, 2], [4, 4], [2, 4]);         // a square in the middle of a 7 × 7 board
    for (const m of ["v", "h", "d"] as const) expect(symmetricIn(centred, m, 7), m).toBe(true);
    const tri = shape([2, 4], [4, 4], [3, 1]);                      // isosceles, upright
    expect(symmetricIn(tri, "v", 7)).toBe(true);
    expect(symmetricIn(tri, "h", 7)).toBe(false);
    expect(symmetricIn(shape([0, 0], [2, 0], [2, 2], [0, 2]), "v", 7)).toBe(false); // off to one side
  });
  it("cleans what arrives", () => {
    const g = cleanGeo({ on: 1, n: 6, bands: [{ pts: [[99, -4], [1, 1], "junk", [2, 2]], closed: true }], active: 9, mirror: "zz" });
    expect(g.n).toBe(7);
    expect(g.bands).toEqual([{ pts: [[6, 0], [1, 1], [2, 2]], closed: true }]);
    expect(g.active).toBe(0);
    expect(g.mirror).toBe("none");
    expect(cleanGeo(null).bands).toEqual([{ pts: [], closed: false }]);
  });
});

describe("equation balance", () => {
  const L: Side = [2, 3], R: Side = [0, 11]; // 2x + 3 = 11, x = 4
  it("writes and solves the equation", () => {
    expect(equationText(L, R)).toBe("2x + 3 = 11");
    expect(equationText([1, 0], [0, 4])).toBe("x = 4");
    expect(equationText([3, 2], [1, 10])).toBe("3x + 2 = x + 10");
    expect(solve(L, R)).toBe(4);
    expect(solve([3, 2], [1, 10])).toBe(4);
    expect(solve([2, 0], [0, 7])).toBeNull(); // 3.5: not a whole number
    expect(solve([2, 1], [2, 5])).toBeNull(); // no answer
  });
  it("stays level when the same is done to both sides, all the way to x = 4", () => {
    const take3 = { kind: "take", what: "1", n: 3 } as const, half = { kind: "divide", n: 2 } as const;
    let l = doOp(L, take3), r = doOp(R, take3);
    expect(equationText(l, r)).toBe("2x = 8");
    expect(tilt(l, r, 4)).toBe("level");
    expect(solved(l, r, 4)).toBe(false);
    expect(canDo(l, half) && canDo(r, half)).toBe(true);
    l = doOp(l, half); r = doOp(r, half);
    expect(equationText(l, r)).toBe("x = 4");
    expect(solved(l, r, 4)).toBe(true);
    expect(opText(take3, "both")).toBe("Take 3 from both sides");
    expect(opText(half, "both")).toBe("Divide both sides by 2");
    expect(opText({ kind: "add", what: "x", n: 1 }, "left")).toBe("Add x to the left side only");
  });
  it("tips when only one side is changed", () => {
    expect(tilt(doOp(L, { kind: "take", what: "1", n: 3 }), R, 4)).toBe("right"); // the right is now heavier
    expect(tilt(doOp(L, { kind: "add", what: "x", n: 1 }), R, 4)).toBe("left");
    expect(solved([1, 0], [0, 5], 4)).toBe(false); // "x = 5" on a tipped scale isn't the answer
  });
  it("won't take what isn't there or divide what doesn't share out", () => {
    expect(canDo([2, 3], { kind: "take", what: "1", n: 4 })).toBe(false);
    expect(canDo([0, 3], { kind: "take", what: "x", n: 1 })).toBe(false);
    expect(canDo([2, 3], { kind: "divide", n: 2 })).toBe(false);
    expect(canDo([2, 8], { kind: "divide", n: 2 })).toBe(true);
    expect(canDo([8, 0], { kind: "add", what: "x", n: 1 })).toBe(false); // the pan is full
  });
  it("makes equations with whole-number answers at each level", () => {
    for (const level of [1, 2, 3] as const) for (let seed = 1; seed <= 60; seed++) {
      const e = newEquation(level, seeded(seed));
      expect(solve(e.left, e.right), `${level}: ${equationText(e.left, e.right)}`).toBe(e.ans);
      if (level === 3) expect(e.right[0]).toBeGreaterThan(0);
      if (level === 2) expect(e.left[0] > 1 && e.left[1] > 0 && e.right[0] === 0).toBe(true);
    }
  });
  it("takes the answer from the starting equation, not from the message", () => {
    const b = cleanBalance({ on: true, ans: 99, start: [[3, 2], [1, 10]], left: [3, 2], right: [1, 10], log: ["x".repeat(200)], where: "left" });
    expect(b.ans).toBe(4);
    expect(b.log[0]).toHaveLength(70);
    expect(b.where).toBe("left");
    expect(cleanBalance({ on: true, start: [[2, 0], [0, 7]] }).start).toEqual([[2, 3], [0, 11]]); // no whole-number answer: back to the default
  });
});

describe("chart maker", () => {
  it("works out mean, median, mode and range", () => {
    const s = stats([3, 7, 7, 2, 9])!;
    expect(s).toMatchObject({ n: 5, sum: 28, mean: 5.6, median: 7, modes: [7], min: 2, max: 9, range: 7 });
    expect(stats([4, 1, 3, 2])!.median).toBe(2.5);             // an even count: halfway between the middle two
    expect(modeText(stats([1, 2, 3])!)).toBe("no mode");
    expect(modeText(stats([1, 1, 2, 2])!)).toBe("no mode");    // all come up equally often
    expect(modeText(stats([1, 1, 2, 2, 3])!)).toBe("1 and 2");
    expect(modeText(stats([5, 5, 5])!)).toBe("5");
    expect(stats([])).toBeNull();
  });
  it("treats a table of numbers as a frequency table", () => {
    const rows = [{ label: "1", value: 2 }, { label: "2", value: 5 }, { label: "3", value: 3 }];
    expect(isFrequencyTable(rows)).toBe(true);
    expect(expand(rows)).toEqual([1, 1, 2, 2, 2, 2, 2, 3, 3, 3]);
    const r = chartStats({ kind: "bar", rows, list: [] })!;
    expect(r.of).toBe("frequency");
    expect(r.s).toMatchObject({ n: 10, mean: 2.1, median: 2, modes: [2], range: 2 });
    const words = [{ label: "Mango", value: 8 }, { label: "Orange", value: 5 }];
    expect(isFrequencyTable(words)).toBe(false);
    expect(chartStats({ kind: "pie", rows: words, list: [] })!).toMatchObject({ of: "values", s: { mean: 6.5, range: 3 } });
    expect(chartStats({ kind: "hist", rows: words, list: [10, 20, 30] })!).toMatchObject({ of: "list", s: { mean: 20 } });
  });
  it("puts a list into equal classes", () => {
    expect(bins([12, 15, 15, 18, 21, 22, 22, 22, 25, 27, 31, 34], 5)).toEqual([
      { lo: 10, hi: 15, f: 1 }, { lo: 15, hi: 20, f: 3 }, { lo: 20, hi: 25, f: 4 }, { lo: 25, hi: 30, f: 2 }, { lo: 30, hi: 35, f: 2 }]);
    expect(bins([1, 1000], 1).length).toBeLessThanOrEqual(20); // classes widen rather than run off the chart
    expect(bins([], 5)).toEqual([]);
    expect(bins([5], 5)).toEqual([{ lo: 5, hi: 10, f: 1 }]);
  });
  it("shares a pie out by percentage and angle", () => {
    const s = sectors([{ label: "A", value: 1 }, { label: "B", value: 3 }, { label: "C", value: 0 }]);
    expect(s.map((x) => [x.label, x.pct, x.angle, x.from])).toEqual([["A", 25, 90, 0], ["B", 75, 270, 90]]);
  });
  it("draws a tidy axis", () => {
    expect(axis(8)).toMatchObject({ lo: 0, hi: 8, step: 2 });
    expect(axis(47).ticks).toEqual([0, 10, 20, 30, 40, 50]);
    expect(axis(0.9).hi).toBe(1);
  });
  it("reads a typed list, and cleans what arrives", () => {
    expect(parseList("12, 15  15;18\n21")).toEqual([12, 15, 15, 18, 21]);
    expect(parseList("")).toEqual([]);
    expect(parseList("3, abc, 4.567")).toEqual([3, 4.57]);
    const c = cleanChart({ kind: "donut", title: "t".repeat(90), rows: Array.from({ length: 30 }, () => ({ label: "x".repeat(40), value: -5 })), list: ["7", "no", 1e9], width: 0 });
    expect(c.kind).toBe("bar");
    expect(c.title).toHaveLength(40);
    expect(c.rows).toHaveLength(10);
    expect(c.rows[0]).toEqual({ label: "x".repeat(16), value: 0 });
    expect(c.list).toEqual([7]);
    expect(c.width).toBe(0.1);
  });
});

describe("on the board", () => {
  it("the three tools are part of the board's state and survive cleaning", () => {
    const w = cleanWidgets({ ...DEFAULT_WIDGETS, geoboard: { ...DEFAULT_WIDGETS.geoboard, on: true }, chart: { ...DEFAULT_WIDGETS.chart, kind: "pie" } });
    expect(w.geoboard.on).toBe(true);
    expect(w.chart.kind).toBe("pie");
    expect(w.balance).toEqual(DEFAULT_WIDGETS.balance);
    expect(cleanWidgets({}).balance.ans).toBe(4);
  });
});
