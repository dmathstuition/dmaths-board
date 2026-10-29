"use client";
import { useState } from "react";
import { Panel, Slider, Readout, LabButton, Insight, Challenge } from "@/components/lab/LabUI";
import { hypotenuse, isPythagoreanTriple } from "@/lib/lab/sims";

const A = "#38BDF8", B = "#F472B6", CC = "#FACC15";
const TRIPLES: [number, number][] = [[3, 4], [5, 12], [6, 8], [8, 15]];

export default function Pythagoras() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const [showGrid, setShowGrid] = useState(true);
  const c = hypotenuse(a, b);
  const triple = isPythagoreanTriple(a, b);

  // Fit the triangle + its three squares inside the drawing.
  const scale = 150 / Math.max(a + b, c + Math.max(a, b) * 0.6);
  const ox = 70 + b * scale, oy = 70 + Math.max(a, b) * scale * 0.4 + a * scale; // right angle at (ox, oy)
  const P = { x: ox, y: oy };                         // right angle
  const Q = { x: ox - b * scale, y: oy };             // end of b (horizontal)
  const R = { x: ox, y: oy - a * scale };             // end of a (vertical)
  // Square on a (to the right of the vertical side)
  const sqA = [P, R, { x: R.x + a * scale, y: R.y }, { x: P.x + a * scale, y: P.y }];
  // Square on b (below the horizontal side)
  const sqB = [Q, P, { x: P.x, y: P.y + b * scale }, { x: Q.x, y: Q.y + b * scale }];
  // Square on c (outwards from the hypotenuse Q→R)
  const dx = R.x - Q.x, dy = R.y - Q.y;
  const sqC = [Q, R, { x: R.x + dy, y: R.y - dx }, { x: Q.x + dy, y: Q.y - dx }];
  const pts = (ps: { x: number; y: number }[]) => ps.map((p) => `${p.x},${p.y}`).join(" ");

  const all = [...sqA, ...sqB, ...sqC];
  const minX = Math.min(...all.map((p) => p.x)) - 20, maxX = Math.max(...all.map((p) => p.x)) + 20;
  const minY = Math.min(...all.map((p) => p.y)) - 20, maxY = Math.max(...all.map((p) => p.y)) + 20;

  const unitGrid = (sq: { x: number; y: number }[], n: number, color: string) => {
    if (!showGrid || n > 15) return null;
    const [p0, p1, , p3] = sq;
    const lines = [];
    for (let i = 1; i < n; i++) {
      const t = i / n;
      lines.push(<line key={`u${i}`} x1={p0.x + (p1.x - p0.x) * t} y1={p0.y + (p1.y - p0.y) * t} x2={p3.x + (sq[2].x - p3.x) * t} y2={p3.y + (sq[2].y - p3.y) * t} stroke={color} strokeOpacity=".35" />);
      lines.push(<line key={`v${i}`} x1={p0.x + (p3.x - p0.x) * t} y1={p0.y + (p3.y - p0.y) * t} x2={p1.x + (sq[2].x - p1.x) * t} y2={p1.y + (sq[2].y - p1.y) * t} stroke={color} strokeOpacity=".35" />);
    }
    return lines;
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <Panel title="Right-angled triangle">
        <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="mx-auto h-[360px] w-full" role="img"
          aria-label={`Right triangle with sides ${a}, ${b} and hypotenuse ${c.toFixed(2)}, with a square on each side`}>
          <polygon points={pts(sqA)} fill={`${A}26`} stroke={A} strokeWidth="2" />
          {unitGrid(sqA, a, A)}
          <polygon points={pts(sqB)} fill={`${B}26`} stroke={B} strokeWidth="2" />
          {unitGrid(sqB, b, B)}
          <polygon points={pts(sqC)} fill={`${CC}22`} stroke={CC} strokeWidth="2" />
          <polygon points={pts([P, Q, R])} fill="rgba(255,255,255,.08)" stroke="#fff" strokeWidth="2.5" />
          <polyline points={`${P.x - 12},${P.y} ${P.x - 12},${P.y - 12} ${P.x},${P.y - 12}`} fill="none" stroke="#fff" strokeWidth="1.5" />
          <text x={(sqA[0].x + sqA[2].x) / 2} y={(sqA[0].y + sqA[2].y) / 2} textAnchor="middle" fontSize="16" fontWeight="800" fill={A}>a² = {a * a}</text>
          <text x={(sqB[0].x + sqB[2].x) / 2} y={(sqB[0].y + sqB[2].y) / 2 + 5} textAnchor="middle" fontSize="16" fontWeight="800" fill={B}>b² = {b * b}</text>
          <text x={(sqC[0].x + sqC[2].x) / 2} y={(sqC[0].y + sqC[2].y) / 2} textAnchor="middle" fontSize="16" fontWeight="800" fill={CC}>c² = {a * a + b * b}</text>
        </svg>
      </Panel>

      <div className="space-y-5">
        <Panel title="Controls">
          <div className="space-y-5">
            <Slider label="Side a" value={a} min={1} max={15} onChange={setA} color={A} />
            <Slider label="Side b" value={b} min={1} max={15} onChange={setB} color={B} />
            <div className="flex flex-wrap gap-2">
              {TRIPLES.map(([x, y]) => (
                <LabButton key={`${x}-${y}`} variant="ghost" onClick={() => { setA(x); setB(y); }}>{x}, {y}</LabButton>
              ))}
              <LabButton variant="ghost" onClick={() => setShowGrid((g) => !g)}>{showGrid ? "Hide" : "Show"} unit squares</LabButton>
            </div>
          </div>
        </Panel>

        <div className="grid grid-cols-3 gap-3">
          <Readout label="a²" value={a * a} color={A} />
          <Readout label="b²" value={b * b} color={B} />
          <Readout label="a² + b²" value={a * a + b * b} color={CC} />
        </div>
        <Readout label="Hypotenuse c = √(a² + b²)" value={c.toFixed(c % 1 ? 3 : 0)} color={CC} big />
        {triple && (
          <div className="elab-pop rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-3 text-center text-sm font-bold text-emerald-300">
            ✨ {a}, {b}, {c} is a Pythagorean triple — all whole numbers!
          </div>
        )}

        <Insight color={CC}>
          The area of the <b style={{ color: CC }}>yellow square</b> on the longest side always equals the two smaller
          squares added together: <b>a² + b² = c²</b>. Count the unit squares on a and b — together they would exactly fill c².
        </Insight>
        <Challenge>Find another Pythagorean triple yourself (hint: try doubling 3, 4, 5). Then check: is a 7, 24 triangle a triple?</Challenge>
      </div>
    </div>
  );
}
