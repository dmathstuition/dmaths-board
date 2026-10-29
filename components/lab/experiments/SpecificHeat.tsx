"use client";
import { useState } from "react";
import { Panel, Readout, Slider, Segmented, LabButton, Insight, Challenge, Chart } from "@/components/lab/LabUI";
import { BLOCKS, tempRise, shcFrom } from "@/lib/lab/sims";

const C = "#F87171";
const START = 20;

export default function SpecificHeat() {
  const [block, setBlock] = useState<string>("aluminium");
  const [power, setPower] = useState(50);
  const [lagged, setLagged] = useState(true);
  const [time, setTime] = useState(0);
  const b = BLOCKS.find((x) => x.id === block)!;
  const loss = lagged ? 0.05 : 0.25;
  const temp = START + tempRise(power, time, 1, b.c, loss);
  const points: [number, number][] = Array.from({ length: Math.floor(time / 60) + 1 }, (_, i) => [i, START + tempRise(power, i * 60, 1, b.c, loss)]);
  const measuredC = time > 0 ? shcFrom(power, time, 1, temp - START) : 0;
  const reset = (fn: () => void) => { fn(); setTime(0); };
  const fill = Math.min(1, (temp - 10) / 90);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5">
        <Panel title="Apparatus">
          <svg viewBox="0 0 300 260" className="h-auto w-full rounded-2xl bg-black/30" role="img" aria-label={`1 kilogram ${b.label} block at ${temp.toFixed(1)} degrees Celsius`}>
            <rect x="60" y="80" width="140" height="140" rx="8" fill={block === "water" ? "rgba(56,189,248,.35)" : "#94A3B8"} stroke={lagged ? "#FDE68A" : "transparent"} strokeWidth="10" />
            <rect x="105" y="40" width="16" height="130" rx="4" fill="#475569" />
            <rect x="107" y="120" width="12" height="48" rx="3" fill={time > 0 ? "#F87171" : "#64748B"} />
            <text x="113" y="34" fontSize="10" textAnchor="middle" fill="rgba(255,255,255,.6)">heater {power} W</text>
            <rect x="160" y="30" width="12" height="150" rx="6" fill="rgba(255,255,255,.15)" />
            <rect x="160" y={30 + 150 * (1 - fill)} width="12" height={150 * fill} rx="6" fill={C} />
            <text x="180" y="40" fontSize="10" fill="rgba(255,255,255,.6)">thermometer</text>
            <text x="130" y="246" fontSize="11" textAnchor="middle" fill="rgba(255,255,255,.7)">1 kg {b.label.toLowerCase()}{lagged ? " · insulated" : ""}</text>
          </svg>
          <div className="mt-4 flex flex-wrap gap-2">
            <LabButton color={C} onClick={() => setTime((t) => Math.min(1800, t + 60))} disabled={time >= 1800}>▶ Heat 1 minute</LabButton>
            <LabButton variant="ghost" onClick={() => setTime((t) => Math.min(1800, t + 300))} disabled={time >= 1800}>Heat 5 minutes</LabButton>
            <LabButton variant="ghost" onClick={() => setTime(0)}>Reset</LabButton>
          </div>
        </Panel>
        <Panel title="Set up">
          <div className="space-y-4">
            <Segmented label="Material" value={block} onChange={(v) => reset(() => setBlock(v))} color={C} options={BLOCKS.map((x) => ({ value: x.id, label: x.label }))} />
            <Slider label="Heater power" value={power} min={25} max={100} step={5} unit=" W" onChange={(v) => reset(() => setPower(v))} color={C} />
            <Segmented label="Insulation" value={lagged ? "yes" : "no"} onChange={(v) => reset(() => setLagged(v === "yes"))} color={C}
              options={[{ value: "yes", label: "Insulated" }, { value: "no", label: "No insulation" }]} />
          </div>
        </Panel>
      </div>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Time" value={time / 60} unit="min" color="#38BDF8" />
          <Readout label="Temperature" value={temp.toFixed(1)} unit="°C" color={C} />
          <Readout label="Your c" value={measuredC ? Math.round(measuredC) : "—"} unit="J/kg°C" color="#34D399" />
        </div>
        <Panel title="Temperature against time">
          <Chart title="Temperature against time" xLabel="Time (min)" yLabel="Temperature (°C)" xMax={30} yMax={100}
            series={[{ points, color: C, kind: "line" }, { points, color: C, kind: "dots" }]} />
          <p className="mt-2 text-xs text-white/55">Energy supplied E = P × t = {(power * time).toLocaleString()} J · rise {(temp - START).toFixed(1)} °C · textbook c for {b.label.toLowerCase()} = {b.c} J/kg°C</p>
        </Panel>
        <Insight color={C}>
          The heater supplies <b>E = Pt</b>, and E = mcΔθ, so <b>c = Pt ÷ (mΔθ)</b>. Without insulation, energy escapes to
          the room, the temperature rises less, and your calculated c comes out <b>too high</b>.
        </Insight>
        <Challenge>Heat each material for 10 minutes. Which warms fastest? Why is water used in radiators and car cooling systems?</Challenge>
      </div>
    </div>
  );
}
