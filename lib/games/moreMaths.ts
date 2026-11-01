// More maths games for the board: geometry, statistics, ratio, functions,
// straight lines, probability, surds, circles, inequalities and integration.
// Pure, with an injectable rng, so every answer is unit-tested.
//
//  • numeric skills → typed answers (Quiz / Balloon engines). Answers are
//    always whole numbers ≥ 0: the keypad has digits only.
//  • choice skills  → four-option questions (Choice engine)

import type { Difficulty, Rng } from "@/lib/games/generators";
import type { ChoiceQ, NumericQ } from "@/lib/games/senior";
import { gcd, poly, sup } from "@/lib/games/senior";

export type MoreNumericSkill = "angles" | "area" | "ratio" | "averages" | "powers" | "functions"
  | "placeValue" | "money" | "hcfLcm" | "speed" | "interest" | "bases" | "sets" | "pythagoras" | "modular" | "vectors" | "counting" | "bearings";
export type MoreChoiceSkill = "rounding" | "lines" | "probability" | "surds" | "circles" | "inequalities" | "integration"
  | "time" | "fdp" | "negatives" | "matrices";
export const MORE_NUMERIC: readonly string[] = ["angles", "area", "ratio", "averages", "powers", "functions",
  "placeValue", "money", "hcfLcm", "speed", "interest", "bases", "sets", "pythagoras", "modular", "vectors", "counting", "bearings"];
export const MORE_CHOICE: readonly string[] = ["rounding", "lines", "probability", "surds", "circles", "inequalities", "integration",
  "time", "fdp", "negatives", "matrices"];

const MINUS = "−";
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
const signed = (n: number) => (n < 0 ? `${MINUS}${-n}` : String(n));
// A fraction in its simplest form: 6/8 → "3/4", 4/2 → "2", −1/2 → "−1/2".
export function frac(n: number, d: number): string {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  n /= g; d /= g;
  return d === 1 ? signed(n) : `${signed(n)}/${d}`;
}
// The answer plus three different wrong ones (fillers make sure there are four).
function four(rng: Rng, answer: string, wrong: string[], filler: () => string): string[] {
  const set = new Set<string>([answer]);
  for (const w of wrong) if (set.size < 4 && w && w !== answer) set.add(w);
  let guard = 0;
  while (set.size < 4 && guard++ < 300) set.add(filler());
  return shuffle(rng, [...set]);
}

// ── numeric skills ─────────────────────────────────────────────────────────
function angles(rng: Rng, d: Difficulty): NumericQ {
  if (d === "easy") {
    if (rng() < 0.5) { const a = int(rng, 15, 165); return { prompt: `Angles on a straight line: ${a}° and x°`, answer: 180 - a, ask: "x = ?" }; }
    const a = int(rng, 10, 80); return { prompt: `A right angle is split into ${a}° and x°`, answer: 90 - a, ask: "x = ?" };
  }
  if (d === "medium") {
    if (rng() < 0.5) {
      const a = int(rng, 20, 100), b = int(rng, 20, 160 - a);
      return { prompt: `A triangle has angles ${a}°, ${b}° and x°`, answer: 180 - a - b, ask: "x = ?" };
    }
    const a = int(rng, 40, 120), b = int(rng, 40, 120), c = int(rng, 20, 340 - a - b);
    const rest = 360 - a - b - c; // at least 20°
    return { prompt: `Angles around a point: ${a}°, ${b}°, ${c}° and x°`, answer: rest, ask: "x = ?" };
  }
  const n = pick(rng, [5, 6, 8, 9, 10, 12] as const);
  const name: Record<number, string> = { 5: "pentagon", 6: "hexagon", 8: "octagon", 9: "nonagon", 10: "decagon", 12: "dodecagon" };
  const kind = int(rng, 0, 2);
  if (kind === 0) return { prompt: `Each interior angle of a regular ${name[n]}`, answer: ((n - 2) * 180) / n, ask: "in degrees = ?" };
  if (kind === 1) return { prompt: `Each exterior angle of a regular ${name[n]}`, answer: 360 / n, ask: "in degrees = ?" };
  return { prompt: `Sum of the interior angles of a ${name[n]}`, answer: (n - 2) * 180, ask: "in degrees = ?" };
}

function area(rng: Rng, d: Difficulty): NumericQ {
  if (d === "easy") {
    const l = int(rng, 2, 12), w = int(rng, 2, 9);
    return rng() < 0.5
      ? { prompt: `Rectangle ${l} cm by ${w} cm`, answer: l * w, ask: "area in cm² = ?" }
      : { prompt: `Rectangle ${l} cm by ${w} cm`, answer: 2 * (l + w), ask: "perimeter in cm = ?" };
  }
  if (d === "medium") {
    if (rng() < 0.5) { const b = 2 * int(rng, 2, 9), h = int(rng, 2, 12); return { prompt: `Triangle: base ${b} cm, height ${h} cm`, answer: (b * h) / 2, ask: "area in cm² = ?" }; }
    const a = int(rng, 2, 9), b = a + 2 * int(rng, 1, 4), h = int(rng, 2, 10);
    return { prompt: `Trapezium: parallel sides ${a} cm and ${b} cm, height ${h} cm`, answer: ((a + b) * h) / 2, ask: "area in cm² = ?" };
  }
  const l = int(rng, 2, 10), w = int(rng, 2, 8), h = int(rng, 2, 6);
  return rng() < 0.5
    ? { prompt: `Cuboid ${l} cm × ${w} cm × ${h} cm`, answer: l * w * h, ask: "volume in cm³ = ?" }
    : { prompt: `Cuboid ${l} cm × ${w} cm × ${h} cm`, answer: 2 * (l * w + l * h + w * h), ask: "surface area in cm² = ?" };
}

function ratio(rng: Rng, d: Difficulty): NumericQ {
  if (d === "easy") {
    const a = int(rng, 1, 5), b = int(rng, 1, 5), k = int(rng, 2, 12);
    const big = rng() < 0.5;
    return { prompt: `Share ${(a + b) * k} sweets in the ratio ${a} : ${b}`, answer: (big ? Math.max(a, b) : Math.min(a, b)) * k, ask: big ? "the bigger share = ?" : "the smaller share = ?" };
  }
  if (d === "medium") {
    const a = int(rng, 1, 4), b = int(rng, 1, 5), c = int(rng, 1, 6), k = int(rng, 2, 10);
    return { prompt: `Share ₦${(a + b + c) * k * 100} in the ratio ${a} : ${b} : ${c}`, answer: c * k * 100, ask: "the last share = ?" };
  }
  const a = int(rng, 2, 9), b = int(rng, 2, 9), k = int(rng, 2, 12);
  return rng() < 0.5
    ? { prompt: `p : q = ${a} : ${b} and p = ${a * k}`, answer: b * k, ask: "q = ?" }
    : { prompt: `${a} pens cost ₦${a * k * 10}`, answer: b * k * 10, ask: `${b} pens cost ₦ ?` };
}

// n numbers with a whole-number mean: pairs either side of the mean (and the mean itself when n is odd).
function aroundMean(rng: Rng, n: number, mean: number): number[] {
  const xs: number[] = n % 2 ? [mean] : [];
  while (xs.length < n) { const dv = int(rng, 0, Math.min(mean - 1, 7)); xs.push(mean + dv, mean - dv); }
  return shuffle(rng, xs);
}
function averages(rng: Rng, d: Difficulty): NumericQ {
  if (d === "easy") {
    const n = int(rng, 3, 5), mean = int(rng, 3, 15);
    return { prompt: aroundMean(rng, n, mean).join(", "), answer: mean, ask: "the mean = ?" };
  }
  if (d === "medium") {
    const n = pick(rng, [5, 7] as const);
    const xs = Array.from({ length: n }, () => int(rng, 1, 30));
    const sorted = [...xs].sort((a, b) => a - b);
    return rng() < 0.5
      ? { prompt: xs.join(", "), answer: sorted[(n - 1) / 2], ask: "the median = ?" }
      : { prompt: xs.join(", "), answer: sorted[n - 1] - sorted[0], ask: "the range = ?" };
  }
  const n = int(rng, 4, 6), mean = int(rng, 5, 20);
  const all = aroundMean(rng, n, mean), missing = all[n - 1], xs = all.slice(0, n - 1);
  return { prompt: `The mean of ${n} numbers is ${mean}. ${n - 1} of them are ${xs.join(", ")}`, answer: missing, ask: "the last number = ?" };
}

function powers(rng: Rng, d: Difficulty): NumericQ {
  if (d === "easy") { const a = int(rng, 1, 12); return rng() < 0.5 ? { prompt: `${a}²`, answer: a * a } : { prompt: `√${a * a}`, answer: a }; }
  if (d === "medium") {
    const a = int(rng, 1, 6), b = int(rng, 11, 15);
    return pick(rng, [{ prompt: `${a}³`, answer: a ** 3 }, { prompt: `√${b * b}`, answer: b }, { prompt: `∛${a ** 3}`, answer: a }]);
  }
  const k = int(rng, 2, 10), b = pick(rng, [2, 3, 5] as const), m = int(rng, 1, b === 2 ? 3 : 2);
  return pick(rng, [
    { prompt: `2${sup(k)}`, answer: 2 ** k },
    { prompt: `${b ** (m * 2)}^(1/2)`, answer: b ** m },
    { prompt: `${b}${sup(m + 1)} × ${b}${sup(m)}`, answer: b ** (2 * m + 1) },
  ]);
}

function functions(rng: Rng, d: Difficulty): NumericQ {
  if (d === "easy") {
    const a = int(rng, 2, 9), b = int(rng, 1, 15), x = int(rng, 1, 10);
    return { prompt: `f(x) = ${a}x + ${b}`, answer: a * x + b, ask: `f(${x}) = ?` };
  }
  if (d === "medium") {
    const b = int(rng, -6, 6), x = int(rng, 1, 6), lo = Math.max(0, -(x * x + b * x)), c = int(rng, lo, lo + 12);
    const v = x * x + b * x + c; // never below 0
    return { prompt: `f(x) = ${poly([1, b, c])}`, answer: v, ask: `f(${x}) = ?` };
  }
  const a = int(rng, 2, 5), b = int(rng, 1, 9);
  if (rng() < 0.5) {
    const y = int(rng, 1, 12);
    return { prompt: `f(x) = ${a}x + ${b}`, answer: y, ask: `f⁻¹(${a * y + b}) = ?` };
  }
  const p = int(rng, 1, 4), x = int(rng, 1, 5);
  return { prompt: `f(x) = ${a}x + ${b},  g(x) = x + ${p}`, answer: a * (x + p) + b, ask: `f(g(${x})) = ?` };
}

export function moreNumeric(skill: MoreNumericSkill, d: Difficulty, rng: Rng = Math.random): NumericQ {
  switch (skill) {
    case "angles": return angles(rng, d);
    case "area": return area(rng, d);
    case "ratio": return ratio(rng, d);
    case "averages": return averages(rng, d);
    case "powers": return powers(rng, d);
    case "functions": return functions(rng, d);
    case "placeValue": return placeValue(rng, d);
    case "money": return money(rng, d);
    case "hcfLcm": return hcfLcm(rng, d);
    case "speed": return speed(rng, d);
    case "interest": return interest(rng, d);
    case "bases": return bases(rng, d);
    case "sets": return sets(rng, d);
    case "pythagoras": return pythagoras(rng, d);
    case "modular": return modular(rng, d);
    case "vectors": return vectors(rng, d);
    case "counting": return counting(rng, d);
    case "bearings": return bearings(rng, d);
  }
}

// ── second batch: numeric ──────────────────────────────────────────────────
const commas = (n: number) => n.toLocaleString("en-GB");
const PLACE = ["ones", "tens", "hundreds", "thousands", "ten thousands", "hundred thousands", "millions"];
function placeValue(rng: Rng, d: Difficulty): NumericQ {
  const len = d === "easy" ? 4 : d === "medium" ? 5 : 7;
  // Different digits, no leading zero, so "the digit 7" means one place.
  const digits = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).slice(0, len);
  if (digits[0] === 0) [digits[0], digits[1]] = [digits[1], digits[0]];
  const n = Number(digits.join(""));
  if (d === "medium" && rng() < 0.5) {
    const [th, h, o] = [int(rng, 1, 9), int(rng, 1, 9), int(rng, 1, 9)];
    return { prompt: `${th} thousands, ${h} hundreds and ${o} ones`, answer: th * 1000 + h * 100 + o, ask: "as a number = ?" };
  }
  if (d === "hard" && rng() < 0.4) {
    const t = pick(rng, [10, 100] as const);
    return { prompt: `How many ${t === 10 ? "tens" : "hundreds"} are in ${commas(n)}?`, answer: Math.floor(n / t), ask: "(whole ones) = ?" };
  }
  const nonzero = digits.map((v, i) => ({ v, place: len - 1 - i })).filter((x) => x.v > 0);
  const c = pick(rng, nonzero);
  return { prompt: `The value of the digit ${c.v} in ${commas(n)}`, answer: c.v * 10 ** c.place, ask: `(it's in the ${PLACE[c.place]}) = ?` };
}

function money(rng: Rng, d: Difficulty): NumericQ {
  if (d === "easy") {
    const cost = 10 * int(rng, 3, 45), paid = pick(rng, [500, 1000].filter((x) => x > cost));
    return { prompt: `A snack costs ₦${cost}. You pay ₦${paid}`, answer: paid - cost, ask: "change in ₦ = ?" };
  }
  if (d === "medium") {
    const each = 10 * int(rng, 5, 40), n = int(rng, 2, 6), paid = Math.ceil((each * n + 1) / 1000) * 1000;
    return rng() < 0.5
      ? { prompt: `${n} books at ₦${each} each`, answer: each * n, ask: "total in ₦ = ?" }
      : { prompt: `${n} books at ₦${each} each, paid with ₦${commas(paid)}`, answer: paid - each * n, ask: "change in ₦ = ?" };
  }
  const price = 100 * int(rng, 5, 60), off = 5 * int(rng, 1, 8);
  return rng() < 0.5
    ? { prompt: `A ₦${commas(price)} bag with ${off}% off`, answer: price - (price * off) / 100, ask: "sale price in ₦ = ?" }
    : { prompt: `Bought for ₦${commas(price)}, sold at a ${off}% profit`, answer: price + (price * off) / 100, ask: "selling price in ₦ = ?" };
}

const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
function hcfLcm(rng: Rng, d: Difficulty): NumericQ {
  const coprime = (): [number, number] => { for (;;) { const a = int(rng, 1, 9), b = int(rng, 2, 9); if (a !== b && gcd(a, b) === 1) return [a, b]; } };
  if (d === "easy") { const g = int(rng, 2, 9), [a, b] = coprime(); return { prompt: `HCF of ${g * a} and ${g * b}`, answer: g }; }
  if (d === "medium") {
    const a = int(rng, 3, 15), b = int(rng, 3, 15);
    return rng() < 0.5 ? { prompt: `LCM of ${a} and ${b}`, answer: lcm(a, b) } : { prompt: `HCF of ${a * 4} and ${b * 4}`, answer: gcd(a * 4, b * 4) };
  }
  const [a, b, c] = [int(rng, 2, 12), int(rng, 2, 12), int(rng, 2, 10)];
  return rng() < 0.5 ? { prompt: `LCM of ${a}, ${b} and ${c}`, answer: lcm(lcm(a, b), c) } : { prompt: `HCF of ${a * 6}, ${b * 6} and ${c * 6}`, answer: gcd(gcd(a * 6, b * 6), c * 6) };
}

function speed(rng: Rng, d: Difficulty): NumericQ {
  if (d === "easy") { const t = int(rng, 1, 5), v = 5 * int(rng, 2, 20); return { prompt: `A car goes ${v * t} km in ${t} hour${t === 1 ? "" : "s"}`, answer: v, ask: "speed in km/h = ?" }; }
  if (d === "medium") {
    const t = int(rng, 2, 6), v = 5 * int(rng, 4, 24);
    return rng() < 0.5 ? { prompt: `${v} km/h for ${t} hours`, answer: v * t, ask: "distance in km = ?" } : { prompt: `${v * t} km at ${v} km/h`, answer: t, ask: "time in hours = ?" };
  }
  if (rng() < 0.5) { const k = int(rng, 1, 7); return { prompt: `${18 * k} km/h`, answer: 5 * k, ask: "in metres per second = ?" }; }
  const m = pick(rng, [15, 30, 45, 90] as const), v = 4 * int(rng, 5, 25);
  return { prompt: `${v} km/h for ${m} minutes`, answer: (v * m) / 60, ask: "distance in km = ?" };
}

function interest(rng: Rng, d: Difficulty): NumericQ {
  const P = 1000 * int(rng, 1, 20), R = int(rng, 2, 12), T = int(rng, 1, 5);
  const I = (P * R * T) / 100;
  if (d === "easy") return { prompt: `Simple interest on ₦${commas(P)} at ${R}% a year for ${T} year${T === 1 ? "" : "s"}`, answer: I, ask: "interest in ₦ = ?" };
  if (d === "medium") return rng() < 0.5
    ? { prompt: `₦${commas(P)} at ${R}% simple interest for ${T} year${T === 1 ? "" : "s"}`, answer: P + I, ask: "amount in ₦ = ?" }
    : { prompt: `₦${commas(P)} earns ₦${commas(I)} simple interest in ${T} year${T === 1 ? "" : "s"}`, answer: R, ask: "rate in % = ?" };
  const p = 100 * int(rng, 10, 90);
  return { prompt: `₦${commas(p)} at 10% compound interest for 2 years`, answer: Math.round(p * 1.21), ask: "amount in ₦ = ?" };
}

function bases(rng: Rng, d: Difficulty): NumericQ {
  if (d === "easy") { const n = int(rng, 2, 31); return { prompt: `${n.toString(2)} in base 2`, answer: n, ask: "in base 10 = ?" }; }
  if (d === "medium") { const b = pick(rng, [3, 4, 5, 8] as const), n = int(rng, b * b, b ** 3 - 1); return { prompt: `${n.toString(b)} in base ${b}`, answer: n, ask: "in base 10 = ?" }; }
  const b = pick(rng, [2, 5, 8] as const), n = int(rng, 9, b === 2 ? 63 : 200);
  return { prompt: `${n} in base 10`, answer: Number(n.toString(b)), ask: `in base ${b} = ?` };
}

function sets(rng: Rng, d: Difficulty): NumericQ {
  const both = int(rng, 1, 12), onlyA = int(rng, 1, 20), onlyB = int(rng, 1, 20), neither = int(rng, 0, 10);
  const A = both + onlyA, B = both + onlyB, U = A + onlyB + neither;
  if (d === "easy") return { prompt: `n(A) = ${A}, n(B) = ${B}, n(A ∩ B) = ${both}`, answer: A + onlyB, ask: "n(A ∪ B) = ?" };
  if (d === "medium") return { prompt: `In a class of ${U}, ${A} play football, ${B} play basketball and ${both} play both`, answer: neither, ask: "how many play neither?" };
  return { prompt: `In a class of ${U}, ${A} take Physics, ${B} take Chemistry and ${neither} take neither`, answer: both, ask: "how many take both?" };
}

const TRIPLES: [number, number, number][] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]];
function pythagoras(rng: Rng, d: Difficulty): NumericQ {
  const [a, b, c] = pick(rng, TRIPLES), k = d === "easy" ? int(rng, 1, 3) : int(rng, 1, 2);
  const [A, B, C] = [a * k, b * k, c * k];
  if (d === "easy") return { prompt: `Right-angled triangle: shorter sides ${A} cm and ${B} cm`, answer: C, ask: "hypotenuse in cm = ?" };
  if (d === "medium") return { prompt: `Right-angled triangle: hypotenuse ${C} cm, one side ${A} cm`, answer: B, ask: "the other side in cm = ?" };
  if (rng() < 0.5) {
    const x = int(rng, -5, 5), y = int(rng, -5, 5);
    return { prompt: `The distance from (${signed(x)}, ${signed(y)}) to (${signed(x + A)}, ${signed(y - B)})`, answer: C, ask: "= ?" };
  }
  return { prompt: `A ${C} m ladder leans on a wall, its foot ${A} m from the wall`, answer: B, ask: "how high up the wall (m)?" };
}

function modular(rng: Rng, d: Difficulty): NumericQ {
  const m = int(rng, 3, 9);
  if (d === "easy") { const a = int(rng, 10, 60); return { prompt: `${a} mod ${m}`, answer: a % m }; }
  if (d === "medium") {
    const a = int(rng, 10, 40), b = int(rng, 10, 40);
    return rng() < 0.5 ? { prompt: `(${a} + ${b}) mod ${m}`, answer: (a + b) % m } : { prompt: `(${a} × ${b}) mod ${m}`, answer: (a * b) % m };
  }
  const p = pick(rng, [5, 7, 11] as const), a = int(rng, 2, p - 1), x = int(rng, 1, p - 1), c = (a * x) % p;
  return { prompt: `${a}x ≡ ${c} (mod ${p})`, answer: x, ask: `x (from 0 to ${p - 1}) = ?` };
}

function vectors(rng: Rng, d: Difficulty): NumericQ {
  const [a, b, c] = pick(rng, TRIPLES.slice(0, 4));
  const sx = pick(rng, [1, -1]), sy = pick(rng, [1, -1]), [X, Y] = rng() < 0.5 ? [a * sx, b * sy] : [b * sx, a * sy];
  const v = (x: number, y: number) => `(${signed(x)}, ${signed(y)})`;
  if (d === "easy") return { prompt: `|${v(X, Y)}|`, answer: c, ask: "the magnitude = ?" };
  const px = int(rng, -6, 6), py = int(rng, -6, 6);
  if (d === "medium") return { prompt: `a = ${v(px, py)}, b = ${v(X - px, Y - py)}`, answer: c, ask: "|a + b| = ?" };
  return { prompt: `a = ${v(px, py)}, b = ${v(2 * px - X, 2 * py - Y)}`, answer: c, ask: "|2a − b| = ?" };
}

const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const nCr = (n: number, r: number) => fact(n) / (fact(r) * fact(n - r));
function counting(rng: Rng, d: Difficulty): NumericQ {
  if (d === "easy") { const n = int(rng, 3, 6); return { prompt: `Ways to arrange ${n} different books in a row`, answer: fact(n), ask: "= ?" }; }
  if (d === "medium") {
    const n = int(rng, 5, 10);
    return rng() < 0.5 ? { prompt: `Choose a captain and a vice-captain from ${n} players`, answer: n * (n - 1), ask: "how many ways?" }
      : { prompt: `Choose 2 learners from ${n} to clean the board`, answer: nCr(n, 2), ask: "how many ways?" };
  }
  if (rng() < 0.5) { const n = int(rng, 6, 10), r = int(rng, 3, 4); return { prompt: `${n}C${r}`, answer: nCr(n, r), ask: `(choose ${r} from ${n}) = ?` }; }
  const word = pick(rng, ["BOOK", "APPLE", "LEVEL", "BANANA", "LETTER", "COFFEE"] as const);
  const counts = [...word].reduce<Record<string, number>>((o, ch) => ({ ...o, [ch]: (o[ch] ?? 0) + 1 }), {});
  return { prompt: `Arrangements of the letters of ${word}`, answer: fact(word.length) / Object.values(counts).reduce((p, n) => p * fact(n), 1), ask: "= ?" };
}

const pad3 = (n: number) => String(n).padStart(3, "0");
function bearings(rng: Rng, d: Difficulty): NumericQ {
  if (d === "easy") {
    const [name, deg] = pick(rng, [["east", 90], ["south", 180], ["west", 270], ["north-east", 45], ["south-east", 135], ["south-west", 225], ["north-west", 315]] as [string, number][]);
    return { prompt: `The bearing of due ${name}`, answer: deg, ask: "in degrees = ?" };
  }
  const t = int(rng, 1, 35) * 10 + pick(rng, [0, 5]);
  if (d === "medium") {
    const turn = 5 * int(rng, 5, 30);
    return { prompt: `Facing ${pad3(t)}°, turn ${turn}° clockwise`, answer: (t + turn) % 360, ask: "new bearing = ?" };
  }
  return { prompt: `The bearing of B from A is ${pad3(t)}°`, answer: (t + 180) % 360, ask: "bearing of A from B = ?" };
}

// ── choice skills ──────────────────────────────────────────────────────────
function rounding(rng: Rng, d: Difficulty): ChoiceQ {
  if (d === "easy") {
    const n = int(rng, 101, 9899), to = pick(rng, [10, 100] as const);
    const ans = Math.round(n / to) * to, down = Math.floor(n / to) * to, up = Math.ceil(n / to) * to;
    return { lead: `Round to the nearest ${to}`, prompt: String(n),
      options: four(rng, String(ans), [String(down === ans ? up : down), String(Math.round(n / (to * 10)) * to * 10), String(n - (n % 10))], () => String(ans + to * int(rng, -3, 3))), answer: String(ans) };
  }
  if (d === "medium") {
    // Whole numbers of thousandths, so no floating-point slips (2.675 → 2.68, not 2.67).
    const dp = int(rng, 1, 2), N = int(rng, 10001, 99999), q = 10 ** (3 - dp);
    const show = (v: number, places: number) => (v / 10 ** places).toFixed(places);
    const ans = show(Math.round(N / q), dp), down = show(Math.floor(N / q), dp), up = show(Math.ceil(N / q), dp);
    return { lead: `Round to ${dp} decimal place${dp === 1 ? "" : "s"}`, prompt: show(N, 3),
      options: four(rng, ans, [ans === down ? up : down, show(Math.round(N / 10 ** (dp === 1 ? 1 : 2)), dp === 1 ? 2 : 1), String(Math.round(N / 1000))], () => show(Math.round(N / q) + int(rng, -5, 5), dp)), answer: ans };
  }
  const sf = int(rng, 1, 3), n = int(rng, 10001, 999999);
  const p = 10 ** (String(n).length - sf);
  const ans = Math.round(n / p) * p;
  return { lead: `Round to ${sf} significant figure${sf === 1 ? "" : "s"}`, prompt: n.toLocaleString("en-GB"),
    options: four(rng, ans.toLocaleString("en-GB"), [(Math.round(n / (p * 10)) * p * 10).toLocaleString("en-GB"), (Math.round(n / (p / 10)) * (p / 10)).toLocaleString("en-GB"), String(Number(String(ans).slice(0, sf)))],
      () => (ans + p * int(rng, -3, 3)).toLocaleString("en-GB")), answer: ans.toLocaleString("en-GB") };
}

const line = (m: number, c: number) => `y = ${poly([m, c])}`;
function lines(rng: Rng, d: Difficulty): ChoiceQ {
  const m = pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4, 5]), c = int(rng, 1, 9) * pick(rng, [1, -1]);
  if (d === "easy") {
    return rng() < 0.5
      ? { lead: "The gradient of", prompt: line(m, c), options: four(rng, signed(m), [signed(c), signed(-m), signed(m + 1)], () => signed(int(rng, -9, 9))), answer: signed(m) }
      : { lead: "Where it crosses the y-axis", prompt: line(m, c),
        options: four(rng, `(0, ${signed(c)})`, [`(${signed(c)}, 0)`, `(0, ${signed(m)})`, `(0, ${signed(-c)})`], () => `(0, ${signed(int(rng, -9, 9))})`), answer: `(0, ${signed(c)})` };
  }
  if (d === "medium") {
    const x1 = int(rng, -5, 5), y1 = int(rng, -5, 5), dx = int(rng, 1, 4) * pick(rng, [1, -1]), dy = int(rng, -8, 8);
    const ans = frac(dy, dx);
    return { lead: "Gradient of the line through", prompt: `(${signed(x1)}, ${signed(y1)}) and (${signed(x1 + dx)}, ${signed(y1 + dy)})`,
      options: four(rng, ans, [frac(dx, dy || 1), frac(-dy, dx), frac(dy + dx, dx)], () => frac(int(rng, -9, 9), int(rng, 1, 4))), answer: ans };
  }
  const kind = int(rng, 0, 2);
  if (kind === 0) {
    const ans = frac(-1, m);
    return { lead: "The gradient of a line perpendicular to", prompt: line(m, c), options: four(rng, ans, [signed(m), signed(-m), frac(1, m)], () => frac(int(rng, -5, 5), int(rng, 1, 5))), answer: ans };
  }
  if (kind === 1) {
    const x1 = int(rng, -4, 4), y1 = m * x1 + c;
    const ans = line(m, c);
    return { lead: `The line with gradient ${signed(m)} through`, prompt: `(${signed(x1)}, ${signed(y1)})`,
      options: four(rng, ans, [line(m, -c || 1), line(-m, c), line(m, y1)], () => line(m, int(rng, -9, 9))), answer: ans };
  }
  const x = int(rng, -5, 5), m2 = m === 1 ? 2 : 1, c2 = (m - m2) * x + c, y = m * x + c;
  const ans = `(${signed(x)}, ${signed(y)})`;
  return { lead: "Where the lines meet", prompt: `${line(m, c)} and ${line(m2, c2)}`,
    options: four(rng, ans, [`(${signed(y)}, ${signed(x)})`, `(${signed(-x)}, ${signed(y)})`, `(${signed(x)}, ${signed(-y)})`], () => `(${signed(int(rng, -6, 6))}, ${signed(int(rng, -9, 9))})`), answer: ans };
}

function probability(rng: Rng, d: Difficulty): ChoiceQ {
  if (d === "easy") {
    const r = int(rng, 1, 9), b = int(rng, 1, 9), g = int(rng, 0, 5), t = r + b + g;
    const colour = pick(rng, ["red", "blue"] as const), k = colour === "red" ? r : b;
    const ans = frac(k, t);
    return { lead: `A bag has ${r} red, ${b} blue${g ? ` and ${g} green` : ""} balls. P(${colour})`, prompt: "One ball is picked at random",
      options: four(rng, ans, [frac(t - k, t), `${k}/${t - k || 1}`, frac(1, t)], () => frac(int(rng, 1, t), t)), answer: ans };
  }
  if (d === "medium") {
    const events: [string, number][] = [["an even number", 3], ["a number greater than 4", 2], ["a prime number", 3], ["a multiple of 3", 2], ["a 6", 1], ["a number less than 3", 2], ["a factor of 6", 4]];
    const [what, k] = pick(rng, events);
    const ans = frac(k, 6);
    return { lead: `A fair dice is rolled. P(${what})`, prompt: "1, 2, 3, 4, 5, 6",
      options: four(rng, ans, [frac(6 - k, 6), `${k}/${6 - k}`, frac(k, 12)], () => frac(int(rng, 1, 5), 6)), answer: ans };
  }
  if (rng() < 0.5) {
    const [what, k] = pick(rng, [["two heads", 1], ["one head and one tail", 2], ["at least one head", 3]] as [string, number][]);
    const ans = frac(k, 4);
    return { lead: `Two fair coins are tossed. P(${what})`, prompt: "HH, HT, TH, TT",
      options: four(rng, ans, [frac(1, 2), frac(1, 4), frac(3, 4), frac(1, 3)].filter((x) => x !== ans), () => frac(int(rng, 1, 3), 4)), answer: ans };
  }
  const s = int(rng, 4, 10);
  const k = Math.max(0, 6 - Math.abs(s - 7));
  const ans = frac(k, 36);
  return { lead: `Two dice are rolled. P(the total is ${s})`, prompt: "36 equally likely outcomes",
    options: four(rng, ans, [frac(1, 11), frac(k, 12), frac(k + 1, 36)], () => frac(int(rng, 1, 6), 36)), answer: ans };
}

const SQUAREFREE = [2, 3, 5, 6, 7, 10] as const;
const surd = (k: number, m: number) => (k === 0 ? "0" : `${k === 1 ? "" : k}√${m}`);
function surds(rng: Rng, d: Difficulty): ChoiceQ {
  const m = pick(rng, SQUAREFREE), k = int(rng, 2, 6);
  if (d === "easy") {
    const ans = surd(k, m);
    return { lead: "Simplify", prompt: `√${k * k * m}`, options: four(rng, ans, [surd(m, k), surd(k * k, m), surd(k, m * 2)], () => surd(int(rng, 2, 9), pick(rng, SQUAREFREE))), answer: ans };
  }
  if (d === "medium") {
    if (rng() < 0.5) {
      const a = int(rng, 1, 7), b = int(rng, 1, 7), ans = surd(a + b, m);
      return { lead: "Simplify", prompt: `${surd(a, m)} + ${surd(b, m)}`, options: four(rng, ans, [surd(a + b, 2 * m), surd(a * b, m), `√${(a + b) * m}`], () => surd(int(rng, 2, 14), m)), answer: ans };
    }
    const ans = surd(k, m);
    return { lead: "Simplify", prompt: `√${k * m} × √${k}`,
      options: four(rng, ans, [`√${k * m * k}`, surd(m, k), surd(k * k, m)], () => surd(int(rng, 2, 9), m)), answer: ans };
  }
  if (rng() < 0.5) {
    const a = int(rng, 2, 9), ans = String(a * a - m);
    return { lead: "Simplify", prompt: `(${a} + √${m})(${a} − √${m})`, options: four(rng, ans, [String(a * a + m), String(a * a - m * m), `${a * a} − 2√${m}`], () => String(int(rng, 1, 80))), answer: ans };
  }
  const a = int(rng, 1, 6);
  const g = gcd(a, m), num = a / g, den = m / g;
  const ans = `${num === 1 ? "" : num}√${m}${den === 1 ? "" : `/${den}`}`;
  return { lead: "Rationalise the denominator", prompt: `${a}/√${m}`,
    options: four(rng, ans, [`${a}√${m}`, `√${m}/${a * m}`, `${a}/${m}`], () => `${int(rng, 1, 6)}√${m}/${int(rng, 2, 10)}`), answer: ans };
}

function circles(rng: Rng, d: Difficulty): ChoiceQ {
  const r = int(rng, 2, 12);
  if (d === "easy") {
    const area = rng() < 0.5, ans = area ? `${r * r}π cm²` : `${2 * r}π cm`;
    return { lead: area ? "Area of a circle, in terms of π" : "Circumference of a circle, in terms of π", prompt: `radius ${r} cm`,
      options: four(rng, ans, area ? [`${2 * r}π cm²`, `${r}π cm²`, `${4 * r * r}π cm²`] : [`${r}π cm`, `${r * r}π cm`, `${4 * r}π cm`], () => `${int(rng, 2, 150)}π cm${area ? "²" : ""}`), answer: ans };
  }
  if (d === "medium") {
    const dia = 2 * r, area = rng() < 0.5, ans = area ? `${r * r}π cm²` : `${dia}π cm`;
    return { lead: area ? "Area, in terms of π" : "Circumference, in terms of π", prompt: `a circle with diameter ${dia} cm`,
      options: four(rng, ans, area ? [`${dia * dia}π cm²`, `${dia}π cm²`, `${r}π cm²`] : [`${2 * dia}π cm`, `${r}π cm`, `${r * r}π cm`], () => `${int(rng, 2, 150)}π cm${area ? "²" : ""}`), answer: ans };
  }
  const ang = pick(rng, [30, 45, 60, 90, 120, 180] as const), R = 12 * int(rng, 1, 2); // whole-number answers
  const sector = rng() < 0.5;
  const f = ang / 360;
  const ans = sector ? `${f * R * R}π cm²` : `${f * 2 * R}π cm`;
  return { lead: sector ? "Area of the sector, in terms of π" : "Length of the arc, in terms of π", prompt: `radius ${R} cm, angle ${ang}°`,
    options: four(rng, ans, sector ? [`${f * 2 * R}π cm²`, `${R * R}π cm²`, `${(f * R * R) / 2}π cm²`] : [`${f * R * R}π cm`, `${2 * R}π cm`, `${f * R}π cm`], () => `${int(rng, 1, 60)}π cm${sector ? "²" : ""}`), answer: ans };
}

function inequalities(rng: Rng, d: Difficulty): ChoiceQ {
  const x = int(rng, -6, 9), ops = ["<", ">", "≤", "≥"] as const, op = pick(rng, ops);
  const flip: Record<string, string> = { "<": ">", ">": "<", "≤": "≥", "≥": "≤" };
  if (d === "easy") {
    const b = int(rng, 1, 15), ans = `x ${op} ${signed(x)}`;
    return { lead: "Solve", prompt: `x + ${b} ${op} ${signed(x + b)}`, options: four(rng, ans, [`x ${flip[op]} ${signed(x)}`, `x ${op} ${signed(x + 2 * b)}`, `x ${op} ${signed(x - b)}`], () => `x ${op} ${signed(int(rng, -9, 12))}`), answer: ans };
  }
  if (d === "medium") {
    const a = int(rng, 2, 6), b = int(rng, 1, 9) * pick(rng, [1, -1]), ans = `x ${op} ${signed(x)}`;
    return { lead: "Solve", prompt: `${a}x ${b < 0 ? MINUS : "+"} ${Math.abs(b)} ${op} ${signed(a * x + b)}`,
      options: four(rng, ans, [`x ${flip[op]} ${signed(x)}`, `x ${op} ${signed(a * x)}`, `x ${op} ${signed(x + 1)}`], () => `x ${op} ${signed(int(rng, -9, 12))}`), answer: ans };
  }
  const a = int(rng, 2, 5), b = int(rng, 1, 12), ans = `x ${flip[op]} ${signed(x)}`;
  return { lead: "Solve (careful with the sign!)", prompt: `${b} ${MINUS} ${a}x ${op} ${signed(b - a * x)}`,
    options: four(rng, ans, [`x ${op} ${signed(x)}`, `x ${op} ${signed(-x || 1)}`, `x ${flip[op]} ${signed(-x || 1)}`], () => `x ${pick(rng, ops)} ${signed(int(rng, -9, 12))}`), answer: ans };
}

// ∫ k·xⁿ dx with whole-number answers: k is a multiple of n + 1.
const term = (c: number, p: number) => (p === 0 ? signed(c) : `${c === 1 ? "" : c === -1 ? MINUS : signed(c)}x${p === 1 ? "" : sup(p)}`);
function integration(rng: Rng, d: Difficulty): ChoiceQ {
  if (d === "easy") {
    const n = int(rng, 1, 5), c = (n + 1) * int(rng, 1, 4), ans = `${term(c / (n + 1), n + 1)} + c`;
    return { lead: "Integrate", prompt: `∫ ${term(c, n)} dx`,
      options: four(rng, ans, [`${term(c * n, n - 1)} + c`, `${term(c, n + 1)} + c`, `${term(c / (n + 1), n)} + c`], () => `${term(int(rng, 1, 9), int(rng, 1, 6))} + c`), answer: ans };
  }
  if (d === "medium") {
    const n = int(rng, 2, 4), a = (n + 1) * int(rng, 1, 3), b = 2 * int(rng, 1, 5), k = int(rng, 1, 9);
    const ans = `${poly([...Array(n + 2)].map((_, i) => (i === 0 ? a / (n + 1) : i === n - 1 ? b / 2 : i === n ? k : 0)))} + c`;
    const wrong1 = `${poly([...Array(n)].map((_, i) => (i === 0 ? a * n : i === n - 1 ? b : 0)))} + c`; // differentiated instead
    const wrong2 = `${poly([...Array(n + 2)].map((_, i) => (i === 0 ? a : i === n - 1 ? b : i === n ? k : 0)))} + c`;
    const wrong3 = `${poly([...Array(n + 2)].map((_, i) => (i === 0 ? a / (n + 1) : i === n - 1 ? b / 2 : 0)))} + c`;
    return { lead: "Integrate", prompt: `∫ (${poly([...Array(n + 1)].map((_, i) => (i === 0 ? a : i === n - 1 ? b : i === n ? k : 0)))}) dx`,
      options: four(rng, ans, [wrong1, wrong2, wrong3], () => `${term(int(rng, 1, 9), int(rng, 2, 5))} + c`), answer: ans };
  }
  // ∫₀ᵗ (a x + b) dx = a t²/2 + b t
  const a = 2 * int(rng, 1, 5), b = int(rng, 0, 9), t = int(rng, 1, 5);
  const v = (a * t * t) / 2 + b * t, ans = String(v);
  return { lead: `Work out ∫ from 0 to ${t}`, prompt: `(${poly([a, b])}) dx`,
    options: four(rng, ans, [String(a * t + b), String(a * t * t + b * t), String(v + b)], () => String(int(rng, 1, 150))), answer: ans };
}

export function moreChoice(skill: MoreChoiceSkill, d: Difficulty, rng: Rng = Math.random): ChoiceQ {
  switch (skill) {
    case "rounding": return rounding(rng, d);
    case "lines": return lines(rng, d);
    case "probability": return probability(rng, d);
    case "surds": return surds(rng, d);
    case "circles": return circles(rng, d);
    case "inequalities": return inequalities(rng, d);
    case "integration": return integration(rng, d);
    case "time": return time(rng, d);
    case "fdp": return fdp(rng, d);
    case "negatives": return negatives(rng, d);
    case "matrices": return matrices(rng, d);
  }
}

// ── second batch: choice ───────────────────────────────────────────────────
const clock12 = (mins: number) => { const m = ((mins % 720) + 720) % 720, h = Math.floor(m / 60); return `${h === 0 ? 12 : h}:${String(m % 60).padStart(2, "0")}`; };
const clock24 = (mins: number) => { const m = ((mins % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
const hm = (mins: number) => `${Math.floor(mins / 60)} h ${mins % 60} min`;
function time(rng: Rng, d: Difficulty): ChoiceQ {
  if (d === "easy") {
    const start = int(rng, 13, 140) * 5, add = 5 * int(rng, 3, 18), ans = clock12(start + add);
    return { lead: `What time is it ${add} minutes after`, prompt: clock12(start),
      options: four(rng, ans, [clock12(start - add), clock12(start + add + 60), clock12(start + add - 10)], () => clock12(start + 5 * int(rng, 1, 40))), answer: ans };
  }
  if (d === "medium") {
    if (rng() < 0.5) {
      const m = 12 * 60 + int(rng, 1, 143) * 5, ans = clock24(m);
      return { lead: "Write in 24-hour time", prompt: `${clock12(m)} pm`, options: four(rng, ans, [clock24(m - 720), clock24(m + 60), `${clock12(m)}`.padStart(5, "0")], () => clock24(m + 5 * int(rng, -20, 20))), answer: ans };
    }
    const a = int(rng, 84, 180) * 5, len = 5 * int(rng, 7, 40), ans = hm(len);
    return { lead: "How long is it", prompt: `from ${clock24(a)} to ${clock24(a + len)}`, options: four(rng, ans, [hm(len + 60), hm(Math.abs(len - 40) + 5), hm(len + 40)], () => hm(5 * int(rng, 7, 50))), answer: ans };
  }
  const dep = int(rng, 240, 287) * 5, len = 5 * int(rng, 18, 60), ans = clock24(dep + len);
  return { lead: `A night bus leaves at ${clock24(dep)} and takes ${hm(len)}. It arrives at`, prompt: "?",
    options: four(rng, ans, [clock24(dep + len - 60), clock24(dep + len + 40), clock24(dep + len + 720)], () => clock24(dep + 5 * int(rng, 10, 80))), answer: ans };
}

const FDP: [number, number][] = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [1, 20], [3, 20], [7, 20], [9, 20], [1, 8], [3, 8], [1, 25], [12, 25]];
const dec = (n: number, dn: number) => String(n / dn);
function fdp(rng: Rng, d: Difficulty): ChoiceQ {
  const [n, dn] = pick(rng, d === "easy" ? FDP.slice(0, 10) : FDP);
  const pc = `${(n * 100) / dn}%`, fr = frac(n, dn), dc = dec(n, dn);
  const way = d === "easy" ? 0 : d === "medium" ? int(rng, 1, 2) : int(rng, 3, 4);
  if (way === 0) return { lead: "As a percentage", prompt: fr, options: four(rng, pc, [`${n}${dn}%`, `${dn}%`, `${(n * 10) / dn}%`], () => `${5 * int(rng, 1, 19)}%`), answer: pc };
  if (way === 1) return { lead: "As a fraction in its simplest form", prompt: dc, options: four(rng, fr, [`${(n * 100) / dn}/10`, frac(dn, n * 10), frac(n + 1, dn)], () => frac(int(rng, 1, 9), pick(rng, [4, 5, 8, 10, 20]))), answer: fr };
  if (way === 2) return { lead: "As a decimal", prompt: fr, options: four(rng, dc, [`${n}.${dn}`, String((n / dn) * 10), String(n / dn / 10)], () => String(int(rng, 1, 99) / 100)), answer: dc };
  if (way === 3) return { lead: "As a fraction in its simplest form", prompt: pc, options: four(rng, fr, [frac(n * 100 / dn, 10), `${n * 100 / dn}/1000`, frac(n + 1, dn)], () => frac(int(rng, 1, 19), 20)), answer: fr };
  const r = pick(rng, [[1, 3], [2, 3], [1, 9], [4, 9], [1, 6], [5, 6]] as [number, number][]);
  const rec: Record<string, string> = { "1/3": "0.3̇", "2/3": "0.6̇", "1/9": "0.1̇", "4/9": "0.4̇", "1/6": "0.16̇", "5/6": "0.83̇" };
  const ans = frac(r[0], r[1]);
  return { lead: "As a fraction", prompt: rec[ans], options: four(rng, ans, Object.keys(rec).filter((k) => k !== ans).slice(0, 3), () => frac(int(rng, 1, 8), 9)), answer: ans };
}

function negatives(rng: Rng, d: Difficulty): ChoiceQ {
  const n = (x: number) => (x < 0 ? `(${signed(x)})` : String(x));
  let prompt: string, v: number;
  if (d === "easy") {
    const a = int(rng, 1, 12), b = int(rng, 1, 15), c = int(rng, 1, 10);
    [prompt, v] = rng() < 0.5 ? [`${signed(-a)} + ${b}`, b - a] : [`${b} − ${b + c}`, -c];
  }
  else if (d === "medium") {
    const a = int(rng, 2, 12), b = int(rng, 2, 12);
    [prompt, v] = pick(rng, [[`${signed(-a)} × ${n(-b)}`, a * b], [`${signed(-a)} − ${b}`, -a - b], [`${a} × ${n(-b)}`, -a * b], [`${signed(-a * b)} ÷ ${b}`, -a]] as [string, number][]);
  } else {
    const a = int(rng, 2, 4), b = int(rng, 2, 6), c = int(rng, 1, 9);
    [prompt, v] = pick(rng, [[`(${signed(-a)})³`, -(a ** 3)], [`(${signed(-a)})²`, a * a], [`${signed(-b * a)} ÷ ${n(-a)} + ${n(-c)}`, b - c], [`${n(-a)} × ${n(-b)} − ${c * 3}`, a * b - c * 3]] as [string, number][]);
  }
  const ans = signed(v);
  return { lead: "Work out", prompt, options: four(rng, ans, [signed(-v), signed(v + 2), signed(v - 1)], () => signed(int(rng, -30, 30))), answer: ans };
}

const mat = (m: number[]) => `[${signed(m[0])} ${signed(m[1])} ; ${signed(m[2])} ${signed(m[3])}]`;
function matrices(rng: Rng, d: Difficulty): ChoiceQ {
  const A = [0, 0, 0, 0].map(() => int(rng, -5, 9)), B = [0, 0, 0, 0].map(() => int(rng, -5, 9));
  if (d === "easy") {
    const ans = mat(A.map((x, i) => x + B[i]));
    return { lead: "A + B, where", prompt: `A = ${mat(A)}, B = ${mat(B)}`, options: four(rng, ans, [mat(A.map((x, i) => x - B[i])), mat(A.map((x, i) => x * B[i])), mat(A.map((x, i) => x + B[3 - i]))], () => mat(A.map((x) => x + int(rng, -3, 3)))), answer: ans };
  }
  if (d === "medium") {
    const det = A[0] * A[3] - A[1] * A[2], ans = signed(det);
    return { lead: "The determinant of", prompt: mat(A), options: four(rng, ans, [signed(A[0] * A[3] + A[1] * A[2]), signed(-det), signed(A[0] * A[1] - A[2] * A[3])], () => signed(int(rng, -40, 60))), answer: ans };
  }
  const P = [A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3], A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3]];
  const ans = mat(P);
  return { lead: "AB, where", prompt: `A = ${mat(A)}, B = ${mat(B)}`, options: four(rng, ans, [mat(A.map((x, i) => x * B[i])), mat([B[0] * A[0] + B[1] * A[2], B[0] * A[1] + B[1] * A[3], B[2] * A[0] + B[3] * A[2], B[2] * A[1] + B[3] * A[3]]), mat(P.map((x) => x + 1))], () => mat(P.map((x) => x + int(rng, -4, 4)))), answer: ans };
}

// True or False: is this number prime?
const isPrime = (n: number) => { if (n < 2) return false; for (let k = 2; k * k <= n; k++) if (n % k === 0) return false; return true; };
const TRICKY = [51, 57, 87, 91, 119, 133, 143, 161, 169, 187, 1, 2, 27, 49, 77];
export function primeStatement(d: Difficulty, rng: Rng = Math.random): { text: string; isTrue: boolean } {
  const top = d === "easy" ? 30 : d === "medium" ? 100 : 200;
  const n = d !== "easy" && rng() < 0.35 ? pick(rng, TRICKY.filter((x) => x <= top)) : int(rng, 1, top);
  return { text: `${n} is a prime number`, isTrue: isPrime(n) };
}
