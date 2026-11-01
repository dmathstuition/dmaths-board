// Question generators for the class games. Pure (an rng can be injected) so
// every answer a learner is marked against can be unit-tested.

import {
  seniorQuestion, identityStatement, poolPairs,
  type SeniorNumericSkill, type ChoiceSkill, type MatchSkill,
} from "@/lib/games/senior";
import { moreNumeric, primeStatement, MORE_NUMERIC, type MoreNumericSkill, type MoreChoiceSkill } from "@/lib/games/moreMaths";
import {
  spellingStatement, englishPairs, ENGLISH_MATCH,
  type EnglishChoiceSkill, type EnglishMatchSkill, type TileSkill,
} from "@/lib/games/english";

export type Difficulty = "easy" | "medium" | "hard";
export type BasicSkill = "addition" | "subtraction" | "multiplication" | "division" | "missing" | "bodmas" | "mixed" | "primes";
export type Skill = BasicSkill | SeniorNumericSkill | ChoiceSkill | MatchSkill | "identity" | MoreNumericSkill | MoreChoiceSkill
  | EnglishChoiceSkill | EnglishMatchSkill | TileSkill;
export type Rng = () => number;
// `ask` is shown under the prompt when the prompt is itself an equation ("x = ?").
export type Question = { prompt: string; answer: number; ask?: string };

const SENIOR_NUMERIC: readonly string[] = ["linear", "percent", "sequences", "logs"];
export const isSeniorNumeric = (s: Skill): s is SeniorNumericSkill => SENIOR_NUMERIC.includes(s);

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export function int(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1)) % (hi - lo + 1);
}
function pick<T>(rng: Rng, xs: T[]): T {
  return xs[Math.min(xs.length - 1, Math.floor(rng() * xs.length))];
}
export function shuffle<T>(rng: Rng, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ADD: Record<Difficulty, [number, number]> = { easy: [1, 10], medium: [10, 99], hard: [100, 999] };
const MUL: Record<Difficulty, { a: [number, number]; b: [number, number] }> = {
  easy: { a: [1, 5], b: [1, 10] },
  medium: { a: [2, 12], b: [2, 12] },
  hard: { a: [6, 15], b: [6, 15] },
};

function addition(rng: Rng, d: Difficulty): Question {
  const [lo, hi] = ADD[d];
  const a = int(rng, lo, hi), b = int(rng, lo, hi);
  return { prompt: `${a} + ${b}`, answer: a + b };
}
function subtraction(rng: Rng, d: Difficulty): Question {
  const [lo, hi] = ADD[d];
  let a = int(rng, lo, hi), b = int(rng, lo, hi);
  if (b > a) [a, b] = [b, a];
  return { prompt: `${a} − ${b}`, answer: a - b };
}
function multiplication(rng: Rng, d: Difficulty): Question {
  const { a: ra, b: rb } = MUL[d];
  const a = int(rng, ra[0], ra[1]), b = int(rng, rb[0], rb[1]);
  return { prompt: `${a} × ${b}`, answer: a * b };
}
function division(rng: Rng, d: Difficulty): Question {
  const { a: ra, b: rb } = MUL[d];
  const divisor = int(rng, Math.max(2, ra[0]), ra[1]);
  const q = int(rng, rb[0], rb[1]);
  return { prompt: `${divisor * q} ÷ ${divisor}`, answer: q };
}

// "? + 7 = 15" — find the hidden number.
function missing(rng: Rng, d: Difficulty): Question {
  const ops = d === "easy" ? ["+"] : d === "medium" ? ["+", "−", "×"] : ["+", "−", "×", "÷"];
  const op = pick(rng, ops);
  const base = op === "+" ? addition(rng, d) : op === "−" ? subtraction(rng, d) : op === "×" ? multiplication(rng, d) : division(rng, d);
  const [l, r] = base.prompt.split(` ${op} `).map(Number);
  const hideLeft = rng() < 0.5;
  return hideLeft
    ? { prompt: `? ${op} ${r} = ${base.answer}`, answer: l }
    : { prompt: `${l} ${op} ? = ${base.answer}`, answer: r };
}

// Order of operations, always with a whole, non-negative answer.
function bodmas(rng: Rng, d: Difficulty): Question {
  if (d === "easy") {
    const a = int(rng, 1, 10), b = int(rng, 2, 6), c = int(rng, 2, 6);
    return { prompt: `${a} + ${b} × ${c}`, answer: a + b * c };
  }
  if (d === "medium") {
    const a = int(rng, 1, 10), b = int(rng, 1, 10), c = int(rng, 2, 6);
    const d2 = int(rng, 1, Math.min(20, (a + b) * c));
    return { prompt: `(${a} + ${b}) × ${c} − ${d2}`, answer: (a + b) * c - d2 };
  }
  const a = int(rng, 2, 12), b = int(rng, 2, 12), dv = int(rng, 2, 9);
  const k = int(rng, 1, Math.min(12, a * b));
  const e = int(rng, 1, 20);
  return { prompt: `${a} × ${b} − ${dv * k} ÷ ${dv} + ${e}`, answer: a * b - k + e };
}

export function question(skill: Skill, d: Difficulty, rng: Rng = Math.random): Question {
  if (isSeniorNumeric(skill)) return seniorQuestion(skill, d, rng);
  if (MORE_NUMERIC.includes(skill)) return moreNumeric(skill as MoreNumericSkill, d, rng);
  switch (skill) {
    case "addition": return addition(rng, d);
    case "subtraction": return subtraction(rng, d);
    case "multiplication": return multiplication(rng, d);
    case "division": return division(rng, d);
    case "missing": return missing(rng, d);
    case "bodmas": return bodmas(rng, d);
    case "mixed": {
      // Easy "mixed" sticks to + and − for younger learners.
      const pool: Skill[] = d === "easy" ? ["addition", "subtraction"] : ["addition", "subtraction", "multiplication", "division"];
      return question(pick(rng, pool), d, rng);
    }
    default:
      // Choice / match / identity skills have no single numeric question.
      return question("mixed", d, rng);
  }
}

// Balloon Pop: the answer plus three distinct, plausible, non-negative decoys.
export function withOptions(q: Question, rng: Rng = Math.random, count = 4): { question: Question; options: number[] } {
  const spread = Math.max(3, Math.round(Math.abs(q.answer) * 0.2));
  const opts = new Set<number>([q.answer]);
  const near = [1, -1, 2, -2, 10, -10, spread, -spread];
  let guard = 0;
  while (opts.size < count && guard++ < 200) {
    const v = q.answer + (rng() < 0.7 ? pick(rng, near) : int(rng, -spread * 2, spread * 2));
    if (v >= 0 && v !== q.answer) opts.add(v);
  }
  let filler = q.answer + 1;
  while (opts.size < count) opts.add(filler++);
  return { question: q, options: shuffle(rng, [...opts]) };
}

// True or False: a statement that is right half the time.
export function statement(d: Difficulty, rng: Rng = Math.random, skill: Skill = "mixed"): { text: string; isTrue: boolean } {
  if (skill === "identity") return identityStatement(d, rng);
  if (skill === "spelling") return spellingStatement(d, rng);
  if (skill === "primes") return primeStatement(d, rng);
  const q = question(skill, d, rng);
  const isTrue = rng() < 0.5;
  if (isTrue) return { text: `${q.prompt} = ${q.answer}`, isTrue };
  const offsets = [1, -1, 2, -2, 10, -10].filter((o) => q.answer + o >= 0);
  return { text: `${q.prompt} = ${q.answer + pick(rng, offsets)}`, isTrue: false };
}

// Memory Match: `pairs` facts with distinct answers, as shuffled cards. Times
// tables by default; trig / elements / units draw from fixed pools.
export type MatchCard = { id: string; pair: number; text: string; side: "q" | "a" };
const MATCH_POOLS: readonly string[] = ["trig", "elements", "units"];
export function matchBoard(d: Difficulty, rng: Rng = Math.random, pairs = d === "hard" ? 8 : 6, skill: Skill = "multiplication"): MatchCard[] {
  if (MATCH_POOLS.includes(skill) || ENGLISH_MATCH.includes(skill)) {
    const facts = ENGLISH_MATCH.includes(skill)
      ? englishPairs(skill as EnglishMatchSkill, d, pairs, rng)
      : poolPairs(skill as MatchSkill, d, pairs, rng);
    return shuffle(rng, facts.flatMap(([q, a], i) => [
      { id: `q${i}`, pair: i, text: q, side: "q" as const },
      { id: `a${i}`, pair: i, text: a, side: "a" as const },
    ]));
  }
  const facts: Question[] = [];
  const seen = new Set<number>();
  let guard = 0;
  while (facts.length < pairs && guard++ < 500) {
    const q = multiplication(rng, d);
    if (!seen.has(q.answer)) { seen.add(q.answer); facts.push(q); }
  }
  const cards = facts.flatMap((q, i) => [
    { id: `q${i}`, pair: i, text: q.prompt, side: "q" as const },
    { id: `a${i}`, pair: i, text: String(q.answer), side: "a" as const },
  ]);
  return shuffle(rng, cards);
}

// Number Bonds: numbers that pair up to the target (10, 20 or 100).
export const BOND_TARGET: Record<Difficulty, number> = { easy: 10, medium: 20, hard: 100 };
export function bondsBoard(d: Difficulty, rng: Rng = Math.random, pairs = 6): number[] {
  const t = BOND_TARGET[d];
  const nums: number[] = [];
  for (let i = 0; i < pairs; i++) {
    const a = int(rng, 1, t - 1);
    nums.push(a, t - a);
  }
  return shuffle(rng, nums);
}

// Points for a correct answer: 10, plus a combo bonus that grows with the streak.
export function pointsFor(streak: number): number {
  return 10 + 2 * Math.min(Math.max(0, streak), 10);
}
