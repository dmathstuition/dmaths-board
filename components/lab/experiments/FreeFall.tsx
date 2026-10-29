"use client";
import { useEffect, useRef, useState } from "react";
import { Panel, Readout, Slider, Segmented, LabButton, Insight, Challenge, Chart } from "@/components/lab/LabUI";
import { PLANETS, fallTime, fallSpeed, gFromDrop, timedDrop } from "@/lib/lab/sims";

const C = "#F59E0B";
type Reading = { h: number; t: number };

export default function FreeFall() {
  const [planet, setPlanet] = useState<string>("earth");
  const [h, setH] = useState(2);
  const [y, setY] = useState(0);            // 0 = top, 1 = floor
  const [running, setRunning] = useState(false);
  const [timed, setTimed] = useState<number | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const raf = useRef(0);
  const g = PLANETS.find((p) => p.id === planet)!.g;
  const tTrue = fallTime(h, g);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  function drop() {
    cancelAnimationFrame(raf.current);
    setRunning(true); setTimed(null); setY(0);
    const start = performance.now();
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      if (reduce || t >= tTrue) { setY(1); setRunning(false); setTimed(+timedDrop(h, g).toFixed(2)); return; }
      setY((0.5 * g * t * t) / h);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }
  function record() {
    if (timed == null) return;
    setReadings((r) => [...r, { h, t: timed }]);
  }
  function pickPlanet(p: string) { setPlanet(p); setReadings([]); setTimed(null); setY(0); }

  const avgG = readings.length ? readings.reduce((s, r) => s + gFromDrop(r.h, r.t), 0) / readings.length : null;
  const top = 30, floor = 300, ballY = top + y * (floor - top);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5">
        <Panel title="Drop tower">
          <svg viewBox="0 0 300 330" className="h-auto w-full rounded-2xl bg-black/30" role="img" aria-label={`Ball dropped from ${h} metres on ${planet}`}>
            <rect x="40" y={top - 12} width="70" height="8" rx="3" fill="#475569" />
            <line x1="200" x2="200" y1={top} y2={floor} stroke="rgba(250,204,21,.6)" />
            {Array.from({ length: 11 }, (_, i) => (
              <g key={i}>
                <line x1="196" x2="204" y1={top + (i * (floor - top)) / 10} y2={top + (i * (floor - top)) / 10} stroke="rgba(250,204,21,.6)" />
                <text x="212" y={top + (i * (floor - top)) / 10 + 3} fontSize="9" fill="rgba(250,204,21,.8)">{(h - (i * h) / 10).toFixed(1)} m</text>
              </g>
            ))}
            <circle cx="75" cy={ballY} r="12" fill={C} />
            <rect x="20" y={floor + 2} width="260" height="8" fill="#334155" />
            <text x="75" y="324" fontSize="10" textAnchor="middle" fill="rgba(255,255,255,.5)">light gate</text>
          </svg>
          <div className="mt-4 flex flex-wrap gap-2">
            <LabButton color={C} onClick={drop} disabled={running}>▶ Drop</LabButton>
            <LabButton variant="ghost" onClick={record} disabled={timed == null}>＋ Record time</LabButton>
          </div>
        </Panel>
        <Panel title="Set up">
          <div className="space-y-4">
            <Segmented label="Where" value={planet} onChange={pickPlanet} color={C} options={PLANETS.map((p) => ({ value: p.id, label: p.label }))} />
            <Slider label="Drop height" value={h} min={0.5} max={10} step={0.5} unit=" m" onChange={(v) => { setH(v); setTimed(null); setY(0); }} color={C} />
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Stopwatch" value={timed ?? "—"} unit="s" color={C} />
          <Readout label="Impact speed" value={fallSpeed(h, g).toFixed(1)} unit="m/s" color="#F472B6" />
          <Readout label="Your g" value={avgG ? avgG.toFixed(2) : "—"} unit="m/s²" color="#34D399" />
        </div>
        <Panel title="Height against time²">
          <Chart title="Height against time squared" xLabel="t² (s²)" yLabel="Height (m)" xMax={Math.max(1, fallTime(10, g) ** 2 * 1.1)} yMax={10}
            series={[
              { points: [[0, 0], [fallTime(10, g) ** 2, 10]], color: "#34D399", dashed: true },
              { points: readings.map((r) => [r.t * r.t, r.h] as [number, number]), color: C, kind: "dots" },
            ]} />
          {readings.length > 0 && (
            <table className="mt-3 w-full text-left text-xs text-white/70">
              <thead><tr className="text-white/40"><th className="py-1">h (m)</th><th>t (s)</th><th>g = 2h/t² (m/s²)</th></tr></thead>
              <tbody>{readings.map((r, i) => (
                <tr key={i} className="border-t border-white/5 font-mono"><td className="py-1">{r.h}</td><td>{r.t.toFixed(2)}</td><td>{gFromDrop(r.h, r.t).toFixed(2)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Panel>
        <Insight color={C}>
          Dropped from rest, h = ½gt², so <b>g = 2h ÷ t²</b>. A graph of h against t² is a straight line with gradient
          g ÷ 2. The stopwatch includes your <b>reaction time</b>, so single drops scatter — repeat and average.
        </Insight>
        <Challenge>Take five drops from different heights on Earth and average your g. Is it close to 9.81 m/s²? Then try the Moon.</Challenge>
      </div>
    </div>
  );
}
