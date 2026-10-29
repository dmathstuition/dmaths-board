"use client";
import { useState } from "react";
import { Panel, Readout, Slider, Insight, Challenge, LabButton } from "@/components/lab/LabUI";
import { interiorSum, interiorAngle, exteriorAngle, POLYGON_NAMES } from "@/lib/lab/sims";

const C = "#34D399";

export default function Polygons() {
  const [n, setN] = useState(5);
  const [showTri, setShowTri] = useState(true);
  const [rows, setRows] = useState<number[]>([]);
  const cx = 150, cy = 150, r = 115;
  const pts = Array.from({ length: n }, (_, i) => {
    const t = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)] as [number, number];
  });
  const name = POLYGON_NAMES[n] ?? `${n}-gon`;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <Panel title="Regular polygon">
        <svg viewBox="0 0 300 300" className="h-auto w-full rounded-2xl bg-black/30" role="img"
          aria-label={`Regular ${name.toLowerCase()} with ${n} sides, split into ${n - 2} triangles`}>
          {showTri && pts.slice(1, -1).map((p, i) => (
            <polygon key={i} points={`${pts[0].join(",")} ${p.join(",")} ${pts[i + 2].join(",")}`}
              fill={`hsla(${150 + i * 28}, 70%, 55%, .22)`} stroke="rgba(255,255,255,.25)" />
          ))}
          <polygon points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={C} strokeWidth="3" />
          {/* an exterior angle at the first vertex: extend side 0→1 past vertex 1 */}
          {(() => {
            const [x1, y1] = pts[0], [x2, y2] = pts[1];
            return <line x1={x2} y1={y2} x2={x2 + (x2 - x1) * 0.45} y2={y2 + (y2 - y1) * 0.45} stroke="#FACC15" strokeWidth="2" strokeDasharray="4 3" />;
          })()}
          {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#E2E8F0" />)}
          <text x="150" y="292" fontSize="12" textAnchor="middle" fill="rgba(255,255,255,.6)">{name} · {n - 2} triangles × 180°</text>
        </svg>
        <div className="mt-4 flex flex-wrap gap-2">
          <LabButton variant="ghost" onClick={() => setShowTri((v) => !v)}>{showTri ? "Hide" : "Show"} triangles</LabButton>
          <LabButton color={C} onClick={() => setRows((rs) => (rs.includes(n) ? rs : [...rs, n].sort((x, y) => x - y)))}>＋ Record</LabButton>
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel title="Number of sides">
          <Slider label="Sides (n)" value={n} min={3} max={12} onChange={setN} color={C} />
        </Panel>
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Interior sum" value={interiorSum(n)} unit="°" color={C} />
          <Readout label="Each interior" value={+interiorAngle(n).toFixed(1)} unit="°" color="#38BDF8" />
          <Readout label="Each exterior" value={+exteriorAngle(n).toFixed(1)} unit="°" color="#FACC15" />
        </div>
        {rows.length > 0 && (
          <Panel title="Results">
            <table className="w-full text-left text-xs text-white/70">
              <thead><tr className="text-white/40"><th className="py-1">n</th><th>Triangles</th><th>Interior sum</th><th>Interior</th><th>Exterior</th></tr></thead>
              <tbody>{rows.map((k) => (
                <tr key={k} className="border-t border-white/5 font-mono"><td className="py-1">{k}</td><td>{k - 2}</td><td>{interiorSum(k)}°</td><td>{interiorAngle(k).toFixed(1)}°</td><td>{exteriorAngle(k).toFixed(1)}°</td></tr>
              ))}</tbody>
            </table>
          </Panel>
        )}
        <Insight color={C}>
          From one corner you can split any polygon into <b>n − 2 triangles</b>, so the interior angles add to
          <b> (n − 2) × 180°</b>. The exterior angles of any polygon always add to <b>360°</b>, so a regular polygon has
          exterior angles of 360° ÷ n — and interior + exterior = 180° at every corner.
        </Insight>
        <Challenge>A regular polygon has exterior angles of 40°. How many sides does it have? Check your answer with the slider.</Challenge>
      </div>
    </div>
  );
}
