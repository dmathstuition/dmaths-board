"use client";
import { useState } from "react";
import { Panel, Slider, Readout, Insight, Challenge, LabButton } from "@/components/lab/LabUI";
import { momentNcm, netMoment, balanced, beamTilt, balancingDistance, type Load } from "@/lib/lab/sims";

const C = "#F59E0B";
// A hidden "mystery" mass for the challenge (g), fixed per visit.
const MYSTERY = [120, 180, 240, 300][Math.floor(Math.random() * 4)];

export default function Moments() {
  const [leftMass, setLeftMass] = useState(200);
  const [leftDist, setLeftDist] = useState(30);
  const [rightMass, setRightMass] = useState(100);
  const [rightDist, setRightDist] = useState(40);
  const [mystery, setMystery] = useState(false);
  const [guess, setGuess] = useState("");
  const [verdict, setVerdict] = useState<string | null>(null);

  const lm = mystery ? MYSTERY : leftMass;
  const loads: Load[] = [
    { massG: lm, distCm: leftDist, side: "left" },
    { massG: rightMass, distCm: rightDist, side: "right" },
  ];
  const tilt = beamTilt(loads);
  const ok = balanced(loads, 0.05);
  const acw = momentNcm(lm, leftDist), cw = momentNcm(rightMass, rightDist);
  const need = balancingDistance(acw, rightMass);

  // Beam: 50 cm each side of the pivot, 5 px per cm.
  const px = (cm: number) => cm * 5;
  function check() {
    const g = Number(guess);
    if (!g) return;
    setVerdict(Math.abs(g - MYSTERY) <= 5 ? `Correct — the mystery mass is ${MYSTERY} g.` : `Not quite. Balance the beam first, then use m₁d₁ = m₂d₂.`);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <div className="space-y-5">
        <Panel title="Metre rule on a pivot">
          <svg viewBox="0 0 600 300" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={`Beam ${ok ? "balanced" : tilt > 0 ? "tipping right" : "tipping left"}`}>
            {/* stand */}
            <polygon points="300,170 270,260 330,260" fill="#475569" />
            <rect x="200" y="258" width="200" height="10" rx="3" fill="#334155" />
            <g transform={`rotate(${tilt} 300 165)`} style={{ transition: "transform .5s cubic-bezier(.2,.8,.2,1)" }}>
              <rect x="40" y="155" width="520" height="14" rx="3" fill="#FDE68A" stroke="#B45309" />
              {Array.from({ length: 21 }, (_, i) => (
                <g key={i}>
                  <line x1={50 + i * 25} x2={50 + i * 25} y1="155" y2={i % 2 ? 161 : 165} stroke="#92400E" />
                  {i % 2 === 0 && <text x={50 + i * 25} y="152" fontSize="9" textAnchor="middle" fill="rgba(255,255,255,.55)">{Math.abs(50 - i * 5)}</text>}
                </g>
              ))}
              {/* hanging masses */}
              {loads.map((l, i) => {
                const x = 300 + (l.side === "right" ? 1 : -1) * px(l.distCm);
                const h = 18 + Math.min(40, l.massG / 10);
                return (
                  <g key={i}>
                    <line x1={x} x2={x} y1="169" y2="200" stroke="#94A3B8" strokeWidth="1.5" />
                    <rect x={x - 18} y="200" width="36" height={h} rx="4" fill={i === 0 && mystery ? "#A855F7" : i ? "#38BDF8" : "#F472B6"} />
                    <text x={x} y={200 + h / 2 + 4} fontSize="11" fontWeight="700" textAnchor="middle" fill="#070B1A">
                      {i === 0 && mystery ? "?" : `${l.massG}g`}
                    </text>
                  </g>
                );
              })}
            </g>
            <circle cx="300" cy="165" r="6" fill="#F59E0B" />
            <text x="300" y="290" fontSize="12" textAnchor="middle" fontWeight="700" fill={ok ? "#34D399" : "#FCA5A5"}>
              {ok ? "Balanced" : tilt > 0 ? "Clockwise moment is bigger" : "Anticlockwise moment is bigger"}
            </text>
          </svg>
        </Panel>
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Anticlockwise" value={acw.toFixed(1)} unit="N cm" color="#F472B6" />
          <Readout label="Clockwise" value={cw.toFixed(1)} unit="N cm" color="#38BDF8" />
          <Readout label="Net" value={netMoment(loads).toFixed(1)} unit="N cm" color={ok ? "#34D399" : C} />
        </div>
      </div>
      <div className="space-y-5">
        <Panel title="Left side (anticlockwise)">
          <div className="space-y-4">
            {!mystery && <Slider label="Mass" value={leftMass} min={50} max={500} step={10} unit=" g" color="#F472B6" onChange={setLeftMass} />}
            <Slider label="Distance from pivot" value={leftDist} min={5} max={50} unit=" cm" color="#F472B6" onChange={setLeftDist} />
          </div>
        </Panel>
        <Panel title="Right side (clockwise)">
          <div className="space-y-4">
            <Slider label="Mass" value={rightMass} min={50} max={500} step={10} unit=" g" color="#38BDF8" onChange={setRightMass} />
            <Slider label="Distance from pivot" value={rightDist} min={5} max={50} unit=" cm" color="#38BDF8" onChange={setRightDist} />
            {need <= 50 && !ok && !mystery && <p className="text-xs text-white/50">Hint: the right mass would balance at {need.toFixed(1)} cm.</p>}
          </div>
        </Panel>
        <Insight color={C}>
          A moment is <b>force × perpendicular distance from the pivot</b>. The beam balances when the
          <b> sum of clockwise moments = sum of anticlockwise moments</b> — the principle of moments: m₁d₁ = m₂d₂.
        </Insight>
        <Challenge>
          <p>Hide the left mass and find it using only the beam.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <LabButton variant="ghost" onClick={() => { setMystery((m) => !m); setVerdict(null); setGuess(""); }}>
              {mystery ? "Show the mass" : "Use a mystery mass"}
            </LabButton>
            {mystery && (
              <>
                <input value={guess} onChange={(e) => setGuess(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal"
                  aria-label="Your answer in grams" placeholder="mass in g"
                  className="h-11 w-28 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white" />
                <LabButton color={C} onClick={check}>Check</LabButton>
              </>
            )}
          </div>
          {verdict && <p className="mt-2 font-semibold">{verdict}</p>}
        </Challenge>
      </div>
    </div>
  );
}
