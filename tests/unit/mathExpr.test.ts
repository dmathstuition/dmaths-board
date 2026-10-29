import { describe, it, expect } from "vitest";
import { compile, evaluate, samplePlot, tickStep, fmtNumber } from "@/lib/mathExpr";

const at = (s: string, x: number, deg = false) => compile(s, deg)(x);

describe("maths expressions", () => {
  it("follows the order of operations", () => {
    expect(at("2 + 3 * 4", 0)).toBe(14);
    expect(at("(2 + 3) * 4", 0)).toBe(20);
    expect(at("2^3^2", 0)).toBe(512);
    expect(at("-3^2", 0)).toBe(-9);
    expect(at("10 / 4", 0)).toBe(2.5);
    expect(at("7 − 2 × 3 ÷ 2", 0)).toBe(4);
  });
  it("understands x, implicit multiplication and functions", () => {
    expect(at("2x + 1", 3)).toBe(7);
    expect(at("x^2 - 4x + 3", 1)).toBe(0);
    expect(at("3(x+1)", 2)).toBe(9);
    expect(at("(x+1)(x-1)", 3)).toBe(8);
    expect(at("2sin(x)", Math.PI / 2)).toBeCloseTo(2);
    expect(at("sin x", Math.PI / 2)).toBeCloseTo(1);
    expect(at("√16 + 3²", 0)).toBe(13);
    expect(at("2π", 0)).toBeCloseTo(2 * Math.PI);
    expect(at("e^x", 1)).toBeCloseTo(Math.E);
    expect(at("abs(x)", -4)).toBe(4);
    expect(at("log(1000) + ln(e)", 0)).toBeCloseTo(4);
  });
  it("does degrees for the calculator", () => {
    expect(at("sin(30)", 0, true)).toBeCloseTo(0.5);
    expect(at("tan(45)", 0, true)).toBeCloseTo(1);
    expect(at("asin(0.5)", 0, true)).toBeCloseTo(30);
  });
  it("explains mistakes instead of crashing", () => {
    expect(evaluate("2 +")).toMatchObject({ ok: false });
    expect(evaluate("(2 + 3")).toMatchObject({ ok: false, error: "Missing )" });
    expect(evaluate("alert(1)")).toMatchObject({ ok: false });
    expect(evaluate("sqrt(-1)")).toMatchObject({ ok: false, error: "Not a real number" });
    expect(evaluate("1/0")).toMatchObject({ ok: false });
    expect(evaluate("2+2")).toEqual({ ok: true, value: 4 });
  });
  it("breaks plots at asymptotes", () => {
    const lines = samplePlot(compile("1/x"), -5, 5, -5, 5);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines.every((l) => l.every(([x]) => x < 0) || l.every(([x]) => x > 0))).toBe(true);
    expect(samplePlot(compile("x^2"), -3, 3, -1, 9).length).toBe(1);
  });
  it("picks nice ticks and formats numbers", () => {
    expect(tickStep(20)).toBe(2);
    expect(tickStep(100)).toBe(10);
    expect(tickStep(1)).toBeCloseTo(0.1);
    expect(fmtNumber(0.1 + 0.2)).toBe("0.3");
    expect(fmtNumber(1 / 3)).toBe("0.3333333333");
  });
});
