"use client";
import { useState } from "react";
import { Panel, Readout, LabButton, Segmented, Insight, Challenge, Chart } from "@/components/lab/LabUI";
import { SPRINGS, springExtension, beyondLimit } from "@/lib/lab/sims";

const C = "#F59E0B";
type Reading = { load: number; ext: number };

export default function Hooke() {
  const [springIdx, setSpringIdx] = useState(1);
  const [load, setLoad] = useState(0);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [damaged, setDamaged] = useState(false);
  const sp = SPRINGS[springIdx];
  const maxLoad = Math.round(sp.limitN * 1.6);
  const ext = springExtension(load, sp.k, sp.limitN);
  const over = beyondLimit(load, sp.limitN);
  const extCm = ext * 100;

  // Drawing: natural length 80px; 1 cm of extension = 4px (capped to the stage).
  const natural = 80, stretch = Math.min(170, extCm * 4);
  const coils = 12, top = 40, len = natural + stretch;
  const zig = Array.from({ length: coils * 2 + 1 }, (_, i) => `${i === 0 ? "M" : "L"}${150 + (i === 0 || i === coils * 2 ? 0 : i % 2 ? 16 : -16)} ${top + (i / (coils * 2)) * len}`).join(" ");
  const weights = Math.round(load);

  function change(n: number) {
    const next = Math.max(0, Math.min(maxLoad, load + n));
    setLoad(next);
    if (beyondLimit(next, sp.limitN)) setDamaged(true);
  }
  function pickSpring(i: number) {
    setSpringIdx(i); setLoad(0); setReadings([]); setDamaged(false);
  }
  function record() {
    setReadings((r) => [...r.filter((x) => x.load !== load), { load, ext: extCm }].sort((a, b) => a.load - b.load));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5">
        <Panel title="Apparatus">
          <svg viewBox="0 0 300 330" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={`Spring with ${load} newtons hanging, extension ${extCm.toFixed(1)} centimetres`}>
            <rect x="60" y="20" width="180" height="14" rx="4" fill="#475569" />
            {/* ruler */}
            <rect x="215" y={top} width="34" height="270" rx="3" fill="rgba(250,204,21,.12)" stroke="rgba(250,204,21,.4)" />
            {/* 1 cm of extension = 4px; a tick every 2 cm, labelled every 10 cm */}
            {Array.from({ length: 23 }, (_, i) => (
              <g key={i}>
                <line x1="215" x2={i % 5 === 0 ? 229 : 222} y1={top + natural + i * 8} y2={top + natural + i * 8} stroke="rgba(250,204,21,.6)" />
                {i % 5 === 0 && <text x="246" y={top + natural + i * 8 + 3} fontSize="9" textAnchor="end" fill="rgba(250,204,21,.8)">{i * 2}</text>}
              </g>
            ))}
            <text x="232" y={top - 6} fontSize="9" textAnchor="middle" fill="rgba(250,204,21,.8)">cm</text>
            <path d={zig} fill="none" stroke={over ? "#F87171" : "#CBD5E1"} strokeWidth="3" strokeLinejoin="round" />
            <line x1="150" x2="230" y1={top + len} y2={top + len} stroke="#F472B6" strokeDasharray="3 3" />
            {/* hanger + slotted masses */}
            <line x1="150" x2="150" y1={top + len} y2={top + len + 14} stroke="#94A3B8" strokeWidth="2" />
            {Array.from({ length: weights }, (_, i) => (
              <rect key={i} x="128" y={top + len + 14 + i * Math.min(8, 60 / Math.max(1, weights))} width="44" height={Math.min(7, 58 / Math.max(1, weights))} rx="2" fill={i % 2 ? "#64748B" : "#94A3B8"} />
            ))}
          </svg>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <LabButton color={C} onClick={() => change(1)} disabled={load >= maxLoad}>＋ Add 1 N</LabButton>
            <LabButton variant="ghost" onClick={() => change(-1)} disabled={load <= 0}>− Remove 1 N</LabButton>
            <LabButton variant="ghost" onClick={record}>＋ Record reading</LabButton>
          </div>
          {over && <p className="elab-pop mt-3 text-sm font-semibold text-red-300">⚠️ Past the elastic limit — the spring is being permanently stretched.</p>}
          {!over && damaged && load === 0 && <p className="mt-3 text-sm font-semibold text-amber-300">The spring no longer returns to its original length — it has been permanently deformed.</p>}
        </Panel>
        <Panel title="Spring">
          <Segmented label="Spring" value={String(springIdx)} onChange={(v) => pickSpring(Number(v))} color={C}
            options={SPRINGS.map((s, i) => ({ value: String(i), label: s.label }))} />
        </Panel>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Load" value={load} unit="N" color={C} />
          <Readout label="Extension" value={extCm.toFixed(1)} unit="cm" color="#F472B6" />
          <Readout label="Spring constant" value={sp.k} unit="N/m" color="#34D399" />
        </div>
        <Panel title="Load against extension">
          <Chart title="Load against extension" xLabel="Extension (cm)" yLabel="Load (N)" xMax={Math.max(10, springExtension(maxLoad, sp.k, sp.limitN) * 100)} yMax={maxLoad}
            series={[
              { points: [[0, 0], [(sp.limitN / sp.k) * 100, sp.limitN]], color: "#34D399", dashed: true },
              { points: readings.map((r) => [r.ext, r.load] as [number, number]), color: "#F472B6", kind: "line" },
              { points: readings.map((r) => [r.ext, r.load] as [number, number]), color: "#F472B6", kind: "dots" },
            ]} />
          {readings.length > 0 && (
            <table className="mt-3 w-full text-left text-xs text-white/70">
              <thead><tr className="text-white/40"><th className="py-1">Load (N)</th><th>Extension (cm)</th><th>Load ÷ extension (N/m)</th></tr></thead>
              <tbody>{readings.map((r) => (
                <tr key={r.load} className={`border-t border-white/5 font-mono ${beyondLimit(r.load, sp.limitN) ? "text-red-300" : ""}`}>
                  <td className="py-1">{r.load}</td><td>{r.ext.toFixed(1)}</td><td>{r.ext ? (r.load / (r.ext / 100)).toFixed(1) : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Panel>
        <Insight color={C}>
          Up to the <b>elastic limit</b> the extension is proportional to the load: <b>F = kx</b>, so the graph is a
          straight line through the origin with gradient k. Beyond it the line curves — the spring stretches more for
          each newton and won&apos;t spring back fully.
        </Insight>
        <Challenge>Record at least six readings, then use the straight part of your graph to calculate k. Does it match the readout?</Challenge>
      </div>
    </div>
  );
}
