"use client";
import { useEffect, useRef, useState } from "react";
import { Panel, Slider, Readout, LabButton, Segmented, Insight, Challenge, Chart } from "@/components/lab/LabUI";
import { GRAVITY, flightTime, projectileRange, maxHeight, projectilePos } from "@/lib/lab/sims";

const C = "#F59E0B";
const W = 480, H = 260, GROUND = 230, LEFT = 30;
type Shot = { angle: number; range: number; planet: string };

export default function Projectile() {
  const [v, setV] = useState(20);
  const [angle, setAngle] = useState(45);
  const [planet, setPlanet] = useState("Earth");
  const [t, setT] = useState<number | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const raf = useRef<number>();
  const g = GRAVITY.find((p) => p.label === planet)!.g;
  const T = flightTime(v, angle, g), Rg = projectileRange(v, angle, g), Hm = maxHeight(v, angle, g);

  // Scale so the longest possible shot (45° at top speed) fits the screen.
  const maxR = projectileRange(30, 45, g);
  const scale = Math.min((W - LEFT - 20) / maxR, (GROUND - 20) / maxHeight(30, 85, g));
  const toSvg = (x: number, y: number) => [LEFT + x * scale, GROUND - y * scale] as const;

  function launch() {
    if (raf.current) cancelAnimationFrame(raf.current);
    const start = performance.now();
    const speedUp = Math.max(1, T / 2.5); // keep long flights watchable
    const step = (now: number) => {
      const tt = ((now - start) / 1000) * speedUp;
      if (tt >= T) {
        setT(T);
        setShots((s) => [...s, { angle, range: Rg, planet }].slice(-24));
        return;
      }
      setT(tt);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);
  useEffect(() => { setT(null); }, [v, angle, planet]);

  const trail = t === null ? [] : Array.from({ length: 41 }, (_, i) => projectilePos(v, angle, (t * i) / 40, g));
  const ball = t === null ? { x: 0, y: 0 } : projectilePos(v, angle, t, g);
  const [bx, by] = toSvg(ball.x, ball.y);
  const mine = shots.filter((s) => s.planet === planet);
  const curve = Array.from({ length: 19 }, (_, i) => [5 * i, projectileRange(v, 5 * i, g)] as [number, number]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <div className="space-y-5">
        <Panel title="Launch site">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-2xl bg-gradient-to-b from-sky-900/40 to-black/30" role="img"
            aria-label={`Projectile launched at ${v} metres per second, ${angle} degrees. Range ${Rg.toFixed(1)} metres.`}>
            <rect x="0" y={GROUND} width={W} height={H - GROUND} fill="rgba(132,204,22,.25)" />
            {[0.25, 0.5, 0.75, 1].map((f) => {
              const [x] = toSvg(maxR * f, 0);
              return <g key={f}><line x1={x} x2={x} y1={GROUND} y2={GROUND + 6} stroke="rgba(255,255,255,.5)" />
                <text x={x} y={GROUND + 18} fontSize="10" textAnchor="middle" fill="rgba(255,255,255,.5)">{Math.round(maxR * f)} m</text></g>;
            })}
            {/* predicted path */}
            <polyline fill="none" stroke="rgba(255,255,255,.15)" strokeDasharray="4 5"
              points={Array.from({ length: 41 }, (_, i) => projectilePos(v, angle, (T * i) / 40, g)).map((p) => toSvg(p.x, p.y).join(",")).join(" ")} />
            <polyline fill="none" stroke={C} strokeWidth="2.5" points={trail.map((p) => toSvg(p.x, p.y).join(",")).join(" ")} />
            {/* cannon */}
            <g transform={`translate(${LEFT} ${GROUND}) rotate(${-angle})`}>
              <rect x="-4" y="-7" width="34" height="14" rx="5" fill="#94A3B8" stroke="#E2E8F0" strokeOpacity=".5" />
            </g>
            <circle cx={LEFT} cy={GROUND} r="10" fill="#475569" />
            <circle cx={bx} cy={by} r="7" fill="url(#ball)" />
            <defs><radialGradient id="ball" cx="35%" cy="30%"><stop offset="0%" stopColor="#FDE68A" /><stop offset="100%" stopColor="#B45309" /></radialGradient></defs>
            {t !== null && t >= T && (() => {
              const [lx] = toSvg(Rg, 0);
              return <text x={lx} y={GROUND - 14} textAnchor="middle" fontSize="11" fontWeight="800" fill="#FDE68A" className="elab-pop">{Rg.toFixed(1)} m</text>;
            })()}
          </svg>
          <div className="mt-4 flex flex-wrap gap-2">
            <LabButton color={C} onClick={launch}>🚀 Launch</LabButton>
            <LabButton variant="ghost" onClick={() => setShots((s) => s.filter((x) => x.planet !== planet))} disabled={!mine.length}>Clear readings</LabButton>
          </div>
        </Panel>
        <Panel title="Setup">
          <div className="space-y-5">
            <Slider label="Launch speed" value={v} min={5} max={30} unit=" m/s" color={C} onChange={setV} />
            <Slider label="Launch angle" value={angle} min={5} max={85} unit="°" color="#38BDF8" onChange={setAngle} />
            <Segmented label="Planet" value={planet} onChange={setPlanet} color={C} options={GRAVITY.map((p) => ({ value: p.label, label: p.label }))} />
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Range" value={Rg.toFixed(1)} unit="m" color={C} />
          <Readout label="Max height" value={Hm.toFixed(1)} unit="m" color="#38BDF8" />
          <Readout label="Flight time" value={T.toFixed(2)} unit="s" color="#34D399" />
        </div>
        <Panel title={`Range against angle at ${v} m/s (${planet})`}>
          <Chart title="Range against launch angle" xLabel="Angle (°)" yLabel="Range (m)" xMax={90} yMax={Math.max(10, projectileRange(v, 45, g) * 1.1)} xTicks={6}
            series={[{ points: curve, color: "#34D399", dashed: true }, { points: mine.map((s) => [s.angle, s.range] as [number, number]), color: "#F472B6", kind: "dots" }]} />
        </Panel>
        <Insight color={C}>
          Horizontally the ball moves at a steady v cos θ; vertically it slows, stops and falls under gravity. The range
          R = v² sin 2θ ⁄ g is greatest at <b>45°</b>, and pairs of angles that add to 90° (like 30° and 60°) land in the
          same place.
        </Insight>
        <Challenge>Launch at 30° and at 60°. What do you notice? Now try the Moon — how much further does it go, and why?</Challenge>
      </div>
    </div>
  );
}
