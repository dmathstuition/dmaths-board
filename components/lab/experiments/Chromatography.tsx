"use client";
import { useEffect, useRef, useState } from "react";
import { Panel, Readout, Insight, Challenge, LabButton } from "@/components/lab/LabUI";
import { DYES, INKS, spotPositions, rf } from "@/lib/lab/sims";

const C = "#F472B6";
const MAX_FRONT = 9; // cm the solvent can rise on the paper

export default function Chromatography() {
  const [front, setFront] = useState(0);
  const [running, setRunning] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const fRef = useRef(0);
  // The unknown is one of the reference inks, picked per visit (after mount, so
  // the server and browser render the same first frame).
  const [unknown, setUnknown] = useState(INKS[2]);
  useEffect(() => { setUnknown(INKS[Math.floor(Math.random() * INKS.length)]); }, []);

  useEffect(() => {
    if (!running) return;
    let raf = 0, last = performance.now();
    const step = (now: number) => {
      // Rises quickly at first, then slows (as real capillary flow does).
      const dt = (now - last) / 1000; last = now;
      const next = Math.min(MAX_FRONT, fRef.current + dt * 1.6 * (1 - fRef.current / (MAX_FRONT + 1.5)));
      fRef.current = next; setFront(next);
      if (next >= MAX_FRONT - 0.01) { setRunning(false); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const lanes = [...INKS.map((i) => ({ ...i, unknown: false })), { ...unknown, id: "X", label: "Unknown X", unknown: true }];
  // Paper: base line at y=300, 28 px per cm.
  const BASE = 300, PX = 28;
  const sel = pick ? DYES.find((d) => d.id === pick) : null;

  function reset() { setRunning(false); fRef.current = 0; setFront(0); setAnswer(null); setPick(null); }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <Panel title="Chromatography paper">
          <svg viewBox="0 0 340 360" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={`Solvent front at ${front.toFixed(1)} centimetres`}>
            {/* tank */}
            <rect x="20" y="20" width="300" height="330" rx="10" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.25)" />
            <rect x="22" y="318" width="296" height="30" fill="#7DD3FC" opacity=".25" />
            {/* paper */}
            <rect x="45" y="30" width="250" height="300" fill="#F8FAFC" />
            <rect x="45" y={BASE - front * PX} width="250" height={front * PX + 30} fill="#E0F2FE" opacity=".8" />
            <line x1="45" x2="295" y1={BASE} y2={BASE} stroke="#64748B" strokeDasharray="4 3" />
            <text x="290" y={BASE - 4} fontSize="9" textAnchor="end" fill="#64748B">pencil base line</text>
            {front > 0 && <line x1="45" x2="295" y1={BASE - front * PX} y2={BASE - front * PX} stroke="#0284C7" strokeWidth="1.5" />}
            {lanes.map((lane, i) => {
              const x = 70 + i * 50;
              return (
                <g key={lane.id}>
                  {spotPositions(lane.dyes, front).map((s) => {
                    const d = DYES.find((q) => q.id === s.id)!;
                    return (
                      <ellipse key={s.id} cx={x} cy={BASE - s.cm * PX} rx={7 + Math.min(4, s.cm * 0.4)} ry={5 + Math.min(4, s.cm * 0.5)}
                        fill={d.color} opacity={front ? 0.85 : 0.6} style={{ cursor: "pointer" }} onClick={() => setPick(s.id)}
                        role="button" tabIndex={0} aria-label={`${d.label} spot in lane ${lane.unknown ? "X" : lane.id}`}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPick(s.id); } }} />
                    );
                  })}
                  {front === 0 && <circle cx={x} cy={BASE} r="6" fill="#334155" />}
                  <text x={x} y="345" fontSize="11" textAnchor="middle" fontWeight="700" fill={lane.unknown ? "#F9A8D4" : "rgba(255,255,255,.7)"}>{lane.unknown ? "X" : lane.id}</text>
                </g>
              );
            })}
          </svg>
          <div className="mt-4 flex flex-wrap gap-2">
            <LabButton color={C} onClick={() => setRunning((r) => !r)} disabled={front >= MAX_FRONT - 0.01}>{running ? "Pause" : front ? "Resume" : "Lower paper into solvent"}</LabButton>
            <LabButton variant="ghost" onClick={reset}>Reset</LabButton>
          </div>
          <p className="mt-3 text-xs text-white/50">Tap a spot to measure its Rf value.</p>
        </Panel>
      </div>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Solvent front" value={front.toFixed(1)} unit="cm" color="#38BDF8" />
          <Readout label="Spot travelled" value={sel ? (sel.rf * front).toFixed(1) : "—"} unit={sel ? "cm" : ""} color={sel?.color ?? C} />
          <Readout label="Rf" value={sel && front ? rf(sel.rf * front, front).toFixed(2) : "—"} color={sel?.color ?? C} />
        </div>
        <Panel title="Which ink is X?">
          <div className="flex flex-wrap gap-2">
            {INKS.map((i) => (
              <LabButton key={i.id} variant="ghost" disabled={front < 3}
                onClick={() => setAnswer(i.id === unknown.id ? `Yes — X matches ${i.label}: its spots have the same Rf values.` : `No — compare the heights of the spots with ${i.label}.`)}>
                {i.label}
              </LabButton>
            ))}
          </div>
          {front < 3 && <p className="mt-2 text-xs text-white/50">Let the solvent rise at least 3 cm first.</p>}
          {answer && <p className="mt-3 text-sm font-semibold text-white/85">{answer}</p>}
        </Panel>
        <Insight color={C}>
          Each dye is attracted to the paper and dissolves in the solvent to a different degree, so it travels a
          fixed fraction of the solvent&apos;s distance: <b>Rf = distance moved by spot ÷ distance moved by solvent</b>.
          Inks with matching spots (same Rf) contain the same dyes. The base line is drawn in pencil because pencil
          doesn&apos;t dissolve.
        </Insight>
        <Challenge>Measure the Rf of every coloured spot. Which ink contains the most dyes? Is there a pure dye among them?</Challenge>
      </div>
    </div>
  );
}
