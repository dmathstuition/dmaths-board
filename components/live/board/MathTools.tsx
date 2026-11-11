"use client";
import { useEffect, useState } from "react";
import { Floating } from "@/components/live/board/MathPanels";
import {
  BAL_MAX_UNITS, BAL_MAX_X, BAND_COLOURS, CHART_ROWS, GEO_BANDS, GEO_SIZES, area, axis, bins, canDo, chartStats, crossesItself, doOp, equationText, interiorAngles,
  modeText, newEquation, opText, parseList, perimeter, reflectPt, sectors, shapeName, solve, solved, symmetricIn, tapPeg, tidy, tilt,
  type BalanceState, type Band, type ChartKind, type ChartState, type GeoState, type Mirror, type Op, type Pt, type Side, type Where,
} from "@/lib/mathTools";

// Three maths tools that float over the board (lib/mathTools.ts): the
// geoboard, the equation balance and the chart maker. The teacher works them;
// learners see every change live.

type P<T> = { s: T; host: boolean; boxW: number; onChange: (s: T, final?: boolean) => void };
const chip = "min-h-[32px] rounded-lg bg-slate-100 px-2.5 text-xs font-black text-ink hover:bg-slate-200 disabled:opacity-40";
const chipOn = "min-h-[32px] rounded-lg bg-[#0E6E72] px-2.5 text-xs font-black text-white";
const primary = "min-h-[32px] rounded-lg bg-[#0E6E72] px-3 text-xs font-black text-white hover:bg-[#0A4F52] disabled:opacity-40";
const field = "min-h-[32px] rounded-lg bg-slate-50 px-2 text-sm font-semibold text-ink ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E6E72]";
const FONT = "Poppins, system-ui, sans-serif";

// ── Geoboard ─────────────────────────────────────────────────────────────
const MIRRORS: [Mirror, string][] = [["none", "No mirror"], ["v", "Mirror ↕"], ["h", "Mirror ↔"], ["d", "Mirror ⤢"]];
export function GeoboardPanel({ s, host, boxW, onChange }: P<GeoState>) {
  const width = Math.max(300, Math.min(440, boxW * 0.42));
  const pad = 26, cell = 44, size = pad * 2 + (s.n - 1) * cell;
  const X = (c: number) => pad + c * cell, Y = (r: number) => pad + r * cell;
  const path = (pts: Pt[]) => pts.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ");
  const set = (g: Partial<GeoState>) => onChange({ ...s, ...g }, true);
  const setBand = (b: Band) => set({ bands: s.bands.map((x, i) => (i === s.active ? b : x)) });
  const active = s.bands[s.active] ?? s.bands[0];
  const m = s.n - 1;
  const mirrorLine = s.mirror === "v" ? [X(m / 2), Y(0) - 14, X(m / 2), Y(m) + 14] : s.mirror === "h" ? [X(0) - 14, Y(m / 2), X(m) + 14, Y(m / 2)] : s.mirror === "d" ? [X(0) - 10, Y(0) - 10, X(m) + 10, Y(m) + 10] : null;
  return (
    <Floating p={s} host={host} title="Geoboard" icon="geoboard" width={width} onChange={onChange}>
      <div className="p-2.5">
        <svg viewBox={`0 0 ${size} ${size}`} className="block w-full rounded-xl bg-[#F8FAFC] ring-1 ring-slate-200" role="group" aria-label={`Geoboard, ${s.n} by ${s.n} pegs`} style={{ fontFamily: FONT, touchAction: "manipulation" }}>
          {mirrorLine && <line x1={mirrorLine[0]} y1={mirrorLine[1]} x2={mirrorLine[2]} y2={mirrorLine[3]} stroke="#0E6E72" strokeWidth={2} strokeDasharray="8 6" />}
          {s.reflect && s.mirror !== "none" && s.bands.map((b, i) => b.pts.length > 1 && (
            <polyline key={`r${i}`} points={path([...b.pts.map((p) => reflectPt(p, s.mirror, s.n)), ...(b.closed ? [reflectPt(b.pts[0], s.mirror, s.n)] : [])])}
              fill={b.closed ? BAND_COLOURS[i] : "none"} fillOpacity={0.07} stroke={BAND_COLOURS[i]} strokeOpacity={0.45} strokeWidth={3} strokeDasharray="5 5" strokeLinejoin="round" />
          ))}
          {s.bands.map((b, i) => b.pts.length > 0 && (
            <g key={i}>
              {b.closed ? <polygon points={path(b.pts)} fill={BAND_COLOURS[i]} fillOpacity={0.16} stroke={BAND_COLOURS[i]} strokeWidth={4} strokeLinejoin="round" />
                : <polyline points={path(b.pts)} fill="none" stroke={BAND_COLOURS[i]} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />}
              {b.pts.map((p, k) => <circle key={k} cx={X(p[0])} cy={Y(p[1])} r={k === 0 && !b.closed ? 9 : 7} fill="#fff" stroke={BAND_COLOURS[i]} strokeWidth={3} />)}
            </g>
          ))}
          {Array.from({ length: s.n * s.n }, (_, k) => {
            const c = k % s.n, r = Math.floor(k / s.n);
            return <circle key={k} cx={X(c)} cy={Y(r)} r={3.5} fill="#334155" />;
          })}
          {s.angles && s.bands.map((b, i) => {
            if (!b.closed || crossesItself(b)) return null;
            const cx = b.pts.reduce((a, p) => a + p[0], 0) / b.pts.length, cy = b.pts.reduce((a, p) => a + p[1], 0) / b.pts.length;
            return interiorAngles(b).map((a, k) => {
              if (a === 180) return null;
              const p = b.pts[k], dx = cx - p[0], dy = cy - p[1], d = Math.hypot(dx, dy) || 1, off = a > 180 ? -22 : a < 60 ? 34 : 22; // a sharp corner: further in, clear of the band
              return <text key={`${i}-${k}`} x={X(p[0]) + (dx / d) * off} y={Y(p[1]) + (dy / d) * off + 4} textAnchor="middle" fontSize={12} fontWeight={800} fill="#0B1220" stroke="#F8FAFC" strokeWidth={3} paintOrder="stroke">{tidy(a, 1)}°</text>;
            });
          })}
          {host && Array.from({ length: s.n * s.n }, (_, k) => {
            const c = k % s.n, r = Math.floor(k / s.n);
            return <circle key={`hit${k}`} cx={X(c)} cy={Y(r)} r={cell / 2 - 2} fill="transparent" role="button" tabIndex={0} aria-label={`Peg ${c + 1} across, ${r + 1} down`} style={{ cursor: "pointer", outline: "none" }} className="focus-visible:fill-teal-600/20"
              onClick={() => setBand(tapPeg(active, [c, r]))} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setBand(tapPeg(active, [c, r])); } }} />;
          })}
        </svg>

        <ul className="mt-2 grid gap-1" aria-label="Shapes" aria-live="polite">
          {s.bands.map((b, i) => {
            if (b.pts.length < 2) return null;
            const name = shapeName(b), crossed = b.closed && crossesItself(b), per = perimeter(b), sym = b.closed && !crossed && s.mirror !== "none" ? symmetricIn(b, s.mirror, s.n) : null;
            return (
              <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg bg-slate-50 px-2 py-1 text-xs">
                <span className="flex items-center gap-1.5 font-black first-letter:uppercase"><span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: BAND_COLOURS[i] }} /><span className="first-letter:uppercase">{name}</span></span>
                {crossed ? <span className="font-bold text-amber-700">The band crosses itself — move a peg.</span> : (
                  <>
                    {s.area && b.closed && <span>Area <b className="font-mono text-sm">{tidy(area(b))}</b> square units</span>}
                    {s.perim && <span>{b.closed ? "Perimeter" : "Length"} <b className="font-mono text-sm">{per.exact}</b>{per.exact.includes("√") ? <> ≈ <b className="font-mono">{tidy(per.value)}</b></> : ""} units</span>}
                    {sym != null && <span className={`font-bold ${sym ? "text-emerald-700" : "text-ink/50"}`}>{sym ? "✓ symmetrical in the mirror line" : "not symmetrical in this mirror line"}</span>}
                  </>
                )}
              </li>
            );
          })}
        </ul>

        {host ? (
          <div className="mt-2 grid gap-1.5">
            <p className="text-[11px] font-bold text-ink/55">{active.closed ? "This band is closed. Pick another band, or clear it to start again." : active.pts.length >= 3 ? "Tap the first peg (the big one) to close the shape." : "Tap pegs to stretch the band round them."}</p>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Bands">
              {s.bands.map((_, i) => (
                <button key={i} type="button" onClick={() => set({ active: i })} aria-pressed={s.active === i} aria-label={`Band ${i + 1}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ring-2 ${s.active === i ? "ring-ink" : "ring-transparent"}`}><span className="h-4 w-4 rounded-full" style={{ background: BAND_COLOURS[i] }} /></button>
              ))}
              {s.bands.length < GEO_BANDS && <button type="button" className={chip} onClick={() => set({ bands: [...s.bands, { pts: [], closed: false }], active: s.bands.length })}>+ Band</button>}
              <button type="button" className={chip} disabled={!active.pts.length} onClick={() => setBand(active.closed ? { ...active, closed: false } : { pts: active.pts.slice(0, -1), closed: false })}>Undo</button>
              <button type="button" className={chip} disabled={!active.pts.length} onClick={() => setBand({ pts: [], closed: false })}>Clear band</button>
              <button type="button" className={chip} onClick={() => set({ bands: [{ pts: [], closed: false }], active: 0 })}>Clear all</button>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <button type="button" aria-pressed={s.area} className={s.area ? chipOn : chip} onClick={() => set({ area: !s.area })}>Area</button>
              <button type="button" aria-pressed={s.perim} className={s.perim ? chipOn : chip} onClick={() => set({ perim: !s.perim })}>Perimeter</button>
              <button type="button" aria-pressed={s.angles} className={s.angles ? chipOn : chip} onClick={() => set({ angles: !s.angles })}>Angles</button>
              <label className="ml-auto text-[11px] font-black text-ink/60">Pegs <select value={s.n} onChange={(e) => set({ n: Number(e.target.value), bands: [{ pts: [], closed: false }], active: 0 })} className={`${field} ml-1`} aria-label="Pegs along each side">
                {GEO_SIZES.map((n) => <option key={n} value={n}>{n} × {n}</option>)}</select></label>
            </div>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Mirror line">
              {MIRRORS.map(([mm, label]) => <button key={mm} type="button" aria-pressed={s.mirror === mm} className={s.mirror === mm ? chipOn : chip} onClick={() => set({ mirror: mm, reflect: mm === "none" ? false : s.reflect })}>{label}</button>)}
              {s.mirror !== "none" && <button type="button" aria-pressed={s.reflect} className={s.reflect ? chipOn : chip} onClick={() => set({ reflect: !s.reflect })}>Show reflection</button>}
            </div>
          </div>
        ) : s.bands.every((b) => b.pts.length < 2) && <p className="mt-2 text-center text-xs font-bold text-ink/50">Your teacher is making a shape…</p>}
      </div>
    </Floating>
  );
}

// ── Equation balance ─────────────────────────────────────────────────────
const LEVELS: [1 | 2 | 3, string][] = [[1, "One step"], [2, "Two steps"], [3, "x on both sides"]];
function Pan({ side, ans, reveal }: { side: Side; ans: number; reveal: boolean }) {
  // x-blocks in a row on the pan, unit weights stacked above them (six to a row).
  const [xs, units] = side, bw = 26, uw = 17, gapX = 4;
  const rowW = (n: number, w: number, g: number) => n * w + Math.max(0, n - 1) * g;
  const xw = rowW(xs, bw, gapX), baseY = xs ? -bw - 3 : 0;
  return (
    <g>
      {Array.from({ length: xs }, (_, i) => (
        <g key={`x${i}`} transform={`translate(${-xw / 2 + i * (bw + gapX)},${-bw})`}>
          <rect width={bw} height={bw} rx={5} fill="#0E6E72" stroke="#0A4F52" strokeWidth={1.5} />
          <text x={bw / 2} y={bw / 2 + 5} textAnchor="middle" fontSize={reveal ? 12 : 15} fontWeight={800} fill="#fff" fontStyle={reveal ? "normal" : "italic"}>{reveal ? ans : "x"}</text>
        </g>
      ))}
      {Array.from({ length: units }, (_, i) => {
        const row = Math.floor(i / 6), inRow = Math.min(6, units - row * 6), w = rowW(inRow, uw, 2);
        return (
          <g key={`u${i}`} transform={`translate(${-w / 2 + (i % 6) * (uw + 2) + uw / 2},${baseY - row * (uw + 1) - uw / 2})`}>
            <circle r={uw / 2} fill="#F59E0B" stroke="#B45309" strokeWidth={1.2} />
            <text y={3.5} textAnchor="middle" fontSize={9.5} fontWeight={800} fill="#451A03">1</text>
          </g>
        );
      })}
      {xs === 0 && units === 0 && <text y={-8} textAnchor="middle" fontSize={11} fontWeight={700} fill="#94A3B8">nothing</text>}
    </g>
  );
}
export function BalancePanel({ s, host, boxW, onChange }: P<BalanceState>) {
  const width = Math.max(330, Math.min(500, boxW * 0.46));
  const [n, setN] = useState(1);
  const [custom, setCustom] = useState<[number, number, number, number]>([s.start[0][0], s.start[0][1], s.start[1][0], s.start[1][1]]);
  const [err, setErr] = useState<string | null>(null);
  const t = tilt(s.left, s.right, s.ans), done = solved(s.left, s.right, s.ans);
  const angle = t === "level" ? 0 : t === "left" ? -9 : 9; // heavier side goes down
  const W = 460, H = 212, cx = W / 2, beamY = 40, arm = 150, rad = (angle * Math.PI) / 180;
  const end = (dir: 1 | -1) => ({ x: cx + dir * arm * Math.cos(rad), y: beamY + dir * arm * Math.sin(rad) });
  const lp = end(-1), rp = end(1), drop = 92;

  function apply(op: Op) {
    const l = s.where !== "right" ? doOp(s.left, op) : s.left, r = s.where !== "left" ? doOp(s.right, op) : s.right;
    onChange({ ...s, left: l, right: r, log: [...s.log, `${opText(op, s.where)} → ${equationText(l, r)}`].slice(-10) }, true);
  }
  const can = (op: Op) => (s.where === "right" || canDo(s.left, op)) && (s.where === "left" || canDo(s.right, op));
  const fresh = (left: Side, right: Side, ans: number) => { setCustom([left[0], left[1], right[0], right[1]]); setErr(null); onChange({ ...s, ans, start: [left, right], left, right, log: [], reveal: false, where: "both" }, true); };
  function setOwn() {
    const left: Side = [custom[0], custom[1]], right: Side = [custom[2], custom[3]], ans = solve(left, right);
    if (ans == null) return setErr("Choose numbers that give a whole-number answer (0 to 20).");
    fresh(left, right, ans);
  }
  const ops: [string, Op][] = [
    [`Take ${n}`, { kind: "take", what: "1", n }], [`Add ${n}`, { kind: "add", what: "1", n }],
    [`Take ${n === 1 ? "x" : `${n}x`}`, { kind: "take", what: "x", n }], [`Add ${n === 1 ? "x" : `${n}x`}`, { kind: "add", what: "x", n }],
  ];
  const divisors = [2, 3, 4, 5, 6, 7, 8, 9].filter((k) => can({ kind: "divide", n: k }));
  const status = done ? `Solved: x = ${s.ans}` : t === "level" ? "Balanced — both sides weigh the same." : `Not balanced — the ${t} side is heavier. Do the same to the other side.`;
  return (
    <Floating p={s} host={host} title="Equation balance" icon="balance" width={width} onChange={onChange}>
      <div className="p-2.5">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Balance scale: ${equationText(s.left, s.right)}. ${status}`} style={{ fontFamily: FONT }}>
          <path d={`M${cx - 30},${H - 14} L${cx},${beamY + 4} L${cx + 30},${H - 14} Z`} fill="#CBD5E1" stroke="#64748B" strokeWidth={2} />
          <rect x={cx - 70} y={H - 16} width={140} height={10} rx={5} fill="#64748B" />
          <line x1={lp.x} y1={lp.y} x2={rp.x} y2={rp.y} stroke="#334155" strokeWidth={7} strokeLinecap="round" style={{ transition: "all .5s" }} />
          <circle cx={cx} cy={beamY} r={7} fill="#0B1220" />
          {([[lp, s.left, "left"], [rp, s.right, "right"]] as const).map(([p, side, name]) => (
            <g key={name} style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: "transform .5s" }}>
              <line x1={0} y1={0} x2={-46} y2={drop} stroke="#94A3B8" strokeWidth={1.5} /><line x1={0} y1={0} x2={46} y2={drop} stroke="#94A3B8" strokeWidth={1.5} />
              <path d={`M-62,${drop} h124 q-6,14 -24,14 h-76 q-18,0 -24,-14 z`} fill="#E2E8F0" stroke="#64748B" strokeWidth={2} />
              <g transform={`translate(0,${drop - 1})`}><Pan side={side} ans={s.ans} reveal={s.reveal || done} /></g>
            </g>
          ))}
        </svg>
        <p className="text-center font-mono text-2xl font-black tracking-tight" aria-hidden>{equationText(s.left, s.right)}</p>
        <p role="status" className={`mt-1 rounded-lg px-2 py-1 text-center text-xs font-black ${done ? "bg-emerald-100 text-emerald-800" : t === "level" ? "bg-slate-100 text-ink/70" : "bg-amber-100 text-amber-900"}`}>{done ? `✓ ${status}` : status}</p>

        {s.log.length > 0 && (
          <ol className="mt-2 grid gap-0.5 rounded-lg bg-slate-50 p-2 text-xs" aria-label="Steps">
            <li className="font-mono font-bold text-ink/60">{equationText(s.start[0], s.start[1])}</li>
            {s.log.map((l, i) => { const [what, eqn] = l.split(" → "); return <li key={i} className="flex flex-wrap justify-between gap-x-3"><span className="text-ink/70">{what}</span><b className="font-mono">{eqn}</b></li>; })}
          </ol>
        )}

        {host && (
          <div className="mt-2 grid gap-1.5">
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Which side">
              <span className="text-[11px] font-black text-ink/60">Do it to</span>
              {(["both", "left", "right"] as Where[]).map((w) => <button key={w} type="button" aria-pressed={s.where === w} className={s.where === w ? chipOn : chip} onClick={() => onChange({ ...s, where: w }, true)}>{w === "both" ? "Both sides" : `${w[0].toUpperCase()}${w.slice(1)} only`}</button>)}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="flex items-center gap-1 text-[11px] font-black text-ink/60">How many
                <button type="button" className={`${chip} w-8 px-0`} aria-label="Fewer" onClick={() => setN(Math.max(1, n - 1))} disabled={n <= 1}>−</button>
                <span className="w-6 text-center font-mono text-sm text-ink">{n}</span>
                <button type="button" className={`${chip} w-8 px-0`} aria-label="More" onClick={() => setN(Math.min(BAL_MAX_UNITS, n + 1))}>+</button>
              </span>
              {ops.map(([label, op]) => <button key={label} type="button" className={primary} disabled={!can(op)} onClick={() => apply(op)}>{label}</button>)}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {divisors.length > 0 ? divisors.map((k) => <button key={k} type="button" className={primary} onClick={() => apply({ kind: "divide", n: k })}>Divide by {k}</button>)
                : <span className="text-[11px] font-bold text-ink/45">Divide appears when {s.where === "both" ? "both sides share" : "that side shares"} out equally.</span>}
              <button type="button" className={`${chip} ml-auto`} disabled={!s.log.length} onClick={() => onChange({ ...s, left: s.start[0], right: s.start[1], log: [], reveal: false }, true)}>Start again</button>
              <button type="button" aria-pressed={s.reveal} className={s.reveal ? chipOn : chip} onClick={() => onChange({ ...s, reveal: !s.reveal }, true)}>{s.reveal ? "Hide" : "Show"} x</button>
            </div>
            <div className="flex flex-wrap items-center gap-1 border-t border-slate-200 pt-1.5">
              <span className="text-[11px] font-black text-ink/60">New</span>
              {LEVELS.map(([lv, label]) => <button key={lv} type="button" className={chip} onClick={() => { const e = newEquation(lv); fresh(e.left, e.right, e.ans); }}>{label}</button>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setOwn(); }} className="flex flex-wrap items-center gap-1 text-sm font-black" aria-label="Your own equation">
              {([[0, "x +", BAL_MAX_X], [1, "=", BAL_MAX_UNITS], [2, "x +", BAL_MAX_X], [3, "", BAL_MAX_UNITS]] as [number, string, number][]).map(([i, after, max]) => (
                <span key={i} className="flex items-center gap-1">
                  <input type="number" min={0} max={max} value={custom[i]} onChange={(e) => { const c = [...custom] as typeof custom; c[i] = Math.max(0, Math.min(max, Math.round(Number(e.target.value) || 0))); setCustom(c); setErr(null); }}
                    aria-label={["Number of x on the left", "Number on the left", "Number of x on the right", "Number on the right"][i]} className={`${field} w-12 text-center`} />{after}
                </span>
              ))}
              <button type="submit" className={chip}>Set</button>
            </form>
            {err && <p role="alert" className="text-xs font-bold text-amber-700">{err}</p>}
          </div>
        )}
      </div>
    </Floating>
  );
}

// ── Chart maker ──────────────────────────────────────────────────────────
const KINDS: [ChartKind, string][] = [["bar", "Bar chart"], ["pie", "Pie chart"], ["line", "Line graph"], ["hist", "Histogram"]];
const COLS = ["#0E6E72", "#DC2626", "#D97706", "#2563EB", "#7C3AED", "#16A34A", "#DB2777", "#0891B2", "#65A30D", "#475569"];
export function ChartPanel({ s, host, boxW, onChange }: P<ChartState>) {
  const width = Math.max(340, Math.min(560, boxW * 0.5));
  const [draft, setDraft] = useState(() => s.list.join(", "));
  const [editing, setEditing] = useState(true); // the data table, folded away to give the board its room
  useEffect(() => { if (JSON.stringify(parseList(draft)) !== JSON.stringify(s.list)) setDraft(s.list.join(", ")); }, [s.list]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (c: Partial<ChartState>, final = true) => onChange({ ...s, ...c }, final);
  const setRow = (i: number, r: Partial<ChartState["rows"][number]>, final = false) => set({ rows: s.rows.map((x, j) => (j === i ? { ...x, ...r } : x)) }, final);
  const st = s.stats ? chartStats(s) : null;
  const W = 520, H = 250, m = { l: 44, r: 14, t: 24, b: 40 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
  const rows = s.rows.filter((r) => r.label.trim() || r.value);
  const hb = s.kind === "hist" ? bins(s.list, s.width) : [];
  const top = s.kind === "hist" ? Math.max(1, ...hb.map((b) => b.f)) : Math.max(1, ...rows.map((r) => r.value));
  const ax = axis(top), Yv = (v: number) => m.t + ph - ((v - ax.lo) / (ax.hi - ax.lo)) * ph;
  const empty = s.kind === "hist" ? !hb.length : !rows.length;
  const alt = s.kind === "hist" ? hb.map((b) => `${tidy(b.lo)} to ${tidy(b.hi)}: ${b.f}`).join(", ") : rows.map((r) => `${r.label || "—"}: ${tidy(r.value)}`).join(", ");

  const grid = (
    <g>
      {ax.ticks.map((v) => <g key={v}><line x1={m.l} y1={Yv(v)} x2={W - m.r} y2={Yv(v)} stroke="#E2E8F0" /><text x={m.l - 6} y={Yv(v) + 4} textAnchor="end" fontSize={11} fill="#475569">{tidy(v)}</text></g>)}
      <line x1={m.l} y1={m.t} x2={m.l} y2={m.t + ph} stroke="#334155" strokeWidth={1.5} /><line x1={m.l} y1={Yv(0)} x2={W - m.r} y2={Yv(0)} stroke="#334155" strokeWidth={1.5} />
    </g>
  );
  let chart: React.ReactNode = null;
  if (empty) chart = <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={14} fontWeight={700} fill="#94A3B8">{s.kind === "hist" ? "Type some numbers to draw the histogram" : "Fill in the table to draw the chart"}</text>;
  else if (s.kind === "bar" || s.kind === "line") {
    const step = pw / rows.length, bw = Math.min(64, step * 0.66), X = (i: number) => m.l + step * (i + 0.5);
    chart = (
      <g>
        {grid}
        {s.kind === "bar" ? rows.map((r, i) => <rect key={i} x={X(i) - bw / 2} y={Yv(r.value)} width={bw} height={Math.max(0, Yv(0) - Yv(r.value))} rx={3} fill={COLS[i % COLS.length]} />)
          : <><polyline points={rows.map((r, i) => `${X(i)},${Yv(r.value)}`).join(" ")} fill="none" stroke="#0E6E72" strokeWidth={3} strokeLinejoin="round" />{rows.map((r, i) => <circle key={i} cx={X(i)} cy={Yv(r.value)} r={5} fill="#fff" stroke="#0E6E72" strokeWidth={3} />)}</>}
        {rows.map((r, i) => (
          <g key={`l${i}`}>
            <text x={X(i)} y={Yv(r.value) - 7} textAnchor="middle" fontSize={11.5} fontWeight={800} fill="#0B1220">{tidy(r.value)}</text>
            <text x={X(i)} y={m.t + ph + 16} textAnchor="middle" fontSize={rows.length > 7 ? 9.5 : 11.5} fontWeight={700} fill="#0B1220">{r.label.length > 9 && rows.length > 5 ? `${r.label.slice(0, 8)}…` : r.label}</text>
          </g>
        ))}
      </g>
    );
  } else if (s.kind === "pie") {
    const sec = sectors(rows), cx = 140, cy = H / 2, R = 108;
    const at = (deg: number, r = R) => { const a = ((deg - 90) * Math.PI) / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    chart = !sec.length ? <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={14} fontWeight={700} fill="#94A3B8">A pie chart needs values above 0</text> : (
      <g>
        {sec.length === 1 ? <circle cx={cx} cy={cy} r={R} fill={COLS[0]} /> : sec.map((x, i) => {
          const [x1, y1] = at(x.from), [x2, y2] = at(x.from + x.angle);
          return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${x.angle > 180 ? 1 : 0} 1 ${x2},${y2} Z`} fill={COLS[i % COLS.length]} stroke="#fff" strokeWidth={2} />;
        })}
        {sec.map((x, i) => { if (x.angle < 24) return null; const [tx, ty] = at(x.from + x.angle / 2, R * 0.62); return <text key={`p${i}`} x={tx} y={ty + 4} textAnchor="middle" fontSize={12.5} fontWeight={800} fill="#fff">{tidy(x.pct, 0)}%</text>; })}
        {sec.map((x, i) => (
          <g key={`k${i}`} transform={`translate(292,${Math.max(14, H / 2 - sec.length * 12) + i * 24})`}>
            <rect width={13} height={13} rx={3} fill={COLS[i % COLS.length]} />
            <text x={20} y={11} fontSize={12} fontWeight={700} fill="#0B1220">{(x.label || "—").slice(0, 12)}</text>
            <text x={226} y={11} textAnchor="end" fontSize={11.5} fill="#334155">{tidy(x.value)} · {tidy(x.pct, 1)}% · {tidy(x.angle, 0)}°</text>
          </g>
        ))}
      </g>
    );
  } else {
    const step = pw / hb.length;
    chart = (
      <g>
        {grid}
        {hb.map((b, i) => <g key={i}><rect x={m.l + i * step} y={Yv(b.f)} width={step} height={Math.max(0, Yv(0) - Yv(b.f))} fill="#0E6E72" fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />{b.f > 0 && <text x={m.l + (i + 0.5) * step} y={Yv(b.f) - 6} textAnchor="middle" fontSize={11.5} fontWeight={800} fill="#0B1220">{b.f}</text>}</g>)}
        {[...hb.map((b) => b.lo), hb[hb.length - 1].hi].map((v, i) => (hb.length > 12 && i % 2 ? null : <text key={i} x={m.l + i * step} y={m.t + ph + 16} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0B1220">{tidy(v)}</text>))}
        <text x={m.l + pw / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="#475569">classes of width {tidy(hb[0].hi - hb[0].lo)} · bar height = frequency</text>
      </g>
    );
  }

  return (
    <Floating p={s} host={host} title="Chart maker" icon="chart" width={width} onChange={onChange}>
      <div className="p-2.5">
        {s.title && <p className="mb-1 text-center text-sm font-black">{s.title}</p>}
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-xl bg-white ring-1 ring-slate-200" role="img" aria-label={`${KINDS.find((k) => k[0] === s.kind)![1]}${s.title ? `: ${s.title}` : ""}. ${alt}`} style={{ fontFamily: FONT }}>{chart}</svg>

        {st && (
          <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs" aria-live="polite" aria-label="Statistics">
            <p className="flex flex-wrap gap-x-4 gap-y-0.5 font-bold">
              <span>Mean <b className="font-mono text-sm">{tidy(st.s.mean)}</b></span><span>Median <b className="font-mono text-sm">{tidy(st.s.median)}</b></span>
              <span>Mode <b className="font-mono text-sm">{modeText(st.s)}</b></span><span>Range <b className="font-mono text-sm">{tidy(st.s.range)}</b></span>
            </p>
            <p className="mt-0.5 text-[11px] text-ink/50">{st.of === "list" ? `Of the ${st.s.n} numbers in the list.` : st.of === "frequency" ? `The labels are scores and the values are how many: ${st.s.n} altogether.` : `Of the ${st.s.n} values in the table.`}</p>
            {s.working && (
              <ul className="mt-1 grid gap-0.5 border-t border-slate-200 pt-1 text-[11px] text-ink/75">
                <li>Mean = total ÷ how many = {tidy(st.s.sum)} ÷ {st.s.n} = <b>{tidy(st.s.mean)}</b></li>
                <li>In order: {st.s.sorted.length > 24 ? `${st.s.sorted.slice(0, 24).map((v) => tidy(v)).join(", ")}, …` : st.s.sorted.map((v) => tidy(v)).join(", ")}</li>
                <li>Median = {st.s.n % 2 ? `the middle one (number ${(st.s.n + 1) / 2})` : `halfway between numbers ${st.s.n / 2} and ${st.s.n / 2 + 1}`} = <b>{tidy(st.s.median)}</b></li>
                <li>Mode = the one that comes up most = <b>{modeText(st.s)}</b></li>
                <li>Range = biggest − smallest = {tidy(st.s.max)} − {tidy(st.s.min)} = <b>{tidy(st.s.range)}</b></li>
              </ul>
            )}
          </div>
        )}

        {host && (
          <div className="mt-2 grid gap-1.5">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Kind of chart">
              {KINDS.map(([k, label]) => <button key={k} type="button" aria-pressed={s.kind === k} className={s.kind === k ? chipOn : chip} onClick={() => set({ kind: k })}>{label}</button>)}
            </div>
            <div className="flex flex-wrap gap-1">
              <button type="button" aria-pressed={s.stats} className={s.stats ? chipOn : chip} onClick={() => set({ stats: !s.stats })}>Mean, median, mode, range</button>
              {s.stats && <button type="button" aria-pressed={s.working} className={s.working ? chipOn : chip} onClick={() => set({ working: !s.working })}>Show working</button>}
              <button type="button" aria-expanded={editing} className={`${chip} ml-auto`} onClick={() => setEditing(!editing)}>{editing ? "Hide the data" : "Edit the data"}</button>
            </div>
            {editing && <input value={s.title} maxLength={40} onChange={(e) => set({ title: e.target.value }, false)} onBlur={() => set({})} placeholder="Title" aria-label="Chart title" className={`${field} w-full`} />}
            {!editing ? null : s.kind === "hist" ? (
              <>
                <label className="text-[11px] font-black text-ink/60">Numbers (commas or spaces between them)
                  <textarea value={draft} rows={2} onChange={(e) => { setDraft(e.target.value); set({ list: parseList(e.target.value) }, false); }} onBlur={() => set({})} aria-label="List of numbers" className={`${field} mt-0.5 w-full py-1.5 font-mono`} />
                </label>
                <label className="flex items-center gap-2 text-[11px] font-black text-ink/60">Class width
                  <input type="number" min={0.1} step="any" value={s.width} onChange={(e) => set({ width: Number(e.target.value) || 1 }, false)} onBlur={() => set({})} className={`${field} w-20`} />
                </label>
              </>
            ) : (
              <div className="grid gap-1" role="group" aria-label="Data table">
                <div className="grid grid-cols-[1fr_5.5rem_2rem] gap-1 text-[11px] font-black text-ink/60"><span>Label</span><span>Value</span><span /></div>
                {s.rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_5.5rem_2rem] gap-1">
                    <input value={r.label} maxLength={16} onChange={(e) => setRow(i, { label: e.target.value })} onBlur={() => set({})} aria-label={`Label ${i + 1}`} className={field} />
                    <input type="number" min={0} step="any" value={r.value} onChange={(e) => setRow(i, { value: Math.max(0, Number(e.target.value) || 0) })} onBlur={() => set({})} aria-label={`Value ${i + 1}`} className={`${field} font-mono`} />
                    <button type="button" className="h-8 text-ink/40 hover:text-red-600 disabled:opacity-30" aria-label={`Remove row ${i + 1}`} disabled={s.rows.length <= 1} onClick={() => set({ rows: s.rows.filter((_, j) => j !== i) })}>×</button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1">
                  <button type="button" className={chip} disabled={s.rows.length >= CHART_ROWS} onClick={() => set({ rows: [...s.rows, { label: "", value: 0 }] })}>+ Add row</button>
                  <button type="button" className={chip} onClick={() => set({ rows: [{ label: "", value: 0 }, { label: "", value: 0 }, { label: "", value: 0 }], title: "" })}>Clear table</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Floating>
  );
}
