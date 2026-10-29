"use client";
import { useEffect, useRef, useState } from "react";
import { Panel, Slider, Readout, Insight, Challenge, LabButton, Chart } from "@/components/lab/LabUI";
import { chargeC, copperDepositedG } from "@/lib/lab/sims";

const C = "#F472B6";
const RUN_S = 30 * 60; // 30 simulated minutes

export default function Electrolysis() {
  const [current, setCurrent] = useState(0.5);
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const [readings, setReadings] = useState<{ I: number; t: number; m: number }[]>([]);
  const tRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    let raf = 0, last = performance.now();
    const step = (now: number) => {
      // 30 minutes plays in 15 seconds.
      const next = Math.min(RUN_S, tRef.current + ((now - last) / 1000) * (RUN_S / 15));
      last = now; tRef.current = next; setT(next);
      if (next >= RUN_S) { setRunning(false); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const Q = chargeC(current, t);
  const mass = copperDepositedG(current, t);
  const grow = Math.min(14, mass * 18);   // drawn copper layer on the cathode
  const shrink = Math.min(14, mass * 18); // anode wears away
  function reset() { setRunning(false); tRef.current = 0; setT(0); }
  function record() {
    setReadings((r) => [...r, { I: current, t: Math.round(t), m: +mass.toFixed(3) }]);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
      <div className="space-y-5">
        <Panel title="Copper(II) sulfate with copper electrodes">
          <svg viewBox="0 0 320 300" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={`${mass.toFixed(3)} grams of copper deposited on the cathode`}>
            {/* power supply + wires */}
            <rect x="110" y="14" width="100" height="36" rx="6" fill="#1E293B" stroke="#475569" />
            <text x="160" y="37" fontSize="12" textAnchor="middle" fill="#FDE68A" fontWeight="700">{current.toFixed(2)} A</text>
            <path d="M110 32 H90 V80" stroke="#EF4444" strokeWidth="3" fill="none" />
            <path d="M210 32 H230 V80" stroke="#3B82F6" strokeWidth="3" fill="none" />
            <text x="80" y="70" fontSize="12" fill="#FCA5A5" textAnchor="end">+ anode</text>
            <text x="240" y="70" fontSize="12" fill="#93C5FD">− cathode</text>
            {/* beaker with blue solution */}
            <path d="M50 100 V260 Q50 272 62 272 H258 Q270 272 270 260 V100" fill="none" stroke="#CBD5E1" strokeWidth="3" />
            <rect x="53" y="130" width="214" height="139" fill="#2563EB" opacity=".45" />
            {/* electrodes */}
            <rect x={82 + (14 - (14 - shrink)) / 2} y="80" width={Math.max(4, 16 - shrink * 0.6)} height="160" rx="2" fill="#C2703D" />
            <rect x="222" y="80" width="16" height="160" rx="2" fill="#C2703D" />
            <rect x={222 - grow / 2} y="130" width={16 + grow} height="110" rx="3" fill="#E7A16B" opacity={t > 0 ? 0.9 : 0} />
            {/* ions drifting to the cathode */}
            {running && Array.from({ length: 10 }, (_, i) => {
              const x = 100 + ((t / 12 + i * 37) % 115);
              return <text key={i} x={x} y={150 + (i * 23) % 110} fontSize="10" fill="#BFDBFE">Cu²⁺</text>;
            })}
          </svg>
          <div className="mt-4 flex flex-wrap gap-2">
            <LabButton color={C} onClick={() => setRunning((r) => !r)} disabled={t >= RUN_S}>{running ? "Pause" : t ? "Resume" : "Switch on"}</LabButton>
            <LabButton variant="ghost" onClick={record} disabled={!t}>＋ Record</LabButton>
            <LabButton variant="ghost" onClick={reset}>Reset</LabButton>
          </div>
        </Panel>
        <Panel title="Current">
          <Slider label="Current I" value={current} min={0.1} max={2} step={0.05} unit=" A" color={C}
            format={(v) => v.toFixed(2)} onChange={(v) => { setCurrent(v); reset(); }} />
        </Panel>
      </div>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Time" value={(t / 60).toFixed(1)} unit="min" color="#FDE68A" />
          <Readout label="Charge Q = It" value={Math.round(Q)} unit="C" color="#38BDF8" />
          <Readout label="Copper gained" value={mass.toFixed(3)} unit="g" color={C} />
        </div>
        <Panel title="Mass of copper against charge">
          <Chart title="Mass of copper against charge" xLabel="Charge (C)" yLabel="Mass (g)" xMax={3600} yMax={1.2}
            series={[
              { points: [[0, 0], [3600, copperDepositedG(1, 3600)]], color: "rgba(255,255,255,.35)", dashed: true },
              { points: readings.map((r) => [r.I * r.t, r.m] as [number, number]), color: C, kind: "dots" },
            ]} />
          {readings.length > 0 && (
            <table className="mt-3 w-full text-left text-xs text-white/70">
              <thead><tr className="text-white/40"><th className="py-1">I (A)</th><th>t (s)</th><th>Q (C)</th><th>Mass (g)</th></tr></thead>
              <tbody>{readings.map((r, i) => (
                <tr key={i} className="border-t border-white/5 font-mono"><td className="py-1">{r.I.toFixed(2)}</td><td>{r.t}</td><td>{Math.round(r.I * r.t)}</td><td>{r.m}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Panel>
        <Insight color={C}>
          At the cathode <b>Cu²⁺ + 2e⁻ → Cu</b>; the copper anode dissolves at the same rate, so the solution stays blue.
          Mass deposited is proportional to charge (<b>Faraday&apos;s first law</b>): 2 × 96 500 C deposit one mole (63.5 g) of copper.
        </Insight>
        <Challenge>Record at least four runs with different currents. Do all your points lie on one straight line through the origin?</Challenge>
      </div>
    </div>
  );
}
