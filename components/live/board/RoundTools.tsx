"use client";
// Two tools on an answer-board round, for the teacher:
//   • FollowUp — after a round is marked, the A.I. writes the same question at
//     three levels and each learner gets the one that suits how they did
//     (lib/adaptive.ts). Starts a new round with a different question for
//     each learner, so it uses the same answering, marking and hand-in.
//   • (peer marking is in PeerMark.tsx)
import { useState } from "react";
import { WORK_LEVELS } from "@/lib/classWorkAi";
import { TIERS, cleanTiers, splitTiers, type Tier, type Tiers } from "@/lib/adaptive";

type P = { id: string; name: string };
export function FollowUp({ question, hasOwnTasks, level, setLevel, learners, marks, max, answered, sent, nameOf, onSend }: {
  question: string; hasOwnTasks: boolean; level: string; setLevel: (l: string) => void;
  learners: P[]; marks: Record<string, number>; max: number; answered: Set<string>;
  sent: Record<string, Tier>; nameOf: (id: string) => string; onSend: (t: Tiers, by: Record<string, Tier>) => void;
}) {
  const [tiers, setTiers] = useState<Tiers | null>(null);
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const split = splitTiers(learners, marks, max, answered);
  const marked = learners.filter((l) => marks[l.id] != null).length;
  const sentIds = Object.keys(sent);
  async function write() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/quiz-sets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ai-tiers", question, level }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    const got = cleanTiers(j.tiers);
    if (!r?.ok || !got) { setErr(j.error ?? "Couldn't write them — check the internet and try again."); return; }
    setTiers(got);
  }
  const set = (t: Tier, p: Partial<Tiers[Tier]>) => setTiers((cur) => (cur ? { ...cur, [t]: { ...cur[t], ...p } } : cur));
  const field = "w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500";
  return (
    <details className="mt-3 rounded-2xl bg-violet-50 p-3 ring-1 ring-violet-200" open={!!tiers || sentIds.length > 0}>
      <summary className="cursor-pointer text-sm font-black text-violet-900">🎯 Follow-up for each learner <span className="font-bold text-violet-900/60">— easier, same or harder, by how they did</span></summary>
      {hasOwnTasks || !question.trim() ? (
        <p className="mt-2 text-xs font-bold text-ink/60">{hasOwnTasks ? "This round gave each learner their own question. A follow-up works from one question for everyone." : "Add a question to the round first — the follow-up is written from it."}</p>
      ) : (
        <div className="mt-2 grid gap-2">
          <p className="text-xs font-bold text-ink/65">{marked} of {learners.length} marked. Marked ✓ or 80%+ → harder · under half, or no answer → easier · otherwise the same level. Mark first for the best split.</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Level for the follow-up" className="min-h-[36px] rounded-lg bg-white px-2 text-sm font-bold ring-1 ring-slate-200">{WORK_LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
            <button type="button" onClick={write} disabled={busy} className="min-h-[40px] rounded-xl bg-violet-600 px-4 text-sm font-black text-white disabled:opacity-40">{busy ? "Writing…" : tiers ? "✨ Write them again" : "✨ Write the 3 follow-ups"}</button>
          </div>
          {err && <p role="alert" className="text-xs font-bold text-red-700">{err}</p>}
          {tiers && (
            <>
              <ul className="grid gap-2" aria-label="Follow-up questions">
                {TIERS.map((t) => (
                  <li key={t.k} className="grid gap-1 rounded-xl bg-white p-2 ring-1 ring-violet-100">
                    <p className="text-xs font-black text-violet-900">{t.icon} {t.label} <span className="font-bold text-ink/50">· {split.counts[t.k]} learner{split.counts[t.k] === 1 ? "" : "s"}</span></p>
                    <input value={tiers[t.k].q} onChange={(e) => set(t.k, { q: e.target.value })} maxLength={220} aria-label={`${t.label} question`} className={field} />
                    <input value={tiers[t.k].a} onChange={(e) => set(t.k, { a: e.target.value })} maxLength={140} aria-label={`${t.label} answer`} placeholder="Answer (only you see it)" className={field} />
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => onSend(tiers, split.by)} disabled={!learners.length} className="min-h-[44px] justify-self-start rounded-xl bg-emerald-600 px-4 text-sm font-black text-white disabled:opacity-40">▶ Send to each learner ({learners.length})</button>
              <p className="text-[11px] font-bold text-ink/50">This starts a new round. Answers show on each learner&apos;s board as usual, with your answer key beside the question when you open their work.</p>
            </>
          )}
          {sentIds.length > 0 && (
            <p role="status" className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-ink/70">Sent: {TIERS.map((t) => `${t.icon} ${sentIds.filter((id) => sent[id] === t.k).length}`).join(" · ")}
              {" — "}{TIERS.map((t) => { const who = sentIds.filter((id) => sent[id] === t.k).map(nameOf); return who.length ? `${t.label}: ${who.join(", ")}` : null; }).filter(Boolean).join(" · ")}</p>
          )}
        </div>
      )}
    </details>
  );
}
