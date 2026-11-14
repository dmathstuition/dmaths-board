// Division, broken down — the board's division tool (components/live/board/
// DivisionPanel.tsx). One division, five ways of seeing it, each a step at a
// time: sharing equally, grouping (jumps back on a number line), chunking,
// short division ("bus stop") and long division. The remainder can be left as
// a remainder, a fraction or a decimal, and every one ends with the check
// (quotient × divisor + remainder = the number). Learners can also do one
// themselves on their phones, a question at a time. Pure.
import type { Panel } from "@/lib/boardTools";
import { working as columnWorking, type Working } from "@/lib/mathsMore";

export type DivMethod = "share" | "group" | "chunk" | "short" | "long";
export type RemForm = "r" | "fraction" | "decimal";
export const DIV_METHODS: { k: DivMethod; label: string; hint: string; a: [number, number]; b: [number, number]; maxQ?: number }[] = [
  { k: "share", label: "Sharing", hint: "Share counters equally into groups", a: [1, 60], b: [2, 10], maxQ: 15 },
  { k: "group", label: "Grouping", hint: "How many jumps of the divisor fit — on a number line", a: [1, 150], b: [2, 12], maxQ: 20 },
  { k: "chunk", label: "Chunking", hint: "Take away big, easy multiples", a: [1, 9999], b: [2, 99] },
  { k: "short", label: "Short division", hint: "The bus stop, carrying remainders", a: [1, 99999], b: [2, 12] },
  { k: "long", label: "Long division", hint: "Divide, multiply, subtract, bring down", a: [1, 99999], b: [2, 99] },
];
export const methodOf = (k: DivMethod) => DIV_METHODS.find((m) => m.k === k)!;
export const REM_FORMS: Record<RemForm, string> = { r: "Remainder", fraction: "Fraction", decimal: "Decimal" };

export type DivState = Panel & { a: number; b: number; method: DivMethod; step: number; ask: boolean; shown: boolean; rem: RemForm; tryOn: boolean; tryId: number };
export const DEFAULT_DIVISION: DivState = { on: false, x: 0.06, y: 0.04, a: 96, b: 4, method: "short", step: 0, ask: false, shown: false, rem: "r", tryOn: false, tryId: 0 };

const int = (v: unknown, lo: number, hi: number, d: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);

// The numbers, kept to what each method can show (sharing and grouping stay small enough to draw).
export function fitDiv(method: DivMethod, a: unknown, b: unknown): [number, number] {
  const m = methodOf(method);
  const y = int(b, m.b[0], m.b[1], Math.min(m.b[1], Math.max(m.b[0], 4)));
  let x = int(a, m.a[0], m.a[1], 96);
  if (m.maxQ) x = Math.min(x, m.maxQ * y + y - 1);
  return [x, y];
}
export function cleanDivision(v: any): DivState {
  const d = DEFAULT_DIVISION, method: DivMethod = DIV_METHODS.some((m) => m.k === v?.method) ? v.method : d.method;
  const [a, b] = fitDiv(method, v?.a, v?.b), rem: RemForm = v?.rem in REM_FORMS ? v.rem : "r";
  const s: DivState = { on: !!v?.on, x: Math.min(0.95, Math.max(0, Number(v?.x) || d.x)), y: Math.min(0.95, Math.max(0, Number(v?.y) || d.y)), a, b, method, step: 0, ask: !!v?.ask, shown: !!v?.shown, rem, tryOn: !!v?.tryOn, tryId: int(v?.tryId, 0, 1e9, 0) };
  return { ...s, step: int(v?.step, 0, breakdown(s).steps.length - 1, 0) };
}
// A sum that suits the method (a remainder now and then).
export function randomDiv(method: DivMethod, r: () => number = Math.random): [number, number] {
  const m = methodOf(method), b = m.b[0] + Math.floor(r() * (Math.min(m.b[1], method === "long" || method === "chunk" ? 25 : 12) - m.b[0] + 1));
  const qMax = m.maxQ ?? (method === "short" || method === "long" ? 999 : 250);
  const q = Math.max(2, Math.floor(r() * qMax) + 1), rem = r() < 0.4 ? Math.floor(r() * b) : 0;
  return fitDiv(method, q * b + rem, b);
}

// ── The answer, every way ──
export function decimalOf(a: number, b: number, most = 4): { text: string; recurring: boolean; exact: boolean } {
  const q = Math.floor(a / b);
  let r = a % b, digits = "";
  const seen = new Map<number, number>();
  let recurring = false;
  while (r && digits.length < most) {
    if (seen.has(r)) recurring = true; // the same remainder again: the digits repeat from here
    seen.set(r, digits.length);
    r *= 10; digits += String(Math.floor(r / b)); r %= b;
  }
  if (r && seen.has(r)) recurring = true;
  return { text: digits ? `${q}.${digits}${r ? "…" : ""}` : String(q), recurring, exact: !r };
}
export function answerText(a: number, b: number, form: RemForm): string {
  const q = Math.floor(a / b), r = a % b;
  if (!r) return String(q);
  if (form === "r") return `${q} r ${r}`;
  if (form === "fraction") { const g = gcd(r, b); return `${q ? `${q} ` : ""}${r / g}/${b / g}`; }
  return decimalOf(a, b).text;
}
export const checkText = (a: number, b: number) => { const q = Math.floor(a / b), r = a % b; return `${q} × ${b}${r ? ` + ${r}` : ""} = ${a}`; };

// ── The steps ──
// say: what the step shows; ask: the question for the class before it's shown;
// mult: which multiple of the divisor it uses (lit up in the times-table strip).
export type DivStep = { say: string; ask?: string; mult?: number };
export type Breakdown = { steps: DivStep[]; answer: string; check: string;
  share?: { groups: number[]; left: number }[];                         // sharing: each group's counters, and those left, at each step
  jumps?: number[];                                                      // grouping: how many jumps are drawn at each step
  chunks?: { from: number; m: number; to: number }[];                    // chunking: every chunk (shown up to the step)
  chunkAt?: number[];                                                    // chunking: how many chunks shown at each step
  short?: { q: string[]; carry: (number | null)[]; digits: string[]; dot: number | null; at: number[] }; // bus stop
  long?: Working };

function finish(a: number, b: number, form: RemForm): DivStep[] {
  const q = Math.floor(a / b), r = a % b, out: DivStep[] = [];
  if (r && form === "fraction") { const g = gcd(r, b); out.push({ say: `The remainder ${r} is ${r} out of ${b} — the fraction ${r}/${b}${g > 1 ? ` = ${r / g}/${b / g}` : ""}. So ${a} ÷ ${b} = ${answerText(a, b, form)}.`, ask: `How do we write the remainder ${r} as a fraction of ${b}?` }); }
  out.push({ say: `Check by multiplying: ${checkText(a, b)} ✓`, ask: "How can we check the answer?", mult: q <= 12 ? q : undefined });
  return out;
}

function sharing(a: number, b: number, form: RemForm): Breakdown {
  const q = Math.floor(a / b), r = a % b, steps: DivStep[] = [], share: Breakdown["share"] = [];
  const at = (k: number) => ({ groups: Array(b).fill(k), left: a - k * b });
  steps.push({ say: `Share ${a} counters equally into ${b} groups. Give one to each group, again and again, until there aren't enough to go round.` }); share.push(at(0));
  for (let k = 1; k <= q; k++) {
    steps.push({ say: `Round ${k}: one more in each group — ${k} in each. ${a - k * b} left.`, ask: `${a - (k - 1) * b} left. After one more in each of the ${b} groups, how many are left?`, mult: k });
    share.push(at(k));
  }
  steps.push({ say: `${r ? `Only ${r} left — not enough for another round. ` : "None left. "}Each group has ${q}, so ${a} ÷ ${b} = ${q}${r ? ` remainder ${r}` : ""}.`, ask: "How many are in each group? Is any left over?" }); share.push(at(q));
  for (const s of finish(a, b, form)) { steps.push(s); share.push(at(q)); }
  return { steps, share, answer: answerText(a, b, form), check: checkText(a, b) };
}

function grouping(a: number, b: number, form: RemForm): Breakdown {
  const q = Math.floor(a / b), r = a % b, steps: DivStep[] = [], jumps: number[] = [];
  steps.push({ say: `How many ${b}s are in ${a}? Start at ${a} on the number line and jump back ${b} at a time until you can't.` }); jumps.push(0);
  for (let k = 1; k <= q; k++) {
    steps.push({ say: `Jump ${k}: ${a - (k - 1) * b} − ${b} = ${a - k * b}.`, ask: `Where do we land jumping back ${b} from ${a - (k - 1) * b}?`, mult: k });
    jumps.push(k);
  }
  steps.push({ say: `${q} jumps of ${b}${r ? `, and ${r} left before 0 — too small for another jump` : " — landing exactly on 0"}. So ${a} ÷ ${b} = ${q}${r ? ` remainder ${r}` : ""}.`, ask: "How many jumps did we make? Anything left?" }); jumps.push(q);
  for (const s of finish(a, b, form)) { steps.push(s); jumps.push(q); }
  return { steps, jumps, answer: answerText(a, b, form), check: checkText(a, b) };
}

const FRIENDLY = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
function chunking(a: number, b: number, form: RemForm): Breakdown {
  const steps: DivStep[] = [], chunks: { from: number; m: number; to: number }[] = [], chunkAt: number[] = [];
  steps.push({ say: `${a} ÷ ${b}: take away big, easy multiples of ${b} (10 ×, 5 ×, 2 × …) until less than ${b} is left. Then add up how many ${b}s you took.` }); chunkAt.push(0);
  let rem = a;
  while (rem >= b) {
    const m = FRIENDLY.find((f) => f * b <= rem)!;
    chunks.push({ from: rem, m, to: rem - m * b });
    steps.push({ say: `${m} × ${b} = ${m * b}. Take it away: ${rem} − ${m * b} = ${rem - m * b}.`, ask: `What's a big, easy multiple of ${b} that fits into ${rem}?`, mult: m <= 10 ? m : undefined });
    chunkAt.push(chunks.length); rem -= m * b;
  }
  const q = Math.floor(a / b);
  steps.push({ say: `${rem ? `${rem} is less than ${b}, so it's the remainder. ` : ""}Add up the ${b}s taken away: ${chunks.map((c) => c.m).join(" + ")} = ${q}. So ${a} ÷ ${b} = ${q}${rem ? ` remainder ${rem}` : ""}.`, ask: `How many ${b}s did we take away altogether?` }); chunkAt.push(chunks.length);
  for (const s of finish(a, b, form)) { steps.push(s); chunkAt.push(chunks.length); }
  return { steps, chunks, chunkAt, answer: answerText(a, b, form), check: checkText(a, b) };
}

// Short division: the digits in the bus stop, each step one digit (and, for a decimal answer, the 0s after the point).
function shortDiv(a: number, b: number, form: RemForm): Breakdown {
  const digits = String(a).split(""), q: string[] = [], carry: (number | null)[] = [], at: number[] = [], steps: DivStep[] = [];
  let dot: number | null = null;
  steps.push({ say: `Write ${a} under the bus stop and ${b} outside. Work from the left: how many ${b}s go into each digit? Carry any remainder to the next digit.` }); at.push(0);
  let r = 0;
  const one = (i: number, d: number, after: boolean) => {
    const cur = r * 10 + d, t = Math.floor(cur / b), left = cur - t * b, more = i < digits.length - 1 || after;
    q[i] = String(t); r = left;
    carry[i + 1] = left && more ? left : null;
    const lead = !q.slice(0, i).some((x) => x && x !== "0") && t === 0 && more && dot == null;
    steps.push({ say: lead ? `${b} into ${cur} doesn't go: write 0 (or leave it), and carry the ${cur} to the next digit.` : `${b} into ${cur} goes ${t}${t ? ` (${t} × ${b} = ${t * b})` : ""}${left ? `, remainder ${left}${more ? `. Carry the ${left}` : ""}` : ""}.`,
      ask: `How many ${b}s in ${cur}?`, mult: t || undefined });
    at.push(i + 1);
  };
  digits.forEach((d, i) => one(i, Number(d), false));
  if (r && form === "decimal") {
    dot = digits.length;
    steps.push({ say: `There's ${r} left, so put a decimal point after the ${digits[digits.length - 1]} and write 0s after it. The ${r} carries on into the first 0.`, ask: "There's a remainder. How can we carry on dividing?" });
    carry[digits.length] = r; at.push(digits.length);
    const seen = new Set<number>();
    for (let k = 0; k < 4 && r; k++) {
      if (seen.has(r)) { steps.push({ say: `The same remainder, ${r}, again — the digits repeat for ever: it's a recurring decimal.` }); at.push(digits.length + k); break; }
      seen.add(r); digits.push("0"); one(digits.length - 1, 0, k < 3);
    }
  }
  const rem = a % b;
  steps.push({ say: `So ${a} ÷ ${b} = ${answerText(a, b, form)}${rem && form === "r" ? ` — the last remainder, ${rem}, is left over` : ""}.`, ask: "What's the answer?" }); at.push(digits.length);
  for (const s of finish(a, b, form === "decimal" ? "r" : form).slice(form === "fraction" ? 0 : -1)) { steps.push(s); at.push(digits.length); }
  return { steps, short: { q, carry, digits, dot, at }, answer: answerText(a, b, form), check: checkText(a, b) };
}

function longDiv(a: number, b: number, form: RemForm): Breakdown {
  const w = columnWorking({ op: "div", a, b });
  // The class is asked each "how many" and each subtraction before it's shown.
  const steps: DivStep[] = w.steps.map((say) => {
    const goes = say.match(/^(\d+) into (\d+) goes (\d+) time/), sub = say.match(/^Subtract: (\d+) − (\d+)/);
    return goes ? { say, ask: `How many ${b}s in ${goes[2]}?`, mult: Number(goes[3]) || undefined } : sub ? { say, ask: `What is ${sub[1]} − ${sub[2]}?` } : { say };
  });
  for (const s of finish(a, b, form)) steps.push(s);
  return { steps, long: w, answer: answerText(a, b, form), check: checkText(a, b) };
}

export function breakdown(s: Pick<DivState, "a" | "b" | "method" | "rem">): Breakdown {
  const [a, b] = fitDiv(s.method, s.a, s.b);
  switch (s.method) {
    case "share": return sharing(a, b, s.rem);
    case "group": return grouping(a, b, s.rem);
    case "chunk": return chunking(a, b, s.rem);
    case "long": return longDiv(a, b, s.rem);
    default: return shortDiv(a, b, s.rem);
  }
}

// ── Learners do one themselves (short division, a question at a time) ──
export type TryPrompt = { ask: string; answer: number; hint: string; digit: number; kind: "goes" | "left" };
export function tryPlan(a: number, b: number): TryPrompt[] {
  const out: TryPrompt[] = [], digits = String(a).split("").map(Number);
  let r = 0;
  digits.forEach((d, i) => {
    const cur = r * 10 + d, t = Math.floor(cur / b), left = cur - t * b, last = i === digits.length - 1;
    out.push({ ask: `How many ${b}s in ${cur}?`, answer: t, digit: i, kind: "goes", hint: t ? `${t} × ${b} = ${t * b}, and ${t + 1} × ${b} = ${(t + 1) * b} is more than ${cur}.` : `${b} is more than ${cur}, so it goes 0 times.` });
    out.push({ ask: last ? `What's left over at the end — the remainder?` : `${cur} − ${t * b}: what's left to carry to the next digit?`, answer: left, digit: i, kind: "left", hint: `${cur} − ${t} × ${b} = ${cur} − ${t * b}.` });
    r = left;
  });
  return out;
}
