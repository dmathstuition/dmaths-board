"use client";
import { useEffect, useState } from "react";
import { ReadingButton, Speak } from "@/components/live/Reading";
import type { PracticeItem } from "@/lib/practice";

// "Fix my mistakes": the learner's practice set (lib/practice.ts) — each
// question, then the working once they've tried, and stars at the end.
type SetData = { learner: string; title: string; missed: number; items: PracticeItem[]; ai: boolean };

export default function Practice({ token }: { token: string }) {
  const [set, setSet] = useState<SetData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [at, setAt] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [stars, setStars] = useState<{ n: number; note?: string } | null>(null);
  useEffect(() => {
    fetch(`/api/study?what=practice&t=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (r.ok) setSet(j); else setErr(j.error ?? "Couldn't open your practice."); })
      .catch(() => setErr("Couldn't open your practice — check the internet."));
  }, [token]);

  if (err) return <p role="alert" className="rounded-xl bg-red-50 p-3 font-bold text-red-700">{err}</p>;
  if (!set) return (
    <div className="space-y-3" role="status">
      <p className="font-bold text-dmb-ink">Making your practice set…</p>
      <p className="text-sm text-dmb-muted">Looking at the questions you missed and making similar ones. This can take up to half a minute.</p>
      <div className="h-40 animate-pulse rounded-2xl bg-dmb-mint" />
    </div>
  );
  if (!set.items.length) return (
    <div className="space-y-3">
      <p className="text-2xl">🎉</p>
      <p className="text-lg font-bold text-dmb-ink">{set.missed ? "Your teacher marks your class work by hand — ask them about the ones you missed." : "Nothing to fix — you got everything right in this class!"}</p>
      <a href={`/flashcards?t=${encodeURIComponent(token)}`} className="dmb-btn inline-flex">📇 Revise with flashcards</a>
    </div>
  );

  const done = at >= set.items.length;
  const it = set.items[Math.min(at, set.items.length - 1)];
  async function finish(total: number, got: number) {
    const r = await fetch("/api/study", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, right: got, total }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setStars(r?.ok ? { n: j.stars ?? 0, note: j.note } : { n: 0, note: j.error ?? "Couldn't save your stars this time." });
  }
  function next() {
    const n = at + 1;
    setAt(n); setPick(null);
    if (n >= set!.items.length) finish(set!.items.length, right);
  }
  if (done) {
    const pct = Math.round((right / set.items.length) * 100);
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-dmb-mint p-5 text-center">
          <p className="text-4xl">{pct >= 80 ? "🌟" : pct >= 50 ? "👍" : "💪"}</p>
          <p className="mt-1 text-2xl font-bold text-dmb-ink">{right} of {set.items.length} right</p>
          <p className="text-dmb-muted">{pct >= 80 ? "Mistakes fixed — brilliant!" : pct >= 50 ? "Good progress. Try once more to make it stick." : "Keep going — look at the working, then try again."}</p>
          {stars && <p className="mt-2 font-bold text-dmb-ink">{stars.n > 0 ? `⭐ +${stars.n} star${stars.n === 1 ? "" : "s"} on the class leaderboard` : stars.note}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setAt(0); setPick(null); setRight(0); setStars(null); }} className="dmb-btn">Try again</button>
          <a href={`/flashcards?t=${encodeURIComponent(token)}`} className="inline-flex min-h-[44px] items-center rounded-xl bg-white px-4 font-bold text-dmb-ink ring-1 ring-dmb-rule">📇 Flashcards</a>
        </div>
      </div>
    );
  }
  const answered = pick != null, ok = pick === it.answer;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-dmb-muted">{at + 1} of {set.items.length} · {it.kind === "retry" ? `Try again — ${it.from}` : `New · ${it.from}`}</p>
        <ReadingButton />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-dmb-mint" aria-hidden><div className="h-full bg-dmb-board transition-all" style={{ width: `${(at / set.items.length) * 100}%` }} /></div>
      <div className="flex items-start gap-2">
        <p className="flex-1 whitespace-pre-wrap text-lg font-bold leading-snug text-dmb-ink">{it.q}</p>
        <Speak text={`${it.q}. ${it.options.map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o}.`).join(" ")}`} />
      </div>
      <div className="grid gap-2" role="radiogroup" aria-label="Your answer">
        {it.options.map((o, i) => {
          const tone = !answered ? "bg-white ring-dmb-rule hover:ring-dmb-board" : i === it.answer ? "bg-emerald-50 ring-emerald-500 text-emerald-900" : i === pick ? "bg-red-50 ring-red-400 text-red-800" : "bg-white ring-dmb-rule opacity-60";
          return (
            <button key={i} type="button" role="radio" aria-checked={pick === i} disabled={answered} onClick={() => { setPick(i); if (i === it.answer) setRight((r) => r + 1); }}
              className={`flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-left font-semibold ring-2 transition ${tone}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dmb-mint text-sm font-bold text-dmb-tealDark">{String.fromCharCode(65 + i)}</span>{o}
              {answered && i === it.answer && <span className="ml-auto" aria-label="right answer">✓</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`rounded-2xl p-4 ${ok ? "bg-emerald-50" : "bg-dmb-penSoft"}`} aria-live="polite">
          <p className={`font-bold ${ok ? "text-emerald-800" : "text-dmb-pen"}`}>{ok ? "✓ Right!" : `Not quite — the answer is ${String.fromCharCode(65 + it.answer)}: ${it.options[it.answer]}`}</p>
          {it.working.length > 0 && (
            <>
              <div className="mt-2 flex items-center gap-2"><p className="text-xs font-bold uppercase tracking-[.14em] text-dmb-muted">Working</p><Speak text={it.working.join(". ")} label="Read the working aloud" /></div>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-dmb-ink">{it.working.map((w, k) => <li key={k}>{w}</li>)}</ol>
            </>
          )}
          <button type="button" onClick={next} className="dmb-btn mt-3">{at + 1 < set.items.length ? "Next question →" : "See my score"}</button>
        </div>
      )}
      {set.ai && <p className="text-xs text-dmb-muted">New questions and working are made by A.I — if something looks wrong, ask your teacher.</p>}
    </div>
  );
}
