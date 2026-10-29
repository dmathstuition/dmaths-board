"use client";
import { useMemo, useState } from "react";
import { isRight, replayOptions, tipFor, type MistakeItem } from "@/lib/games/mistakes";

// "Fix my mistakes": the questions missed in a round come back one at a time
// with a tip. A miss goes back into the queue, so the replay ends once every
// question has been answered correctly — then the topics count as mastered.
export default function MistakeReplay({ items, skill, color, onDone, onClose }: {
  items: MistakeItem[]; skill: string; color: string;
  onDone: (result: { fixed: MistakeItem[]; firstTry: number; attempts: number }) => void; onClose: () => void;
}) {
  const [queue, setQueue] = useState<MistakeItem[]>(items);
  const [given, setGiven] = useState("");
  const [state, setState] = useState<"ask" | "right" | "wrong">("ask");
  const [attempts, setAttempts] = useState(0);
  const [missedOnce, setMissedOnce] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(0);
  const cur = queue[0];
  const options = useMemo(() => (cur ? replayOptions(cur) : null), [cur]);

  function check(value: string) {
    if (!cur || state !== "ask") return;
    setAttempts((a) => a + 1);
    setGiven(value);
    if (isRight(cur, value)) setState("right");
    else { setState("wrong"); setMissedOnce((s) => new Set(s).add(cur.prompt)); }
  }
  function next() {
    if (!cur) return;
    const rest = queue.slice(1);
    const nextQueue = state === "wrong" ? [...rest, cur] : rest;
    const finished = state === "right" ? done + 1 : done;
    setDone(finished);
    setQueue(nextQueue); setGiven(""); setState("ask");
    if (!nextQueue.length) onDone({ fixed: items, firstTry: items.filter((m) => !missedOnce.has(m.prompt)).length, attempts: attempts });
  }

  if (!cur) return null;
  return (
    <div className="arcade-card arcade-pop mt-8 p-6 text-left sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[.2em]" style={{ color }}>🛠 Fix my mistakes · {done}/{items.length} fixed</p>
        <button type="button" onClick={onClose} className="text-xs font-bold text-indigo-950/50 hover:text-indigo-950">Stop</button>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-indigo-100"><div className="h-full rounded-full transition-all" style={{ width: `${(done / items.length) * 100}%`, background: color }} /></div>

      <div className={`mt-5 rounded-3xl px-4 py-6 text-center ${state === "right" ? "bg-emerald-100" : state === "wrong" ? "bg-red-100" : "bg-indigo-50"}`}>
        {cur.lead && <p className="text-xs font-black uppercase tracking-[.16em] text-indigo-950/50">{cur.lead}</p>}
        <p className="mt-1 whitespace-pre-line font-display text-2xl font-black text-indigo-950 sm:text-3xl" aria-live="polite">{cur.prompt}</p>
        <p className="mt-2 text-xs font-bold text-indigo-950/45">Topic: {cur.tag}</p>
      </div>

      {state === "ask" && (options ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <button key={o} type="button" onClick={() => check(o)} className="min-h-[52px] rounded-2xl bg-white px-4 text-left font-bold text-indigo-950 ring-2 ring-indigo-100 hover:ring-[var(--g1)]">{o}</button>
          ))}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); check(given); }} className="mt-4 flex gap-2">
          <label htmlFor="replay-answer" className="sr-only">Your answer</label>
          <input id="replay-answer" autoFocus value={given} onChange={(e) => setGiven(e.target.value)} className="min-h-[52px] min-w-0 flex-1 rounded-2xl border-2 border-indigo-100 px-4 text-lg font-bold text-indigo-950 focus:border-[var(--g1)] focus:outline-none" placeholder="Type your answer" />
          <button type="submit" disabled={!given.trim()} className="arcade-btn !min-h-[52px] px-6" style={{ ["--btn" as any]: color }}>Check</button>
        </form>
      ))}

      {state !== "ask" && (
        <div className="mt-4 space-y-3">
          <p className={`font-black ${state === "right" ? "text-emerald-700" : "text-red-700"}`}>
            {state === "right" ? "✓ Fixed it!" : <>Not quite — the answer is <span className="underline">{cur.answer}</span>. It&apos;ll come back once more.</>}
          </p>
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">💡 {tipFor(skill, cur)}</p>
          <button type="button" onClick={next} className="arcade-btn w-full" style={{ ["--btn" as any]: color }}>{queue.length === 1 && state === "right" ? "Finish" : "Next"}</button>
        </div>
      )}
    </div>
  );
}
