"use client";
import { useEffect, useState } from "react";
import { canSpeak, setReading, speak, stopSpeaking, useReading } from "@/lib/reading";

// The learner's "Aa" button: text size, easy-read font, read aloud (lib/reading).
export function ReadingButton({ dark = false }: { dark?: boolean }) {
  const r = useReading();
  const [open, setOpen] = useState(false);
  const chip = (on: boolean) => `min-h-[40px] rounded-lg px-3 text-sm font-black ring-1 ${on ? "bg-[#0E6E72] text-white ring-[#0E6E72]" : "bg-white text-ink ring-slate-200"}`;
  return (
    <span className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Reading settings: text size, easy-read font, read aloud"
        className={`inline-flex min-h-[40px] items-center gap-1 rounded-xl px-3 text-sm font-black ${dark ? "bg-white/10 text-white ring-1 ring-white/25" : "bg-white text-ink ring-1 ring-line"}`}>
        <span aria-hidden className="font-serif text-base">Aa</span><span className="sr-only sm:not-sr-only">Reading</span>
      </button>
      {open && (
        <div role="dialog" aria-label="Reading settings" className="absolute right-0 top-full z-[120] mt-2 w-[min(18rem,90vw)] rounded-2xl bg-white p-3 text-left text-ink shadow-2xl ring-1 ring-black/10">
          <p className="text-xs font-black uppercase tracking-wider text-ink/50">Text size</p>
          <div className="mt-1 flex gap-1.5" role="radiogroup" aria-label="Text size">
            {([1, 2, 3] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={r.size === s} onClick={() => setReading({ size: s })} className={chip(r.size === s)}>
                <span style={{ fontSize: `${0.8 + s * 0.15}rem` }}>A</span>{s === 1 ? "" : s === 2 ? "+" : "++"}
              </button>
            ))}
          </div>
          <label className="mt-3 flex min-h-[44px] items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 text-sm font-bold">
            Easy-read font <input type="checkbox" checked={r.easy} onChange={(e) => setReading({ easy: e.target.checked })} className="h-5 w-5 accent-[#0E6E72]" />
          </label>
          <label className={`mt-2 flex min-h-[44px] items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 text-sm font-bold ${canSpeak() ? "" : "opacity-50"}`}>
            Read questions aloud <input type="checkbox" checked={r.voice} disabled={!canSpeak()} onChange={(e) => setReading({ voice: e.target.checked })} className="h-5 w-5 accent-[#0E6E72]" />
          </label>
          {!canSpeak() && <p className="mt-1 text-xs text-ink/55">This browser can&apos;t read aloud.</p>}
          {r.voice && <p className="mt-1 text-xs text-ink/55">Tap 🔊 next to a question to hear it.</p>}
          <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full rounded-xl bg-ink/5 py-2 text-sm font-black text-ink/70">Done</button>
        </div>
      )}
    </span>
  );
}

// 🔊 next to a question — only when the learner has switched reading aloud on.
export function Speak({ text, className = "", label = "Read this aloud" }: { text: string; className?: string; label?: string }) {
  const r = useReading();
  const [on, setOn] = useState(false);
  useEffect(() => () => { if (on) stopSpeaking(); }, [on]);
  if (!r.voice || !text.trim()) return null;
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); if (on) { stopSpeaking(); setOn(false); } else { setOn(true); speak(text, () => setOn(false)); } }}
      aria-label={on ? "Stop reading" : label} aria-pressed={on}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${on ? "bg-[#0E6E72] text-white" : "bg-[#E2F3F2] text-[#0A4F52]"} ${className}`}>
      {on ? "⏹" : "🔊"}
    </button>
  );
}
