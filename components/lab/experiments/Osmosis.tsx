"use client";
import { useState } from "react";
import { Panel, Readout, LabButton, Insight, Challenge, Chart } from "@/components/lab/LabUI";
import { osmosisMassChange, ISOTONIC } from "@/lib/lab/sims";

const C = "#84CC16";
const CONCS = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
type Tube = { conc: number; before: number; after: number };

// Where your own straight-line-ish data crosses 0% — the isotonic estimate.
function crossing(rows: Tube[]): number | null {
  const pts = rows.map((r) => [r.conc, ((r.after - r.before) / r.before) * 100]).sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    if (y0 >= 0 && y1 <= 0 && y0 !== y1) return x0 + (y0 / (y0 - y1)) * (x1 - x0);
  }
  return null;
}

export default function Osmosis() {
  const [tubes, setTubes] = useState<Tube[]>([]);
  const [soaking, setSoaking] = useState<number | null>(null);

  function soak(conc: number) {
    setSoaking(conc);
    setTimeout(() => {
      const before = +(2 + Math.random()).toFixed(2);
      // A little measurement noise, like real potato cylinders.
      const change = osmosisMassChange(conc) + (Math.random() - 0.5) * 2;
      const after = +(before * (1 + change / 100)).toFixed(2);
      setTubes((t) => [...t.filter((x) => x.conc !== conc), { conc, before, after }].sort((a, b) => a.conc - b.conc));
      setSoaking(null);
    }, 900);
  }

  const pct = (t: Tube) => ((t.after - t.before) / t.before) * 100;
  const est = crossing(tubes);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <div className="space-y-5">
        <Panel title="Potato cylinders in sucrose solutions">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {CONCS.map((c) => {
              const t = tubes.find((x) => x.conc === c);
              const change = t ? pct(t) : 0;
              const h = 60 * (1 + change / 60);
              return (
                <div key={c} className="flex flex-col items-center">
                  <svg viewBox="0 0 60 130" className="h-auto w-full max-w-[72px]" role="img"
                    aria-label={`${c} molar: ${t ? `${change.toFixed(1)}% change in mass` : "not tested yet"}`}>
                    <rect x="8" y="8" width="44" height="114" rx="18" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.45)" strokeWidth="2" />
                    <rect x="10" y="30" width="40" height="90" rx="16" fill={`rgba(125,211,252,${0.12 + c * 0.35})`} />
                    <rect x="23" y={112 - h} width="14" height={h} rx="4" fill={t ? (change >= 0 ? "#FEF08A" : "#D6D3D1") : "#FDE68A"}
                      className={soaking === c ? "elab-float" : t ? "elab-pop" : ""} key={t?.after ?? "fresh"} />
                  </svg>
                  <p className="mt-1 font-mono text-xs font-bold text-white/70">{c.toFixed(1)} M</p>
                  <LabButton variant="ghost" className="mt-1 !min-h-[36px] w-full !px-2 !text-xs" onClick={() => soak(c)} disabled={soaking !== null}>
                    {soaking === c ? "…" : t ? "Redo" : "Soak"}
                  </LabButton>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <LabButton color={C} disabled={soaking !== null} onClick={() => CONCS.forEach((c, i) => setTimeout(() => soak(c), i * 950))}>Soak all six</LabButton>
            <LabButton variant="ghost" onClick={() => setTubes([])} disabled={!tubes.length}>Clear results</LabButton>
          </div>
        </Panel>
        <Panel title="Results">
          {tubes.length === 0 ? <p className="text-sm text-white/50">Soak cylinders in each solution for 30 minutes, then weigh them again.</p> : (
            <table className="w-full text-left text-xs text-white/75">
              <thead><tr className="text-white/40"><th className="py-1">Sucrose (mol/dm³)</th><th>Mass before (g)</th><th>Mass after (g)</th><th>% change</th></tr></thead>
              <tbody>{tubes.map((t) => (
                <tr key={t.conc} className="border-t border-white/5 font-mono">
                  <td className="py-1">{t.conc.toFixed(1)}</td><td>{t.before.toFixed(2)}</td><td>{t.after.toFixed(2)}</td>
                  <td className={pct(t) >= 0 ? "text-emerald-300" : "text-red-300"}>{pct(t) >= 0 ? "+" : ""}{pct(t).toFixed(1)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Panel>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Readout label="Cylinders tested" value={`${tubes.length} / 6`} color={C} />
          <Readout label="Your isotonic estimate" value={est === null ? "—" : est.toFixed(2)} unit={est === null ? undefined : "mol/dm³"} color="#FACC15" />
        </div>
        <Panel title="% change in mass against concentration">
          <Chart title="Percentage change in mass against sucrose concentration" xLabel="Sucrose (mol/dm³)" yLabel="% change" xMax={1} yMin={-30} yMax={20} yTicks={5}
            series={[
              { points: [[0, 0], [1, 0]], color: "rgba(255,255,255,.35)", dashed: true },
              { points: tubes.map((t) => [t.conc, pct(t)] as [number, number]), color: C },
              { points: tubes.map((t) => [t.conc, pct(t)] as [number, number]), color: C, kind: "dots" },
            ]} markerX={est ?? undefined} />
        </Panel>
        <Insight color={C}>
          Water moves by <b>osmosis</b> from a dilute solution to a more concentrated one through the partially
          permeable cell membrane. In weak solutions the potato gains water and mass; in strong ones it loses water.
          Where the line crosses 0% the solution matches the potato cells — the <b>isotonic point</b> (about
          {" "}{ISOTONIC} mol/dm³ for potato).
        </Insight>
        <Challenge>Why do we calculate % change rather than just the change in mass? Why does the graph level off at the strongest solutions?</Challenge>
      </div>
    </div>
  );
}
