"use client";
import { useEffect, useMemo, useState } from "react";
import { ReadingButton, Speak } from "@/components/live/Reading";
import type { Card } from "@/lib/flashcards";

// Revision flashcards: tap to turn over; "Got it" or "Still learning" —
// the ones still being learnt come round again.
export default function Flashcards({ token }: { token: string }) {
  const [data, setData] = useState<{ title: string; cards: Card[]; ai: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deck, setDeck] = useState<number[]>([]);
  const [flip, setFlip] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  useEffect(() => {
    fetch(`/api/study?what=cards&t=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (r.ok) { setData(j); setDeck(j.cards.map((_: Card, i: number) => i)); } else setErr(j.error ?? "Couldn't open the flashcards."); })
      .catch(() => setErr("Couldn't open the flashcards — check the internet."));
  }, [token]);
  const total = data?.cards.length ?? 0;
  const left = useMemo(() => deck.filter((i) => !known.has(i)), [deck, known]);

  if (err) return <p role="alert" className="rounded-xl bg-red-50 p-3 font-bold text-red-700">{err}</p>;
  if (!data) return <div role="status" className="space-y-2"><p className="font-bold text-dmb-ink">Making your flashcards…</p><div className="h-48 animate-pulse rounded-2xl bg-dmb-mint" /></div>;
  if (!total) return <p className="text-dmb-muted">There&apos;s nothing to make flashcards from yet — they come from the class&apos;s questions and what&apos;s written on the board.</p>;
  if (!left.length) return (
    <div className="space-y-3 text-center">
      <p className="text-4xl">🏆</p>
      <p className="text-xl font-bold text-dmb-ink">You know all {total} cards!</p>
      <button type="button" onClick={() => { setKnown(new Set()); setDeck(shuffle(data.cards.map((_, i) => i))); setFlip(false); }} className="dmb-btn">Go through them again</button>
    </div>
  );
  const i = left[0], c = data.cards[i];
  const move = (gotIt: boolean) => {
    setFlip(false);
    if (gotIt) setKnown((k) => new Set(k).add(i));
    else setDeck((d) => [...d.filter((x) => x !== i), i]); // back of the pile
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-dmb-muted">{known.size} of {total} known · {left.length} to go</p>
        <ReadingButton />
      </div>
      <button type="button" onClick={() => setFlip(!flip)} aria-label={flip ? "Card back — tap to see the front" : "Card front — tap to turn over"}
        className={`flex min-h-[220px] w-full flex-col justify-between rounded-3xl p-5 text-left shadow-lg ring-1 transition ${flip ? "bg-dmb-ink text-white ring-dmb-ink" : "bg-white text-dmb-ink ring-dmb-rule"}`}>
        <span className={`self-start rounded-full px-2.5 py-0.5 text-[11px] font-bold ${flip ? "bg-white/10 text-dmb-chalk" : "bg-dmb-mint text-dmb-tealDark"}`}>{flip ? "Answer" : c.tag}</span>
        <span className="my-4 whitespace-pre-wrap text-xl font-bold leading-snug">{flip ? c.back : c.front}</span>
        <span className={`text-xs ${flip ? "text-white/60" : "text-dmb-muted"}`}>{flip ? "Did you know it?" : "Think of the answer, then tap to turn over"}</span>
      </button>
      <div className="flex items-center gap-2">
        <Speak text={flip ? c.back : c.front} />
        {flip ? (
          <>
            <button type="button" onClick={() => move(false)} className="min-h-[48px] flex-1 rounded-xl bg-dmb-penSoft px-3 font-bold text-dmb-pen">🔁 Still learning</button>
            <button type="button" onClick={() => move(true)} className="min-h-[48px] flex-1 rounded-xl bg-emerald-600 px-3 font-bold text-white">✓ Got it</button>
          </>
        ) : (
          <button type="button" onClick={() => setFlip(true)} className="dmb-btn min-h-[48px] flex-1 justify-center">Turn over</button>
        )}
      </div>
      <button type="button" onClick={() => { setDeck(shuffle(left)); setFlip(false); }} className="text-sm font-bold text-dmb-muted underline">Shuffle</button>
      {data.ai && <p className="text-xs text-dmb-muted">Made by A.I from your lesson — if a card looks wrong, ask your teacher.</p>}
    </div>
  );
}
function shuffle(xs: number[]) { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
