"use client";
import { useEffect, useRef, useState } from "react";
import { Panel, Slider, Readout, LabButton, Segmented, Insight, Challenge, Chart } from "@/components/lab/LabUI";
import { finalGasVolume, rateConstant, gasVolumeAt } from "@/lib/lab/sims";

const C = "#F472B6";
const RUN_S = 240;           // simulated seconds per run
const SPEED = 12;            // simulated seconds per real second
const RUN_COLORS = ["#F472B6", "#38BDF8", "#FACC15", "#34D399", "#A78BFA"];
type Surface = "chips" | "small" | "powder";
type Run = { label: string; finalV: number; k: number; color: string };

export default function Rates() {
  const [conc, setConc] = useState(1);
  const [temp, setTemp] = useState(20);
  const [mass, setMass] = useState(0.25);
  const [surface, setSurface] = useState<Surface>("chips");
  const [t, setT] = useState<number | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const raf = useRef<number>();
  const finalV = finalGasVolume(mass, conc);
  const k = rateConstant(conc, temp, surface);
  const label = `${conc} M · ${temp} °C · ${mass.toFixed(2)} g · ${surface}`;

  function start() {
    if (raf.current) cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const step = (now: number) => {
      const tt = Math.min(RUN_S, ((now - t0) / 1000) * SPEED);
      setT(tt);
      if (tt < RUN_S) raf.current = requestAnimationFrame(step);
      else setRuns((r) => [...r, { label, finalV, k, color: RUN_COLORS[r.length % RUN_COLORS.length] }].slice(-5));
    };
    raf.current = requestAnimationFrame(step);
  }
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);
  useEffect(() => { if (raf.current) cancelAnimationFrame(raf.current); setT(null); }, [conc, temp, mass, surface]);

  const vol = t === null ? 0 : gasVolumeAt(t, finalV, k);
  const curve = (fv: number, kk: number, upTo = RUN_S) => Array.from({ length: 49 }, (_, i) => {
    const x = (upTo * i) / 48;
    return [x, gasVolumeAt(x, fv, kk)] as [number, number];
  });
  const yMax = 130;
  const plunger = 40 + Math.min(1, vol / 120) * 170;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        <Panel title="Apparatus — gas syringe">
          <svg viewBox="0 0 420 220" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={`${vol.toFixed(0)} cubic centimetres of carbon dioxide collected after ${(t ?? 0).toFixed(0)} seconds`}>
            {/* flask */}
            <path d="M40 200 L70 120 V70 H100 V120 L130 200 Z" fill="rgba(254,240,138,.12)" stroke="rgba(255,255,255,.5)" strokeWidth="2" />
            <path d="M50 190 L75 135 H95 L120 190 Z" fill="rgba(254,240,138,.3)" />
            {Array.from({ length: surface === "powder" ? 18 : surface === "small" ? 8 : 4 }, (_, i) => (
              <rect key={i} x={62 + ((i * 17) % 44)} y={176 + (i % 3) * 4} width={surface === "powder" ? 3 : surface === "small" ? 6 : 11} height={surface === "powder" ? 3 : surface === "small" ? 5 : 9} rx="2" fill="#E2E8F0" />
            ))}
            {t !== null && t < RUN_S && vol < finalV * 0.98 && Array.from({ length: Math.ceil(Math.min(10, k * 100)) }, (_, i) => (
              <circle key={i} cx={70 + ((i * 13) % 30)} cy="180" r="2.5" fill="rgba(255,255,255,.8)" className="elab-bubble"
                style={{ ["--dx" as any]: `${(i % 5) - 2}px`, ["--dur" as any]: "1.4s", animationDelay: `${i * 0.15}s` }} />
            ))}
            {/* delivery tube */}
            <path d="M85 70 V40 H230" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="4" />
            {/* syringe */}
            <rect x="230" y="25" width="180" height="32" rx="6" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.55)" strokeWidth="2" />
            {Array.from({ length: 7 }, (_, i) => (
              <g key={i}>
                <line x1={230 + 10 + i * 28} x2={230 + 10 + i * 28} y1="25" y2="33" stroke="rgba(255,255,255,.4)" />
                <text x={230 + 10 + i * 28} y="72" fontSize="9" textAnchor="middle" fill="rgba(255,255,255,.45)">{i * 20}</text>
              </g>
            ))}
            <rect x="232" y="27" width={plunger - 40} height="28" fill="rgba(244,114,182,.25)" />
            <rect x={230 + plunger - 40} y="22" width="6" height="38" rx="2" fill="#CBD5E1" />
            <line x1={236 + plunger - 40} x2={236 + plunger + 30} y1="41" y2="41" stroke="#CBD5E1" strokeWidth="4" />
            <text x="320" y="95" fontSize="11" textAnchor="middle" fill="rgba(255,255,255,.55)">cm³ of CO₂</text>
          </svg>
          <div className="mt-4 flex flex-wrap gap-2">
            <LabButton color={C} onClick={start}>▶ Add the acid</LabButton>
            <LabButton variant="ghost" onClick={() => setRuns([])} disabled={!runs.length}>Clear runs</LabButton>
          </div>
        </Panel>
        <Panel title="Conditions">
          <div className="space-y-5">
            <Slider label="Acid concentration" value={conc} min={0.5} max={2} step={0.25} unit=" mol/dm³" color={C} onChange={setConc} />
            <Slider label="Temperature" value={temp} min={10} max={60} step={5} unit=" °C" color="#FB923C" onChange={setTemp} />
            <Slider label="Mass of marble" value={mass} min={0.1} max={0.5} step={0.05} unit=" g" color="#E2E8F0" onChange={setMass} format={(v) => v.toFixed(2)} />
            <Segmented label="Marble size" value={surface} onChange={(v) => setSurface(v as Surface)} color="#38BDF8"
              options={[{ value: "chips", label: "Large chips" }, { value: "small", label: "Small chips" }, { value: "powder", label: "Powder" }]} />
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Time" value={(t ?? 0).toFixed(0)} unit="s" color="#38BDF8" />
          <Readout label="Gas collected" value={vol.toFixed(0)} unit="cm³" color={C} />
          <Readout label="Initial rate" value={(k * finalV).toFixed(1)} unit="cm³/s" color="#FACC15" />
        </div>
        <Panel title="Volume of gas against time">
          <Chart title="Volume of carbon dioxide against time" xLabel="Time (s)" yLabel="Volume (cm³)" xMax={RUN_S} yMax={yMax} xTicks={4}
            series={[
              ...runs.map((r) => ({ points: curve(r.finalV, r.k), color: r.color })),
              ...(t !== null ? [{ points: curve(finalV, k, t), color: "#ffffff" }] : []),
            ]} />
          {runs.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-white/60">
              {runs.map((r, i) => <li key={i}><span style={{ color: r.color }}>■</span> {r.label} → {r.finalV.toFixed(0)} cm³</li>)}
            </ul>
          )}
        </Panel>
        <Insight color={C}>
          Reactions go faster when particles collide <b>more often</b> and with <b>more energy</b>. Higher
          concentration, higher temperature and a bigger surface area (powder!) all make the curve steeper at the start.
          The final volume only changes if you change <b>how much</b> reacts — the limiting reagent.
        </Insight>
        <Challenge>Run large chips, then powder, at the same conditions. Why do both curves level off at the same volume? Now double the acid — what changes?</Challenge>
      </div>
    </div>
  );
}
