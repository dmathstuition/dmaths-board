"use client";
import { useEffect, useRef, useState } from "react";
import { Panel, Readout, LabButton, Segmented, Insight, Challenge, Chart } from "@/components/lab/LabUI";
import { titrationPH, equivalenceVolume, indicatorColor, type Indicator } from "@/lib/lab/sims";

const C = "#F472B6";
const ACID_ML = 25, CB = 0.1, BURETTE = 50;
const INDICATORS: { value: Indicator; label: string; range: string }[] = [
  { value: "phenolphthalein", label: "Phenolphthalein", range: "colourless → pink at pH 8.2–10" },
  { value: "methylOrange", label: "Methyl orange", range: "red → yellow at pH 3.1–4.4" },
  { value: "bromothymolBlue", label: "Bromothymol blue", range: "yellow → blue at pH 6.0–7.6" },
  { value: "universal", label: "Universal", range: "red → green → violet across 1–13" },
];

export default function Titration() {
  const [ca, setCa] = useState<"0.1" | "0.2">("0.1");
  const [ind, setInd] = useState<Indicator>("phenolphthalein");
  const [added, setAdded] = useState(0);
  const [curve, setCurve] = useState<[number, number][]>([[0, titrationPH(ACID_ML, 0.1, 0, CB)]]);
  const [tapOpen, setTapOpen] = useState(false);
  const [drip, setDrip] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval>>();

  const acidC = Number(ca);
  const ph = titrationPH(ACID_ML, acidC, added, CB);
  const veq = equivalenceVolume(ACID_ML, acidC, CB);
  const flask = indicatorColor(ind, ph);
  const left = BURETTE - added;

  // The volume lives in a ref too so the tap's interval always adds to the
  // latest value without nesting state updates.
  const addedRef = useRef(0);
  function add(ml: number) {
    const next = Math.min(BURETTE, +(addedRef.current + ml).toFixed(2));
    if (next === addedRef.current) return;
    addedRef.current = next;
    setAdded(next);
    setCurve((c) => [...c, [next, titrationPH(ACID_ML, acidC, next, CB)]]);
    setDrip((d) => d + 1);
  }

  // A slowly running tap: 0.2 mL every 150 ms until closed or empty.
  useEffect(() => {
    if (!tapOpen) return;
    tick.current = setInterval(() => add(0.2), 150);
    return () => clearInterval(tick.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tapOpen, acidC]);
  useEffect(() => { if (added >= BURETTE) setTapOpen(false); }, [added]);

  function reset(nextCa = ca) {
    setTapOpen(false); setAdded(0); addedRef.current = 0;
    setCurve([[0, titrationPH(ACID_ML, Number(nextCa), 0, CB)]]);
  }

  const nearEnd = Math.abs(added - veq) < 0.6;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
      <div className="space-y-5">
        <Panel title="Apparatus">
          <svg viewBox="0 0 300 360" className="mx-auto h-[360px] w-full max-w-xs" role="img"
            aria-label={`Burette with ${left.toFixed(1)} millilitres left above a flask at pH ${ph.toFixed(2)}`}>
            {/* stand */}
            <rect x="40" y="340" width="220" height="10" rx="3" fill="#475569" />
            <rect x="58" y="20" width="8" height="322" fill="#475569" />
            <rect x="62" y="70" width="86" height="7" rx="3" fill="#64748B" />
            {/* burette */}
            <rect x="138" y="20" width="24" height="200" rx="5" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.5)" />
            <rect x="140" y={22 + (1 - left / BURETTE) * 196} width="20" height={(left / BURETTE) * 196} fill="rgba(56,189,248,.35)" />
            {Array.from({ length: 11 }, (_, i) => (
              <g key={i}>
                <line x1="138" x2="146" y1={22 + i * 19.6} y2={22 + i * 19.6} stroke="rgba(255,255,255,.5)" />
                {i % 2 === 0 && <text x="167" y={26 + i * 19.6} fontSize="9" fill="rgba(255,255,255,.5)">{i * 5}</text>}
              </g>
            ))}
            {/* tap */}
            <rect x="146" y="220" width="8" height="22" fill="rgba(255,255,255,.5)" />
            <rect x="133" y="226" width="34" height="8" rx="4" fill={tapOpen ? "#34D399" : "#F87171"} style={{ transform: tapOpen ? "rotate(90deg)" : "none", transformOrigin: "150px 230px", transition: "transform .25s" }} />
            {/* drip */}
            {(tapOpen || drip > 0) && <circle key={drip} cx="150" cy="248" r="3.5" fill="rgba(56,189,248,.8)" className="elab-drip" />}
            {/* flask */}
            <path d="M132 258 V280 L95 336 Q92 342 100 342 H200 Q208 342 205 336 L168 280 V258 Z" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.55)" strokeWidth="2" />
            <path d="M108 318 L95 336 Q92 342 100 342 H200 Q208 342 205 336 L192 318 Z" fill={flask} style={{ transition: "fill .4s" }} />
          </svg>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <LabButton variant="ghost" onClick={() => add(0.1)} disabled={left <= 0}>+1 drop</LabButton>
            <LabButton variant="ghost" onClick={() => add(1)} disabled={left <= 0}>+1 mL</LabButton>
            <LabButton variant="ghost" onClick={() => add(5)} disabled={left <= 0}>+5 mL</LabButton>
            <LabButton color={tapOpen ? "#F87171" : "#34D399"} className="col-span-2" onClick={() => setTapOpen((t) => !t)} disabled={left <= 0}>
              {tapOpen ? "Close tap" : "Open tap"}
            </LabButton>
            <LabButton variant="ghost" onClick={() => reset()}>Reset</LabButton>
          </div>
        </Panel>
        <Panel title="Setup">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-white/75">25 mL of hydrochloric acid in the flask</p>
              <Segmented label="Acid concentration" color={C} value={ca} onChange={(v) => { setCa(v); reset(v); }}
                options={[{ value: "0.1", label: "0.1 mol/dm³" }, { value: "0.2", label: "0.2 mol/dm³" }]} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-white/75">Indicator</p>
              <div className="grid grid-cols-2 gap-2">
                {INDICATORS.map((i) => (
                  <button key={i.value} type="button" onClick={() => setInd(i.value)} aria-pressed={ind === i.value}
                    className={`rounded-xl border p-2 text-left text-xs transition ${ind === i.value ? "border-pink-400 bg-pink-400/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                    <span className="block font-bold text-white">{i.label}</span>
                    <span className="text-white/50">{i.range}</span>
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-white/45">Burette: sodium hydroxide, 0.1 mol/dm³.</p>
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="pH meter" value={ph.toFixed(2)} color={ph < 6.5 ? "#F87171" : ph > 7.5 ? "#818CF8" : "#34D399"} big />
          <Readout label="NaOH added" value={added.toFixed(1)} unit="mL" color="#38BDF8" />
          <Readout label="Solution is" value={ph < 6.9 ? "acidic" : ph > 7.1 ? "alkaline" : "neutral"} color={C} />
        </div>
        {nearEnd && <div className="elab-pop rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-3 text-center text-sm font-bold text-emerald-300">⚡ You&apos;re at the end point — watch the colour! Add drop by drop now.</div>}
        <Panel title="Titration curve">
          <Chart title="pH against volume of alkali added" xLabel="Volume of NaOH added (mL)" yLabel="pH" xMax={BURETTE} yMax={14} yTicks={7}
            markerX={veq} series={[{ points: curve, color: C }]} />
          <p className="mt-2 text-xs text-white/45">Dashed line: equivalence point at {veq} mL, where acid and alkali have exactly neutralised.</p>
        </Panel>
        <Insight color={C}>
          HCl + NaOH → NaCl + H₂O. Far from the end point the pH hardly moves, but near it a single drop can jump the
          pH by several units — the steep part of the curve. A good indicator changes colour <b>inside</b> that jump, which
          is why phenolphthalein works here.
        </Insight>
        <Challenge>Switch to 0.2 mol/dm³ acid. Predict the new end-point volume before you titrate. Then work out the concentration from your titre.</Challenge>
      </div>
    </div>
  );
}
