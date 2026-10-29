"use client";
import { useState } from "react";
import { Panel, Readout, Slider, Insight, Challenge } from "@/components/lab/LabUI";
import { simplify, equivalent, compareFractions, addFractions } from "@/lib/lab/sims";

const C = "#38BDF8", D = "#F472B6";
const ROWS = [1, 2, 3, 4, 5, 6, 8, 10, 12];

export default function FractionWall() {
  const [a, setA] = useState<[number, number]>([2, 3]);
  const [b, setB] = useState<[number, number]>([3, 4]);
  const cmp = compareFractions(a, b);
  const eq = equivalent(a, b);
  const sum = addFractions(a, b);
  const fmt = (f: [number, number]) => `${f[0]}/${f[1]}`;
  const setFrac = (which: "a" | "b", part: 0 | 1, v: number) => {
    const cur = which === "a" ? a : b;
    const next: [number, number] = part === 0 ? [Math.min(v, cur[1]), cur[1]] : [Math.min(cur[0], v), v];
    (which === "a" ? setA : setB)(next);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <Panel title="Fraction wall">
        <svg viewBox="0 0 400 300" className="h-auto w-full rounded-2xl bg-black/30" role="img" aria-label={`Fraction wall comparing ${fmt(a)} and ${fmt(b)}`}>
          {ROWS.map((d, r) => {
            const y = 8 + r * 32, w = 384 / d;
            return Array.from({ length: d }, (_, i) => {
              const inA = d === a[1] && i < a[0], inB = d === b[1] && i < b[0];
              return (
                <g key={`${d}-${i}`}>
                  <rect x={8 + i * w} y={y} width={w - 2} height={28} rx={4}
                    fill={inA && inB ? "#A78BFA" : inA ? C : inB ? D : "rgba(255,255,255,.06)"} stroke="rgba(255,255,255,.15)" />
                  {w > 26 && <text x={8 + i * w + w / 2 - 1} y={y + 18} fontSize="10" textAnchor="middle" fill={inA || inB ? "#070B1A" : "rgba(255,255,255,.5)"}>1/{d}</text>}
                </g>
              );
            });
          })}
          <line x1={8 + (a[0] / a[1]) * 384} x2={8 + (a[0] / a[1]) * 384} y1="2" y2="298" stroke={C} strokeWidth="2" strokeDasharray="4 3" />
          <line x1={8 + (b[0] / b[1]) * 384} x2={8 + (b[0] / b[1]) * 384} y1="2" y2="298" stroke={D} strokeWidth="2" strokeDasharray="4 3" />
        </svg>
        <p className="mt-2 text-xs text-white/50">Blue shows the first fraction, pink the second. The dashed lines mark how far along the whole each one reaches.</p>
      </Panel>

      <div className="space-y-5">
        <Panel title="First fraction (blue)">
          <div className="space-y-3">
            <Slider label="Numerator" value={a[0]} min={1} max={a[1]} onChange={(v) => setFrac("a", 0, v)} color={C} />
            <Slider label="Denominator" value={a[1]} min={1} max={12} onChange={(v) => setFrac("a", 1, v)} color={C} />
          </div>
        </Panel>
        <Panel title="Second fraction (pink)">
          <div className="space-y-3">
            <Slider label="Numerator" value={b[0]} min={1} max={b[1]} onChange={(v) => setFrac("b", 0, v)} color={D} />
            <Slider label="Denominator" value={b[1]} min={1} max={12} onChange={(v) => setFrac("b", 1, v)} color={D} />
          </div>
        </Panel>
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Compare" value={`${fmt(a)} ${cmp < 0 ? "<" : cmp > 0 ? ">" : "="} ${fmt(b)}`} color="#FACC15" />
          <Readout label="Simplest" value={`${fmt(simplify(...a))} · ${fmt(simplify(...b))}`} color="#34D399" />
          <Readout label="Sum" value={sum[0] >= sum[1] && sum[1] !== 1 ? `${fmt(sum)} = ${Math.floor(sum[0] / sum[1])} ${sum[0] % sum[1]}/${sum[1]}` : fmt(sum)} color={C} />
        </div>
        {eq && <p className="elab-pop rounded-xl bg-emerald-400/15 px-3 py-2 text-sm font-bold text-emerald-300">✓ Equivalent fractions — they cover exactly the same length of the wall.</p>}
        <Insight color={C}>
          Equivalent fractions reach the same point on the wall: 1/2 = 2/4 = 3/6 = 6/12. To compare fractions,
          rewrite them over a <b>common denominator</b> — or cross-multiply: a/b &lt; c/d when a×d &lt; c×b.
        </Insight>
        <Challenge>Find three fractions equal to 2/3 on the wall. Then find two fractions that add up to exactly 1.</Challenge>
      </div>
    </div>
  );
}
