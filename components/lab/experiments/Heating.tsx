"use client";
import { useEffect, useRef, useState } from "react";
import { Panel, Slider, Readout, Insight, Challenge, LabButton, Chart } from "@/components/lab/LabUI";
import { heatingState, heatingStages, type Phase } from "@/lib/lab/sims";

const C = "#F59E0B";
const PHASE_LABEL: Record<Phase, string> = {
  ice: "Solid ice warming", melting: "Melting (0 °C)", water: "Liquid water warming", boiling: "Boiling (100 °C)", steam: "Steam warming",
};

export default function Heating() {
  const [power, setPower] = useState(500);   // W
  const [massG, setMassG] = useState(200);   // g
  const [t, setT] = useState(0);             // simulated seconds
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<[number, number][]>([[0, -20]]);
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);
  const tRef = useRef(0);

  const m = massG / 1000;
  const stages = heatingStages(m);
  const endT = (stages.boiledAway * 1.05) / power;
  const state = heatingState(power * t, m);

  useEffect(() => {
    if (!running) return;
    const step = (now: number) => {
      const dt = last.current === null ? 0 : (now - last.current) / 1000;
      last.current = now;
      // Speed the clock so the whole curve plays in about 25 seconds.
      const next = Math.min(endT, tRef.current + dt * (endT / 25));
      tRef.current = next;
      setT(next);
      setLog((l) => (l.length && next - l[l.length - 1][0] < endT / 160 && next < endT ? l : [...l, [next, heatingState(power * next, m).tempC]]));
      if (next >= endT) { setRunning(false); return; }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); last.current = null; };
  }, [running, endT, power, m]);

  function reset() { setRunning(false); setT(0); tRef.current = 0; setLog([[0, -20]]); }

  // Beaker illustration: contents change with phase.
  const fill = state.phase === "ice" ? "#BAE6FD" : state.phase === "steam" ? "rgba(226,232,240,.15)" : "#38BDF8";
  const iceLeft = state.phase === "ice" ? 1 : state.phase === "melting" ? 1 - state.fractionChanged : 0;
  const waterLeft = state.phase === "boiling" ? 1 - state.fractionChanged : state.phase === "steam" ? 0 : 1;
  const level = 150 - 90 * waterLeft;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-5">
        <Panel title="Apparatus">
          <svg viewBox="0 0 300 300" className="h-auto w-full rounded-2xl bg-black/30" role="img" aria-label={`${PHASE_LABEL[state.phase]}, ${state.tempC.toFixed(1)} degrees Celsius`}>
            {/* thermometer */}
            <rect x="196" y="30" width="10" height="150" rx="5" fill="rgba(255,255,255,.15)" />
            <rect x="198" y={170 - Math.max(0, Math.min(140, (state.tempC + 20) * 1.0))} width="6" height={Math.max(4, Math.min(140, (state.tempC + 20) * 1.0))} rx="3" fill="#EF4444" />
            <circle cx="201" cy="182" r="9" fill="#EF4444" />
            {/* beaker */}
            <path d="M80 50 L80 180 Q80 192 92 192 L178 192 Q190 192 190 180 L190 50" fill="none" stroke="#CBD5E1" strokeWidth="3" />
            {state.phase !== "steam" && <rect x="83" y={40 + level} width="104" height={150 - level} fill={fill} opacity=".7" />}
            {Array.from({ length: Math.ceil(iceLeft * 6) }, (_, i) => (
              <rect key={i} x={92 + (i % 3) * 30} y={150 - Math.floor(i / 3) * 26} width="24" height="22" rx="4" fill="#E0F2FE" stroke="#7DD3FC" />
            ))}
            {(state.phase === "boiling" || (state.phase === "water" && state.tempC > 85)) && Array.from({ length: 8 }, (_, i) => (
              <circle key={i} cx={95 + i * 12} cy={170 - ((t * 40 + i * 37) % 80)} r={2 + (i % 3)} fill="rgba(255,255,255,.7)" />
            ))}
            {(state.phase === "boiling" || state.phase === "steam") && [0, 1, 2].map((i) => (
              <path key={i} d={`M${110 + i * 25} 40 q 8 -10 0 -20 q -8 -10 0 -20`} fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="3" strokeLinecap="round" />
            ))}
            {/* heater */}
            <rect x="70" y="200" width="130" height="18" rx="4" fill="#334155" />
            {running && [0, 1, 2, 3].map((i) => <path key={i} d={`M${95 + i * 25} 228 q 6 10 0 22`} stroke="#F97316" strokeWidth="4" fill="none" strokeLinecap="round" />)}
            <rect x="60" y="250" width="150" height="12" rx="3" fill="#1E293B" />
            <text x="150" y="290" fontSize="12" textAnchor="middle" fontWeight="700" fill="#FDE68A">{PHASE_LABEL[state.phase]}</text>
          </svg>
          <div className="mt-4 flex flex-wrap gap-2">
            <LabButton color={C} onClick={() => setRunning((r) => !r)} disabled={t >= endT}>{running ? "Pause" : t > 0 ? "Resume" : "Switch heater on"}</LabButton>
            <LabButton variant="ghost" onClick={reset}>Reset</LabButton>
          </div>
        </Panel>
        <Panel title="Set up">
          <div className="space-y-4">
            <Slider label="Heater power" value={power} min={200} max={1500} step={50} unit=" W" color={C} onChange={(v) => { setPower(v); reset(); }} />
            <Slider label="Mass of ice" value={massG} min={50} max={500} step={10} unit=" g" color="#38BDF8" onChange={(v) => { setMassG(v); reset(); }} />
          </div>
        </Panel>
      </div>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Temperature" value={state.tempC.toFixed(1)} unit="°C" color="#EF4444" />
          <Readout label="Time" value={Math.round(t)} unit="s" color={C} />
          <Readout label="Energy in" value={(power * t / 1000).toFixed(0)} unit="kJ" color="#34D399" />
        </div>
        <Panel title="Heating curve">
          <Chart title="Temperature against time" xLabel="Time (s)" yLabel="Temperature (°C)" xMax={Math.ceil(endT)} yMin={-20} yMax={120}
            series={[{ points: log, color: "#EF4444" }]} />
        </Panel>
        <Insight color={C}>
          The flat parts are <b>changes of state</b>. Energy still flows in, but it breaks bonds between particles
          instead of raising the temperature — that is <b>latent heat</b> (E = mL). On the sloping parts E = mcΔθ.
          Boiling takes far longer than melting because water&apos;s latent heat of vaporisation is about 7× its latent heat of fusion.
        </Insight>
        <Challenge>Time the melting plateau. Use E = Pt and E = mL to work out the specific latent heat of fusion of ice. (Answer: 334 000 J/kg.)</Challenge>
      </div>
    </div>
  );
}
