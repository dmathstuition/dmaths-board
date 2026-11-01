// The equation writer: type maths the quick way and it's drawn neatly.
//   x^2 + 3/4        powers and fractions      (x+1)/(x-1)   brackets group
//   sqrt(x)  root(3, x)   roots                 x_1           subscripts
//   [1, 2; 3, 4]     a matrix (rows split by ;) abs(x)        |x|
//   pi theta alpha … Greek letters             <= >= != +- -> * deg inf
// Parsing and layout are pure (a measure function is passed in) so they can
// be tested; drawMath paints the result on a canvas.

export type Node =
  | { t: "text"; s: string; kind: "var" | "num" | "op" | "word" | "sign" } // sign: a leading − or ±, not spaced
  | { t: "row"; items: Node[] }
  | { t: "paren"; open: string; close: string; body: Node }
  | { t: "sup"; base: Node; sup: Node }
  | { t: "sub"; base: Node; sub: Node }
  | { t: "subsup"; base: Node; sub: Node; sup: Node }
  | { t: "frac"; num: Node; den: Node }
  | { t: "sqrt"; body: Node; index?: Node }
  | { t: "matrix"; rows: Node[][] };

const GREEK: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", theta: "θ", lambda: "λ", mu: "μ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Omega: "Ω",
  inf: "∞", infinity: "∞", deg: "°", sum: "Σ", int: "∫", therefore: "∴", because: "∵", in: "∈", union: "∪", intersect: "∩", angle: "∠", triangle: "△",
};
const WORDS = new Set(["sin", "cos", "tan", "sec", "cosec", "csc", "cot", "log", "ln", "lim", "exp", "max", "min", "mod", "and", "or", "if", "for"]);
const OPS: [string, string][] = [["<=", "≤"], [">=", "≥"], ["!=", "≠"], ["+-", "±"], ["->", "→"], ["=>", "⇒"], ["~=", "≈"], ["*", "×"], ["-", "−"], ["+", "+"], ["=", "="], ["<", "<"], [">", ">"], ["÷", "÷"], ["×", "×"], ["±", "±"], ["≤", "≤"], ["≥", "≥"], ["≠", "≠"], ["≈", "≈"], [":", ":"], ["!", "!"], ["%", "%"], ["'", "′"]];
export const MATH_MAX = 300;

type Tok = { v: string; k: "num" | "name" | "op" | "punct" | "text" };
function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    const num = src.slice(i).match(/^\d+(\.\d+)?/);
    if (num) { out.push({ v: num[0], k: "num" }); i += num[0].length; continue; }
    const name = src.slice(i).match(/^[A-Za-z]+/);
    if (name) { out.push({ v: name[0], k: "name" }); i += name[0].length; continue; }
    const op = OPS.find(([a]) => src.startsWith(a, i));
    if (op) { out.push({ v: op[1], k: "op" }); i += op[0].length; continue; }
    if ("()[]{},;^_/|".includes(c)) { out.push({ v: c, k: "punct" }); i++; continue; }
    out.push({ v: c, k: "text" }); i++; // anything else (°, π typed directly, …) as it is
  }
  return out;
}

// Strip one pair of round brackets: (x+1)/(x−1) puts x+1 on top, without brackets.
const bare = (n: Node): Node => (n.t === "paren" && n.open === "(" ? n.body : n);
const row = (items: Node[]): Node => (items.length === 1 ? items[0] : { t: "row", items });

export function parseMath(src: string): Node {
  const toks = tokenize(String(src).slice(0, MATH_MAX));
  let p = 0;
  const peek = () => toks[p];
  // One unit: a number, a name (or a function like sqrt(…)), a bracketed group, a matrix.
  function atom(): Node | null {
    const t = toks[p];
    if (!t) return null;
    if (t.k === "num") { p++; return { t: "text", s: t.v, kind: "num" }; }
    if (t.k === "name") {
      p++;
      if ((t.v === "sqrt" || t.v === "root" || t.v === "abs") && peek()?.v === "(") {
        p++;
        const first = seq([")", ","]);
        if (t.v === "root" && peek()?.v === ",") { p++; const body = seq([")"]); if (peek()?.v === ")") p++; return { t: "sqrt", body, index: first }; }
        if (peek()?.v === ")") p++;
        return t.v === "abs" ? { t: "paren", open: "|", close: "|", body: first } : { t: "sqrt", body: first };
      }
      if (GREEK[t.v]) return { t: "text", s: GREEK[t.v], kind: t.v === "deg" ? "op" : "var" };
      if (WORDS.has(t.v)) return { t: "text", s: t.v, kind: "word" };
      if (t.v.length === 1) return { t: "text", s: t.v, kind: "var" };
      // xy → x y (each letter a variable), as maths is usually written.
      return row(t.v.split("").map((ch) => ({ t: "text", s: ch, kind: "var" }) as Node));
    }
    if (t.v === "(" || t.v === "{") {
      p++;
      const close = t.v === "(" ? ")" : "}";
      const body = seq([close]);
      if (peek()?.v === close) p++;
      return t.v === "(" ? { t: "paren", open: "(", close: ")", body } : body;
    }
    if (t.v === "|") { p++; const body = seq(["|"]); if (peek()?.v === "|") p++; return { t: "paren", open: "|", close: "|", body }; }
    if (t.v === "[") {
      p++;
      const rows: Node[][] = [[]];
      for (let guard = 0; p < toks.length && guard < 400; guard++) {
        if (peek()?.v === "]") { p++; break; }
        if (peek()?.v === ",") { p++; continue; }
        if (peek()?.v === ";") { p++; rows.push([]); continue; }
        rows[rows.length - 1].push(seq([",", ";", "]"]));
      }
      const clean = rows.filter((r) => r.length).slice(0, 6).map((r) => r.slice(0, 6));
      return clean.length ? { t: "matrix", rows: clean } : { t: "text", s: "[ ]", kind: "op" };
    }
    if (t.k === "op") { p++; return { t: "text", s: t.v, kind: "op" }; }
    if (t.k === "text") { p++; return { t: "text", s: t.v, kind: "var" }; }
    return null;
  }
  // An atom with any powers and subscripts: x^2, x_1, x_1^2.
  function scripted(): Node | null {
    let base = atom();
    if (!base) return null;
    for (let guard = 0; guard < 4; guard++) {
      const t = peek();
      if (t?.v !== "^" && t?.v !== "_") break;
      p++;
      const arg = atom();
      if (!arg) break;
      if (t.v === "^") base = base.t === "sub" ? { t: "subsup", base: base.base, sub: base.sub, sup: bare(arg) } : { t: "sup", base, sup: bare(arg) };
      else base = { t: "sub", base, sub: bare(arg) };
    }
    return base;
  }
  // A run of units up to a closing mark, with a/b made into fractions.
  function seq(stop: string[]): Node {
    const items: Node[] = [];
    for (let guard = 0; p < toks.length && guard < 600; guard++) {
      const t = peek();
      if (stop.includes(t.v)) break;
      if (t.v === "/") {
        p++;
        const den = scripted();
        const num = items.pop();
        if (num && den) items.push({ t: "frac", num: bare(num), den: bare(den) });
        else items.push(...[num, den].filter(Boolean) as Node[], { t: "text", s: "/", kind: "op" });
        continue;
      }
      if (t.v === ")" || t.v === "]" || t.v === "}" || t.v === "," || t.v === ";" || t.v === "^" || t.v === "_") {
        // Stray marks: show them as they are.
        p++; items.push({ t: "text", s: t.v, kind: "op" }); continue;
      }
      const n = scripted();
      if (!n) { p++; continue; }
      // −b at the start, or after another operator, is a sign, written close up.
      const prev = items[items.length - 1];
      if (n.t === "text" && n.kind === "op" && ["−", "+", "±"].includes(n.s) && (!prev || (prev.t === "text" && (prev.kind === "op" || prev.kind === "sign")))) items.push({ ...n, kind: "sign" });
      else items.push(n);
    }
    return row(items);
  }
  return seq([]);
}

// ── Layout ──
export type Measure = (text: string, size: number, italic: boolean) => number;
export type Box = { w: number; a: number; d: number; draw: (ctx: CanvasRenderingContext2D, x: number, y: number) => void };
export const estimate: Measure = (t, size) => [...t].length * size * 0.56;
const SPACED = new Set(["=", "+", "−", "×", "÷", "±", "≤", "≥", "<", ">", "≠", "≈", "→", "⇒"]);

export function layout(n: Node, size: number, m: Measure, colour = "#0B1220"): Box {
  const font = (s: number, italic: boolean) => `${italic ? "italic " : ""}500 ${s}px "Cambria Math", "Times New Roman", serif`;
  switch (n.t) {
    case "text": {
      const italic = n.kind === "var" && /[A-Za-z]/.test(n.s);
      const pad = n.kind === "op" && SPACED.has(n.s) ? size * 0.22 : n.kind === "word" ? size * 0.1 : 0;
      const w = m(n.s, size, italic) + pad * 2;
      return { w, a: size * 0.72, d: size * 0.22, draw: (ctx, x, y) => { ctx.font = font(size, italic); ctx.fillStyle = colour; ctx.textBaseline = "alphabetic"; ctx.fillText(n.s, x + pad, y); } };
    }
    case "row": {
      const kids = n.items.map((k) => layout(k, size, m, colour));
      // A word like sin gets a small gap before what follows it.
      const gaps = n.items.map((k, i) => (k.t === "text" && k.kind === "word" && i < n.items.length - 1 ? size * 0.15 : 0));
      const w = kids.reduce((s, k, i) => s + k.w + gaps[i], 0);
      return { w, a: Math.max(size * 0.72, ...kids.map((k) => k.a)), d: Math.max(size * 0.22, ...kids.map((k) => k.d)),
        draw: (ctx, x, y) => { let cx = x; kids.forEach((k, i) => { k.draw(ctx, cx, y); cx += k.w + gaps[i]; }); } };
    }
    case "paren": {
      const body = layout(n.body, size, m, colour);
      const h = body.a + body.d, pw = size * 0.32;
      const drawBracket = (ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, ch: string, left: boolean) => {
        ctx.strokeStyle = colour; ctx.lineWidth = Math.max(1, size * 0.06); ctx.lineCap = "round"; ctx.beginPath();
        if (ch === "|") { ctx.moveTo(x + pw / 2, top); ctx.lineTo(x + pw / 2, bottom); }
        else {
          const inX = left ? x + pw * 0.8 : x + pw * 0.2, outX = left ? x + pw * 0.15 : x + pw * 0.85;
          ctx.moveTo(inX, top); ctx.quadraticCurveTo(outX, (top + bottom) / 2, inX, bottom);
        }
        ctx.stroke();
      };
      return { w: body.w + pw * 2, a: body.a + size * 0.05, d: body.d + size * 0.05, draw: (ctx, x, y) => {
        const top = y - body.a - size * 0.02, bottom = y + body.d + size * 0.02;
        drawBracket(ctx, x, top, bottom, n.open, true);
        body.draw(ctx, x + pw, y);
        drawBracket(ctx, x + pw + body.w, top, bottom, n.close, false);
        void h;
      } };
    }
    case "sup": case "sub": case "subsup": {
      const base = layout(n.base, size, m, colour);
      const small = size * 0.62;
      const sup = n.t !== "sub" ? layout((n as any).sup, small, m, colour) : null;
      const sub = n.t !== "sup" ? layout((n as any).sub, small, m, colour) : null;
      const up = Math.max(base.a - small * 0.35, size * 0.42), down = size * 0.22;
      const w = base.w + Math.max(sup?.w ?? 0, sub?.w ?? 0) + size * 0.05;
      return { w, a: Math.max(base.a, sup ? up + sup.a : 0), d: Math.max(base.d, sub ? down + sub.d : 0), draw: (ctx, x, y) => {
        base.draw(ctx, x, y);
        sup?.draw(ctx, x + base.w + size * 0.03, y - up);
        sub?.draw(ctx, x + base.w + size * 0.03, y + down);
      } };
    }
    case "frac": {
      const s = size * 0.85;
      const num = layout(n.num, s, m, colour), den = layout(n.den, s, m, colour);
      const w = Math.max(num.w, den.w) + size * 0.3, axis = size * 0.28, gap = size * 0.12;
      return { w: w + size * 0.1, a: axis + gap + num.a + num.d, d: Math.max(0, den.a + den.d + gap - axis), draw: (ctx, x, y) => {
        const line = y - axis;
        num.draw(ctx, x + size * 0.05 + (w - num.w) / 2, line - gap - num.d);
        den.draw(ctx, x + size * 0.05 + (w - den.w) / 2, line + gap + den.a);
        ctx.strokeStyle = colour; ctx.lineWidth = Math.max(1, size * 0.055); ctx.beginPath(); ctx.moveTo(x + size * 0.05, line); ctx.lineTo(x + size * 0.05 + w, line); ctx.stroke();
      } };
    }
    case "sqrt": {
      const body = layout(n.body, size, m, colour);
      const idx = n.index ? layout(n.index, size * 0.5, m, colour) : null;
      const lead = size * 0.55 + Math.max(0, (idx?.w ?? 0) - size * 0.3), top = body.a + size * 0.14;
      return { w: lead + body.w + size * 0.1, a: top + size * 0.06, d: body.d + size * 0.04, draw: (ctx, x, y) => {
        const bx = x + lead;
        ctx.strokeStyle = colour; ctx.lineWidth = Math.max(1, size * 0.055); ctx.lineJoin = "round"; ctx.beginPath();
        ctx.moveTo(bx - size * 0.5, y - size * 0.25);
        ctx.lineTo(bx - size * 0.35, y - size * 0.32);
        ctx.lineTo(bx - size * 0.2, y + body.d);
        ctx.lineTo(bx - size * 0.02, y - top);
        ctx.lineTo(bx + body.w + size * 0.08, y - top);
        ctx.stroke();
        body.draw(ctx, bx + size * 0.04, y);
        idx?.draw(ctx, bx - size * 0.5 - Math.max(0, idx.w - size * 0.3) + size * 0.02, y - size * 0.42);
      } };
    }
    case "matrix": {
      const cells = n.rows.map((r) => r.map((c) => layout(c, size * 0.9, m, colour)));
      const cols = Math.max(...cells.map((r) => r.length));
      const colW = Array.from({ length: cols }, (_, j) => Math.max(0, ...cells.map((r) => r[j]?.w ?? 0)));
      const rowA = cells.map((r) => Math.max(size * 0.65, ...r.map((c) => c.a))), rowD = cells.map((r) => Math.max(size * 0.2, ...r.map((c) => c.d)));
      const gapX = size * 0.6, gapY = size * 0.25, pw = size * 0.35;
      const innerW = colW.reduce((s, w) => s + w, 0) + gapX * (cols - 1), innerH = rowA.reduce((s, a, i) => s + a + rowD[i], 0) + gapY * (cells.length - 1);
      const axis = size * 0.28, a = innerH / 2 + axis + size * 0.1, d = innerH / 2 - axis + size * 0.1;
      return { w: innerW + pw * 2 + size * 0.2, a, d, draw: (ctx, x, y) => {
        const top = y - a + size * 0.05, bottom = y + d - size * 0.05;
        ctx.strokeStyle = colour; ctx.lineWidth = Math.max(1, size * 0.06); ctx.beginPath();
        const lx = x + size * 0.1, rx = x + size * 0.1 + innerW + pw * 2;
        ctx.moveTo(lx + pw * 0.6, top); ctx.lineTo(lx, top); ctx.lineTo(lx, bottom); ctx.lineTo(lx + pw * 0.6, bottom);
        ctx.moveTo(rx - pw * 0.6, top); ctx.lineTo(rx, top); ctx.lineTo(rx, bottom); ctx.lineTo(rx - pw * 0.6, bottom);
        ctx.stroke();
        let cy = y - innerH / 2 - axis;
        cells.forEach((r, i) => {
          cy += rowA[i];
          let cx = lx + pw;
          r.forEach((c, j) => { c.draw(ctx, cx + (colW[j] - c.w) / 2, cy); cx += colW[j] + gapX; });
          cy += rowD[i] + gapY;
        });
      } };
    }
  }
}

// The size of the maths for a text size step (as the text tool's, a little bigger).
export const mathSize = (w: number) => Math.round((20 + w * 3) * 1.6);

// Paint it with its top-left corner at (x, y).
export function drawMath(ctx: CanvasRenderingContext2D, src: string, x: number, y: number, size: number, colour: string) {
  const m: Measure = (t, s, italic) => { ctx.font = `${italic ? "italic " : ""}500 ${s}px "Cambria Math", "Times New Roman", serif`; return ctx.measureText(t).width; };
  const box = layout(parseMath(src), size, m, colour);
  ctx.save();
  box.draw(ctx, x + size * 0.1, y + box.a + size * 0.1);
  ctx.restore();
}

// How much room it takes (board units), without a canvas.
export function mathExtent(src: string, size: number): { w: number; h: number } {
  const box = layout(parseMath(src), size, estimate);
  return { w: box.w + size * 0.2, h: box.a + box.d + size * 0.2 };
}
