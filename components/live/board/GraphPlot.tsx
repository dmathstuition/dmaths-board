"use client";
// Plotting a graph in an exam (lib/exams.ts, kind "graph"): graph paper with
// the axes drawn; tap to plot a point (tap it again to take it off), then the
// line of best fit — tap where it starts and where it ends. Points snap to
// half a small square, as you'd plot them in pencil.
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { parseGraphGiven, type GraphGiven, type Grid } from "@/lib/exams";

const W = 560, H = 520, M = { l: 66, r: 16, t: 16, b: 58 };
const PW = W - M.l - M.r, PH = H - M.t - M.b;
const tidy = (v: number) => String(Number(v.toPrecision(6)));

export default function GraphPlot({ grid, value, onChange, readOnly = false }: { grid: Grid; value: unknown; onChange: (json: string) => void; readOnly?: boolean }) {
  const g: GraphGiven = parseGraphGiven(value);
  const [mode, setMode] = useState<"plot" | "line">("plot");
  const [first, setFirst] = useState<[number, number] | null>(null); // the line's first end, waiting for the second
  const [history, setHistory] = useState<GraphGiven[]>([]);
  const svg = useRef<SVGSVGElement>(null);
  const { x0, x1, y0, y1 } = grid;
  const X = (v: number) => M.l + ((v - x0) / (x1 - x0)) * PW, Y = (v: number) => M.t + PH - ((v - y0) / (y1 - y0)) * PH;
  const snap = (v: number, lo: number, hi: number) => { const st = (hi - lo) / 100; return Math.min(hi, Math.max(lo, Math.round((v - lo) / st) * st + lo)); };
  const save = (next: GraphGiven) => { setHistory((h) => [...h.slice(-30), g]); onChange(JSON.stringify(next)); };

  function tap(e: ReactPointerEvent<SVGSVGElement>) {
    if (readOnly) return;
    const r = svg.current!.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W, sy = ((e.clientY - r.top) / r.height) * H;
    if (sx < M.l - 12 || sx > W - M.r + 12 || sy < M.t - 12 || sy > M.t + PH + 12) return;
    const x = snap(x0 + ((sx - M.l) / PW) * (x1 - x0), x0, x1), y = snap(y0 + ((M.t + PH - sy) / PH) * (y1 - y0), y0, y1);
    const pt: [number, number] = [Number(x.toPrecision(8)), Number(y.toPrecision(8))];
    if (mode === "plot") {
      const near = g.p.findIndex(([a, b]) => Math.abs(X(a) - sx) < 14 && Math.abs(Y(b) - sy) < 14);
      if (near >= 0) save({ ...g, p: g.p.filter((_, i) => i !== near) });
      else if (g.p.length < 20) save({ ...g, p: [...g.p, pt] });
      return;
    }
    if (!first) { setFirst(pt); return; }
    if (first[0] !== pt[0] || first[1] !== pt[1]) save({ ...g, l: [first, pt] });
    setFirst(null);
  }
  const undo = () => { const last = history[history.length - 1]; if (!last) return; setHistory((h) => h.slice(0, -1)); onChange(JSON.stringify(last)); };
  const clear = () => { if (!g.p.length && !g.l) return; save({ p: [], l: null }); setFirst(null); };

  // A curve: drawn smoothly through the points, in order across.
  const sorted = [...g.p].sort((a, b) => a[0] - b[0]);
  const curve = grid.curve && sorted.length >= 3 ? sorted.map(([x, y], i) => {
    if (!i) return `M${X(x)},${Y(y)}`;
    const p0 = sorted[Math.max(0, i - 2)], p1 = sorted[i - 1], p2 = sorted[i], p3 = sorted[Math.min(sorted.length - 1, i + 1)];
    const c1 = [X(p1[0]) + (X(p2[0]) - X(p0[0])) / 6, Y(p1[1]) + (Y(p2[1]) - Y(p0[1])) / 6], c2 = [X(p2[0]) - (X(p3[0]) - X(p1[0])) / 6, Y(p2[1]) - (Y(p3[1]) - Y(p1[1])) / 6];
    return `C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${X(x)},${Y(y)}`;
  }).join(" ") : null;
  const btn = (on: boolean) => `min-h-[44px] rounded-xl px-3 text-sm font-black ring-2 ${on ? "bg-[#C2451C] text-white ring-[#C2451C]" : "bg-white text-[#C2451C] ring-orange-200"}`;

  return (
    <div className="mt-3">
      {!readOnly && (
        <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Graph tools">
          <button type="button" aria-pressed={mode === "plot"} onClick={() => { setMode("plot"); setFirst(null); }} className={btn(mode === "plot")}>✕ Plot points</button>
          {!grid.curve && <button type="button" aria-pressed={mode === "line"} onClick={() => setMode("line")} className={btn(mode === "line")}>／ Line of best fit</button>}
          <button type="button" onClick={undo} disabled={!history.length} className="min-h-[44px] rounded-xl bg-orange-50 px-3 text-sm font-black text-[#C2451C] disabled:opacity-40">↩ Undo</button>
          <button type="button" onClick={clear} className="min-h-[44px] rounded-xl px-3 text-xs font-black text-ink/55 underline decoration-dotted">Clear</button>
        </div>
      )}
      <p className="mb-1 text-xs font-bold text-ink/60" aria-live="polite">
        {readOnly ? "" : mode === "plot" ? "Tap the grid to plot each point (tap a point again to take it off)." : first ? "Now tap where the line ends." : "Tap where the line starts — balance the points either side of it."}
        {" "}{g.p.length} point{g.p.length === 1 ? "" : "s"} plotted{grid.curve ? "" : g.l ? " · line drawn" : ""}.
      </p>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full touch-none select-none rounded-xl bg-white ring-1 ring-orange-200" role="img"
        aria-label={`Graph paper: ${grid.y} against ${grid.x}. ${g.p.map(([x, y]) => `(${tidy(x)}, ${tidy(y)})`).join(", ") || "No points yet"}`}
        onPointerDown={tap} style={{ fontFamily: "system-ui, sans-serif", cursor: readOnly ? "default" : "crosshair" }}>
        {Array.from({ length: 51 }, (_, i) => (
          <g key={i}>
            <line x1={M.l + (i * PW) / 50} y1={M.t} x2={M.l + (i * PW) / 50} y2={M.t + PH} stroke={i % 5 ? "#FBD5C4" : "#F4A27F"} strokeWidth={i % 5 ? 0.6 : 1.1} />
            <line x1={M.l} y1={M.t + (i * PH) / 50} x2={M.l + PW} y2={M.t + (i * PH) / 50} stroke={i % 5 ? "#FBD5C4" : "#F4A27F"} strokeWidth={i % 5 ? 0.6 : 1.1} />
          </g>
        ))}
        <rect x={M.l} y={M.t} width={PW} height={PH} fill="none" stroke="#0F172A" strokeWidth={1.5} />
        {Array.from({ length: 11 }, (_, i) => (
          <g key={`t${i}`} fontSize={12} fill="#334155">
            <text x={M.l + (i * PW) / 10} y={M.t + PH + 18} textAnchor="middle">{tidy(x0 + (i * (x1 - x0)) / 10)}</text>
            <text x={M.l - 6} y={M.t + PH - (i * PH) / 10 + 4} textAnchor="end">{tidy(y0 + (i * (y1 - y0)) / 10)}</text>
          </g>
        ))}
        <text x={M.l + PW / 2} y={H - 10} textAnchor="middle" fontSize={15} fontWeight={800} fill="#0F172A">{grid.x}</text>
        <text transform={`translate(16,${M.t + PH / 2}) rotate(-90)`} textAnchor="middle" fontSize={15} fontWeight={800} fill="#0F172A">{grid.y}</text>
        {curve && <path d={curve} fill="none" stroke="#1E3A8A" strokeWidth={2} strokeOpacity={0.6} />}
        {g.l && <line x1={X(g.l[0][0])} y1={Y(g.l[0][1])} x2={X(g.l[1][0])} y2={Y(g.l[1][1])} stroke="#1E3A8A" strokeWidth={2.5} />}
        {g.p.map(([x, y], i) => <g key={i} stroke="#1E3A8A" strokeWidth={2.2}><line x1={X(x) - 6} y1={Y(y) - 6} x2={X(x) + 6} y2={Y(y) + 6} /><line x1={X(x) - 6} y1={Y(y) + 6} x2={X(x) + 6} y2={Y(y) - 6} /></g>)}
        {first && <circle cx={X(first[0])} cy={Y(first[1])} r={7} fill="#C2451C" />}
      </svg>
    </div>
  );
}
