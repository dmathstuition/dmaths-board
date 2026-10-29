"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Panel, Slider, Readout, Segmented, Insight, Challenge, Chart } from "@/components/lab/LabUI";
import { boyleVolume, charlesVolume, pressureAt, toKelvin } from "@/lib/lab/sims";

const C = "#F472B6";
type Law = "boyle" | "charles" | "pressure";
const P0 = 100, V0 = 50, T0 = 300; // kPa, cm³, K

export default function GasLaws() {
  const [law, setLaw] = useState<Law>("boyle");
  const [p, setP] = useState(100);
  const [tc, setTc] = useState(27);
  const tK = toKelvin(tc);
  const V = law === "boyle" ? boyleVolume(p, P0, V0) : law === "charles" ? charlesVolume(tK, T0, V0) : V0;
  const P = law === "pressure" ? pressureAt(tK, T0, P0) : law === "boyle" ? p : P0;
  const T = law === "boyle" ? T0 : tK;

  // Particles bounce around the gas space; speed grows with √T.
  const parts = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 100, vx: ((i * 7) % 11) - 5 || 3, vy: ((i * 5) % 9) - 4 || 2 })), []);
  const [tick, setTick] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    const step = () => { setTick((n) => n + 1); raf.current = requestAnimationFrame(step); };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);
  const speed = Math.sqrt(T / 300) * 0.35;
  const bounce = (v: number) => { const m = ((v % 200) + 200) % 200; return m > 100 ? 200 - m : m; };

  // Cylinder: gas height ∝ volume (50 cm³ ↔ 120px).
  const gasH = Math.min(230, (V / V0) * 120);
  const pistonY = 260 - gasH;

  const series = law === "boyle"
    ? [{ points: Array.from({ length: 26 }, (_, i) => { const pp = 50 + i * 10; return [boyleVolume(pp, P0, V0), pp] as [number, number]; }), color: "#34D399" },
       { points: [[V, P]] as [number, number][], color: C, kind: "dots" as const }]
    : law === "charles"
      ? [{ points: [[0, 0], [500, charlesVolume(500, T0, V0)]] as [number, number][], color: "#34D399", dashed: true },
         { points: [[T, V]] as [number, number][], color: C, kind: "dots" as const }]
      : [{ points: [[0, 0], [500, pressureAt(500, T0, P0)]] as [number, number][], color: "#34D399", dashed: true },
         { points: [[T, P]] as [number, number][], color: C, kind: "dots" as const }];
  const chart = law === "boyle"
    ? { x: "Volume (cm³)", y: "Pressure (kPa)", xMax: 110, yMax: 300 }
    : law === "charles" ? { x: "Temperature (K)", y: "Volume (cm³)", xMax: 500, yMax: 90 }
      : { x: "Temperature (K)", y: "Pressure (kPa)", xMax: 500, yMax: 170 };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5">
        <Panel title="Gas in a cylinder">
          <svg viewBox="0 0 260 290" className="mx-auto h-auto w-full max-w-[320px] rounded-2xl bg-black/30" role="img"
            aria-label={`Gas at ${P.toFixed(0)} kilopascals, ${V.toFixed(1)} cubic centimetres, ${T} kelvin`}>
            <rect x="60" y="20" width="140" height="244" rx="6" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.5)" strokeWidth="2" />
            <rect x="62" y={pistonY} width="136" height={gasH + 2} fill={`rgba(244,114,182,${0.08 + (T - 223) / 2500})`} />
            {parts.map((q, i) => {
              const x = bounce(q.x + q.vx * tick * speed), y = bounce(q.y + q.vy * tick * speed);
              return <circle key={i} cx={68 + (x / 100) * 124} cy={pistonY + 6 + (y / 100) * (gasH - 12)} r="3.5" fill="#F9A8D4" />;
            })}
            {/* piston */}
            <rect x="62" y={pistonY - 14} width="136" height="14" fill={law === "pressure" ? "#64748B" : "#CBD5E1"} />
            <rect x="124" y="0" width="12" height={Math.max(0, pistonY - 14)} fill={law === "pressure" ? "#64748B" : "#CBD5E1"} />
            {law === "pressure" && <text x="130" y={pistonY - 20} textAnchor="middle" fontSize="10" fontWeight="800" fill="#FACC15">🔒 locked</text>}
            {/* heater */}
            {law !== "boyle" && <rect x="60" y="268" width="140" height="8" rx="3" fill={tc > 27 ? "#F97316" : tc < 27 ? "#38BDF8" : "#64748B"} />}
          </svg>
        </Panel>
        <Panel title="Controls">
          <div className="space-y-5">
            <Segmented label="Law" value={law} onChange={(v) => setLaw(v as Law)} color={C}
              options={[{ value: "boyle", label: "Boyle (fixed T)" }, { value: "charles", label: "Charles (fixed p)" }, { value: "pressure", label: "Pressure (fixed V)" }]} />
            {law === "boyle"
              ? <Slider label="Push the piston — pressure" value={p} min={50} max={300} step={10} unit=" kPa" color={C} onChange={setP} />
              : <Slider label="Heat or cool — temperature" value={tc} min={-73} max={227} step={10} unit=" °C" color="#FB923C" onChange={setTc} />}
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Pressure" value={P.toFixed(0)} unit="kPa" color={C} />
          <Readout label="Volume" value={V.toFixed(1)} unit="cm³" color="#38BDF8" />
          <Readout label="Temperature" value={T} unit="K" color="#FB923C" />
        </div>
        <Panel title={law === "boyle" ? "p against V" : law === "charles" ? "V against T" : "p against T"}>
          <Chart title="Gas law graph" xLabel={chart.x} yLabel={chart.y} xMax={chart.xMax} yMax={chart.yMax} series={series} />
          <p className="mt-2 font-mono text-sm text-white/70">
            {law === "boyle" ? `p × V = ${(P * V).toFixed(0)} (constant)` : law === "charles" ? `V ÷ T = ${(V / T).toFixed(3)} (constant)` : `p ÷ T = ${(P / T).toFixed(3)} (constant)`}
          </p>
        </Panel>
        <Insight color={C}>
          Gas pressure comes from particles hitting the walls. Squash the gas and they hit more often (<b>Boyle: pV is
          constant</b>). Heat it and they move faster — at fixed pressure it expands (<b>Charles: V ∝ T</b>), in a sealed
          container the pressure rises (<b>p ∝ T</b>). Temperatures must be in <b>kelvin</b>: both lines point back to
          absolute zero, 0 K = −273 °C.
        </Insight>
        <Challenge>Double the pressure in Boyle&apos;s law. What happens to the volume? In Charles&apos;s law, what temperature would make the volume zero?</Challenge>
      </div>
    </div>
  );
}
