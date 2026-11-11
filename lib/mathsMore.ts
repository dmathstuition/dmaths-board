// Five more maths tools on the board — pure: the column methods (addition,
// subtraction, long multiplication and long division, a step at a time), the
// bar model, the function machine, the probability spinner and angle facts.
// What each holds, how it's cleaned as it arrives over the class channel, and
// the sums behind them.
import type { Panel } from "@/lib/boardTools";

const clamp = (n: unknown, lo: number, hi: number, d: number) => { const v = Number(n); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const int = (n: unknown, lo: number, hi: number, d: number) => Math.round(clamp(n, lo, hi, d));
const panel = (p: any, d: Panel): Panel => ({ on: !!p?.on, x: clamp(p?.x, 0, 0.95, d.x), y: clamp(p?.y, 0, 0.95, d.y) });
const str = (x: unknown, n: number) => String(x ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
export const tidy = (x: number) => { const r = Math.round(x * 100) / 100; return `${r < 0 ? "−" : ""}${Math.abs(r)}`; };
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const digits = (n: number) => String(n).split("").map(Number).reverse(); // ones first
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// ═══ Column methods ═══════════════════════════════════════════════════════
export type ColOp = "add" | "sub" | "mul" | "div";
export const COL_OPS: ColOp[] = ["add", "sub", "mul", "div"];
export const COL_SIGNS: Record<ColOp, string> = { add: "+", sub: "−", mul: "×", div: "÷" };
export const COL_NAMES: Record<ColOp, string> = { add: "Addition", sub: "Subtraction", mul: "Long multiplication", div: "Long division" };
// Everything written on the page: where, what, and from which step it shows.
// `until`: the step it's rubbed out at. `strike`: the step it's crossed out from.
export type Cell = { r: number; c: number; t: string; from: number; until?: number; strike?: number; kind: "given" | "sign" | "answer" | "carry" | "work" };
export type Rule = { r: number; c0: number; c1: number; from: number }; // a line under row r
export type Working = { rows: number; cols: number; cells: Cell[]; rules: Rule[]; steps: string[]; answer: string; small: number[] }; // small: rows of little carry digits
const PLACES = ["ones", "tens", "hundreds", "thousands", "ten thousands", "hundred thousands", "millions"];
const one = (place: string) => place.replace(/s$/, "");
export const cellShown = (c: Cell, step: number) => c.from <= step && (c.until === undefined || step < c.until);

function addWorking(a: number, b: number): Working {
  const A = digits(a), B = digits(b), n = Math.max(A.length, B.length), W = n + 1, col = (p: number) => W - p;
  const cells: Cell[] = [], steps = ["Write one number under the other. Line up the ones, the tens and the hundreds. Start with the ones."];
  A.forEach((d, p) => cells.push({ r: 1, c: col(p), t: String(d), from: 0, kind: "given" }));
  B.forEach((d, p) => cells.push({ r: 2, c: col(p), t: String(d), from: 0, kind: "given" }));
  cells.push({ r: 2, c: 0, t: "+", from: 0, kind: "sign" });
  let carry = 0;
  for (let p = 0; p < n; p++) {
    const k = steps.length, parts = [A[p], B[p]].filter((d) => d !== undefined).map(String), sum = (A[p] ?? 0) + (B[p] ?? 0) + carry, last = p === n - 1;
    let say = `${cap(PLACES[p])}: ${parts.join(" + ")}${carry ? " + 1 carried" : ""} = ${sum}.`;
    cells.push({ r: 3, c: col(p), t: String(sum % 10), from: k, kind: "answer" });
    if (sum >= 10 && !last) { say += ` Write ${sum % 10} and carry 1 to the ${PLACES[p + 1]}.`; cells.push({ r: 0, c: col(p + 1), t: "1", from: k, kind: "carry" }); }
    else if (sum >= 10) { say += ` Write ${sum}.`; cells.push({ r: 3, c: col(p + 1), t: "1", from: k, kind: "answer" }); }
    else say += ` Write ${sum}.`;
    steps.push(say); carry = sum >= 10 ? 1 : 0;
  }
  steps.push(`So ${a} + ${b} = ${a + b}.`);
  return { rows: 4, cols: W + 1, cells, rules: [{ r: 2, c0: 0, c1: W, from: 0 }], steps, answer: String(a + b), small: [0] };
}

function subWorking(a: number, b: number): Working {
  const A = digits(a), B = digits(b), n = A.length, col = (p: number) => n - p, top = [...A], result = a - b, len = String(result).length;
  const cells: Cell[] = [], steps = ["Write the smaller number under the bigger one, lining up the ones, tens and hundreds. Start with the ones."];
  const given: Cell[] = A.map((d, p) => ({ r: 1, c: col(p), t: String(d), from: 0, kind: "given" as const }));
  const changed: (Cell | undefined)[] = []; // the little number now standing over each place
  cells.push(...given, { r: 2, c: 0, t: "−", from: 0, kind: "sign" });
  B.forEach((d, p) => cells.push({ r: 2, c: col(p), t: String(d), from: 0, kind: "given" }));
  for (let p = 0; p < n; p++) {
    const db = B[p] ?? 0;
    if (top[p] < db) {
      const k = steps.length, was = top[p];
      let j = p + 1;
      while (top[j] === 0) j++;
      for (let q = j; q > p; q--) { top[q] -= 1; top[q - 1] += 10; }
      for (let q = p; q <= j; q++) {
        if (changed[q]) changed[q]!.until = k; else given[q].strike = k;
        cells.push(changed[q] = { r: 0, c: col(q), t: String(top[q]), from: k, kind: "carry" });
      }
      const becomes = Array.from({ length: j - p + 1 }, (_, i) => `the ${PLACES[j - i]} become ${top[j - i]}`).join(", ");
      steps.push(`${cap(PLACES[p])}: ${was} − ${db} can't be done, so exchange 1 ${one(PLACES[j])} for 10 ${PLACES[j - 1]}${j > p + 1 ? ", and so on down" : ""}: ${becomes}.`);
    }
    const d = top[p] - db;
    if (p >= len) { if (top[p] || db) steps.push(`${cap(PLACES[p])}: ${top[p]} − ${db} = 0. There is nothing to write at the front.`); continue; }
    cells.push({ r: 3, c: col(p), t: String(d), from: steps.length, kind: "answer" });
    steps.push(`${cap(PLACES[p])}: ${top[p]} − ${db} = ${d}. Write ${d}.`);
  }
  steps.push(`So ${a} − ${b} = ${result}.`);
  return { rows: 4, cols: n + 1, cells, rules: [{ r: 2, c0: 0, c1: n, from: 0 }], steps, answer: String(result), small: [0] };
}

function mulWorking(a: number, b: number): Working {
  const A = digits(a), B = digits(b), m = B.length, total = a * b, W = Math.max(String(total).length, A.length, m + 1), col = (p: number) => W - p;
  const cells: Cell[] = [], rules: Rule[] = [{ r: 2, c0: 0, c1: W, from: 0 }];
  const steps = [m > 1 ? `Multiply ${a} by each digit of ${b} in turn, starting with the ones. Then add the rows.` : `Multiply each digit of ${a} by ${b}, starting with the ones.`];
  A.forEach((d, p) => cells.push({ r: 1, c: col(p), t: String(d), from: 0, kind: "given" }));
  B.forEach((d, p) => cells.push({ r: 2, c: col(p), t: String(d), from: 0, kind: "given" }));
  cells.push({ r: 2, c: 0, t: "×", from: 0, kind: "sign" });
  const kind = m > 1 ? "work" as const : "answer" as const, partial: number[][] = [];
  for (let j = 0; j < m; j++) {
    const dj = B[j], row = 3 + j, here: number[] = [], passCarries: Cell[] = [];
    partial.push(here);
    if (j > 0) {
      const k = steps.length;
      for (let z = 0; z < j; z++) { cells.push({ r: row, c: col(z), t: "0", from: k, kind }); here[z] = 0; }
      steps.push(`Now the ${PLACES[j]} digit, ${dj}. It stands for ${dj * 10 ** j}, so write ${j === 1 ? "a 0" : `${j} zeros`} first to keep the places right.`);
    }
    let carry = 0;
    for (let i = 0; i < A.length; i++) {
      const k = steps.length, raw = A[i] * dj, prod = raw + carry, last = i === A.length - 1, next = Math.floor(prod / 10);
      let say = `${A[i]} × ${dj} = ${raw}${carry ? `, plus the ${carry} carried is ${prod}` : ""}.`;
      cells.push({ r: row, c: col(i + j), t: String(prod % 10), from: k, kind }); here[i + j] = prod % 10;
      if (!last) {
        say += ` Write ${prod % 10}${next ? ` and carry ${next}` : ""}.`;
        if (next) { const c: Cell = { r: 0, c: col(i + 1), t: String(next), from: k, kind: "carry" }; cells.push(c); passCarries.push(c); }
      } else { say += ` Write ${prod}.`; if (next) { cells.push({ r: row, c: col(i + j + 1), t: String(next), from: k, kind }); here[i + j + 1] = next; } }
      steps.push(say); carry = last ? 0 : next;
    }
    for (const c of passCarries) c.until = steps.length; // rub the carries out before the next digit
  }
  if (m > 1) {
    const tr = 3 + m, k0 = steps.length;
    rules.push({ r: tr - 1, c0: 0, c1: W, from: k0 });
    cells.push({ r: tr - 1, c: 0, t: "+", from: k0, kind: "sign" });
    steps.push("Now add the rows, starting with the ones.");
    let carry = 0;
    const T = String(total).length;
    for (let p = 0; p < T; p++) {
      const k = steps.length, parts = partial.map((row) => row[p]).filter((d) => d !== undefined) as number[], sum = parts.reduce((x, y) => x + y, 0) + carry, last = p === T - 1;
      cells.push({ r: tr, c: col(p), t: String(sum % 10), from: k, kind: "answer" });
      let say = `${cap(PLACES[p])}: ${parts.length ? parts.join(" + ") : "0"}${carry ? ` + ${carry} carried` : ""} = ${sum}.`;
      if (sum >= 10 && !last) { say += ` Write ${sum % 10} and carry ${Math.floor(sum / 10)}.`; cells.push({ r: tr + 1, c: col(p + 1), t: String(Math.floor(sum / 10)), from: k, kind: "carry" }); }
      else say += ` Write ${sum}.`;
      steps.push(say); carry = Math.floor(sum / 10);
    }
  }
  steps.push(`So ${a} × ${b} = ${total}.`);
  return { rows: m > 1 ? 5 + m : 4, cols: W + 1, cells, rules, steps, answer: String(total), small: m > 1 ? [0, 4 + m] : [0] };
}

function divWorking(a: number, b: number): Working {
  const D = String(a).split("").map(Number), n = D.length, dl = String(b).length, col = (i: number) => dl + 1 + i;
  const cells: Cell[] = [], rules: Rule[] = [{ r: 0, c0: dl + 1, c1: dl + n, from: 0 }];
  const steps = [`How many ${b}s are in ${a}? Work from the left, one digit at a time.`];
  String(b).split("").forEach((d, i) => cells.push({ r: 1, c: i, t: d, from: 0, kind: "given" }));
  cells.push({ r: 1, c: dl, t: ")", from: 0, kind: "sign" });
  D.forEach((d, i) => cells.push({ r: 1, c: col(i), t: String(d), from: 0, kind: "given" }));
  const write = (r: number, right: number, num: number, from: number) => String(num).split("").reverse().forEach((d, i) => cells.push({ r, c: right - i, t: d, from, kind: "work" }));
  let cur = 0, wr = 2, curRow = 1, started = false, q = "";
  for (let i = 0; i < n; i++) {
    cur = cur * 10 + D[i];
    const times = Math.floor(cur / b), more = i < n - 1, k = steps.length;
    if (!times && !started && more) { steps.push(`${b} into ${cur} doesn't go, so take the next digit as well: ${cur * 10 + D[i + 1]}.`); continue; }
    started = true; q += times;
    cells.push({ r: 0, c: col(i), t: String(times), from: k, kind: "answer" });
    if (!times) {
      if (more && curRow !== 1) cells.push({ r: curRow, c: col(i + 1), t: String(D[i + 1]), from: k, kind: "work" });
      steps.push(`${b} into ${cur} goes 0 times. Write 0 above the ${D[i]}.${more ? ` Bring down the ${D[i + 1]} to make ${cur * 10 + D[i + 1]}.` : ""}`);
      continue;
    }
    const prod = times * b, rem = cur - prod, w = String(prod).length;
    write(wr, col(i), prod, k);
    cells.push({ r: wr, c: col(i) - w, t: "−", from: k, kind: "sign" });
    steps.push(`${b} into ${cur} goes ${times} time${times === 1 ? "" : "s"}, because ${times} × ${b} = ${prod}. Write ${times} above the ${D[i]}, and ${prod} underneath.`);
    const k2 = steps.length;
    rules.push({ r: wr, c0: col(i) - w, c1: col(i), from: k2 });
    write(wr + 1, col(i), rem, k2);
    if (more) cells.push({ r: wr + 1, c: col(i + 1), t: String(D[i + 1]), from: k2, kind: "work" });
    steps.push(`Subtract: ${cur} − ${prod} = ${rem}.${more ? ` Bring down the ${D[i + 1]} to make ${rem * 10 + D[i + 1]}.` : rem ? " That is the remainder." : " Nothing is left over."}`);
    curRow = wr + 1; wr += 2; cur = rem;
  }
  const k = steps.length, answer = cur ? `${Number(q)} r ${cur}` : String(Number(q));
  if (cur) { cells.push({ r: 0, c: col(n), t: "r", from: k, kind: "answer" }); String(cur).split("").forEach((d, i) => cells.push({ r: 0, c: col(n) + 1 + i, t: d, from: k, kind: "answer" })); }
  steps.push(`So ${a} ÷ ${b} = ${Number(q)}${cur ? ` remainder ${cur}` : ""}.`);
  return { rows: Math.max(2, wr), cols: col(n) + (cur ? 1 + String(cur).length : 0), cells, rules, steps, answer, small: [] };
}
export const COL_LIMITS: Record<ColOp, [number, number, number, number]> = { add: [1, 99999, 1, 99999], sub: [1, 99999, 1, 99999], mul: [2, 9999, 2, 999], div: [1, 99999, 2, 99] }; // a from–to, b from–to
export type ColumnState = Panel & { op: ColOp; a: number; b: number; step: number };
export const DEFAULT_COLUMN: ColumnState = { on: false, x: 0.08, y: 0.04, op: "add", a: 478, b: 356, step: 0 };
// The two numbers, kept inside what each method can show (and the bigger one on top for subtraction).
export function fitSum(op: ColOp, a: unknown, b: unknown): [number, number] {
  const [a0, a1, b0, b1] = COL_LIMITS[op], d = DEFAULT_COLUMN;
  let x = int(a, a0, a1, d.a), y = int(b, b0, b1, op === "div" ? 7 : op === "mul" ? 6 : d.b);
  if (op === "sub" && y > x) [x, y] = [y, x];
  return [x, y];
}
export function working(s: Pick<ColumnState, "op" | "a" | "b">): Working {
  return s.op === "add" ? addWorking(s.a, s.b) : s.op === "sub" ? subWorking(s.a, s.b) : s.op === "mul" ? mulWorking(s.a, s.b) : divWorking(s.a, s.b);
}
export function cleanColumn(c: any): ColumnState {
  const op: ColOp = COL_OPS.includes(c?.op) ? c.op : "add", [a, b] = fitSum(op, c?.a, c?.b);
  return { ...panel(c, DEFAULT_COLUMN), op, a, b, step: int(c?.step, 0, working({ op, a, b }).steps.length - 1, 0) };
}
// The answer as it stands on the page at the end, read back off the cells.
export function readAnswer(w: Working): string {
  const end = w.steps.length - 1, ans = w.cells.filter((c) => c.kind === "answer" && cellShown(c, end)), row = Math.max(...ans.map((c) => c.r));
  return ans.filter((c) => c.r === (w.small.length ? row : 0)).sort((x, y) => x.c - y.c).map((c) => c.t).join("");
}
export function randomSum(op: ColOp, rnd: () => number = Math.random): [number, number] {
  const r = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  return op === "add" ? [r(125, 899), r(125, 899)] : op === "sub" ? fitSum("sub", r(400, 999), r(101, 399)) : op === "mul" ? [r(23, 489), rnd() < 0.5 ? r(3, 9) : r(12, 49)] : [r(120, 999), r(3, 9)];
}

// ═══ Bar model ════════════════════════════════════════════════════════════
export type BarMode = "ratio" | "fraction" | "percent";
export const BAR_MODES: BarMode[] = ["ratio", "fraction", "percent"];
export const BAR_NAMES: Record<BarMode, string> = { ratio: "Ratio", fraction: "Fraction of an amount", percent: "Percentage" };
// ratio: parts are the ratio (two or three numbers). fraction: [top, bottom]. percent: [percent].
// known: what the question gives — "total", "p0"/"p1"/"p2" (that share), "diff" (how much more the first two differ), "whole", "part".
export type BarState = Panel & { mode: BarMode; parts: number[]; names: string[]; known: string; value: number; reveal: number }; // reveal: 0 bars, 1 one part, 2 the answer
export const DEFAULT_BAR: BarState = { on: false, x: 0.08, y: 0.05, mode: "ratio", parts: [2, 3], names: ["Ada", "Ben", "Chi"], known: "total", value: 60, reveal: 0 };
const NAMES = DEFAULT_BAR.names;
export function cleanBar(b: any): BarState {
  const d = DEFAULT_BAR, mode: BarMode = BAR_MODES.includes(b?.mode) ? b.mode : "ratio", raw = Array.isArray(b?.parts) ? b.parts : [];
  const names = NAMES.map((n, i) => str(b?.names?.[i], 14) || n);
  let parts: number[], known = String(b?.known ?? "");
  if (mode === "ratio") {
    parts = raw.slice(0, 3).map((p: unknown) => int(p, 1, 12, 1));
    if (parts.length < 2) parts = [...d.parts];
    const ok = ["total", ...parts.map((_, i) => `p${i}`), ...(parts[0] !== parts[1] ? ["diff"] : [])];
    if (!ok.includes(known)) known = "total";
  } else if (mode === "fraction") {
    const den = int(raw[1], 2, 12, 5);
    parts = [int(raw[0], 1, den, 3), den];
    if (known !== "part") known = "whole";
  } else { parts = [int(raw[0], 1, 100, 30)]; if (known !== "part") known = "whole"; }
  return { ...panel(b, d), mode, parts, names, known, value: Math.round(clamp(b?.value, 1, 100000, d.value) * 100) / 100, reveal: int(b?.reveal, 0, 2, 0) };
}
export type Bar = { name: string; boxes: number; shaded: number; total: number };
export type BarModel = { question: string; bars: Bar[]; unit: number; unitName: string; working: string[]; unitLine: number; answer: string };
export function barModel(s: Pick<BarState, "mode" | "parts" | "names" | "known" | "value">): BarModel {
  const v = s.value;
  if (s.mode === "ratio") {
    const p = s.parts, names = s.names.slice(0, p.length), sum = p.reduce((x, y) => x + y, 0), ratio = p.join(" : "), who = names.length === 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    const i = /^p\d$/.test(s.known) ? Number(s.known[1]) : -1, diff = Math.abs(p[0] - p[1]), big = p[0] > p[1] ? 0 : 1;
    const unit = s.known === "total" ? v / sum : s.known === "diff" ? v / diff : v / p[i];
    const shares = p.map((k) => k * unit), working: string[] = [];
    if (s.known === "total") working.push(`${p.join(" + ")} = ${sum} equal parts altogether`, `One part = ${tidy(v)} ÷ ${sum} = ${tidy(unit)}`);
    else if (s.known === "diff") working.push(`${names[big]} has ${diff} more part${diff === 1 ? "" : "s"} than ${names[1 - big]}, and that is ${tidy(v)}`, `One part = ${tidy(v)} ÷ ${diff} = ${tidy(unit)}`);
    else working.push(`${names[i]}'s ${p[i]} part${p[i] === 1 ? "" : "s"} = ${tidy(v)}`, `One part = ${tidy(v)} ÷ ${p[i]} = ${tidy(unit)}`);
    const unitLine = working.length - 1;
    names.forEach((n, k) => { if (k !== i) working.push(`${n}: ${p[k]} × ${tidy(unit)} = ${tidy(shares[k])}`); });
    if (s.known !== "total") working.push(`Total: ${sum} × ${tidy(unit)} = ${tidy(sum * unit)}`);
    const question = s.known === "total" ? `${who} share ${tidy(v)} in the ratio ${ratio}. How much does each get?`
      : s.known === "diff" ? `${who} share some money in the ratio ${ratio}. ${names[big]} gets ${tidy(v)} more than ${names[1 - big]}. How much does each get?`
        : `${who} share some money in the ratio ${ratio}. ${names[i]} gets ${tidy(v)}. How much do the others get, and what is the total?`;
    return { question, bars: names.map((name, k) => ({ name, boxes: p[k], shaded: p[k], total: shares[k] })), unit, unitName: "One part", working, unitLine, answer: names.map((n, k) => `${n} ${tidy(shares[k])}`).join(", ") };
  }
  if (s.mode === "fraction") {
    const [n, d] = s.parts, whole = s.known === "whole" ? v : (v / n) * d, unit = whole / d, part = n * unit;
    const working = s.known === "whole"
      ? [`The whole, ${tidy(whole)}, is split into ${d} equal parts`, `One part = ${tidy(whole)} ÷ ${d} = ${tidy(unit)}`, `${n} part${n === 1 ? "" : "s"} = ${n} × ${tidy(unit)} = ${tidy(part)}`]
      : [`${n} of the ${d} equal parts = ${tidy(v)}`, `One part = ${tidy(v)} ÷ ${n} = ${tidy(unit)}`, `The whole is ${d} parts = ${d} × ${tidy(unit)} = ${tidy(whole)}`];
    return {
      question: s.known === "whole" ? `Find ${n}/${d} of ${tidy(whole)}.` : `${n}/${d} of a number is ${tidy(v)}. What is the number?`,
      bars: [{ name: "Whole", boxes: d, shaded: n, total: whole }], unit, unitName: "One part", working, unitLine: 1, answer: s.known === "whole" ? tidy(part) : tidy(whole),
    };
  }
  const p = s.parts[0], whole = s.known === "whole" ? v : (v / p) * 100, ten = whole / 10, part = (whole * p) / 100;
  const working = s.known === "whole"
    ? [`100% = ${tidy(whole)}`, `10% = ${tidy(whole)} ÷ 10 = ${tidy(ten)}`, ...(p % 10 ? [`1% = ${tidy(whole)} ÷ 100 = ${tidy(whole / 100)}`, `${p}% = ${p} × ${tidy(whole / 100)} = ${tidy(part)}`] : [`${p}% = ${p / 10} × ${tidy(ten)} = ${tidy(part)}`])]
    : [`${p}% = ${tidy(v)}`, `1% = ${tidy(v)} ÷ ${p} = ${tidy(v / p)}`, `100% = 100 × ${tidy(v / p)} = ${tidy(whole)}`];
  return {
    question: s.known === "whole" ? `Find ${p}% of ${tidy(whole)}.` : `${p}% of a number is ${tidy(v)}. What is the number?`,
    bars: [{ name: "100%", boxes: 10, shaded: p / 10, total: whole }], unit: ten, unitName: "10%", working, unitLine: 1, answer: s.known === "whole" ? tidy(part) : tidy(whole),
  };
}

// ═══ Function machine ═════════════════════════════════════════════════════
export type FOp = "+" | "−" | "×" | "÷";
export const F_OPS: FOp[] = ["+", "−", "×", "÷"];
export type FStep = { op: FOp; n: number };
export type FHide = "none" | "input" | "rule" | "output";
export const F_HIDES: FHide[] = ["none", "input", "rule", "output"];
export type MachineState = Panel & { steps: FStep[]; input: number; hide: FHide; reveal: boolean; table: number[]; back: boolean }; // back: the inverse machine is showing
export const DEFAULT_MACHINE: MachineState = { on: false, x: 0.1, y: 0.05, steps: [{ op: "×", n: 3 }, { op: "+", n: 2 }], input: 4, hide: "none", reveal: false, table: [], back: false };
export const IN_MIN = -10, IN_MAX = 50, TABLE_MAX = 6;
const cleanStep = (s: any): FStep | null => (F_OPS.includes(s?.op) ? { op: s.op, n: int(s.n, 1, s.op === "×" || s.op === "÷" ? 12 : 20, 2) } : null);
export function cleanMachine(m: any): MachineState {
  const d = DEFAULT_MACHINE, steps = (Array.isArray(m?.steps) ? m.steps : []).slice(0, 2).map(cleanStep).filter(Boolean) as FStep[];
  return {
    ...panel(m, d), steps: steps.length ? steps : d.steps, input: int(m?.input, IN_MIN, IN_MAX, d.input), hide: F_HIDES.includes(m?.hide) ? m.hide : "none", reveal: !!m?.reveal,
    table: [...new Set((Array.isArray(m?.table) ? m.table : []).map((x: unknown) => int(x, IN_MIN, IN_MAX, 0)))].slice(0, TABLE_MAX) as number[], back: !!m?.back,
  };
}
const doStep = (x: number, s: FStep) => (s.op === "+" ? x + s.n : s.op === "−" ? x - s.n : s.op === "×" ? x * s.n : x / s.n);
export const runMachine = (steps: FStep[], x: number) => steps.reduce(doStep, x);
export const stepText = (s: FStep) => `${s.op} ${s.n}`;
export const ruleWords = (steps: FStep[]) => steps.map(stepText).join(", then ");
export const inverseSteps = (steps: FStep[]): FStep[] => [...steps].reverse().map((s) => ({ op: ({ "+": "−", "−": "+", "×": "÷", "÷": "×" } as Record<FOp, FOp>)[s.op], n: s.n }));
// The rule as algebra. Every machine here is y = (p/q)x + (r/t).
const frac = (num: number, den: number) => { const g = gcd(num, den) || 1, n = (num / g) * Math.sign(den), d = Math.abs(den / g); return [n, d] as [number, number]; };
export function ruleFormula(steps: FStep[]): string {
  let a = frac(1, 1), b = frac(0, 1);
  for (const s of steps) {
    if (s.op === "×") { a = frac(a[0] * s.n, a[1]); b = frac(b[0] * s.n, b[1]); }
    else if (s.op === "÷") { a = frac(a[0], a[1] * s.n); b = frac(b[0], b[1] * s.n); }
    else b = frac(b[0] + (s.op === "+" ? 1 : -1) * s.n * b[1], b[1]);
  }
  const x = a[1] === 1 ? `${a[0] === 1 ? "" : a[0]}x` : `${a[0] === 1 ? "" : a[0]}x/${a[1]}`;
  const k = b[0] === 0 ? "" : ` ${b[0] > 0 ? "+" : "−"} ${Math.abs(b[0])}${b[1] === 1 ? "" : `/${b[1]}`}`;
  return `y = ${x}${k}`;
}

// ═══ Probability: coin, dice and spinner ══════════════════════════════════
export type ChanceKind = "coin" | "dice" | "spinner";
export const CHANCE_KINDS: ChanceKind[] = ["coin", "dice", "spinner"];
export const SPIN_COLOURS = [{ name: "Red", colour: "#EF4444" }, { name: "Blue", colour: "#3B82F6" }, { name: "Green", colour: "#22C55E" }, { name: "Yellow", colour: "#FACC15" }];
export const MAX_TRIALS = 100_000, MAX_SLICES = 6;
// slices: how many equal slices of the spinner each colour has. counts: the tally so far. last: what came up last. turn: goes up with every go (so screens can animate).
export type ChanceState = Panel & { kind: ChanceKind; slices: number[]; counts: number[]; last: number; turn: number };
export const DEFAULT_CHANCE: ChanceState = { on: false, x: 0.1, y: 0.05, kind: "spinner", slices: [2, 1, 1, 0], counts: [0, 0, 0, 0], last: -1, turn: 0 };
export type Outcome = { name: string; colour: string; num: number; den: number };
export function outcomes(s: Pick<ChanceState, "kind" | "slices">): Outcome[] {
  if (s.kind === "coin") return [{ name: "Heads", colour: "#F59E0B", num: 1, den: 2 }, { name: "Tails", colour: "#64748B", num: 1, den: 2 }];
  if (s.kind === "dice") return [1, 2, 3, 4, 5, 6].map((n) => ({ name: String(n), colour: "#0E6E72", num: 1, den: 6 }));
  const den = s.slices.reduce((a, b) => a + b, 0);
  return SPIN_COLOURS.map((c, i) => ({ ...c, num: s.slices[i] ?? 0, den })).filter((o) => o.num > 0);
}
export function cleanChance(c: any): ChanceState {
  const d = DEFAULT_CHANCE, kind: ChanceKind = CHANCE_KINDS.includes(c?.kind) ? c.kind : d.kind;
  let slices = SPIN_COLOURS.map((_, i) => int(c?.slices?.[i], 0, MAX_SLICES, 0));
  if (slices.reduce((a, b) => a + b, 0) < 2 || slices.filter(Boolean).length < 2) slices = [...d.slices];
  const n = outcomes({ kind, slices }).length, counts = Array.from({ length: n }, (_, i) => int(c?.counts?.[i], 0, MAX_TRIALS, 0));
  return { ...panel(c, d), kind, slices, counts, last: int(c?.last, -1, n - 1, -1), turn: int(c?.turn, 0, 1e9, 0) };
}
export const fraction = (num: number, den: number) => { const g = gcd(num, den) || 1; return `${num / g}/${den / g}`; };
export const trials = (s: Pick<ChanceState, "counts">) => s.counts.reduce((a, b) => a + b, 0);
// Have `times` goes.
export function spin(s: ChanceState, times: number, rnd: () => number = Math.random): ChanceState {
  const out = outcomes(s), counts = out.map((_, i) => s.counts[i] ?? 0), room = Math.max(0, Math.min(times, MAX_TRIALS - trials({ counts })));
  let last = s.last;
  for (let t = 0; t < room; t++) {
    let r = rnd() * out[0].den, i = 0;
    while (i < out.length - 1 && r >= out[i].num) { r -= out[i].num; i++; }
    counts[i]++; last = i;
  }
  return { ...s, counts, last, turn: room ? s.turn + 1 : s.turn };
}
export const resetChance = (s: ChanceState): ChanceState => ({ ...s, counts: outcomes(s).map(() => 0), last: -1, turn: 0 });
// Where the spinner's pointer rests for an outcome: the middle of that colour, in degrees clockwise from the top.
export function restAngle(s: Pick<ChanceState, "kind" | "slices">, i: number): number {
  const out = outcomes(s);
  if (i < 0 || !out[i]) return 0;
  const before = out.slice(0, i).reduce((a, o) => a + o.num, 0);
  return ((before + out[i].num / 2) / out[i].den) * 360;
}

// ═══ Angle facts ══════════════════════════════════════════════════════════
export type Pt = [number, number];
export type AngleKind = "triangle" | "parallel" | "line";
export const ANGLE_KINDS: AngleKind[] = ["triangle", "parallel", "line"];
export const ANGLE_NAMES: Record<AngleKind, string> = { triangle: "Triangle", parallel: "Parallel lines", line: "Straight line" };
export type PairKind = "none" | "corresponding" | "alternate" | "cointerior" | "opposite";
export const PAIRS: PairKind[] = ["none", "corresponding", "alternate", "cointerior", "opposite"];
export const PAIR_NAMES: Record<PairKind, string> = { none: "All angles", corresponding: "Corresponding", alternate: "Alternate", cointerior: "Co-interior", opposite: "Vertically opposite" };
export const AW = 400, AH = 280, T_MIN = 25, T_MAX = 155;
// tri: the triangle's corners on a 400 × 280 picture. t: the slope of the crossing line (degrees). ext: the exterior angle is drawn. hide: which angle is covered (−1: none).
export type AngleState = Panel & { kind: AngleKind; tri: [Pt, Pt, Pt]; t: number; pair: PairKind; ext: boolean; hide: number; reveal: boolean };
export const DEFAULT_ANGLES: AngleState = { on: false, x: 0.1, y: 0.05, kind: "triangle", tri: [[80, 230], [330, 230], [150, 60]], t: 60, pair: "none", ext: false, hide: -1, reveal: false };
// A triangle's three angles as whole degrees that add up to exactly 180.
export function triAngles(tri: [Pt, Pt, Pt]): [number, number, number] {
  const at = (i: number) => {
    const [p, q, r] = [tri[i], tri[(i + 1) % 3], tri[(i + 2) % 3]], v1 = [q[0] - p[0], q[1] - p[1]], v2 = [r[0] - p[0], r[1] - p[1]];
    return (Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]) || 1)))) * 180) / Math.PI;
  };
  const raw = [at(0), at(1), at(2)], out = raw.map(Math.floor);
  const order = raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
  const short = 180 - out.reduce((a, b) => a + b, 0);
  for (let k = 0; k < short; k++) out[order[k % 3][1]]++;
  return out as [number, number, number];
}
export function triType(a: [number, number, number]): string {
  const same = new Set(a).size, big = Math.max(...a);
  return `${same === 1 ? "Equilateral" : same === 2 ? "Isosceles" : "Scalene"}, ${big === 90 ? "right-angled" : big > 90 ? "obtuse-angled" : "acute-angled"}`;
}
const area = ([a, b, c]: [Pt, Pt, Pt]) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
const okTri = (tri: [Pt, Pt, Pt]) => area(tri) >= 600 && Math.min(...triAngles(tri)) >= 12;
export function cleanAngles(a: any): AngleState {
  const d = DEFAULT_ANGLES, pt = (p: any, f: Pt): Pt => [int(p?.[0], 20, AW - 20, f[0]), int(p?.[1], 20, AH - 20, f[1])];
  const tri = [0, 1, 2].map((i) => pt(a?.tri?.[i], d.tri[i])) as [Pt, Pt, Pt], kind: AngleKind = ANGLE_KINDS.includes(a?.kind) ? a.kind : d.kind;
  return {
    ...panel(a, d), kind, tri: okTri(tri) ? tri : d.tri, t: int(a?.t, T_MIN, T_MAX, d.t), pair: PAIRS.includes(a?.pair) ? a.pair : "none", ext: !!a?.ext,
    hide: int(a?.hide, -1, kind === "parallel" ? 7 : kind === "triangle" ? 2 : 1, -1), reveal: !!a?.reveal,
  };
}
// Move one corner, unless that would squash the triangle flat.
export function moveCorner(s: AngleState, i: number, p: Pt): AngleState {
  const tri = s.tri.map((q, k) => (k === i ? [Math.round(Math.max(20, Math.min(AW - 20, p[0]))), Math.round(Math.max(20, Math.min(AH - 20, p[1])))] : q)) as [Pt, Pt, Pt];
  return okTri(tri) ? { ...s, tri } : s;
}
// The eight angles where a line crosses two parallel lines: at the top crossing
// then the bottom one, each in the order upper-left, upper-right, lower-left, lower-right.
export const parallelAngles = (t: number): number[] => [180 - t, t, t, 180 - t, 180 - t, t, t, 180 - t];
export const PAIR_AT: Record<PairKind, number[]> = { none: [], corresponding: [1, 5], alternate: [2, 5], cointerior: [3, 5], opposite: [1, 2] };
export function pairFact(pair: PairKind, t: number): string {
  const a = parallelAngles(t), [i, j] = PAIR_AT[pair];
  if (pair === "none") return "A line crossing two parallel lines makes only two sizes of angle, and the two sizes add up to 180°.";
  if (pair === "cointerior") return `Co-interior angles add up to 180° (a C shape): ${a[i]}° + ${a[j]}° = 180°.`;
  return `${pair === "corresponding" ? "Corresponding angles are equal (an F shape)" : pair === "alternate" ? "Alternate angles are equal (a Z shape)" : "Vertically opposite angles are equal (an X shape)"}: both are ${a[i]}°.`;
}
export const lineAngles = (t: number): [number, number] => [180 - t, t];
