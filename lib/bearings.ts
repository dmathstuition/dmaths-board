// Bearings and distance, worked the WAEC way. Pure: the board's Bearings
// tool draws these and reveals the working one step at a time.
//
// Coordinates: x = east, y = north. A bearing is measured from north,
// clockwise, written with three figures.

export const norm = (deg: number) => ((deg % 360) + 360) % 360;
export const pad3 = (deg: number) => String(Math.round(norm(deg)) % 360).padStart(3, "0");
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
export const r1 = (n: number) => Math.round(n * 10) / 10;
const f1 = (n: number) => r1(n).toFixed(1).replace(/\.0$/, "");
const f2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

export const backBearing = (b: number) => norm(b + 180);
// "065° + 180° = 245°" / "308° − 180° = 128°"
export const backBearingLine = (b: number) => (norm(b) < 180 ? `${pad3(b)}° + 180° = ${pad3(b + 180)}°` : `${pad3(b)}° − 180° = ${pad3(b - 180)}°`);

export type Pt = { x: number; y: number };
export const move = (from: Pt, d: number, b: number): Pt => ({ x: from.x + d * Math.sin(rad(b)), y: from.y + d * Math.cos(rad(b)) });
export const bearingOf = (to: Pt, from: Pt) => norm(deg(Math.atan2(to.x - from.x, to.y - from.y)));
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

// The north/south and east/west parts of a journey of d on bearing b, using
// the acute angle to the north–south line (north/south uses cos, east/west sin).
export function parts(d: number, b: number) {
  const t = norm(b);
  const alpha = t <= 90 ? t : t <= 180 ? 180 - t : t <= 270 ? t - 180 : 360 - t;
  const ns = t <= 90 || t >= 270 ? "North" : "South", ew = t <= 180 ? "East" : "West";
  const nsLen = d * Math.cos(rad(alpha)), ewLen = d * Math.sin(rad(alpha));
  return {
    alpha, ns, ew, nsLen, ewLen,
    lines: [
      `${ns} = ${f1(d)} cos ${f1(alpha)}° = ${f1(nsLen)}`,
      `${ew} = ${f1(d)} sin ${f1(alpha)}° = ${f1(ewLen)}`,
    ],
  };
}

// The angle between two bearings at a point, inside the triangle (0–180°),
// with how to write it: "220° − 120° = 100°".
function between(a: number, b: number) {
  const hi = Math.max(norm(a), norm(b)), lo = Math.min(norm(a), norm(b));
  const diff = hi - lo;
  return diff <= 180
    ? { angle: diff, line: `${pad3(hi)}° − ${pad3(lo)}° = ${f1(diff)}°` }
    : { angle: 360 - diff, line: `360° − (${pad3(hi)}° − ${pad3(lo)}°) = ${f1(360 - diff)}°` };
}

export type Solved = {
  pts: [Pt, Pt, Pt];            // the three points, in the problem's order
  names: [string, string, string];
  steps: string[];              // the working, one line each
  length: number;               // the side asked for
  bearing: number;              // the bearing asked for (exact)
  answer: string;               // the two answers, in words
};

// Shared: triangle with a known included angle `A` at vertex V between sides
// p (V→P) and q (V→Q). Finds PQ and the angle at P (opposite q), with the working.
function solveSAS(p: number, q: number, A: number, names: { V: string; P: string; Q: string }, unit: string, P: Pt, Q: Pt, V: Pt) {
  const right = Math.abs(A - 90) < 0.05;
  const len = dist(P, Q), side = `${names.P}${names.Q}`;
  // The angle at P, from the points themselves (right even when it's obtuse).
  const angP = between(bearingOf(V, P), bearingOf(Q, P)).angle;
  const steps = right ? [
    `∠${names.P}${names.V}${names.Q} = 90°, so use Pythagoras: ${side}² = ${f1(p)}² + ${f1(q)}² = ${f1(p * p + q * q)}`,
    `${side} = ${f1(len)} ${unit}`,
    `tan ${names.P} = ${f1(q)} ÷ ${f1(p)}, so ${names.P} = ${f1(angP)}°`,
  ] : [
    `Cosine rule: ${side}² = ${f1(p)}² + ${f1(q)}² − 2(${f1(p)})(${f1(q)}) cos ${f1(A)}° = ${f2(len * len)}`,
    `${side} = ${f1(len)} ${unit}`,
    `Sine rule: sin ${names.P} ÷ ${f1(q)} = sin ${f1(A)}° ÷ ${f2(len)}, so ${names.P} = ${f1(angP)}°${angP > 90 ? " (obtuse: 180° − the calculator's angle)" : ""}`,
  ];
  return { len, angP, steps };
}

// "Base ± angle", whichever gives the true bearing.
function bearingLine(base: number, angle: number, truth: number, what: string) {
  const plus = Math.abs(norm(base + angle) - truth) < 0.05 || Math.abs(norm(base + angle) - truth) > 359.95;
  const raw = plus ? base + angle : base - angle;
  const v = f1(norm(raw)), [whole, dec] = v.split(".");
  const shown = `${pad3(base)}° ${plus ? "+" : "−"} ${f1(angle)}° = ${whole.padStart(3, "0")}${dec ? `.${dec}` : ""}°`;
  return `${what} = ${shown} ≈ ${pad3(truth)}°`;
}

// A journey of two legs: S → M (d1 on b1), then M → E (d2 on b2).
// Asks for SE and the bearing of E from S.
export function journey(d1: number, b1: number, d2: number, b2: number, names: [string, string, string] = ["H", "A", "B"], unit = "km"): Solved {
  const [S, M, E] = names;
  const s: Pt = { x: 0, y: 0 }, m = move(s, d1, b1), e = move(m, d2, b2);
  const back = backBearing(b1);
  const inc = between(back, b2);
  const steps = [
    `Back bearing of ${S} from ${M} = ${backBearingLine(b1)}`,
    `∠${S}${M}${E} = ${inc.line}`,
  ];
  const { len, angP, steps: sas } = solveSAS(d1, d2, inc.angle, { V: M, P: S, Q: E }, unit, s, e, m);
  const truth = bearingOf(e, s);
  steps.push(...sas, bearingLine(b1, angP, truth, `Bearing of ${E} from ${S}`));
  return { pts: [s, m, e], names, steps, length: len, bearing: truth, answer: `${S}${E} = ${f1(len)} ${unit}; bearing of ${E} from ${S} = ${pad3(truth)}°` };
}

// Two points from one place: P (d1 on b1 from O) and Q (d2 on b2 from O).
// Asks for PQ and the bearing of Q from P.
export function fromOnePoint(d1: number, b1: number, d2: number, b2: number, names: [string, string, string] = ["A", "B", "C"], unit = "km"): Solved {
  const [O, P, Q] = names;
  const o: Pt = { x: 0, y: 0 }, p = move(o, d1, b1), q = move(o, d2, b2);
  const inc = between(b1, b2);
  const steps = [`∠${P}${O}${Q} = ${inc.line}`];
  const { len, angP, steps: sas } = solveSAS(d1, d2, inc.angle, { V: O, P, Q }, unit, p, q, o);
  steps.push(...sas);
  const back = backBearing(b1);
  steps.push(`Back bearing of ${O} from ${P} = ${backBearingLine(b1)}`);
  steps.push(bearingLine(back, angP, bearingOf(q, p), `Bearing of ${Q} from ${P}`));
  return { pts: [o, p, q], names, steps, length: len, bearing: bearingOf(q, p), answer: `${P}${Q} = ${f1(len)} ${unit}; bearing of ${Q} from ${P} = ${pad3(bearingOf(q, p))}°` };
}

// The worked examples from the lesson, ready to load.
export type Preset = { id: string; label: string; kind: "journey" | "fan"; d1: number; b1: number; d2: number; b2: number; names: [string, string, string] };
export const PRESETS: Preset[] = [
  { id: "ex5", label: "Example 5 (right angle)", kind: "journey", d1: 12, b1: 50, d2: 15, b2: 140, names: ["P", "Q", "R"] },
  { id: "ex6", label: "Example 6 (cosine rule)", kind: "journey", d1: 8, b1: 40, d2: 6, b2: 120, names: ["H", "A", "B"] },
  { id: "q5", label: "Activity B Q5", kind: "journey", d1: 15, b1: 70, d2: 9, b2: 200, names: ["X", "Y", "Z"] },
  { id: "hw2", label: "Homework 2", kind: "journey", d1: 25, b1: 65, d2: 18, b2: 130, names: ["P", "Q", "R"] },
  { id: "q4", label: "Activity B Q4", kind: "fan", d1: 9, b1: 30, d2: 12, b2: 120, names: ["A", "B", "C"] },
];
