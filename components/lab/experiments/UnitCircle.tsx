"use client";
import { useEffect, useRef, useState } from "react";
import { Panel, Slider, Readout, LabButton, Insight, Challenge, Chart } from "@/components/lab/LabUI";
import { unitPoint, quadrant, ASTC } from "@/lib/lab/sims";

const C = "#38BDF8", SIN = "#F472B6", COS = "#34D399";
const R = 120, CX = 160, CY = 150;
const fix = (v: number) => (Math.abs(v) < 5e-4 ? "0.000" : v.toFixed(3));

export default function UnitCircle() {
  const [deg, setDeg] = useState(30);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number>();

  useEffect(() => {
    if (!playing) return;
    let last: number | undefined;
    const step = (now: number) => {
      if (last !== undefined) setDeg((d) => (d + ((now - last!) / 1000) * 45) % 360);
      last = now;
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing]);

  const d = Math.round(deg);
  const p = unitPoint(d);
  const q = quadrant(d);
  const tanUndefined = Math.abs(p.x) < 1e-9;
  const px = CX + p.x * R, py = CY - p.y * R;
  const wave = (f: (t: number) => number) =>
    Array.from({ length: Math.floor(d / 5) + 1 }, (_, i) => [i * 5, f(i * 5)] as [number, number]).concat([[d, f(d)]]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        <Panel title="Unit circle (radius 1)">
          <svg viewBox="0 0 320 304" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={`Angle ${d} degrees: cos = ${fix(p.x)}, sin = ${fix(p.y)}`}>
            {/* ASTC quadrant labels */}
            {([[1, CX + 70, CY - 95], [2, CX - 70, CY - 95], [3, CX - 70, CY + 105], [4, CX + 70, CY + 105]] as const).map(([k, x, y]) => (
              <text key={k} x={x} y={y} textAnchor="middle" fontSize="13" fontWeight="800"
                fill={q === k ? "#FACC15" : "rgba(255,255,255,.25)"}>{ASTC[k]}</text>
            ))}
            <line x1={20} x2={300} y1={CY} y2={CY} stroke="rgba(255,255,255,.3)" />
            <line x1={CX} x2={CX} y1={10} y2={290} stroke="rgba(255,255,255,.3)" />
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
            {/* angle arc */}
            <path d={`M ${CX + 28} ${CY} A 28 28 0 ${d > 180 ? 1 : 0} 0 ${CX + 28 * p.x} ${CY - 28 * p.y}`} fill="none" stroke="#FACC15" strokeWidth="2.5" />
            <text x={CX + 34} y={CY - 8} fontSize="11" fill="#FACC15" fontWeight="700">{d}°</text>
            {/* cos (horizontal) and sin (vertical) legs */}
            <line x1={CX} y1={CY} x2={px} y2={CY} stroke={COS} strokeWidth="4" strokeLinecap="round" />
            <line x1={px} y1={CY} x2={px} y2={py} stroke={SIN} strokeWidth="4" strokeLinecap="round" />
            <line x1={CX} y1={CY} x2={px} y2={py} stroke="#fff" strokeWidth="2" />
            <circle cx={px} cy={py} r="7" fill={C} stroke="#070B1A" strokeWidth="2" />
            <text x={CX} y="294" fontSize="12" fontWeight="700" textAnchor="middle" fill="rgba(255,255,255,.8)">
              P = (cos θ, sin θ) = ({fix(p.x)}, {fix(p.y)})
            </text>
          </svg>
          <div className="mt-4 space-y-4">
            <Slider label="Angle θ" value={d} min={0} max={360} unit="°" color="#FACC15" onChange={(v) => { setPlaying(false); setDeg(v); }} />
            <div className="flex flex-wrap gap-2">
              <LabButton color="#FACC15" onClick={() => setPlaying((x) => !x)}>{playing ? "⏸ Pause" : "▶ Spin"}</LabButton>
              {[30, 45, 60, 120, 210, 300].map((a) => (
                <LabButton key={a} variant="ghost" onClick={() => { setPlaying(false); setDeg(a); }}>{a}°</LabButton>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="sin θ" value={fix(p.y)} color={SIN} />
          <Readout label="cos θ" value={fix(p.x)} color={COS} />
          <Readout label="tan θ" value={tanUndefined ? "undefined" : fix(p.y / p.x)} color={C} />
        </div>
        <Panel title="The waves traced out">
          <Chart title="sin and cos against angle" xLabel="θ (degrees)" yLabel="value" xMax={360} yMin={-1} yMax={1} xTicks={4} yTicks={4} markerX={d}
            series={[{ points: wave((t) => unitPoint(t).y), color: SIN }, { points: wave((t) => unitPoint(t).x), color: COS }]} />
          <p className="mt-2 text-xs text-white/50"><span style={{ color: SIN }}>■</span> sin θ &nbsp; <span style={{ color: COS }}>■</span> cos θ</p>
        </Panel>
        <Insight color={C}>
          On a circle of radius 1 the point at angle θ is exactly <b>(cos θ, sin θ)</b>. As it goes round, the height
          traces the sine wave and the horizontal position traces the cosine wave. The quadrant tells you the signs:
          {" "}<b>A</b>ll positive, then <b>S</b>in, <b>T</b>an, <b>C</b>os — &quot;All Students Take Calculus&quot;.
        </Insight>
        <Challenge>Find two angles between 0° and 360° where sin θ = 0.5. Why is tan 90° undefined?</Challenge>
      </div>
    </div>
  );
}
