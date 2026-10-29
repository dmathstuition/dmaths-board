"use client";
import { useState } from "react";
import { Floating } from "@/components/live/board/MathPanels";
import {
  PLACE_COLUMNS, PLACE_SHORT, clockDigital, clockWords, multiplesOf, normTime, numberToWords, placeValue, sentenceRight,
  sentenceWords, shuffleOrder, simplify, spellDone, spellShown, spellWrong, wallTotal, cleanSpellWord,
} from "@/lib/boardExtras";
import { makeGroups } from "@/lib/boardTemplates";
import {
  WORD_KINDS, type GroupsState, type ClockState, type FractionState, type HundredState, type PlaceState, type SentenceState, type SpellState, type WordCardState,
} from "@/lib/boardTools";

// More class tools that float over the board — maths (clock, fraction wall,
// hundred square, place value) and English (word card, sentence builder,
// spell it). The host works them; learners see them live.

type P<T> = { s: T; host: boolean; boxW: number; onChange: (s: T, final?: boolean) => void };
const chip = "min-h-[32px] rounded-lg bg-slate-100 px-2.5 text-xs font-black text-ink hover:bg-slate-200 disabled:opacity-40";
const primary = "min-h-[32px] rounded-lg bg-[#1657C9] px-3 text-xs font-black text-white hover:bg-[#1249a8] disabled:opacity-40";
const field = "min-h-[34px] w-full rounded-lg bg-slate-50 px-2.5 text-sm font-semibold text-ink ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1657C9]";

// ── Clock ────────────────────────────────────────────────────────────────
export function ClockPanel({ s, host, onChange }: P<ClockState>) {
  const set = (h: number, m: number) => onChange({ ...s, ...normTime(h, m) }, true);
  const hourA = ((s.h % 12) + s.m / 60) * 30, minA = s.m * 6;
  const hand = (deg: number, len: number) => ({ x: 100 + len * Math.sin((deg * Math.PI) / 180), y: 100 - len * Math.cos((deg * Math.PI) / 180) });
  const hh = hand(hourA, 48), mh = hand(minA, 72);
  return (
    <Floating p={s} host={host} title="Clock" icon="clock" width={250} onChange={onChange}>
      <div className="p-3">
        <svg viewBox="0 0 200 200" className="mx-auto block w-full max-w-[200px]" role="img" aria-label={`Clock showing ${clockWords(s.h, s.m)}`}>
          <circle cx="100" cy="100" r="94" fill="#fff" stroke="#0B1220" strokeWidth="5" />
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i * 6 * Math.PI) / 180, r1 = i % 5 ? 86 : 80;
            return <line key={i} x1={100 + r1 * Math.sin(a)} y1={100 - r1 * Math.cos(a)} x2={100 + 90 * Math.sin(a)} y2={100 - 90 * Math.cos(a)} stroke="#334155" strokeWidth={i % 5 ? 1 : 2.5} />;
          })}
          {Array.from({ length: 12 }, (_, i) => {
            const n = i + 1, a = (n * 30 * Math.PI) / 180;
            return <text key={n} x={100 + 66 * Math.sin(a)} y={100 - 66 * Math.cos(a) + 6} textAnchor="middle" fontSize="17" fontWeight="800" fill="#0B1220" fontFamily="Poppins, system-ui">{n}</text>;
          })}
          <line x1="100" y1="100" x2={hh.x} y2={hh.y} stroke="#0B1220" strokeWidth="7" strokeLinecap="round" />
          <line x1="100" y1="100" x2={mh.x} y2={mh.y} stroke="#1657C9" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="100" cy="100" r="6" fill="#DC2626" />
        </svg>
        <div className="mt-2 min-h-[44px] text-center" aria-live="polite">
          {s.digital && <p className="font-mono text-2xl font-black tabular-nums">{clockDigital(s.h, s.m)}</p>}
          {s.words && <p className="text-sm font-bold text-ink/70 first-letter:uppercase">{clockWords(s.h, s.m)}</p>}
          {!s.digital && !s.words && <p className="pt-2 text-sm font-bold text-ink/50">What time is it?</p>}
        </div>
        {host && (
          <div className="mt-2 grid gap-1.5">
            <div className="grid grid-cols-3 gap-1">
              <button type="button" className={chip} onClick={() => set(s.h - 1, s.m)}>−1 h</button>
              <button type="button" className={chip} onClick={() => set(s.h, s.m - 5)}>−5 min</button>
              <button type="button" className={chip} onClick={() => set(s.h, s.m - 1)}>−1 min</button>
              <button type="button" className={chip} onClick={() => set(s.h + 1, s.m)}>+1 h</button>
              <button type="button" className={chip} onClick={() => set(s.h, s.m + 5)}>+5 min</button>
              <button type="button" className={chip} onClick={() => set(s.h, s.m + 1)}>+1 min</button>
            </div>
            <div className="flex flex-wrap gap-1">
              <button type="button" className={primary} onClick={() => set(Math.floor(Math.random() * 12), Math.floor(Math.random() * 12) * 5)}>Random time</button>
              <button type="button" aria-pressed={s.digital} className={chip} onClick={() => onChange({ ...s, digital: !s.digital }, true)}>{s.digital ? "Hide" : "Show"} digital</button>
              <button type="button" aria-pressed={s.words} className={chip} onClick={() => onChange({ ...s, words: !s.words }, true)}>{s.words ? "Hide" : "Show"} words</button>
            </div>
          </div>
        )}
      </div>
    </Floating>
  );
}

// ── Fraction wall ────────────────────────────────────────────────────────
const BAR_COLORS = ["#1657C9", "#DC2626", "#16A34A", "#D97706", "#7C3AED"];
export function FractionPanel({ s, host, boxW, onChange }: P<FractionState>) {
  const width = Math.max(320, Math.min(560, boxW * 0.5));
  const setBar = (i: number, d: number, on: number[]) => onChange({ ...s, bars: s.bars.map((b, j) => (j === i ? { d, on } : b)) }, true);
  const [tn, td] = wallTotal(s.bars);
  return (
    <Floating p={s} host={host} title="Fraction wall" icon="fractions" width={width} onChange={onChange}>
      <div className="grid gap-1.5 p-3">
        {s.bars.map((b, i) => {
          const [n, d] = simplify(b.on.length, b.d);
          return (
            <div key={i} className="flex items-center gap-1.5">
              {host && <button type="button" className={`${chip} w-8 px-0`} aria-label="Fewer pieces" onClick={() => setBar(i, Math.max(1, b.d - 1), [])} disabled={b.d <= 1}>−</button>}
              <div className="flex h-10 flex-1 overflow-hidden rounded-lg ring-1 ring-slate-300">
                {Array.from({ length: b.d }, (_, k) => {
                  const on = b.on.includes(k);
                  return (
                    <button key={k} type="button" disabled={!host} onClick={() => setBar(i, b.d, on ? b.on.filter((x) => x !== k) : [...b.on, k])}
                      aria-label={`Piece ${k + 1} of ${b.d}${on ? ", shaded" : ""}`} aria-pressed={on}
                      className="flex flex-1 items-center justify-center border-r border-white text-[11px] font-black last:border-r-0 disabled:cursor-default"
                      style={{ background: on ? BAR_COLORS[i % BAR_COLORS.length] : `${BAR_COLORS[i % BAR_COLORS.length]}1f`, color: on ? "#fff" : "#0B1220" }}>
                      {b.d === 1 ? "1" : b.d <= 12 && width / b.d > 26 ? `1/${b.d}` : ""}
                    </button>
                  );
                })}
              </div>
              {host && <button type="button" className={`${chip} w-8 px-0`} aria-label="More pieces" onClick={() => setBar(i, Math.min(12, b.d + 1), [])} disabled={b.d >= 12}>+</button>}
              <span className="w-12 text-right font-mono text-sm font-black tabular-nums">{b.on.length}/{b.d}</span>
              {host && s.bars.length > 1 && <button type="button" className="h-8 w-6 text-ink/40 hover:text-red-600" aria-label="Remove this bar" onClick={() => onChange({ ...s, bars: s.bars.filter((_, j) => j !== i) }, true)}>×</button>}
              {!host && (n !== b.on.length || d !== b.d) && b.on.length > 0 && <span className="text-xs font-bold text-ink/50">= {n}/{d}</span>}
            </div>
          );
        })}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-bold text-ink/70">
          {host && <button type="button" className={chip} disabled={s.bars.length >= 5} onClick={() => onChange({ ...s, bars: [...s.bars, { d: 3, on: [] }] }, true)}>+ Add bar</button>}
          {host && <button type="button" className={chip} onClick={() => onChange({ ...s, bars: s.bars.map((b) => ({ ...b, on: [] })) }, true)}>Clear shading</button>}
          <span className="ml-auto">Shaded altogether: <b className="font-mono text-base text-ink">{tn === 0 ? "0" : td === 1 ? tn : `${tn}/${td}`}</b></span>
        </div>
      </div>
    </Floating>
  );
}

// ── Hundred square ───────────────────────────────────────────────────────
export function HundredPanel({ s, host, boxW, onChange }: P<HundredState>) {
  const width = Math.max(300, Math.min(440, boxW * 0.4));
  const toggle = (n: number) => onChange({ ...s, marks: s.marks.includes(n) ? s.marks.filter((x) => x !== n) : [...s.marks, n] }, true);
  return (
    <Floating p={s} host={host} title="Hundred square" icon="hundred" width={width} onChange={onChange}>
      <div className="p-2.5">
        <div className="grid grid-cols-10 gap-[2px] rounded-lg bg-slate-200 p-[2px]">
          {Array.from({ length: 100 }, (_, i) => {
            const n = i + 1, on = s.marks.includes(n);
            return (
              <button key={n} type="button" disabled={!host} onClick={() => toggle(n)} aria-pressed={on}
                className={`aspect-square rounded-[3px] text-[11px] font-black tabular-nums disabled:cursor-default ${on ? "bg-[#1657C9] text-white" : n % 10 === 0 ? "bg-sky-50 text-ink" : "bg-white text-ink"}`}>{n}</button>
            );
          })}
        </div>
        {host && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink/45">Multiples of</span>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => <button key={k} type="button" className={`${chip} w-8 px-0`} onClick={() => onChange({ ...s, marks: multiplesOf(k) }, true)}>{k}</button>)}
            <button type="button" className={chip} onClick={() => onChange({ ...s, marks: [] }, true)}>Clear</button>
          </div>
        )}
        <p className="mt-1.5 text-right text-xs font-bold text-ink/55">{s.marks.length} shaded</p>
      </div>
    </Floating>
  );
}

// ── Place value chart ────────────────────────────────────────────────────
const PV_COLORS = ["#7C3AED", "#DB2777", "#DC2626", "#D97706", "#16A34A", "#0EA5E9", "#1657C9"];
export function PlaceValuePanel({ s, host, boxW, onChange }: P<PlaceState>) {
  const width = Math.max(340, Math.min(620, boxW * 0.6));
  const n = placeValue(s.digits);
  const setDigit = (i: number, d: number) => onChange({ ...s, digits: s.digits.map((x, j) => (j === i ? (d + 10) % 10 : x)) }, true);
  return (
    <Floating p={s} host={host} title="Place value" icon="placevalue" width={width} onChange={onChange}>
      <div className="p-3">
        <div className="grid grid-cols-7 gap-1">
          {s.digits.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1 rounded-xl p-1" style={{ background: `${PV_COLORS[i]}14` }}>
              <span className="text-[11px] font-black" style={{ color: PV_COLORS[i] }} title={PLACE_COLUMNS[i]}>{PLACE_SHORT[i]}</span>
              {host && <button type="button" className="h-7 w-full rounded-md bg-white text-sm font-black shadow-sm" aria-label={`Add one to ${PLACE_COLUMNS[i]}`} onClick={() => setDigit(i, d + 1)}>+</button>}
              <span className="font-mono text-3xl font-black tabular-nums" style={{ color: PV_COLORS[i] }}>{d}</span>
              {host && <button type="button" className="h-7 w-full rounded-md bg-white text-sm font-black shadow-sm" aria-label={`Take one from ${PLACE_COLUMNS[i]}`} onClick={() => setDigit(i, d - 1)}>−</button>}
            </div>
          ))}
        </div>
        <div className="mt-2 rounded-xl bg-slate-50 p-2 text-center" aria-live="polite">
          <p className="font-mono text-2xl font-black tabular-nums">{n.toLocaleString("en-GB")}</p>
          <p className="text-sm font-bold first-letter:uppercase text-ink/70">{numberToWords(n)}</p>
        </div>
        {host && (
          <div className="mt-2 flex gap-1">
            <button type="button" className={primary} onClick={() => onChange({ ...s, digits: s.digits.map((_, i) => (i < 2 ? 0 : Math.floor(Math.random() * 10))) }, true)}>Random number</button>
            <button type="button" className={chip} onClick={() => onChange({ ...s, digits: [0, 0, 0, 0, 0, 0, 0] }, true)}>Clear</button>
          </div>
        )}
      </div>
    </Floating>
  );
}

// ── Word card (vocabulary) ───────────────────────────────────────────────
export function WordCardPanel({ s, host, onChange }: P<WordCardState>) {
  const set = (patch: Partial<WordCardState>, final = false) => onChange({ ...s, ...patch }, final);
  const blur = () => onChange(s, true);
  return (
    <Floating p={s} host={host} title="Word card" icon="wordcard" width={330} onChange={onChange}>
      <div className="p-3">
        <div className="rounded-xl bg-gradient-to-br from-[#EEF6FF] to-white p-3 ring-1 ring-[#BFD7FF]">
          <div className="flex items-start justify-between gap-2">
            <p className="break-words text-3xl font-black text-[#0B1220]">{s.word || <span className="text-ink/30">Word</span>}</p>
            <span className="shrink-0 rounded-full bg-[#1657C9] px-2 py-0.5 text-[11px] font-black italic text-white">{s.kind}</span>
          </div>
          {s.reveal || host ? (
            <>
              <p className={`mt-2 text-sm font-semibold ${s.reveal ? "text-ink" : "text-ink/45"}`}>{s.meaning || "—"}</p>
              {s.example && <p className={`mt-1 text-sm italic ${s.reveal ? "text-ink/70" : "text-ink/35"}`}>“{s.example}”</p>}
              {host && !s.reveal && <p className="mt-1 text-[11px] font-bold text-amber-700">Hidden from learners</p>}
            </>
          ) : <p className="mt-2 text-sm font-bold text-ink/45">What does it mean? Use it in a sentence.</p>}
        </div>
        {host && (
          <div className="mt-2 grid gap-1.5">
            <div className="grid grid-cols-[1fr_auto] gap-1.5">
              <input className={field} value={s.word} maxLength={40} placeholder="Word" aria-label="Word" onChange={(e) => set({ word: e.target.value })} onBlur={blur} />
              <select className={`${field} w-auto`} value={s.kind} aria-label="Word class" onChange={(e) => set({ kind: e.target.value }, true)}>
                {WORD_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <input className={field} value={s.meaning} maxLength={200} placeholder="Meaning" aria-label="Meaning" onChange={(e) => set({ meaning: e.target.value })} onBlur={blur} />
            <input className={field} value={s.example} maxLength={200} placeholder="Example sentence" aria-label="Example sentence" onChange={(e) => set({ example: e.target.value })} onBlur={blur} />
            <button type="button" className={s.reveal ? chip : primary} onClick={() => set({ reveal: !s.reveal }, true)}>{s.reveal ? "Hide meaning" : "Reveal meaning"}</button>
          </div>
        )}
      </div>
    </Floating>
  );
}

// ── Sentence builder (unscramble) ────────────────────────────────────────
export function SentencePanel({ s, host, boxW, onChange }: P<SentenceState>) {
  const [draft, setDraft] = useState("");
  const width = Math.max(320, Math.min(720, boxW * 0.72));
  const pool = s.order.filter((i) => !s.built.includes(i));
  const right = sentenceRight(s.words, s.built);
  const tile = "min-h-[38px] rounded-lg px-3 text-base font-black shadow-sm ring-1 transition active:scale-95 disabled:cursor-default";
  function scramble() {
    const words = sentenceWords(draft);
    if (words.length < 2) return;
    onChange({ ...s, words, order: shuffleOrder(words.length), built: [], checked: false }, true);
    setDraft("");
  }
  return (
    <Floating p={s} host={host} title="Sentence builder" icon="sentence" width={width} onChange={onChange}>
      <div className="grid gap-2 p-3">
        {s.words.length ? (
          <>
            <div className={`flex min-h-[52px] flex-wrap items-center gap-1.5 rounded-xl border-2 border-dashed p-2 ${s.checked ? (right ? "border-emerald-500 bg-emerald-50" : "border-red-400 bg-red-50") : "border-slate-300 bg-slate-50"}`}>
              {s.built.length ? s.built.map((i, k) => (
                <button key={k} type="button" disabled={!host} onClick={() => onChange({ ...s, built: s.built.filter((_, j) => j !== k), checked: false }, true)}
                  className={`${tile} bg-[#1657C9] text-white ring-[#1657C9]`}>{s.words[i]}</button>
              )) : <span className="px-1 text-sm font-bold text-ink/40">Tap the words in the right order…</span>}
            </div>
            <div className="flex min-h-[44px] flex-wrap gap-1.5">
              {pool.map((i) => (
                <button key={i} type="button" disabled={!host} onClick={() => onChange({ ...s, built: [...s.built, i], checked: false }, true)}
                  className={`${tile} bg-white text-ink ring-slate-300 hover:ring-[#1657C9]`}>{s.words[i]}</button>
              ))}
            </div>
            {s.checked && <p className={`text-sm font-black ${right ? "text-emerald-700" : "text-red-600"}`} aria-live="polite">{right ? "✓ Well done — that's right!" : "Not yet — try again."}</p>}
          </>
        ) : <p className="text-sm font-bold text-ink/45">{host ? "Type a sentence below and scramble it." : "Waiting for a sentence…"}</p>}
        {host && (
          <div className="grid gap-1.5 border-t border-slate-100 pt-2">
            {s.words.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <button type="button" className={primary} disabled={s.built.length !== s.words.length} onClick={() => onChange({ ...s, checked: true }, true)}>Check</button>
                <button type="button" className={chip} onClick={() => onChange({ ...s, built: [], order: shuffleOrder(s.words.length), checked: false }, true)}>Shuffle again</button>
                <button type="button" className={chip} onClick={() => onChange({ ...s, built: s.words.map((_, i) => i), checked: true }, true)}>Show answer</button>
              </div>
            )}
            <div className="flex gap-1.5">
              <input className={field} value={draft} maxLength={200} placeholder="e.g. The cat sat on the mat." aria-label="Sentence to scramble"
                onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") scramble(); }} />
              <button type="button" className={primary} onClick={scramble} disabled={sentenceWords(draft).length < 2}>Scramble</button>
            </div>
          </div>
        )}
      </div>
    </Floating>
  );
}

// ── Spell it (missing letters) ───────────────────────────────────────────
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export function SpellPanel({ s, host, boxW, onChange }: P<SpellState>) {
  const [draft, setDraft] = useState("");
  const width = Math.max(320, Math.min(560, boxW * 0.55));
  const shown = s.reveal ? [...s.word] : spellShown(s.word, s.guessed);
  const wrong = spellWrong(s.word, s.guessed);
  const done = spellDone(s.word, s.guessed);
  function start() {
    const word = cleanSpellWord(draft);
    if (!/[A-Z]/.test(word)) return;
    onChange({ ...s, word, guessed: [], reveal: false }, true);
    setDraft("");
  }
  return (
    <Floating p={s} host={host} title="Spell it" icon="spell" width={width} onChange={onChange}>
      <div className="grid gap-2 p-3">
        {s.word ? (
          <>
            <div className="flex flex-wrap justify-center gap-1.5" aria-label="The word so far">
              {shown.map((ch, i) => /[A-Z]/.test(s.word[i]) ? (
                <span key={i} className={`flex h-12 w-10 items-end justify-center border-b-4 pb-1 font-mono text-3xl font-black ${ch ? (done || s.reveal ? "border-emerald-500 text-emerald-700" : "border-[#1657C9] text-ink") : "border-slate-400"}`}>{ch}</span>
              ) : <span key={i} className="w-4" aria-hidden>{s.word[i] === " " ? "" : s.word[i]}</span>)}
            </div>
            <p className="text-center text-sm font-bold" aria-live="polite">
              {done ? <span className="text-emerald-700">✓ Spelt it!</span> : s.reveal ? <span className="text-ink/60">The word was revealed.</span>
                : <span className="text-ink/55">{[...s.word].filter((c) => /[A-Z]/.test(c)).length} letters{wrong.length ? <> · wrong: <span className="text-red-600">{wrong.join(" ")}</span></> : ""}</span>}
            </p>
            <div className="grid grid-cols-9 gap-1">
              {ALPHABET.map((L) => {
                const used = s.guessed.includes(L), hit = used && s.word.includes(L);
                return (
                  <button key={L} type="button" disabled={!host || used || done || s.reveal} onClick={() => onChange({ ...s, guessed: [...s.guessed, L] }, true)}
                    className={`min-h-[32px] rounded-md text-sm font-black disabled:cursor-default ${used ? (hit ? "bg-emerald-500 text-white" : "bg-red-100 text-red-400 line-through") : "bg-slate-100 text-ink hover:bg-sky-100"}`}>{L}</button>
                );
              })}
            </div>
          </>
        ) : <p className="text-sm font-bold text-ink/45">{host ? "Type a word below to start." : "Waiting for a word…"}</p>}
        {host && (
          <div className="grid gap-1.5 border-t border-slate-100 pt-2">
            {s.word && (
              <div className="flex gap-1">
                <button type="button" className={chip} onClick={() => onChange({ ...s, reveal: !s.reveal }, true)}>{s.reveal ? "Hide word" : "Reveal word"}</button>
                <button type="button" className={chip} onClick={() => onChange({ ...s, guessed: [], reveal: false }, true)}>Start again</button>
              </div>
            )}
            <div className="flex gap-1.5">
              <input className={field} value={draft} maxLength={24} placeholder="Secret word (learners see blanks)" aria-label="Word to spell" autoComplete="off"
                onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") start(); }} />
              <button type="button" className={primary} onClick={start} disabled={!/[a-z]/i.test(draft)}>Start</button>
            </div>
          </div>
        )}
      </div>
    </Floating>
  );
}

// ── Group maker ──────────────────────────────────────────────────────────
const GROUP_COLORS = ["#1657C9", "#DC2626", "#16A34A", "#D97706", "#7C3AED", "#DB2777", "#0EA5E9", "#65A30D", "#EA580C", "#4F46E5", "#0D9488", "#BE123C"];
export function GroupsPanel({ s, host, boxW, names, onChange }: P<GroupsState> & { names: string[] }) {
  const width = Math.max(320, Math.min(640, boxW * 0.6));
  const make = () => onChange({ ...s, groups: makeGroups(names, s.size) }, true);
  return (
    <Floating p={s} host={host} title="Group maker" icon="groups" width={width} onChange={onChange}>
      <div className="grid gap-2 p-3">
        {host && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-black text-ink/60">Learners per group</span>
            <button type="button" className={`${chip} w-8 px-0`} aria-label="Smaller groups" onClick={() => onChange({ ...s, size: Math.max(2, s.size - 1) }, true)} disabled={s.size <= 2}>−</button>
            <span className="w-6 text-center font-mono text-lg font-black">{s.size}</span>
            <button type="button" className={`${chip} w-8 px-0`} aria-label="Bigger groups" onClick={() => onChange({ ...s, size: Math.min(10, s.size + 1) }, true)} disabled={s.size >= 10}>+</button>
            <button type="button" className={`${primary} ml-auto`} onClick={make} disabled={!names.length}>{s.groups.length ? "Shuffle again" : "Make groups"}</button>
          </div>
        )}
        {s.groups.length ? (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(4, s.groups.length)}, minmax(0, 1fr))` }}>
            {s.groups.map((g, i) => (
              <div key={i} className="rounded-xl p-2 ring-1" style={{ background: `${GROUP_COLORS[i % 12]}12`, borderColor: GROUP_COLORS[i % 12], boxShadow: `inset 0 3px 0 ${GROUP_COLORS[i % 12]}` }}>
                <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: GROUP_COLORS[i % 12] }}>Group {i + 1}</p>
                <ul className="mt-1 grid gap-0.5">{g.map((n) => <li key={n} className="truncate text-sm font-bold text-ink">{n}</li>)}</ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold text-ink/45">{names.length ? (host ? `${names.length} learner${names.length === 1 ? "" : "s"} online — press Make groups.` : "Groups will appear here.") : "No learners are online yet."}</p>
        )}
      </div>
    </Floating>
  );
}
