import { describe, expect, it } from "vitest";
import { moreChoice, moreNumeric, frac, MORE_CHOICE, MORE_NUMERIC, type MoreChoiceSkill, type MoreNumericSkill } from "@/lib/games/moreMaths";
import { question, statement, withOptions, DIFFICULTIES } from "@/lib/games/generators";
import { CLASS_GAMES } from "@/lib/games/catalog";

function seeded(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const nums = (s: string) => (s.replace(/−/g, "-").match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe("more maths games", () => {
  it("typed answers are always whole numbers 0 or more (the keypad has digits only)", () => {
    for (const skill of MORE_NUMERIC as MoreNumericSkill[]) for (const d of DIFFICULTIES) {
      const rng = seeded(7);
      for (let i = 0; i < 400; i++) {
        const q = moreNumeric(skill, d, rng);
        expect(Number.isInteger(q.answer) && q.answer >= 0, `${skill} ${d}: ${q.prompt} → ${q.answer}`).toBe(true);
        expect(q.prompt.length).toBeGreaterThan(0);
      }
    }
  });

  it("choice questions have four different options, one of them right", () => {
    for (const skill of MORE_CHOICE as MoreChoiceSkill[]) for (const d of DIFFICULTIES) {
      const rng = seeded(11);
      for (let i = 0; i < 400; i++) {
        const q = moreChoice(skill, d, rng);
        expect(new Set(q.options).size, `${skill} ${d}: ${q.prompt}`).toBe(4);
        expect(q.options).toContain(q.answer);
        expect(q.options.join()).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it("works the answers out correctly", () => {
    const rng = seeded(3);
    for (let i = 0; i < 300; i++) {
      // Triangle angles add to 180.
      const t = moreNumeric("angles", "medium", rng);
      if (t.prompt.startsWith("A triangle")) { const [a, b] = nums(t.prompt); expect(a + b + t.answer).toBe(180); }
      else { const [a, b, c] = nums(t.prompt); expect(a + b + c + t.answer).toBe(360); expect(t.answer).toBeGreaterThanOrEqual(20); }
      // The mean of the list.
      const m = moreNumeric("averages", "easy", rng), xs = nums(m.prompt);
      expect(xs.reduce((s, x) => s + x, 0) / xs.length).toBe(m.answer);
      expect(Math.min(...xs)).toBeGreaterThan(0);
      // f(x) = ax + b.
      const f = moreNumeric("functions", "easy", rng), [a, b] = nums(f.prompt), [x] = nums(f.ask!);
      expect(a * x + b).toBe(f.answer);
      // Ratio shares add back to the total.
      const r = moreNumeric("ratio", "easy", rng), [total, p, q] = nums(r.prompt);
      expect([p, q].map((k) => (k * total) / (p + q))).toContain(r.answer);
    }
    expect(moreNumeric("angles", "hard", () => 0.2).answer).toBe(120); // a regular hexagon's interior angle
  });

  it("rounds without floating-point slips", () => {
    const rng = seeded(5);
    for (let i = 0; i < 300; i++) {
      const q = moreChoice("rounding", "medium", rng);
      const dp = q.lead.includes("1 decimal") ? 1 : 2;
      const thousandths = Math.round(Number(q.prompt) * 1000);
      expect(q.answer).toBe((Math.round(thousandths / 10 ** (3 - dp)) / 10 ** dp).toFixed(dp));
    }
  });

  it("finds where two lines meet", () => {
    const rng = seeded(9);
    for (let i = 0; i < 300; i++) {
      const q = moreChoice("lines", "hard", rng);
      if (q.lead !== "Where the lines meet") continue;
      const [x, y] = nums(q.answer);
      for (const eq of q.prompt.split(" and ")) {
        const v = eq.replace("y = ", "").replace(/−/g, "-").replace(/ /g, "").replace(/(^|[+-])x/g, "$11x").replace(/(\d)x/g, "$1*x");
        expect(Function("x", `return ${v}`)(x)).toBe(y);
      }
    }
  });

  it("writes fractions in their simplest form", () => {
    expect(frac(6, 8)).toBe("3/4");
    expect(frac(4, 2)).toBe("2");
    expect(frac(1, -2)).toBe("−1/2");
  });

  it("every new game is in the catalog and plays", () => {
    const ids = ["rounding-rodeo", "square-sense", "power-pop", "area-architect", "angle-ace", "ratio-rumble", "average-arena", "probability-pick",
      "function-machine", "line-lab", "inequality-ice", "circle-circuit", "surd-smash", "integration-island",
      "place-value-palace", "market-day", "tick-tock", "prime-time", "factor-frenzy", "fdp-flip", "below-zero", "speed-trap", "interest-investor",
      "venn-victory", "pythagoras-pursuit", "base-jumper", "clock-arithmetic", "bearing-bound", "vector-velocity", "matrix-maze", "count-the-ways"];
    for (const id of ids) {
      const g = CLASS_GAMES.find((x) => x.id === id)!;
      expect(g, id).toBeTruthy();
      const rng = seeded(1);
      if (g.kind === "quiz") expect(Number.isInteger(question(g.skill, "hard", rng).answer)).toBe(true);
      if (g.kind === "balloon") expect(withOptions(question(g.skill, "medium", rng), rng).options).toHaveLength(4);
      if (g.kind === "truefalse" && g.skill === "primes") {
        for (let i = 0; i < 50; i++) { const p = statement("hard", rng, "primes"), n = Number(p.text.split(" ")[0]); expect(p.isTrue).toBe(n > 1 && [...Array(n).keys()].slice(2).every((k) => n % k)); }
      } else if (g.kind === "truefalse") {
        const s = statement("easy", rng, g.skill);
        const [l, r] = s.text.split(" = ");
        const [base, pow] = l.includes("√") ? [Math.sqrt(Number(l.slice(1))), 1] : [Number(l.slice(0, -1)), l.endsWith("²") ? 2 : 3];
        expect(base ** pow === Number(r)).toBe(s.isTrue);
      }
    }
    expect(new Set(CLASS_GAMES.map((g) => g.id)).size).toBe(CLASS_GAMES.length);
  });

  it("second batch: the answers are right", () => {
    const rng = seeded(21);
    for (let i = 0; i < 300; i++) {
      const pv = moreNumeric("placeValue", "easy", rng), [digit] = nums(pv.prompt);
      expect(String(pv.answer).startsWith(String(digit))).toBe(true);
      const b = moreNumeric("bases", "medium", rng), base = Number(b.prompt.split("base ")[1]);
      expect(parseInt(b.prompt.split(" ")[0], base)).toBe(b.answer);
      const h = moreNumeric("bases", "hard", rng), hb = Number(h.ask!.match(/base (\d+)/)![1]);
      expect(parseInt(String(h.answer), hb)).toBe(nums(h.prompt)[0]);
      const p = moreNumeric("pythagoras", "medium", rng), [hyp, side] = nums(p.prompt);
      expect(side ** 2 + p.answer ** 2).toBe(hyp ** 2);
      const m = moreNumeric("modular", "hard", rng), [a, c, mod] = nums(m.prompt);
      expect((a * m.answer) % mod).toBe(c);
      const v = moreNumeric("vectors", "hard", rng), [ax, ay, bx, by] = nums(v.prompt);
      expect(Math.hypot(2 * ax - bx, 2 * ay - by)).toBe(v.answer);
      const st = moreNumeric("sets", "hard", rng), [U, A, B, neither] = nums(st.prompt);
      expect(A + B - st.answer + neither).toBe(U);
      const br = moreNumeric("bearings", "hard", rng);
      expect((nums(br.prompt)[0] + 180) % 360).toBe(br.answer);
      const t = moreChoice("matrices", "medium", rng), [w, x, y, z] = nums(t.prompt);
      expect(Number(t.answer.replace("−", "-"))).toBe(w * z - x * y + 0); // + 0: no −0
    }
    expect(moreNumeric("counting", "hard", () => 0.99).answer).toBe(180); // COFFEE: 6! ÷ (2! 2!)
  });
});
