// The learner's own calculator (on their phone, not shared with the class).
// Pure key handling on top of lib/mathExpr's evaluate: SHIFT for the inverse
// trig functions, Ans for the last answer, DEG/RAD, and a short history.
import { evaluate, fmtNumber } from "@/lib/mathExpr";

export type CalcState = { expr: string; result: string; error: boolean; deg: boolean; shift: boolean; ans: string; history: { expr: string; result: string }[] };
export const NEW_CALC: CalcState = { expr: "", result: "", error: false, deg: true, shift: false, ans: "", history: [] };
export const MAX_EXPR = 160, MAX_HISTORY = 5;

const INSERT: Record<string, string> = {
  sin: "sin(", cos: "cos(", tan: "tan(", "sin⁻¹": "asin(", "cos⁻¹": "acos(", "tan⁻¹": "atan(", "√": "√(", "x²": "^2", "x³": "^3", "xʸ": "^",
  ln: "ln(", log: "log(", "eˣ": "exp(", "10ˣ": "10^", "%": "/100", "1/x": "^(-1)", "(-)": "-",
};
const OPERATOR = /^[+−×÷^/]|^\^/;

export function press(s: CalcState, key: string): CalcState {
  if (key === "SHIFT") return { ...s, shift: !s.shift };
  if (key === "DEG") return { ...s, deg: !s.deg };
  if (key === "AC") return { ...s, expr: "", result: "", error: false, shift: false };
  if (key === "⌫") return s.result ? { ...s, result: "", error: false } : { ...s, expr: s.expr.slice(0, -1) };
  if (key === "=") {
    if (!s.expr.trim()) return s;
    const r = evaluate(s.expr.replace(/Ans/g, s.ans ? `(${s.ans})` : "0"), s.deg);
    // A sum that can be read but has no answer (÷ 0, √ of a negative…) is a Math error, like a real calculator.
    const math = !r.ok && /Not a real number|Too big/.test((r as { error: string }).error);
    if (!r.ok || !Number.isFinite(r.value)) return { ...s, result: r.ok || math ? "Math error" : "Syntax error", error: true, shift: false };
    const result = fmtNumber(r.value);
    return { ...s, result, error: false, shift: false, ans: result, history: [{ expr: s.expr, result }, ...s.history].slice(0, MAX_HISTORY) };
  }
  // SHIFT turns sin/cos/tan into their inverses, once.
  const k = s.shift && ["sin", "cos", "tan"].includes(key) ? `${key}⁻¹` : key;
  const add = INSERT[k] ?? k;
  // After "=": an operator carries on from the answer; anything else starts afresh.
  let base = s.expr;
  if (s.result) base = !s.error && OPERATOR.test(add) ? "Ans" : "";
  return { ...s, expr: (base + add).slice(0, MAX_EXPR), result: "", error: false, shift: false };
}

// What the answer would be so far (shown faintly as they type).
export function preview(s: CalcState): string {
  if (!s.expr || s.result) return "";
  const r = evaluate(s.expr.replace(/Ans/g, s.ans ? `(${s.ans})` : "0"), s.deg);
  return r.ok && Number.isFinite(r.value) ? fmtNumber(r.value) : "";
}
