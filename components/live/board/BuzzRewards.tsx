"use client";
import { useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { useClassScale } from "@/lib/classScale";
import { serverNow, useServerClock } from "@/lib/serverClock";
import { play } from "@/lib/games/fx";
import { useKeptState, type KeepStore } from "@/lib/keptState";
import {
  REWARD_REASONS, addBuzz, buzzOrder, cleanBuzz, cleanBuzzRound, cleanReward, newBuzzRound, ordinal, topOf,
  type Buzz, type BuzzRound, type Reward,
} from "@/lib/buzzRewards";

// The buzzer and rewards (lib/buzzRewards.ts).
//
// Buzzer: the teacher opens a round; every learner gets a big BUZZ button; the
// teacher sees who pressed first (by the server's clock, so a slow connection
// doesn't cost a place) and every screen sees the top places.
// Rewards: the teacher gives a learner (or the whole class) a trophy for a
// reason; every screen celebrates it, and it's saved as a star.
//
// Messages: "buzz-round" (teacher → all, signed, re-sent every 4s), "buzz"
// (learner → teacher, repeated for a few seconds) and "reward" (teacher → all, signed).

type Person = { id: string; name: string; online?: boolean };
const BUZZ_RESEND_MS = 3000, BUZZ_RESEND_FOR_MS = 15_000, CELEBRATE_MS = 3800;

export default function BuzzRewards({ sessionId, host, myId, myName, people, buzzOpen, onBuzzOpen, onBuzzClose, rewardsOpen, onRewardsClose, keep }: {
  sessionId?: string; host: boolean; myId: string; myName: string; people: Person[];
  buzzOpen: boolean; onBuzzOpen: () => void; onBuzzClose: () => void; rewardsOpen: boolean; onRewardsClose: () => void; keep?: KeepStore;
}) {
  useServerClock(); // keeps this screen's idea of the server's time up to date
  const k = (n: string) => `br:${n}`;
  const [round, setRound] = useKeptState<BuzzRound | null>(keep, k("round"), null);
  const roundRef = useRef(round); roundRef.current = round;
  const [buzzes, setBuzzes] = useKeptState<Buzz[]>(keep, k("buzzes"), []);
  const [q, setQ] = useKeptState(keep, k("q"), "");
  const [mine, setMine] = useKeptState<{ round: string; at: number } | null>(keep, k("mine"), null); // learner: my buzz
  const [shown, setShown] = useState<Reward[]>([]); // rewards being celebrated
  const [counts, setCounts] = useKeptState<Record<string, number>>(keep, k("counts"), {});
  const [reason, setReason] = useKeptState(keep, k("reason"), REWARD_REASONS[0]);
  const [note, setNote] = useState<string | null>(null);
  const [hiddenRound, setHiddenRound] = useKeptState<string | null>(keep, k("hidden"), null); // learner: tucked away for this round
  const [busy, setBusy] = useState(false);
  const scale = useClassScale();

  function celebrate(r: Reward) {
    setShown((cur) => (cur.some((x) => x.id === r.id) ? cur : [...cur, r]));
    if (!host && r.to.includes(myId)) play("levelUp"); else play("correct");
    setTimeout(() => setShown((cur) => cur.filter((x) => x.id !== r.id)), CELEBRATE_MS);
  }

  const send = useLive({
    "buzz-round": (p) => {
      if (host || !p?.host) return;
      const r = cleanBuzzRound(p.round);
      setRound(r && r.open ? r : null);
    },
    buzz: (p) => {
      if (!host) return;
      const b = cleanBuzz(p, roundRef.current, serverNow());
      if (!b) return;
      setBuzzes((cur) => {
        const next = addBuzz(cur, b);
        if (next !== cur && !cur.length) play("correct");
        return next;
      });
    },
    reward: (p) => { if (!host && p?.host) { const r = cleanReward(p); if (r) celebrate(r); } },
  });

  // Teacher: the places follow the buzzes; keep the round on every screen.
  useEffect(() => {
    if (!host || !round) return;
    const top = topOf(buzzes);
    if (JSON.stringify(top) !== JSON.stringify(round.top)) setRound({ ...round, top });
  }, [host, buzzes, round, setRound]);
  useEffect(() => {
    if (!host || !round) return;
    send("buzz-round", { host: true, round });
    const t = setInterval(() => send("buzz-round", { host: true, round: roundRef.current }), 4000 * scale);
    return () => clearInterval(t);
  }, [host, round, send, scale]);
  // Learner: say it again for a few seconds, in case the first one was lost.
  useEffect(() => {
    if (host || !mine || !round || mine.round !== round.id) return;
    if (round.top.some((t) => t.by === myId)) return;
    const started = Date.now();
    const t = setInterval(() => {
      if (Date.now() - started > BUZZ_RESEND_FOR_MS) return clearInterval(t);
      send("buzz", { round: mine.round, by: myId, name: myName, at: mine.at });
    }, BUZZ_RESEND_MS * scale);
    return () => clearInterval(t);
  }, [host, mine, round, myId, myName, send, scale]);
  // Teacher: how many rewards each learner has this class.
  useEffect(() => {
    if (!host || !rewardsOpen || !sessionId) return;
    fetch(`/api/board/rewards?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => j?.counts && setCounts(j.counts)).catch(() => {});
  }, [host, rewardsOpen, sessionId, setCounts]);

  function buzz() {
    const r = roundRef.current;
    if (!r || r.locked || mine?.round === r.id) return;
    const at = serverNow();
    setMine({ round: r.id, at }); play("tick");
    send("buzz", { round: r.id, by: myId, name: myName, at });
  }
  function startRound() { setBuzzes([]); setRound(newBuzzRound(q, serverNow())); }
  function endRound() { if (round) send("buzz-round", { host: true, round: { ...round, open: false } }); setRound(null); setBuzzes([]); onBuzzClose(); }

  async function give(to: Person[], why: string, all = false) {
    if (!to.length || busy) return;
    setBusy(true); setNote(null);
    const r: Reward = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, to: to.map((p) => p.id), names: to.map((p) => p.name), reason: why, all };
    send("reward", { host: true, ...r });
    celebrate(r);
    try {
      const res = await fetch("/api/board/rewards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, to: r.to, reason: why }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.counts) setCounts(j.counts); else setNote(`The class saw it, but the star wasn't saved: ${j.error ?? "try again"}`);
    } catch { setNote("The class saw it, but the star wasn't saved — check your connection."); }
    setBusy(false);
  }

  const learners = people.filter((p) => p.id && p.id !== myId);
  const online = learners.filter((p) => p.online !== false);
  const celebration = <Celebration list={shown} myId={host ? "" : myId} />;

  // ── Teacher ──
  if (host) {
    const order = buzzOrder(buzzes), first = order[0]?.at ?? 0;
    return (
      <>
        {celebration}
        {round && !buzzOpen && (
          <button type="button" onClick={onBuzzOpen} className="fixed bottom-4 right-44 z-[95] flex items-center gap-2 rounded-full bg-[#C2451C] px-4 py-3 text-sm font-black text-white shadow-2xl">
            🔔 Buzzer ({buzzes.length})
          </button>
        )}
        {buzzOpen && (
          <div role="dialog" aria-modal="true" aria-label="Buzzer" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-3">
            <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-2xl">
              <div className="flex items-center gap-2 border-b border-line p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FDE7DF] text-lg">🔔</span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-black">Buzzer</p>
                  <p className="text-xs font-bold text-ink/55">{round ? `${buzzes.length} of ${online.length} buzzed${round.locked ? " · locked" : ""}` : "First to press answers"}</p>
                </div>
                {round && <button type="button" onClick={endRound} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white">End</button>}
                <button type="button" onClick={onBuzzClose} aria-label={round ? "Hide — the buzzer stays on" : "Close"} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5">✕</button>
              </div>
              <div className="grid gap-3 overflow-y-auto p-4">
                {!round ? (
                  <>
                    <label className="text-xs font-black text-ink/60">Question (optional)
                      <input value={q} maxLength={200} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What is 7 × 8?"
                        className="mt-1 w-full rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E6E72]" />
                    </label>
                    <button type="button" onClick={startRound} className="justify-self-start rounded-xl bg-[#C2451C] px-5 py-2.5 text-sm font-black text-white">Open the buzzer</button>
                  </>
                ) : (
                  <>
                    {round.q && <p className="text-lg font-black">{round.q}</p>}
                    {order.length ? (
                      <ol className="grid gap-1.5" aria-label="Who buzzed">
                        {order.map((b, i) => (
                          <li key={b.by} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${i === 0 ? "bg-amber-100 ring-2 ring-amber-400" : "bg-slate-50"}`}>
                            <span className="w-10 text-sm font-black text-ink/60">{ordinal(i + 1)}</span>
                            <span className="min-w-0 flex-1 truncate text-sm font-black">{b.name}</span>
                            <span className="text-xs font-bold tabular-nums text-ink/50">{i === 0 ? "first" : `+${((b.at - first) / 1000).toFixed(2)} s`}</span>
                            <button type="button" onClick={() => give([{ id: b.by, name: b.name }], i === 0 ? "First to buzz" : "Great answer")} disabled={busy}
                              aria-label={`Reward ${b.name}`} className="rounded-lg bg-white px-2 py-1 text-xs font-black text-ink ring-1 ring-slate-200 hover:ring-amber-400 disabled:opacity-50">🏆</button>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="rounded-xl bg-slate-50 p-4 text-center text-sm font-bold text-ink/60">Waiting for the first buzz…</p>}
                    {note && <p role="alert" className="text-xs font-bold text-amber-700">{note}</p>}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setRound({ ...round, locked: !round.locked })} className="rounded-xl bg-ink/5 px-4 py-2 text-xs font-black text-ink/80">{round.locked ? "Unlock" : "Lock — no more buzzes"}</button>
                      <button type="button" onClick={startRound} className="rounded-xl bg-[#C2451C] px-4 py-2 text-xs font-black text-white">New round</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {rewardsOpen && (
          <div role="dialog" aria-modal="true" aria-label="Rewards" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-3">
            <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-2xl">
              <div className="flex items-center gap-2 border-b border-line p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-lg">🏆</span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-black">Rewards</p>
                  <p className="text-xs font-bold text-ink/55">Every screen celebrates it — and it&apos;s a star on the leaderboard</p>
                </div>
                <button type="button" onClick={onRewardsClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5">✕</button>
              </div>
              <div className="grid gap-3 overflow-y-auto p-4">
                <fieldset>
                  <legend className="text-xs font-black text-ink/60">For</legend>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {REWARD_REASONS.map((r) => (
                      <button key={r} type="button" onClick={() => setReason(r)} aria-pressed={reason === r}
                        className={`min-h-[36px] rounded-full px-3 text-xs font-black ring-1 ${reason === r ? "bg-amber-400 text-ink ring-amber-500" : "bg-white text-ink/70 ring-slate-200"}`}>{r}</button>
                    ))}
                  </div>
                </fieldset>
                {note && <p role="alert" className="text-xs font-bold text-amber-700">{note}</p>}
                {learners.length ? (
                  <>
                    <button type="button" onClick={() => give(online, reason, true)} disabled={busy || !online.length}
                      className="justify-self-start rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-ink disabled:opacity-50">🏆 Whole class ({online.length})</button>
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      {[...learners].sort((a, b) => Number(b.online !== false) - Number(a.online !== false) || a.name.localeCompare(b.name)).map((p) => (
                        <li key={p.id}>
                          <button type="button" onClick={() => give([p], reason)} disabled={busy} aria-label={`Reward ${p.name}`}
                            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left ring-1 ring-slate-200 hover:ring-amber-400 disabled:opacity-60 ${p.online === false ? "opacity-50" : ""}`}>
                            <span className="min-w-0 flex-1 truncate text-sm font-black">{p.name}</span>
                            <span className="text-xs font-black text-amber-700">{counts[p.id] ? `🏆 ${counts[p.id]}` : ""}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : <p className="rounded-xl bg-slate-50 p-4 text-center text-sm font-bold text-ink/60">No learners have joined yet.</p>}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Learner ──
  const myPlace = round ? round.top.findIndex((t) => t.by === myId) : -1;
  const buzzed = !!round && mine?.round === round.id;
  return (
    <>
      {celebration}
      {round && hiddenRound === round.id && (
        <button type="button" onClick={() => setHiddenRound(null)} className="fixed bottom-4 right-4 z-[95] flex items-center gap-2 rounded-full bg-[#DC2626] px-4 py-3 text-sm font-black text-white shadow-2xl">🔔 Buzzer</button>
      )}
      {round && hiddenRound !== round.id && (
        <div role="region" aria-label="Buzzer" className="fixed inset-x-3 bottom-20 z-[95] mx-auto flex max-w-sm flex-col items-center gap-2 rounded-2xl bg-white p-4 text-ink shadow-2xl ring-1 ring-line">
          <button type="button" onClick={() => setHiddenRound(round.id)} className="self-end rounded-lg bg-ink/5 px-2.5 py-1 text-xs font-black text-ink/70">Hide</button>
          {round.q && <p className="text-center text-base font-black leading-snug">{round.q}</p>}
          <button type="button" onClick={buzz} disabled={buzzed || round.locked} aria-label="Buzz"
            className={`flex h-32 w-32 items-center justify-center rounded-full text-2xl font-black text-white shadow-[0_8px_0_#7F1D1D] transition active:translate-y-1 active:shadow-[0_4px_0_#7F1D1D] ${buzzed ? "bg-slate-400 shadow-none" : round.locked ? "bg-slate-300 shadow-none" : "bg-[#DC2626]"}`}
            style={{ touchAction: "manipulation" }}>
            {buzzed ? "✓" : "BUZZ"}
          </button>
          <p role="status" className="text-center text-sm font-black text-ink/70">
            {buzzed ? (myPlace >= 0 ? (myPlace === 0 ? "🥇 You were first!" : `You were ${ordinal(myPlace + 1)}`) : "Buzzed! Waiting…")
              : round.locked ? "The buzzer is locked" : "Press as soon as you know the answer"}
          </p>
          {round.top[0] && myPlace !== 0 && <p className="text-xs font-bold text-ink/50">🔔 {round.top[0].name} was first</p>}
        </div>
      )}
    </>
  );
}

// A trophy on every screen. The learner it's for gets a big one.
function Celebration({ list, myId }: { list: Reward[]; myId: string }) {
  if (!list.length) return null;
  const r = list[list.length - 1], forMe = !!myId && r.to.includes(myId);
  const who = r.all ? "The whole class" : r.names.length > 3 ? `${r.names.slice(0, 3).join(", ")} and ${r.names.length - 3} more` : r.names.join(", ");
  if (forMe) {
    return (
      <div role="status" aria-live="assertive" className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-black/40">
        <div className="reward-pop flex flex-col items-center gap-2 rounded-3xl bg-white px-10 py-8 text-center text-ink shadow-2xl">
          <span className="text-7xl" aria-hidden>🏆</span>
          <p className="text-2xl font-black">{r.all ? "Well done, everyone!" : "You got a reward!"}</p>
          <p className="text-base font-black text-amber-700">{r.reason}</p>
          <p className="text-xs font-bold text-ink/50">+1 ⭐ on the leaderboard</p>
        </div>
      </div>
    );
  }
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-16 z-[120] flex justify-center px-3">
      <div className="reward-pop flex max-w-full items-center gap-3 rounded-full bg-amber-400 px-5 py-3 text-ink shadow-2xl">
        <span className="text-2xl" aria-hidden>🏆</span>
        <p className="truncate text-sm font-black">{who} · {r.reason}</p>
      </div>
    </div>
  );
}
