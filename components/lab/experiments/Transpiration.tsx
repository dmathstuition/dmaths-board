"use client";
import { useEffect, useRef, useState } from "react";
import { Panel, Slider, Readout, Insight, Challenge, LabButton, Chart } from "@/components/lab/LabUI";
import { transpirationRate, bubbleDistanceMm } from "@/lib/lab/sims";

const C = "#84CC16";
const RUN_MIN = 10;
const WIND = ["Still", "Breeze", "Windy", "Fan on full"];

export default function Transpiration() {
  const [light, setLight] = useState(60);
  const [wind, setWind] = useState(0);
  const [humidity, setHumidity] = useState(60);
  const [temp, setTemp] = useState(25);
  const [mins, setMins] = useState(0);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{ label: string; rate: number }[]>([]);
  const mRef = useRef(0);

  const rate = transpirationRate(light, wind, humidity, temp);
  const dist = bubbleDistanceMm(rate, mins);

  useEffect(() => {
    if (!running) return;
    let raf = 0, last = performance.now();
    const step = (now: number) => {
      // 10 minutes plays in 10 seconds.
      const next = Math.min(RUN_MIN, mRef.current + (now - last) / 1000);
      last = now; mRef.current = next; setMins(next);
      if (next >= RUN_MIN) { setRunning(false); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  function reset() { setRunning(false); mRef.current = 0; setMins(0); }
  function set<T>(fn: (v: T) => void) { return (v: T) => { fn(v); reset(); }; }
  function save() {
    setResults((r) => [...r, { label: `L${light} W${wind} H${humidity} ${temp}°`, rate: +(dist / Math.max(0.01, mins)).toFixed(2) }]);
  }

  const bubbleX = 60 + Math.min(230, dist * 1.2);
  const leafTilt = wind * 3;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        <Panel title="Bubble potometer">
          <svg viewBox="0 0 360 300" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={`Air bubble has moved ${dist.toFixed(1)} millimetres`}>
            {/* lamp */}
            <g opacity={0.3 + light / 140}>
              <circle cx="320" cy="40" r="16" fill="#FDE047" />
              {[0, 1, 2, 3].map((i) => <line key={i} x1="300" y1={40 + (i - 1.5) * 14} x2={275 - light / 8} y2={52 + (i - 1.5) * 22} stroke="#FDE047" strokeWidth="2" opacity=".6" />)}
            </g>
            {/* fan */}
            {wind > 0 && <g><circle cx="30" cy="70" r="16" fill="none" stroke="#94A3B8" strokeWidth="3" />
              {[0, 1, 2].map((i) => <path key={i} d={`M48 ${60 + i * 10} h${20 + wind * 10}`} stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeDasharray="6 5" />)}</g>}
            {/* leafy shoot */}
            <g transform={`rotate(${leafTilt} 170 150)`}>
              <line x1="170" y1="150" x2="170" y2="40" stroke="#4D7C0F" strokeWidth="5" />
              {[[-1, 60], [1, 75], [-1, 95], [1, 110], [-1, 128]].map(([s, y], i) => (
                <ellipse key={i} cx={170 + (s as number) * 26} cy={y as number} rx="26" ry="10" fill="#65A30D" transform={`rotate(${(s as number) * -25} ${170 + (s as number) * 26} ${y})`} />
              ))}
            </g>
            {/* bung + capillary tube */}
            <rect x="158" y="150" width="24" height="18" rx="3" fill="#78350F" />
            <path d="M170 168 V250 H330" stroke="#BAE6FD" strokeWidth="8" fill="none" strokeLinejoin="round" />
            <path d="M170 168 V250 H330" stroke="#0EA5E9" strokeWidth="4" fill="none" strokeLinejoin="round" opacity=".6" />
            <rect x="200" y="258" width="130" height="12" fill="rgba(250,204,21,.15)" stroke="rgba(250,204,21,.4)" />
            {Array.from({ length: 14 }, (_, i) => <line key={i} x1={200 + i * 10} x2={200 + i * 10} y1="258" y2={i % 5 === 0 ? 270 : 264} stroke="rgba(250,204,21,.6)" />)}
            {/* air bubble moves towards the plant */}
            <ellipse cx={330 - (bubbleX - 60) * 0.55} cy="250" rx="6" ry="3.5" fill="#F8FAFC" />
            {/* reservoir */}
            <rect x="315" y="200" width="30" height="40" rx="4" fill="rgba(14,165,233,.35)" stroke="#BAE6FD" />
            <text x="180" y="292" fontSize="11" textAnchor="middle" fill="rgba(255,255,255,.55)">Bubble moves as the shoot takes up water</text>
          </svg>
          <div className="mt-4 flex flex-wrap gap-2">
            <LabButton color={C} onClick={() => setRunning((r) => !r)} disabled={mins >= RUN_MIN}>{running ? "Pause" : mins ? "Resume" : "Start timing"}</LabButton>
            <LabButton variant="ghost" onClick={save} disabled={mins < 1}>＋ Save result</LabButton>
            <LabButton variant="ghost" onClick={reset}>Reset bubble</LabButton>
          </div>
        </Panel>
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Time" value={mins.toFixed(1)} unit="min" color="#FDE68A" />
          <Readout label="Bubble moved" value={dist.toFixed(1)} unit="mm" color="#38BDF8" />
          <Readout label="Rate" value={(rate * 4).toFixed(2)} unit="mm/min" color={C} />
        </div>
      </div>
      <div className="space-y-5">
        <Panel title="Conditions">
          <div className="space-y-4">
            <Slider label="Light intensity" value={light} min={0} max={100} step={5} unit=" %" color="#FDE047" onChange={set(setLight)} />
            <Slider label="Wind" value={wind} min={0} max={3} format={(v) => WIND[v]} color="#94A3B8" onChange={set(setWind)} />
            <Slider label="Humidity" value={humidity} min={20} max={100} step={5} unit=" %" color="#38BDF8" onChange={set(setHumidity)} />
            <Slider label="Temperature" value={temp} min={10} max={40} unit=" °C" color="#F97316" onChange={set(setTemp)} />
          </div>
        </Panel>
        {results.length > 0 && (
          <Panel title="Your results">
            <Chart title="Saved transpiration rates" xLabel="Run" yLabel="mm/min" xMin={0} xMax={results.length + 1} yMax={Math.max(2, ...results.map((r) => r.rate)) * 1.2} xTicks={results.length + 1}
              series={[{ points: results.map((r, i) => [i + 1, r.rate] as [number, number]), color: C, kind: "dots" }]} />
            <ul className="mt-2 space-y-1 font-mono text-xs text-white/60">{results.map((r, i) => <li key={i}>Run {i + 1}: {r.label} → {r.rate} mm/min</li>)}</ul>
          </Panel>
        )}
        <Insight color={C}>
          Water evaporates from leaf cells and diffuses out through the <b>stomata</b>; the shoot pulls more up the
          xylem to replace it. Light opens stomata, while wind, warmth and dry air steepen the diffusion gradient — all
          speed transpiration. Humid, still air slows it.
        </Insight>
        <Challenge>Change one factor at a time and save a result for each. Which factor has the biggest effect? Why must you keep the others fixed?</Challenge>
      </div>
    </div>
  );
}
