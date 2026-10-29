"use client";
import { useEffect, useRef, useState } from "react";
import { Panel, Slider, Readout, LabButton, Segmented, Insight, Challenge, Chart } from "@/components/lab/LabUI";
import { GRAVITY, pendulumPeriod, pendulumAngle } from "@/lib/lab/sims";

const C = "#F59E0B";
type Reading = { L: number; T: number; planet: string };

export default function Pendulum() {
  const [L, setL] = useState(1);
  const [planet, setPlanet] = useState("Earth");
  const [amp, setAmp] = useState(15);
  const [running, setRunning] = useState(true);
  const [t, setT] = useState(0);
  const [timing, setTiming] = useState<{ start: number } | null>(null);
  const [measured, setMeasured] = useState<number | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const g = GRAVITY.find((p) => p.label === planet)!.g;
  const T = pendulumPeriod(L, g);
  const raf = useRef<number>();
  const last = useRef<number>();
  const elapsed = useRef(0);

  // Animate with real time so the swing speed is physically honest.
  useEffect(() => {
    if (!running) { last.current = undefined; return; }
    const step = (now: number) => {
      if (last.current !== undefined) {
        elapsed.current += (now - last.current) / 1000;
        setT(elapsed.current);
      }
      last.current = now;
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); last.current = undefined; };
  }, [running]);

  // Changing the setup restarts the swing from its release point.
  useEffect(() => { elapsed.current = 0; setT(0); setMeasured(null); setTiming(null); }, [L, g, amp]);

  const angle = pendulumAngle(amp, L, g, t);
  const swingsDone = timing ? Math.floor((t - timing.start) / T) : 0;

  // Stop the stopwatch automatically after 10 full swings.
  useEffect(() => {
    if (timing && t - timing.start >= 10 * T) {
      // Human reaction time adds a little noise, like a real stopwatch.
      const noise = (Math.random() - 0.5) * 0.3;
      setMeasured(10 * T + noise);
      setTiming(null);
    }
  }, [t, timing, T]);

  // Drawing: pivot at top centre, length scaled so 2 m fills the stage.
  const len = 40 + (L / 2) * 210;
  const rad = (angle * Math.PI) / 180;
  const bx = 200 + len * Math.sin(rad), by = 30 + len * Math.cos(rad);

  function record() {
    if (measured === null) return;
    setReadings((r) => [...r, { L, T: measured / 10, planet }].sort((a, b) => a.L - b.L));
  }

  const planetReadings = readings.filter((r) => r.planet === planet);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-5">
        <Panel title="Apparatus">
          <svg viewBox="0 0 400 300" className="h-auto w-full rounded-2xl bg-black/30" role="img" aria-label={`Pendulum of length ${L} metres swinging at ${angle.toFixed(0)} degrees`}>
            <rect x="120" y="18" width="160" height="12" rx="4" fill="#475569" />
            <line x1="200" y1="30" x2="200" y2={30 + len + 20} stroke="rgba(255,255,255,.12)" strokeDasharray="4 6" />
            {/* release arc */}
            <path d={`M ${200 + len * Math.sin((-amp * Math.PI) / 180)} ${30 + len * Math.cos((amp * Math.PI) / 180)} A ${len} ${len} 0 0 0 ${200 + len * Math.sin((amp * Math.PI) / 180)} ${30 + len * Math.cos((amp * Math.PI) / 180)}`}
              fill="none" stroke={`${C}55`} strokeWidth="2" strokeDasharray="3 5" />
            <line x1="200" y1="30" x2={bx} y2={by} stroke="#CBD5E1" strokeWidth="2" />
            <circle cx="200" cy="30" r="5" fill="#E2E8F0" />
            <circle cx={bx} cy={by} r="17" fill="url(#bob)" stroke="#fff" strokeOpacity=".4" />
            <defs>
              <radialGradient id="bob" cx="35%" cy="30%"><stop offset="0%" stopColor="#FDE68A" /><stop offset="70%" stopColor={C} /><stop offset="100%" stopColor="#92400E" /></radialGradient>
            </defs>
          </svg>
          <div className="mt-4 flex flex-wrap gap-2">
            <LabButton color={C} onClick={() => setRunning((r) => !r)}>{running ? "⏸ Pause" : "▶ Swing"}</LabButton>
            <LabButton variant="ghost" onClick={() => { setMeasured(null); setTiming({ start: t }); setRunning(true); }} disabled={!!timing}>
              ⏱ Time 10 swings
            </LabButton>
            <LabButton variant="ghost" onClick={record} disabled={measured === null}>＋ Record reading</LabButton>
          </div>
          {timing && <p className="mt-3 text-sm font-semibold text-amber-300">Timing… swing {Math.min(10, swingsDone + 1)} of 10 · {(t - timing.start).toFixed(2)} s</p>}
          {measured !== null && <p className="elab-pop mt-3 text-sm font-semibold text-emerald-300">10 swings took {measured.toFixed(2)} s → one swing ≈ {(measured / 10).toFixed(3)} s</p>}
        </Panel>
        <Panel title="Setup">
          <div className="space-y-5">
            <Segmented label="Planet" color={C} value={planet} onChange={setPlanet}
              options={GRAVITY.map((p) => ({ value: p.label, label: p.label }))} />
            <Slider label="Length (L)" value={L} min={0.2} max={2} step={0.05} unit=" m" color={C} onChange={setL} format={(v) => v.toFixed(2)} />
            <Slider label="Release angle" value={amp} min={5} max={30} unit="°" color={C} onChange={setAmp} />
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Readout label="Gravity g" value={g.toFixed(2)} unit="m/s²" color={C} />
          <Readout label="Theory T = 2π√(L/g)" value={T.toFixed(3)} unit="s" color="#34D399" />
          <Readout label="Angle now" value={angle.toFixed(1)} unit="°" color="#38BDF8" />
          <Readout label="Readings" value={planetReadings.length} color="#F472B6" />
        </div>
        <Panel title={`T² against L (${planet})`}>
          <Chart title="Period squared against length" xLabel="Length L (m)" yLabel="T² (s²)" xMax={2} yMax={Math.max(2, ...planetReadings.map((r) => r.T * r.T), (4 * Math.PI ** 2 * 2) / g)}
            series={[
              { points: [[0, 0], [2, (4 * Math.PI ** 2 * 2) / g]], color: "#34D399", dashed: true },
              { points: planetReadings.map((r) => [r.L, r.T * r.T] as [number, number]), color: "#F472B6", kind: "dots" },
            ]} />
          {planetReadings.length > 0 && (
            <table className="mt-3 w-full text-left text-xs text-white/70">
              <thead><tr className="text-white/40"><th className="py-1">L (m)</th><th>T (s)</th><th>T² (s²)</th></tr></thead>
              <tbody>{planetReadings.map((r, i) => (
                <tr key={i} className="border-t border-white/5 font-mono"><td className="py-1">{r.L.toFixed(2)}</td><td>{r.T.toFixed(3)}</td><td>{(r.T * r.T).toFixed(3)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Panel>
        <Insight color={C}>
          The period depends only on <b>length</b> and <b>gravity</b> — not on the release angle (for small swings) or
          the mass. T² is proportional to L, so your readings lie on a straight line through the origin with gradient
          4π²/g. That&apos;s how scientists measure g!
        </Insight>
        <Challenge>Take readings at 5 different lengths, then switch to the Moon. Why does the same pendulum swing so much slower there?</Challenge>
      </div>
    </div>
  );
}
