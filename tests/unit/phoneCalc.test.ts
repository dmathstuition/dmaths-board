import { describe, expect, it } from "vitest";
import { NEW_CALC, press, preview, type CalcState } from "@/lib/phoneCalc";
import { cleanRound } from "@/lib/answerBoards";

const keys = (ks: string[], s: CalcState = NEW_CALC) => ks.reduce(press, s);

describe("the learner's calculator", () => {
  it("does the sums from the lesson (degrees)", () => {
    expect(keys(["6", "×", "sin", "6", "0", ")", "="]).result).toBe("5.1961524227");       // the ladder: 5.20 m
    expect(keys(["8", "0", "÷", "tan", "2", "5", ")", "="]).result).toMatch(/^171\.56/);    // the cliff: 171.6 m
    expect(keys(["√", "3", "6", "9", ")", "="]).result).toMatch(/^19\.209/);                // PR = 19.2 km
  });

  it("SHIFT gives the inverse functions, once", () => {
    const s = keys(["SHIFT", "tan", "7", "÷", "9", ")", "="]);
    expect(s.result).toMatch(/^37\.87/);                                                    // θ = 37.9°
    expect(s.shift).toBe(false);
    expect(keys(["SHIFT", "SHIFT", "sin"]).expr).toBe("sin(");
  });

  it("carries on from the answer with an operator, and starts afresh with a number", () => {
    const a = keys(["2", "+", "3", "="]);
    expect(a.ans).toBe("5");
    expect(press(a, "×").expr).toBe("Ans×");
    expect(keys(["×", "2", "="], a).result).toBe("10");
    expect(press(a, "7").expr).toBe("7");
    expect(keys(["Ans", "x²", "="], a).result).toBe("25");
  });

  it("says when a sum can't be done, and keeps a short history", () => {
    expect(keys(["2", "+", "×", "="]).result).toBe("Syntax error");
    expect(keys(["1", "÷", "0", "="]).result).toBe("Math error");
    let s = NEW_CALC;
    for (let i = 1; i <= 7; i++) s = keys([String(i), "=", "AC"], s);
    expect(s.history.map((h) => h.result)).toEqual(["7", "6", "5", "4", "3"]);
  });

  it("shows the answer so far, and switches to radians", () => {
    expect(preview(keys(["1", "2", "+", "3"]))).toBe("15");
    expect(keys(["DEG", "cos", "π", ")", "="]).result).toBe("-1");
    expect(keys(["⌫"], keys(["1", "2"])).expr).toBe("1");
  });

  it("class work has the calculator on unless the teacher switches it off", () => {
    expect(cleanRound({ id: "r" })!.calc).toBe(true);
    expect(cleanRound({ id: "r", calc: false })!.calc).toBe(false);
  });
});
