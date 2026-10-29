"use client";
import { useEffect, useState } from "react";

// Shared look for the live quiz: four coloured answer shapes (so learners can
// match the tutor's screen at a glance), a countdown and a leaderboard.
export const ANSWER_STYLE = [
  { color: "#E11D48", shape: "triangle", label: "A" },
  { color: "#2563EB", shape: "diamond", label: "B" },
  { color: "#D97706", shape: "circle", label: "C" },
  { color: "#16A34A", shape: "square", label: "D" },
] as const;

export function Shape({ i, className = "h-5 w-5" }: { i: number; className?: string }) {
  const s = ANSWER_STYLE[i]?.shape;
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      {s === "triangle" && <path d="M10 2 19 18H1z" fill="currentColor" />}
      {s === "diamond" && <path d="M10 1 19 10 10 19 1 10z" fill="currentColor" />}
      {s === "circle" && <circle cx="10" cy="10" r="8.5" fill="currentColor" />}
      {s === "square" && <rect x="2" y="2" width="16" height="16" rx="2" fill="currentColor" />}
    </svg>
  );
}

// Seconds left, using the server's clock offset so every phone agrees.
// Worked out on every render from the CURRENT question's start time — a value
// kept in state would still read 0 from the previous question for one render
// after the host moves on, which used to trigger an instant "time's up".
export function secondsLeft(startedAt: string | null | undefined, seconds: number, offsetMs: number, now = Date.now()): number {
  if (!startedAt) return seconds;
  const end = new Date(startedAt).getTime() + seconds * 1000;
  return Math.max(0, Math.min(seconds, Math.ceil((end - (now + offsetMs)) / 1000)));
}

export function useCountdown(startedAt: string | null | undefined, seconds: number, offsetMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt, seconds, offsetMs]);
  return secondsLeft(startedAt, seconds, offsetMs, now);
}

export type Row = { name: string; points: number; correct: number; streak?: number; move?: number };

export function Leaderboard({ rows, highlight, big = false }: { rows: Row[]; highlight?: string; big?: boolean }) {
  if (!rows.length) return <p className="text-sm text-white/60">No answers yet.</p>;
  return (
    <ol className={big ? "space-y-2.5" : "space-y-1.5"}>
      {rows.map((r, i) => (
        <li key={`${r.name}-${i}`} style={{ animationDelay: `${i * 60}ms` }}
          className={`quiz-rise flex items-center gap-3 rounded-xl ${big ? "px-5 py-3.5" : "px-3 py-2"} ${r.name === highlight ? "bg-amber-400/25 ring-2 ring-amber-300/70" : "bg-white/10"}`}>
          <span className={`flex ${big ? "h-10 w-10 text-lg" : "h-7 w-7 text-sm"} items-center justify-center rounded-lg font-black ${i === 0 ? "bg-amber-400 text-[#0B1220]" : i === 1 ? "bg-slate-200 text-[#0B1220]" : i === 2 ? "bg-orange-400 text-[#0B1220]" : "bg-white/15 text-white"}`}>{i + 1}</span>
          <span className={`min-w-0 flex-1 truncate font-bold text-white ${big ? "text-xl" : ""}`}>{r.name}</span>
          {!!r.move && r.move > 0 && <span className="text-xs font-black text-emerald-300" aria-label={`up ${r.move}`}>▲{r.move}</span>}
          {(r.streak ?? 0) >= 2 && <span className="text-xs font-black text-orange-300" title="Answer streak">🔥{r.streak}</span>}
          <span className={`${big ? "w-20 text-xl" : "w-14 text-sm"} text-right font-mono font-black text-amber-300`}>{r.points}</span>
        </li>
      ))}
    </ol>
  );
}
