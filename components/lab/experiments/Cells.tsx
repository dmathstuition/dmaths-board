"use client";
import { useState } from "react";
import { Panel, Segmented, Insight, Challenge, LabButton, Readout } from "@/components/lab/LabUI";
import { CELL_PARTS, partsOf, type CellPart } from "@/lib/lab/sims";

const C = "#84CC16";
type Cell = "plant" | "animal";
const HILITE = "#FACC15";

// Each organelle is a clickable SVG shape. Plant cells are boxy (wall +
// vacuole); animal cells are rounded.
function CellDrawing({ cell, selected, onPick }: { cell: Cell; selected: string | null; onPick: (id: string) => void }) {
  const on = (id: string) => selected === id;
  const stroke = (id: string, base: string) => (on(id) ? HILITE : base);
  const part = (id: string, label: string, children: React.ReactNode) => (
    <g role="button" tabIndex={0} aria-label={label} aria-pressed={on(id)} onClick={() => onPick(id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(id); } }}
      className="cursor-pointer outline-none [&:focus-visible>*]:stroke-[#FACC15]">{children}</g>
  );
  const mito = (x: number, y: number, r: number) => (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <ellipse rx="18" ry="8" fill="#FB923C" stroke={stroke("mitochondria", "#9A3412")} strokeWidth={on("mitochondria") ? 3 : 1.5} />
      <path d="M-12 0 q3 -6 6 0 t6 0 t6 0 t6 0" fill="none" stroke="#FED7AA" strokeWidth="1.5" />
    </g>
  );
  const ribo = [[95, 120], [250, 110], [120, 240], [270, 230], [200, 270], [80, 190], [300, 170]];

  return cell === "plant" ? (
    <svg viewBox="0 0 380 320" className="h-auto w-full rounded-2xl bg-black/30" role="group" aria-label="Plant cell">
      {part("wall", "Cell wall", <rect x="20" y="20" width="340" height="280" rx="14" fill="#365314" stroke={stroke("wall", "#84CC16")} strokeWidth={on("wall") ? 6 : 4} />)}
      {part("membrane", "Cell membrane", <rect x="32" y="32" width="316" height="256" rx="10" fill="none" stroke={stroke("membrane", "#D9F99D")} strokeWidth={on("membrane") ? 4 : 2} />)}
      {part("cytoplasm", "Cytoplasm", <rect x="34" y="34" width="312" height="252" rx="9" fill={on("cytoplasm") ? "rgba(250,204,21,.18)" : "rgba(190,242,100,.12)"} />)}
      {part("vacuole", "Permanent vacuole", <rect x="120" y="80" width="150" height="150" rx="40" fill="rgba(125,211,252,.35)" stroke={stroke("vacuole", "#7DD3FC")} strokeWidth={on("vacuole") ? 4 : 2} />)}
      {part("nucleus", "Nucleus", <g><circle cx="300" cy="80" r="30" fill="#7C3AED" stroke={stroke("nucleus", "#C4B5FD")} strokeWidth={on("nucleus") ? 4 : 2} /><circle cx="306" cy="76" r="9" fill="#A78BFA" /></g>)}
      {part("chloroplasts", "Chloroplasts", <g>{[[70, 70], [70, 250], [300, 260], [320, 170], [60, 160], [200, 260]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="19" ry="11" fill="#16A34A" stroke={stroke("chloroplasts", "#86EFAC")} strokeWidth={on("chloroplasts") ? 3 : 1.5} />))}</g>)}
      {part("mitochondria", "Mitochondria", <g>{mito(110, 260, 20)}{mito(290, 130, -30)}</g>)}
      {part("ribosomes", "Ribosomes", <g>{ribo.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={on("ribosomes") ? 4.5 : 3} fill={on("ribosomes") ? HILITE : "#F1F5F9"} />)}</g>)}
    </svg>
  ) : (
    <svg viewBox="0 0 380 320" className="h-auto w-full rounded-2xl bg-black/30" role="group" aria-label="Animal cell">
      {part("cytoplasm", "Cytoplasm", <path d="M60 160 C40 70 150 20 220 40 C320 60 360 140 330 210 C300 290 160 310 100 270 C60 245 70 210 60 160 Z"
        fill={on("cytoplasm") ? "rgba(250,204,21,.18)" : "rgba(251,207,232,.14)"} />)}
      {part("membrane", "Cell membrane", <path d="M60 160 C40 70 150 20 220 40 C320 60 360 140 330 210 C300 290 160 310 100 270 C60 245 70 210 60 160 Z"
        fill="none" stroke={stroke("membrane", "#F9A8D4")} strokeWidth={on("membrane") ? 5 : 3} />)}
      {part("nucleus", "Nucleus", <g><circle cx="195" cy="160" r="40" fill="#7C3AED" stroke={stroke("nucleus", "#C4B5FD")} strokeWidth={on("nucleus") ? 4 : 2} /><circle cx="203" cy="152" r="12" fill="#A78BFA" /></g>)}
      {part("mitochondria", "Mitochondria", <g>{mito(110, 130, 30)}{mito(280, 110, -20)}{mito(250, 240, 10)}{mito(130, 230, -40)}</g>)}
      {part("ribosomes", "Ribosomes", <g>{ribo.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={on("ribosomes") ? 4.5 : 3} fill={on("ribosomes") ? HILITE : "#F1F5F9"} />)}</g>)}
    </svg>
  );
}

export default function Cells() {
  const [cell, setCell] = useState<Cell>("plant");
  const [selected, setSelected] = useState<string | null>("nucleus");
  const [quiz, setQuiz] = useState<{ target: CellPart; score: number; asked: number; feedback: string } | null>(null);
  const parts = partsOf(cell);
  const info = CELL_PARTS.find((p) => p.id === selected);

  function newTarget(score = 0, asked = 0, feedback = "") {
    const pool = partsOf(cell);
    setQuiz({ target: pool[Math.floor(Math.random() * pool.length)], score, asked, feedback });
  }
  function pick(id: string) {
    setSelected(id);
    if (!quiz) return;
    const ok = id === quiz.target.id;
    const label = CELL_PARTS.find((p) => p.id === id)!.label;
    newTarget(quiz.score + (ok ? 1 : 0), quiz.asked + 1, ok ? `✅ Yes — that's the ${label.toLowerCase()}.` : `❌ That's the ${label.toLowerCase()}. Try the next one!`);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-5">
        <Panel title={`${cell === "plant" ? "Plant" : "Animal"} cell — tap a part`}>
          <CellDrawing cell={cell} selected={selected} onPick={pick} />
          <div className="mt-4 space-y-3">
            <Segmented label="Cell" value={cell} onChange={(v) => { setCell(v as Cell); setSelected(null); setQuiz(null); }} color={C}
              options={[{ value: "plant", label: "🌿 Plant cell" }, { value: "animal", label: "🐾 Animal cell" }]} />
            <div className="flex flex-wrap gap-2">
              {quiz
                ? <LabButton variant="ghost" onClick={() => setQuiz(null)}>Stop quiz</LabButton>
                : <LabButton color={C} onClick={() => newTarget()}>🎯 Quiz me</LabButton>}
            </div>
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        {quiz ? (
          <Panel title="Quiz">
            <p className="text-sm text-white/60">Tap the:</p>
            <p className="elab-pop font-display text-2xl font-bold" style={{ color: HILITE }} key={`${quiz.asked}-${quiz.target.id}`}>{quiz.target.label}</p>
            {quiz.feedback && <p className="mt-2 text-sm font-semibold text-white/80">{quiz.feedback}</p>}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Readout label="Score" value={`${quiz.score} / ${quiz.asked}`} color={C} />
              <Readout label="Accuracy" value={quiz.asked ? `${Math.round((quiz.score / quiz.asked) * 100)}%` : "—"} color={HILITE} />
            </div>
          </Panel>
        ) : (
          <Panel title="Organelle">
            {info ? (
              <div className="elab-pop" key={info.id}>
                <p className="font-display text-2xl font-bold" style={{ color: HILITE }}>{info.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/80">{info.job}</p>
                <p className="mt-3 text-xs font-bold text-white/50">Found in: {[info.plant && "plant cells", info.animal && "animal cells"].filter(Boolean).join(" and ")}</p>
              </div>
            ) : <p className="text-sm text-white/50">Tap any part of the cell to learn what it does.</p>}
          </Panel>
        )}
        <Panel title={`Parts of a ${cell} cell`}>
          <ul className="grid grid-cols-2 gap-2">
            {parts.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => pick(p.id)} disabled={!!quiz}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${selected === p.id && !quiz ? "border-transparent text-[#070B1A]" : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"} disabled:opacity-40`}
                  style={selected === p.id && !quiz ? { background: HILITE } : undefined}>
                  {p.label}{!p.animal && <span className="ml-1 text-[10px] opacity-70">(plant only)</span>}
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <Insight color={C}>
          All plant and animal cells share a nucleus, cytoplasm, cell membrane, mitochondria and ribosomes. Plant cells
          also have a <b>cell wall</b>, a <b>permanent vacuole</b> and <b>chloroplasts</b> — which is why plants can
          stand upright and make their own food.
        </Insight>
        <Challenge>Switch between the cells and list the three parts only plant cells have. Why don&apos;t root cells need chloroplasts?</Challenge>
      </div>
    </div>
  );
}
