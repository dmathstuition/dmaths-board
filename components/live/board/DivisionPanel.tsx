"use client";
// Division, broken down (lib/division.ts): one division, five ways of seeing
// it, a step at a time — sharing, grouping on a number line, chunking, short
// division and long division — with the times-table strip lit up for each
// step, the remainder as a remainder, fraction or decimal, and the check.
// The teacher works it; learners see every step. "Ask the class first" hides
// each answer until the teacher shows it, and "Learners try one" puts the same
// division on every phone to do themselves, a question at a time.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Floating } from "@/components/live/board/MathPanels";
import { useLive } from "@/components/live/LiveChannel";
import { cellShown } from "@/lib/mathsMore";
import {
  DIV_METHODS, REM_FORMS, answerText, breakdown, checkText, fitDiv, methodOf, randomDiv, tryPlan,
  type Breakdown, type DivMethod, type DivState, type RemForm,
} from "@/lib/division";

const chip = "min-h-[32px] rounded-lg bg-slate-100 px-2.5 text-xs font-black text-ink hover:bg-slate-200 disabled:opacity-40";
const chipOn = "min-h-[32px] rounded-lg bg-[#0E6E72] px-2.5 text-xs font-black text-white";
const primary = "min-h-[32px] rounded-lg bg-[#0E6E72] px-3 text-xs font-black text-white hover:bg-[#0A4F52] disabled:opacity-40";
const field = "min-h-[32px] w-20 rounded-lg bg-slate-50 px-2 font-mono text-xs font-bold text-ink ring-1 ring-slate-200";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const GROUP_COLOURS = ["#0E6E72", "#C2410C", "#7C3AED", "#2563EB", "#16A34A", "#DB2777", "#CA8A04", "#0891B2", "#9333EA", "#DC2626"];

function Num({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-black text-ink/60">{label}
      <input type="number" inputMode="numeric" value={text} min={min} max={max} aria-label={label} className={field}
        onChange={(e) => { setText(e.target.value); const v = Number(e.target.value); if (e.target.value !== "" && Number.isInteger(v) && v >= min && v <= max) onChange(v); }}
        onBlur={() => setText(String(value))} />
    </label>
  );
}

export function DivisionPanel({ s, host, boxW, onChange }: { s: DivState; host: boolean; boxW: number; onChange: (s: DivState, final?: boolean) => void }) {
  const width = Math.max(340, Math.min(780, boxW * 0.82));
  const d = useMemo(() => breakdown(s), [s.a, s.b, s.method, s.rem]); // eslint-disable-line react-hooks/exhaustive-deps
  const last = d.steps.length - 1, step = Math.min(s.step, last), st = d.steps[step];
  const hiding = s.ask && !s.shown && !!st.ask;          // the class answers first
  const vis = hiding ? Math.max(0, step - 1) : step;     // what the drawing shows meanwhile
  const set = (c: Partial<DivState>) => onChange({ ...s, ...c }, true);
  const sum = (method: DivMethod, a: number, b: number) => { const [x, y] = fitDiv(method, a, b); set({ method, a: x, b: y, step: 0, shown: false }); };
  const m = methodOf(s.method);
  // Learners trying one on their phones: who has finished.
  const [done, setDone] = useState<Record<string, number>>({});
  useLive({ "div-done": (p) => { if (host && Number(p?.id) === s.tryId && typeof p?.by === "string") setDone((x) => ({ ...x, [p.by.slice(0, 80)]: Math.max(0, Math.round(Number(p.mistakes) || 0)) })); } });
  useEffect(() => setDone({}), [s.tryId]);
  const finished = Object.values(done);
  const final = step === last;

  return (
    <>
      <Floating p={s} host={host} title={`Division: ${s.a} ÷ ${s.b}`} icon="division" width={width} onChange={onChange}>
        <div className="grid gap-2.5 p-2.5">
          <div role="tablist" aria-label="Method" className="flex flex-wrap gap-1">
            {DIV_METHODS.map((x) => (
              <button key={x.k} type="button" role="tab" aria-selected={s.method === x.k} title={x.hint} disabled={!host && s.method !== x.k}
                onClick={() => host && sum(x.k, s.a, s.b)} className={s.method === x.k ? chipOn : chip}>{x.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-start gap-2.5">
            <div className="flex min-w-0 flex-[3_1_300px] flex-col gap-2">
              <div className="flex min-h-[150px] items-center justify-center overflow-x-auto rounded-xl bg-white p-2 ring-1 ring-slate-200" aria-label={`${m.label}: ${s.a} ÷ ${s.b}`}>
                <Picture s={s} d={d} vis={vis} />
              </div>
              <Multiples b={s.b} lit={hiding ? undefined : st.mult} />
            </div>
            <div className="grid min-w-0 flex-[2_1_220px] gap-2">
              <div className="rounded-xl bg-slate-50 p-2.5" aria-live="polite" aria-label="Step">
                <p className="text-[11px] font-black uppercase tracking-wide text-ink/45">{m.label} · step {step + 1} of {d.steps.length}</p>
                {hiding
                  ? <p className="mt-0.5 text-base font-black leading-snug text-[#0A4F52]">🤔 {st.ask}</p>
                  : <p className="mt-0.5 text-sm font-bold leading-snug">{st.say}</p>}
                {final && !hiding && (
                  <p className="mt-2 rounded-lg bg-emerald-50 px-2 py-1.5 text-sm font-black text-emerald-900">{s.a} ÷ {s.b} = {d.answer} <span className="block text-xs font-bold text-emerald-800">Check: {d.check} ✓</span></p>
                )}
              </div>
              {host && (
                <>
                  <div className="flex flex-wrap gap-1" role="group" aria-label="Steps">
                    <button type="button" className={chip} disabled={step <= 0} onClick={() => set({ step: step - 1, shown: true })}>◀ Back</button>
                    {hiding
                      ? <button type="button" className={primary} onClick={() => set({ shown: true })}>Show the answer</button>
                      : <button type="button" className={primary} disabled={step >= last} onClick={() => set({ step: step + 1, shown: false })}>Next step ▶</button>}
                    <button type="button" className={chip} disabled={step >= last} onClick={() => set({ step: last, shown: true })}>Show it all</button>
                    <button type="button" className={chip} disabled={step <= 0} onClick={() => set({ step: 0, shown: false })}>Start again</button>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs font-black text-ink/70">
                    <input type="checkbox" checked={s.ask} onChange={(e) => set({ ask: e.target.checked, shown: true })} /* from the next step on */ className="h-4 w-4 accent-[#0E6E72]" /> Ask the class first (hide each answer until I show it)
                  </label>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <Num label="Divide" value={s.a} min={m.a[0]} max={m.a[1]} onChange={(a) => sum(s.method, a, s.b)} />
                    <Num label="by" value={s.b} min={m.b[0]} max={m.b[1]} onChange={(b) => sum(s.method, s.a, b)} />
                    <button type="button" className={chip} onClick={() => { const [a, b] = randomDiv(s.method); sum(s.method, a, b); }}>New numbers</button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Remainder as">
                    <span className="text-[11px] font-black text-ink/60">Remainder as</span>
                    {(Object.keys(REM_FORMS) as RemForm[]).map((r) => <button key={r} type="button" aria-pressed={s.rem === r} className={s.rem === r ? chipOn : chip} onClick={() => set({ rem: r, step: 0, shown: false })}>{REM_FORMS[r]}</button>)}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#EEF7F6] p-2">
                    <button type="button" className={s.tryOn ? chipOn : primary} onClick={() => set(s.tryOn ? { tryOn: false } : { tryOn: true, tryId: s.tryId + 1 })}>
                      {s.tryOn ? "■ Stop learners' turn" : `📱 Learners try ${s.a} ÷ ${s.b}`}
                    </button>
                    {s.tryOn && <span className="text-xs font-bold text-[#0A4F52]" role="status">{finished.length ? `✓ ${finished.length} finished · ${finished.filter((x) => x === 0).length} with no mistakes` : "On every phone — short division, a question at a time."}</span>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Floating>
      {!host && s.tryOn && <LearnerTry key={s.tryId} a={s.a} b={s.b} id={s.tryId} />}
    </>
  );
}

// The times-table strip: the multiple a step uses lights up.
function Multiples({ b, lit }: { b: number; lit?: number }) {
  return (
    <div className="flex flex-wrap gap-1" aria-label={`Multiples of ${b}`}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((k) => (
        <span key={k} className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold ring-1 ${k === lit ? "bg-amber-300 text-amber-950 ring-amber-500" : "bg-slate-50 text-ink/60 ring-slate-200"}`}>{k}×{b}={k * b}</span>
      ))}
    </div>
  );
}

// ── The drawings ──
function Picture({ s, d, vis }: { s: DivState; d: Breakdown; vis: number }) {
  if (d.share) return <ShareSvg b={s.b} at={d.share[Math.min(vis, d.share.length - 1)]} />;
  if (d.jumps) return <JumpsSvg a={s.a} b={s.b} n={d.jumps[Math.min(vis, d.jumps.length - 1)]} />;
  if (d.chunks) return <ChunkTable a={s.a} b={s.b} chunks={d.chunks.slice(0, d.chunkAt![Math.min(vis, d.chunkAt!.length - 1)])} all={d.chunkAt![Math.min(vis, d.chunkAt!.length - 1)] === d.chunks.length && vis >= d.steps.length - 2} />;
  if (d.short) return <BusStop b={s.b} sh={d.short} n={d.short.at[Math.min(vis, d.short.at.length - 1)]} />;
  if (d.long) return <LongSvg d={d} vis={vis} />;
  return null;
}

function ShareSvg({ b, at }: { b: number; at: { groups: number[]; left: number } }) {
  const per = Math.max(...at.groups, 1), cols = Math.min(b, 5), rows = Math.ceil(b / cols), R = 46, W = cols * (2 * R + 14) + 10, top = 44, H = top + rows * (2 * R + 14);
  const dot = (cx: number, cy: number, i: number, n: number, c: string) => { const ring = Math.ceil(Math.sqrt(n)), k = Math.max(3, ring), gx = i % k, gy = Math.floor(i / k), sp = (2 * R - 20) / k; return <circle key={i} cx={cx - R + 10 + sp * (gx + 0.5)} cy={cy - R + 10 + sp * (gy + 0.5)} r={Math.min(7, sp * 0.38)} fill={c} />; };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: Math.min(W, 520), maxWidth: "100%" }} role="img" aria-label={`${b} groups with ${at.groups[0]} each; ${at.left} left to share`}>
      <text x={8} y={20} fontSize={14} fontWeight={800} fill="#0B1220">Left to share: {at.left}</text>
      {Array.from({ length: Math.min(at.left, 40) }, (_, i) => <circle key={i} cx={150 + (i % 20) * 13} cy={14 + Math.floor(i / 20) * 13} r={5} fill="#94A3B8" />)}
      {at.groups.map((n, g) => {
        const cx = 5 + (g % cols) * (2 * R + 14) + R + 2, cy = top + Math.floor(g / cols) * (2 * R + 14) + R, c = GROUP_COLOURS[g % GROUP_COLOURS.length];
        return (
          <g key={g}>
            <circle cx={cx} cy={cy} r={R} fill="#fff" stroke={c} strokeWidth={3} />
            {Array.from({ length: n }, (_, i) => dot(cx, cy, i, per, c))}
            <text x={cx} y={cy + R + 12} textAnchor="middle" fontSize={11} fontWeight={800} fill={c}>{n}</text>
          </g>
        );
      })}
    </svg>
  );
}

function JumpsSvg({ a, b, n }: { a: number; b: number; n: number }) {
  const W = 560, L = 20, Rr = W - 20, y = 110, X = (v: number) => L + (v / a) * (Rr - L), tickEvery = a <= 30 ? 1 : a <= 60 ? 2 : a <= 150 ? 5 : 10;
  const left = a - n * b;
  return (
    <svg viewBox={`0 0 ${W} 150`} style={{ width: "100%", maxWidth: W }} role="img" aria-label={`${n} jumps of ${b} back from ${a}, landing on ${left}`}>
      <line x1={L} x2={Rr} y1={y} y2={y} stroke="#0B1220" strokeWidth={2} />
      {Array.from({ length: Math.floor(a / tickEvery) + 1 }, (_, i) => i * tickEvery).map((v) => (
        <g key={v}><line x1={X(v)} x2={X(v)} y1={y - 5} y2={y + 5} stroke="#64748B" /><text x={X(v)} y={y + 20} textAnchor="middle" fontSize={10} fill="#475569">{v}</text></g>
      ))}
      <text x={X(a)} y={y + 34} textAnchor="middle" fontSize={12} fontWeight={800} fill="#0B1220">{a}</text>
      {Array.from({ length: n }, (_, k) => {
        const from = a - k * b, to = from - b, mx = (X(from) + X(to)) / 2, h = Math.min(70, 18 + (X(from) - X(to)) * 0.5);
        return <g key={k}><path d={`M${X(from)},${y} Q${mx},${y - h} ${X(to)},${y}`} fill="none" stroke="#0E6E72" strokeWidth={2.4} markerEnd="url(#dv-arrow)" /><text x={mx} y={y - h / 2 - 6} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0E6E72">{k + 1}</text></g>;
      })}
      {n > 0 && left > 0 && left < b && <rect x={X(0)} y={y - 6} width={X(left) - X(0)} height={12} rx={4} fill="#F59E0B" fillOpacity={0.5}><title>{`${left} left over`}</title></rect>}
      <defs><marker id="dv-arrow" markerWidth={8} markerHeight={8} refX={6} refY={4} orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#0E6E72" /></marker></defs>
      <text x={L} y={22} fontSize={13} fontWeight={800} fill="#0B1220">{n} jump{n === 1 ? "" : "s"} of {b}{n ? ` · landed on ${left}` : ""}</text>
    </svg>
  );
}

function ChunkTable({ a, b, chunks, all }: { a: number; b: number; chunks: { from: number; m: number; to: number }[]; all: boolean }) {
  return (
    <table className="font-mono text-sm" aria-label="Chunks taken away">
      <tbody>
        <tr><td className="px-2 py-1 text-right text-lg font-black">{a}</td><td /></tr>
        {chunks.map((c, i) => (
          <tr key={i} className="align-top">
            <td className="px-2 py-1 text-right"><span className="text-ink/60">− {c.m * b}</span><span className="block border-t-2 border-ink font-black">{c.to}</span></td>
            <td className="px-2 py-1 text-xs font-bold text-[#0E6E72]">({c.m} × {b})</td>
          </tr>
        ))}
        {all && chunks.length > 0 && <tr><td className="px-2 pt-2 text-right text-xs font-black text-emerald-800" colSpan={2}>{chunks.map((c) => c.m).join(" + ")} = {chunks.reduce((s, c) => s + c.m, 0)} lots of {b}</td></tr>}
      </tbody>
    </table>
  );
}

function BusStop({ b, sh, n }: { b: number; sh: NonNullable<Breakdown["short"]>; n: number }) {
  const CW = 34, bw = String(b).length * 20 + 18, cols = sh.digits.length, dotW = sh.dot != null ? 10 : 0, W = bw + cols * CW + dotW + 16, H = 118;
  const x = (i: number) => bw + 10 + i * CW + (sh.dot != null && i >= sh.dot ? dotW : 0);
  const shownDigits = sh.dot != null && n <= sh.dot ? sh.dot : Math.max(n, sh.dot ?? cols);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: Math.min(W * 1.3, 520), maxWidth: "100%", fontFamily: MONO }} role="img" aria-label={`Short division: ${sh.q.slice(0, n).join("")} so far`}>
      {/* the bus stop */}
      <text x={bw - 10} y={92} textAnchor="end" fontSize={28} fontWeight={700} fill="#0B1220">{b}</text>
      <path d={`M${bw},100 L${bw + 6},52 L${W - 6},52`} fill="none" stroke="#0B1220" strokeWidth={2.6} />
      {sh.digits.slice(0, shownDigits).map((dg, i) => (
        <g key={i}>
          {sh.carry[i] != null && i <= n && i > 0 && <text x={x(i) + 3} y={74} fontSize={14} fontWeight={800} fill="#C2410C">{sh.carry[i]}</text>}
          <text x={x(i) + CW / 2 + 4} y={92} textAnchor="middle" fontSize={28} fontWeight={700} fill={i >= cols - (sh.dot != null ? cols - sh.dot : 0) && sh.dot != null ? "#64748B" : "#0B1220"}>{dg}</text>
        </g>
      ))}
      {sh.q.slice(0, n).map((qd, i) => <text key={i} x={x(i) + CW / 2 + 4} y={42} textAnchor="middle" fontSize={28} fontWeight={800} fill="#0A4F52">{qd}</text>)}
      {sh.dot != null && n >= sh.dot && (<><circle cx={x(sh.dot) - 2} cy={90} r={3} fill="#0B1220" /><circle cx={x(sh.dot) - 2} cy={40} r={3} fill="#0A4F52" /></>)}
    </svg>
  );
}

function LongSvg({ d, vis }: { d: Breakdown; vis: number }) {
  const w = d.long!, step = Math.min(vis, w.steps.length - 1), CW = 30, CH = 38, W = w.cols * CW + 12, H = w.rows * CH + 14;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: Math.min(W * 1.15, 420), maxWidth: "100%", fontFamily: MONO }} role="img" aria-label={`Long division, step ${step + 1}`}>
      {w.cells.filter((c) => cellShown(c, step)).map((c, i) => {
        const x = 6 + c.c * CW, y = 6 + c.r * CH, fresh = c.from === step && step > 0;
        return (
          <g key={`${c.r}-${c.c}-${c.from}-${i}`}>
            {fresh && <rect x={x + 1} y={y + 1} width={CW - 2} height={CH - 2} rx={5} fill="#FEF08A" />}
            <text x={x + CW / 2} y={y + CH / 2 + 9} textAnchor="middle" fontSize={24} fontWeight={700} fill={c.kind === "answer" ? "#0A4F52" : c.kind === "sign" ? "#64748B" : "#0B1220"}>{c.t}</text>
          </g>
        );
      })}
      {w.rules.filter((r) => r.from <= step).map((r, i) => <line key={i} x1={6 + r.c0 * CW + 2} x2={6 + (r.c1 + 1) * CW - 2} y1={6 + r.r * CH + CH} y2={6 + r.r * CH + CH} stroke="#0B1220" strokeWidth={2.4} />)}
    </svg>
  );
}

// ── On a learner's phone: their turn, short division a question at a time ──
function LearnerTry({ a: a0, b: b0, id }: { a: number; b: number; id: number }) {
  const send = useLive();
  const [nums, setNums] = useState<[number, number]>([a0, b0]);
  const [a, b] = nums, own = a !== a0 || b !== b0;
  const plan = useMemo(() => tryPlan(a, b), [a, b]);
  const [at, setAt] = useState(0), [text, setText] = useState(""), [wrong, setWrong] = useState(0), [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState<string | null>(null), [open, setOpen] = useState(true), [reported, setReported] = useState(false);
  const [me] = useState(() => { try { const k = "dm-div-me"; const v = localStorage.getItem(k) || Math.random().toString(36).slice(2, 10); localStorage.setItem(k, v); return v; } catch { return Math.random().toString(36).slice(2, 10); } });
  const done = at >= plan.length, p = plan[at];
  const q = plan.filter((x, i) => x.kind === "goes" && i < at).map((x) => String(x.answer));
  const carries = plan.map((x, i) => (x.kind === "left" && i < at ? x.answer : null)).filter((_, i) => i % 2 === 1);
  useEffect(() => { if (done && !own && !reported) { send("div-done", { id, by: me, mistakes }); setReported(true); } }, [done, own, reported, send, id, me, mistakes]);
  function check() {
    const v = Number(text.trim());
    if (text.trim() === "" || !Number.isFinite(v)) return;
    if (v === p.answer) { setAt(at + 1); setText(""); setWrong(0); setMsg(`✓ ${p.answer}`); }
    else { setWrong(wrong + 1); setMistakes(mistakes + 1); setMsg(wrong >= 1 ? `Not quite. ${p.hint}` : "Not quite — try again."); }
  }
  function another() { const [x, y] = randomDiv("short"); setNums([x, y]); setAt(0); setText(""); setWrong(0); setMistakes(0); setMsg(null); }
  if (!open) return createPortal(<button type="button" onClick={() => setOpen(true)} className="fixed bottom-4 left-1/2 z-[140] -translate-x-1/2 rounded-full bg-[#0E6E72] px-4 py-3 text-sm font-black text-white shadow-2xl">➗ Your turn: {a} ÷ {b}</button>, document.body);
  const digits = String(a).split("");
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Your turn: ${a} ÷ ${b}`} className="fixed inset-0 z-[140] flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 text-ink shadow-2xl">
        <div className="flex items-center gap-2">
          <p className="flex-1 text-base font-black">➗ Your turn: {a} ÷ {b}</p>
          <button type="button" onClick={() => setOpen(false)} className="min-h-[36px] rounded-lg bg-slate-100 px-3 text-xs font-black">Back to the board</button>
        </div>
        <div className="mt-3 flex justify-center rounded-xl bg-slate-50 py-3" aria-label="Your working">
          <div className="font-mono text-3xl font-black">
            <div className="flex pl-12 text-[#0A4F52]">{digits.map((_, i) => <span key={i} className="w-9 text-center">{q[i] ?? " "}</span>)}</div>
            <div className="flex items-end">
              <span className="w-12 pr-2 text-right">{b}</span>
              <div className="flex border-l-[3px] border-t-[3px] border-ink">
                {digits.map((dg, i) => <span key={i} className="relative w-9 text-center">{i > 0 && carries[i - 1] ? <sup className="absolute left-0 top-0 text-sm text-orange-700">{carries[i - 1]}</sup> : null}{dg}</span>)}
              </div>
            </div>
          </div>
        </div>
        {done ? (
          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-center">
            <p className="text-lg font-black text-emerald-900">✓ {a} ÷ {b} = {answerText(a, b, "r")}</p>
            <p className="text-sm font-bold text-emerald-800">Check: {checkText(a, b)} ✓</p>
            <p className="mt-1 text-xs font-bold text-ink/60">{mistakes ? `${mistakes} mistake${mistakes === 1 ? "" : "s"} on the way — well worked out.` : "No mistakes — brilliant!"}{!own ? " Your teacher can see you've finished." : ""}</p>
            <button type="button" onClick={another} className="mt-2 min-h-[44px] rounded-xl bg-[#0E6E72] px-4 text-sm font-black text-white">Try another one</button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); check(); }} className="mt-3">
            <p className="text-sm font-black text-[#0A4F52]">Question {at + 1} of {plan.length}</p>
            <p className="text-lg font-black">{p.ask}</p>
            <div className="mt-2 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" autoComplete="off" aria-label="Your answer"
                className="h-12 min-w-0 flex-1 rounded-xl bg-white px-3 text-xl font-black ring-2 ring-slate-300 focus:outline-none focus:ring-[#0E6E72]" />
              <button type="submit" className="min-h-[48px] rounded-xl bg-[#0E6E72] px-5 text-sm font-black text-white">Check</button>
            </div>
            {msg && <p role="status" className={`mt-2 text-sm font-bold ${msg.startsWith("✓") ? "text-emerald-700" : "text-amber-800"}`}>{msg}</p>}
            <Multiples b={b} />
          </form>
        )}
      </div>
    </div>, document.body);
}
