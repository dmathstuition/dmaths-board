"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { drawMath, mathExtent, MATH_MAX } from "@/lib/mathType";

// Typing an equation for the board, with a live preview of how it will look.
const EXAMPLES: [string, string][] = [
  ["x^2", "Power"], ["a/b", "Fraction"], ["sqrt(x)", "Square root"], ["root(3, x)", "Cube root"], ["x_1", "Subscript"],
  ["(x+1)/(x-1)", "Fraction with brackets"], ["[1, 2; 3, 4]", "Matrix"], ["abs(x)", "Absolute value"], ["pi", "π"], ["theta", "θ"],
  ["<=", "≤"], [">=", "≥"], ["!=", "≠"], ["+-", "±"], ["deg", "°"],
];

export default function EquationEditor({ value, colour, dark, changing, style, onChange, onDone, onCancel }: {
  value: string; colour: string; dark: boolean; changing: boolean; style: CSSProperties;
  onChange: (v: string) => void; onDone: () => void; onCancel: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const size = 34, ext = mathExtent(value || " ", size), dpr = window.devicePixelRatio || 1;
    const w = Math.min(560, Math.max(260, ext.w + 16)), h = Math.min(220, Math.max(70, ext.h + 16));
    c.width = w * dpr; c.height = h * dpr; c.style.width = `${w}px`; c.style.height = `${h}px`;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    if (value.trim()) drawMath(ctx, value, 6, Math.max(4, (h - ext.h) / 2), size, colour === "#FFFFFF" && !dark ? "#0B1220" : colour);
  }, [value, colour, dark]);
  const insert = (t: string) => {
    const el = input.current, at = el?.selectionStart ?? value.length, end = el?.selectionEnd ?? at;
    onChange((value.slice(0, at) + t + value.slice(end)).slice(0, MATH_MAX));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + t.length, at + t.length); });
  };
  return (
    <div role="dialog" aria-label="Equation" className="absolute z-50 w-[min(560px,94%)] rounded-2xl bg-white p-3 text-ink shadow-2xl ring-1 ring-black/10" style={style}
      onPointerDown={(e) => e.stopPropagation()}>
      <label htmlFor="eq-input" className="text-xs font-black text-ink/60">Type maths — e.g. <code className="rounded bg-slate-100 px-1">x^2 + 3/4</code>, <code className="rounded bg-slate-100 px-1">sqrt(b^2 - 4ac)</code></label>
      <input id="eq-input" ref={input} value={value} maxLength={MATH_MAX} autoComplete="off" spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onDone(); } if (e.key === "Escape") onCancel(); }}
        className="mt-1 w-full rounded-lg bg-slate-50 px-3 py-2 font-mono text-base ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1657C9]" />
      <div className={`mt-2 flex min-h-[70px] items-center justify-center overflow-auto rounded-lg ring-1 ring-slate-200 ${dark ? "bg-[#1F2937]" : "bg-white"}`}>
        <canvas ref={canvas} role="img" aria-label={value.trim() ? `Preview of ${value}` : "Preview"} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1" role="toolbar" aria-label="Insert">
        {EXAMPLES.map(([t, label]) => (
          <button key={t} type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => insert(t)} title={label} aria-label={`Insert ${label}`}
            className="min-h-[32px] rounded-md bg-slate-100 px-2 font-mono text-xs font-bold text-ink/80 hover:bg-[#EEF6FF]">{t}</button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onDone} className="min-h-[40px] rounded-xl bg-[#1657C9] px-4 text-sm font-black text-white">{changing ? (value.trim() ? "Update" : "Remove it") : "Put on the board"}</button>
        <button type="button" onClick={onCancel} className="min-h-[40px] rounded-xl bg-ink/5 px-4 text-sm font-black text-ink/70">Cancel</button>
      </div>
    </div>
  );
}
