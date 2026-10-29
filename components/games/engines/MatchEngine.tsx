"use client";
import { useState } from "react";
import { matchBoard, type MatchCard } from "@/lib/games/generators";
import type { EngineProps } from "@/components/games/GamePlayer";

// Flip two cards: a fact and its answer make a pair (times tables, trig values,
// element symbols or SI units, depending on the game's skill).
// Clear the board and a fresh one deals in.
export default function MatchEngine({ game, difficulty, report, rng = Math.random }: EngineProps) {
  const deal = () => matchBoard(difficulty, rng, undefined, game.skill);
  const [cards, setCards] = useState<MatchCard[]>(deal);
  const [up, setUp] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [lock, setLock] = useState(false);
  const [boards, setBoards] = useState(1);

  function flip(c: MatchCard) {
    if (lock || matched.has(c.id) || up.includes(c.id)) return;
    const nowUp = [...up, c.id];
    setUp(nowUp);
    if (nowUp.length < 2) return;

    const [a, b] = nowUp.map((id) => cards.find((x) => x.id === id)!);
    if (a.pair === b.pair) {
      const m = new Set(matched).add(a.id).add(b.id);
      setMatched(m); setUp([]);
      report(true);
      if (m.size === cards.length) {
        setTimeout(() => { setCards(deal()); setMatched(new Set()); setBoards((n) => n + 1); }, 550);
      }
    } else {
      // The replay asks for the partner of the question-side card.
      const q = a.side === "q" ? a : b.side === "q" ? b : a;
      const partner = cards.find((x) => x.pair === q.pair && x.id !== q.id);
      const others = cards.filter((x) => x.side !== q.side && x.pair !== q.pair).map((x) => x.text).slice(0, 3);
      report(false, undefined, partner ? { lead: "Which one matches?", prompt: q.text, answer: partner.text, options: [partner.text, ...others] } : undefined);
      setLock(true);
      setTimeout(() => { setUp([]); setLock(false); }, 750);
    }
  }

  return (
    <div className="arcade-card p-4 sm:p-6">
      <p className="mb-3 text-center text-xs font-black uppercase tracking-[.2em] text-indigo-950/40">
        Board {boards} · {matched.size / 2} of {cards.length / 2} pairs
      </p>
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-2.5 sm:gap-3" style={{ perspective: "900px" }}>
        {cards.map((c, i) => {
          const isUp = up.includes(c.id) || matched.has(c.id);
          const isMatched = matched.has(c.id);
          return (
            <button key={`${boards}-${c.id}`} type="button" onClick={() => flip(c)}
              aria-label={isUp ? `Card ${c.text}` : `Hidden card ${i + 1}`}
              className={`arcade-flip relative aspect-[4/5] w-full ${isUp ? "is-up" : ""}`}>
              <span className="arcade-face absolute inset-0 flex items-center justify-center rounded-2xl text-3xl font-black text-white shadow-[0_5px_0_rgba(0,0,0,.18)]"
                style={{ background: "linear-gradient(135deg, var(--g1), var(--g2))" }}>
                <span className="opacity-80">?</span>
              </span>
              <span className={`arcade-face arcade-face-back absolute inset-0 flex items-center justify-center rounded-2xl px-1 text-center font-display font-black shadow-[0_5px_0_rgba(0,0,0,.12)] ${
                isMatched ? "bg-emerald-100 text-emerald-700" : "bg-white text-indigo-950 ring-4 ring-[var(--g1)]"
              } ${c.text.length > 9 ? "text-xs leading-tight sm:text-sm" : c.text.length > 5 ? "text-base sm:text-xl" : c.side === "q" ? "text-lg sm:text-2xl" : "text-2xl sm:text-3xl"}`}>
                {c.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
