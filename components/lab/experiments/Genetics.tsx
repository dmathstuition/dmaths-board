"use client";
import { useState } from "react";
import { Panel, Readout, Insight, Challenge, LabButton, Segmented } from "@/components/lab/LabUI";
import { punnett, crossRatios, gametes, type Genotype } from "@/lib/lab/sims";

const C = "#84CC16";
const TRAITS = [
  { id: "pea", label: "Pea height", dom: "Tall", rec: "Dwarf", domColor: "#22C55E", recColor: "#A3E635" },
  { id: "eye", label: "Eye colour", dom: "Brown", rec: "Blue", domColor: "#92400E", recColor: "#3B82F6" },
  { id: "flower", label: "Flower colour", dom: "Purple", rec: "White", domColor: "#A855F7", recColor: "#F1F5F9" },
] as const;
type TraitId = (typeof TRAITS)[number]["id"];
const GENOTYPES: Genotype[] = ["AA", "Aa", "aa"];

function Organism({ g, trait, size = 34 }: { g: Genotype; trait: (typeof TRAITS)[number]; size?: number }) {
  const dominant = g.includes("A");
  const fill = dominant ? trait.domColor : trait.recColor;
  if (trait.id === "pea") {
    const h = dominant ? size : size * 0.5;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <line x1={size / 2} x2={size / 2} y1={size} y2={size - h} stroke="#4D7C0F" strokeWidth="3" />
        <ellipse cx={size / 2 - 6} cy={size - h * 0.6} rx="6" ry="3" fill={fill} />
        <ellipse cx={size / 2 + 6} cy={size - h * 0.35} rx="6" ry="3" fill={fill} />
      </svg>
    );
  }
  if (trait.id === "eye") {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden>
        <ellipse cx="17" cy="17" rx="15" ry="9" fill="#F8FAFC" />
        <circle cx="17" cy="17" r="7" fill={fill} /><circle cx="17" cy="17" r="3" fill="#0F172A" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden>
      {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="17" cy="9" rx="5" ry="8" fill={fill} stroke="#475569" strokeWidth=".5" transform={`rotate(${a} 17 17)`} />)}
      <circle cx="17" cy="17" r="4" fill="#FACC15" />
    </svg>
  );
}

export default function Genetics() {
  const [traitId, setTraitId] = useState<TraitId>("pea");
  const [p1, setP1] = useState<Genotype>("Aa");
  const [p2, setP2] = useState<Genotype>("Aa");
  const [offspring, setOffspring] = useState<Genotype[]>([]);
  const trait = TRAITS.find((t) => t.id === traitId)!;
  const grid = punnett(p1, p2);
  const r = crossRatios(p1, p2);
  const [g1, g2] = [gametes(p1), gametes(p2)];
  const phen = (g: Genotype) => (g.includes("A") ? trait.dom : trait.rec);

  function breed(n: number) {
    const cells = grid.flat();
    setOffspring((o) => [...o, ...Array.from({ length: n }, () => cells[Math.floor(Math.random() * 4)])].slice(-200));
  }
  const domCount = offspring.filter((g) => g.includes("A")).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        <Panel title="Parents">
          <div className="space-y-3">
            <Segmented label="Trait" value={traitId} onChange={(v) => { setTraitId(v); setOffspring([]); }} color={C}
              options={TRAITS.map((t) => ({ value: t.id, label: t.label }))} />
            {[["Parent 1", p1, setP1], ["Parent 2", p2, setP2]].map(([label, val, setter]) => (
              <div key={label as string} className="flex items-center gap-3">
                <Organism g={val as Genotype} trait={trait} size={40} />
                <div className="flex-1">
                  <Segmented label={label as string} value={val as Genotype} color={C}
                    onChange={(v) => { (setter as (g: Genotype) => void)(v); setOffspring([]); }}
                    options={GENOTYPES.map((g) => ({ value: g, label: `${g} · ${g.includes("A") ? trait.dom : trait.rec}` }))} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Punnett square">
          <div className="mx-auto grid max-w-sm grid-cols-3 gap-2 text-center font-mono">
            <div />
            {g2.map((g, i) => <div key={i} className="rounded-xl bg-white/5 py-2 text-lg font-bold text-sky-300">{g}</div>)}
            {grid.map((row, i) => (
              <div key={i} className="contents">
                <div className="flex items-center justify-center rounded-xl bg-white/5 text-lg font-bold text-pink-300">{g1[i]}</div>
                {row.map((cell, j) => (
                  <div key={j} className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-black/25 py-2">
                    <Organism g={cell} trait={trait} />
                    <span className="text-base font-bold text-white">{cell}</span>
                    <span className="font-sans text-[11px] text-white/50">{phen(cell)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Genotypes" value={`${r.AA}:${r.Aa}:${r.aa}`} unit="AA:Aa:aa" color="#38BDF8" />
          <Readout label={trait.dom} value={`${r.dominant * 25}%`} color={trait.domColor} />
          <Readout label={trait.rec} value={`${r.recessive * 25}%`} color={trait.recColor === "#F1F5F9" ? "#E2E8F0" : trait.recColor} />
        </div>
        <Panel title="Breed offspring" right={<span className="font-mono text-xs text-white/50">{offspring.length} bred</span>}>
          <div className="flex flex-wrap gap-2">
            <LabButton color={C} onClick={() => breed(1)}>Breed 1</LabButton>
            <LabButton variant="ghost" onClick={() => breed(20)}>Breed 20</LabButton>
            <LabButton variant="ghost" onClick={() => setOffspring([])}>Clear</LabButton>
          </div>
          {offspring.length > 0 && (
            <>
              <div className="mt-3 flex max-h-40 flex-wrap gap-0.5 overflow-y-auto">
                {offspring.map((g, i) => <Organism key={i} g={g} trait={trait} size={22} />)}
              </div>
              <p className="mt-2 text-sm text-white/75">
                {trait.dom}: <b>{domCount}</b> · {trait.rec}: <b>{offspring.length - domCount}</b> — observed ratio{" "}
                <b>{offspring.length - domCount ? (domCount / (offspring.length - domCount)).toFixed(2) : "∞"} : 1</b>
                {" "}(expected {r.recessive ? (r.dominant / r.recessive).toFixed(0) : "all dominant"}{r.recessive ? " : 1" : ""})
              </p>
            </>
          )}
        </Panel>
        <Insight color={C}>
          Each parent passes on <b>one allele</b> per gene in its gametes. A dominant allele (A) shows whenever it is
          present; the recessive phenotype appears only in <b>aa</b>. Crossing two heterozygotes (Aa × Aa) gives
          genotypes 1 : 2 : 1 and phenotypes 3 : 1 — Mendel&apos;s monohybrid ratio.
        </Insight>
        <Challenge>A tall pea plant could be AA or Aa. Which cross (a <b>test cross</b>) would tell you? Try it, and breed 40 offspring to check.</Challenge>
      </div>
    </div>
  );
}
