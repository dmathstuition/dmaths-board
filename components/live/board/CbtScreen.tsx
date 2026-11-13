"use client";
// The CBT screen for JAMB UTME practice (lib/cbt.ts) — laid out like the real
// one: the subjects as tabs, one question at a time with options A–D, Previous
// and Next, a question-number palette (answered, flagged for review, not yet),
// the clock, the calculator and Submit. Keys work as at the centre: A–D to
// answer, N next, P previous, F flag.
import { useEffect, useMemo, useState } from "react";
import { CalculatorButton } from "@/components/live/PhoneCalculator";
import { clockLeft, type LearnerQ } from "@/lib/exams";
import { sectionsOf } from "@/lib/cbt";

export default function CbtScreen({ examId, title, name, paper, answers, onAnswer, at, setAt, left, calculator, onSubmit }: {
  examId: string; title: string; name?: string; paper: LearnerQ[]; answers: Record<string, unknown>;
  onAnswer: (n: number, option: number) => void; at: number; setAt: (i: number) => void;
  left: number; calculator: boolean; onSubmit: () => void;
}) {
  const secs = useMemo(() => sectionsOf(paper), [paper]);
  const q = paper[at], sec = q?.sec ?? secs[0];
  const inSec = useMemo(() => paper.map((x, i) => ({ x, i })).filter(({ x }) => x.sec === sec), [paper, sec]);
  const pos = inSec.findIndex(({ i }) => i === at);
  // Flagged for review: kept on this phone for this exam.
  const flagKey = `cbt-flags:${examId}`;
  const [flags, setFlags] = useState<number[]>([]);
  useEffect(() => { try { setFlags(JSON.parse(localStorage.getItem(flagKey) ?? "[]")); } catch { /* storage blocked */ } }, [flagKey]);
  const toggleFlag = (n: number) => setFlags((f) => { const next = f.includes(n) ? f.filter((x) => x !== n) : [...f, n]; try { localStorage.setItem(flagKey, JSON.stringify(next)); } catch { /* storage blocked */ } return next; });
  const answered = (x: LearnerQ) => answers[String(x.n)] != null && answers[String(x.n)] !== "";
  const go = (i: number) => setAt(Math.max(0, Math.min(paper.length - 1, i)));

  // The centre's keys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))) return;
      const k = e.key.toUpperCase();
      // Handled here, and never reaches the board behind (its own keys: F for full screen…).
      const mine = () => { e.preventDefault(); e.stopImmediatePropagation(); };
      if (q && k.length === 1 && "ABCDEF".slice(0, q.options.length).includes(k) && k !== "F") { mine(); onAnswer(q.n, q.options["ABCDEF".indexOf(k)].i); }
      else if (k === "N") { mine(); go(at + 1); }
      else if (k === "P") { mine(); go(at - 1); }
      else if (k === "F" && q) { mine(); toggleFlag(q.n); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }); // every render: the current question

  if (!q) return null;
  const low = left < 5 * 60_000;
  const choice = answers[String(q.n)];
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-[#1E3A8A]/20" aria-label="CBT screen">
      <div className="flex flex-wrap items-center gap-2 bg-[#1E3A8A] px-3 py-2 text-white">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black" title={title}>{title.split(" — ")[0]}</p>
          {name && <p className="truncate text-[11px] font-bold text-white/70">Candidate: {name}</p>}
        </div>
        <p role="timer" aria-label="Time left" className={`rounded-lg px-2.5 py-1 font-mono text-lg font-black tabular-nums ${low ? "bg-red-600" : "bg-white/15"}`}>⏱ {clockLeft(left)}</p>
        {calculator && <CalculatorButton className="!min-h-[36px]" />}
        <button type="button" onClick={onSubmit} className="min-h-[36px] rounded-lg bg-emerald-500 px-3 text-sm font-black text-white">Submit</button>
      </div>
      <div role="tablist" aria-label="Subjects" className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 pt-2">
        {secs.map((s) => {
          const list = paper.map((x, i) => ({ x, i })).filter(({ x }) => x.sec === s), done = list.filter(({ x }) => answered(x)).length;
          return (
            <button key={s} type="button" role="tab" aria-selected={s === sec} onClick={() => s !== sec && go(list[0]?.i ?? 0)}
              className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-xs font-black ${s === sec ? "bg-white text-[#1E3A8A] ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}>
              {s} <span className="font-bold text-slate-400">{done}/{list.length}</span>
            </button>
          );
        })}
      </div>
      <div className="p-3 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex-1 text-xs font-black uppercase tracking-wider text-[#1E3A8A]">{sec} · Question {pos + 1} of {inSec.length}</p>
          <button type="button" onClick={() => toggleFlag(q.n)} aria-pressed={flags.includes(q.n)}
            className={`min-h-[36px] rounded-lg px-3 text-xs font-black ring-1 ${flags.includes(q.n) ? "bg-amber-400 text-amber-950 ring-amber-500" : "bg-white text-slate-600 ring-slate-300"}`}>🚩 {flags.includes(q.n) ? "Flagged for review" : "Flag for review"}</button>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-lg font-bold leading-snug text-slate-900">{q.q}</p>
        <div role="radiogroup" aria-label="Options" className="mt-4 grid gap-2">
          {q.options.map((o, k) => {
            const on = choice === o.i;
            return (
              <button key={o.i} type="button" role="radio" aria-checked={on} onClick={() => onAnswer(q.n, o.i)}
                className={`flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-left text-base font-semibold ring-2 ${on ? "bg-[#1E3A8A] text-white ring-[#1E3A8A]" : "bg-white text-slate-800 ring-slate-200 hover:ring-[#1E3A8A]/50"}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${on ? "bg-white text-[#1E3A8A]" : "bg-slate-100 text-slate-600"}`}>{String.fromCharCode(65 + k)}</span>{o.text}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => go(at - 1)} disabled={at === 0} className="min-h-[48px] flex-1 rounded-xl bg-slate-100 text-sm font-black text-slate-700 disabled:opacity-40">← Previous</button>
          <button type="button" onClick={() => go(at + 1)} disabled={at === paper.length - 1} className="min-h-[48px] flex-1 rounded-xl bg-[#1E3A8A] text-sm font-black text-white disabled:opacity-40">Next →</button>
        </div>
        <nav aria-label={`${sec} questions`} className="mt-4 flex flex-wrap gap-1.5">
          {inSec.map(({ x, i }, k) => {
            const f = flags.includes(x.n), a = answered(x);
            return (
              <button key={x.n} type="button" onClick={() => go(i)} aria-current={i === at}
                aria-label={`Question ${k + 1}${a ? ", answered" : ""}${f ? ", flagged" : ""}`}
                className={`h-9 w-9 rounded-md text-xs font-black ${i === at ? "ring-2 ring-[#1E3A8A] ring-offset-1" : ""} ${f ? "bg-amber-400 text-amber-950" : a ? "bg-emerald-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-300"}`}>{k + 1}</button>
            );
          })}
        </nav>
        <p className="mt-3 text-[11px] font-semibold text-slate-500">
          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-600 align-middle" /> answered
          <span className="mx-2 inline-block h-2.5 w-2.5 rounded-sm bg-amber-400 align-middle" /> flagged
          <span className="mx-2 inline-block h-2.5 w-2.5 rounded-sm ring-1 ring-slate-300 align-middle" /> not answered · Keys: A–D answer, N next, P previous, F flag
        </p>
      </div>
    </div>
  );
}
