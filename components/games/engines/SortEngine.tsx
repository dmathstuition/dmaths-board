"use client";
import { useEffect, useRef, useState } from "react";
import type { EngineProps } from "@/components/games/GamePlayer";
import { SORT_PACE, findSort, sortDrawer, type SortItem } from "@/lib/games/sorting";

const BOX = ["#2563EB", "#DB2777", "#16A34A", "#D97706"];
const SHADOW = ["#1E40AF", "#9D174D", "#166534", "#92400E"];

// Speed Sort: an item appears and the learner taps the box it belongs in
// before the time bar runs out. Too slow counts as a mistake.
export default function SortEngine({ game, difficulty, report, show, rng = Math.random }: EngineProps) {
  const set = findSort(game.sort ?? "odd-even")!;
  const draw = useRef(sortDrawer(set, difficulty, rng)).current;
  const pace = SORT_PACE[difficulty] * 1000;
  const [it, setIt] = useState<SortItem>(draw);
  const [picked, setPicked] = useState<number | null>(null); // -1: ran out of time
  const [left, setLeft] = useState(1);
  const born = useRef(Date.now()), busy = useRef(false);
  useEffect(() => { show?.({ lead: "Sort it", prompt: it.text, options: set.buckets, status: `${set.title}` }); }, [it]); // eslint-disable-line react-hooks/exhaustive-deps

  function settle(i: number) {
    if (busy.current) return;
    busy.current = true;
    const ok = i === it.bucket;
    setPicked(i);
    report(ok, [set.title], { lead: "Sort it", prompt: it.text, answer: set.buckets[it.bucket], options: set.buckets });
    setTimeout(() => { setIt(draw()); setPicked(null); setLeft(1); born.current = Date.now(); busy.current = false; }, ok ? 300 : 1400);
  }
  useEffect(() => {
    if (picked !== null) return;
    const id = setInterval(() => {
      const f = 1 - (Date.now() - born.current) / pace;
      if (f <= 0) { clearInterval(id); settle(-1); } else setLeft(f);
    }, 100);
    return () => clearInterval(id);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= set.buckets.length) settle(n - 1);
      else if (set.buckets.length === 2 && e.key === "ArrowLeft") settle(0);
      else if (set.buckets.length === 2 && e.key === "ArrowRight") settle(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const ok = picked === it.bucket, bad = picked !== null && !ok;
  return (
    <div className="arcade-card p-5 sm:p-7">
      <div className="h-3 overflow-hidden rounded-full bg-indigo-100" role="progressbar" aria-label="Time to sort this one" aria-valuenow={Math.round(left * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full transition-[width] duration-100" style={{ width: `${left * 100}%`, background: left < 0.3 ? "#DC2626" : game.colors[0] }} />
      </div>
      <div className={`mt-4 flex min-h-[8rem] flex-col items-center justify-center rounded-3xl px-4 py-6 text-center transition-colors ${picked === null ? "bg-indigo-50" : ok ? "bg-emerald-100" : "arcade-shake bg-red-100"}`}>
        <p className="font-display text-5xl font-black tracking-tight sm:text-6xl" aria-live="polite">{it.text}</p>
        {bad && <p className="arcade-pop mt-3 text-sm font-black text-red-700">{picked === -1 ? "⏱ Too slow! " : ""}{it.why}</p>}
      </div>
      <div className={`mt-4 grid gap-3 ${set.buckets.length === 3 ? "grid-cols-3" : "grid-cols-2"}`} role="group" aria-label="Boxes">
        {set.buckets.map((b, i) => (
          <button key={b} type="button" onClick={() => settle(i)} disabled={picked !== null} aria-label={b}
            className={`arcade-btn flex min-h-[84px] flex-col items-center justify-center gap-1 px-2 py-3 text-center text-base font-black sm:text-lg ${picked !== null && i === it.bucket ? "arcade-pop ring-4 ring-white" : ""} ${picked !== null && i !== it.bucket ? "opacity-35" : ""}`}
            style={{ ["--btn" as any]: BOX[i % 4], ["--btn-shadow" as any]: SHADOW[i % 4] }}>
            <span aria-hidden className="text-xs opacity-70">{i + 1}</span>{b}
          </button>
        ))}
      </div>
      <p className="mt-3 hidden text-center text-xs font-bold text-indigo-950/40 sm:block">Keyboard: press 1 – {set.buckets.length}{set.buckets.length === 2 ? " (or ← →)" : ""}</p>
    </div>
  );
}
