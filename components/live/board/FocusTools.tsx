"use client";
import { useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { useClassScale } from "@/lib/classScale";
import { serverNow, useServerClock } from "@/lib/serverClock";
import { useKeptState, type KeepStore } from "@/lib/keptState";
import { play } from "@/lib/games/fx";
import {
  LOCK_DEFAULT, awayNow, cleanAway, cleanLock, cleanRollCall, newRollCall, rollLeft, rollResult,
  type Away, type FocusLock, type Person, type RollCall,
} from "@/lib/classExtras";

// The focus tools (lib/classExtras.ts):
//  • Eyes on me — the teacher locks every learner's screen with a message.
//  • Looking away — a learner's device says when the class isn't the tab or
//    app in front; the teacher sees who.
//  • Roll call — every learner has 30 seconds to tap "I'm here".
//
// Messages: "focus-lock" and "rollcall" (teacher → all, signed, re-sent while
// on), "away" and "rollcall-here" (learner → teacher).

export default function FocusTools({ host, myId, myName, people, open, onClose, onCount, keep }: {
  host: boolean; myId: string; myName: string; people: Person[]; open: boolean; onClose: () => void;
  onCount?: (away: number) => void; keep?: KeepStore;
}) {
  useServerClock();
  const k = (n: string) => `focus:${n}`;
  const [lock, setLock] = useKeptState<FocusLock>(keep, k("lock"), { on: false, msg: LOCK_DEFAULT });
  const lockRef = useRef(lock); lockRef.current = lock;
  const [away, setAway] = useKeptState<Record<string, Away>>(keep, k("away"), {});
  const [roll, setRoll] = useKeptState<RollCall | null>(keep, k("roll"), null);
  const rollRef = useRef(roll); rollRef.current = roll;
  const [answered, setAnswered] = useKeptState<string[]>(keep, k("answered"), []);
  const [mine, setMine] = useKeptState<string | null>(keep, k("mine"), null); // learner: the roll call I answered
  const [, tick] = useState(0);
  const scale = useClassScale();

  const send = useLive({
    away: (p) => { if (host) { const a = cleanAway(p, Date.now()); if (a) setAway((cur) => (cur[a.by]?.away === a.away ? cur : { ...cur, [a.by]: a })); } },
    "rollcall-here": (p) => {
      const r = rollRef.current;
      if (!host || !r || !r.open || p?.round !== r.id || typeof p.by !== "string") return;
      setAnswered((cur) => (cur.includes(p.by) ? cur : [...cur, p.by.slice(0, 80)]));
    },
    "focus-lock": (p) => { if (!host && p?.host) setLock(cleanLock(p)); },
    rollcall: (p) => {
      if (host || !p?.host) return;
      const r = cleanRollCall(p.roll);
      if (r && r.open && rollRef.current?.id !== r.id) play("tick");
      setRoll(r && r.open ? r : null);
    },
  });

  // Teacher: keep the lock and the roll call on every screen.
  useEffect(() => {
    if (!host) return;
    send("focus-lock", { host: true, ...lock });
    if (!lock.on) return;
    const t = setInterval(() => send("focus-lock", { host: true, ...lockRef.current }), 4000 * scale);
    return () => clearInterval(t);
  }, [host, lock, send, scale]);
  useEffect(() => {
    if (!host || !roll) return;
    send("rollcall", { host: true, roll });
    if (!roll.open) return;
    const t = setInterval(() => {
      if (serverNow() >= roll.endsAt) return setRoll({ ...roll, open: false }); // time's up
      send("rollcall", { host: true, roll }); tick((n) => n + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [host, roll, send, setRoll]);

  // Learner: say when the class isn't in front (another tab or app), and when it's back.
  useEffect(() => {
    if (host || !myId) return;
    const tell = () => send("away", { by: myId, name: myName, away: document.visibilityState !== "visible" });
    tell();
    document.addEventListener("visibilitychange", tell);
    const t = setInterval(tell, 20_000 * scale);
    return () => { document.removeEventListener("visibilitychange", tell); clearInterval(t); };
  }, [host, myId, myName, send, scale]);
  // Learner: the roll call counts down.
  useEffect(() => {
    if (host || !roll) return;
    const t = setInterval(() => { if (serverNow() >= roll.endsAt) setRoll(null); else tick((n) => n + 1); }, 500);
    return () => clearInterval(t);
  }, [host, roll, setRoll]);

  const awayList = host ? awayNow(Object.values(away), people) : [];
  useEffect(() => { onCount?.(awayList.length); }, [awayList.length, onCount]);

  // ── Teacher ──
  if (host) {
    if (!open) return null;
    const online = people.filter((p) => p.online !== false);
    const res = roll ? rollResult(people, answered) : null, left = rollLeft(roll, serverNow());
    return (
      <div role="dialog" aria-modal="true" aria-label="Focus tools" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-3">
        <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-2xl">
          <div className="flex items-center gap-2 border-b border-line p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E2F3F2] text-lg">🎯</span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black">Focus</p>
              <p className="text-xs font-bold text-ink/55">{online.length} here · {awayList.length} looking away{lock.on ? " · screens locked" : ""}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5">✕</button>
          </div>
          <div className="grid gap-4 overflow-y-auto p-4">
            <section aria-label="Eyes on me">
              <p className="text-sm font-black">👀 Eyes on me</p>
              <p className="text-xs text-ink/55">Covers every learner&apos;s screen until you unlock. They can still hear you.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input value={lock.msg} maxLength={80} disabled={lock.on} onChange={(e) => setLock({ ...lock, msg: e.target.value })} aria-label="Message on their screens"
                  className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E6E72] disabled:opacity-60" />
                <button type="button" onClick={() => setLock({ on: !lock.on, msg: lock.msg.trim() || LOCK_DEFAULT })} aria-pressed={lock.on}
                  className={`rounded-xl px-4 py-2 text-sm font-black text-white ${lock.on ? "bg-red-600" : "bg-[#0E6E72]"}`}>{lock.on ? "Unlock screens" : "Lock screens"}</button>
              </div>
            </section>
            <section aria-label="Looking away">
              <p className="text-sm font-black">💤 Looking away ({awayList.length})</p>
              <p className="text-xs text-ink/55">Learners whose phone or computer is showing another tab or app.</p>
              {awayList.length ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {awayList.map((a) => <li key={a.by} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">{a.name} · {since(Date.now() - a.at)}</li>)}
                </ul>
              ) : <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Everyone has the class in front of them.</p>}
            </section>
            <section aria-label="Roll call">
              <p className="text-sm font-black">✋ Roll call</p>
              <p className="text-xs text-ink/55">Everyone has 30 seconds to tap &quot;I&apos;m here&quot;.</p>
              {roll && res && (
                <div className="mt-2 rounded-xl bg-slate-50 p-3" role="status">
                  <p className="text-sm font-black">{roll.open ? `${left} s left · ` : "Finished · "}{res.here.length} of {online.length} here</p>
                  {res.missing.length > 0
                    ? <p className={`mt-1 text-xs font-bold ${roll.open ? "text-ink/60" : "text-red-700"}`}>{roll.open ? "Not yet" : "Didn't answer"}: {res.missing.map((p) => p.name).join(", ")}</p>
                    : <p className="mt-1 text-xs font-bold text-emerald-700">Everyone answered.</p>}
                </div>
              )}
              <button type="button" disabled={!!roll?.open} onClick={() => { setAnswered([]); setRoll(newRollCall(serverNow())); }}
                className="mt-2 rounded-xl bg-[#0E6E72] px-4 py-2 text-sm font-black text-white disabled:opacity-40">{roll ? "Call the roll again" : "Call the roll"}</button>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // ── Learner ──
  const here = () => {
    if (!roll) return;
    setMine(roll.id); play("correct");
    const say = () => send("rollcall-here", { round: roll.id, by: myId, name: myName });
    say(); setTimeout(say, 2000 * scale); setTimeout(say, 5000 * scale); // in case one is lost
  };
  return (
    <>
      {lock.on && (
        <div role="alertdialog" aria-modal="true" aria-label="Your teacher has locked the screen" className="fixed inset-0 z-[130] flex flex-col items-center justify-center gap-3 bg-[#0B1220]/95 p-6 text-center text-white">
          <span className="text-7xl" aria-hidden>👀</span>
          <p className="text-3xl font-black">{lock.msg}</p>
          <p className="text-sm font-bold text-white/60">Your teacher has paused your screen. It will come back soon.</p>
        </div>
      )}
      {roll && (
        <div role="dialog" aria-label="Roll call" className="fixed inset-0 z-[135] flex items-center justify-center bg-black/50 p-4">
          <div className="reward-pop flex w-full max-w-xs flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center text-ink shadow-2xl">
            <p className="text-lg font-black">Roll call</p>
            {mine === roll.id ? <p className="text-2xl font-black text-emerald-700" role="status">✓ You&apos;re marked here</p> : (
              <>
                <button type="button" onClick={here} className="min-h-[72px] w-full rounded-2xl bg-[#0E6E72] text-2xl font-black text-white shadow-[0_6px_0_#0A4F52] active:translate-y-1 active:shadow-none">✋ I&apos;m here</button>
                <p className="text-sm font-bold text-ink/60" aria-live="off">{rollLeft(roll, serverNow())} seconds left</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const since = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min`; };
