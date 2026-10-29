"use client";
import { useState } from "react";
import { Panel, Readout, LabButton, Segmented, Insight, Challenge, Chart } from "@/components/lab/LabUI";
import { outcomes, theoretical, sample, relativeFrequencies, SPINNER, type ProbMode } from "@/lib/lab/sims";

const C = "#38BDF8";
const MODES: { value: ProbMode; label: string }[] = [
  { value: "coin", label: "🪙 Coin" },
  { value: "die", label: "🎲 Die" },
  { value: "twoDice", label: "🎲🎲 Two dice" },
  { value: "spinner", label: "🎡 Spinner" },
];
// The outcome whose running proportion we chart (index into outcomes()).
const TRACK: Record<ProbMode, number> = { coin: 0, die: 5, twoDice: 5, spinner: 0 };
const MAX_POINTS = 300;

function Pips({ n }: { n: number }) {
  const spots: Record<number, [number, number][]> = {
    1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
  };
  return (
    <svg viewBox="0 0 100 100" className="h-20 w-20 drop-shadow-[0_8px_20px_rgba(56,189,248,.35)]" aria-label={`Die showing ${n}`} role="img">
      <rect x="4" y="4" width="92" height="92" rx="20" fill="#F8FAFC" />
      {spots[n].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="8.5" fill="#0F172A" />)}
    </svg>
  );
}

function SpinnerWheel({ angle }: { angle: number }) {
  let start = 0;
  const arcs = SPINNER.map((s) => {
    const a0 = start, a1 = start + s.weight * 360;
    start = a1;
    const r = 46, cx = 50, cy = 50;
    const p = (deg: number) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return <path key={s.label} d={`M50,50 L${x0},${y0} A46,46 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1},${y1} Z`} fill={s.color} stroke="#070B1A" strokeWidth="1.5" />;
  });
  return (
    <svg viewBox="0 0 100 108" className="h-28 w-28" role="img" aria-label="Spinner">
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "50px 50px", transition: "transform .9s cubic-bezier(.15,.85,.25,1)" }}>{arcs}</g>
      <circle cx="50" cy="50" r="6" fill="#F8FAFC" />
      <path d="M50 0 L56 12 L44 12 Z" fill="#F8FAFC" />
    </svg>
  );
}

export default function Probability() {
  const [mode, setMode] = useState<ProbMode>("coin");
  const [counts, setCounts] = useState<number[]>(() => Array(outcomes("coin").length).fill(0));
  const [history, setHistory] = useState<[number, number][]>([]);
  const [last, setLast] = useState<{ index: number; faces?: [number, number] } | null>(null);
  const [spin, setSpin] = useState(0);
  const [roll, setRoll] = useState(0); // bumps to replay the pop animation

  const labels = outcomes(mode);
  const theory = theoretical(mode);
  const freq = relativeFrequencies(counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const tracked = TRACK[mode];

  function switchMode(m: ProbMode) {
    setMode(m); setCounts(Array(outcomes(m).length).fill(0)); setHistory([]); setLast(null);
  }

  function run(n: number) {
    const next = [...counts];
    let t = total;
    let hits = counts[tracked];
    const hist: [number, number][] = [];
    const every = Math.max(1, Math.ceil((total + n) / MAX_POINTS));
    let r = sample(mode);
    for (let i = 0; i < n; i++) {
      r = sample(mode);
      next[r.index]++;
      t++;
      if (r.index === tracked) hits++;
      if (t % every === 0 || i === n - 1) hist.push([t, hits / t]);
    }
    setCounts(next);
    setHistory((h) => [...h.filter(([x]) => x % every === 0), ...hist].slice(-MAX_POINTS));
    setLast(r);
    setRoll((k) => k + 1);
    if (mode === "spinner") {
      let start = 0;
      for (let i = 0; i < r.index; i++) start += SPINNER[i].weight * 360;
      const mid = start + (SPINNER[r.index].weight * 360) / 2;
      setSpin((a) => a + 1440 - ((a + 1440) % 360) - mid);
    }
  }

  const reset = () => switchMode(mode);
  // Headroom above the tallest bar so differences read clearly.
  const maxBar = Math.max(...theory, ...freq, 0.01) * 1.3;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        <Panel title="Experiment">
          <Segmented label="Choose an experiment" options={MODES} value={mode} onChange={switchMode} color={C} />

          {/* Stage */}
          <div className="mt-5 flex min-h-[150px] items-center justify-center rounded-2xl border border-white/10 bg-black/30">
            {mode === "spinner" ? (
              <SpinnerWheel angle={spin} />
            ) : !last ? (
              <p className="text-sm text-white/45">Press a button to run the experiment ↓</p>
            ) : mode === "coin" ? (
              <div key={roll} className="elab-pop flex h-24 w-24 items-center justify-center rounded-full text-center text-sm font-extrabold text-amber-950"
                style={{ background: "radial-gradient(circle at 35% 30%, #FDE68A, #F59E0B 70%, #B45309)", boxShadow: "0 10px 30px -8px #F59E0B" }}>
                {labels[last.index].toUpperCase()}
              </div>
            ) : mode === "die" ? (
              <div key={roll} className="elab-pop"><Pips n={last.index + 1} /></div>
            ) : (
              <div key={roll} className="elab-pop flex items-center gap-3">
                <Pips n={last.faces![0]} /><span className="text-2xl font-bold text-white/60">+</span><Pips n={last.faces![1]} />
                <span className="text-2xl font-bold text-white/60">=</span><span className="font-mono text-4xl font-bold text-cyan-300">{last.index + 2}</span>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[1, 10, 100, 1000].map((n) => (
              <LabButton key={n} onClick={() => run(n)} color={C}>▶ ×{n.toLocaleString()}</LabButton>
            ))}
            <LabButton variant="ghost" onClick={reset}>Reset</LabButton>
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-3">
          <Readout label="Total trials" value={total.toLocaleString()} color={C} big />
          <Readout label={`P(${labels[tracked]}) — experiment`} value={total ? freq[tracked].toFixed(3) : "—"} color="#F472B6" big />
          <Readout label={`P(${labels[tracked]}) — theory`} value={theory[tracked].toFixed(3)} color="#34D399" />
          <Readout label="Difference" value={total ? Math.abs(freq[tracked] - theory[tracked]).toFixed(3) : "—"} color="#FACC15" />
        </div>
      </div>

      <div className="space-y-5">
        <Panel title="Results vs theory" right={<span className="text-[11px] text-white/45"><span className="text-pink-400">■</span> experiment &nbsp;<span className="text-emerald-400">▬</span> theory</span>}>
          <div className="flex h-48 items-end gap-1.5">
            {labels.map((l, i) => (
              <div key={l} className="flex h-full flex-1 flex-col items-center justify-end">
                <div className="relative flex w-full flex-1 items-end">
                  <div className="w-full rounded-t-md bg-gradient-to-t from-pink-600 to-pink-400 transition-[height] duration-500"
                    style={{ height: `${(freq[i] / maxBar) * 100}%` }} title={`${l}: ${counts[i]}`} />
                  <div className="absolute inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34D399]" style={{ bottom: `${(theory[i] / maxBar) * 100}%` }} />
                </div>
                <span className="mt-1.5 text-[10px] font-bold text-white/55">{mode === "spinner" ? l.slice(0, 3) : l.slice(0, 5)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={`Running proportion of “${labels[tracked]}”`}>
          <Chart title="Running proportion against number of trials" xLabel="Trials" yLabel="Proportion"
            xMax={Math.max(10, total)} yMax={1} height={200}
            series={[
              { points: [[0, theory[tracked]], [Math.max(10, total), theory[tracked]]], color: "#34D399", dashed: true },
              { points: history, color: "#F472B6" },
            ]} />
        </Panel>

        <Insight color={C}>
          Each trial is random, so a handful of results can look nothing like the theory. Run thousands and the
          experimental probability settles towards the theoretical one — this is the <b>law of large numbers</b>.
          {mode === "twoDice" && <> With two dice there are 36 equally likely pairs, and 6 of them make 7 — so 7 wins most often.</>}
          {mode === "spinner" && <> The red sector is half the wheel, so P(Red) = ½ — sector size sets the probability.</>}
        </Insight>
        <Challenge>
          {mode === "coin" && "Run 10 flips three times. Do you always get exactly 5 heads? Now run 1,000 — how close to 0.5 do you get?"}
          {mode === "die" && "Predict how many sixes you'd expect in 600 rolls. Run ×100 six times and compare."}
          {mode === "twoDice" && "Which total is least likely? Explain why using the 36 possible pairs."}
          {mode === "spinner" && "What's P(Green or Yellow)? Check it by running 1,000 spins and adding their bars."}
        </Challenge>
      </div>
    </div>
  );
}
