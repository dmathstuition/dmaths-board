"use client";
import { useEffect, useState } from "react";
import { NEW_CALC, press, preview, type CalcState } from "@/lib/phoneCalc";

// A scientific calculator on the learner's own phone (lib/phoneCalc). The
// teacher decides when it's there: on for class work unless switched off,
// and per exam.
type K = { k: string; label?: string; tone?: "fn" | "op" | "eq" | "clr" | "shift" };
const KEYS: K[][] = [
  [{ k: "SHIFT", tone: "shift" }, { k: "DEG", tone: "fn" }, { k: "(", tone: "fn" }, { k: ")", tone: "fn" }, { k: "Ans", tone: "fn" }],
  [{ k: "sin", tone: "fn" }, { k: "cos", tone: "fn" }, { k: "tan", tone: "fn" }, { k: "√", tone: "fn" }, { k: "x²", tone: "fn" }],
  [{ k: "π", tone: "fn" }, { k: "log", tone: "fn" }, { k: "ln", tone: "fn" }, { k: "xʸ", tone: "fn" }, { k: "1/x", tone: "fn" }],
  [{ k: "7" }, { k: "8" }, { k: "9" }, { k: "⌫", tone: "clr" }, { k: "AC", tone: "clr" }],
  [{ k: "4" }, { k: "5" }, { k: "6" }, { k: "×", tone: "op" }, { k: "÷", tone: "op" }],
  [{ k: "1" }, { k: "2" }, { k: "3" }, { k: "+", tone: "op" }, { k: "−", tone: "op" }],
  [{ k: "0" }, { k: "." }, { k: "(-)", label: "(−)" }, { k: "%", tone: "fn" }, { k: "=", tone: "eq" }],
];
const TONE = { fn: "bg-slate-100 text-ink", op: "bg-[#E2F3F2] text-[#0A4F52] text-lg", eq: "bg-[#0E6E72] text-white", clr: "bg-red-50 text-red-700", shift: "bg-amber-100 text-amber-900" } as const;
const SAY: Record<string, string> = { "⌫": "Delete", AC: "All clear", "−": "Minus", "×": "Times", "÷": "Divide", "√": "Square root", "x²": "Squared", "xʸ": "To the power", "1/x": "One over", "(-)": "Negative", π: "Pi", "=": "Equals" };

export default function PhoneCalculator({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState<CalcState>(() => {
    try { const v = JSON.parse(sessionStorage.getItem("board-calc") ?? "null"); return v ? { ...NEW_CALC, ...v, shift: false } : NEW_CALC; } catch { return NEW_CALC; }
  });
  useEffect(() => { try { sessionStorage.setItem("board-calc", JSON.stringify(s)); } catch { /* storage blocked */ } }, [s]);
  // A keyboard works too.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea")) return;
      const map: Record<string, string> = { "*": "×", "/": "÷", "-": "−", Enter: "=", Backspace: "⌫", Escape: "AC", "^": "xʸ" };
      const k = map[e.key] ?? (/^[0-9.+()]$/.test(e.key) ? e.key : null);
      if (k) { e.preventDefault(); setS((cur) => press(cur, k)); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
  const label = (k: K) => (s.shift && ["sin", "cos", "tan"].includes(k.k) ? `${k.k}⁻¹` : k.k === "DEG" ? (s.deg ? "DEG" : "RAD") : k.label ?? k.k);
  return (
    <div role="dialog" aria-label="Calculator" className="fixed inset-x-0 bottom-0 z-[130] mx-auto w-full max-w-sm rounded-t-3xl bg-white p-3 text-ink shadow-[0_-12px_40px_rgba(0,0,0,.25)] ring-1 ring-black/10 sm:bottom-4 sm:right-4 sm:left-auto sm:mx-0 sm:rounded-3xl">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-black">🧮 Calculator</p>
        <button type="button" onClick={onClose} aria-label="Close the calculator" className="rounded-lg px-3 py-1.5 text-sm font-black text-ink/60 hover:bg-ink/5">Close</button>
      </div>
      <div className="rounded-2xl bg-slate-900 px-3 py-2 text-right text-white">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-white/50">
          <span>{s.deg ? "DEG" : "RAD"}{s.shift ? " · SHIFT" : ""}</span><span>{s.ans ? `Ans = ${s.ans}` : ""}</span>
        </div>
        <p className="mt-1 min-h-[24px] break-all font-mono text-base text-white/80" aria-label="Sum">{s.expr || "0"}</p>
        <p className={`min-h-[38px] break-all font-mono text-3xl font-black ${s.error ? "text-red-300" : ""}`} aria-live="polite" aria-label="Answer">
          {s.result || <span className="text-white/35">{preview(s)}</span>}
        </p>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {KEYS.flat().map((k) => (
          <button key={k.k} type="button" onClick={() => setS((cur) => press(cur, k.k))} aria-label={SAY[k.k] ?? label(k)} aria-pressed={k.k === "SHIFT" ? s.shift : undefined}
            className={`min-h-[44px] rounded-xl text-[15px] font-black transition active:scale-95 ${k.tone ? TONE[k.tone] : "bg-white ring-1 ring-slate-200"} ${k.k === "SHIFT" && s.shift ? "ring-2 ring-amber-500" : ""}`}>{label(k)}</button>
        ))}
      </div>
      {s.history.length > 0 && (
        <ul className="mt-2 max-h-20 overflow-y-auto text-right font-mono text-xs text-ink/55" aria-label="Recent sums">
          {s.history.map((h, i) => <li key={i}><button type="button" onClick={() => setS((cur) => ({ ...cur, expr: h.expr, result: "", error: false }))} className="hover:text-ink">{h.expr} = <b>{h.result}</b></button></li>)}
        </ul>
      )}
    </div>
  );
}

// The button that opens it.
export function CalculatorButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-black text-ink ring-1 ring-slate-200 hover:ring-[#0E6E72] ${className}`}>🧮 Calculator</button>
      {open && <PhoneCalculator onClose={() => setOpen(false)} />}
    </>
  );
}
