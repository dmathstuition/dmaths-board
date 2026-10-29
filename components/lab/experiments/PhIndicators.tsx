"use client";
import { useState } from "react";
import { Panel, Segmented, LabButton, Insight, Challenge, Readout } from "@/components/lab/LabUI";
import { SUBSTANCES, indicatorColour, phCategory, universalColour, type PhIndicator } from "@/lib/lab/sims";

const C = "#F472B6";
const INDICATORS: { value: PhIndicator; label: string }[] = [
  { value: "universal", label: "Universal" }, { value: "litmus", label: "Litmus" },
  { value: "phenolphthalein", label: "Phenolphthalein" }, { value: "methyl-orange", label: "Methyl orange" },
];
type Row = { sub: string; ind: PhIndicator; colour: string };

export default function PhIndicators() {
  const [sub, setSub] = useState<string>("lemon");
  const [ind, setInd] = useState<PhIndicator>("universal");
  const [rows, setRows] = useState<Row[]>([]);
  const s = SUBSTANCES.find((x) => x.id === sub)!;
  const col = indicatorColour(ind, s.ph);
  const label = (id: string) => SUBSTANCES.find((x) => x.id === id)!.label;

  function record() {
    setRows((r) => [...r.filter((x) => !(x.sub === sub && x.ind === ind)), { sub, ind, colour: col.name }]);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5">
        <Panel title="Test tube">
          <svg viewBox="0 0 300 280" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={`${s.label} with ${ind} indicator turns ${col.name}`}>
            <path d="M120 30 h60 v170 a30 30 0 0 1 -60 0 z" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.4)" strokeWidth="2" />
            <path d="M122 110 h56 v90 a28 28 0 0 1 -56 0 z" fill={col.hex} opacity=".85" className="transition-[fill] duration-700" />
            <text x="150" y="260" fontSize="13" textAnchor="middle" fill="rgba(255,255,255,.8)">{col.name}</text>
            {/* the universal pH scale */}
            {Array.from({ length: 15 }, (_, p) => (
              <rect key={p} x={12 + p * 18.4} y="8" width="17" height="10" rx="2" fill={universalColour(p).hex} opacity=".8" />
            ))}
            {ind === "universal" && <path d={`M${12 + s.ph * 18.4 + 8} 20 l-5 8 h10 z`} fill="#fff" />}
          </svg>
          <div className="mt-4 flex flex-wrap gap-2">
            <LabButton color={C} onClick={record}>＋ Record result</LabButton>
            <LabButton variant="ghost" onClick={() => setRows([])} disabled={!rows.length}>Clear table</LabButton>
          </div>
        </Panel>
        <Panel title="Indicator">
          <Segmented label="Indicator" value={ind} onChange={(v) => setInd(v as PhIndicator)} color={C} options={INDICATORS} />
        </Panel>
      </div>
      <div className="space-y-5">
        <Panel title="Substance">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SUBSTANCES.map((x) => (
              <button key={x.id} type="button" onClick={() => setSub(x.id)} aria-pressed={sub === x.id}
                className={`min-h-[44px] rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${sub === x.id ? "bg-pink-400 text-[#070B1A]" : "bg-white/5 text-white/80 hover:bg-white/10"}`}>
                {x.label}
              </button>
            ))}
          </div>
        </Panel>
        <div className="grid grid-cols-2 gap-3">
          <Readout label="pH (universal)" value={ind === "universal" ? `≈ ${Math.round(s.ph)}` : "?"} color={C} />
          <Readout label="Type" value={ind === "universal" ? phCategory(s.ph) : "use universal"} color="#FACC15" />
        </div>
        {rows.length > 0 && (
          <Panel title="Results">
            <table className="w-full text-left text-xs text-white/70">
              <thead><tr className="text-white/40"><th className="py-1">Substance</th><th>Indicator</th><th>Colour</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={`${r.sub}-${r.ind}`} className="border-t border-white/5"><td className="py-1">{label(r.sub)}</td><td>{INDICATORS.find((i) => i.value === r.ind)!.label}</td><td>{r.colour}</td></tr>
              ))}</tbody>
            </table>
          </Panel>
        )}
        <Insight color={C}>
          <b>Litmus</b> only tells acid (red) from alkali (blue). <b>Phenolphthalein</b> is colourless in acid and turns
          pink above pH 8.2; <b>methyl orange</b> is red in acid and yellow above pH 4.4. <b>Universal indicator</b> mixes
          several dyes, so its colour gives an approximate pH from 0 to 14.
        </Insight>
        <Challenge>Test every substance with litmus and phenolphthalein. Which pairs look the same with litmus but different with universal indicator?</Challenge>
      </div>
    </div>
  );
}
