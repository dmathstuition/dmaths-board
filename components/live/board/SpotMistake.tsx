"use client";
// Spot the mistake (lib/spotMistake.ts): a worked solution with one deliberate
// error. The A.I. writes it from a topic (or the teacher types their own and
// can change any line); learners tap the wrong line on their phones; the
// teacher watches the picks come in, then reveals the mistake and the fix.
// Messages: "spot" (teacher → all: the round — with the answer only once
// revealed; re-sent every few seconds so late joiners catch up) and
// "spot-pick" (learner → teacher: the line they chose).
import { useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { useClassScale } from "@/lib/classScale";
import { useKeptRef, useKeptState, type KeepStore } from "@/lib/keptState";
import {
  ERROR_KINDS, MAX_LINES, MIN_LINES, SPOT_LEVELS, cleanPick, cleanSpot, cleanSpotRound, publicSpot, tallyPicks,
  type SpotDraft, type SpotPick, type SpotRound,
} from "@/lib/spotMistake";

type Person = { id: string; name: string; online?: boolean };
const blankDraft = (): SpotDraft => ({ title: "", question: "", lines: ["", "", "", "", ""], wrong: 2, why: "", fix: "" });
const field = "w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500";

export default function SpotMistake({ host, myId, myName, people, open, onClose, keep }: {
  host: boolean; myId: string; myName: string; people: Person[]; open: boolean; onClose: () => void; keep?: KeepStore;
}) {
  const k = (n: string) => `spot:${n}`;
  const scale = useClassScale();
  const [round, setRound] = useKeptState<SpotRound | null>(keep, k("round"), null);
  const roundRef = useRef(round); roundRef.current = round;
  const peopleRef = useRef(people); peopleRef.current = people;
  // Teacher
  const [draft, setDraft] = useKeptState<SpotDraft | null>(keep, k("draft"), null); // what they're writing — and the key, which learners never get
  const draftRef = useRef(draft); draftRef.current = draft;
  const [picks, setPicks] = useKeptState<Record<string, SpotPick>>(keep, k("picks"), {});
  const [topic, setTopic] = useState(""), [level, setLevel] = useState<string>(SPOT_LEVELS[1]), [kind, setKind] = useState<string>("any");
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  // Learner
  const [mine, setMine] = useKeptState<{ id: string; line: number | null }>(keep, k("mine"), { id: "", line: null });
  const mineRef = useRef(mine); mineRef.current = mine;
  const [hidden, setHidden] = useKeptState<string>(keep, k("hidden"), ""); // the round they closed

  const send = useLive({
    spot: (p) => {
      if (host || !p?.host) return;
      const r = cleanSpotRound(p.round);
      if (!r) { setRound(null); return; }
      if (roundRef.current?.id !== r.id) { setMine({ id: r.id, line: null }); setHidden(""); }
      setRound(r);
    },
    "spot-pick": (p) => {
      const r = roundRef.current;
      if (!host || !r || !r.open || r.revealed || p?.round !== r.id || typeof p.by !== "string") return;
      const who = peopleRef.current.find((x) => x.id === p.by); // only learners in this class
      const line = cleanPick(p.line, r.lines.length);
      if (!who || line == null) return;
      setPicks((cur) => (cur[p.by]?.line === line ? cur : { ...cur, [p.by]: { name: who.name, line } }));
    },
  });

  // Teacher: keep the round in everyone's view (late joiners, lost messages).
  useEffect(() => {
    if (!host || !round) return;
    send("spot", { host: true, round });
    const t = setInterval(() => send("spot", { host: true, round: roundRef.current }), 4000 * scale);
    return () => clearInterval(t);
  }, [host, round, send, scale]);
  // Learner: send the pick now, and again now and then while it's open.
  useEffect(() => {
    if (host || !round || !round.open || round.revealed || mine.id !== round.id || mine.line == null) return;
    const go = () => send("spot-pick", { round: round.id, by: myId, name: myName, line: mine.line });
    go();
    const t = setInterval(go, 6000 * scale);
    return () => clearInterval(t);
  }, [host, round, mine.id, mine.line, myId, myName, send, scale]);

  async function make() {
    if (!topic.trim() || busy) return;
    setBusy(true); setErr(null);
    const r = await fetch("/api/quiz-sets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ai-spot", topic, level, kind }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    const got = cleanSpot(j.spot);
    if (!r?.ok || !got) { setErr(j.error ?? "Couldn't write one — check the internet and try again."); return; }
    setDraft(got);
  }
  function sendToClass() {
    const d = draftRef.current;
    if (!d) return;
    const lines = d.lines.map((l) => l.trim());
    const clean = cleanSpot({ ...d, lines: lines.filter(Boolean), wrong: lines.slice(0, d.wrong).filter(Boolean).length });
    if (!clean || !lines[d.wrong]) { setErr(`Fill in every line (at least ${MIN_LINES}) and pick the wrong one.`); return; }
    setErr(null); setDraft(clean); setPicks({});
    setRound(publicSpot(clean, `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, true, false));
  }
  const reveal = () => { const d = draftRef.current, r = roundRef.current; if (d && r) setRound(publicSpot(d, r.id, false, true)); };
  // Ending it tells every phone to put it away (the round is no longer re-sent).
  const finish = () => { send("spot", { host: true, round: null }); setRound(null); setPicks({}); setDraft(null); };
  const setLine = (i: number, v: string) => setDraft((d) => (d ? { ...d, lines: d.lines.map((l, n) => (n === i ? v : l)) } : d));

  // ── The teacher ──
  if (host) {
    if (!open) return null;
    const live = !!round, d = draft;
    const tally = round && d ? tallyPicks(picks, round.lines.length, d.wrong) : null;
    const here = people.filter((p) => p.id && p.id !== myId && p.online !== false).length;
    const top = tally ? Math.max(1, ...tally.counts) : 1;
    return (
      <div role="dialog" aria-label="Spot the mistake" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/50 p-3">
        <div className="flex max-h-full w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-4 text-ink shadow-2xl">
          <div className="flex items-center gap-2">
            <div className="mr-auto">
              <p className="text-[11px] font-black uppercase tracking-wider text-violet-700">With the class</p>
              <h2 className="font-display text-xl font-black">🔍 Spot the mistake</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-lg text-ink/50 hover:bg-slate-100">✕</button>
          </div>

          {!live && (
            <>
              <p className="text-sm font-semibold text-ink/65">One worked solution with a single deliberate mistake. Learners find the wrong line on their phones; you see who got it, then show the fix.</p>
              <div className="grid gap-2 rounded-xl bg-violet-50 p-3 ring-1 ring-violet-200">
                <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={120} aria-label="Topic" placeholder="Topic — e.g. Expanding brackets, Percentage increase, Area of a circle"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void make(); } }} className={field} />
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Level">
                  {SPOT_LEVELS.map((l) => <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)} className={`min-h-[34px] rounded-lg px-2.5 text-xs font-black ring-1 ${level === l ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-ink/70 ring-slate-200"}`}>{l}</button>)}
                </div>
                <label className="flex items-center gap-2 text-xs font-black text-ink/60">Kind of mistake
                  <select value={kind} onChange={(e) => setKind(e.target.value)} className="min-h-[34px] rounded-lg bg-white px-2 text-sm font-bold ring-1 ring-slate-200">{ERROR_KINDS.map((x) => <option key={x}>{x}</option>)}</select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={make} disabled={!topic.trim() || busy} className="min-h-[44px] rounded-xl bg-violet-600 px-4 text-sm font-black text-white disabled:opacity-40">{busy ? "Writing one…" : "✨ Write one with the A.I."}</button>
                  <button type="button" onClick={() => setDraft(blankDraft())} className="min-h-[44px] rounded-xl bg-white px-4 text-sm font-black text-ink/75 ring-1 ring-slate-200">✍️ Write my own</button>
                </div>
              </div>
              {err && <p role="alert" className="text-sm font-bold text-red-700">{err}</p>}
              {d && (
                <div className="grid gap-2" aria-label="Check it before you send it">
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">Check it first — the A.I. can slip. Edit any line, and tap the circle beside the one that is wrong.</p>
                  <input value={d.title} onChange={(e) => setDraft({ ...d, title: e.target.value })} maxLength={80} aria-label="Title" placeholder="Title (optional)" className={field} />
                  <input value={d.question} onChange={(e) => setDraft({ ...d, question: e.target.value })} maxLength={220} aria-label="The question" placeholder="The question being solved" className={field} />
                  <ol className="grid gap-1.5" aria-label="Lines of working">
                    {d.lines.map((l, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <input type="radio" name="spot-wrong" checked={d.wrong === i} onChange={() => setDraft({ ...d, wrong: i })} aria-label={`Line ${i + 1} is the mistake`} className="h-5 w-5 accent-red-600" />
                        <span className="w-6 text-xs font-black text-ink/40">{i + 1}</span>
                        <input value={l} onChange={(e) => setLine(i, e.target.value)} maxLength={160} aria-label={`Line ${i + 1}`} className={`${field} ${d.wrong === i ? "!ring-2 !ring-red-400" : ""}`} />
                        {d.lines.length > MIN_LINES && <button type="button" onClick={() => setDraft({ ...d, lines: d.lines.filter((_, n) => n !== i), wrong: Math.min(d.wrong > i ? d.wrong - 1 : d.wrong, d.lines.length - 2) })} aria-label={`Remove line ${i + 1}`} className="h-8 w-8 rounded-lg text-ink/35 hover:bg-red-50 hover:text-red-600">✕</button>}
                      </li>
                    ))}
                  </ol>
                  {d.lines.length < MAX_LINES && <button type="button" onClick={() => setDraft({ ...d, lines: [...d.lines, ""] })} className="justify-self-start text-xs font-black text-violet-700">＋ Another line</button>}
                  <input value={d.why} onChange={(e) => setDraft({ ...d, why: e.target.value })} maxLength={300} aria-label="What is wrong" placeholder="What's wrong with that line (shown when you reveal it)" className={field} />
                  <input value={d.fix} onChange={(e) => setDraft({ ...d, fix: e.target.value })} maxLength={160} aria-label="The corrected line" placeholder="The corrected line" className={field} />
                  <button type="button" onClick={sendToClass} className="min-h-[52px] rounded-2xl bg-violet-600 text-base font-black text-white">▶ Send to the class ({here} here)</button>
                </div>
              )}
            </>
          )}

          {live && round && d && tally && (
            <>
              <div>
                <p className="text-base font-black">{round.title}</p>
                {round.question && <p className="text-sm font-semibold text-ink/70">{round.question}</p>}
              </div>
              <ol className="grid gap-1.5" aria-label="Picks so far">
                {round.lines.map((l, i) => {
                  const n = tally.counts[i], isWrong = i === d.wrong, show = round.revealed;
                  return (
                    <li key={i} className={`relative overflow-hidden rounded-xl px-3 py-2 ring-1 ${show && isWrong ? "bg-red-50 ring-red-400" : "bg-white ring-slate-200"}`}>
                      <span aria-hidden className={`absolute inset-y-0 left-0 ${show && isWrong ? "bg-red-200/70" : "bg-violet-100"}`} style={{ width: `${(n / top) * 100}%` }} />
                      <span className="relative flex items-center gap-2 text-sm font-bold">
                        <span className="w-5 text-xs font-black text-ink/40">{i + 1}</span>
                        <span className="min-w-0 flex-1">{l}</span>
                        {show && isWrong && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-black text-white">✗ the mistake</span>}
                        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-black text-violet-800" aria-label={`${n} picked line ${i + 1}`}>{n}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="text-sm font-black text-ink/70" role="status">{tally.total} of {here} picked a line</p>
              {round.revealed ? (
                <div className="grid gap-2 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
                  <p className="text-sm font-black text-emerald-900">🎉 {tally.right.length} found it{tally.right.length ? `: ${tally.right.join(", ")}` : ""}</p>
                  {d.why && <p className="text-sm font-semibold text-ink/80"><b>Why it's wrong:</b> {d.why}</p>}
                  {d.fix && <p className="text-sm font-semibold text-ink/80"><b>It should be:</b> {d.fix}</p>}
                  {tally.wrongPick.length > 0 && <p className="text-xs font-bold text-ink/55">Picked another line: {tally.wrongPick.join(", ")}</p>}
                </div>
              ) : <p className="text-xs font-bold text-ink/50">Names show once you reveal it. Learners can change their pick until then.</p>}
              <div className="flex flex-wrap gap-2">
                {!round.revealed && <button type="button" onClick={reveal} className="min-h-[48px] rounded-xl bg-red-600 px-5 text-sm font-black text-white">🔍 Reveal the mistake</button>}
                <button type="button" onClick={finish} className="min-h-[48px] rounded-xl bg-white px-4 text-sm font-black text-ink/75 ring-1 ring-slate-200">{round.revealed ? "New one" : "Stop"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── A learner ──
  if (!round || hidden === round.id) return null;
  const picked = mine.id === round.id ? mine.line : null;
  const right = round.revealed && picked != null && picked === round.wrong;
  return (
    <div role="dialog" aria-label="Spot the mistake — find the wrong line" className="fixed inset-0 z-[97] flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <div className="flex max-h-full w-full max-w-xl flex-col gap-3 overflow-y-auto rounded-3xl bg-white p-4 text-ink shadow-2xl">
        <div className="flex items-start gap-2">
          <div className="mr-auto">
            <p className="text-[11px] font-black uppercase tracking-wider text-violet-700">🔍 Spot the mistake</p>
            <p className="text-lg font-black leading-snug">{round.title}</p>
          </div>
          <button type="button" onClick={() => setHidden(round.id)} aria-label="See the board" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-ink/70">See the board</button>
        </div>
        {round.question && <p className="rounded-2xl bg-violet-50 px-3 py-2 text-sm font-bold text-violet-900">{round.question}</p>}
        <p className="text-sm font-black text-ink/70">{round.revealed ? "Here's the answer" : "One line has a mistake. Tap it."}</p>
        <ol className="grid gap-2" aria-label="The working">
          {round.lines.map((l, i) => {
            const isWrong = round.revealed && i === round.wrong, mineHere = picked === i;
            return (
              <li key={i}>
                <button type="button" disabled={!round.open || round.revealed} onClick={() => setMine({ id: round.id, line: i })} aria-pressed={mineHere} aria-label={`Line ${i + 1}: ${l}`}
                  className={`flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-base font-bold ring-2 transition disabled:cursor-default ${isWrong ? "bg-red-50 ring-red-400" : mineHere ? (round.revealed ? "bg-slate-100 ring-slate-300" : "bg-violet-600 text-white ring-violet-600") : "bg-white ring-violet-100"}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${mineHere && !round.revealed ? "bg-white text-violet-700" : "bg-violet-100 text-violet-800"}`}>{i + 1}</span>
                  <span className="min-w-0 flex-1 break-words">{l}</span>
                  {isWrong && <span aria-hidden className="text-lg">✗</span>}
                </button>
              </li>
            );
          })}
        </ol>
        {!round.revealed && <p role="status" className="text-center text-sm font-black text-violet-800">{picked != null ? `✓ You picked line ${picked + 1} — your teacher can see it. Change it any time.` : "Tap the line you think is wrong."}</p>}
        {round.revealed && (
          <div role="status" className={`grid gap-1 rounded-2xl p-3 ring-1 ${right ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200"}`}>
            <p className="text-base font-black">{picked == null ? `The mistake was in line ${(round.wrong ?? 0) + 1}.` : right ? "🎉 You found it!" : `Not this time — the mistake was in line ${(round.wrong ?? 0) + 1}.`}</p>
            {round.why && <p className="text-sm font-semibold"><b>Why it's wrong:</b> {round.why}</p>}
            {round.fix && <p className="text-sm font-semibold"><b>It should be:</b> {round.fix}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
