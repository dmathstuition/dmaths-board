"use client";
import { useMemo, useState } from "react";
import { Panel, Segmented, Insight, Challenge, LabButton } from "@/components/lab/LabUI";
import { METALS, bubbleRate, safeToTest, type Reagent } from "@/lib/lab/sims";

const C = "#F472B6";
type Result = { symbol: string; label: string; acid?: number; water?: number };
const vigour = (r: number) => (r >= 0.9 ? "Violent" : r >= 0.6 ? "Vigorous" : r >= 0.3 ? "Steady" : r > 0.02 ? "Slow" : r > 0 ? "Very slow" : "None");

export default function Reactivity() {
  const [idx, setIdx] = useState(3);
  const [reagent, setReagent] = useState<Reagent>("acid");
  const [results, setResults] = useState<Record<string, Result>>({});
  const metal = METALS[idx];
  const safe = safeToTest(metal, reagent);
  const rate = safe ? bubbleRate(metal, reagent) : 0;

  const bubbles = useMemo(() => Array.from({ length: 26 }, (_, i) => ({
    x: 128 + ((i * 29) % 44), dx: ((i * 11) % 16) - 8, delay: (i * 0.31) % 2, r: 2.5 + (i % 3),
  })), []);
  const visible = Math.round(rate * bubbles.length);
  const dur = Math.max(0.6, 2.6 - rate * 2);
  const liquid = reagent === "acid" ? "rgba(254, 240, 138, .28)" : "rgba(56, 189, 248, .3)";

  function record() {
    setResults((r) => ({ ...r, [metal.symbol]: { ...r[metal.symbol], symbol: metal.symbol, label: metal.label, [reagent]: safe ? rate : 1 } }));
  }
  // League table: most reactive first, ranked on whichever tests have been run.
  const table = Object.values(results).sort((a, b) => (b.acid ?? b.water ?? 0) + (b.water ?? 0) - ((a.acid ?? a.water ?? 0) + (a.water ?? 0)));

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        <Panel title="Test tube">
          <svg viewBox="0 0 300 300" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={safe ? `${metal.label} in ${reagent === "acid" ? "dilute acid" : "water"}: ${vigour(rate)} reaction` : `${metal.label} is too dangerous to test with acid`}>
            <rect x="110" y="40" width="80" height="220" rx="38" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.45)" strokeWidth="2" />
            <rect x="113" y="120" width="74" height="137" rx="34" fill={liquid} />
            {/* the metal sample */}
            {safe && <rect x="135" y="232" width="30" height="14" rx="4" fill={metal.symbol === "Au" ? "#FACC15" : metal.symbol === "Cu" ? "#F97316" : "#CBD5E1"}
              className={rate > 0.6 ? "elab-float" : ""} />}
            {safe && bubbles.slice(0, visible).map((b, i) => (
              <circle key={`${metal.symbol}-${reagent}-${i}`} cx={b.x} cy="235" r={b.r} fill="rgba(255,255,255,.8)" className="elab-bubble"
                style={{ ["--dx" as any]: `${b.dx}px`, ["--dur" as any]: `${dur}s`, animationDelay: `${b.delay}s` }} />
            ))}
            {safe && rate >= 0.9 && <text x="150" y="30" textAnchor="middle" fontSize="22" className="elab-pop">💥</text>}
            {!safe && <text x="150" y="180" textAnchor="middle" fontSize="13" fontWeight="800" fill="#F87171">⛔ Not safe to test</text>}
            <text x="150" y="285" textAnchor="middle" fontSize="13" fontWeight="800" fill="rgba(255,255,255,.75)">{metal.label} + {reagent === "acid" ? "dilute HCl" : "cold water"}</text>
          </svg>
          <p className="mt-3 text-sm leading-relaxed text-white/75"><b style={{ color: C }}>{safe ? vigour(rate) : "Too dangerous"}.</b> {metal.note}</p>
          <div className="mt-3"><LabButton color={C} onClick={record}>＋ Record observation</LabButton></div>
        </Panel>
        <Panel title="Choose">
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Metal">
              {METALS.map((m, i) => (
                <button key={m.symbol} type="button" role="radio" aria-checked={i === idx} onClick={() => setIdx(i)}
                  className={`rounded-xl border px-2 py-2 text-center transition ${i === idx ? "border-transparent text-[#070B1A]" : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"}`}
                  style={i === idx ? { background: C } : undefined}>
                  <span className="block font-mono text-lg font-black">{m.symbol}</span>
                  <span className="block text-[10px] font-bold opacity-80">{m.label}</span>
                </button>
              ))}
            </div>
            <Segmented label="Add to" value={reagent} onChange={(v) => setReagent(v as Reagent)} color={C}
              options={[{ value: "acid", label: "Dilute acid" }, { value: "water", label: "Cold water" }]} />
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel title="Your reactivity league table">
          {table.length === 0 ? <p className="text-sm text-white/50">Test some metals and record what you see — they&apos;ll be ranked here.</p> : (
            <ol className="space-y-2">
              {table.map((r, i) => (
                <li key={r.symbol} className="flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2 text-sm">
                  <span className="w-5 font-mono font-black text-white/40">{i + 1}</span>
                  <span className="w-9 font-mono font-black" style={{ color: C }}>{r.symbol}</span>
                  <span className="flex-1 font-semibold text-white/85">{r.label}</span>
                  <span className="text-xs text-white/55">acid: {r.acid === undefined ? "—" : vigour(r.acid)} · water: {r.water === undefined ? "—" : vigour(r.water)}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <Insight color={C}>
          Metals higher in the <b>reactivity series</b> lose electrons more easily, so they react faster — fizzing
          hydrogen from acids and even from water. Metals <b>below hydrogen</b> (copper, silver, gold) can&apos;t
          displace it, so nothing happens. Order: K, Na, Ca, Mg, (Al, C), Zn, Fe, (Pb, H), Cu, Ag, Au.
        </Insight>
        <Challenge>Test every metal in both acid and water. Which metals react with acid but not cold water? Write a word equation for magnesium + hydrochloric acid.</Challenge>
      </div>
    </div>
  );
}
