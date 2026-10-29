import { describe, it, expect } from "vitest";
import {
  seniorQuestion, choiceQuestion, poolPairs, matchPool, identityStatement, poly, plainNumber, fracStr, gcd,
  type ChoiceSkill,
} from "@/lib/games/senior";
import { question, matchBoard, statement, DIFFICULTIES } from "@/lib/games/generators";
import { CLASS_GAMES, stageForLevel } from "@/lib/games/catalog";

function seeded(seed = 7) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}
const N = 300;
const num = (s: string) => Number(s.replace("−", "-"));
const fromSup = (s: string) => Number(s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => String("⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c) >= 0 ? "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c) : "-")));
const fromSub = (s: string) => Number(s.replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080)));

// Parse "3x² − 5x + 6" back into a function of x (only the formats `poly` emits).
function evalPoly(expr: string, x: number): number {
  const terms = expr.replace(/ − /g, " + -").replace(/^−/, "-").split(" + ");
  return terms.reduce((sum, t) => {
    const m = t.match(/^(-?)(\d*)(x?)([⁰¹²³⁴⁵⁶⁷⁸⁹]*)$/);
    expect(m, `term "${t}" in "${expr}"`).toBeTruthy();
    const [, sign, coef, hasX, pw] = m!;
    const k = (sign ? -1 : 1) * (coef ? Number(coef) : hasX ? 1 : 0);
    const p = hasX ? (pw ? fromSup(pw) : 1) : 0;
    return sum + k * x ** p;
  }, 0);
}

describe("poly formatting", () => {
  it("formats signs, unit coefficients and powers", () => {
    expect(poly([1, -5, 6])).toBe("x² − 5x + 6");
    expect(poly([-2, 0, 1, 0])).toBe("−2x³ + x");
    expect(poly([0, 0])).toBe("0");
    expect(evalPoly(poly([3, -4, 7]), 2)).toBe(3 * 4 - 8 + 7);
  });
  it("writes plain numbers for standard-form questions", () => {
    expect(plainNumber(45, 4)).toBe("45,000");
    expect(plainNumber(45, -4)).toBe("0.00045");
    expect(plainNumber(12, -1)).toBe("0.12");
    expect(plainNumber(30, 3)).toBe("3,000");
  });
  it("simplifies fractions", () => {
    expect(fracStr([6, 8])).toBe("3/4");
    expect(fracStr([10, 5])).toBe("2");
    expect(fracStr([-3, 9])).toBe("−1/3");
    expect(gcd(0, 7)).toBe(7);
  });
});

describe("senior numeric skills", () => {
  it("linear equations are solved by the answer", () => {
    const rng = seeded(1);
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = seniorQuestion("linear", d, rng);
      const [lhs, rhs] = q.prompt.split(" = ");
      const sub = (e: string) => e.replace(/(\d)x/g, "$1*x").replace(/\(/g, "*(").replace(/^\*/, "").replace(/(\d)\*\(/g, "$1*(")
        .replace(/x/g, `(${q.answer})`).replace(/−/g, "-");
      // eslint-disable-next-line no-new-func
      const v = (e: string) => Function(`return ${sub(e)}`)();
      expect(v(lhs)).toBe(v(rhs));
      expect(Number.isInteger(q.answer) && q.answer > 0).toBe(true);
    }
  });

  it("percentages are whole numbers and correct", () => {
    const rng = seeded(2);
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = seniorQuestion("percent", d, rng);
      expect(Number.isInteger(q.answer)).toBe(true);
      let m: RegExpMatchArray | null;
      if ((m = q.prompt.match(/^(\d+)% of (\d+)$/))) expect(q.answer).toBe((+m[1] * +m[2]) / 100);
      else if ((m = q.prompt.match(/^Increase (\d+) by (\d+)%$/))) expect(q.answer).toBeCloseTo(+m[1] * (1 + +m[2] / 100));
      else if ((m = q.prompt.match(/^Decrease (\d+) by (\d+)%$/))) expect(q.answer).toBeCloseTo(+m[1] * (1 - +m[2] / 100));
      else if ((m = q.prompt.match(/^(\d+)% of \? = (\d+)$/))) expect((+m[1] * q.answer) / 100).toBe(+m[2]);
      else throw new Error(`unexpected prompt ${q.prompt}`);
    }
  });

  it("sequence answers continue the pattern", () => {
    const rng = seeded(3);
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = seniorQuestion("sequences", d, rng);
      const t = q.prompt.split(", ").filter((x) => /^\d+$/.test(x)).map(Number);
      if (q.ask === "Next term?") {
        const d1 = t.slice(1).map((v, k) => v - t[k]);
        const d2 = d1.slice(1).map((v, k) => v - d1[k]);
        const ratio = t[1] / t[0];
        const next = d1.every((x) => x === d1[0]) ? t[3] + d1[0]
          : d2.every((x) => x === d2[0]) ? t[3] + d1[2] + d2[0] : t[3] * ratio;
        expect(q.answer).toBe(next);
      } else {
        const n = Number(q.ask!.match(/\d+/)![0]);
        expect(q.answer).toBe(t[0] + (n - 1) * (t[1] - t[0]));
      }
    }
  });

  it("logarithms evaluate correctly", () => {
    const rng = seeded(4);
    const log = (part: string) => { const [, b, x] = part.match(/^log([₀-₉]+) (\d+)$/)!; return Math.round(Math.log(+x) / Math.log(fromSub(b))); };
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = seniorQuestion("logs", d, rng);
      const v = q.prompt.includes(" + ") ? q.prompt.split(" + ").map(log).reduce((a, b) => a + b)
        : q.prompt.includes(" − ") ? log(q.prompt.split(" − ")[0]) - log(q.prompt.split(" − ")[1]) : log(q.prompt);
      expect(q.answer).toBe(v);
    }
  });

  it("the generic question() routes senior skills", () => {
    expect(question("linear", "easy", seeded(5)).ask).toBe("x = ?");
  });
});

describe("choice questions", () => {
  const SKILLS: ChoiceSkill[] = ["indices", "quadratics", "fractions", "standardForm", "simultaneous", "differentiation", "expand"];

  it("always offer four distinct options including the answer", () => {
    const rng = seeded(6);
    for (const s of SKILLS) for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = choiceQuestion(s, d, rng);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
    }
  });

  it("quadratic roots satisfy the equation, and distractors don't both", () => {
    const rng = seeded(7);
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = choiceQuestion("quadratics", d, rng);
      const expr = q.prompt.replace(" = 0", "");
      const roots = (o: string) => o.match(/−?\d+/g)!.map(num);
      roots(q.answer).forEach((r) => expect(evalPoly(expr, r)).toBe(0));
      q.options.filter((o) => o !== q.answer).forEach((o) => expect(roots(o).every((r) => evalPoly(expr, r) === 0)).toBe(false));
    }
  });

  it("simultaneous answers fit both equations; distractors don't", () => {
    const rng = seeded(8);
    const fits = (lines: string[], x: number, y: number) => lines.every((ln) => {
      const [lhs, rhs] = ln.split(" = ");
      const js = lhs.replace(/−/g, "-").replace(/(\d)([xy])/g, "$1*$2").replace(/x/g, `(${x})`).replace(/y/g, `(${y})`);
      // eslint-disable-next-line no-new-func
      return Function(`return ${js}`)() === num(rhs);
    });
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = choiceQuestion("simultaneous", d, rng);
      const lines = q.prompt.split("\n");
      const xy = (o: string) => o.match(/−?\d+/g)!.map(num) as [number, number];
      expect(fits(lines, ...xy(q.answer))).toBe(true);
      q.options.filter((o) => o !== q.answer).forEach((o) => expect(fits(lines, ...xy(o))).toBe(false));
    }
  });

  it("derivatives match a numerical derivative", () => {
    const rng = seeded(9);
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = choiceQuestion("differentiation", d, rng);
      const f = q.prompt.replace("y = ", "");
      const df = q.answer.replace("dy/dx = ", "");
      for (const x of [1, 2, 3]) {
        const numeric = (evalPoly(f, x + 1e-4) - evalPoly(f, x - 1e-4)) / 2e-4;
        expect(evalPoly(df, x)).toBeCloseTo(numeric, 2);
      }
    }
  });

  it("expansions and factorisations are equivalent to the prompt", () => {
    const rng = seeded(10);
    const evalBrackets = (e: string, x: number) => {
      const js = e.replace(/−/g, "-").replace(/(\d)\(/g, "$1*(").replace(/\)\(/g, ")*(").replace(/x/g, `(${x})`);
      // eslint-disable-next-line no-new-func
      return Function(`return ${js}`)();
    };
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = choiceQuestion("expand", d, rng);
      const [bracketed, expanded] = q.lead === "Factorise" ? [q.answer, q.prompt] : [q.prompt, q.answer];
      for (const x of [-2, 1, 3]) expect(evalBrackets(bracketed, x)).toBeCloseTo(evalPoly(expanded, x), 9);
      for (const o of q.options.filter((o) => o !== q.answer)) {
        const same = [-2, 1, 3, 5].every((x) => q.lead === "Factorise" ? evalBrackets(o, x) === evalPoly(expanded, x) : evalPoly(o, x) === evalBrackets(bracketed, x));
        expect(same).toBe(false);
      }
    }
  });

  it("index answers follow the laws of indices", () => {
    const rng = seeded(11);
    for (const d of ["easy", "medium"] as const) for (let i = 0; i < N; i++) {
      const q = choiceQuestion("indices", d, rng);
      const pw = (t: string) => { const m = t.match(/^[a-z]([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]*)$/); return m ? (m[1] ? fromSup(m[1]) : 1) : NaN; };
      let m: RegExpMatchArray | null;
      if ((m = q.prompt.match(/^(\S+) × (\S+)$/))) expect(pw(q.answer)).toBe(pw(m[1]) + pw(m[2]));
      else if ((m = q.prompt.match(/^(\S+) ÷ (\S+)$/))) expect(pw(q.answer)).toBe(pw(m[1]) - pw(m[2]));
      else if ((m = q.prompt.match(/^\((\S+)\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/))) expect(pw(q.answer)).toBe(pw(m[1]) * fromSup(m[2]));
      else throw new Error(q.prompt);
    }
  });

  it("standard form answers equal the number", () => {
    const rng = seeded(12);
    const val = (sf: string) => { const [a, e] = sf.split(" × 10"); return Number(a) * 10 ** fromSup(e); };
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = choiceQuestion("standardForm", d, rng);
      const target = d === "hard"
        ? q.prompt.match(/\((\d) × 10(\S+)\) × \((\d) × 10(\S+)\)/)!.slice(1).reduce((acc, _, k, arr) => (k === 0 ? Number(arr[0]) * 10 ** fromSup(arr[1]) * Number(arr[2]) * 10 ** fromSup(arr[3]) : acc), 0)
        : Number(q.prompt.replace(/,/g, ""));
      expect(val(q.answer) / target).toBeCloseTo(1, 9);
      const mant = Number(q.answer.split(" × ")[0]);
      expect(mant >= 1 && mant < 10).toBe(true);
    }
  });

  it("fraction answers are simplified and correct", () => {
    const rng = seeded(13);
    const val = (f: string) => { const [n, dn = "1"] = f.split("/"); return num(n) / Number(dn); };
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = choiceQuestion("fractions", d, rng);
      const [a, op, b] = q.prompt.split(" ");
      const x = val(a), y = val(b);
      const expected = op === "+" ? x + y : op === "−" ? x - y : op === "×" ? x * y : x / y;
      expect(val(q.answer)).toBeCloseTo(expected, 9);
      const [n, dn] = q.answer.replace("−", "").split("/").map(Number);
      if (dn) expect(gcd(n, dn)).toBe(1);
      q.options.filter((o) => o !== q.answer).forEach((o) => expect(Math.abs(val(o) - expected)).toBeGreaterThan(1e-9));
    }
  });
});

describe("match pools and identities", () => {
  it("boards never repeat an answer and have the right size", () => {
    const rng = seeded(14);
    for (const skill of ["trig", "elements", "units"] as const) for (const d of DIFFICULTIES) for (let i = 0; i < 100; i++) {
      const pairs = d === "hard" ? 8 : 6;
      const board = matchBoard(d, rng, pairs, skill);
      expect(board).toHaveLength(pairs * 2);
      const answers = board.filter((c) => c.side === "a").map((c) => c.text);
      expect(new Set(answers).size).toBe(answers.length);
      // every pair comes from the pool
      for (let p = 0; p < pairs; p++) {
        const q = board.find((c) => c.pair === p && c.side === "q")!.text;
        const a = board.find((c) => c.pair === p && c.side === "a")!.text;
        expect(matchPool(skill, d).some(([x, y]) => x === q && y === a)).toBe(true);
      }
    }
    expect(poolPairs("trig", "easy", 6, rng)).toHaveLength(6);
  });

  it("trig exact values are right", () => {
    for (const [fact, value] of matchPool("trig", "hard")) {
      const [fn, deg] = fact.split(" ");
      const r = (parseInt(deg) * Math.PI) / 180;
      const actual = fn === "sin" ? Math.sin(r) : fn === "cos" ? Math.cos(r) : Math.tan(r);
      const v = value.replace("−", "-").replace(/√(\d)/g, "Math.sqrt($1)");
      // eslint-disable-next-line no-new-func
      expect(actual).toBeCloseTo(Function(`return ${v}`)(), 9);
    }
  });

  it("identity statements are true exactly when flagged", () => {
    const rng = seeded(15);
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const s = identityStatement(d, rng);
      const [lhs, rhs] = s.text.split(" = ");
      const ev = (e: string, x: number) => {
        const js = e.replace(/−/g, "-").replace(/×/g, "*")
          .replace(/x([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, p) => `x**${fromSup(p)}`)
          .replace(/\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, p) => `)**${fromSup(p)}`)
          .replace(/(\d)(x|\()/g, "$1*$2").replace(/\)\(/g, ")*(").replace(/x/g, `(${x})`);
        // eslint-disable-next-line no-new-func
        return Function(`return ${js}`)();
      };
      const same = [2, 3, 5].every((x) => Math.abs(ev(lhs, x) - ev(rhs, x)) < 1e-9);
      expect(same, s.text).toBe(s.isTrue);
    }
    expect(statement("easy", seeded(1), "identity").text).toMatch(/x/);
  });
});

describe("catalog", () => {
  it("has unique ids, a stage for every game, and plenty of senior games", () => {
    const ids = CLASS_GAMES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CLASS_GAMES.every((g) => ["primary", "junior", "senior"].includes(g.stage))).toBe(true);
    expect(CLASS_GAMES.filter((g) => g.stage === "senior").length).toBeGreaterThanOrEqual(10);
  });

  it("guesses the stage from class names", () => {
    expect(stageForLevel("Primary 5")).toBe("primary");
    expect(stageForLevel("JSS 2")).toBe("junior");
    expect(stageForLevel("SSS 3")).toBe("senior");
    expect(stageForLevel("Year 4")).toBe("primary");
    expect(stageForLevel("Year 8")).toBe("junior");
    expect(stageForLevel("Year 12")).toBe("senior");
    expect(stageForLevel("Grade 10")).toBe("senior");
    expect(stageForLevel("Post Secondary")).toBe("senior");
    expect(stageForLevel("Club")).toBeNull();
  });
});
