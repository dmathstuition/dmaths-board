"use client";
import { useEffect, useRef, useState } from "react";
import { statement } from "@/lib/games/generators";
import type { EngineProps } from "@/components/games/GamePlayer";

// Is the statement right? Tap True / False, or press T / F (← / →).
export default function TrueFalseEngine({ game, difficulty, report, rng = Math.random }: EngineProps) {
  const [s, setS] = useState(() => statement(difficulty, rng, game.skill));
  const [state, setState] = useState<"idle" | "right" | "wrong">("idle");
  const busy = useRef(false);

  function answer(saysTrue: boolean) {
    if (busy.current) return;
    busy.current = true;
    const ok = saysTrue === s.isTrue;
    report(ok, undefined, { lead: "True or false?", prompt: s.text, answer: s.isTrue ? "True" : "False", options: ["True", "False"] });
    setState(ok ? "right" : "wrong");
    setTimeout(() => { setS(statement(difficulty, rng, game.skill)); setState("idle"); busy.current = false; }, ok ? 220 : 800);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "t" || k === "arrowleft") answer(true);
      if (k === "f" || k === "arrowright") answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="arcade-card p-5 sm:p-7">
      <div className={`flex min-h-[180px] flex-col items-center justify-center rounded-3xl px-4 text-center transition-colors ${
        state === "right" ? "bg-emerald-100" : state === "wrong" ? "arcade-shake bg-red-100" : "bg-indigo-50"
      }`}>
        <p className={`font-display font-black tracking-tight ${s.text.length > 40 ? "text-2xl sm:text-3xl" : s.text.length > 22 ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"}`} aria-live="polite">{s.text}</p>
        {state === "wrong" && <p className="arcade-pop mt-3 font-black text-red-600">It was {s.isTrue ? "TRUE" : "FALSE"}</p>}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <button type="button" onClick={() => answer(true)} className="arcade-btn h-24 text-2xl"
          style={{ ["--btn" as any]: "#16A34A", ["--btn-shadow" as any]: "#166534" }}>✓ True</button>
        <button type="button" onClick={() => answer(false)} className="arcade-btn h-24 text-2xl"
          style={{ ["--btn" as any]: "#DC2626", ["--btn-shadow" as any]: "#991B1B" }}>✗ False</button>
      </div>
      <p className="mt-3 hidden text-center text-xs font-bold text-indigo-950/40 sm:block">Keyboard: T / ← for True · F / → for False</p>
    </div>
  );
}
