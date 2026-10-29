"use client";
import { useState } from "react";
import { Panel, Slider, Readout, LabButton, Insight, Challenge, Chart } from "@/components/lab/LabUI";
import { current, power, bulbBrightness } from "@/lib/lab/sims";

const C = "#F59E0B";

export default function Circuits() {
  const [V, setV] = useState(6);
  const [R, setR] = useState(12);
  const [closed, setClosed] = useState(true);
  const [points, setPoints] = useState<{ V: number; I: number; R: number }[]>([]);
  const I = closed ? current(V, R) : 0;
  const P = closed ? power(V, R) : 0;
  const glow = bulbBrightness(P);
  // Faster dash animation for more current; frozen when the switch is open.
  const flowDur = I > 0 ? Math.max(0.15, 1.6 / (I * 2 + 0.2)) : 0;

  // Wire runs from one switch terminal round the loop to the other, so an open
  // switch leaves a visible gap.
  const wire = "M170 230 H60 V70 H340 V230 H230";
  const sameR = points.filter((p) => p.R === R);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <div className="space-y-5">
        <Panel title="Circuit board">
          <svg viewBox="0 0 400 300" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={`Circuit with a ${V} volt battery and ${R} ohm resistor, switch ${closed ? "closed" : "open"}, current ${I.toFixed(2)} amps`}>
            <defs>
              <radialGradient id="glow"><stop offset="0%" stopColor="#FDE68A" stopOpacity={0.95 * glow} /><stop offset="100%" stopColor="#F59E0B" stopOpacity="0" /></radialGradient>
            </defs>
            {/* wires */}
            <path d={wire} fill="none" stroke="#334155" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
            {closed && I > 0 && (
              <path d={wire} fill="none" stroke="#FDE68A" strokeWidth="3" strokeDasharray="4 16" strokeLinecap="round"
                className="elab-flow" style={{ ["--dur" as any]: `${flowDur}s` }} />
            )}
            {/* battery (left side) */}
            <rect x="40" y="120" width="40" height="60" rx="6" fill="#0F172A" stroke="#64748B" />
            <line x1="48" y1="140" x2="72" y2="140" stroke="#F87171" strokeWidth="4" />
            <line x1="54" y1="160" x2="66" y2="160" stroke="#60A5FA" strokeWidth="4" />
            <text x="14" y="154" fontSize="13" fontWeight="800" fill="#E2E8F0">{V}V</text>
            {/* bulb (top) */}
            <circle cx="200" cy="70" r={36 + glow * 24} fill="url(#glow)" />
            <circle cx="200" cy="70" r="18" fill={glow > 0.02 ? `rgba(253, 230, 138, ${0.35 + glow * 0.65})` : "#1E293B"} stroke="#CBD5E1" strokeWidth="2" />
            <path d="M192 72 q4 -10 8 0 q4 10 8 0" fill="none" stroke={glow > 0.02 ? "#92400E" : "#64748B"} strokeWidth="2" />
            {/* resistor (right side) */}
            <rect x="325" y="125" width="30" height="50" rx="4" fill="#0F172A" stroke="#64748B" />
            <path d="M340 128 l-8 6 l16 6 l-16 6 l16 6 l-16 6 l16 6 l-8 4" fill="none" stroke="#F59E0B" strokeWidth="2" />
            <text x="362" y="154" fontSize="12" fontWeight="800" fill="#E2E8F0">{R}Ω</text>
            {/* switch (bottom) */}
            <circle cx="170" cy="230" r="5" fill="#E2E8F0" />
            <circle cx="230" cy="230" r="5" fill="#E2E8F0" />
            <line x1="170" y1="230" x2={closed ? 230 : 222} y2={closed ? 230 : 196} stroke="#E2E8F0" strokeWidth="4" strokeLinecap="round" style={{ transition: "all .25s" }} />
            {/* ammeter */}
            <circle cx="120" cy="70" r="16" fill="#0F172A" stroke="#34D399" strokeWidth="2" />
            <text x="120" y="75" textAnchor="middle" fontSize="13" fontWeight="900" fill="#34D399">A</text>
            <text x="200" y="285" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,.5)">switch {closed ? "closed — current flows" : "open — no current"}</text>
          </svg>
          <div className="mt-4 flex flex-wrap gap-2">
            <LabButton color={C} onClick={() => setClosed((c) => !c)}>{closed ? "Open switch" : "Close switch"}</LabButton>
            <LabButton variant="ghost" disabled={!closed} onClick={() => setPoints((p) => [...p.filter((x) => !(x.V === V && x.R === R)), { V, I, R }])}>＋ Plot this point</LabButton>
            <LabButton variant="ghost" onClick={() => setPoints([])} disabled={!points.length}>Clear graph</LabButton>
          </div>
        </Panel>
        <Panel title="Controls">
          <div className="space-y-5">
            <Slider label="Battery voltage (V)" value={V} min={0} max={12} step={0.5} unit=" V" color={C} onChange={setV} />
            <Slider label="Resistance (R)" value={R} min={1} max={60} unit=" Ω" color="#F472B6" onChange={setR} />
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Voltage" value={closed ? V.toFixed(1) : "0.0"} unit="V" color={C} />
          <Readout label="Current" value={I.toFixed(2)} unit="A" color="#34D399" />
          <Readout label="Power" value={P.toFixed(1)} unit="W" color="#F472B6" />
        </div>
        <Panel title={`V against I (R = ${R} Ω)`}>
          <Chart title="Voltage against current" xLabel="Current I (A)" yLabel="Voltage V (V)" xMax={Math.max(1, 12 / R)} yMax={12}
            series={[
              { points: [[0, 0], [12 / R, 12]], color: "#34D399", dashed: true },
              { points: sameR.map((p) => [p.I, p.V] as [number, number]), color: "#F59E0B", kind: "dots" },
            ]} />
          <p className="mt-2 text-xs text-white/45">Plot points at several voltages without changing R. Gradient = V ÷ I = R.</p>
        </Panel>
        <Insight color={C}>
          <b>Ohm&apos;s law: V = I × R.</b> Push harder (more volts) and more current flows; add resistance and less does.
          The bulb&apos;s brightness follows the power, P = V²/R — so doubling the voltage makes it <i>four</i> times as powerful.
        </Insight>
        <Challenge>Set R = 12 Ω. Plot points at 3 V, 6 V, 9 V and 12 V. Is the line straight? What does its gradient tell you?</Challenge>
      </div>
    </div>
  );
}
