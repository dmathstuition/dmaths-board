// A small, safe maths-expression reader for the whiteboard's graph plotter and
// calculator — no eval. Understands + − × ÷ ^, brackets, implicit
// multiplication (2x, 3(x+1), 2sin(x)), the usual functions, π and e.

export type Compiled = (x: number) => number;
type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string } | { t: "(" } | { t: ")" } | { t: "," };

const FUNCS: Record<string, (a: number, deg: boolean) => number> = {
  sin: (a, d) => Math.sin(d ? (a * Math.PI) / 180 : a), cos: (a, d) => Math.cos(d ? (a * Math.PI) / 180 : a), tan: (a, d) => Math.tan(d ? (a * Math.PI) / 180 : a),
  asin: (a, d) => (d ? (Math.asin(a) * 180) / Math.PI : Math.asin(a)), acos: (a, d) => (d ? (Math.acos(a) * 180) / Math.PI : Math.acos(a)), atan: (a, d) => (d ? (Math.atan(a) * 180) / Math.PI : Math.atan(a)),
  sqrt: (a) => Math.sqrt(a), abs: (a) => Math.abs(a), ln: (a) => Math.log(a), log: (a) => Math.log10(a), exp: (a) => Math.exp(a),
  floor: (a) => Math.floor(a), ceil: (a) => Math.ceil(a), round: (a) => Math.round(a),
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

export function tokenize(src: string): Tok[] {
  const s = src.toLowerCase().replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, "pi").replace(/√/g, "sqrt").replace(/²/g, "^2").replace(/³/g, "^3");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/)!;
      if (!m) throw new Error("Bad number");
      out.push({ t: "num", v: Number(m[0]) }); i += m[0].length;
    } else if (/[a-z]/.test(c)) {
      // Longest known name first, so "sinx" = sin(x) and "pix" = π·x.
      const rest = s.slice(i);
      const name = [...Object.keys(FUNCS), ...Object.keys(CONSTS), "x"].sort((a, b) => b.length - a.length).find((n) => rest.startsWith(n));
      if (!name) throw new Error(`Unknown "${rest.match(/^[a-z]+/)![0]}"`);
      out.push({ t: "id", v: name }); i += name.length;
    } else if ("+-*/^".includes(c)) { out.push({ t: "op", v: c }); i++; }
    else if (c === "(" || c === "[") { out.push({ t: "(" }); i++; }
    else if (c === ")" || c === "]") { out.push({ t: ")" }); i++; }
    else throw new Error(`Unexpected "${c}"`);
  }
  // Implicit multiplication: 2x, 2(…), )(, x(…), )x, 2pi, 2sin(x)…
  const res: Tok[] = [];
  for (const tk of out) {
    const prev = res[res.length - 1];
    const prevEnds = prev && (prev.t === "num" || prev.t === ")" || (prev.t === "id" && !(prev.v in FUNCS)));
    const startsValue = tk.t === "num" || tk.t === "(" || tk.t === "id";
    if (prevEnds && startsValue) res.push({ t: "op", v: "*" });
    res.push(tk);
  }
  return res;
}

// Recursive-descent parser → a closure. Precedence: + − < × ÷ < unary − < ^ (right-assoc).
export function compile(src: string, deg = false): Compiled {
  const toks = tokenize(src);
  if (!toks.length) throw new Error("Type an expression");
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === "op" && (peek() as any).v === v;
  function expr(): Compiled {
    let left = term();
    while (isOp("+") || isOp("-")) {
      const op = (toks[p++] as any).v, a = left, b = term();
      left = op === "+" ? (x) => a(x) + b(x) : (x) => a(x) - b(x);
    }
    return left;
  }
  function term(): Compiled {
    let left = unary();
    while (isOp("*") || isOp("/")) {
      const op = (toks[p++] as any).v, a = left, b = unary();
      left = op === "*" ? (x) => a(x) * b(x) : (x) => a(x) / b(x);
    }
    return left;
  }
  function unary(): Compiled {
    if (isOp("-")) { p++; const a = unary(); return (x) => -a(x); }
    if (isOp("+")) { p++; return unary(); }
    return power();
  }
  function power(): Compiled {
    const base = atom();
    if (isOp("^")) { p++; const e = unary(); return (x) => Math.pow(base(x), e(x)); }
    return base;
  }
  function atom(): Compiled {
    const tk = toks[p++];
    if (!tk) throw new Error("Expression ends too soon");
    if (tk.t === "num") { const v = tk.v; return () => v; }
    if (tk.t === "(") { const inner = expr(); if (toks[p++]?.t !== ")") throw new Error("Missing )"); return inner; }
    if (tk.t === "id") {
      if (tk.v === "x") return (x) => x;
      if (tk.v in CONSTS) { const v = CONSTS[tk.v]; return () => v; }
      const f = FUNCS[tk.v];
      // sin x and sin(x) both work: the argument binds like a power.
      const arg = peek()?.t === "(" ? atom() : power();
      return (x) => f(arg(x), deg);
    }
    throw new Error("Check the brackets and signs");
  }
  const fn = expr();
  if (p < toks.length) throw new Error("Check the expression");
  return fn;
}

// For the calculator: evaluate once, or explain what's wrong.
export function evaluate(src: string, deg = false): { ok: true; value: number } | { ok: false; error: string } {
  try {
    const v = compile(src, deg)(0);
    if (!Number.isFinite(v)) return { ok: false, error: Number.isNaN(v) ? "Not a real number" : "Too big" };
    return { ok: true, value: v };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Check the expression" }; }
}
export const fmtNumber = (v: number) => (Math.abs(v) >= 1e12 || (v !== 0 && Math.abs(v) < 1e-6) ? v.toExponential(6) : String(Math.round(v * 1e10) / 1e10));

// Sample a function across [xMin, xMax] into polylines, breaking at gaps and
// vertical asymptotes so tan(x) and 1/x don't draw false lines.
export function samplePlot(f: Compiled, xMin: number, xMax: number, yMin: number, yMax: number, n = 400): [number, number][][] {
  const lines: [number, number][][] = [];
  let cur: [number, number][] = [];
  const span = yMax - yMin;
  let prevY: number | null = null;
  for (let i = 0; i <= n; i++) {
    const x = xMin + ((xMax - xMin) * i) / n;
    let y: number;
    try { y = f(x); } catch { y = NaN; }
    const bad = !Number.isFinite(y) || (prevY !== null && Math.abs(y - prevY) > span * 4) || Math.abs(y) > Math.abs(yMax) * 1e3 + Math.abs(yMin) * 1e3 + 1e6;
    if (bad) { if (cur.length > 1) lines.push(cur); cur = []; prevY = Number.isFinite(y) ? y : null; if (Number.isFinite(y) && Math.abs(y) < 1e6) cur.push([x, y]); continue; }
    cur.push([x, y]); prevY = y;
  }
  if (cur.length > 1) lines.push(cur);
  return lines;
}

// Nice tick spacing for an axis range (1, 2 or 5 × 10ⁿ).
export function tickStep(range: number, target = 10): number {
  const raw = range / target, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
}
