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

export type MoreNumericSkill = "angles" | "area" | "ratio" | "averages" | "powers" | "functions";
export type MoreChoiceSkill = "rounding" | "lines" | "probability" | "surds" | "circles" | "inequalities" | "integration";
export const MORE_NUMERIC: readonly string[] = ["angles", "area", "ratio", "averages", "powers", "functions"];
export const MORE_CHOICE: readonly string[] = ["rounding", "lines", "probability", "surds", "circles", "inequalities", "integration"];

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
  }
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
  }
}
