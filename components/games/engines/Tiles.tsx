"use client";
// Four big answer tiles, shared by the newer game formats (boss, race, ladder).
export const TILES = [
  { bg: "#E11D48", shadow: "#9F1239", shape: "▲" },
  { bg: "#2563EB", shadow: "#1E40AF", shape: "◆" },
  { bg: "#D97706", shadow: "#92400E", shape: "●" },
  { bg: "#16A34A", shadow: "#166534", shape: "■" },
];
export function AnswerTiles({ options, answer, picked, locked, hidden = [], onPick }: {
  options: string[]; answer: string; picked: number | null; locked: boolean; hidden?: string[]; onPick: (i: number) => void;
}) {
  const long = options.some((o) => o.length > 26);
  return (
    <div className={`mt-4 grid gap-3 ${long ? "" : "sm:grid-cols-2"}`} role="group" aria-label="Answers">
      {options.map((o, i) => {
        const t = TILES[i % TILES.length], isAnswer = o === answer, gone = hidden.includes(o);
        const dim = picked !== null && !isAnswer && picked !== i;
        return (
          <button key={`${o}-${i}`} type="button" onClick={() => onPick(i)} disabled={locked || gone} aria-label={`${o}${gone ? " (removed)" : ""}`}
            className={`arcade-btn flex min-h-[68px] items-center gap-3 !justify-start px-4 py-3 text-left ${long ? "text-base sm:text-lg" : "text-lg sm:text-xl"} ${picked !== null && isAnswer ? "arcade-pop ring-4 ring-white" : ""} ${dim || gone ? "opacity-30" : ""}`}
            style={{ ["--btn" as any]: t.bg, ["--btn-shadow" as any]: t.shadow }}>
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20 text-sm">{t.shape}</span>
            <span className="min-w-0 break-words font-display font-black">{o}</span>
          </button>
        );
      })}
    </div>
  );
}
export function QuestionCard({ lead, prompt, state, color }: { lead: string; prompt: string; state: "idle" | "right" | "wrong"; color: string }) {
  return (
    <div className={`rounded-3xl px-4 py-6 text-center transition-colors ${state === "idle" ? "bg-indigo-50" : state === "wrong" ? "arcade-shake bg-red-100" : "bg-emerald-100"}`}>
      {lead && <p className={lead.length > 32 ? "mx-auto max-w-xl text-base font-bold leading-snug sm:text-lg" : "text-xs font-black uppercase tracking-[.2em]"} style={{ color }}>{lead}</p>}
      <p className={`mt-1 whitespace-pre-line font-display font-black leading-snug tracking-tight ${prompt.length > 34 ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"}`} aria-live="polite">{prompt}</p>
    </div>
  );
}
