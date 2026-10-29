"use client";
import { useState } from "react";
import { bondsBoard, BOND_TARGET } from "@/lib/games/generators";
import type { EngineProps } from "@/components/games/GamePlayer";

const BUBBLE = ["#F43F5E", "#F97316", "#EAB308", "#22C55E", "#06B6D4", "#6366F1", "#A855F7", "#EC4899"];
type Bubble = { id: number; v: number; gone: boolean };

const deal = (d: EngineProps["difficulty"], rng: () => number = Math.random): Bubble[] => bondsBoard(d, rng).map((v, id) => ({ id, v, gone: false }));

// Tap two bubbles that add up to the target to pop them.
export default function BondsEngine({ difficulty, report, rng = Math.random }: EngineProps) {
  const target = BOND_TARGET[difficulty];
  const [bubbles, setBubbles] = useState<Bubble[]>(() => deal(difficulty, rng));
  const [pick, setPick] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const [deck, setDeck] = useState(1);

  function tap(b: Bubble) {
    if (b.gone) return;
    if (pick === null) { setPick(b.id); return; }
    if (pick === b.id) { setPick(null); return; }
    const first = bubbles.find((x) => x.id === pick)!;
    if (first.v + b.v === target) {
      const next = bubbles.map((x) => (x.id === b.id || x.id === first.id ? { ...x, gone: true } : x));
      setBubbles(next); setPick(null);
      report(true);
      if (next.every((x) => x.gone)) setTimeout(() => { setBubbles(deal(difficulty, rng)); setDeck((n) => n + 1); }, 400);
    } else {
      report(false, undefined, { lead: `Make ${target}`, prompt: `${first.v} + ? = ${target}`, answer: String(target - first.v) });
      setWrong([first.id, b.id]); setPick(null);
      setTimeout(() => setWrong([]), 400);
    }
  }

  return (
    <div className="arcade-card p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-center gap-3">
        <span className="text-sm font-black uppercase tracking-[.2em] text-indigo-950/40">Make</span>
        <span className="flex h-20 w-20 items-center justify-center rounded-full font-display text-4xl font-black text-white shadow-[0_6px_0_rgba(0,0,0,.2)]"
          style={{ background: "linear-gradient(135deg, var(--g1), var(--g2))" }}>{target}</span>
      </div>
      <div className="grid grid-cols-4 gap-3 sm:gap-4">
        {bubbles.map((b, i) => {
          const sel = pick === b.id, bad = wrong.includes(b.id);
          return (
            <button key={`${deck}-${b.id}`} type="button" onClick={() => tap(b)} disabled={b.gone}
              aria-label={b.gone ? "Popped" : `Bubble ${b.v}${sel ? ", selected" : ""}`} aria-pressed={sel}
              className={`aspect-square w-full rounded-full font-display text-2xl font-black text-white transition sm:text-3xl ${
                b.gone ? "arcade-burst" : bad ? "arcade-shake" : sel ? "scale-110 ring-[6px] ring-indigo-950/70" : "arcade-pop hover:scale-105"
              }`}
              style={{
                background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,.55), transparent 30%), ${BUBBLE[i % BUBBLE.length]}`,
                boxShadow: "inset -6px -8px 0 rgba(0,0,0,.15), 0 5px 0 rgba(0,0,0,.12)",
                animationDelay: b.gone ? undefined : `${i * 0.03}s`,
              }}>
              {b.gone ? "" : b.v}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs font-black uppercase tracking-[.2em] text-indigo-950/40">Board {deck}</p>
    </div>
  );
}
