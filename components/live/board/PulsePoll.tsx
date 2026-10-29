"use client";
import { useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { BoardIcon } from "@/components/live/board/BoardIcons";
import { useKeptRef, useKeptState, type KeepStore } from "@/lib/keptState";
import {
  POLL_PRESETS, PULSE_EVERY_MS, cleanOptions, cleanPoll, cleanPulse, cleanVote, pulseNow, tally,
  type PollRound, type Pulse, type PulseEntry, type Vote,
} from "@/lib/classPulse";

// "Got it / I'm lost" and quick polls (see lib/classPulse.ts).
//
// Messages: "pulse" (learner → teacher, repeated every few seconds while set),
// "pulse-reset" (teacher → all: everyone's signal is cleared), "poll-round"
// (teacher → all, re-sent every 4s) and "poll-vote" (learner → teacher, sent
// on a tap and again every few seconds so a teacher who reloads gets it back).

type Person = { id: string; name: string; online?: boolean };

export default function PulsePoll({ host, myId, myName, people, pollOpen, onPollOpen, onPollClose, keep }: {
  host: boolean; myId: string; myName: string; people: Person[];
  pollOpen: boolean; onPollOpen: () => void; onPollClose: () => void; keep?: KeepStore;
}) {
  const k = (n: string) => `pp:${n}`;
  // Pulse
  const [myPulse, setMyPulse] = useKeptState<Pulse | null>(keep, k("mine"), null);
  const myPulseRef = useRef(myPulse); myPulseRef.current = myPulse;
  const [pulses, setPulses] = useKeptState<Map<string, PulseEntry>>(keep, k("pulses"), () => new Map());
  const [, tick] = useState(0);
  const [pulseOpen, setPulseOpen] = useState(false);
  // Poll
  const [poll, setPoll] = useKeptState<PollRound | null>(keep, k("poll"), null);
  const pollRef = useRef(poll); pollRef.current = poll;
  const [votes, setVotes] = useKeptState<Map<string, Vote>>(keep, k("votes"), () => new Map());
  const [myVote, setMyVote] = useKeptState<number | null>(keep, k("myVote"), null);
  const myVoteRef = useRef(myVote); myVoteRef.current = myVote;
  const voteV = useKeptRef(keep, k("voteV"), 0);
  const [q, setQ] = useKeptState(keep, k("q"), "");
  const [preset, setPreset] = useKeptState(keep, k("preset"), "yesno");
  const [custom, setCustom] = useKeptState(keep, k("custom"), "");
  const [hideNames, setHideNames] = useKeptState(keep, k("hideNames"), false);
  const [pollHidden, setPollHidden] = useKeptState(keep, k("pollHidden"), false);

  const send = useLive({
    pulse: (p) => {
      if (!host) return;
      const e = cleanPulse(p);
      const by = typeof p?.by === "string" ? p.by : "";
      setPulses((cur) => {
        const next = new Map(cur);
        if (e) next.set(e.by, e); else if (by) next.delete(by.slice(0, 60));
        return next;
      });
    },
    "pulse-reset": (p) => { if (!host && p?.host) setMyPulse(null); },
    "poll-round": (p) => {
      if (host || !p?.host) return;
      const r = cleanPoll(p.round);
      if (!r || !r.open) { setPoll(null); setMyVote(null); return; }
      if (pollRef.current?.id !== r.id) { setMyVote(null); voteV.current = 0; setPollHidden(false); }
      setPoll(r);
    },
    "poll-vote": (p) => {
      if (!host) return;
      const v = cleanVote(p, pollRef.current);
      if (!v) return;
      setVotes((cur) => {
        const old = cur.get(v.by);
        if (old && old.v > v.v) return cur;
        const next = new Map(cur); next.set(v.by, v); return next;
      });
    },
  });

  // Learner: keep the signal and the vote coming (the teacher drops quiet ones).
  useEffect(() => {
    if (host) return;
    const t = setInterval(() => {
      if (myPulseRef.current) send("pulse", { by: myId, name: myName, v: myPulseRef.current });
      const r = pollRef.current;
      if (r && myVoteRef.current != null) send("poll-vote", { poll: r.id, by: myId, name: myName, choice: myVoteRef.current, v: voteV.current });
    }, PULSE_EVERY_MS);
    return () => clearInterval(t);
  }, [host, myId, myName, send, voteV]);
  // Teacher: re-count every few seconds (signals expire); keep the poll on every screen.
  useEffect(() => {
    if (!host) return;
    const t = setInterval(() => tick((n) => n + 1), 4000);
    return () => clearInterval(t);
  }, [host]);
  useEffect(() => {
    if (!host || !poll) return;
    send("poll-round", { host: true, round: poll });
    const t = setInterval(() => send("poll-round", { host: true, round: pollRef.current }), 4000);
    return () => clearInterval(t);
  }, [host, poll, send]);

  function setPulse(v: Pulse) {
    const next = myPulse === v ? null : v;
    setMyPulse(next);
    send("pulse", { by: myId, name: myName, v: next });
  }
  function vote(i: number) {
    const r = pollRef.current;
    if (!r) return;
    voteV.current++;
    setMyVote(i);
    send("poll-vote", { poll: r.id, by: myId, name: myName, choice: i, v: voteV.current });
  }
  const options = preset === "custom" ? cleanOptions(custom) : POLL_PRESETS.find((p) => p.id === preset)?.options ?? [];
  function startPoll() {
    if (options.length < 2) return;
    setVotes(new Map()); setPollHidden(false);
    setPoll({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, q: q.trim().slice(0, 200), options, open: true, reveal: null });
  }
  function endPoll() {
    if (poll) send("poll-round", { host: true, round: { ...poll, open: false } });
    setPoll(null); onPollClose();
  }

  // ── Teacher ──
  if (host) {
    const { up, lost } = pulseNow(pulses.values());
    const online = people.filter((p) => p.online !== false).length;
    const t = poll ? tally(poll, votes.values()) : null;
    return (
      <>
        {(up.length > 0 || lost.length > 0) && (
          <div className="fixed bottom-4 left-4 z-[94] max-w-[min(92vw,22rem)]">
            {pulseOpen && (
              <div className="mb-2 rounded-2xl bg-white p-3 text-ink shadow-2xl ring-1 ring-line" role="dialog" aria-label="Who is following">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-black">How the class is doing</p>
                  <button type="button" onClick={() => { setPulses(new Map()); send("pulse-reset", { host: true, at: Date.now() }); setPulseOpen(false); }}
                    className="rounded-lg bg-ink/5 px-2.5 py-1.5 text-xs font-black text-ink/70 hover:bg-ink/10">Clear all</button>
                </div>
                <p className="text-xs font-black text-red-700">😕 Lost ({lost.length})</p>
                <p className="mb-2 text-sm font-semibold text-ink/80">{lost.map((e) => e.name).join(", ") || "Nobody"}</p>
                <p className="text-xs font-black text-emerald-700">👍 Got it ({up.length})</p>
                <p className="text-sm font-semibold text-ink/80">{up.map((e) => e.name).join(", ") || "Nobody"}</p>
              </div>
            )}
            <button type="button" onClick={() => setPulseOpen((v) => !v)} aria-expanded={pulseOpen}
              aria-label={`${up.length} got it, ${lost.length} lost — show names`}
              className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-black shadow-2xl ring-1 ${lost.length ? "bg-amber-400 text-ink ring-amber-500" : "bg-white text-ink ring-line"}`}>
              <span>👍 {up.length}</span><span>😕 {lost.length}</span>
            </button>
          </div>
        )}
        {poll && !pollOpen && (
          <button type="button" onClick={onPollOpen} className="fixed bottom-4 right-4 z-[95] flex items-center gap-2 rounded-full bg-[#1657C9] px-4 py-3 text-sm font-black text-white shadow-2xl">
            <BoardIcon name="poll" /> Poll ({t?.total ?? 0} voted)
          </button>
        )}
        {pollOpen && (
          <div role="dialog" aria-modal="true" aria-label="Quick poll" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-3">
            <div className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-2xl">
              <div className="flex items-center gap-2 border-b border-line p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF6FF] text-[#1657C9]"><BoardIcon name="poll" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-black">Quick poll</p>
                  {poll && t && <p className="text-xs font-bold text-ink/55">{t.total} of {online} voted</p>}
                </div>
                {poll && <button type="button" onClick={endPoll} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white">End</button>}
                <button type="button" onClick={onPollClose} aria-label={poll ? "Hide — votes keep coming in" : "Close"} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5"><BoardIcon name="close" /></button>
              </div>
              {!poll ? (
                <div className="grid gap-3 overflow-y-auto p-4">
                  <label className="text-xs font-black text-ink/60">Question (optional)
                    <input value={q} maxLength={200} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Is 0.5 the same as ½?"
                      className="mt-1 w-full rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1657C9]" />
                  </label>
                  <fieldset className="grid gap-1.5">
                    <legend className="text-xs font-black text-ink/60">Choices</legend>
                    <div className="flex flex-wrap gap-2">
                      {[...POLL_PRESETS, { id: "custom", label: "My own…", options: [] }].map((p) => (
                        <button key={p.id} type="button" onClick={() => setPreset(p.id)} aria-pressed={preset === p.id}
                          className={`min-h-[40px] rounded-xl px-3 text-xs font-black ring-1 transition ${preset === p.id ? "bg-[#1657C9] text-white ring-[#1657C9]" : "bg-white text-ink/70 ring-slate-200 hover:ring-[#BFD7FF]"}`}>{p.label}</button>
                      ))}
                    </div>
                  </fieldset>
                  {preset === "custom" && (
                    <label className="text-xs font-black text-ink/60">Your choices — one per line (2 to 6)
                      <textarea value={custom} onChange={(e) => setCustom(e.target.value)} rows={4} placeholder={"Lagos\nAbuja\nKano"}
                        className="mt-1 w-full rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1657C9]" />
                    </label>
                  )}
                  <button type="button" onClick={startPoll} disabled={options.length < 2} className="justify-self-start rounded-xl bg-[#1657C9] px-5 py-2.5 text-sm font-black text-white disabled:opacity-40">Ask the class</button>
                </div>
              ) : t && (
                <div className="grid gap-3 overflow-y-auto p-4">
                  {poll.q && <p className="text-lg font-black">{poll.q}</p>}
                  <PollBars options={poll.options} counts={t.counts} pct={t.pct} names={hideNames ? null : t.names} />
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setPoll({ ...poll, reveal: poll.reveal ? null : t.counts })}
                      className="rounded-xl bg-[#1657C9] px-4 py-2 text-xs font-black text-white">{poll.reveal ? "Hide results from class" : "Show results to class"}</button>
                    {poll.reveal && <button type="button" onClick={() => setPoll({ ...poll, reveal: t.counts })} className="rounded-xl bg-ink/5 px-3 py-2 text-xs font-black text-ink/70">Update class view</button>}
                    <label className="ml-auto flex items-center gap-2 text-xs font-black text-ink/70">
                      <input type="checkbox" checked={hideNames} onChange={(e) => setHideNames(e.target.checked)} className="h-4 w-4 accent-[#1657C9]" /> Hide names
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Learner ──
  return (
    <>
      <div className="fixed bottom-4 left-4 z-[94] flex gap-1 rounded-full bg-white/95 p-1 shadow-xl ring-1 ring-line" role="group" aria-label="Tell your teacher how you're doing">
        <button type="button" onClick={() => setPulse("up")} aria-pressed={myPulse === "up"} title="I've got it"
          className={`min-h-[40px] rounded-full px-3 text-sm font-black transition ${myPulse === "up" ? "bg-emerald-500 text-white" : "text-ink/70 hover:bg-emerald-50"}`}>👍 <span className="max-sm:sr-only">Got it</span></button>
        <button type="button" onClick={() => setPulse("lost")} aria-pressed={myPulse === "lost"} title="I'm lost"
          className={`min-h-[40px] rounded-full px-3 text-sm font-black transition ${myPulse === "lost" ? "bg-amber-400 text-ink" : "text-ink/70 hover:bg-amber-50"}`}>😕 <span className="max-sm:sr-only">I&apos;m lost</span></button>
      </div>
      {poll && (pollHidden ? (
        <button type="button" onClick={() => setPollHidden(false)} className="fixed bottom-4 right-4 z-[95] flex items-center gap-2 rounded-full bg-[#1657C9] px-4 py-3 text-sm font-black text-white shadow-2xl">
          <BoardIcon name="poll" /> Poll
        </button>
      ) : (
        <div role="dialog" aria-label="Quick poll" className="fixed inset-x-3 bottom-20 z-[95] mx-auto max-w-md rounded-2xl bg-white p-4 text-ink shadow-2xl ring-1 ring-line">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-[#1657C9]">Quick poll</p>
              <p className="text-base font-black leading-snug">{poll.q || "Choose one"}</p>
            </div>
            <button type="button" onClick={() => setPollHidden(true)} className="rounded-lg bg-ink/5 px-2.5 py-1.5 text-xs font-black text-ink/70">Hide</button>
          </div>
          {poll.reveal ? (
            <PollBars options={poll.options} counts={poll.reveal} pct={tallyPct(poll.reveal)} names={null} mine={myVote} />
          ) : (
            <div className="grid gap-2">
              {poll.options.map((o, i) => (
                <button key={i} type="button" onClick={() => vote(i)} aria-pressed={myVote === i}
                  className={`min-h-[48px] rounded-xl px-4 text-left text-base font-black ring-2 transition ${myVote === i ? "bg-[#1657C9] text-white ring-[#1657C9]" : "bg-white text-ink ring-[#BFD7FF] hover:ring-[#1657C9]"}`}>{o}</button>
              ))}
              <p className="text-xs font-bold text-emerald-700" role="status">{myVote != null ? "✓ Sent — you can change it until the teacher ends the poll" : ""}</p>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

const tallyPct = (counts: number[]) => { const total = counts.reduce((a, b) => a + b, 0); return counts.map((c) => (total ? Math.round((c / total) * 100) : 0)); };

function PollBars({ options, counts, pct, names, mine = null }: { options: string[]; counts: number[]; pct: number[]; names: string[][] | null; mine?: number | null }) {
  return (
    <ul className="grid gap-2">
      {options.map((o, i) => (
        <li key={i}>
          <div className="flex items-center justify-between gap-2 text-sm font-black">
            <span className="min-w-0 truncate">{o}{mine === i ? " (you)" : ""}</span>
            <span className="tabular-nums text-ink/60">{counts[i] ?? 0} · {pct[i] ?? 0}%</span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-ink/5">
            <div className="h-full rounded-full bg-[#1657C9] transition-[width] duration-300" style={{ width: `${pct[i] ?? 0}%` }} />
          </div>
          {names && names[i]?.length > 0 && <p className="mt-0.5 text-xs font-semibold text-ink/55">{names[i].join(", ")}</p>}
        </li>
      ))}
    </ul>
  );
}
