"use client";
import { useMemo, useState } from "react";
import { Panel, Slider, Readout, LabButton, Insight, Challenge, Chart } from "@/components/lab/LabUI";
import { photosynthesisRate, limitingFactor, photoFactors } from "@/lib/lab/sims";

const C = "#84CC16";
type Reading = { light: number; rate: number };

export default function Photosynthesis() {
  const [light, setLight] = useState(50);
  const [co2, setCo2] = useState(60);
  const [temp, setTemp] = useState(25);
  const [readings, setReadings] = useState<Reading[]>([]);
  const rate = photosynthesisRate(light, co2, temp);
  const limit = limitingFactor(light, co2, temp);
  const f = photoFactors(light, co2, temp);

  // A stable set of bubbles; how many are visible and how fast they rise
  // follows the rate.
  const bubbles = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    x: 175 + ((i * 37) % 50), dx: ((i * 13) % 20) - 10, delay: (i * 0.37) % 2.4, r: 3 + (i % 3),
  })), []);
  const visible = Math.round((rate / 60) * bubbles.length);
  const dur = rate > 0 ? Math.max(0.9, 3.4 - rate / 25) : 3;
  const lampX = 40 + (light / 100) * 50; // brighter = lamp moved closer to the beaker

  // Curve of rate vs light at the current CO₂ and temperature.
  const theory = Array.from({ length: 21 }, (_, i) => [i * 5, photosynthesisRate(i * 5, co2, temp)] as [number, number]);

  const limitText = {
    light: "Light is the limiting factor — bring the lamp closer.",
    "CO₂": "CO₂ is the limiting factor — add more carbon dioxide (e.g. sodium hydrogencarbonate).",
    temperature: temp > 35
      ? "Temperature is limiting — it's too hot, so the enzymes are being denatured."
      : "Temperature is limiting — it's too cold for the enzymes to work quickly.",
  }[limit];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <div className="space-y-5">
        <Panel title="Pondweed experiment">
          <svg viewBox="0 0 400 300" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={`Pondweed producing ${rate} oxygen bubbles per minute`}>
            {/* lamp + light beam */}
            <g style={{ transform: `translateX(${lampX - 40}px)`, transition: "transform .4s" }}>
              <polygon points="62,128 150,96 150,236 62,170" fill={`rgba(253, 230, 138, ${0.05 + (light / 100) * 0.35})`} />
              <rect x="16" y="130" width="34" height="38" rx="6" fill="#334155" />
              <circle cx="55" cy="149" r="13" fill={`rgba(253, 230, 138, ${0.3 + (light / 100) * 0.7})`} />
              <rect x="28" y="168" width="10" height="70" fill="#475569" />
            </g>
            {/* beaker */}
            <path d="M140 60 V270 Q140 280 150 280 H250 Q260 280 260 270 V60" fill="rgba(56,189,248,.12)" stroke="rgba(255,255,255,.55)" strokeWidth="3" />
            <rect x="143" y="80" width="114" height="197" fill={`rgba(56,189,248,${0.12 + co2 / 600})`} />
            {/* thermometer */}
            <rect x="268" y="70" width="10" height="150" rx="5" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.4)" />
            <rect x="270" y={72 + (1 - temp / 60) * 146} width="6" height={(temp / 60) * 146} rx="3" fill={temp > 40 ? "#F87171" : "#FB923C"} />
            <circle cx="273" cy="225" r="9" fill={temp > 40 ? "#F87171" : "#FB923C"} />
            <text x="286" y="78" fontSize="11" fill="rgba(255,255,255,.6)">{temp}°C</text>
            {/* funnel + test tube collecting gas */}
            <path d="M170 250 L188 215 H212 L230 250" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" />
            <rect x="192" y="90" width="16" height="125" rx="7" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.4)" />
            {/* pondweed */}
            {[0, 1, 2, 3].map((i) => (
              <path key={i} d={`M${185 + i * 10} 272 q ${i % 2 ? 10 : -10} -25 0 -50 q ${i % 2 ? -10 : 10} -25 0 -45`}
                fill="none" stroke={rate > 0 ? "#4ADE80" : "#3F6212"} strokeWidth="4" strokeLinecap="round" />
            ))}
            {/* O₂ bubbles */}
            {bubbles.slice(0, visible).map((b, i) => (
              <circle key={i} cx={b.x} cy="220" r={b.r} fill="rgba(224, 242, 254, .85)" className="elab-bubble"
                style={{ ["--dx" as any]: `${b.dx}px`, ["--dur" as any]: `${dur}s`, animationDelay: `${b.delay}s` }} />
            ))}
          </svg>
        </Panel>
        <Panel title="Conditions">
          <div className="space-y-5">
            <Slider label="Light intensity" value={light} min={0} max={100} unit="%" color="#FACC15" onChange={setLight} />
            <Slider label="Carbon dioxide" value={co2} min={0} max={100} unit="%" color="#38BDF8" onChange={setCo2} />
            <Slider label="Temperature" value={temp} min={0} max={55} unit=" °C" color="#FB923C" onChange={setTemp} />
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Readout label="O₂ bubbles / minute" value={rate} color={C} big />
          <Readout label="Limiting factor" value={limit} color={limit === "temperature" ? "#FB923C" : limit === "light" ? "#FACC15" : "#38BDF8"} big />
        </div>
        <Panel title="How hard each factor is pushing (0–100%)">
          {[["Light", f.light, "#FACC15"], ["CO₂", f.co2, "#38BDF8"], ["Temperature (enzymes)", f.temp, "#FB923C"]].map(([l, v, col]) => (
            <div key={l as string} className="mb-3 last:mb-0">
              <div className="mb-1 flex justify-between text-xs font-semibold text-white/70"><span>{l}</span><span className="font-mono">{Math.round((v as number) * 100)}%</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(v as number) * 100}%`, background: col as string, boxShadow: `0 0 10px ${col}` }} />
              </div>
            </div>
          ))}
        </Panel>
        <Panel title="Rate against light intensity" right={
          <LabButton variant="ghost" onClick={() => setReadings((r) => [...r.filter((x) => x.light !== light), { light, rate }])}>＋ Record</LabButton>
        }>
          <Chart title="Rate of photosynthesis against light intensity" xLabel="Light intensity (%)" yLabel="Bubbles / min" xMax={100} yMax={60}
            series={[{ points: theory, color: C, dashed: true }, { points: readings.map((r) => [r.light, r.rate] as [number, number]), color: "#FACC15", kind: "dots" }]} />
        </Panel>
        <Insight color={C}>
          carbon dioxide + water <b>→ (light, chlorophyll) →</b> glucose + <b>oxygen</b>. The bubbles are oxygen. The rate is
          held back by whichever factor is in shortest supply — the <b>limiting factor</b>. {limitText}
        </Insight>
        <Challenge>Record the rate at 5 light levels. Where does the graph level off — and what is limiting the rate there?</Challenge>
      </div>
    </div>
  );
}
