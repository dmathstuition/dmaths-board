"use client";
// Animated laboratory drawings for the lab rooms: glassware whose liquid pours,
// changes colour, fizzes, boils and grows a precipitate; flames that flicker;
// bulbs that glow; needles that swing; thermometers that rise; and a moving
// scene for each room. The motion is CSS (app/globals.css, lr-*), switched off
// for people who ask for reduced motion.
import type { ReactNode } from "react";
import type { LabSubject } from "@/lib/lab/catalog";

export type VesselShape = "tube" | "beaker" | "flask" | "cylinder" | "dish";
export const shapeOf = (name: string): VesselShape => /test tube|boiling tube|culture tube|centrifuge/i.test(name) ? "tube" : /flask|bottle/i.test(name) ? "flask" : /cylinder|jar|burette|pipette/i.test(name) ? "cylinder" : /dish|watch glass|crucible|petri/i.test(name) ? "dish" : "beaker";

// Glassware with what's in it.
export function Vessel({ shape = "beaker", level = 0, colour = "#E0F2FE", ppt, fizz, boiling, milky, drop, size = 90 }: {
  shape?: VesselShape; level?: number; colour?: string; ppt?: string | null; fizz?: boolean; boiling?: boolean; milky?: boolean; drop?: { colour: string; key: string | number } | null; size?: number;
}) {
  const L = Math.max(0, Math.min(1, level));
  // Each shape: its outline, and the box the liquid fills.
  const g = shape === "tube" ? { out: "M38,8 V96 a12,12 0 0 0 24,0 V8", box: [38, 20, 24, 88] as const, w: 24 }
    : shape === "flask" ? { out: "M42,8 V40 L18,100 q-2,8 8,8 H74 q10,0 8,-8 L58,40 V8", box: [18, 40, 64, 68] as const, w: 64 }
    : shape === "cylinder" ? { out: "M36,6 V108 H64 V6", box: [36, 10, 28, 98] as const, w: 28 }
    : shape === "dish" ? { out: "M14,80 q0,26 36,26 q36,0 36,-26", box: [14, 80, 72, 26] as const, w: 72 }
    : { out: "M22,14 V100 q0,8 8,8 H70 q8,0 8,-8 V14", box: [22, 14, 56, 94] as const, w: 56 };
  const [bx, by, bw, bh] = g.box, top = by + bh * (1 - L), id = `lv-${shape}-${Math.round(L * 100)}-${colour.replace("#", "")}`;
  return (
    <svg viewBox="0 0 100 120" style={{ width: size, height: size * 1.2 }} aria-hidden className="overflow-visible">
      <defs><clipPath id={id}><path d={`${g.out} Z`} /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <rect className="lr-fill" x={bx - 20} y={top} width={bw + 40} height={bh * L + 20} fill={milky ? "#F1F5F9" : colour} fillOpacity={0.85} />
        {L > 0 && <rect className="lr-fill" x={bx - 20} y={top} width={bw + 40} height={3} fill="#fff" fillOpacity={0.35} />}
        {ppt && L > 0 && <rect className="lr-settle" x={bx - 20} y={by + bh - Math.min(bh * L, bh * 0.32)} width={bw + 40} height={bh * 0.32} fill={ppt} fillOpacity={0.92} />}
        {ppt && L > 0 && <rect className="lr-settle" x={bx - 20} y={top} width={bw + 40} height={bh * L} fill={ppt} fillOpacity={0.25} />}
        {ppt && L > 0 && Array.from({ length: 14 }, (_, k) => <circle key={k} className="lr-settle" style={{ animationDelay: `${(k % 5) * 0.12}s` }} cx={bx + 4 + ((k * 37) % Math.max(8, bw - 8))} cy={by + bh - 4 - (k % 3) * 4} r={2.6} fill={ppt} stroke="#0003" strokeWidth={0.4} />)}
        {(fizz || boiling) && L > 0 && Array.from({ length: boiling ? 10 : 7 }, (_, k) => <circle key={k} className="lr-bubble" style={{ animationDelay: `${(k * 0.23) % 1.6}s`, animationDuration: boiling ? "0.9s" : "1.6s" }} cx={bx + 5 + ((k * 29) % Math.max(8, bw - 10))} cy={by + bh - 4} r={boiling ? 2.4 : 1.8} fill="#fff" fillOpacity={0.85} />)}
      </g>
      <path d={g.out} fill="#ffffff14" stroke="#E2E8F0" strokeWidth={2.5} strokeLinejoin="round" />
      <path d={g.out} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={1} transform="translate(3,0)" />
      {boiling && [0, 1, 2].map((k) => <circle key={k} className="lr-steam" style={{ animationDelay: `${k * 0.7}s` }} cx={44 + k * 6} cy={4} r={5} fill="#fff" fillOpacity={0.5} />)}
      {drop && <circle key={drop.key} className="lr-drop" cx={50} cy={4} r={3.2} fill={drop.colour} stroke="#fff" strokeWidth={0.6} />}
    </svg>
  );
}

// A Bunsen burner / hot plate / spirit lamp, lit or not.
export function Burner({ on, kind = "bunsen", flame = "#3B82F6", size = 80 }: { on: boolean; kind?: "bunsen" | "plate" | "lamp"; flame?: string; size?: number }) {
  return (
    <svg viewBox="0 0 80 100" style={{ width: size, height: size * 1.25 }} aria-hidden>
      {kind === "plate"
        ? <g><rect x={8} y={70} width={64} height={22} rx={4} fill="#334155" /><rect x={12} y={62} width={56} height={9} rx={3} fill={on ? "#F97316" : "#64748B"} className={on ? "lr-glow" : ""} /><circle cx={20} cy={81} r={4} fill="#94A3B8" /></g>
        : kind === "lamp"
          ? <g><path d="M22,96 q-4,-26 18,-30 q22,4 18,30 Z" fill="#BFDBFE" fillOpacity=".5" stroke="#E2E8F0" /><rect x={36} y={58} width={8} height={10} fill="#78716C" /></g>
          : <g><rect x={16} y={88} width={48} height={8} rx={3} fill="#475569" /><rect x={34} y={44} width={12} height={46} rx={2} fill="url(#lr-brass)" stroke="#92400E" strokeWidth={0.5} /><rect x={30} y={70} width={20} height={5} rx={2} fill="#B45309" /></g>}
      <defs><linearGradient id="lr-brass" x1="0" x2="1"><stop offset="0" stopColor="#B45309" /><stop offset=".5" stopColor="#FCD34D" /><stop offset="1" stopColor="#B45309" /></linearGradient></defs>
      {on && kind !== "plate" && (
        <g className="lr-flame" style={{ transformOrigin: `40px ${kind === "lamp" ? 58 : 44}px` }}>
          <path d={`M40,${kind === "lamp" ? 58 : 44} q-13,-14 -2,-40 q5,12 7,5 q9,16 -5,35 Z`} fill={flame} fillOpacity={flame === "#3B82F6" ? 0.55 : 0.9} />
          <path d={`M40,${kind === "lamp" ? 58 : 44} q-5,-8 0,-18 q5,10 0,18 Z`} fill="#BFDBFE" fillOpacity={0.9} />
        </g>
      )}
    </svg>
  );
}

// A bulb that glows (0–1), an LED, a motor that spins, a bell that rings.
export function Bulb({ glow = 0, led, size = 64 }: { glow?: number; led?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 60 70" style={{ width: size, height: size * 1.17 }} aria-hidden>
      {glow > 0 && <circle cx={30} cy={26} r={18 + glow * 12} fill={led ? "#F87171" : "#FDE047"} fillOpacity={0.25 + glow * 0.35} className="lr-glow" />}
      {led
        ? <path d="M20,40 V22 a10,10 0 0 1 20,0 V40 Z" fill={glow ? "#EF4444" : "#7F1D1D"} stroke="#FCA5A5" />
        : <circle cx={30} cy={26} r={16} fill={glow ? "#FEF9C3" : "#ffffff22"} stroke="#E2E8F0" strokeWidth={2} />}
      {!led && <path d="M24,34 L27,20 L30,30 L33,20 L36,34" fill="none" stroke={glow ? "#F59E0B" : "#94A3B8"} strokeWidth={1.6} />}
      <rect x={22} y={42} width={16} height={12} rx={2} fill="#94A3B8" /><path d="M24,58 V66 M36,58 V66" stroke="#94A3B8" strokeWidth={2} />
    </svg>
  );
}
export function Motor({ spin, size = 64 }: { spin?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 60 60" style={{ width: size, height: size }} aria-hidden>
      <rect x={8} y={18} width={34} height={30} rx={6} fill="#475569" stroke="#94A3B8" /><rect x={42} y={30} width={10} height={4} fill="#CBD5E1" />
      <g className={spin ? "lr-spin" : ""} style={{ transformOrigin: "54px 32px" }}><path d="M54,20 L56,32 L54,44 L52,32 Z" fill="#FCD34D" /></g>
    </svg>
  );
}
// A needle meter.
export function Dial({ value, max, unit, size = 80 }: { value: number; max: number; unit: string; size?: number }) {
  const a = (Math.max(0, Math.min(1, value / max)) * 100 - 50);
  return (
    <svg viewBox="0 0 80 60" style={{ width: size, height: size * 0.75 }} aria-hidden>
      <rect x={2} y={2} width={76} height={56} rx={6} fill="#1F2937" /><rect x={6} y={6} width={68} height={38} rx={4} fill="#F8FAF5" />
      {Array.from({ length: 11 }, (_, k) => { const t = ((k * 10 - 50) * Math.PI) / 180; return <line key={k} x1={40 + 30 * Math.sin(t)} y1={46 - 30 * Math.cos(t)} x2={40 + 26 * Math.sin(t)} y2={46 - 26 * Math.cos(t)} stroke="#1F2937" strokeWidth={k % 5 ? 0.8 : 1.4} />; })}
      <g className="lr-move" style={{ transform: `rotate(${a}deg)`, transformOrigin: "40px 46px", transformBox: "view-box" }}><line x1={40} y1={46} x2={40} y2={16} stroke="#DC2626" strokeWidth={1.6} /></g>
      <circle cx={40} cy={46} r={3} fill="#1F2937" /><text x={40} y={56} textAnchor="middle" fontSize={8} fontWeight={900} fill="#E2E8F0">{unit}</text>
    </svg>
  );
}
// A thermometer whose thread rises.
export function Thermometer({ T, size = 90 }: { T: number; size?: number }) {
  const h = Math.max(0, Math.min(1, (T + 10) / 120)) * 80;
  return (
    <svg viewBox="0 0 30 110" style={{ width: size * 0.27, height: size }} aria-hidden>
      <rect x={11} y={4} width={8} height={92} rx={4} fill="#ffffff22" stroke="#E2E8F0" />
      <rect className="lr-fill" x={13.5} y={92 - h} width={3} height={h} fill="#DC2626" />
      <circle cx={15} cy={98} r={7} fill="#DC2626" stroke="#E2E8F0" />
      {[0, 50, 100].map((t) => <g key={t}><line x1={19} y1={92 - ((t + 10) / 120) * 80} x2={23} y2={92 - ((t + 10) / 120) * 80} stroke="#E2E8F0" /><text x={24} y={95 - ((t + 10) / 120) * 80} fontSize={6} fill="#E2E8F0">{t}</text></g>)}
    </svg>
  );
}

// Each room, moving: light through the window, shelves, and something going on.
export function RoomScene({ subject }: { subject: LabSubject }) {
  const tint = { physics: "#F59E0B", chemistry: "#F472B6", biology: "#84CC16", maths: "#38BDF8" }[subject];
  const shelf = (y: number, items: ReactNode) => <g><rect x={0} y={y} width={300} height={5} fill="#8B5E34" /><rect x={0} y={y + 5} width={300} height={2} fill="#5B3A1A" />{items}</g>;
  const bottle = (x: number, y: number, c: string, h = 22) => <g key={`${x}-${y}`}><rect x={x} y={y - h} width={12} height={h} rx={2} fill={c} fillOpacity=".75" stroke="#E2E8F0" strokeWidth={0.6} /><rect x={x + 3} y={y - h - 5} width={6} height={5} fill="#475569" /></g>;
  return (
    <svg viewBox="0 0 600 130" preserveAspectRatio="xMidYMid slice" className="h-28 w-full sm:h-32" role="img" aria-label={`The ${subject} laboratory`}>
      <defs>
        <linearGradient id={`lr-wall-${subject}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1E293B" /><stop offset="1" stopColor="#0F172A" /></linearGradient>
        <linearGradient id="lr-beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FEF3C7" stopOpacity=".28" /><stop offset="1" stopColor="#FEF3C7" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width={600} height={130} fill={`url(#lr-wall-${subject})`} />
      {/* window and its light */}
      <rect x={250} y={12} width={100} height={62} rx={3} fill="#7DD3FC" fillOpacity=".22" stroke="#94A3B8" strokeWidth={3} /><line x1={300} y1={12} x2={300} y2={74} stroke="#94A3B8" strokeWidth={2} />
      <path d="M252,74 L348,74 L430,130 L200,130 Z" fill="url(#lr-beam)" />
      {Array.from({ length: 7 }, (_, k) => <circle key={k} className="lr-float" style={{ animationDelay: `${k * 0.9}s` }} cx={262 + k * 13} cy={110} r={1.2} fill="#FEF3C7" />)}
      {/* ceiling lamps */}
      {[110, 490].map((x) => <g key={x}><line x1={x} y1={0} x2={x} y2={10} stroke="#64748B" /><path d={`M${x - 14},10 H${x + 14} L${x + 9},18 H${x - 9} Z`} fill="#CBD5E1" /><ellipse cx={x} cy={19} rx={9} ry={2} fill="#FEF9C3" className="lr-glow" /></g>)}
      {/* shelves, left and right */}
      <g transform="translate(14,0) scale(.75)">{shelf(60, [bottle(10, 60, tint), bottle(30, 60, "#60A5FA"), bottle(50, 60, "#FBBF24", 18), bottle(70, 60, "#A78BFA", 26), bottle(92, 60, "#34D399", 20)])}{shelf(110, [bottle(14, 110, "#F87171", 18), bottle(36, 110, "#E2E8F0"), bottle(58, 110, tint, 24), bottle(80, 110, "#93C5FD", 16)])}</g>
      <g transform="translate(470,0) scale(.75)">{shelf(60, [bottle(4, 60, "#FCD34D"), bottle(26, 60, tint, 26), bottle(48, 60, "#E2E8F0", 18), bottle(70, 60, "#60A5FA")])}{shelf(110, [bottle(8, 110, "#A3E635"), bottle(30, 110, "#F472B6", 18), bottle(52, 110, tint), bottle(74, 110, "#94A3B8", 14)])}</g>
      {/* the bench */}
      <rect x={0} y={118} width={600} height={12} fill="#334155" /><rect x={0} y={116} width={600} height={3} fill="#64748B" />
      {subject === "chemistry" && <g transform="translate(150,64)"><rect x={-26} y={-34} width={70} height={88} rx={4} fill="#0EA5E9" fillOpacity=".08" stroke="#94A3B8" /><text x={9} y={-38} textAnchor="middle" fontSize={7} fill="#94A3B8">fume cupboard</text>
        <path d="M0,40 V18 L-10,38 q-2,8 6,8 H18 q8,0 6,-8 L14,18 V0" transform="translate(4,0)" fill="#F472B6" fillOpacity=".5" stroke="#E2E8F0" />{[0, 1, 2, 3].map((k) => <circle key={k} className="lr-bubble" style={{ animationDelay: `${k * 0.4}s` }} cx={8 + k * 4} cy={40} r={1.5} fill="#fff" />)}
        <g className="lr-flame" style={{ transformOrigin: "11px 54px" }}><path d="M11,54 q-6,-6 0,-12 q6,6 0,12 Z" fill="#60A5FA" /></g></g>}
      {subject === "physics" && <g transform="translate(160,24)"><line x1={-20} y1={0} x2={20} y2={0} stroke="#94A3B8" strokeWidth={3} /><g className="lr-swing"><line x1={0} y1={0} x2={0} y2={70} stroke="#E2E8F0" /><circle cx={0} cy={74} r={6} fill="#CBD5E1" /></g>
        <g transform="translate(270,46)"><rect x={0} y={0} width={70} height={44} rx={4} fill="#0B1220" stroke="#475569" /><path d="M6,22 q8,-14 16,0 t16,0 t16,0 t16,0" fill="none" stroke="#34D399" strokeWidth={1.6} className="lr-flow" /></g></g>}
      {subject === "biology" && <g><g transform="translate(160,72)"><rect x={-4} y={30} width={30} height={14} rx={2} fill="#475569" /><path d="M6,30 L18,0 L24,2 L14,30" fill="#94A3B8" /><rect x={16} y={-8} width={8} height={14} rx={2} fill="#CBD5E1" /></g>
        <g transform="translate(430,118)" className="lr-sway"><path d="M0,0 V-46" stroke="#4D7C0F" strokeWidth={2} /><path d="M0,-20 q-14,-6 -16,-18 q12,2 16,18 M0,-30 q14,-6 16,-18 q-12,2 -16,18 M0,-44 q-6,-12 0,-16 q6,4 0,16" fill="#65A30D" /><rect x={-8} y={0} width={16} height={-1} /></g></g>}
      {subject === "maths" && <g transform="translate(140,22)"><rect x={0} y={0} width={90} height={56} rx={3} fill="#14532D" stroke="#8B5E34" strokeWidth={3} /><text x={8} y={20} fontSize={9} fill="#E2E8F0" fontFamily="serif">a² + b² = c²</text><text x={8} y={36} fontSize={9} fill="#E2E8F0" fontFamily="serif">A = πr²</text>
        <circle cx={66} cy={38} r={11} fill="none" stroke="#FDE047" strokeDasharray="70" strokeDashoffset="0" className="lr-flow" /></g>}
    </svg>
  );
}
