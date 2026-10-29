"use client";
import { useEffect, useRef, useState } from "react";
import { question } from "@/lib/games/generators";
import { questionTags } from "@/lib/games/performance";
import type { EngineProps } from "@/components/games/GamePlayer";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];

// Type-in quiz: big question, answer box, chunky keypad (keyboard works too).
export default function QuizEngine({ game, difficulty, report, rng = Math.random }: EngineProps) {
  const [q, setQ] = useState(() => question(game.skill, difficulty, rng));
  const [val, setVal] = useState("");
  const [state, setState] = useState<"idle" | "right" | "wrong">("idle");
  const [touch, setTouch] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // On phones use only the on-screen keypad so the native keyboard doesn't cover the game.
  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    input.current?.focus();
  }, []);

  function submit() {
    if (!val || state !== "idle") return;
    const ok = Number(val) === q.answer;
    report(ok, questionTags(game.skill, q.prompt), { lead: q.ask, prompt: q.prompt, answer: String(q.answer) });
    setState(ok ? "right" : "wrong");
    setTimeout(() => {
      setQ(question(game.skill, difficulty, rng));
      setVal(""); setState("idle");
      input.current?.focus();
    }, ok ? 220 : 1000);
  }

  function press(k: string) {
    if (state !== "idle") return;
    if (k === "✓") return submit();
    if (k === "⌫") return setVal((v) => v.slice(0, -1));
    setVal((v) => (v.length < 6 ? (v === "0" ? k : v + k) : v));
  }

  const isMissing = q.prompt.includes("?");
  return (
    <div className="arcade-card p-5 sm:p-7">
      <div className={`rounded-3xl py-8 text-center transition-colors ${state === "right" ? "bg-emerald-100" : state === "wrong" ? "arcade-shake bg-red-100" : "bg-indigo-50"}`}>
        <p className="px-3 font-display text-4xl font-black tracking-tight sm:text-5xl" aria-live="polite">
          {q.prompt}{isMissing || q.ask ? "" : " = ?"}
        </p>
        {q.ask && <p className="mt-2 font-display text-2xl font-black" style={{ color: "var(--g1)" }}>{q.ask}</p>}
        {state === "wrong" && <p className="arcade-pop mt-3 text-base font-black text-red-600">The answer was {q.answer}</p>}
      </div>

      <form className="mt-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label htmlFor="quiz-answer" className="sr-only">Your answer</label>
        <input id="quiz-answer" ref={input} value={val} inputMode={touch ? "none" : "numeric"} autoComplete="off"
          onChange={(e) => state === "idle" && setVal(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="h-16 w-full rounded-2xl border-4 border-indigo-100 bg-white text-center font-display text-3xl font-black text-indigo-950 outline-none focus:border-[var(--g1)]"
          placeholder="Your answer" aria-label="Your answer" />
      </form>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {KEYS.map((k) => (
          <button key={k} type="button" onClick={() => press(k)} aria-label={k === "⌫" ? "Delete" : k === "✓" ? "Submit" : k}
            className="arcade-key"
            style={k === "✓" ? { background: "var(--g1)", color: "#fff", boxShadow: "0 5px 0 rgba(0,0,0,.25)" } : undefined}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
