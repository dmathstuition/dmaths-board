"use client";
import { useEffect, useRef, useState } from "react";
import type { EngineProps } from "@/components/games/GamePlayer";
import { AnswerTiles, QuestionCard } from "@/components/games/engines/Tiles";
import { LADDER, SAFE_RUNGS, ladderAnswer, ladderPrize, newLadder } from "@/lib/games/formats";
import { fiftyFifty, itemDrawer } from "@/lib/games/source";

// Money Ladder: ten rungs. A wrong answer drops you to the last safe rung.
// One 50:50 and one skip. The top rung ends the game.
export default function LadderEngine({ game, difficulty, report, end, show, rng = Math.random, items }: EngineProps) {
  const draw = useRef(itemDrawer(game.skill, difficulty, rng, items)).current;
  const [q, setQ] = useState(draw);
  const [lad, setLad] = useState(newLadder);
  const [picked, setPicked] = useState<number | null>(null);
  const [gone, setGone] = useState<string[]>([]);
  const busy = useRef(false);
  const status = `${game.title}: rung ${lad.rung}/${LADDER.length} · ₦${ladderPrize(lad.rung).toLocaleString("en-NG")}`;
  useEffect(() => { show?.({ lead: q.lead, prompt: q.prompt, options: q.options, status }); }); // eslint-disable-line react-hooks/exhaustive-deps

  function next() { setQ(draw()); setPicked(null); setGone([]); busy.current = false; }
  function choose(i: number) {
    if (busy.current || lad.won) return;
    busy.current = true;
    const ok = q.options[i] === q.answer;
    setPicked(i);
    report(ok, undefined, { lead: q.lead, prompt: q.prompt, answer: q.answer, options: q.options });
    const nl = ladderAnswer(lad, ok);
    setLad(nl);
    setTimeout(() => { if (nl.won) end?.(); else next(); }, ok ? (nl.won ? 1600 : 450) : 1500);
  }
  function fifty() {
    if (!lad.fifty || busy.current) return;
    const keep = fiftyFifty(q, rng);
    setGone(q.options.filter((o) => !keep.includes(o)));
    setLad({ ...lad, fifty: false });
  }
  function skip() { if (!lad.skip || busy.current) return; setLad({ ...lad, skip: false }); next(); }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { const n = Number(e.key); if (n >= 1 && n <= 4) choose(n - 1); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const state = picked === null ? "idle" : q.options[picked] === q.answer ? "right" : "wrong";
  const rungs = [...LADDER].map((p, i) => ({ p, n: i + 1 })).reverse();
  return (
    <div className="arcade-card p-4 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
        <ol className="grid gap-1" aria-label="The ladder" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          {rungs.map(({ p, n }) => {
            const safe = SAFE_RUNGS.includes((n - 1) as 4 | 9), here = lad.rung + 1 === n, done = lad.rung >= n;
            return (
              <li key={n} aria-current={here ? "step" : undefined} className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs font-black sm:col-span-2 ${here ? "bg-amber-400 text-amber-950" : done ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                <span>{n}</span><span>{safe ? "🔒 " : ""}₦{p.toLocaleString("en-NG")}</span>
              </li>
            );
          })}
        </ol>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm font-black text-indigo-950/70" role="status">{lad.dropped ? `⬇️ Back to ₦${ladderPrize(lad.rung).toLocaleString("en-NG")}` : lad.won ? "🏆 You reached the top!" : `Playing for ₦${LADDER[Math.min(lad.rung, LADDER.length - 1)].toLocaleString("en-NG")}`}</p>
            <button type="button" onClick={fifty} disabled={!lad.fifty || picked !== null} className="rounded-xl bg-indigo-100 px-3 py-2 text-xs font-black text-indigo-900 disabled:opacity-35">50:50</button>
            <button type="button" onClick={skip} disabled={!lad.skip || picked !== null} className="rounded-xl bg-indigo-100 px-3 py-2 text-xs font-black text-indigo-900 disabled:opacity-35">Skip</button>
          </div>
          <div className="mt-2"><QuestionCard lead={q.lead} prompt={q.prompt} state={state} color={game.colors[0]} /></div>
          <AnswerTiles options={q.options} answer={q.answer} picked={picked} locked={picked !== null} hidden={gone} onPick={choose} />
          {state === "wrong" && <p className="arcade-pop mt-3 text-center font-black text-red-600">Answer: {q.answer}</p>}
        </div>
      </div>
    </div>
  );
}
