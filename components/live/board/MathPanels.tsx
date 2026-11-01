"use client";
import { useMemo, useState, type ReactNode } from "react";
import { evaluate, fmtNumber, samplePlot, tickStep } from "@/lib/mathExpr";
import { NUMBER_LINES, type CalcState, type GraphSlider, type GraphState, type LineState, type Panel } from "@/lib/boardTools";
import { keyPoints, parseRow, rowParams, tidy, valueTable, type KeyPoint } from "@/lib/graphing";
import { BoardIcon, type BoardIconName } from "@/components/live/board/BoardIcons";
import { localDelta, localPoint } from "@/components/live/board/rotation";

// Desmos-style maths tools that float over the board: a graph plotter, a
// scientific calculator and a number line. The host works them; learners see
// exactly the same thing live.

export const GRAPH_COLORS = ["#1657C9", "#DC2626", "#16A34A", "#7C3AED", "#EA580C", "#0F172A"];

// A floating card with a draggable title bar (host only).
export function Floating<T extends Panel>({ p, host, title, icon, width, onChange, children }: {
  p: T; host: boolean; title: string; icon: BoardIconName; width: number; onChange: (next: T, final?: boolean) => void; children: ReactNode;
}) {
  function drag(e: React.PointerEvent) {
    if (!host || (e.target as HTMLElement).closest("button")) return;
    const board = (e.currentTarget as HTMLElement).closest("[data-board]");
    if (!board) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, start = p;
    const at = (ev: PointerEvent): T => {
      const [dx, dy] = localDelta(board, ev.clientX - sx, ev.clientY - sy);
      return { ...start, x: Math.min(0.95, Math.max(0, start.x + dx)), y: Math.min(0.95, Math.max(0, start.y + dy)) };
    };
    let last = 0;
    const move = (ev: PointerEvent) => { const n = Date.now(); if (n - last > 40) { last = n; onChange(at(ev)); } };
    const up = (ev: PointerEvent) => { onChange(at(ev), true); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  return (
    <section className="pointer-events-auto absolute z-[25] max-h-[96%] overflow-y-auto rounded-2xl bg-white text-ink shadow-2xl ring-1 ring-black/10"
      style={{ left: `${p.x * 100}%`, top: `${Math.min(p.y * 100, 96)}%`, width }} aria-label={title}>
      <header onPointerDown={drag} className={`flex items-center gap-2 bg-[#0B1220] px-3 py-1.5 text-white ${host ? "cursor-move touch-none" : ""}`}>
        <BoardIcon name={icon} className="h-4 w-4 text-sky-300" />
        <h3 className="flex-1 text-xs font-black uppercase tracking-[.14em]">{title}</h3>
        {host && <button type="button" onClick={() => onChange({ ...p, on: false }, true)} aria-label={`Close ${title}`} className="rounded p-1 hover:bg-white/15"><BoardIcon name="close" className="h-4 w-4" /></button>}
      </header>
      {children}
    </section>
  );
}

// ── Graph plotter (Desmos-style) ─────────────────────────────────────────
// Up to six rows: functions, inequalities (shaded), vertical lines and points.
// Letters like a, b, c become sliders. The host can pan (drag) and zoom, and
// show key points (roots, intercepts, turning points, intersections) and a
// table of values; everyone can tap or hover to trace.
const DEFAULT_SLIDER: GraphSlider = { v: 1, min: -10, max: 10, step: 0.1 };
const KEY_LABEL: Record<KeyPoint["kind"], string> = { root: "root", "y-intercept": "y-intercept", max: "maximum", min: "minimum", intersection: "meet" };

export function GraphPanel({ g, host, boxW, onChange }: { g: GraphState; host: boolean; boxW: number; onChange: (g: GraphState, final?: boolean) => void }) {
  const W = g.big ? 640 : 480, H = g.big ? 400 : 320;
  const width = g.big ? Math.max(360, Math.min(900, boxW * 0.8)) : Math.max(320, Math.min(560, boxW * 0.45));
  const letters = useMemo(() => [...new Set(g.exprs.flatMap((e) => rowParams(e)))].slice(0, 8), [g.exprs]);
  const slider = (l: string) => g.params[l] ?? DEFAULT_SLIDER;
  const values = useMemo(() => Object.fromEntries(letters.map((l) => [l, (g.params[l] ?? DEFAULT_SLIDER).v])), [letters, g.params]);
  const rows = useMemo(() => g.exprs.map((e) => parseRow(e, values)), [g.exprs, values]);
  const fns = rows.flatMap((r, i) => (r?.kind === "fn" ? [{ i, f: r.f, ineq: r.ineq }] : []));
  const keys = useMemo(() => (g.keys ? keyPoints(fns.filter((x) => !x.ineq).map((x) => x.f), g) : []), [g.keys, fns, g]); // eslint-disable-line react-hooks/exhaustive-deps
  const sx = (x: number) => ((x - g.xMin) / (g.xMax - g.xMin)) * W, sy = (y: number) => H - ((y - g.yMin) / (g.yMax - g.yMin)) * H;
  const xs = tickStep(g.xMax - g.xMin), ys = tickStep(g.yMax - g.yMin);
  const ticks = (lo: number, hi: number, step: number) => { const out: number[] = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v / step) * step); return out; };
  const zoom = (k: number) => {
    const cx = (g.xMin + g.xMax) / 2, cy = (g.yMin + g.yMax) / 2, hw = ((g.xMax - g.xMin) / 2) * k, hh = ((g.yMax - g.yMin) / 2) * k;
    onChange({ ...g, xMin: cx - hw, xMax: cx + hw, yMin: cy - hh, yMax: cy + hh }, true);
  };
  const setExpr = (i: number, v: string) => { const exprs = [...g.exprs]; exprs[i] = v; onChange({ ...g, exprs }); };
  const setSlider = (l: string, s: GraphSlider, final = false) => onChange({ ...g, params: { ...g.params, [l]: s } }, final);
  const flip = (k: "keys" | "table" | "big") => onChange({ ...g, [k]: !g[k], ...(k === "big" && !g.big ? { x: 0.02, y: 0.02 } : {}) }, true);

  // Trace (anyone, on their own screen) and pan (host).
  const [trace, setTrace] = useState<number | null>(null);
  const toX = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return g.xMin + ((e.clientX - r.left) / r.width) * (g.xMax - g.xMin);
  };
  function down(e: React.PointerEvent<SVGSVGElement>) {
    setTrace(toX(e));
    if (!host) return;
    const svg = e.currentTarget, r = svg.getBoundingClientRect(), start = g, sx0 = e.clientX, sy0 = e.clientY;
    let moved = false, last = 0;
    const at = (ev: PointerEvent): GraphState => {
      const dx = ((ev.clientX - sx0) / r.width) * (start.xMax - start.xMin), dy = ((ev.clientY - sy0) / r.height) * (start.yMax - start.yMin);
      return { ...start, xMin: start.xMin - dx, xMax: start.xMax - dx, yMin: start.yMin + dy, yMax: start.yMax + dy };
    };
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx0, ev.clientY - sy0) < 6) return;
      moved = true; setTrace(null);
      const n = Date.now(); if (n - last > 50) { last = n; onChange(at(ev)); }
    };
    const up = (ev: PointerEvent) => { if (moved) onChange(at(ev), true); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  const traced = trace === null ? [] : fns.filter((x) => !x.ineq).map((x) => ({ i: x.i, y: x.f(trace) })).filter((p) => Number.isFinite(p.y) && p.y >= g.yMin && p.y <= g.yMax);
  const label = (x: number, y: number) => `(${fmtNumber(tidy(x))}, ${fmtNumber(tidy(y))})`;
  const first = fns.find((x) => !x.ineq);
  const shown = rows.map((r, i) => i).filter((i) => g.exprs[i] || (host && i === rows.findIndex((_, k) => !g.exprs[k])) || i === 0);

  return (
    <Floating p={g} host={host} title="Graph plotter" icon="graph" width={width} onChange={onChange}>
      <div className="max-h-[38vh] space-y-1 overflow-y-auto p-2">
        {shown.map((i) => (
          <label key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1 ring-1 ring-slate-200">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: GRAPH_COLORS[i] }} aria-hidden />
            {host ? (
              <input value={g.exprs[i]} onChange={(ev) => setExpr(i, ev.target.value)} onBlur={() => onChange(g, true)} aria-label={`Graph row ${i + 1}`}
                placeholder={i === 0 ? "y = x^2 - 4" : "y = ax + b, x = 2, (1, 3), y > 2x"} spellCheck={false} autoComplete="off"
                className="min-w-0 flex-1 bg-transparent font-mono text-sm font-bold outline-none" />
            ) : <span className="min-w-0 flex-1 truncate font-mono text-sm font-bold">{g.exprs[i] || "—"}</span>}
            {rows[i]?.kind === "error" && <span className="shrink-0 text-[10px] font-bold text-red-600">{(rows[i] as { error: string }).error}</span>}
          </label>
        ))}
        {letters.map((l) => {
          const s = slider(l);
          return (
            <div key={l} className="flex items-center gap-2 rounded-lg bg-indigo-50 px-2 py-1 text-sm ring-1 ring-indigo-100">
              <span className="w-16 shrink-0 font-mono font-bold">{l} = {fmtNumber(tidy(s.v))}</span>
              {host && <input type="number" value={s.min} step="any" aria-label={`Smallest ${l}`} onChange={(e) => setSlider(l, { ...s, min: Number(e.target.value) }, true)} className="w-12 rounded bg-white px-1 text-xs" />}
              <input type="range" min={s.min} max={s.max} step={s.step} value={s.v} disabled={!host} aria-label={`Slider ${l}`}
                onChange={(e) => setSlider(l, { ...s, v: Number(e.target.value) })} onPointerUp={() => setSlider(l, s, true)} onKeyUp={() => setSlider(l, s, true)}
                className="min-w-0 flex-1 accent-indigo-600" />
              {host && <input type="number" value={s.max} step="any" aria-label={`Largest ${l}`} onChange={(e) => setSlider(l, { ...s, max: Number(e.target.value) }, true)} className="w-12 rounded bg-white px-1 text-xs" />}
            </div>
          );
        })}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={`block w-full touch-none border-t border-slate-200 bg-white ${host ? "cursor-grab" : "cursor-crosshair"}`}
        onPointerDown={down} onPointerMove={(e) => { if (!e.buttons) setTrace(toX(e)); }} onPointerLeave={() => setTrace(null)}
        role="img" aria-label={`Graph of ${g.exprs.filter(Boolean).join(", ") || "nothing yet"}`}>
        {ticks(g.xMin, g.xMax, xs).map((v) => <line key={`gx${v}`} x1={sx(v)} x2={sx(v)} y1={0} y2={H} stroke="#EEF2F7" />)}
        {ticks(g.yMin, g.yMax, ys).map((v) => <line key={`gy${v}`} y1={sy(v)} y2={sy(v)} x1={0} x2={W} stroke="#EEF2F7" />)}
        {g.yMin <= 0 && g.yMax >= 0 && <line x1={0} x2={W} y1={sy(0)} y2={sy(0)} stroke="#334155" strokeWidth="1.5" />}
        {g.xMin <= 0 && g.xMax >= 0 && <line y1={0} y2={H} x1={sx(0)} x2={sx(0)} stroke="#334155" strokeWidth="1.5" />}
        {ticks(g.xMin, g.xMax, xs).filter((v) => v !== 0).map((v) => (
          <text key={`tx${v}`} x={sx(v)} y={Math.min(H - 4, Math.max(12, sy(0) + 13))} fontSize="10" textAnchor="middle" fill="#64748B">{fmtNumber(v)}</text>
        ))}
        {ticks(g.yMin, g.yMax, ys).filter((v) => v !== 0).map((v) => (
          <text key={`ty${v}`} x={Math.min(W - 4, Math.max(4, sx(0) - 4))} y={sy(v) + 3} fontSize="10" textAnchor={sx(0) < 20 ? "start" : "end"} fill="#64748B">{fmtNumber(v)}</text>
        ))}
        <defs><clipPath id="graph-clip"><rect x="0" y="0" width={W} height={H} /></clipPath></defs>
        <g clipPath="url(#graph-clip)">
          {fns.map(({ i, f, ineq }) => samplePlot(f, g.xMin, g.xMax, g.yMin, g.yMax).map((ln, k) => {
            const pts = ln.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(" ");
            const edge = ineq === ">" || ineq === ">=" ? 0 : H;
            return (
              <g key={`${i}-${k}`}>
                {ineq && ln.length > 1 && <polygon points={`${pts} ${sx(ln[ln.length - 1][0]).toFixed(1)},${edge} ${sx(ln[0][0]).toFixed(1)},${edge}`} fill={GRAPH_COLORS[i]} fillOpacity="0.14" />}
                <polyline points={pts} fill="none" stroke={GRAPH_COLORS[i]} strokeWidth="2.5" strokeLinejoin="round" strokeDasharray={ineq === "<" || ineq === ">" ? "7 5" : undefined} />
              </g>
            );
          }))}
          {rows.map((r, i) => r?.kind === "vline" && <line key={`v${i}`} x1={sx(r.x)} x2={sx(r.x)} y1={0} y2={H} stroke={GRAPH_COLORS[i]} strokeWidth="2.5" />)}
          {rows.map((r, i) => r?.kind === "points" && r.pts.map(([x, y], k) => (
            <g key={`p${i}-${k}`}>
              <circle cx={sx(x)} cy={sy(y)} r="5" fill={GRAPH_COLORS[i]} stroke="#fff" strokeWidth="1.5" />
              <text x={sx(x) + 7} y={sy(y) - 6} fontSize="11" fontWeight="700" fill="#0F172A">{label(x, y)}</text>
            </g>
          )))}
          {keys.map((p, k) => (
            <g key={`k${k}`}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r="4.5" fill="#fff" stroke="#475569" strokeWidth="2"><title>{`${KEY_LABEL[p.kind]} ${label(p.x, p.y)}`}</title></circle>
              {keys.length <= 12 && <text x={sx(p.x) + 6} y={sy(p.y) + (p.kind === "min" ? 14 : -7)} fontSize="10" fill="#475569">{label(p.x, p.y)}</text>}
            </g>
          ))}
          {trace !== null && (
            <g pointerEvents="none">
              <line x1={sx(trace)} x2={sx(trace)} y1={0} y2={H} stroke="#94A3B8" strokeDasharray="3 4" />
              {traced.map((p) => (
                <g key={`t${p.i}`}>
                  <circle cx={sx(trace)} cy={sy(p.y)} r="4.5" fill={GRAPH_COLORS[p.i]} />
                  <text x={sx(trace) + 7} y={sy(p.y) - 7} fontSize="11" fontWeight="700" fill={GRAPH_COLORS[p.i]} stroke="#fff" strokeWidth="3" paintOrder="stroke">{label(trace, p.y)}</text>
                </g>
              ))}
            </g>
          )}
        </g>
      </svg>
      {g.table && first && (
        <table className="w-full border-t border-slate-200 text-center font-mono text-xs" aria-label={`Table of values for ${g.exprs[first.i]}`}>
          <tbody>
            {(["x", "y"] as const).map((r) => (
              <tr key={r} className={r === "x" ? "bg-slate-50 font-bold" : ""}>
                <th className="px-1 py-1 text-left">{r}</th>
                {valueTable(first.f, g).map((c) => <td key={`${r}${c.x}`} className="px-1 py-1">{r === "x" ? c.x : c.y ?? "—"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {host && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 p-2 text-xs font-bold">
          <button type="button" onClick={() => zoom(0.5)} className="min-h-[32px] rounded-lg bg-slate-100 px-2.5 hover:bg-slate-200">Zoom in</button>
          <button type="button" onClick={() => zoom(2)} className="min-h-[32px] rounded-lg bg-slate-100 px-2.5 hover:bg-slate-200">Zoom out</button>
          <button type="button" onClick={() => onChange({ ...g, xMin: -10, xMax: 10, yMin: -10, yMax: 10 }, true)} className="min-h-[32px] rounded-lg bg-slate-100 px-2.5 hover:bg-slate-200">Reset</button>
          <button type="button" onClick={() => flip("keys")} aria-pressed={g.keys} className={`min-h-[32px] rounded-lg px-2.5 ${g.keys ? "bg-[#1657C9] text-white" : "bg-slate-100 hover:bg-slate-200"}`}>Key points</button>
          <button type="button" onClick={() => flip("table")} aria-pressed={g.table} className={`min-h-[32px] rounded-lg px-2.5 ${g.table ? "bg-[#1657C9] text-white" : "bg-slate-100 hover:bg-slate-200"}`}>Table</button>
          <button type="button" onClick={() => flip("big")} aria-pressed={g.big} className={`min-h-[32px] rounded-lg px-2.5 ${g.big ? "bg-[#1657C9] text-white" : "bg-slate-100 hover:bg-slate-200"}`}>{g.big ? "Smaller" : "Bigger"}</button>
          <span className="ml-auto text-ink/50">drag to move · x {fmtNumber(tidy(g.xMin))}…{fmtNumber(tidy(g.xMax))}</span>
        </div>
      )}
    </Floating>
  );
}

// ── Scientific calculator ────────────────────────────────────────────────
const KEYS: { k: string; ins?: string; tone?: "fn" | "op" | "eq" | "clr" }[][] = [
  [{ k: "sin", ins: "sin(", tone: "fn" }, { k: "cos", ins: "cos(", tone: "fn" }, { k: "tan", ins: "tan(", tone: "fn" }, { k: "√", ins: "√(", tone: "fn" }, { k: "xʸ", ins: "^", tone: "fn" }],
  [{ k: "(", tone: "fn" }, { k: ")", tone: "fn" }, { k: "π", tone: "fn" }, { k: "ln", ins: "ln(", tone: "fn" }, { k: "log", ins: "log(", tone: "fn" }],
  [{ k: "7" }, { k: "8" }, { k: "9" }, { k: "÷", tone: "op" }, { k: "⌫", tone: "clr" }],
  [{ k: "4" }, { k: "5" }, { k: "6" }, { k: "×", tone: "op" }, { k: "AC", tone: "clr" }],
  [{ k: "1" }, { k: "2" }, { k: "3" }, { k: "−", tone: "op" }, { k: "x²", ins: "^2", tone: "fn" }],
  [{ k: "0" }, { k: "." }, { k: "%", ins: "/100", tone: "fn" }, { k: "+", tone: "op" }, { k: "=", tone: "eq" }],
];
const TONE = { fn: "bg-slate-100 text-ink", op: "bg-sky-100 text-sky-900", eq: "bg-[#1657C9] text-white", clr: "bg-red-50 text-red-700" } as const;

export function CalcPanel({ c, host, onChange }: { c: CalcState; host: boolean; onChange: (c: CalcState, final?: boolean) => void }) {
  const preview = c.expr ? evaluate(c.expr, c.deg) : null;
  function press(key: string, ins?: string) {
    if (key === "AC") return onChange({ ...c, expr: "", result: "" }, true);
    if (key === "⌫") return onChange({ ...c, expr: c.expr.slice(0, -1) }, true);
    if (key === "=") {
      const r = evaluate(c.expr, c.deg);
      return onChange({ ...c, result: r.ok ? fmtNumber((r as { value: number }).value) : (r as { error: string }).error }, true);
    }
    // After "=": an operator carries on from the answer; anything else starts fresh.
    const add = ins ?? key;
    const answer = c.result && Number.isFinite(Number(c.result)) ? c.result : null;
    const base = c.result ? (/^[+−×÷^/]/.test(add) && answer ? answer : "") : c.expr;
    onChange({ ...c, expr: (base + add).slice(0, 120), result: "" }, true);
  }
  return (
    <Floating p={c} host={host} title="Calculator" icon="calculator" width={272} onChange={onChange}>
      <div className="bg-slate-900 px-3 py-2 text-right text-white">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-white/50">
          {host ? <button type="button" onClick={() => onChange({ ...c, deg: !c.deg }, true)} className="rounded bg-white/10 px-1.5 py-0.5 text-white">{c.deg ? "DEG" : "RAD"}</button> : <span>{c.deg ? "DEG" : "RAD"}</span>}
          <span>Scientific</span>
        </div>
        <p className="mt-1 min-h-[22px] break-all font-mono text-base text-white/80">{c.expr || "0"}</p>
        <p className="min-h-[34px] break-all font-mono text-3xl font-black" aria-live="polite">
          {c.result || (preview && preview.ok ? <span className="text-white/40">{fmtNumber((preview as { value: number }).value)}</span> : "")}
        </p>
      </div>
      <div className={`grid grid-cols-5 gap-1 p-2 ${host ? "" : "pointer-events-none opacity-90"}`}>
        {KEYS.flat().map(({ k, ins, tone }) => (
          <button key={k} type="button" onClick={() => press(k, ins)} tabIndex={host ? 0 : -1}
            className={`min-h-[38px] rounded-lg text-sm font-black transition active:scale-95 ${tone ? TONE[tone] : "bg-white text-ink ring-1 ring-slate-200"}`}>{k}</button>
        ))}
      </div>
    </Floating>
  );
}

// ── Number line ──────────────────────────────────────────────────────────
export function NumberLinePanel({ l, host, boxW, onChange }: { l: LineState; host: boolean; boxW: number; onChange: (l: LineState, final?: boolean) => void }) {
  const W = 800, H = 96, pad = 36;
  const width = Math.max(320, Math.min(900, boxW * 0.84));
  const n = Math.round((l.max - l.min) / l.step);
  const sx = (v: number) => pad + ((v - l.min) / (l.max - l.min)) * (W - 2 * pad);
  const labelEvery = Math.max(1, Math.ceil(n / 20));
  function mark(e: React.MouseEvent<SVGSVGElement>) {
    if (!host) return;
    const px = localPoint(e.currentTarget, e.clientX, e.clientY)[0] * W;
    const v = Math.round((l.min + ((px - pad) / (W - 2 * pad)) * (l.max - l.min)) / l.step) * l.step;
    if (v < l.min - 1e-9 || v > l.max + 1e-9) return;
    const val = Math.round(v * 1e6) / 1e6;
    const marks = l.marks.includes(val) ? l.marks.filter((m) => m !== val) : [...l.marks, val].slice(-12);
    onChange({ ...l, marks }, true);
  }
  return (
    <Floating p={l} host={host} title="Number line" icon="numberline" width={width} onChange={onChange}>
      <svg viewBox={`0 0 ${W} ${H}`} className={`block w-full bg-white ${host ? "cursor-pointer" : ""}`} onClick={mark} role="img"
        aria-label={`Number line from ${fmtNumber(l.min)} to ${fmtNumber(l.max)}${l.marks.length ? `, marked at ${l.marks.map(fmtNumber).join(", ")}` : ""}`}>
        <line x1={pad - 16} x2={W - pad + 16} y1={44} y2={44} stroke="#0B1220" strokeWidth="3" />
        <path d={`M${pad - 22} 44 l10 -7 v14 Z M${W - pad + 22} 44 l-10 -7 v14 Z`} fill="#0B1220" />
        {Array.from({ length: n + 1 }, (_, i) => {
          const v = l.min + i * l.step, big = i % labelEvery === 0;
          return (
            <g key={i}>
              <line x1={sx(v)} x2={sx(v)} y1={big ? 32 : 37} y2={big ? 56 : 51} stroke="#0B1220" strokeWidth={big ? 2 : 1} />
              {big && <text x={sx(v)} y={76} fontSize="15" fontWeight="700" textAnchor="middle" fill="#0B1220">{fmtNumber(Math.round(v * 1e6) / 1e6)}</text>}
            </g>
          );
        })}
        {l.marks.map((m) => <circle key={m} cx={sx(m)} cy={44} r="9" fill="#DC2626" stroke="#fff" strokeWidth="2" />)}
      </svg>
      {host && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 p-2 text-xs font-bold">
          {NUMBER_LINES.map((r) => (
            <button key={r.label} type="button" onClick={() => onChange({ ...l, min: r.min, max: r.max, step: r.step, marks: [] }, true)}
              className={`min-h-[32px] rounded-lg px-2.5 ${l.min === r.min && l.max === r.max && l.step === r.step ? "bg-[#1657C9] text-white" : "bg-slate-100 hover:bg-slate-200"}`}>{r.label}</button>
          ))}
          <span className="ml-auto text-ink/50">Tap the line to mark a number</span>
          {l.marks.length > 0 && <button type="button" onClick={() => onChange({ ...l, marks: [] }, true)} className="min-h-[32px] rounded-lg bg-red-50 px-2.5 text-red-700">Clear marks</button>}
        </div>
      )}
    </Floating>
  );
}
