"use client";
import { useState } from "react";
import { Panel, Readout, LabButton, Insight, Challenge } from "@/components/lab/LabUI";
import { OBJECTS, LIQUIDS, submergedFraction, floats } from "@/lib/lab/sims";

const C = "#F59E0B";

export default function Density() {
  const [obj, setObj] = useState(OBJECTS[3]);     // ice
  const [liq, setLiq] = useState(LIQUIDS[1]);     // water
  const [guess, setGuess] = useState<"float" | "sink" | null>(null);
  const [dropped, setDropped] = useState(false);
  const [score, setScore] = useState({ right: 0, tries: 0 });

  const frac = submergedFraction(obj.rho, liq.rho);
  const willFloat = floats(obj.rho, liq.rho);

  // Tank geometry (SVG units).
  const surface = 110, floor = 290, size = 64;
  const objTop = !dropped ? 20 : willFloat ? surface - size * (1 - frac) : floor - size;

  function drop() {
    setDropped(true);
    if (guess) {
      const right = (guess === "float") === willFloat;
      setScore((s) => ({ right: s.right + (right ? 1 : 0), tries: s.tries + 1 }));
    }
  }
  function choose(next: { o?: typeof obj; l?: typeof liq }) {
    if (next.o) setObj(next.o);
    if (next.l) setLiq(next.l);
    setDropped(false); setGuess(null);
  }

  const verdict = dropped && guess ? ((guess === "float") === willFloat ? "correct" : "wrong") : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <div className="space-y-5">
        <Panel title="Tank">
          <svg viewBox="0 0 400 310" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={`${obj.label} ${dropped ? (willFloat ? "floating" : "sunk") : "held above"} in ${liq.label}`}>
            {/* liquid */}
            <rect x="70" y={surface} width="260" height={floor - surface} fill={liq.color} />
            <path d={`M70 ${surface} q 32 -6 65 0 t 65 0 t 65 0 t 65 0`} fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" />
            {/* glass */}
            <path d={`M68 60 V${floor + 2} H332 V60`} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="4" strokeLinejoin="round" />
            {/* object */}
            <g style={{ transform: `translateY(${objTop}px)`, transition: dropped ? "transform 1.4s cubic-bezier(.3,1.3,.5,1)" : "transform .3s" }}>
              <rect x={200 - size / 2} y="0" width={size} height={size} rx="14" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.4)" />
              <text x="200" y={size / 2 + 13} textAnchor="middle" fontSize="38">{obj.emoji}</text>
            </g>
            <text x="200" y="304" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,.55)">{liq.label} · ρ = {liq.rho} g/cm³</text>
          </svg>

          {!dropped ? (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-white/75">Your prediction: will the {obj.label.toLowerCase()} float or sink?</p>
              <div className="flex flex-wrap gap-2">
                <LabButton variant={guess === "float" ? "solid" : "ghost"} color="#38BDF8" onClick={() => setGuess("float")}>🛟 Float</LabButton>
                <LabButton variant={guess === "sink" ? "solid" : "ghost"} color="#F472B6" onClick={() => setGuess("sink")}>⚓ Sink</LabButton>
                <LabButton color={C} onClick={drop}>Drop it in ↓</LabButton>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className={`elab-pop text-sm font-bold ${verdict === "wrong" ? "text-rose-300" : "text-emerald-300"}`}>
                {verdict === "correct" && "✓ Correct! "}{verdict === "wrong" && "✗ Not quite. "}
                It {willFloat ? `floats with ${Math.round(frac * 100)}% below the surface.` : "sinks to the bottom."}
              </p>
              <LabButton variant="ghost" onClick={() => { setDropped(false); setGuess(null); }}>Try again</LabButton>
            </div>
          )}
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel title="Object">
          <div className="grid grid-cols-3 gap-2">
            {OBJECTS.map((o) => (
              <button key={o.label} type="button" onClick={() => choose({ o })} aria-pressed={o.label === obj.label}
                className={`rounded-xl border px-2 py-2 text-center text-xs font-bold transition ${o.label === obj.label ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"}`}>
                <span className="block text-2xl">{o.emoji}</span>{o.label}
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Liquid">
          <div className="flex flex-wrap gap-2">
            {LIQUIDS.map((l) => (
              <button key={l.label} type="button" onClick={() => choose({ l })} aria-pressed={l.label === liq.label}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${l.label === liq.label ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"}`}>
                <span className="h-3 w-3 rounded-full" style={{ background: l.color }} />{l.label}
              </button>
            ))}
          </div>
        </Panel>
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Object ρ" value={obj.rho} unit="g/cm³" color={C} />
          <Readout label="Liquid ρ" value={liq.rho} unit="g/cm³" color="#38BDF8" />
          <Readout label="Predictions" value={`${score.right}/${score.tries}`} color="#34D399" />
        </div>
        <Insight color={C}>
          An object <b>floats</b> if it is <b>less dense</b> than the liquid. A floating object sinks until it pushes aside
          its own weight of liquid — so the fraction under the surface equals ρ<sub>object</sub> ÷ ρ<sub>liquid</sub>.
          That&apos;s why about 92% of an iceberg hides under water.
        </Insight>
        <Challenge>An egg sinks in water. Can you find a liquid that makes it float? Then try iron in mercury — surprised?</Challenge>
      </div>
    </div>
  );
}
