"use client";
import { useEffect, useRef, useState } from "react";
import { choiceQuestion, type ChoiceSkill, type ChoiceQ } from "@/lib/games/senior";
import { englishChoice, ENGLISH_CHOICE, type EnglishChoiceSkill } from "@/lib/games/english";
import type { Difficulty } from "@/lib/games/generators";
import { moreChoice, MORE_CHOICE, type MoreChoiceSkill } from "@/lib/games/moreMaths";

const nextQuestion = (skill: string, d: Difficulty, rng: () => number): ChoiceQ =>
  ENGLISH_CHOICE.includes(skill) ? englishChoice(skill as EnglishChoiceSkill, d, rng)
    : MORE_CHOICE.includes(skill) ? moreChoice(skill as MoreChoiceSkill, d, rng)
      : choiceQuestion(skill as ChoiceSkill, d, rng);
import type { EngineProps } from "@/components/games/GamePlayer";

// Four big answer tiles, each with its own colour and shape. Tap one, or
// press 1–4. A wrong pick shows the right answer before the next question.
const TILES = [
  { bg: "#E11D48", shadow: "#9F1239", shape: "▲" },
  { bg: "#2563EB", shadow: "#1E40AF", shape: "◆" },
  { bg: "#D97706", shadow: "#92400E", shape: "●" },
  { bg: "#16A34A", shadow: "#166534", shape: "■" },
];

export default function ChoiceEngine({ game, difficulty, report, rng = Math.random, items }: EngineProps) {
  const skill = game.skill;
  // A fixed list (recap game) is played in a shuffled loop; otherwise generated.
  const queue = useRef<ChoiceQ[]>([]);
  const draw = (): ChoiceQ => {
    if (!items?.length) return nextQuestion(skill, difficulty, rng);
    if (!queue.current.length) queue.current = [...items].sort(() => rng() - 0.5);
    const q = queue.current.shift()!;
    return { ...q, options: [...q.options].sort(() => rng() - 0.5) };
  };
  const [q, setQ] = useState(draw);
  const [picked, setPicked] = useState<number | null>(null);
  const busy = useRef(false);

  function choose(i: number) {
    if (busy.current) return;
    busy.current = true;
    const ok = q.options[i] === q.answer;
    setPicked(i);
    report(ok, items?.length ? [q.lead] : undefined, { lead: q.lead, prompt: q.prompt, answer: q.answer, options: q.options });
    setTimeout(() => {
      setQ(draw());
      setPicked(null);
      busy.current = false;
    }, ok ? 350 : 1300);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 4) choose(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const wrong = picked !== null && q.options[picked] !== q.answer;
  return (
    <div className="arcade-card p-5 sm:p-7">
      <div className={`rounded-3xl px-4 py-7 text-center transition-colors ${
        picked === null ? "bg-indigo-50" : wrong ? "arcade-shake bg-red-100" : "bg-emerald-100"}`}>
        <p className={q.lead.length > 32 ? "mx-auto max-w-xl text-base font-bold leading-snug sm:text-lg" : "text-xs font-black uppercase tracking-[.2em]"}
          style={{ color: game.colors[0] }}>{q.lead}</p>
        {q.prompt && (
          <p className={`mt-2 whitespace-pre-line font-display font-black leading-snug tracking-tight ${q.prompt.length > 34 ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"}`}
            aria-live="polite">{q.prompt}</p>
        )}
      </div>
      <div className={`mt-5 grid gap-3 ${q.options.some((o) => o.length > 26) ? "" : "sm:grid-cols-2"}`} role="group" aria-label="Answers">
        {q.options.map((o, i) => {
          const t = TILES[i];
          const isAnswer = o === q.answer;
          const dim = picked !== null && !isAnswer && picked !== i;
          return (
            <button key={`${q.prompt}-${o}`} type="button" onClick={() => choose(i)} aria-disabled={picked !== null}
              className={`arcade-btn flex min-h-[76px] items-center gap-3 !justify-start px-4 py-3 text-left ${q.options.some((o) => o.length > 26) ? "text-base sm:text-lg" : "text-lg sm:text-xl"} ${
                picked !== null && isAnswer ? "arcade-pop ring-4 ring-white" : ""} ${dim ? "opacity-30" : ""}`}
              style={{ ["--btn" as any]: t.bg, ["--btn-shadow" as any]: t.shadow }}>
              <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-base">{t.shape}</span>
              <span className="min-w-0 break-words font-display font-black">{o}</span>
              <span className="sr-only">(option {i + 1})</span>
            </button>
          );
        })}
      </div>
      {wrong && <p className="arcade-pop mt-4 text-center font-black text-red-600">Answer: {q.answer}</p>}
      <p className="mt-3 hidden text-center text-xs font-bold text-indigo-950/40 sm:block">Keyboard: press 1 – 4</p>
    </div>
  );
}
