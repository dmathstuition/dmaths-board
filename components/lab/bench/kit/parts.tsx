// Small drawing helpers shared by the apparatus kits.
import type { ReactNode } from "react";

// A digital display, big, for a close-up.
export function digits(cx: number, cy: number, text: string, unit: string, colour = "#F87171"): ReactNode {
  return (
    <g>
      {/* Dark digits are a stopwatch's LCD: on its pale screen, so they can be read. */}
      <rect x={cx - 100} y={cy - 40} width={200} height={80} rx={10} fill={/^#[0-3]/.test(colour) ? "#C9D6B8" : "#0B1220"} stroke="#475569" strokeWidth={3} />
      <text x={cx + 30} y={cy + 15} textAnchor="end" fontSize={text.length > 4 ? 38 : 44} fontWeight={700} fontFamily="ui-monospace, monospace" fill={colour}>{text}</text>
      <text x={cx + 40} y={cy + 14} fontSize={22} fontWeight={800} fill={colour}>{unit}</text>
    </g>
  );
}

// A retort stand: base plate under (bx, 0), rod at x up to y = top.
export function Stand({ x, top, base = [-80, 80] }: { x: number; top: number; base?: [number, number] }) {
  return (
    <g>
      <rect x={base[0]} y={-12} width={base[1] - base[0]} height={12} rx={3} fill="#334155" />
      <rect x={base[0]} y={-12} width={base[1] - base[0]} height={3} fill="#475569" />
      <rect x={x - 4.5} y={top} width={9} height={-top - 10} rx={3} fill="url(#bl-metal)" />
    </g>
  );
}
// A clamp: boss on the rod at (x, y), arm to x2.
export function Clamp({ x, y, x2 }: { x: number; y: number; x2: number }) {
  return (
    <g>
      <rect x={x - 11} y={y - 9} width={22} height={18} rx={3} fill="#475569" />
      <rect x={Math.min(x, x2)} y={y - 4} width={Math.abs(x2 - x)} height={8} rx={3} fill="url(#bl-metal)" />
      <rect x={x2 - 12} y={y - 13} width={24} height={26} rx={4} fill="#64748B" />
    </g>
  );
}
// A lead (wire) drooping between two points.
export function Lead({ x1, y1, x2, y2, c = "#DC2626", sag = 30 }: { x1: number; y1: number; x2: number; y2: number; c?: string; sag?: number }) {
  const d = `M${x1},${y1} C${x1},${y1 + sag} ${x2},${y2 + sag} ${x2},${y2}`;
  return <g><path d={d} fill="none" stroke={c} strokeWidth={4.5} strokeLinecap="round" /><path d={d} fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth={1.2} /></g>;
}
// A thermometer: bulb at (x, bulbY); `per` px per °C from `lo`.
export function Thermo({ x, bulbY, top, T, lo = -10, per = 2 }: { x: number; bulbY: number; top: number; T: number; lo?: number; per?: number }) {
  const zero = bulbY - 14, yOf = (t: number) => zero - (t - lo) * per, marks: number[] = [];
  for (let t = lo; yOf(t) > top + 8; t += 10) marks.push(t);
  return (
    <g>
      <rect x={x - 5} y={top} width={10} height={bulbY - top} rx={5} fill="#fff" fillOpacity=".55" stroke="#fff" strokeOpacity=".9" />
      <rect x={x - 1.6} y={yOf(T)} width={3.2} height={bulbY - yOf(T)} fill="#DC2626" />
      <circle cx={x} cy={bulbY} r={7} fill="#DC2626" stroke="#fff" strokeOpacity=".8" />
      {marks.map((t) => <g key={t}><line x1={x + 5} y1={yOf(t)} x2={x + 10} y2={yOf(t)} stroke="#fff" strokeOpacity=".8" />{t % 20 === 0 && <text x={x + 12} y={yOf(t) + 3} fontSize={8} fontWeight={700} fill="#fff">{t}</text>}</g>)}
    </g>
  );
}
export const thermoY = (bulbY: number, T: number, lo = -10, per = 2) => bulbY - 14 - (T - lo) * per;

// A glass tube's scale seen up close: marks every `minor`, numbers every `label`.
// down: the numbers go up as you go down the tube (a burette). liquid: fill below
// the level with a meniscus; otherwise a pointer marks the value.
export function ScaleZoom({ cx, cy, r, value, perUnit, minor, label, lo, hi, liquid, down, unit, pointer }: {
  cx: number; cy: number; r: number; value: number; perUnit: number; minor: number; label: number; lo: number; hi: number;
  liquid?: string; down?: boolean; unit?: string; pointer?: string;
}) {
  const y = (v: number) => cy + (down ? 1 : -1) * (v - value) * perUnit;
  const span = r / perUnit + label, marks: number[] = [];
  for (let t = Math.ceil((value - span) / minor); t <= Math.floor((value + span) / minor); t++) { const v = Number((t * minor).toFixed(6)); if (v >= lo - 1e-9 && v <= hi + 1e-9) marks.push(v); }
  const x0 = cx - 34, x1 = cx + 34, ly = y(value), k = (v: number, m: number) => Math.abs(v / m - Math.round(v / m)) < 1e-6;
  return (
    <g>
      {liquid && <>
        <path d={`M${x0},${ly - 12} Q${cx},${ly + 12} ${x1},${ly - 12} V${cy + r} H${x0} Z`} fill={liquid} fillOpacity=".85" />
        <path d={`M${x0},${ly - 12} Q${cx},${ly + 12} ${x1},${ly - 12}`} fill="none" stroke="#1E3A8A" strokeWidth={2.5} />
      </>}
      <rect x={x0} y={cy - r} width={x1 - x0} height={2 * r} fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".9" strokeWidth={2} />
      {marks.map((v) => {
        const big = k(v, label), mid = !big && k(v, label / 2);
        return <g key={v}>
          <line x1={x0} y1={y(v)} x2={x0 + (big ? 30 : mid ? 20 : 11)} y2={y(v)} stroke="#fff" strokeWidth={big ? 2 : 1.2} />
          {big && <text x={x0 - 8} y={y(v) + 6} textAnchor="end" fontSize={17} fontWeight={800} fill="#fff">{Number(v.toFixed(3))}</text>}
        </g>;
      })}
      {pointer && <path d={`M${x1 + 30},${ly} L${x0 + 6},${ly}`} stroke={pointer} strokeWidth={3} />}
      {unit && <text x={x1 + 8} y={cy + r - 18} fontSize={14} fontWeight={800} fill="#fff" fillOpacity=".7">{unit}</text>}
    </g>
  );
}
