"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Floating } from "@/components/live/board/MathPanels";
import { Step } from "@/components/live/board/LessonTools";
import {
  AH, ANGLE_KINDS, ANGLE_NAMES, AW, BAR_MODES, BAR_NAMES, CHANCE_KINDS, COL_LIMITS, COL_NAMES, COL_OPS, COL_SIGNS, F_OPS, IN_MAX, IN_MIN, MAX_SLICES, PAIRS, PAIR_AT, PAIR_NAMES, SPIN_COLOURS, TABLE_MAX, T_MAX,
  T_MIN, barModel, cellShown, cleanChance, fitSum, fraction, inverseSteps, lineAngles, moveCorner, outcomes, pairFact, parallelAngles, randomSum, resetChance, restAngle, ruleFormula, ruleWords, runMachine,
  spin, stepText, tidy, triAngles, triType, trials, working,
  type AngleState, type BarState, type ChanceState, type ColOp, type ColumnState, type FHide, type FOp, type FStep, type MachineState, type Pt,
} from "@/lib/mathsMore";

// Five more maths tools that float over the board (lib/mathsMore.ts): column
// methods, the bar model, the function machine, probability and angle facts.
// The teacher works them; learners see every change live.

type P<T> = { s: T; host: boolean; boxW: number; onChange: (s: T, final?: boolean) => void };
const chip = "min-h-[32px] rounded-lg bg-slate-100 px-2.5 text-xs font-black text-ink hover:bg-slate-200 disabled:opacity-40";
const chipOn = "min-h-[32px] rounded-lg bg-[#0E6E72] px-2.5 text-xs font-black text-white";
const primary = "min-h-[32px] rounded-lg bg-[#0E6E72] px-3 text-xs font-black text-white hover:bg-[#0A4F52] disabled:opacity-40";
const field = "min-h-[32px] rounded-lg bg-slate-50 px-2 text-xs font-bold text-ink ring-1 ring-slate-200";
const small = "text-[11px] font-black text-ink/60";
const FONT = "Poppins, system-ui, sans-serif", MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

// A number box that only passes on whole numbers in range.
function Num({ label, value, min, max, onChange, step = 1 }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; step?: number }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <label className={`flex items-center gap-1.5 ${small}`}>{label}
      <input type="number" inputMode="decimal" value={text} min={min} max={max} step={step} aria-label={label} className={`${field} w-20 font-mono`}
        onChange={(e) => { setText(e.target.value); const v = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(v) && v >= min && v <= max) onChange(v); }}
        onBlur={() => setText(String(value))} />
    </label>
  );
}

// ── Column methods ───────────────────────────────────────────────────────
const CW = 34, CH = 42, SH = 22;
export function ColumnPanel({ s, host, boxW, onChange }: P<ColumnState>) {
  const width = Math.max(340, Math.min(680, boxW * 0.7));
  const w = useMemo(() => working(s), [s.op, s.a, s.b]); // eslint-disable-line react-hooks/exhaustive-deps
  const last = w.steps.length - 1, step = Math.min(s.step, last);
  const set = (c: Partial<ColumnState>) => onChange({ ...s, ...c }, true);
  const sum = (op: ColOp, a: number, b: number) => { const [x, y] = fitSum(op, a, b); set({ op, a: x, b: y, step: 0 }); };
  const rowH = (r: number) => (w.small.includes(r) ? SH : CH), rowY = (r: number) => { let y = 6; for (let i = 0; i < r; i++) y += rowH(i); return y; };
  const W = w.cols * CW + 12, H = rowY(w.rows) + 8, lim = COL_LIMITS[s.op];
  return (
    <Floating p={s} host={host} title="Column methods" icon="column" width={width} onChange={onChange}>
      <div className="flex flex-wrap items-start gap-2.5 p-2.5">
        <div className="flex min-w-0 flex-[2_1_220px] justify-center rounded-xl bg-white p-2 ring-1 ring-slate-200">
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: Math.min(W * 1.15, 420), maxWidth: "100%", fontFamily: MONO }} role="img" aria-label={`${COL_NAMES[s.op]}: ${s.a} ${COL_SIGNS[s.op]} ${s.b}. Step ${step + 1} of ${w.steps.length}.`}>
            {w.cells.filter((c) => cellShown(c, step)).map((c, i) => {
              const x = 6 + c.c * CW, y = rowY(c.r), h = rowH(c.r), fresh = c.from === step && step > 0, carry = c.kind === "carry", struck = c.strike !== undefined && c.strike <= step;
              return (
                <g key={`${c.r}-${c.c}-${c.from}-${i}`}>
                  {fresh && <rect x={x + 1} y={y + 1} width={CW - 2} height={h - 2} rx={5} fill="#FEF08A" />}
                  <text x={x + CW / 2} y={y + h / 2 + (carry ? 5 : 9)} textAnchor="middle" fontSize={carry ? (c.t.length > 1 ? 13 : 15) : 26} fontWeight={700}
                    fill={carry ? "#C2410C" : c.kind === "answer" ? "#0A4F52" : c.kind === "sign" ? "#64748B" : struck ? "#94A3B8" : "#0B1220"}>{c.t}</text>
                  {struck && <line x1={x + 7} y1={y + h - 9} x2={x + CW - 7} y2={y + 9} stroke="#C2410C" strokeWidth={2} />}
                </g>
              );
            })}
            {w.rules.filter((r) => r.from <= step).map((r, i) => <line key={i} x1={6 + r.c0 * CW + 2} x2={6 + (r.c1 + 1) * CW - 2} y1={rowY(r.r) + rowH(r.r)} y2={rowY(r.r) + rowH(r.r)} stroke="#0B1220" strokeWidth={2.4} />)}
          </svg>
        </div>

        <div className="grid min-w-0 flex-[1_1_230px] gap-2">
          <div className="rounded-xl bg-slate-50 p-2.5" aria-live="polite" aria-label="Step">
            <p className="text-[11px] font-black uppercase tracking-wide text-ink/45">Step {step + 1} of {w.steps.length}</p>
            <p className="mt-0.5 text-sm font-bold leading-snug">{w.steps[step]}</p>
          </div>
          {host && (
            <>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Steps">
                <button type="button" className={chip} disabled={step <= 0} onClick={() => set({ step: step - 1 })}>◀ Back</button>
                <button type="button" className={primary} disabled={step >= last} onClick={() => set({ step: step + 1 })}>Next step ▶</button>
                <button type="button" className={chip} disabled={step >= last} onClick={() => set({ step: last })}>Show it all</button>
                <button type="button" className={chip} disabled={step <= 0} onClick={() => set({ step: 0 })}>Start again</button>
              </div>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Method">
                {COL_OPS.map((op) => <button key={op} type="button" aria-pressed={s.op === op} aria-label={COL_NAMES[op]} title={COL_NAMES[op]} className={`${s.op === op ? chipOn : chip} w-10 px-0`} style={{ fontSize: 18 }} onClick={() => { const [a, b] = randomSum(op); sum(op, a, b); }}>{COL_SIGNS[op]}</button>)}
                <button type="button" className={chip} onClick={() => { const [a, b] = randomSum(s.op); sum(s.op, a, b); }}>New numbers</button>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <Num label="First number" value={s.a} min={lim[0]} max={lim[1]} onChange={(a) => sum(s.op, a, s.b)} />
                <Num label={s.op === "div" ? "Divide by" : s.op === "mul" ? "Times" : "Second number"} value={s.b} min={lim[2]} max={lim[3]} onChange={(b) => sum(s.op, s.a, b)} />
              </div>
            </>
          )}
        </div>
      </div>
    </Floating>
  );
}

// ── Bar model ────────────────────────────────────────────────────────────
const BAR_COLOURS = ["#93C5FD", "#FCA5A5", "#86EFAC"];
export function BarPanel({ s, host, boxW, onChange }: P<BarState>) {
  const width = Math.max(350, Math.min(800, boxW * 0.84));
  const m = barModel(s), set = (b: Partial<BarState>) => onChange({ ...s, ...b, reveal: b.reveal ?? 0 }, true);
  const most = Math.max(...m.bars.map((b) => b.boxes)), bw = 400 / most, rowH = 44, gap = 16, top = s.mode === "ratio" ? 8 : 26, H = top + m.bars.length * (rowH + gap) + (s.mode === "percent" ? 14 : 0);
  const unitText = s.reveal >= 1 ? tidy(m.unit) : "?", whole = m.bars[0].total, part = m.bars[0].shaded * m.unit;
  const knownOptions: [string, string][] = s.mode === "ratio"
    ? [["total", "The total"], ...s.parts.map((_, i) => [`p${i}`, `${s.names[i]}'s share`] as [string, string]), ...(s.parts[0] !== s.parts[1] ? [["diff", "How much more one gets"] as [string, string]] : [])]
    : [["whole", "The whole amount"], ["part", s.mode === "fraction" ? "The shaded part" : "The percentage's value"]];
  return (
    <Floating p={s} host={host} title="Bar model" icon="barmodel" width={width} onChange={onChange}>
      <div className="flex flex-wrap items-start gap-2.5 p-2.5">
        <div className="min-w-0 flex-[3_1_320px]">
          <p className="mb-1.5 text-sm font-black leading-snug" aria-label="Question">{m.question}</p>
          <svg viewBox={`0 0 560 ${H}`} className="block w-full rounded-xl bg-white ring-1 ring-slate-200" role="img" style={{ fontFamily: FONT }}
            aria-label={`Bar model: ${m.bars.map((b) => `${b.name}, ${s.mode === "percent" ? `${s.parts[0]}% shaded` : `${b.boxes} part${b.boxes === 1 ? "" : "s"}${b.shaded < b.boxes ? `, ${b.shaded} shaded` : ""}`}`).join("; ")}. ${m.unitName}: ${unitText}.`}>
            {s.mode !== "ratio" && <text x={74 + 200} y={17} textAnchor="middle" fontSize={12} fontWeight={800} fill="#334155">Whole = {s.known === "whole" || s.reveal === 2 ? tidy(whole) : "?"}</text>}
            {m.bars.map((b, k) => {
              const y = top + k * (rowH + gap), showTotal = s.reveal === 2 || s.known === `p${k}`;
              return (
                <g key={k}>
                  <text x={66} y={y + rowH / 2 + 4} textAnchor="end" fontSize={12.5} fontWeight={800} fill="#0B1220">{s.mode === "ratio" ? b.name : ""}</text>
                  {Array.from({ length: b.boxes }, (_, i) => {
                    const fill = Math.max(0, Math.min(1, b.shaded - i));
                    return (
                      <g key={i}>
                        <rect x={74 + i * bw} y={y} width={bw} height={rowH} fill="#fff" />
                        {fill > 0 && <rect x={74 + i * bw} y={y} width={bw * fill} height={rowH} fill={s.mode === "ratio" ? BAR_COLOURS[k] : "#FDBA74"} />}
                        <rect x={74 + i * bw} y={y} width={bw} height={rowH} fill="none" stroke="#0B1220" strokeWidth={1.6} />
                        <text x={74 + i * bw + bw / 2} y={y + rowH / 2 + 4} textAnchor="middle" fontSize={unitText.length > 4 ? 9.5 : bw < 36 ? 11 : 13} fontWeight={800} fill={s.reveal >= 1 ? "#0B1220" : "#64748B"}>{unitText}</text>
                      </g>
                    );
                  })}
                  {s.mode === "ratio" && <text x={74 + b.boxes * bw + 8} y={y + rowH / 2 + 4} fontSize={13} fontWeight={800} fill={showTotal ? "#0A4F52" : "#94A3B8"}>= {showTotal ? tidy(b.total) : "?"}</text>}
                  {s.mode !== "ratio" && <text x={74 + Math.max(24, (b.shaded * bw) / 2)} y={y + rowH + 15} textAnchor="middle" fontSize={12} fontWeight={800} fill="#C2410C">{s.mode === "percent" ? `${s.parts[0]}%` : `${s.parts[0]}/${s.parts[1]}`} = {s.known === "part" || s.reveal === 2 ? tidy(part) : "?"}</text>}
                </g>
              );
            })}
          </svg>
          {s.reveal > 0 && (
            <ol className="mt-1.5 grid gap-0.5 rounded-lg bg-slate-50 p-2 text-xs font-bold" aria-label="Working" aria-live="polite">
              {m.working.slice(0, s.reveal === 1 ? m.unitLine + 1 : m.working.length).map((line, i) => <li key={i}>{i + 1}. {line}</li>)}
              {s.reveal === 2 && <li className="mt-0.5 text-sm font-black text-emerald-800">Answer: {m.answer}</li>}
            </ol>
          )}
        </div>

        {host && (
          <div className="grid min-w-0 flex-[1_1_220px] gap-2">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Reveal">
              <button type="button" className={s.reveal === 1 ? chipOn : primary} aria-pressed={s.reveal === 1} onClick={() => onChange({ ...s, reveal: 1 }, true)}>Show one part</button>
              <button type="button" className={s.reveal === 2 ? chipOn : chip} aria-pressed={s.reveal === 2} onClick={() => onChange({ ...s, reveal: 2 }, true)}>Show the answer</button>
              {s.reveal > 0 && <button type="button" className={chip} onClick={() => onChange({ ...s, reveal: 0 }, true)}>Cover it again</button>}
            </div>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Kind of problem">
              {BAR_MODES.map((mode) => <button key={mode} type="button" aria-pressed={s.mode === mode} className={s.mode === mode ? chipOn : chip}
                onClick={() => set(mode === "ratio" ? { mode, parts: [2, 3], known: "total", value: 60 } : mode === "fraction" ? { mode, parts: [3, 5], known: "whole", value: 40 } : { mode, parts: [30], known: "whole", value: 250 })}>{BAR_NAMES[mode]}</button>)}
            </div>
            {s.mode === "ratio" && (
              <div className="grid gap-1">
                {s.parts.map((p, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-1">
                    <input value={s.names[i]} maxLength={14} aria-label={`Name ${i + 1}`} className={`${field} w-20`} onChange={(e) => set({ names: s.names.map((n, k) => (k === i ? e.target.value : n)) })} />
                    <Step label={`Parts ${i + 1}`} value={p} min={1} max={12} onChange={(v) => set({ parts: s.parts.map((q, k) => (k === i ? v : q)) })} />
                  </div>
                ))}
                <button type="button" className={chip} onClick={() => set({ parts: s.parts.length === 2 ? [...s.parts, 1] : s.parts.slice(0, 2), known: "total" })}>{s.parts.length === 2 ? "Add a third share" : "Back to two shares"}</button>
              </div>
            )}
            {s.mode === "fraction" && (
              <div className="grid gap-1">
                <Step label="Top" value={s.parts[0]} min={1} max={s.parts[1]} onChange={(v) => set({ parts: [v, s.parts[1]] })} />
                <Step label="Bottom" value={s.parts[1]} min={2} max={12} onChange={(v) => set({ parts: [Math.min(s.parts[0], v), v] })} />
              </div>
            )}
            {s.mode === "percent" && <Num label="Percent" value={s.parts[0]} min={1} max={100} onChange={(v) => set({ parts: [Math.round(v)] })} />}
            <label className={`flex flex-wrap items-center gap-1.5 ${small}`}>We are told
              <select value={s.known} aria-label="We are told" className={`${field} flex-1`} onChange={(e) => set({ known: e.target.value })}>{knownOptions.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
            </label>
            <Num label="It is" value={s.value} min={1} max={100000} onChange={(v) => set({ value: v })} />
          </div>
        )}
      </div>
    </Floating>
  );
}

// ── Function machine ─────────────────────────────────────────────────────
function MachineRow({ y, left, right, boxes, back }: { y: number; left: string; right: string; boxes: string[]; back: boolean }) {
  const n = boxes.length, gapW = (600 - 2 * 86 - n * 110 - 24) / (n + 1), xs = boxes.map((_, i) => 12 + 86 + gapW + i * (110 + gapW));
  const arrow = (x1: number, x2: number, k: number) => <line key={k} x1={(back ? x2 : x1) + (back ? -4 : 4)} y1={y + 36} x2={(back ? x1 : x2) + (back ? 4 : -4)} y2={y + 36} stroke="#334155" strokeWidth={3} markerEnd="url(#fm-arrow)" />;
  const end = (x: number, label: string, text: string, fill: string) => (
    <g><rect x={x} y={y + 6} width={86} height={60} rx={12} fill={fill} stroke="#0B1220" strokeWidth={2} /><text x={x + 43} y={y + 44} textAnchor="middle" fontSize={text.length > 4 ? 17 : 24} fontWeight={800} fill="#0B1220">{text}</text><text x={x + 43} y={y - 1} textAnchor="middle" fontSize={11} fontWeight={800} fill="#475569">{label}</text></g>
  );
  return (
    <g>
      {end(12, back ? "Output" : "Input", left, back ? "#FED7AA" : "#BFDBFE")}
      {boxes.map((t, i) => (
        <g key={i}>
          {arrow(i === 0 ? 98 : xs[i - 1] + 110, xs[i], i)}
          <path d={`M${xs[i]},${y} h110 l-8,72 h-94 Z`} fill="#0E6E72" stroke="#0A4F52" strokeWidth={2} strokeLinejoin="round" />
          <text x={xs[i] + 55} y={y + 46} textAnchor="middle" fontSize={26} fontWeight={800} fill="#fff">{t}</text>
        </g>
      ))}
      {arrow(xs[n - 1] + 110, 600 - 12 - 86, 99)}
      {end(600 - 12 - 86, back ? "Input" : "Output", right, back ? "#BFDBFE" : "#FED7AA")}
    </g>
  );
}
const HIDE_NAMES: Record<FHide, string> = { none: "Show everything", input: "Hide the input", rule: "Hide the rule", output: "Hide the output" };
export function MachinePanel({ s, host, boxW, onChange }: P<MachineState>) {
  const width = Math.max(350, Math.min(800, boxW * 0.84));
  const set = (m: Partial<MachineState>) => onChange({ ...s, reveal: false, ...m }, true);
  const out = runMachine(s.steps, s.input), hid = (x: FHide) => s.hide === x && !s.reveal, inv = inverseSteps(s.steps);
  const inText = hid("input") ? "?" : tidy(s.input), outText = hid("output") ? "?" : tidy(out), rule = (st: FStep) => (hid("rule") ? "?" : stepText(st));
  const setStep = (i: number, st: Partial<FStep>) => set({ steps: s.steps.map((x, k) => (k === i ? { ...x, ...st, n: Math.min(st.op === "×" || st.op === "÷" || (!st.op && (x.op === "×" || x.op === "÷")) ? 12 : 20, st.n ?? x.n) } : x)) });
  return (
    <Floating p={s} host={host} title="Function machine" icon="machine" width={width} onChange={onChange}>
      <div className="flex flex-wrap items-start gap-2.5 p-2.5">
        <div className="min-w-0 flex-[3_1_320px]">
          <svg viewBox={`0 0 600 ${s.back ? 216 : 104}`} className="block w-full rounded-xl bg-white ring-1 ring-slate-200" role="img" style={{ fontFamily: FONT }}
            aria-label={`Function machine: input ${inText}, rule ${hid("rule") ? "hidden" : ruleWords(s.steps)}, output ${outText}`}>
            <defs><marker id="fm-arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={5} markerHeight={5} orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="#334155" /></marker></defs>
            <MachineRow y={22} left={inText} right={outText} boxes={s.steps.map(rule)} back={false} />
            {s.back && <MachineRow y={134} left={outText} right={inText} boxes={inv.map(rule)} back />}
          </svg>
          <p className="mt-1.5 rounded-lg bg-slate-50 p-2 text-sm font-bold" aria-live="polite" aria-label="Rule">
            {hid("rule") ? "What is the rule? Use the table to work it out." : <>Rule: <b className="font-black">{ruleWords(s.steps)}</b> <span className="ml-1 font-mono text-ink/60">{ruleFormula(s.steps)}</span></>}
            {hid("input") && <> Work backwards: undo each step, last one first.</>}
            {s.back && !hid("rule") && <span className="block text-xs text-ink/65">Going back: {ruleWords(inv)}</span>}
          </p>
          {s.table.length > 0 && (
            <table className="mt-1.5 w-full text-center text-sm" aria-label="Table of values">
              <tbody>
                <tr><th scope="row" className="w-16 rounded-l-lg bg-[#BFDBFE] px-2 py-1 text-left text-xs font-black">In</th>{s.table.map((x) => <td key={x} className="border-b border-slate-200 font-mono font-bold">{tidy(x)}</td>)}</tr>
                <tr><th scope="row" className="rounded-l-lg bg-[#FED7AA] px-2 py-1 text-left text-xs font-black">Out</th>{s.table.map((x) => <td key={x} className="font-mono font-bold">{tidy(runMachine(s.steps, x))}</td>)}</tr>
              </tbody>
            </table>
          )}
        </div>

        {host && (
          <div className="grid min-w-0 flex-[1_1_230px] gap-2">
            <Step label="Input" value={s.input} min={IN_MIN} max={IN_MAX} onChange={(input) => set({ input })} />
            {s.steps.map((st, i) => (
              <div key={i} className="flex flex-wrap items-center gap-1" role="group" aria-label={`Step ${i + 1} of the rule`}>
                <select value={st.op} aria-label={`Step ${i + 1}: operation`} className={`${field} w-12 text-base`} onChange={(e) => setStep(i, { op: e.target.value as FOp })}>{F_OPS.map((op) => <option key={op} value={op}>{op}</option>)}</select>
                <Step label={`Step ${i + 1}`} value={st.n} min={1} max={st.op === "×" || st.op === "÷" ? 12 : 20} onChange={(n) => setStep(i, { n })} />
              </div>
            ))}
            <button type="button" className={chip} onClick={() => set({ steps: s.steps.length === 1 ? [...s.steps, { op: "+", n: 1 }] : s.steps.slice(0, 1) })}>{s.steps.length === 1 ? "Add a second step" : "Use one step only"}</button>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Hide">
              {(["none", "input", "rule", "output"] as FHide[]).map((h) => <button key={h} type="button" aria-pressed={s.hide === h} className={s.hide === h ? chipOn : chip} onClick={() => set({ hide: h })}>{HIDE_NAMES[h]}</button>)}
              {s.hide !== "none" && !s.reveal && <button type="button" className={primary} onClick={() => onChange({ ...s, reveal: true }, true)}>Reveal</button>}
            </div>
            <div className="flex flex-wrap gap-1">
              <button type="button" className={chip} disabled={s.table.includes(s.input) || s.table.length >= TABLE_MAX} onClick={() => onChange({ ...s, table: [...s.table, s.input] }, true)}>Add to the table</button>
              {s.table.length > 0 && <button type="button" className={chip} onClick={() => onChange({ ...s, table: [] }, true)}>Clear the table</button>}
              <button type="button" aria-pressed={s.back} className={s.back ? chipOn : chip} onClick={() => onChange({ ...s, back: !s.back }, true)}>Inverse machine</button>
            </div>
          </div>
        )}
      </div>
    </Floating>
  );
}

// ── Probability ──────────────────────────────────────────────────────────
const PIPS: Record<number, [number, number][]> = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
const CHANCE_NAMES = { coin: "Coin", dice: "Dice", spinner: "Spinner" };
export function ChancePanel({ s, host, boxW, onChange }: P<ChanceState>) {
  const width = Math.max(340, Math.min(720, boxW * 0.76));
  const out = outcomes(s), n = trials(s), last = s.last >= 0 ? out[s.last] : null;
  const go = (times: number) => onChange(spin(s, times), true);
  const setSlices = (i: number, v: number) => { const next = cleanChance({ ...s, slices: s.slices.map((x, k) => (k === i ? v : x)) }); if (next.slices[i] === v) onChange(resetChance({ ...s, slices: next.slices }), true); };
  const den = out[0].den, turnTo = s.turn * 1080 + restAngle(s, s.last), most = Math.max(1, ...s.counts);
  let at = 0;
  return (
    <Floating p={s} host={host} title="Probability" icon="chance" width={width} onChange={onChange}>
      <div className="flex flex-wrap items-start gap-2.5 p-2.5">
        <div className="grid min-w-0 flex-[1_1_180px] justify-items-center gap-1.5">
          <svg viewBox="0 0 200 200" className="block w-full max-w-[210px]" role="img" style={{ fontFamily: FONT }} aria-label={`${CHANCE_NAMES[s.kind]}${last ? `: it landed on ${last.name}` : ": not used yet"}`}>
            {s.kind === "spinner" && (
              <>
                {out.flatMap((o) => Array.from({ length: o.num }, () => { const a0 = (at / den) * 2 * Math.PI - Math.PI / 2, a1 = ((at + 1) / den) * 2 * Math.PI - Math.PI / 2; at++; return <path key={at} d={`M100,100 L${100 + 88 * Math.cos(a0)},${100 + 88 * Math.sin(a0)} A88,88 0 0 1 ${100 + 88 * Math.cos(a1)},${100 + 88 * Math.sin(a1)} Z`} fill={o.colour} stroke="#fff" strokeWidth={2} />; }))}
                <circle cx={100} cy={100} r={88} fill="none" stroke="#0B1220" strokeWidth={3} />
                <g style={{ transform: `rotate(${turnTo}deg)`, transformOrigin: "100px 100px", transition: "transform 0.9s cubic-bezier(.2,.8,.2,1)" }} className="chance-spin"><path d="M100,30 L108,100 L100,112 L92,100 Z" fill="#0B1220" stroke="#fff" strokeWidth={1.5} /></g>
                <circle cx={100} cy={100} r={7} fill="#0B1220" stroke="#fff" strokeWidth={2} />
              </>
            )}
            {s.kind === "coin" && <g><circle cx={100} cy={100} r={78} fill={last ? last.colour : "#E2E8F0"} stroke="#0B1220" strokeWidth={4} /><circle cx={100} cy={100} r={64} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="4 5" /><text x={100} y={124} textAnchor="middle" fontSize={68} fontWeight={800} fill="#fff">{last ? last.name[0] : "?"}</text></g>}
            {s.kind === "dice" && <g><rect x={30} y={30} width={140} height={140} rx={24} fill="#fff" stroke="#0B1220" strokeWidth={4} />{last ? PIPS[s.last + 1].map(([dx, dy], i) => <circle key={i} cx={100 + dx * 40} cy={100 + dy * 40} r={13} fill="#0B1220" />) : <text x={100} y={124} textAnchor="middle" fontSize={68} fontWeight={800} fill="#94A3B8">?</text>}</g>}
          </svg>
          <p className="text-center text-sm font-black" aria-live="polite" aria-label="Last result">{last ? `Landed on ${last.name}` : "Not used yet"}</p>
          {host && (
            <div className="flex flex-wrap justify-center gap-1" role="group" aria-label="Have a go">
              {[1, 10, 100, 1000].map((t) => <button key={t} type="button" className={t === 1 ? primary : chip} onClick={() => go(t)}>{t === 1 ? "1 go" : `${t} goes`}</button>)}
            </div>
          )}
        </div>

        <div className="grid min-w-0 flex-[2_1_260px] gap-2">
          <table className="w-full text-xs" aria-label="Results">
            <thead><tr className="text-left text-[10px] font-bold uppercase tracking-wide text-ink/45"><th className="font-bold">Result</th><th className="font-bold">Tally</th><th className="font-bold">So far</th><th className="font-bold">Chance</th></tr></thead>
            <tbody>
              {out.map((o, i) => {
                const c = s.counts[i] ?? 0, f = n ? c / n : 0, p = o.num / o.den;
                return (
                  <tr key={o.name} className="border-t border-slate-100">
                    <th scope="row" className="py-1 text-left text-sm font-black"><span aria-hidden className="mr-1.5 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: o.colour }} />{o.name}</th>
                    <td className="w-[38%]"><span className="flex items-center gap-1.5"><b className="w-10 text-right font-mono text-sm">{c}</b><span aria-hidden className="relative h-3 flex-1 rounded-full bg-slate-100"><span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(c / most) * 100}%`, background: o.colour }} /></span></span></td>
                    <td className="font-mono font-bold">{n ? f.toFixed(2) : "—"}</td>
                    <td className="font-mono font-bold">{fraction(o.num, o.den)} = {p.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="rounded-lg bg-slate-50 p-2 text-xs font-bold" aria-live="polite" aria-label="Goes">{n ? `${n} go${n === 1 ? "" : "es"} so far. “So far” is the tally divided by the number of goes. The more goes, the closer it gets to the chance.` : "No goes yet. What do you expect to happen?"}</p>
          {host && (
            <>
              <div className="flex flex-wrap gap-1" role="group" aria-label="What to use">
                {CHANCE_KINDS.map((k) => <button key={k} type="button" aria-pressed={s.kind === k} className={s.kind === k ? chipOn : chip} onClick={() => onChange(resetChance({ ...s, kind: k }), true)}>{CHANCE_NAMES[k]}</button>)}
                <button type="button" className={chip} disabled={!n} onClick={() => onChange(resetChance(s), true)}>Start again</button>
              </div>
              {s.kind === "spinner" && (
                <div className="grid gap-1 sm:grid-cols-2" role="group" aria-label="Slices of each colour">
                  {SPIN_COLOURS.map((c, i) => <Step key={c.name} label={c.name} value={s.slices[i]} min={0} max={MAX_SLICES} onChange={(v) => setSlices(i, v)} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Floating>
  );
}

// ── Angle facts ──────────────────────────────────────────────────────────
const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (c: Pt, r: number, deg: number): Pt => [c[0] + r * Math.cos(rad(deg)), c[1] - r * Math.sin(rad(deg))]; // degrees anticlockwise from "east"
// A filled wedge from one direction round (anticlockwise) to another.
const wedge = (c: Pt, r: number, from: number, to: number) => { const a = polar(c, r, from), b = polar(c, r, to); return `M${c[0]},${c[1]} L${a[0]},${a[1]} A${r},${r} 0 ${to - from > 180 ? 1 : 0} 0 ${b[0]},${b[1]} Z`; };
const dirOf = (from: Pt, to: Pt) => (Math.atan2(-(to[1] - from[1]), to[0] - from[0]) * 180) / Math.PI;
const TRI_PRESETS: [string, [Pt, Pt, Pt]][] = [["Equilateral", [[100, 235], [300, 235], [200, 62]]], ["Right-angled", [[90, 235], [320, 235], [90, 70]]], ["Isosceles", [[120, 240], [280, 240], [200, 50]]], ["Scalene", [[60, 235], [340, 235], [130, 90]]]];
export function AnglesPanel({ s, host, boxW, onChange }: P<AngleState>) {
  const width = Math.max(340, Math.min(720, boxW * 0.76));
  const svg = useRef<SVGSVGElement>(null), live = useRef(s);
  live.current = s;
  const set = (a: Partial<AngleState>) => onChange({ ...live.current, ...a }, true);
  const secret = (i: number) => s.hide === i && !s.reveal, show = (i: number, deg: number) => (secret(i) ? "?" : `${deg}°`);
  // Drag a corner of the triangle, or the end of the sloping line.
  function drag(e: React.PointerEvent, what: number | "t") {
    if (!host || !svg.current) return;
    e.preventDefault();
    const box = svg.current.getBoundingClientRect(), at = (ev: PointerEvent): Pt => [((ev.clientX - box.left) / box.width) * AW, ((ev.clientY - box.top) / box.height) * AH];
    const put = (ev: PointerEvent, final: boolean) => {
      const p = at(ev), cur = live.current;
      if (what === "t") { const pivot: Pt = cur.kind === "line" ? [200, 220] : [200, 145]; let t = Math.round(dirOf(pivot, p)); if (t < 0) t += 180; onChange({ ...cur, t: Math.max(T_MIN, Math.min(T_MAX, t)) }, final); }
      else onChange(moveCorner(cur, what, p), final);
    };
    const move = (ev: PointerEvent) => put(ev, false);
    const up = (ev: PointerEvent) => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); put(ev, true); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }
  const grab = { cursor: host ? "grab" : undefined, touchAction: "none" as const };
  const label = (p: Pt, text: string, colour = "#0B1220", size = 13) => <text x={p[0]} y={p[1] + 4.5} textAnchor="middle" fontSize={size} fontWeight={800} fill={colour} stroke="#fff" strokeWidth={3.5} paintOrder="stroke">{text}</text>;
  let picture: React.ReactNode, fact = "", count = 3, name = "";

  if (s.kind === "triangle") {
    const ang = triAngles(s.tri), [A, B, C] = s.tri, cx = (A[0] + B[0] + C[0]) / 3, cy = (A[1] + B[1] + C[1]) / 3;
    const hidden = s.hide >= 0 && !s.reveal ? s.hide : -1, others = [0, 1, 2].filter((i) => i !== hidden);
    const extDir = dirOf(A, B), extTo = polar(B, 70, extDir), bc = dirOf(B, C); // the base carried on past B
    name = `Triangle with angles ${[0, 1, 2].map((i) => show(i, ang[i])).join(", ")}`;
    fact = hidden >= 0 ? `Angles in a triangle add up to 180°. The missing angle is 180° − ${ang[others[0]]}° − ${ang[others[1]]}° = ?`
      : `Angles in a triangle add up to 180°: ${ang[0]}° + ${ang[1]}° + ${ang[2]}° = 180°. ${triType(ang)}.${s.ext ? ` The exterior angle at B is ${180 - ang[1]}°, the same as A + C = ${ang[0]}° + ${ang[2]}°.` : ""}`;
    picture = (
      <>
        {s.ext && <g><line x1={B[0]} y1={B[1]} x2={extTo[0]} y2={extTo[1]} stroke="#7C3AED" strokeWidth={2} strokeDasharray="6 5" /><path d={wedge(B, 26, Math.min(extDir, bc), Math.max(extDir, bc))} fill="#7C3AED" fillOpacity={0.25} stroke="#7C3AED" />{label(polar(B, 44, (extDir + bc) / 2), secret(1) ? "?" : `${180 - ang[1]}°`, "#5B21B6", 12)}</g>}
        {[0, 1, 2].map((i) => {
          const p = s.tri[i], d1 = dirOf(p, s.tri[(i + 1) % 3]), d2 = dirOf(p, s.tri[(i + 2) % 3]);
          let from = Math.min(d1, d2), to = Math.max(d1, d2);
          if (to - from > 180) [from, to] = [to, from + 360];
          return <path key={i} d={ang[i] === 90 ? (() => { const a = polar(p, 16, from), b = polar(p, 16, to), c: Pt = [a[0] + b[0] - p[0], a[1] + b[1] - p[1]]; return `M${a[0]},${a[1]} L${c[0]},${c[1]} L${b[0]},${b[1]}`; })() : wedge(p, 24, from, to)} fill={ang[i] === 90 ? "none" : ["#3B82F6", "#F59E0B", "#22C55E"][i]} fillOpacity={0.3} stroke={["#1D4ED8", "#B45309", "#15803D"][i]} strokeWidth={1.5} />;
        })}
        <polygon points={s.tri.map((p) => p.join(",")).join(" ")} fill="#0E6E72" fillOpacity={0.06} stroke="#0B1220" strokeWidth={2.5} strokeLinejoin="round" />
        {[0, 1, 2].map((i) => {
          const p = s.tri[i], out = Math.hypot(p[0] - cx, p[1] - cy) || 1, ux = (p[0] - cx) / out, uy = (p[1] - cy) / out;
          return (
            <g key={i}>
              {label([p[0] - ux * 44, p[1] - uy * 44], show(i, ang[i]), ["#1D4ED8", "#B45309", "#15803D"][i])}
              {label([p[0] + ux * 16, p[1] + uy * 16], "ABC"[i], "#0B1220", 14)}
              {host && <circle cx={p[0]} cy={p[1]} r={11} fill="#fff" fillOpacity={0.01} stroke="#0E6E72" strokeWidth={2} strokeDasharray="3 3" onPointerDown={(e) => drag(e, i)} style={grab} data-corner={i} />}
            </g>
          );
        })}
      </>
    );
  } else if (s.kind === "parallel") {
    const ang = parallelAngles(s.t), mid: Pt = [200, 145], dx = 55 / Math.tan(rad(s.t)), X: Pt[] = [[200 + dx, 90], [200 - dx, 200]], far = 45;
    const p1 = polar(X[0], far, s.t), p2 = polar(X[1], far, s.t + 180), lit = PAIR_AT[s.pair];
    // Each angle's wedge runs between these directions: upper-left, upper-right, lower-left, lower-right.
    const spans: [number, number][] = [[s.t, 180], [0, s.t], [180, s.t + 180], [s.t + 180, 360]];
    count = 8; fact = pairFact(s.pair, s.t); name = `Two parallel lines crossed by a line at ${s.t}°`;
    picture = (
      <>
        {[90, 200].map((y) => <g key={y}><line x1={24} y1={y} x2={376} y2={y} stroke="#0B1220" strokeWidth={2.5} /><path d={`M342,${y - 6} l8,6 l-8,6 M352,${y - 6} l8,6 l-8,6`} fill="none" stroke="#0B1220" strokeWidth={2} /></g>)}
        {X.flatMap((c, k) => spans.map(([from, to], j) => { const i = k * 4 + j, on = lit.includes(i); return on ? <path key={i} d={wedge(c, 28, from, to)} fill={i === lit[0] ? "#F59E0B" : "#3B82F6"} fillOpacity={0.4} stroke={i === lit[0] ? "#B45309" : "#1D4ED8"} strokeWidth={1.5} /> : null; }))}
        <line x1={p2[0]} y1={p2[1]} x2={p1[0]} y2={p1[1]} stroke="#C2451C" strokeWidth={2.5} />
        {X.flatMap((c, k) => spans.map(([from, to], j) => { const i = k * 4 + j, dim = s.pair !== "none" && !lit.includes(i); return <g key={i} opacity={dim ? 0.3 : 1}>{label(polar(c, ang[i] < 50 ? 50 : 40, (from + to) / 2), show(i, ang[i]), lit[0] === i ? "#B45309" : lit[1] === i ? "#1D4ED8" : "#0B1220", 12)}</g>; }))}
        {host && <circle cx={p1[0]} cy={p1[1]} r={11} fill="#fff" stroke="#C2451C" strokeWidth={2} strokeDasharray="3 3" onPointerDown={(e) => drag(e, "t")} style={grab} data-handle />}
        <circle cx={mid[0]} cy={mid[1]} r={2.5} fill="#C2451C" />
      </>
    );
  } else {
    const O: Pt = [200, 220], ang = lineAngles(s.t), end = polar(O, 170, s.t);
    count = 2; name = `A line meeting a straight line at ${s.t}°`;
    fact = s.hide >= 0 && !s.reveal ? `Angles on a straight line add up to 180°. The missing angle is 180° − ${ang[1 - s.hide]}° = ?` : `Angles on a straight line add up to 180°: ${ang[0]}° + ${ang[1]}° = 180°.`;
    picture = (
      <>
        <path d={wedge(O, 34, s.t, 180)} fill="#3B82F6" fillOpacity={0.3} stroke="#1D4ED8" strokeWidth={1.5} /><path d={wedge(O, 34, 0, s.t)} fill="#F59E0B" fillOpacity={0.3} stroke="#B45309" strokeWidth={1.5} />
        <line x1={24} y1={O[1]} x2={376} y2={O[1]} stroke="#0B1220" strokeWidth={2.5} /><line x1={O[0]} y1={O[1]} x2={end[0]} y2={end[1]} stroke="#C2451C" strokeWidth={2.5} />
        {label(polar(O, 58, (s.t + 180) / 2), show(0, ang[0]), "#1D4ED8", 14)}{label(polar(O, 58, s.t / 2), show(1, ang[1]), "#B45309", 14)}
        {host && <circle cx={end[0]} cy={end[1]} r={11} fill="#fff" stroke="#C2451C" strokeWidth={2} strokeDasharray="3 3" onPointerDown={(e) => drag(e, "t")} style={grab} data-handle />}
      </>
    );
  }
  return (
    <Floating p={s} host={host} title="Angle facts" icon="angles" width={width} onChange={onChange}>
      <div className="flex flex-wrap items-start gap-2.5 p-2.5">
        <div className="min-w-0 flex-[3_1_300px]">
          <svg ref={svg} viewBox={`0 0 ${AW} ${AH}`} className="block w-full rounded-xl bg-white ring-1 ring-slate-200" role="img" aria-label={name} style={{ fontFamily: FONT }}>{picture}</svg>
          <p className="mt-1.5 rounded-lg bg-slate-50 p-2 text-sm font-bold leading-snug" aria-live="polite" aria-label="Fact">{fact}</p>
        </div>
        {host && (
          <div className="grid min-w-0 flex-[1_1_210px] gap-2">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Picture">
              {ANGLE_KINDS.map((k) => <button key={k} type="button" aria-pressed={s.kind === k} className={s.kind === k ? chipOn : chip} onClick={() => set({ kind: k, hide: -1, reveal: false, pair: "none" })}>{ANGLE_NAMES[k]}</button>)}
            </div>
            {s.kind === "triangle" && (
              <div className="flex flex-wrap gap-1" role="group" aria-label="Triangles">
                {TRI_PRESETS.map(([n, tri]) => <button key={n} type="button" className={chip} onClick={() => set({ tri })}>{n}</button>)}
                <button type="button" aria-pressed={s.ext} className={s.ext ? chipOn : chip} onClick={() => set({ ext: !s.ext })}>Exterior angle</button>
              </div>
            )}
            {s.kind === "parallel" && (
              <div className="flex flex-wrap gap-1" role="group" aria-label="Angle pairs">
                {PAIRS.map((p) => <button key={p} type="button" aria-pressed={s.pair === p} className={s.pair === p ? chipOn : chip} onClick={() => set({ pair: p })}>{PAIR_NAMES[p]}</button>)}
              </div>
            )}
            {s.kind !== "triangle" && <Step label="Slope" value={s.t} min={T_MIN} max={T_MAX} onChange={(t) => set({ t })} show={`${s.t}°`} />}
            <div className="flex flex-wrap gap-1" role="group" aria-label="Missing angle">
              <button type="button" className={chip} onClick={() => set({ hide: (s.hide + 1) % count, reveal: false })}>{s.hide < 0 ? "Hide an angle" : "Hide a different one"}</button>
              {s.hide >= 0 && !s.reveal && <button type="button" className={primary} onClick={() => set({ reveal: true })}>Reveal</button>}
              {s.hide >= 0 && <button type="button" className={chip} onClick={() => set({ hide: -1, reveal: false })}>Show them all</button>}
            </div>
            <p className="text-[11px] font-bold text-ink/55">{s.kind === "triangle" ? "Drag a corner of the triangle." : "Drag the end of the red line."}</p>
          </div>
        )}
      </div>
    </Floating>
  );
}
