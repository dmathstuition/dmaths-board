"use client";
import { useState } from "react";
import { Panel, Slider, Readout, Insight, Challenge, LabButton } from "@/components/lab/LabUI";
import { quadValue, quadRoots, vertex, discriminant } from "@/lib/lab/sims";

const C = "#38BDF8";
const X = 10, Y = 20; // plotted window: x ∈ [−10, 10], y ∈ [−20, 20]
const W = 440, H = 340;
const sx = (x: number) => ((x + X) / (2 * X)) * W;
const sy = (y: number) => H - ((y + Y) / (2 * Y)) * H;
const fmt = (v: number) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2));
// "y = x² − 2x − 3": drop unit coefficients and zero terms.
function equation(a: number, b: number, c: number): string {
  const term = (k: number, x: string, first: boolean) => {
    if (k === 0) return "";
    const mag = Math.abs(k) === 1 && x ? x : `${fmt(Math.abs(k))}${x}`;
    return first ? `${k < 0 ? "−" : ""}${mag}` : ` ${k < 0 ? "−" : "+"} ${mag}`;
  };
  const s = term(a, "x²", true) + term(b, "x", a === 0) + term(c, "", a === 0 && b === 0);
  return `y = ${s.trim() || "0"}`;
}

export default function Quadratics() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(-2);
  const [c, setC] = useState(-3);
  const aa = a === 0 ? 0.0001 : a; // a = 0 is a straight line; keep the vertex maths finite
  const roots = quadRoots(a, b, c);
  const D = discriminant(a, b, c);
  const v = vertex(aa, b, c);
  const path = Array.from({ length: 201 }, (_, i) => {
    const x = -X + (i / 200) * 2 * X;
    const y = Math.max(-Y * 3, Math.min(Y * 3, quadValue(a, b, c, x)));
    return `${i ? "L" : "M"}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`;
  }).join(" ");
  const nature = a === 0 ? "a = 0 makes it a straight line" : D > 0 ? "Two real roots — the curve crosses the x-axis twice" : D === 0 ? "One repeated root — the curve touches the x-axis" : "No real roots — the curve never meets the x-axis";

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-5">
        <Panel title="Graph" right={<span className="font-mono text-sm font-bold" style={{ color: C }}>{equation(a, b, c)}</span>}>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={`Graph of y = ${a}x² + ${b}x + ${c}. ${nature}.`}>
            {Array.from({ length: 21 }, (_, i) => i - 10).map((g) => (
              <line key={`v${g}`} x1={sx(g)} x2={sx(g)} y1={0} y2={H} stroke={g === 0 ? "rgba(255,255,255,.45)" : "rgba(255,255,255,.06)"} />
            ))}
            {Array.from({ length: 9 }, (_, i) => (i - 4) * 5).map((g) => (
              <g key={`h${g}`}>
                <line x1={0} x2={W} y1={sy(g)} y2={sy(g)} stroke={g === 0 ? "rgba(255,255,255,.45)" : "rgba(255,255,255,.06)"} />
                {g !== 0 && <text x={sx(0) + 4} y={sy(g) - 3} fontSize="10" fill="rgba(255,255,255,.4)">{g}</text>}
              </g>
            ))}
            {[-10, -5, 5, 10].map((g) => <text key={g} x={sx(g)} y={sy(0) + 13} fontSize="10" textAnchor="middle" fill="rgba(255,255,255,.4)">{g}</text>)}
            <clipPath id="quad-clip"><rect width={W} height={H} /></clipPath>
            <g clipPath="url(#quad-clip)">
              {a !== 0 && <line x1={sx(v.x)} x2={sx(v.x)} y1={0} y2={H} stroke="#F472B6" strokeDasharray="5 5" strokeOpacity=".6" />}
              <path d={path} fill="none" stroke={C} strokeWidth="3" strokeLinejoin="round" />
              {roots.map((r) => <circle key={r} cx={sx(r)} cy={sy(0)} r="6" fill="#34D399" stroke="#070B1A" strokeWidth="2" />)}
              <circle cx={sx(0)} cy={sy(c)} r="5" fill="#FACC15" stroke="#070B1A" strokeWidth="2" />
              {a !== 0 && <circle cx={sx(v.x)} cy={sy(v.y)} r="6" fill="#F472B6" stroke="#070B1A" strokeWidth="2" />}
            </g>
          </svg>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-white/60">
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#34D399]" />Roots</span>
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#F472B6]" />Turning point &amp; line of symmetry</span>
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#FACC15]" />y-intercept</span>
          </div>
        </Panel>
        <Panel title="Coefficients">
          <div className="space-y-5">
            <Slider label="a (shape & direction)" value={a} min={-3} max={3} step={0.5} color={C} onChange={setA} />
            <Slider label="b" value={b} min={-10} max={10} color="#F472B6" onChange={setB} />
            <Slider label="c (y-intercept)" value={c} min={-15} max={15} color="#FACC15" onChange={setC} />
            <div className="flex flex-wrap gap-2">
              <LabButton variant="ghost" onClick={() => { setA(1); setB(-6); setC(9); }}>Perfect square</LabButton>
              <LabButton variant="ghost" onClick={() => { setA(1); setB(0); setC(-9); }}>Difference of squares</LabButton>
              <LabButton variant="ghost" onClick={() => { setA(-1); setB(2); setC(8); }}>Upside down</LabButton>
            </div>
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Readout label="Discriminant b² − 4ac" value={fmt(D)} color={D > 0 ? "#34D399" : D === 0 ? "#FACC15" : "#F87171"} />
          <Readout label="Roots" value={roots.length ? roots.map(fmt).join(", ") : "none"} color="#34D399" />
          <Readout label="Turning point" value={a === 0 ? "—" : `(${fmt(v.x)}, ${fmt(v.y)})`} color="#F472B6" />
          <Readout label="Line of symmetry" value={a === 0 ? "—" : `x = ${fmt(v.x)}`} color="#F472B6" />
        </div>
        <Insight color={C} title={nature}>
          The discriminant b² − 4ac decides how many times the curve meets the x-axis: <b>positive</b> → two roots,
          <b> zero</b> → one, <b>negative</b> → none. When <b>a</b> is positive the curve is a ∪ with a minimum; when
          negative it is a ∩ with a maximum. The turning point always sits on the line x = −b ⁄ 2a.
        </Insight>
        <Challenge>
          Find values of a, b and c so the roots are x = 2 and x = 5. Then change only c until the curve just touches
          the x-axis — what is the discriminant now?
        </Challenge>
      </div>
    </div>
  );
}
