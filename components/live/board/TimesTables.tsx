"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { Floating } from "@/components/live/board/MathPanels";
import { useClassScale } from "@/lib/classScale";
import { play } from "@/lib/games/fx";
import { useKeptRef, useKeptState, type KeepStore } from "@/lib/keptState";
import {
  COUNTS, DEFAULT_SETUP, LIMITS, OPS, OP_NAMES, QUICK_MS, SQUARE, TABLES, TIMED_OUT, cellId, cellShown, cleanDone, cleanDrill, cleanMastery, factKey, factText, family, learn, levelOf, mark,
  masteryCount, masteryStoreKey, newDrill, questionsFor, randomHidden, seconds, weakFacts,
  type Done, type Drill, type Fact, type Level, type Mastery, type Q, type Setup, type SquareState,
} from "@/lib/tablesDrill";

// Times tables (lib/tablesDrill.ts): the times-table square, a panel on the
// board the teacher works; and the drill, which each learner answers on their
// own screen while the teacher watches the marks come in.

const chip = "min-h-[32px] rounded-lg bg-slate-100 px-2.5 text-xs font-black text-ink hover:bg-slate-200 disabled:opacity-40";
const chipOn = "min-h-[32px] rounded-lg bg-[#0E6E72] px-2.5 text-xs font-black text-white";
const primary = "min-h-[32px] rounded-lg bg-[#0E6E72] px-3 text-xs font-black text-white hover:bg-[#0A4F52] disabled:opacity-40";
const small = "text-[11px] font-black text-ink/60";
const FONT = "Poppins, system-ui, sans-serif";

// ── Times-table square ───────────────────────────────────────────────────
const C = 30, N = SQUARE + 1;
export function TimesSquarePanel({ s, host, boxW, onChange }: { s: SquareState; host: boolean; boxW: number; onChange: (s: SquareState, final?: boolean) => void }) {
  const width = Math.max(340, Math.min(760, boxW * 0.8));
  const set = (p: Partial<SquareState>) => onChange({ ...s, ...p }, true);
  const sel = s.sel, selShown = sel ? cellShown(s, sel[0], sel[1]) : false;
  const pick = (r: number, c: number) => set({ sel: sel && sel[0] === r && sel[1] === c ? null : [r, c] });
  const nums = Array.from({ length: SQUARE }, (_, i) => i + 1);
  return (
    <Floating p={s} host={host} title="Times-table square" icon="tsquare" width={width} onChange={onChange}>
      <div className="flex flex-wrap items-start gap-2.5 p-2.5">
        <div className="min-w-0 flex-[3_1_300px]">
          <svg viewBox={`0 0 ${N * C} ${N * C}`} className="block w-full" role="group" aria-label="Times-table square, 1 to 12" style={{ fontFamily: FONT }}>
            <rect width={C} height={C} rx={4} fill="#0B1220" /><text x={C / 2} y={C / 2 + 5} textAnchor="middle" fontSize={15} fontWeight={800} fill="#fff">×</text>
            {nums.map((n) => {
              const lit = n === s.table || (sel && (sel[0] === n || sel[1] === n));
              return (
                <g key={n} fontSize={13} fontWeight={800} fill={lit ? "#fff" : "#0A4F52"}>
                  <rect x={n * C + 1} y={1} width={C - 2} height={C - 2} rx={4} fill={sel && sel[1] === n ? "#C2451C" : n === s.table ? "#0E6E72" : "#CDEBE8"} /><text x={n * C + C / 2} y={C / 2 + 5} textAnchor="middle" fill={sel && sel[1] === n ? "#fff" : n === s.table ? "#fff" : "#0A4F52"}>{n}</text>
                  <rect x={1} y={n * C + 1} width={C - 2} height={C - 2} rx={4} fill={sel && sel[0] === n ? "#C2451C" : n === s.table ? "#0E6E72" : "#CDEBE8"} /><text x={C / 2} y={n * C + C / 2 + 5} textAnchor="middle" fill={sel && sel[0] === n ? "#fff" : n === s.table ? "#fff" : "#0A4F52"}>{n}</text>
                </g>
              );
            })}
            {nums.map((r) => nums.map((c) => {
              const on = !!sel && sel[0] === r && sel[1] === c, cross = !!sel && (sel[0] === r || sel[1] === c) && r <= sel[0] && c <= sel[1];
              const inTable = !!s.table && (r === s.table || c === s.table), show = cellShown(s, r, c);
              return (
                <g key={`${r}-${c}`} transform={`translate(${c * C},${r * C})`} role={host ? "button" : "img"} tabIndex={host ? 0 : undefined} aria-pressed={host ? on : undefined}
                  aria-label={show ? `${r} times ${c} is ${r * c}` : `${r} times ${c}, covered`} style={{ cursor: host ? "pointer" : undefined, outline: "none" }}
                  onClick={host ? () => pick(r, c) : undefined} onKeyDown={host ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(r, c); } } : undefined}>
                  <rect x={1} y={1} width={C - 2} height={C - 2} rx={4} fill={on ? "#FDBA74" : cross ? "#FFEDD5" : inTable ? "#E2F3F2" : r === c ? "#F1F5F9" : "#fff"} stroke={on ? "#C2451C" : "#CBD5E1"} strokeWidth={on ? 2.4 : 0.8} />
                  <text x={C / 2} y={C / 2 + 4.5} textAnchor="middle" fontSize={r * c > 99 ? 11 : 12.5} fontWeight={on || inTable ? 800 : 600} fill={show ? "#0B1220" : "#94A3B8"}>{show ? r * c : "?"}</text>
                </g>
              );
            }))}
          </svg>
        </div>

        <div className="grid min-w-0 flex-[1_1_220px] gap-2">
          <div className="rounded-xl bg-slate-50 p-2.5" aria-live="polite" aria-label="Fact">
            {!sel ? <p className="py-2 text-center text-xs font-bold text-ink/50">{host ? "Tap a square to see its fact." : "Your teacher will pick a fact."}</p> : (
              <>
                <p className="text-center text-2xl font-black">{sel[0]} × {sel[1]} = {selShown ? sel[0] * sel[1] : "?"}</p>
                <svg viewBox={`0 0 ${sel[1] * 11 + 3} ${sel[0] * 11 + 3}`} className="mx-auto mt-1 block max-w-full" style={{ width: sel[1] * 11 + 3 }} role="img" aria-label={`${sel[0]} rows of ${sel[1]} dots`}>
                  {Array.from({ length: sel[0] }, (_, r) => Array.from({ length: sel[1] }, (_, c) => <circle key={`${r}-${c}`} cx={7 + c * 11} cy={7 + r * 11} r={4} fill="#0E6E72" />))}
                </svg>
                <p className="mt-1 text-center text-[11px] font-bold text-ink/60">{sel[0]} rows of {sel[1]}</p>
                {selShown ? <ul className="mt-1.5 grid grid-cols-2 gap-x-2 text-center font-mono text-xs font-bold" aria-label="Fact family">{family(sel[0], sel[1]).map((f) => <li key={f}>{f}</li>)}</ul>
                  : host && <button type="button" className={`${primary} mt-1.5 w-full`} onClick={() => set({ shown: [...s.shown, cellId(sel[0], sel[1])] })}>Reveal the answer</button>}
              </>
            )}
          </div>
          {s.table > 0 && (
            <ol className="grid grid-cols-2 gap-x-3 rounded-xl bg-[#EEF7F6] p-2 font-mono text-xs font-bold" aria-label={`The ${s.table} times table`}>
              {nums.map((n) => <li key={n}>{s.table} × {n} = {cellShown(s, s.table, n) ? s.table * n : "?"}</li>)}
            </ol>
          )}
          {host && (
            <div className="grid gap-1.5">
              <label className={`flex items-center gap-1.5 ${small}`}>Light up a table
                <select value={s.table} aria-label="Light up a table" className="min-h-[32px] flex-1 rounded-lg bg-slate-50 px-2 text-xs font-bold text-ink ring-1 ring-slate-200" onChange={(e) => set({ table: Number(e.target.value) })}>
                  <option value={0}>None</option>{nums.map((n) => <option key={n} value={n}>{n} times table</option>)}
                </select>
              </label>
              <div className="flex flex-wrap gap-1">
                <button type="button" aria-pressed={s.hide} className={s.hide ? chipOn : chip} onClick={() => set({ hide: !s.hide, shown: [], sel: null })}>{s.hide ? "Quiz on — show the answers" : "Hide the answers (quiz)"}</button>
                {s.hide && <button type="button" className={primary} onClick={() => { const next = randomHidden(s); if (next) set({ sel: next }); }}>Ask a random fact</button>}
                {s.hide && s.shown.length > 0 && <button type="button" className={chip} onClick={() => set({ shown: [] })}>Cover them all again</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </Floating>
  );
}

// ── Drill ────────────────────────────────────────────────────────────────
type Person = { id: string; name: string; online?: boolean };
const LEVEL_COLOUR: Record<Level, string> = { quick: "#16A34A", slow: "#F59E0B", wrong: "#DC2626", new: "#E2E8F0" };
const LEVEL_NAME: Record<Level, string> = { quick: "quick", slow: "slow", wrong: "to practise", new: "not tried yet" };
const readRecord = (name: string): Mastery => { try { return cleanMastery(JSON.parse(localStorage.getItem(masteryStoreKey(name)) ?? "{}")); } catch { return {}; } };
const writeRecord = (name: string, m: Mastery) => { try { localStorage.setItem(masteryStoreKey(name), JSON.stringify(m)); } catch { /* private window: the record lasts for this class only */ } };

// A learner's record as a grid: every fact from 2 × 2 to 12 × 12.
function FactMap({ m, name }: { m: Mastery; name: string }) {
  const c = masteryCount(m), u = 15;
  return (
    <svg viewBox={`0 0 ${12 * u} ${12 * u}`} className="block w-full max-w-[200px]" role="img" style={{ fontFamily: FONT }}
      aria-label={`${name}'s times-table record: ${c.quick} quick, ${c.slow} slow, ${c.wrong} to practise, ${c.new} not tried yet`}>
      {TABLES.map((t, i) => <g key={t} fontSize={8} fontWeight={700} fill="#64748B"><text x={(i + 1) * u + u / 2} y={u - 4} textAnchor="middle">{t}</text><text x={u / 2} y={(i + 1) * u + u / 2 + 3} textAnchor="middle">{t}</text></g>)}
      {TABLES.map((a, r) => TABLES.map((b, col) => { const lv = levelOf(m[factKey(a, b)]); return <rect key={`${a}-${b}`} x={(col + 1) * u + 1} y={(r + 1) * u + 1} width={u - 2} height={u - 2} rx={2.5} fill={LEVEL_COLOUR[lv]}><title>{`${a} × ${b}: ${LEVEL_NAME[lv]}`}</title></rect>; }))}
    </svg>
  );
}

export default function TablesDrill({ sessionId, host, myId, myName, people, open, onOpen, onClose, keep }: {
  sessionId?: string; host: boolean; myId: string; myName: string; people: Person[]; open: boolean; onOpen: () => void; onClose: () => void; keep?: KeepStore;
}) {
  const k = (n: string) => `td:${n}`;
  const scale = useClassScale();
  const [drill, setDrill] = useKeptState<Drill | null>(keep, k("drill"), null);
  const drillRef = useRef(drill); drillRef.current = drill;
  const peopleRef = useRef(people); peopleRef.current = people;
  // Teacher
  const [setup, setSetup] = useKeptState<Setup>(keep, k("setup"), DEFAULT_SETUP);
  const [answers, setAnswers] = useKeptState<Record<string, { name: string; done: Done }>>(keep, k("answers"), {});
  const [records, setRecords] = useState<Record<string, Mastery>>({});            // by learner id
  const folded = useKeptRef<Record<string, number>>(keep, k("folded"), {});        // answers already added to each record
  const saved = useKeptRef<Record<string, true>>(keep, k("saved"), {});            // finished drills already saved for stars
  // Learner
  const [mineAll, setMine] = useKeptState<{ id: string; list: Done }>(keep, k("mine"), { id: "", list: [] });
  const [ack, setAck] = useState(0);
  const [typed, setTyped] = useState("");
  const [fb, setFb] = useState<{ i: number; ok: boolean } | null>(null);
  const [away, setAway] = useKeptState(keep, k("away"), "");
  const [, tick] = useState(0);
  const started = useRef(Date.now());

  const send = useLive({
    drill: (p) => {
      if (host || !p?.host) return;
      setDrill(cleanDrill(p.drill));
      const n = Number(p.ack?.[myId]); setAck(Number.isFinite(n) ? n : 0);
    },
    "drill-ans": (p) => {
      const d = drillRef.current;
      if (!host || !d || !d.open || p?.drill !== d.id || typeof p.by !== "string") return;
      const who = peopleRef.current.find((x) => x.id === p.by); // only learners in this class
      if (!who) return;
      const done = cleanDone(p.done, d.setup.count);
      setAnswers((cur) => (done.length > (cur[p.by]?.done.length ?? 0) ? { ...cur, [p.by]: { name: who.name, done } } : cur));
    },
  });

  const learners = people.filter((p) => p.id && p.id !== myId);
  const names = learners.map((p) => `${p.id}:${p.name}`).join("|");
  // Teacher: each learner's record, kept on this device under their name.
  useEffect(() => {
    if (!host) return;
    setRecords(Object.fromEntries(peopleRef.current.filter((p) => p.id && p.id !== myId).map((p) => [p.id, readRecord(p.name)])));
  }, [host, names, myId]);
  // Teacher: mark new answers into the records; save a finished drill for stars.
  useEffect(() => {
    if (!host || !drill) return;
    const next: Record<string, Mastery> = {};
    for (const [id, a] of Object.entries(answers)) {
      const key = `${drill.id}:${id}`, from = folded.current[key] ?? 0;
      if (a.done.length <= from) continue;
      const qs = questionsFor(drill, id), m = learn(readRecord(a.name), qs, a.done, from);
      folded.current[key] = a.done.length; writeRecord(a.name, m); next[id] = m;
      if (a.done.length >= qs.length && !saved.current[key] && sessionId) {
        saved.current[key] = true;
        const r = mark(qs, a.done);
        fetch("/api/board/drill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, student: id, correct: r.right, attempts: r.total }) }).catch(() => {});
      }
    }
    if (Object.keys(next).length) setRecords((cur) => ({ ...cur, ...next }));
  }, [host, drill, answers, sessionId, folded, saved]);
  // Teacher: keep the drill on every screen, with how many answers have arrived from each learner.
  const acks = JSON.stringify(Object.fromEntries(Object.entries(answers).map(([id, a]) => [id, a.done.length])));
  useEffect(() => {
    if (!host || !drill) return;
    const say = () => send("drill", { host: true, drill: drillRef.current, ack: JSON.parse(acks) });
    say();
    if (!drill.open) return;
    const t = setInterval(say, 4000 * scale);
    return () => clearInterval(t);
  }, [host, drill, acks, send, scale]);

  // Learner
  const mine = useMemo(() => (drill && mineAll.id === drill.id ? mineAll.list : []), [drill, mineAll]);
  const drillKey = drill ? `${drill.id}:${drill.seed}` : "";
  const qs = useMemo<Q[]>(() => (!host && drillRef.current && drillKey ? questionsFor(drillRef.current, myId) : []), [host, drillKey, myId]);
  const showing = !host && !!drill && drill.open && away !== drill.id && qs.length > 0;
  const finished = !fb && mine.length >= qs.length;
  const limit = drill?.setup.limit ?? 0;
  useEffect(() => { started.current = Date.now(); setTyped(""); setFb(null); }, [drillKey]);
  const answer = useRef<(v: number) => void>(() => {});
  answer.current = (value: number) => {
    const d = drillRef.current;
    if (!d || fb || mine.length >= qs.length) return;
    const i = mine.length, ok = value === qs[i].ans, list: Done = [...mine, [value, Math.max(0, Date.now() - started.current)]];
    setMine({ id: d.id, list }); setTyped(""); setFb({ i, ok }); play(ok ? "correct" : "wrong");
    send("drill-ans", { drill: d.id, by: myId, name: myName, done: list });
    setTimeout(() => { setFb(null); started.current = Date.now(); if (list.length >= qs.length) play("finish"); }, ok ? 650 : 1900);
  };
  // Say it again until the teacher's screen has every answer.
  useEffect(() => {
    if (host || !drill?.open || mine.length <= ack) return;
    const t = setInterval(() => send("drill-ans", { drill: drill.id, by: myId, name: myName, done: mine }), 3000 * scale);
    return () => clearInterval(t);
  }, [host, drill, mine, ack, myId, myName, send, scale]);
  // The clock, when each question is timed.
  useEffect(() => {
    if (!showing || finished || fb || !limit) return;
    const t = setInterval(() => { tick((n) => n + 1); if (Date.now() - started.current >= limit * 1000) answer.current(TIMED_OUT); }, 200);
    return () => clearInterval(t);
  }, [showing, finished, fb, limit, mine.length]);
  // A keyboard works as well as the number pad.
  useEffect(() => {
    if (!showing || finished) return;
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) { e.preventDefault(); setTyped((t) => (t.length < 3 ? t + e.key : t)); }
      else if (e.key === "Backspace") { e.preventDefault(); setTyped((t) => t.slice(0, -1)); }
      else if (e.key === "Enter") { e.preventDefault(); setTyped((t) => { if (t) setTimeout(() => answer.current(Number(t)), 0); return t; }); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [showing, finished]);

  // ── Learner ──
  if (!host) {
    if (!showing) return null;
    const i = fb ? fb.i : Math.min(mine.length, qs.length - 1), q = qs[i], r = mark(qs, mine);
    const left = limit ? Math.max(0, 1 - (Date.now() - started.current) / (limit * 1000)) : 0;
    const box = (text: string, tone: string) => <span className={`mx-1 inline-flex min-w-[2.2em] items-center justify-center rounded-xl border-4 px-2 ${tone}`}>{text || " "}</span>;
    const shownAns = fb ? box(String(q.ans), fb.ok ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-red-500 bg-red-50 text-red-700") : box(typed, "border-[#0E6E72] bg-[#EEF7F6]");
    const [before, after] = q.text.includes("?") ? q.text.split("?") : [q.text, ""];
    return (
      <div role="dialog" aria-modal="true" aria-label="Times-table drill" className="fixed inset-0 z-[128] flex items-center justify-center overflow-y-auto bg-[#0B1220]/92 p-3">
        <div className="w-full max-w-sm rounded-3xl bg-white p-4 text-ink shadow-2xl">
          {finished ? (
            <div className="text-center" aria-live="polite">
              <p className="text-5xl" aria-hidden>{r.right === r.total ? "🏆" : r.right >= r.total * 0.7 ? "🎉" : "💪"}</p>
              <p className="mt-1 text-2xl font-black" aria-label="Score">{r.right} out of {r.total}</p>
              <p className="text-sm font-bold text-ink/60">{r.quick} answered in under {QUICK_MS / 1000} seconds{r.right ? ` · usual time ${seconds(r.avgMs)}` : ""}</p>
              {r.missed.length > 0 ? (
                <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-left">
                  <p className="text-xs font-black text-amber-800">Practise these</p>
                  <ul className="mt-1 grid grid-cols-2 gap-x-3 font-mono text-sm font-bold" aria-label="Facts to practise">{r.missed.map((m) => <li key={factKey(m.a, m.b)}>{factText(m)}</li>)}</ul>
                </div>
              ) : <p className="mt-3 text-sm font-black text-emerald-700">Every one right. Brilliant!</p>}
              <p className="mt-3 text-xs font-bold text-ink/50">Your teacher can see how you did.</p>
              <button type="button" className="mt-3 min-h-[48px] w-full rounded-2xl bg-[#0E6E72] text-base font-black text-white" onClick={() => setAway(drill!.id)}>Back to the board</button>
            </div>
          ) : (
            <>
              <p className="flex items-center justify-between text-xs font-black text-ink/55"><span>Question {i + 1} of {qs.length}</span><span>{r.right} right</span></p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden><div className="h-full rounded-full bg-[#0E6E72] transition-[width]" style={{ width: `${(mine.length / qs.length) * 100}%` }} /></div>
              {limit > 0 && <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden><div className={`h-full rounded-full ${left < 0.3 ? "bg-red-500" : "bg-amber-400"}`} style={{ width: `${(fb ? 0 : left) * 100}%` }} /></div>}
              <p className="my-4 flex flex-wrap items-center justify-center text-4xl font-black" data-drill-q={q.text} aria-label={`Question: ${q.text.replace("?", "what")}`}>{before}{shownAns}{after}</p>
              <p className="min-h-[1.5rem] text-center text-sm font-black" role="status">
                {fb ? (fb.ok ? <span className="text-emerald-700">✓ Correct</span> : <span className="text-red-700">{mine[fb.i]?.[0] === TIMED_OUT ? "Out of time" : `Not ${mine[fb.i]?.[0]}`} — {factText(q)}</span>) : ""}
              </p>
              <div className="mt-1 grid grid-cols-3 gap-2" role="group" aria-label="Number pad">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => <button key={d} type="button" disabled={!!fb} onClick={() => setTyped((t) => (t.length < 3 ? t + d : t))} className="min-h-[54px] rounded-2xl bg-slate-100 text-2xl font-black active:bg-slate-200 disabled:opacity-50">{d}</button>)}
                <button type="button" disabled={!!fb} aria-label="Delete" onClick={() => setTyped((t) => t.slice(0, -1))} className="min-h-[54px] rounded-2xl bg-slate-100 text-xl font-black active:bg-slate-200 disabled:opacity-50">⌫</button>
                <button type="button" disabled={!!fb} onClick={() => setTyped((t) => (t.length < 3 ? t + "0" : t))} className="min-h-[54px] rounded-2xl bg-slate-100 text-2xl font-black active:bg-slate-200 disabled:opacity-50">0</button>
                <button type="button" disabled={!!fb || !typed} aria-label="Enter" onClick={() => answer.current(Number(typed))} className="min-h-[54px] rounded-2xl bg-[#0E6E72] text-lg font-black text-white disabled:opacity-40">OK</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Teacher ──
  const online = learners.filter((p) => p.online !== false);
  const rows = [...online, ...Object.entries(answers).filter(([id]) => !online.some((p) => p.id === id)).map(([id, a]) => ({ id, name: a.name }))];
  const weakOf = (id: string): Fact[] => weakFacts(records[id] ?? {});
  const anyWeak = online.some((p) => weakOf(p.id).length > 0);
  const start = (own: Record<string, Fact[]> = {}) => { setAnswers({}); setDrill(newDrill(setup, Date.now(), own)); };
  const startWeak = () => start(Object.fromEntries(online.map((p) => [p.id, weakOf(p.id)]).filter(([, f]) => (f as Fact[]).length)));
  const finishedCount = drill ? rows.filter((p) => (answers[p.id]?.done.length ?? 0) >= drill.setup.count).length : 0;
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? (list.length > 1 ? list.filter((x) => x !== v) : list) : [...list, v]);
  return (
    <>
      {drill?.open && !open && (
        <button type="button" onClick={onOpen} className="fixed bottom-[4.5rem] right-44 z-[95] flex items-center gap-2 rounded-full bg-[#0E6E72] px-4 py-3 text-sm font-black text-white shadow-2xl">
          ✖️ Drill ({finishedCount} of {rows.length} done)
        </button>
      )}
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Times-table drill" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-3">
          <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-2xl">
            <div className="flex items-center gap-2 border-b border-line p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E2F3F2] text-lg" aria-hidden>✖️</span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black">Times-table drill</p>
                <p className="text-xs font-bold text-ink/55">{drill ? `${drill.setup.tables.join(", ")} times table${drill.setup.tables.length > 1 ? "s" : ""} · ${drill.setup.count} questions${drill.open ? "" : " · ended"}` : "Each learner answers on their own screen"}</p>
              </div>
              {drill?.open && <button type="button" onClick={() => setDrill({ ...drill, open: false })} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white">End the drill</button>}
              <button type="button" onClick={onClose} aria-label={drill?.open ? "Hide — the drill carries on" : "Close"} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5">✕</button>
            </div>

            <div className="grid gap-3 overflow-y-auto p-3">
              {!drill && (
                <div className="grid gap-2.5" role="group" aria-label="Set up the drill">
                  <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Tables">
                    <span className={`w-full ${small}`}>Which tables?</span>
                    {TABLES.map((t) => <button key={t} type="button" aria-pressed={setup.tables.includes(t)} aria-label={`${t} times table`} className={`${setup.tables.includes(t) ? chipOn : chip} w-10 px-0`} onClick={() => setSetup({ ...setup, tables: toggle(setup.tables, t).sort((a, b) => a - b) })}>{t}</button>)}
                    <button type="button" className={chip} onClick={() => setSetup({ ...setup, tables: setup.tables.length === TABLES.length ? [2] : [...TABLES] })}>{setup.tables.length === TABLES.length ? "Clear" : "All"}</button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Question types">
                    <span className={`w-full ${small}`}>Kinds of question</span>
                    {OPS.map((o) => <button key={o} type="button" aria-pressed={setup.ops.includes(o)} className={`${setup.ops.includes(o) ? chipOn : chip} font-mono`} onClick={() => setSetup({ ...setup, ops: OPS.filter((x) => toggle(setup.ops, o).includes(x)) })}>{OP_NAMES[o]}</button>)}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="How many questions">
                      <span className={`w-full ${small}`}>How many questions?</span>
                      {COUNTS.map((n) => <button key={n} type="button" aria-pressed={setup.count === n} className={setup.count === n ? chipOn : chip} onClick={() => setSetup({ ...setup, count: n })}>{n}</button>)}
                    </div>
                    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Time for each question">
                      <span className={`w-full ${small}`}>Time for each question</span>
                      {LIMITS.map((n) => <button key={n} type="button" aria-pressed={setup.limit === n} className={setup.limit === n ? chipOn : chip} onClick={() => setSetup({ ...setup, limit: n })}>{n ? `${n} seconds` : "No limit"}</button>)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button type="button" className={`${primary} min-h-[40px] px-4 text-sm`} onClick={() => start()}>Start the drill</button>
                    {anyWeak && <button type="button" className={`${chip} min-h-[40px]`} onClick={startWeak}>Drill each learner&apos;s weak facts</button>}
                    {!online.length && <span className="text-xs font-bold text-amber-700">No learner has joined yet.</span>}
                  </div>
                </div>
              )}

              {rows.length > 0 && (
                <ul className="grid gap-2" aria-label="Learners">
                  {rows.map((p) => {
                    const a = answers[p.id]?.done ?? [], qsOf = drill ? questionsFor(drill, p.id) : [], r = drill ? mark(qsOf, a) : null, rec = records[p.id] ?? {}, c = masteryCount(rec);
                    const lastI = a.length - 1, last = lastI >= 0 && qsOf[lastI] ? qsOf[lastI] : null, weak = weakOf(p.id);
                    return (
                      <li key={p.id} className="flex flex-wrap items-start gap-3 rounded-xl bg-slate-50 p-2.5" aria-label={p.name}>
                        <div className="min-w-0 flex-[1_1_240px]">
                          <p className="text-sm font-black">{p.name}{drill && drill.own[p.id] ? <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800">their weak facts</span> : null}</p>
                          {drill && r && (
                            <>
                              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200" aria-hidden><div className="h-full rounded-full bg-[#0E6E72]" style={{ width: `${(r.n / r.total) * 100}%` }} /></div>
                              <p className="mt-1 text-xs font-bold" aria-label="Progress">{r.finished ? `Finished: ${r.right} out of ${r.total}` : r.n ? `${r.n} of ${r.total} answered · ${r.right} right` : drill.open ? "Not started yet" : "Did not answer"}{r.right ? ` · usual time ${seconds(r.avgMs)}` : ""}</p>
                              {last && !r.finished && <p className="text-xs text-ink/65">Last: <span className="font-mono font-bold">{last.text.replace("?", "▢")}</span> {a[lastI][0] === TIMED_OUT ? "ran out of time" : `→ ${a[lastI][0]}`} {a[lastI][0] === last.ans ? "✓" : "✗"}</p>}
                              {r.missed.length > 0 && <p className="mt-0.5 text-xs text-red-700" aria-label="Missed">Missed: <span className="font-mono font-bold">{r.missed.map(factText).join(", ")}</span></p>}
                            </>
                          )}
                          <p className="mt-1 text-[11px] font-bold text-ink/55">All drills on this device: {c.quick} quick · {c.slow} slow · {c.wrong} to practise</p>
                          {weak.length > 0 && <p className="text-[11px] text-ink/65">Weak facts: <span className="font-mono font-bold">{weak.map(([x, y]) => `${x}×${y}`).join(", ")}</span></p>}
                        </div>
                        <FactMap m={rec} name={p.name} />
                      </li>
                    );
                  })}
                </ul>
              )}
              {rows.length > 0 && (
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-ink/60" aria-hidden>
                  {(["quick", "slow", "wrong", "new"] as Level[]).map((l) => <span key={l} className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm" style={{ background: LEVEL_COLOUR[l] }} />{l === "quick" ? `Right within ${QUICK_MS / 1000} s` : l === "slow" ? "Right but slow" : l === "wrong" ? "Wrong last time" : "Not tried yet"}</span>)}
                </p>
              )}
              {drill && !drill.open && (
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" className={`${primary} min-h-[40px] px-4 text-sm`} onClick={() => setDrill(null)}>New drill</button>
                  {anyWeak && <button type="button" className={`${chip} min-h-[40px]`} onClick={startWeak}>Drill each learner&apos;s weak facts</button>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
