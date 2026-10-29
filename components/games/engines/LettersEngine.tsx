"use client";
import { useEffect, useRef, useState } from "react";
import { tilePuzzle, assemble, solution, type TileSkill } from "@/lib/games/english";
import type { EngineProps } from "@/components/games/GamePlayer";

// Tap tiles to fill the blanks — letters for Word Scramble and Missing
// Letters, whole words for Sentence Builder. Tap a filled slot to take it
// back. On a keyboard, type letters (or Backspace) for the letter games.
export default function LettersEngine({ game, difficulty, report, rng = Math.random }: EngineProps) {
  const skill = game.skill as TileSkill;
  const [p, setP] = useState(() => tilePuzzle(skill, difficulty, rng));
  const [used, setUsed] = useState<number[]>([]);       // tile indexes, in slot order
  const [state, setState] = useState<"idle" | "right" | "wrong">("idle");
  const busy = useRef(false);
  const blanks = p.slots.filter((s) => s === null).length;
  const placed = used.map((i) => p.tiles[i]);
  const words = p.joiner === " ";
  const long = p.slots.length > 8; // shrink letter boxes so long words stay on one line on phones

  function next() {
    setP(tilePuzzle(skill, difficulty, rng));
    setUsed([]); setState("idle"); busy.current = false;
  }

  function place(i: number) {
    if (busy.current || used.includes(i)) return;
    const nowUsed = [...used, i];
    setUsed(nowUsed);
    if (nowUsed.length < blanks) return;
    busy.current = true;
    const attempt = assemble(p, nowUsed.map((k) => p.tiles[k]));
    const ok = attempt.toLowerCase() === solution(p).toLowerCase();
    report(ok, undefined, { lead: p.lead, prompt: p.clue, answer: solution(p) });
    setState(ok ? "right" : "wrong");
    setTimeout(next, ok ? 500 : 1500);
  }
  function unplace(slotOrder: number) {
    if (busy.current) return;
    setUsed((u) => u.filter((_, k) => k !== slotOrder));
  }

  useEffect(() => {
    if (words) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Backspace") { setUsed((u) => (busy.current ? u : u.slice(0, -1))); return; }
      const k = e.key.toLowerCase();
      if (k.length !== 1) return;
      const i = p.tiles.findIndex((t, idx) => t === k && !used.includes(idx));
      if (i >= 0) place(i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Render the slots: fixed letters, filled blanks, or empty blanks.
  let blankNo = 0;
  const shown = state === "wrong" ? solution(p).split(p.joiner) : null;
  return (
    <div className="arcade-card p-5 sm:p-7">
      <div className={`rounded-3xl px-4 py-6 text-center transition-colors ${state === "right" ? "bg-emerald-100" : state === "wrong" ? "arcade-shake bg-red-100" : "bg-indigo-50"}`}>
        <p className="text-xs font-black uppercase tracking-[.2em]" style={{ color: game.colors[0] }}>{p.lead}</p>
        <p className="mx-auto mt-2 max-w-lg text-base font-bold leading-snug text-indigo-950/80 sm:text-lg">{p.clue}</p>

        <div className={`mt-5 flex flex-wrap justify-center ${words ? "gap-2" : long ? "gap-1 sm:gap-2" : "gap-1.5 sm:gap-2"}`} aria-live="polite">
          {p.slots.map((fixed, i) => {
            if (fixed !== null) {
              return <span key={i} className={`flex items-center justify-center rounded-xl bg-white/70 font-display font-black uppercase text-indigo-950/70 ${words ? "h-11 px-3 text-base" : long ? "h-11 w-7 text-lg sm:h-14 sm:w-11 sm:text-2xl" : "h-12 w-10 text-2xl sm:h-14 sm:w-12"}`}>{fixed}</span>;
            }
            const order = blankNo++;
            const val = shown ? shown[i] : placed[order];
            return (
              <button key={i} type="button" onClick={() => val !== undefined && !shown && unplace(order)}
                aria-label={val ? `Remove ${val}` : `Empty slot ${order + 1}`}
                className={`flex items-center justify-center rounded-xl border-[3px] font-display font-black transition ${words ? "h-11 min-w-[3.5rem] px-3 text-base" : long ? "h-11 w-7 text-lg uppercase sm:h-14 sm:w-11 sm:text-2xl" : "h-12 w-10 text-2xl uppercase sm:h-14 sm:w-12"} ${
                  val ? (shown ? "border-red-300 bg-white text-red-600" : "border-[var(--g1)] bg-white text-indigo-950") : "border-dashed border-indigo-200 bg-white/40 text-transparent"}`}>
                {val ?? "·"}
              </button>
            );
          })}
        </div>
        {state === "wrong" && <p className="arcade-pop mt-3 font-black text-red-600">Answer: {solution(p)}</p>}
      </div>

      <div className={`mt-5 flex flex-wrap justify-center ${words ? "gap-2" : "gap-2.5"}`} role="group" aria-label="Tiles">
        {p.tiles.map((t, i) => {
          const gone = used.includes(i);
          return (
            <button key={`${i}-${t}`} type="button" onClick={() => place(i)} disabled={gone || state !== "idle"}
              className={`arcade-key ${words ? "!min-h-[48px] px-4 !text-base normal-case" : "h-14 w-14 uppercase sm:h-16 sm:w-16"} ${gone ? "opacity-0" : ""}`}
              style={{ boxShadow: "0 5px 0 var(--g2)" }} aria-label={t}>
              {t}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex justify-center gap-3">
        <button type="button" onClick={() => setUsed([])} disabled={!used.length || state !== "idle"}
          className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-950/70 disabled:opacity-40">↺ Clear</button>
      </div>
    </div>
  );
}
