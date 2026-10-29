// Senior-level question generators (JSS 3 – SS 3 and beyond). Pure, with an
// injectable rng, so every answer a learner is marked against is unit-tested.
//
//  • numeric skills  → typed answers in the Quiz / Balloon engines
//  • choice skills   → four-option questions in the Choice engine
//  • match pools     → fact ↔ answer pairs for Memory Match
//  • identities      → True/False algebra statements

import type { Difficulty, Rng } from "@/lib/games/generators";

export type SeniorNumericSkill = "linear" | "percent" | "sequences" | "logs";
export type ChoiceSkill =
  | "indices" | "quadratics" | "fractions" | "standardForm" | "simultaneous" | "differentiation" | "expand";
export type MatchSkill = "trig" | "elements" | "units";

// `ask` is shown under the prompt (e.g. "x = ?") when the prompt is itself an equation.
export type NumericQ = { prompt: string; answer: number; ask?: string };
export type ChoiceQ = { lead: string; prompt: string; options: string[]; answer: string };

// ── helpers ────────────────────────────────────────────────────────────────
function int(rng: Rng, lo: number, hi: number): number {
  return lo + (Math.floor(rng() * (hi - lo + 1)) % (hi - lo + 1));
}
function pick<T>(rng: Rng, xs: readonly T[]): T {
  return xs[Math.min(xs.length - 1, Math.floor(rng() * xs.length))];
}
function shuffle<T>(rng: Rng, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
const MINUS = "−";
const SUP: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
export const sup = (n: number) => String(n).split("").map((c) => SUP[c] ?? c).join("");
const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
const sub = (n: number) => String(n).split("").map((c) => SUB[c] ?? c).join("");
const signed = (n: number) => (n < 0 ? `${MINUS}${-n}` : String(n));

// A polynomial in x from coefficients, highest power first: [1, -5, 6] → "x² − 5x + 6".
export function poly(coeffs: number[]): string {
  const deg = coeffs.length - 1;
  const parts: string[] = [];
  coeffs.forEach((c, i) => {
    if (c === 0) return;
    const p = deg - i;
    const abs = Math.abs(c);
    const body = p === 0 ? String(abs) : `${abs === 1 ? "" : abs}x${p === 1 ? "" : sup(p)}`;
    if (!parts.length) parts.push(c < 0 ? `${MINUS}${body}` : body);
    else parts.push(c < 0 ? `${MINUS} ${body}` : `+ ${body}`);
  });
  return parts.length ? parts.join(" ") : "0";
}

// Four distinct options: the answer plus three distractors (fillers guarantee four).
function options(rng: Rng, answer: string, distractors: string[], filler: () => string): string[] {
  const set = new Set<string>([answer]);
  for (const d of distractors) if (set.size < 4 && d !== answer) set.add(d);
  let guard = 0;
  while (set.size < 4 && guard++ < 200) set.add(filler());
  return shuffle(rng, [...set]);
}

// ── numeric skills ─────────────────────────────────────────────────────────
function linear(rng: Rng, d: Difficulty): NumericQ {
  const x = int(rng, 1, d === "hard" ? 15 : 12);
  if (d === "easy") {
    const a = int(rng, 2, 9), b = int(rng, 1, 20);
    return { prompt: `${a}x + ${b} = ${a * x + b}`, answer: x, ask: "x = ?" };
  }
  if (d === "medium") {
    const a = int(rng, 2, 6), b = int(rng, 1, 9);
    return rng() < 0.5
      ? { prompt: `${a}(x + ${b}) = ${a * (x + b)}`, answer: x, ask: "x = ?" }
      : { prompt: `${a}x ${MINUS} ${b} = ${a * x - b}`, answer: x, ask: "x = ?" };
  }
  // ax + b = cx + e, with a > c so x stays positive.
  const c = int(rng, 1, 5), a = c + int(rng, 1, 5), b = int(rng, 1, 20);
  const e = (a - c) * x + b;
  return { prompt: `${a}x + ${b} = ${c === 1 ? "" : c}x + ${e}`, answer: x, ask: "x = ?" };
}

function percent(rng: Rng, d: Difficulty): NumericQ {
  if (d === "easy") {
    const p = pick(rng, [10, 20, 25, 50, 75]), base = (100 / gcd(100, p)) * int(rng, 1, 12);
    return { prompt: `${p}% of ${base}`, answer: (p * base) / 100 };
  }
  if (d === "medium") {
    const p = pick(rng, [5, 15, 30, 35, 40, 45, 60, 65, 80]), base = (100 / gcd(100, p)) * int(rng, 2, 20);
    return { prompt: `${p}% of ${base}`, answer: (p * base) / 100 };
  }
  const p = pick(rng, [5, 10, 12, 15, 20, 25, 40]), base = (100 / gcd(100, p)) * int(rng, 2, 15);
  switch (int(rng, 0, 2)) {
    case 0: return { prompt: `Increase ${base} by ${p}%`, answer: base + (p * base) / 100 };
    case 1: return { prompt: `Decrease ${base} by ${p}%`, answer: base - (p * base) / 100 };
    default: return { prompt: `${p}% of ? = ${(p * base) / 100}`, answer: base };
  }
}

function sequences(rng: Rng, d: Difficulty): NumericQ {
  if (d === "easy") {
    const a = int(rng, 1, 20), k = int(rng, 2, 9);
    const t = [0, 1, 2, 3].map((i) => a + i * k);
    return { prompt: `${t.join(", ")}, ?`, answer: a + 4 * k, ask: "Next term?" };
  }
  if (d === "medium") {
    if (rng() < 0.5) {
      const a = int(rng, 1, 5), r = int(rng, 2, 3);
      const t = [0, 1, 2, 3].map((i) => a * r ** i);
      return { prompt: `${t.join(", ")}, ?`, answer: a * r ** 4, ask: "Next term?" };
    }
    const a = int(rng, 1, 15), k = int(rng, 2, 8), n = int(rng, 10, 30);
    return { prompt: `${a}, ${a + k}, ${a + 2 * k}, …`, answer: a + (n - 1) * k, ask: `${n}th term?` };
  }
  // Quadratic sequence n² + bn + c with positive terms; find the next term.
  const b = int(rng, 0, 5), c = int(rng, 0, 6);
  const t = [1, 2, 3, 4].map((n) => n * n + b * n + c);
  return { prompt: `${t.join(", ")}, ?`, answer: 25 + 5 * b + c, ask: "Next term?" };
}

function logs(rng: Rng, d: Difficulty): NumericQ {
  const base = d === "easy" ? pick(rng, [2, 10]) : pick(rng, [2, 3, 5, 10]);
  const maxK = base === 2 ? 8 : base === 3 ? 5 : base === 5 ? 4 : 5;
  if (d !== "hard") {
    const k = int(rng, 1, maxK);
    return { prompt: `log${sub(base)} ${base ** k}`, answer: k };
  }
  const k1 = int(rng, 1, Math.max(1, maxK - 2)), k2 = int(rng, 1, Math.max(1, maxK - k1));
  return rng() < 0.5
    ? { prompt: `log${sub(base)} ${base ** k1} + log${sub(base)} ${base ** k2}`, answer: k1 + k2 }
    : { prompt: `log${sub(base)} ${base ** (k1 + k2)} ${MINUS} log${sub(base)} ${base ** k1}`, answer: k2 };
}

export function seniorQuestion(skill: SeniorNumericSkill, d: Difficulty, rng: Rng = Math.random): NumericQ {
  switch (skill) {
    case "linear": return linear(rng, d);
    case "percent": return percent(rng, d);
    case "sequences": return sequences(rng, d);
    case "logs": return logs(rng, d);
  }
}

// ── choice skills ──────────────────────────────────────────────────────────
function indices(rng: Rng, d: Difficulty): ChoiceQ {
  const v = pick(rng, ["a", "x", "y", "p"]);
  const pw = (n: number) => (n === 1 ? v : n === 0 ? "1" : `${v}${sup(n)}`);
  const m = int(rng, 2, 9), n = int(rng, 2, 6);
  const kind = d === "easy" ? pick(rng, ["mul", "div"] as const) : d === "medium" ? pick(rng, ["mul", "div", "pow"] as const) : pick(rng, ["neg", "coef", "zero"] as const);
  switch (kind) {
    case "mul": return { lead: "Simplify", prompt: `${pw(m)} × ${pw(n)}`, answer: pw(m + n),
      options: options(rng, pw(m + n), [pw(m * n), pw(m + n + 1), pw(Math.abs(m - n) || m + n + 2)], () => pw(int(rng, 2, 20))) };
    case "div": {
      const big = m + n;
      return { lead: "Simplify", prompt: `${pw(big)} ÷ ${pw(n)}`, answer: pw(m),
        options: options(rng, pw(m), [pw(big + n), pw(big * n), pw(m + 1)], () => pw(int(rng, 2, 20))) };
    }
    case "pow": return { lead: "Simplify", prompt: `(${pw(m)})${sup(n)}`, answer: pw(m * n),
      options: options(rng, pw(m * n), [pw(m + n), pw(m ** n > 99 ? m * n + 1 : m ** n), pw(m * n - 1)], () => pw(int(rng, 2, 40))) };
    case "neg": {
      const a = int(rng, 2, 6), b = a + int(rng, 1, 6);
      return { lead: "Simplify", prompt: `${v}${sup(-a)} × ${pw(b)}`, answer: pw(b - a),
        options: options(rng, pw(b - a), [pw(a + b), `${v}${sup(-(a + b))}`, pw(a * b)], () => pw(int(rng, 2, 20))) };
    }
    case "coef": {
      const c = int(rng, 2, 5), k = int(rng, 2, 4), p = int(rng, 2, 5);
      const ans = `${c ** k}${pw(p * k)}`;
      return { lead: "Simplify", prompt: `(${c}${pw(p)})${sup(k)}`, answer: ans,
        options: options(rng, ans, [`${c * k}${pw(p * k)}`, `${c}${pw(p * k)}`, `${c ** k}${pw(p + k)}`], () => `${int(rng, 2, 99)}${pw(int(rng, 2, 20))}`) };
    }
    case "zero": {
      const k = int(rng, 2, 9);
      return { lead: "Evaluate", prompt: `${k}${v}⁰  (${v} ≠ 0)`, answer: String(k),
        options: options(rng, String(k), ["0", "1", `${k}${v}`], () => String(int(rng, 2, 20))) };
    }
  }
}

function quadratics(rng: Rng, d: Difficulty): ChoiceQ {
  let p: number, q: number;
  do {
    p = d === "easy" ? int(rng, 1, 7) : int(rng, -9, 9);
    q = d === "easy" ? int(rng, 1, 7) : int(rng, -9, 9);
  } while (p === q || p === 0 || q === 0 || p === -q);
  const a = d === "hard" ? pick(rng, [1, 2, 3]) : 1;
  const coeffs = [a, -a * (p + q), a * p * q];
  const fmt = (r: number[]) => {
    const s = [...r].sort((m, n) => m - n);
    return `x = ${signed(s[0])} or x = ${signed(s[1])}`;
  };
  return {
    lead: "Solve", prompt: `${poly(coeffs)} = 0`, answer: fmt([p, q]),
    options: options(rng, fmt([p, q]), [fmt([-p, -q]), fmt([p, -q]), fmt([-p, q])], () => fmt([int(rng, -9, 9) || 1, int(rng, 10, 15)])),
  };
}

// Fractions: answers are compared by value, so no distractor is secretly equal.
type Fr = [number, number];
const simp = ([n, dn]: Fr): Fr => { const g = gcd(n, dn); const s = dn < 0 ? -1 : 1; return [(s * n) / g, (s * dn) / g]; };
export const fracStr = (f: Fr) => { const [n, dn] = simp(f); return dn === 1 ? signed(n) : `${signed(n)}/${dn}`; };
const sameValue = (a: Fr, b: Fr) => a[0] * b[1] === b[0] * a[1];
function fractions(rng: Rng, d: Difficulty): ChoiceQ {
  let a: Fr, b: Fr, op: string, ans: Fr, wrong: Fr[];
  if (d === "easy") {
    const den = int(rng, 3, 12);
    a = [int(rng, 1, den - 1), den]; b = [int(rng, 1, den - 1), den];
    op = "+"; ans = [a[0] + b[0], den];
    wrong = [[a[0] + b[0], 2 * den], [a[0] * b[0], den], [a[0] + b[0] + 1, den]];
  } else if (d === "medium") {
    a = [int(rng, 1, 5), int(rng, 2, 9)]; b = [int(rng, 1, 5), int(rng, 2, 9)];
    op = pick(rng, ["+", MINUS]);
    ans = op === "+" ? [a[0] * b[1] + b[0] * a[1], a[1] * b[1]] : [a[0] * b[1] - b[0] * a[1], a[1] * b[1]];
    wrong = [
      op === "+" ? [a[0] + b[0], a[1] + b[1]] : [a[0] - b[0], Math.abs(a[1] - b[1]) || 1],
      [ans[0] + 1, ans[1]], [ans[0], ans[1] + 1], [-ans[0], ans[1]],
    ];
  } else {
    a = [int(rng, 1, 9), int(rng, 2, 9)]; b = [int(rng, 1, 9), int(rng, 2, 9)];
    op = pick(rng, ["×", "÷"]);
    ans = op === "×" ? [a[0] * b[0], a[1] * b[1]] : [a[0] * b[1], a[1] * b[0]];
    wrong = op === "×"
      ? [[a[0] * b[1], a[1] * b[0]], [a[0] + b[0], a[1] + b[1]], [ans[0] + 1, ans[1]]]
      : [[a[0] * b[0], a[1] * b[1]], [a[1] * b[0], a[0] * b[1]], [ans[0] + 1, ans[1]]];
  }
  const answer = fracStr(ans);
  const distract = wrong.filter((w) => w[1] !== 0 && !sameValue(w, ans)).map(fracStr);
  return {
    lead: "Work out", prompt: `${a[0]}/${a[1]} ${op} ${b[0]}/${b[1]}`, answer,
    options: options(rng, answer, distract, () => {
      const f: Fr = [ans[0] + int(rng, 2, 9), ans[1]];
      return sameValue(f, ans) ? fracStr([ans[0] + 11, ans[1]]) : fracStr(f);
    }),
  };
}

// Standard form with a two-significant-figure mantissa (e.g. 4.5 × 10³).
const mant = (tenths: number) => (tenths % 10 === 0 ? String(tenths / 10) : `${Math.floor(tenths / 10)}.${tenths % 10}`);
const sf = (tenths: number, e: number) => `${mant(tenths)} × 10${sup(e)}`;
export function plainNumber(tenths: number, e: number): string {
  // value = tenths/10 × 10^e = tenths × 10^(e−1); tenths is 11–99.
  const digits = String(tenths).replace(/0+$/, "");
  const shift = e - 1 + (String(tenths).length - digits.length);
  if (shift >= 0) return Number(digits + "0".repeat(shift)).toLocaleString("en-US");
  const s = digits.padStart(-shift + 1, "0");
  return `${s.slice(0, s.length + shift)}.${s.slice(s.length + shift)}`;
}
function standardForm(rng: Rng, d: Difficulty): ChoiceQ {
  let t: number;
  do t = int(rng, 11, 99); while (t % 10 === 0);
  if (d === "hard") {
    const a = int(rng, 2, 9), b = int(rng, 2, 9), p = int(rng, 2, 6), q = int(rng, 2, 6);
    const prod = a * b, e = p + q + (prod >= 10 ? 1 : 0), tenths = prod >= 10 ? prod : prod * 10;
    const answer = sf(tenths, e);
    return { lead: "Work out, in standard form", prompt: `(${a} × 10${sup(p)}) × (${b} × 10${sup(q)})`, answer,
      options: options(rng, answer, [sf(tenths, e + 1), sf(tenths, e - 1), sf(tenths, p * q)], () => sf(tenths, int(rng, 1, 20))) };
  }
  const e = d === "easy" ? int(rng, 2, 7) : -int(rng, 1, 6);
  const answer = sf(t, e);
  return { lead: "Write in standard form", prompt: plainNumber(t, e), answer,
    options: options(rng, answer, [sf(t, e + 1), sf(t, e - 1), sf(t, -e)], () => sf(t, int(rng, -8, 8) || 9)) };
}

function simultaneous(rng: Rng, d: Difficulty): ChoiceQ {
  let x: number, y: number;
  do { x = int(rng, 1, 9); y = int(rng, d === "easy" ? 1 : -5, 9); } while (x === y || y === 0 || x === -y);
  const pair = (a: number, b: number) => `x = ${signed(a)}, y = ${signed(b)}`;
  const eq = (a: number, b: number) => `${poly([a, 0])} ${b < 0 ? MINUS : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}y = ${signed(a * x + b * y)}`;
  let lines: string[];
  if (d === "easy") lines = [`x + y = ${signed(x + y)}`, `x ${MINUS} y = ${signed(x - y)}`];
  else {
    let a1: number, b1: number, a2: number, b2: number;
    do { a1 = int(rng, 1, 5); b1 = int(rng, 1, 5) * pick(rng, [1, -1]); a2 = int(rng, 1, 5); b2 = int(rng, 1, 5) * pick(rng, [1, -1]); }
    while (a1 * b2 - a2 * b1 === 0);
    lines = [eq(a1, b1), eq(a2, b2)];
  }
  const answer = pair(x, y);
  return { lead: "Solve simultaneously", prompt: lines.join("\n"), answer,
    options: options(rng, answer, [pair(y, x), pair(-x, y), pair(x, -y)], () => pair(int(rng, 1, 9), int(rng, 10, 14))) };
}

// Differentiation of polynomials; distractors are the classic slips.
function differentiation(rng: Rng, d: Difficulty): ChoiceQ {
  const n1 = int(rng, 2, d === "easy" ? 5 : 6), a1 = int(rng, 1, 9);
  const terms: [number, number][] = [[a1, n1]];
  if (d !== "easy") terms.push([int(rng, 1, 9) * pick(rng, [1, -1]), int(rng, 1, n1 - 1)]);
  if (d === "hard") terms.push([int(rng, 1, 12) * pick(rng, [1, -1]), 0]);
  const toCoeffs = (ts: [number, number][]) => {
    const deg = Math.max(0, ...ts.map(([, p]) => p));
    const c = Array(deg + 1).fill(0);
    ts.forEach(([k, p]) => { c[deg - p] += k; });
    return c;
  };
  const f = poly(toCoeffs(terms));
  const deriv = poly(toCoeffs(terms.filter(([, p]) => p > 0).map(([k, p]) => [k * p, p - 1] as [number, number])));
  const keepPower = poly(toCoeffs(terms.filter(([, p]) => p > 0).map(([k, p]) => [k * p, p] as [number, number])));
  const noMultiply = poly(toCoeffs(terms.filter(([, p]) => p > 0).map(([k, p]) => [k, p - 1] as [number, number])));
  const keepConst = poly(toCoeffs(terms.map(([k, p]) => (p > 0 ? [k * p, p - 1] : [k, 0]) as [number, number])));
  return { lead: "Differentiate", prompt: `y = ${f}`, answer: `dy/dx = ${deriv}`,
    options: options(rng, `dy/dx = ${deriv}`, [`dy/dx = ${keepPower}`, `dy/dx = ${noMultiply}`, `dy/dx = ${keepConst}`],
      () => `dy/dx = ${poly([int(rng, 2, 60), int(rng, 1, 9)])}`) };
}

function expand(rng: Rng, d: Difficulty): ChoiceQ {
  if (d === "easy") {
    const k = int(rng, 2, 9), b = int(rng, 1, 9) * pick(rng, [1, -1]);
    const answer = poly([k, k * b]);
    return { lead: "Expand", prompt: `${k}(x ${b < 0 ? MINUS : "+"} ${Math.abs(b)})`, answer,
      options: options(rng, answer, [poly([k, b]), poly([k, k + b]), poly([k, -k * b])], () => poly([k, int(rng, 1, 90)])) };
  }
  let p: number, q: number;
  do { p = int(rng, 1, 9) * pick(rng, [1, -1]); q = int(rng, 1, 9) * pick(rng, [1, -1]); } while (p === -q);
  const bin = (r: number) => `(x ${r < 0 ? MINUS : "+"} ${Math.abs(r)})`;
  const expanded = poly([1, p + q, p * q]);
  if (d === "medium") {
    return { lead: "Expand", prompt: `${bin(p)}${bin(q)}`, answer: expanded,
      options: options(rng, expanded, [poly([1, 0, p * q]), poly([1, p * q, p + q]), poly([1, p + q, -(p * q)])], () => poly([1, int(rng, 1, 20), int(rng, 1, 90)])) };
  }
  const answer = `${bin(p)}${bin(q)}`;
  return { lead: "Factorise", prompt: expanded, answer,
    options: options(rng, answer, [`${bin(-p)}${bin(-q)}`, `${bin(p)}${bin(-q)}`, `${bin(-p)}${bin(q)}`], () => `${bin(int(rng, 10, 15))}${bin(q)}`) };
}

export function choiceQuestion(skill: ChoiceSkill, d: Difficulty, rng: Rng = Math.random): ChoiceQ {
  switch (skill) {
    case "indices": return indices(rng, d);
    case "quadratics": return quadratics(rng, d);
    case "fractions": return fractions(rng, d);
    case "standardForm": return standardForm(rng, d);
    case "simultaneous": return simultaneous(rng, d);
    case "differentiation": return differentiation(rng, d);
    case "expand": return expand(rng, d);
  }
}

// ── memory-match pools ─────────────────────────────────────────────────────
// Each pool is [fact, answer]; a board never repeats an answer.
const TRIG_EASY: [string, string][] = [
  ["sin 30°", "1/2"], ["cos 60°", "1/2"], ["sin 45°", "√2/2"], ["cos 45°", "√2/2"], ["sin 60°", "√3/2"], ["cos 30°", "√3/2"],
  ["tan 45°", "1"], ["sin 90°", "1"], ["cos 0°", "1"], ["tan 60°", "√3"], ["tan 30°", "1/√3"], ["sin 0°", "0"], ["cos 90°", "0"], ["tan 0°", "0"],
];
const TRIG_HARD: [string, string][] = [
  ...TRIG_EASY,
  ["cos 120°", "−1/2"], ["sin 210°", "−1/2"], ["cos 180°", "−1"], ["sin 270°", "−1"], ["tan 135°", "−1"],
  ["cos 150°", "−√3/2"], ["sin 240°", "−√3/2"], ["cos 135°", "−√2/2"], ["sin 315°", "−√2/2"], ["tan 120°", "−√3"],
];
export const ELEMENTS: [string, string][] = [
  ["H", "Hydrogen"], ["He", "Helium"], ["Li", "Lithium"], ["C", "Carbon"], ["N", "Nitrogen"], ["O", "Oxygen"], ["F", "Fluorine"],
  ["Ne", "Neon"], ["Mg", "Magnesium"], ["Al", "Aluminium"], ["Si", "Silicon"], ["P", "Phosphorus"], ["S", "Sulfur"], ["Cl", "Chlorine"],
  ["Ar", "Argon"], ["Ca", "Calcium"], ["Zn", "Zinc"], ["Br", "Bromine"], ["I", "Iodine"],
  // Symbols from Latin names — the tricky ones.
  ["Na", "Sodium"], ["K", "Potassium"], ["Fe", "Iron"], ["Cu", "Copper"], ["Ag", "Silver"], ["Au", "Gold"], ["Hg", "Mercury"],
  ["Pb", "Lead"], ["Sn", "Tin"], ["Sb", "Antimony"], ["W", "Tungsten"],
  ["Mn", "Manganese"], ["Ni", "Nickel"], ["Cr", "Chromium"], ["Co", "Cobalt"], ["Pt", "Platinum"], ["U", "Uranium"], ["Ba", "Barium"],
];
export const UNITS: [string, string][] = [
  ["Force", "N"], ["Energy", "J"], ["Power", "W"], ["Pressure", "Pa"], ["Current", "A"], ["Voltage", "V"], ["Resistance", "Ω"],
  ["Frequency", "Hz"], ["Mass", "kg"], ["Time", "s"], ["Temperature", "K"], ["Charge", "C"], ["Amount of substance", "mol"],
  ["Capacitance", "F"], ["Magnetic flux density", "T"], ["Luminous intensity", "cd"], ["Momentum", "kg m/s"], ["Acceleration", "m/s²"],
  ["Speed", "m/s"], ["Density", "kg/m³"], ["Area", "m²"], ["Volume", "m³"], ["Inductance", "H"], ["Radioactivity", "Bq"],
];

export function matchPool(skill: MatchSkill, d: Difficulty): [string, string][] {
  if (skill === "trig") return d === "hard" ? TRIG_HARD : TRIG_EASY;
  if (skill === "elements") return d === "easy" ? ELEMENTS.slice(0, 19) : d === "medium" ? ELEMENTS.slice(0, 26) : ELEMENTS.slice(15);
  return d === "easy" ? UNITS.slice(0, 10) : UNITS;
}

// Up to `pairs` facts with distinct answers, drawn at random from the pool.
export function poolPairs(skill: MatchSkill, d: Difficulty, pairs: number, rng: Rng = Math.random): [string, string][] {
  const out: [string, string][] = [];
  const seen = new Set<string>();
  for (const pr of shuffle(rng, matchPool(skill, d))) {
    if (out.length >= pairs) break;
    if (!seen.has(pr[1])) { seen.add(pr[1]); out.push(pr); }
  }
  return out;
}

// ── algebra identities (True / False) ──────────────────────────────────────
export function identityStatement(d: Difficulty, rng: Rng = Math.random): { text: string; isTrue: boolean } {
  const a = int(rng, 1, 9);
  const forms: { lhs: string; right: string; wrong: string[] }[] = [
    { lhs: `(x + ${a})²`, right: poly([1, 2 * a, a * a]), wrong: [poly([1, 0, a * a]), poly([1, a, a * a]), poly([1, 2 * a, 2 * a])] },
    { lhs: `(x ${MINUS} ${a})²`, right: poly([1, -2 * a, a * a]), wrong: [poly([1, 0, -(a * a)]), poly([1, -2 * a, -(a * a)]), poly([1, 2 * a, a * a])] },
    { lhs: `(x + ${a})(x ${MINUS} ${a})`, right: poly([1, 0, -(a * a)]), wrong: [poly([1, 0, a * a]), poly([1, -2 * a, -(a * a)])] },
  ];
  if (d !== "easy") {
    const m = int(rng, 2, 7), n = int(rng, 3, 7); // n ≥ 3 so m·n ≠ m + n
    forms.push({ lhs: `x${sup(m)} × x${sup(n)}`, right: `x${sup(m + n)}`, wrong: [`x${sup(m * n)}`] });
    forms.push({ lhs: `(x${sup(m)})${sup(n)}`, right: `x${sup(m * n)}`, wrong: [`x${sup(m + n)}`] });
  }
  if (d === "hard") {
    const b = int(rng, 2, 5);
    forms.push({ lhs: `${b}x² ${MINUS} ${b * a * a}`, right: `${b}(x + ${a})(x ${MINUS} ${a})`, wrong: [`${b}(x ${MINUS} ${a})²`, `(${b}x + ${a})(x ${MINUS} ${a})`] });
  }
  const f = pick(rng, forms);
  const isTrue = rng() < 0.5;
  // A "wrong" form can coincide with the right one for small a (e.g. 2a = a² at a = 2).
  const wrong = f.wrong.filter((w) => w !== f.right);
  return { text: `${f.lhs} = ${isTrue ? f.right : pick(rng, wrong)}`, isTrue };
}
