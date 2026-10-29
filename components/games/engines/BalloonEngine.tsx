"use client";
import { useEffect, useRef, useState } from "react";
import { question, withOptions } from "@/lib/games/generators";
import type { EngineProps } from "@/components/games/GamePlayer";

const COLORS = [["#F43F5E", "#BE123C"], ["#3B82F6", "#1D4ED8"], ["#22C55E", "#15803D"], ["#A855F7", "#7E22CE"]];
const SPEED = { easy: 9, medium: 7.5, hard: 6 } as const; // seconds to float away
const LANES = [10, 35, 60, 85];

// Balloons carrying answers rise up the screen. Pop the right one before it
// escapes off the top.
export default function BalloonEngine({ game, difficulty, report, rng = Math.random }: EngineProps) {
  const [round, setRound] = useState(0);
  const [set, setSet] = useState(() => withOptions(question(game.skill, difficulty, rng), rng));
  const item = () => ({ lead: set.question.ask, prompt: set.question.prompt, answer: String(set.question.answer), options: set.options.map(String) });
  const [popped, setPopped] = useState<number | null>(null);
  const [missed, setMissed] = useState<Set<number>>(new Set());
  const done = useRef(false);
  const dur = SPEED[difficulty];

  function next() {
    done.current = false;
    setSet(withOptions(question(game.skill, difficulty, rng), rng));
    setPopped(null); setMissed(new Set());
    setRound((r) => r + 1);
  }

  // The right balloon floated away — counts as a miss. Each lane rises at its
  // own speed, so wait for the correct one specifically.
  useEffect(() => {
    const idx = set.options.indexOf(set.question.answer);
    const t = setTimeout(() => {
      if (done.current) return;
      done.current = true;
      report(false, undefined, item());
      next();
    }, (dur + idx * 0.35) * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function tap(i: number, v: number) {
    if (done.current || missed.has(i)) return;
    if (v === set.question.answer) {
      done.current = true;
      setPopped(i);
      report(true);
      setTimeout(next, 280);
    } else {
      setMissed((m) => new Set(m).add(i));
      report(false, undefined, item());
    }
  }

  return (
    <div className="arcade-card overflow-hidden p-0">
      <div className="border-b-4 border-indigo-50 px-5 py-5 text-center">
        <p className="text-xs font-black uppercase tracking-[.2em] text-indigo-950/40">Pop the answer to</p>
        <p className="font-display text-4xl font-black tracking-tight sm:text-5xl" aria-live="polite">{set.question.prompt}</p>
        {set.question.ask && <p className="font-display text-xl font-black" style={{ color: "var(--g1)" }}>{set.question.ask}</p>}
      </div>
      <div className="relative h-[430px] overflow-hidden" style={{ background: "linear-gradient(180deg, #E0F2FE 0%, #F0F9FF 60%, #DCFCE7 100%)" }}>
        {/* clouds */}
        <span aria-hidden className="absolute left-[8%] top-10 text-5xl opacity-70">☁️</span>
        <span aria-hidden className="absolute right-[10%] top-28 text-4xl opacity-60">☁️</span>
        {set.options.map((v, i) => {
          const [c1, c2] = COLORS[i % COLORS.length];
          const wrong = missed.has(i);
          return (
            <div key={`${round}-${i}`} className="absolute bottom-[-150px] -translate-x-1/2" style={{ left: `${LANES[i]}%` }}>
            <button type="button" onClick={() => tap(i, v)} aria-label={`Balloon ${v}`}
              disabled={wrong}
              className="arcade-rise block rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-950/40"
              style={{ ["--dur" as any]: `${dur + i * 0.35}s`, ["--rise" as any]: "-600px" }}>
              <span className={`flex flex-col items-center ${popped === i ? "arcade-burst" : wrong ? "arcade-shake opacity-40" : "arcade-bob"}`}
                style={{ animationDelay: `${i * 0.3}s` }}>
                <span className="relative flex h-24 w-20 items-center justify-center font-display text-2xl font-black text-white sm:h-28 sm:w-24 sm:text-3xl"
                  style={{
                    borderRadius: "50% 50% 48% 52% / 58% 58% 42% 42%",
                    background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,.55), transparent 28%), linear-gradient(160deg, ${c1}, ${c2})`,
                    boxShadow: "inset -8px -10px 0 rgba(0,0,0,.12)",
                  }}>
                  {v}
                </span>
                <span className="-mt-1 h-0 w-0 border-x-[7px] border-t-[9px] border-x-transparent" style={{ borderTopColor: c2 }} />
                <svg width="20" height="60" aria-hidden><path d="M10 0 q -8 15 0 30 t 0 30" stroke="rgba(30,27,75,.35)" strokeWidth="1.5" fill="none" /></svg>
              </span>
            </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
