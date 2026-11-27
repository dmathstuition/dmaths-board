"use client";
import { useEffect, useRef, useState } from "react";
import type { EngineProps } from "@/components/games/GamePlayer";
import { AnswerTiles, QuestionCard } from "@/components/games/engines/Tiles";
import { RACE_LEN, STALL_MS, ordinal, racePlace, rivalStep, rivals } from "@/lib/games/formats";
import { itemDrawer } from "@/lib/games/source";

// Race Track: each right answer moves your car a step; a wrong answer stalls
// you. Three animal rivals drive at a steady pace. First over the line wins.
export default function RaceEngine({ game, difficulty, report, end, show, rng = Math.random, items }: EngineProps) {
  const draw = useRef(itemDrawer(game.skill, difficulty, rng, items)).current;
  const rs = useRef(rivals(difficulty)).current;
  const [q, setQ] = useState(draw);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [stalled, setStalled] = useState(false);
  const [finish, setFinish] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const t0 = useRef(Date.now()), busy = useRef(false);
  useEffect(() => { const id = setInterval(() => setNow(Date.now() - t0.current), 250); return () => clearInterval(id); }, []);
  const place = racePlace(step, now, rs);
  useEffect(() => { show?.({ lead: q.lead, prompt: q.prompt, options: q.options, status: `${game.title}: step ${step}/${RACE_LEN} · ${ordinal(place)}` }); }); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(i: number) {
    if (busy.current || finish != null) return;
    busy.current = true;
    const ok = q.options[i] === q.answer;
    setPicked(i);
    report(ok, undefined, { lead: q.lead, prompt: q.prompt, answer: q.answer, options: q.options });
    const nextStep = ok ? step + 1 : step;
    if (ok) setStep(nextStep); else setStalled(true);
    if (nextStep >= RACE_LEN) {
      const p = racePlace(RACE_LEN, Date.now() - t0.current, rs);
      setFinish(p);
      setTimeout(() => end?.(), 1800);
      return;
    }
    setTimeout(() => { setQ(draw()); setPicked(null); setStalled(false); busy.current = false; }, ok ? 350 : STALL_MS);
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { const n = Number(e.key); if (n >= 1 && n <= 4) choose(n - 1); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const lanes = [{ id: "me", name: "You", emoji: game.emoji, pos: step, me: true }, ...rs.map((r) => ({ id: r.id, name: r.name, emoji: r.emoji, pos: rivalStep(r, now), me: false }))];
  const state = picked === null ? "idle" : q.options[picked] === q.answer ? "right" : "wrong";
  return (
    <div className="arcade-card p-4 sm:p-6">
      <div className="grid gap-1.5" role="img" aria-label={`Race track: you are in ${ordinal(place)} place, step ${step} of ${RACE_LEN}`}>
        {lanes.map((l) => (
          <div key={l.id} className={`relative h-9 overflow-hidden rounded-xl ${l.me ? "bg-indigo-100 ring-2 ring-indigo-400" : "bg-slate-100"}`}>
            <div aria-hidden className="absolute inset-y-0 right-0 w-2 bg-[repeating-linear-gradient(45deg,#111_0_6px,#fff_6px_12px)]" />
            <span className="absolute top-1/2 -translate-y-1/2 text-2xl transition-all duration-500" style={{ left: `calc(${(l.pos / RACE_LEN) * 100}% - ${(l.pos / RACE_LEN) * 2}rem)` }}>{l.emoji}</span>
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-wider text-indigo-950/40">{l.name}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-sm font-black text-indigo-950/70" role="status">
        {finish != null ? `🏁 You finished ${ordinal(finish)}!` : stalled ? "💦 Engine flooded — wait for it…" : `${ordinal(place)} place · ${RACE_LEN - step} to go`}
      </p>
      <div className="mt-2"><QuestionCard lead={q.lead} prompt={q.prompt} state={state} color={game.colors[0]} /></div>
      <AnswerTiles options={q.options} answer={q.answer} picked={picked} locked={picked !== null || finish != null} onPick={choose} />
      {state === "wrong" && <p className="arcade-pop mt-3 text-center font-black text-red-600">Answer: {q.answer}</p>}
    </div>
  );
}
