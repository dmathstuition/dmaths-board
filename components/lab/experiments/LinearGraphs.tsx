"use client";
import { useState } from "react";
import { Panel, Slider, Readout, Insight, Challenge } from "@/components/lab/LabUI";
import { intersection } from "@/lib/lab/sims";

const C = "#38BDF8";
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
const signed = (n: number) => fmt(n).replace("-", "−");
function eq(m: number, c: number) {
  const mx = m === 0 ? "" : m === 1 ? "x" : m === -1 ? "−x" : `${signed(m)}x`;
  const cc = c === 0 ? "" : !mx ? signed(c) : c > 0 ? ` + ${fmt(c)}` : ` − ${fmt(-c)}`;
  return `y = ${mx + cc || "0"}`;
}

export default function LinearGraphs() {
  const [m1, setM1] = useState(2);
  const [c1, setC1] = useState(1);
  const [m2, setM2] = useState(-1);
  const [c2, setC2] = useState(4);
  const sol = intersection(m1, c1, m2, c2);

  // Grid −10..10 both ways, 15 px per unit, origin at (170,170).
  const U = 15, O = 170;
  const X = (x: number) => O + x * U, Y = (y: number) => O - y * U;
  const line = (m: number, c: number) => `${X(-11)},${Y(m * -11 + c)} ${X(11)},${Y(m * 11 + c)}`;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        <Panel title="Graph">
          <svg viewBox="0 0 340 340" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={typeof sol === "string" ? `Lines are ${sol}` : `Lines meet at (${fmt(sol.x)}, ${fmt(sol.y)})`}>
            <defs><clipPath id="lgclip"><rect x="20" y="20" width="300" height="300" /></clipPath></defs>
            {Array.from({ length: 21 }, (_, i) => i - 10).map((v) => (
              <g key={v}>
                <line x1={X(v)} x2={X(v)} y1={Y(10)} y2={Y(-10)} stroke={v === 0 ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.07)"} />
                <line y1={Y(v)} y2={Y(v)} x1={X(-10)} x2={X(10)} stroke={v === 0 ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.07)"} />
                {v !== 0 && v % 2 === 0 && <text x={X(v)} y={O + 12} fontSize="8" textAnchor="middle" fill="rgba(255,255,255,.4)">{v}</text>}
                {v !== 0 && v % 2 === 0 && <text x={O - 4} y={Y(v) + 3} fontSize="8" textAnchor="end" fill="rgba(255,255,255,.4)">{v}</text>}
              </g>
            ))}
            <g clipPath="url(#lgclip)">
              <polyline points={line(m1, c1)} stroke={C} strokeWidth="3" />
              <polyline points={line(m2, c2)} stroke="#F472B6" strokeWidth="3" />
              {/* gradient triangle on line 1 */}
              <path d={`M${X(0)},${Y(c1)} H${X(1)} V${Y(m1 + c1)}`} fill="none" stroke="#FDE68A" strokeDasharray="3 3" />
              {typeof sol !== "string" && Math.abs(sol.x) <= 10 && Math.abs(sol.y) <= 10 && (
                <g><circle cx={X(sol.x)} cy={Y(sol.y)} r="7" fill="#FDE68A" stroke="#070B1A" strokeWidth="2" /></g>
              )}
            </g>
            <text x="26" y="34" fontSize="12" fontWeight="700" fill={C}>{eq(m1, c1)}</text>
            <text x="26" y="50" fontSize="12" fontWeight="700" fill="#F9A8D4">{eq(m2, c2)}</text>
          </svg>
        </Panel>
        <div className="grid grid-cols-2 gap-3">
          <Readout label="Solution" value={sol === "parallel" ? "None" : sol === "same" ? "Infinite" : `(${fmt(sol.x)}, ${fmt(sol.y)})`} color="#FDE68A" />
          <Readout label="Gradients" value={`${fmt(m1)} and ${fmt(m2)}`} color={C} />
        </div>
      </div>
      <div className="space-y-5">
        <Panel title="Line 1 (blue)">
          <div className="space-y-4">
            <Slider label="Gradient m" value={m1} min={-5} max={5} step={0.5} color={C} onChange={setM1} />
            <Slider label="Intercept c" value={c1} min={-8} max={8} color={C} onChange={setC1} />
          </div>
        </Panel>
        <Panel title="Line 2 (pink)">
          <div className="space-y-4">
            <Slider label="Gradient m" value={m2} min={-5} max={5} step={0.5} color="#F472B6" onChange={setM2} />
            <Slider label="Intercept c" value={c2} min={-8} max={8} color="#F472B6" onChange={setC2} />
          </div>
        </Panel>
        <Insight color={C}>
          In <b>y = mx + c</b>, m is the gradient (rise ÷ run, the yellow triangle) and c is where the line crosses the
          y-axis. The point where two lines cross satisfies <b>both</b> equations — it is the solution of the
          simultaneous equations. Parallel lines (equal gradients) never meet, so there is no solution.
        </Insight>
        <Challenge>Solve y = 3x − 2 and y = −x + 6 on paper, then set the sliders to check your answer.</Challenge>
      </div>
    </div>
  );
}
