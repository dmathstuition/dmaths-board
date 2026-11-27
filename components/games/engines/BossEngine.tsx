"use client";
import { useEffect, useRef, useState } from "react";
import type { EngineProps } from "@/components/games/GamePlayer";
import { AnswerTiles, QuestionCard } from "@/components/games/engines/Tiles";
import { BOSS_HEARTS, bossAnswer, newBoss } from "@/lib/games/formats";
import { itemDrawer } from "@/lib/games/source";

// Boss Battle: right answers hit the boss (a streak hits harder), wrong
// answers cost a heart. Beat it and a bigger one comes, with a heart back.
export default function BossEngine({ game, difficulty, report, end, show, rng = Math.random, items }: EngineProps) {
  const draw = useRef(itemDrawer(game.skill, difficulty, rng, items)).current;
  const [q, setQ] = useState(draw);
  const [boss, setBoss] = useState(() => newBoss(difficulty));
  const [picked, setPicked] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const streak = useRef(0), busy = useRef(false);
  const status = (b: typeof boss) => `${game.title}: boss ${b.hp}/${b.max} HP · ${"❤️".repeat(b.hearts)}${"🖤".repeat(BOSS_HEARTS - b.hearts)} · ${b.beaten} beaten`;
  useEffect(() => { show?.({ lead: q.lead, prompt: q.prompt, options: q.options, status: status(boss) }); }); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(i: number) {
    if (busy.current || boss.lost) return;
    busy.current = true;
    const ok = q.options[i] === q.answer;
    setPicked(i);
    streak.current = ok ? streak.current + 1 : 0;
    report(ok, undefined, { lead: q.lead, prompt: q.prompt, answer: q.answer, options: q.options });
    const r = bossAnswer(boss, difficulty, ok, streak.current);
    setBoss(r.state);
    setNote(!ok ? "💔 Ouch!" : r.defeated ? `🎉 ${game.title.replace(/^.* /, "")} defeated! A bigger one appears…` : `⚔️ −${r.state.hit} HP`);
    const lost = r.state.lost;
    setTimeout(() => {
      if (lost) { end?.(); return; }
      setQ(draw()); setPicked(null); setNote(null); busy.current = false;
    }, ok ? (r.defeated ? 1100 : 450) : 1300);
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { const n = Number(e.key); if (n >= 1 && n <= 4) choose(n - 1); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const state = picked === null ? "idle" : q.options[picked] === q.answer ? "right" : "wrong";
  return (
    <div className="arcade-card p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl text-5xl ${state === "right" ? "arcade-shake" : "arcade-bob"}`} style={{ background: `linear-gradient(135deg, ${game.colors[0]}33, ${game.colors[1]}55)` }} aria-hidden>{game.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-indigo-950/60">
            <span>Boss {boss.beaten + 1}</span><span aria-label={`Boss health ${boss.hp} of ${boss.max}`}>{boss.hp} / {boss.max} HP</span>
          </div>
          <div className="mt-1 h-4 overflow-hidden rounded-full bg-indigo-100" aria-hidden><div className="h-full rounded-full transition-all duration-300" style={{ width: `${(boss.hp / boss.max) * 100}%`, background: `linear-gradient(90deg, ${game.colors[0]}, ${game.colors[1]})` }} /></div>
          <p className="mt-1 text-lg tracking-wide" aria-label={`${boss.hearts} hearts left`}>{"❤️".repeat(boss.hearts)}{"🖤".repeat(BOSS_HEARTS - boss.hearts)}</p>
        </div>
      </div>
      {note && <p role="status" className="arcade-pop mt-2 text-center text-base font-black" style={{ color: game.colors[0] }}>{note}</p>}
      <div className="mt-3"><QuestionCard lead={q.lead} prompt={q.prompt} state={state} color={game.colors[0]} /></div>
      <AnswerTiles options={q.options} answer={q.answer} picked={picked} locked={picked !== null} onPick={choose} />
      {state === "wrong" && <p className="arcade-pop mt-3 text-center font-black text-red-600">Answer: {q.answer}</p>}
    </div>
  );
}
