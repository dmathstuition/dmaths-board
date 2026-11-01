import { describe, it, expect } from "vitest";
import { parseRow, rowParams, roots, turning, keyPoints, valueTable } from "@/lib/graphing";
import { compile, paramsIn } from "@/lib/mathExpr";

const view = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const fn = (src: string, p: Record<string, number> = {}) => { const r = parseRow(src, p); if (r?.kind !== "fn") throw new Error(String((r as any)?.error)); return r.f; };

describe("graph rows", () => {
  it("reads functions with or without y =", () => {
    expect(fn("y = 2x + 1")(3)).toBe(7);
    expect(fn("x^2 - 4")(3)).toBe(5);
  });
  it("reads inequalities", () => {
    expect(parseRow("y > x^2")).toMatchObject({ kind: "fn", ineq: ">" });
    expect(parseRow("y ≤ 2x")).toMatchObject({ kind: "fn", ineq: "<=" });
  });
  it("reads vertical lines and points", () => {
    expect(parseRow("x = 3")).toEqual({ kind: "vline", x: 3 });
    expect(parseRow("(1, 2), (-3, 4.5)")).toEqual({ kind: "points", pts: [[1, 2], [-3, 4.5]] });
    expect(parseRow("(2a, a)", { a: 3 })).toEqual({ kind: "points", pts: [[6, 3]] });
  });
  it("uses sliders", () => {
    expect(rowParams("y = ax^2 + bx + c")).toEqual(["a", "b", "c"]);
    expect(rowParams("y = sin(x) + k")).toEqual(["k"]);
    expect(rowParams("y = 2x + 1")).toEqual([]);
    expect(fn("y = m x + c", { m: 2, c: -1 })(4)).toBe(7);
  });
  it("explains a mistake instead of breaking", () => {
    expect(parseRow("y = 2x + ")).toMatchObject({ kind: "error" });
    expect(parseRow("y = ax")).toMatchObject({ kind: "error" }); // a has no slider value yet
    expect(parseRow("")).toBeNull();
  });
  it("leaves the calculator strict", () => {
    expect(() => compile("2a")).toThrow();
    expect(paramsIn("sin(x) + cos(t)")).toEqual(["t"]);
  });
});

describe("key points", () => {
  it("finds the roots, y-intercept and turning point of a quadratic", () => {
    const k = keyPoints([fn("x^2 - 4")], view);
    expect(k.filter((p) => p.kind === "root").map((p) => p.x)).toEqual([-2, 2]);
    expect(k.filter((p) => p.x === 0 && p.y === -4)).toHaveLength(1); // the y-intercept is also the minimum: one label
    expect(keyPoints([fn("x^2 - 2x")], view).find((p) => p.kind === "min")).toMatchObject({ x: 1, y: -1 });
  });
  it("finds where two graphs meet", () => {
    const k = keyPoints([fn("x^2"), fn("x + 2")], view);
    expect(k.filter((p) => p.kind === "intersection").map((p) => [p.x, p.y])).toEqual([[-1, 1], [2, 4]]);
  });
  it("finds a cubic's maximum and minimum", () => {
    const t = turning(fn("x^3 - 3x"), -10, 10);
    expect(t.map((p) => [p.kind, Math.round(p.x * 1000) / 1000, Math.round(p.y * 1000) / 1000])).toEqual([["max", -1, 2], ["min", 1, -2]]);
  });
  it("doesn't mistake an asymptote for a root", () => {
    expect(roots(fn("1/x"), -10, 10, 20)).toEqual([]);
    expect(roots(fn("tan(x)"), -3, 3, 20).map((x) => Math.round(x * 1000) / 1000)).toEqual([0]);
  });
});

describe("table of values", () => {
  it("lists x and y around the middle of the view", () => {
    expect(valueTable(fn("2x + 1"), view)).toEqual([-3, -2, -1, 0, 1, 2, 3].map((x) => ({ x, y: 2 * x + 1 })));
    expect(valueTable(fn("sqrt(x)"), view)[0]).toEqual({ x: -3, y: null });
  });
});
