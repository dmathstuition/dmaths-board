import { describe, it, expect } from "vitest";
import {
  question, withOptions, statement, matchBoard, bondsBoard, pointsFor, int, BOND_TARGET,
  DIFFICULTIES, type Skill,
} from "@/lib/games/generators";
import { CLASS_GAMES, findGame } from "@/lib/games/catalog";

// Deterministic rng so failures are reproducible.
function seeded(seed = 7) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

// Evaluate a prompt like "(3 + 4) × 2 − 5" with normal precedence.
function evaluate(prompt: string): number {
  const js = prompt.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  expect(js).toMatch(/^[\d\s+\-*/()]+$/);
  // eslint-disable-next-line no-new-func
  return Function(`return (${js});`)();
}

const SKILLS: Skill[] = ["addition", "subtraction", "multiplication", "division", "bodmas", "mixed"];

describe("question generators", () => {
  it("every answer equals its prompt and is a whole, non-negative number", () => {
    const rng = seeded();
    for (const skill of SKILLS) {
      for (const d of DIFFICULTIES) {
        for (let i = 0; i < 300; i++) {
          const q = question(skill, d, rng);
          expect(Number.isInteger(q.answer)).toBe(true);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(evaluate(q.prompt)).toBe(q.answer);
        }
      }
    }
  });

  it("missing-number puzzles are solved by the answer", () => {
    const rng = seeded(3);
    for (const d of DIFFICULTIES) {
      for (let i = 0; i < 300; i++) {
        const q = question("missing", d, rng);
        const [lhs, rhs] = q.prompt.split(" = ");
        expect(evaluate(lhs.replace("?", String(q.answer)))).toBe(Number(rhs));
      }
    }
  });

  it("division is always exact", () => {
    const rng = seeded(11);
    for (let i = 0; i < 300; i++) {
      const q = question("division", "hard", rng);
      const [a, b] = q.prompt.split(" ÷ ").map(Number);
      expect(a % b).toBe(0);
    }
  });

  it("easy mixed sticks to + and −", () => {
    const rng = seeded(5);
    for (let i = 0; i < 200; i++) expect(question("mixed", "easy", rng).prompt).toMatch(/^\d+ [+−] \d+$/);
  });

  it("difficulty scales the numbers", () => {
    const rng = seeded(9);
    const biggest = (d: "easy" | "hard") => Math.max(...Array.from({ length: 200 }, () => question("addition", d, rng).answer));
    expect(biggest("easy")).toBeLessThanOrEqual(20);
    expect(biggest("hard")).toBeGreaterThan(200);
  });

  it("int stays within bounds even when rng returns ~1", () => {
    expect(int(() => 0.9999999, 1, 10)).toBeLessThanOrEqual(10);
    expect(int(() => 0, 1, 10)).toBe(1);
  });
});

describe("game boards", () => {
  it("balloon options contain the answer once, four distinct non-negative values", () => {
    const rng = seeded(2);
    for (let i = 0; i < 300; i++) {
      const { question: q, options } = withOptions(question("mixed", "medium", rng), rng);
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      expect(options.filter((o) => o === q.answer)).toHaveLength(1);
      options.forEach((o) => expect(o).toBeGreaterThanOrEqual(0));
    }
  });

  it("true/false statements are labelled correctly", () => {
    const rng = seeded(4);
    for (let i = 0; i < 300; i++) {
      const s = statement("medium", rng);
      const [lhs, rhs] = s.text.split(" = ");
      expect(evaluate(lhs) === Number(rhs)).toBe(s.isTrue);
    }
  });

  it("memory match pairs a fact with its own answer", () => {
    for (const d of DIFFICULTIES) {
      const cards = matchBoard(d, seeded(6));
      expect(cards).toHaveLength(d === "hard" ? 16 : 12);
      const byPair = new Map<number, typeof cards>();
      cards.forEach((c) => byPair.set(c.pair, [...(byPair.get(c.pair) ?? []), c]));
      for (const [, pair] of byPair) {
        const q = pair.find((c) => c.side === "q")!, a = pair.find((c) => c.side === "a")!;
        expect(evaluate(q.text)).toBe(Number(a.text));
      }
      // answers are unique, so no ambiguous matches
      const answers = cards.filter((c) => c.side === "a").map((c) => c.text);
      expect(new Set(answers).size).toBe(answers.length);
    }
  });

  it("number bonds always pair up to the target", () => {
    for (const d of DIFFICULTIES) {
      const nums = bondsBoard(d, seeded(8));
      expect(nums).toHaveLength(12);
      const target = BOND_TARGET[d];
      const pool = [...nums];
      while (pool.length) {
        const a = pool.shift()!;
        const j = pool.indexOf(target - a);
        expect(j).toBeGreaterThanOrEqual(0);
        pool.splice(j, 1);
      }
    }
  });

  it("combo points grow with the streak and cap out", () => {
    expect(pointsFor(0)).toBe(10);
    expect(pointsFor(3)).toBe(16);
    expect(pointsFor(50)).toBe(30);
  });
});

describe("class games catalog", () => {
  it("has unique ids and valid engine kinds", () => {
    const ids = CLASS_GAMES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of CLASS_GAMES) {
      expect(["quiz", "balloon", "match", "truefalse", "bonds", "choice", "letters"]).toContain(g.kind);
      expect(g.seconds).toBeGreaterThan(0);
    }
    expect(findGame("times-blitz")?.skill).toBe("multiplication");
  });

  it("covers multiplication, addition, subtraction and division", () => {
    const skills = new Set(CLASS_GAMES.map((g) => g.skill));
    for (const s of ["multiplication", "addition", "subtraction", "division"]) expect(skills.has(s as Skill)).toBe(true);
  });
});
