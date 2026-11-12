// Kit for the reading-instruments drill and the sonometer: a thermometer in a
// beaker, needle meters (ammeter, voltmeter), the sonometer and a rack of
// tuning forks. Drawn with the middle of the base at (0, 0).
import type { ReactNode } from "react";
import type { ItemView } from "@/lib/lab/bench/types";
import { ScaleZoom, Thermo, thermoY } from "@/components/lab/bench/kit/parts";

type Zoom = { anchor: { x: number; y: number }; title: string; draw: (cx: number, cy: number, r: number) => ReactNode };

export const INSTRUMENT_SIZE: Record<string, [number, number]> = {
  "thermo-beaker": [130, 340], "dial-meter": [180, 160], sonometer: [960, 200], "fork-set": [240, 130],
};
const TB = { bulb: -34 };
const SN = { x0: -380, per: 11, wire: -132, top: -110 }; // sonometer: the fixed bridge (0 cm) at x0
const DARK = "#1F2937";
const ticksOf = (max: number, step: number) => Array.from({ length: Math.round(max / step) + 1 }, (_, k) => Number((k * step).toFixed(6)));
const isMult = (v: number, m: number) => Math.abs(v / m - Math.round(v / m)) < 1e-6;
const fmt = (v: number) => String(Number(v.toFixed(3)));

export function InstrumentKit({ it }: { it: ItemView }): ReactNode | null {
  const p = it.props ?? {};
  switch (it.kind) {
    case "thermo-beaker": return (
      <g>
        <rect x={-50} y={-110} width={100} height={88} fill="#BFDBFE" fillOpacity=".5" />
        <path d="M-56,-130 V-6 q0,6 6,6 H50 q6,0 6,-6 V-130" fill="url(#bl-glass)" stroke="#E2E8F0" strokeWidth={3} />
        <Thermo x={0} bulbY={TB.bulb} top={-330} T={Number(p.T ?? 20)} />
      </g>
    );
    case "dial-meter": return <Meter p={p} />;
    case "sonometer": return <Sonometer p={p} />;
    case "fork-set": {
      const fs: number[] = p.freqs ?? [], cur = p.current as number | null;
      return (
        <g>
          <rect x={-115} y={-22} width={230} height={22} rx={4} fill="#8B5E34" />
          {fs.map((f, i) => { const x = -92 + i * 46, up = cur === i ? -26 : 0;
            return <g key={f} transform={`translate(${x},${up})`}>
              <Fork />
              <text x={0} y={-100} textAnchor="middle" fontSize={10} fontWeight={800} fill={cur === i ? "#FDE047" : "#E2E8F0"}>{f}</text>
              {cur === i && <path d="M-16,-80 q-8,-10 0,-20 M16,-80 q8,-10 0,-20" fill="none" stroke="#FDE047" strokeWidth={2} />}
            </g>; })}
        </g>
      );
    }
    default: return null;
  }
}

function Fork({ scale = 1 }: { scale?: number }) {
  return (
    <g transform={`scale(${scale})`}>
      <rect x={-2.5} y={-34} width={5} height={30} rx={2} fill="url(#bl-metal)" />
      <path d="M-11,-88 V-44 q0,10 11,10 q11,0 11,-10 V-88" fill="none" stroke="#CBD5E1" strokeWidth={5} strokeLinecap="round" />
    </g>
  );
}

// A needle meter: 0 to max over 100°, ticks every `minor`, longer every `major`, numbers every `every`.
function Meter({ p }: { p: Record<string, any> }) {
  const max = Number(p.max ?? 1), value = Number(p.value ?? 0), minor = Number(p.minor ?? 0.02), major = Number(p.major ?? 0.1), every = Number(p.every ?? 0.2);
  const px = 0, py = -34, R = 74, ang = (v: number) => ((v / max) * 100 - 50) * (Math.PI / 180);
  const at = (v: number, r: number) => [px + r * Math.sin(ang(v)), py - r * Math.cos(ang(v))] as const;
  return (
    <g>
      <rect x={-88} y={-150} width={176} height={150} rx={10} fill="#1F2937" stroke="#475569" strokeWidth={2} />
      <rect x={-78} y={-140} width={156} height={104} rx={6} fill="#F8FAF5" />
      <path d={`M${at(0, R + 8).join(",")} A${R + 8},${R + 8} 0 0 1 ${at(max, R + 8).join(",")}`} fill="none" stroke="#CBD5E1" strokeWidth={5} />
      {ticksOf(max, minor).map((v) => { const big = isMult(v, major), [x1, y1] = at(v, R), [x2, y2] = at(v, R - (big ? 10 : 5)); return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke={DARK} strokeWidth={big ? 1.4 : 0.8} />; })}
      {ticksOf(max, every).map((v) => { const [x, y] = at(v, R - 20); return <text key={v} x={x} y={y + 3} textAnchor="middle" fontSize={8} fontWeight={800} fill={DARK}>{fmt(v)}</text>; })}
      <line x1={px} y1={py} x2={at(value, R + 4)[0]} y2={at(value, R + 4)[1]} stroke="#DC2626" strokeWidth={1.8} />
      <circle cx={px} cy={py} r={5} fill={DARK} />
      <text x={0} y={-48} textAnchor="middle" fontSize={20} fontWeight={900} fill={DARK}>{p.unit}</text>
      <circle cx={-50} cy={-14} r={7} fill="#111827" stroke="#64748B" /><circle cx={50} cy={-14} r={7} fill="#DC2626" stroke="#7F1D1D" />
    </g>
  );
}

function Sonometer({ p }: { p: Record<string, any> }) {
  const L = Number(p.L ?? 30), xb = SN.x0 + L * SN.per, W = SN.wire, res = !!p.res, ring = !!p.ring, mid = (SN.x0 + xb) / 2;
  return (
    <g>
      {/* box on its feet */}
      <rect x={-440} y={-14} width={20} height={14} fill="#5B3A1A" /><rect x={400} y={-14} width={20} height={14} fill="#5B3A1A" />
      <rect x={-450} y={SN.top} width={880} height={96} rx={4} fill="#A16207" stroke="#713F12" strokeWidth={2} />
      <ellipse cx={-120} cy={-62} rx={30} ry={18} fill="#422006" /><ellipse cx={140} cy={-62} rx={30} ry={18} fill="#422006" />
      {/* scale along the top edge: 0 at the fixed bridge */}
      <rect x={SN.x0 - 6} y={SN.top} width={66 * SN.per} height={16} fill="#F1E3BC" />
      {Array.from({ length: 65 }, (_, c) => <g key={c}><line x1={SN.x0 + c * SN.per} y1={SN.top} x2={SN.x0 + c * SN.per} y2={SN.top + (c % 5 ? 4 : 8)} stroke="#5B4A26" />{c % 10 === 0 && <text x={SN.x0 + c * SN.per} y={SN.top + 14} textAnchor="middle" fontSize={7} fontWeight={800} fill="#3F3216">{c}</text>}</g>)}
      {/* the struck fork, standing on the box (behind the wire) */}
      {ring && <g transform={`translate(360,${SN.top})`}><Fork /><path d="M-18,-78 q-8,-10 0,-20 M18,-78 q8,-10 0,-20" fill="none" stroke="#FDE047" strokeWidth={2} /><text x={0} y={-100} textAnchor="middle" fontSize={10} fontWeight={800} fill="#FDE047">{p.f} Hz</text></g>}
      {/* pegs, bridges, wire, pulley, mass */}
      <rect x={-444} y={W - 10} width={10} height={SN.top - W + 10} fill="#475569" />
      <path d={`M${SN.x0 - 9},${SN.top} L${SN.x0},${W} L${SN.x0 + 9},${SN.top} Z`} fill="#E5E7EB" stroke="#64748B" />
      <path d={`M${xb - 9},${SN.top} L${xb},${W} L${xb + 9},${SN.top} Z`} fill="#FDE68A" stroke="#92400E" style={{ transition: "all .2s" }} />
      <line x1={-439} y1={W} x2={440} y2={W} stroke="#CBD5E1" strokeWidth={1.6} />
      {res && [6, -6].map((a) => <path key={a} d={`M${SN.x0},${W} Q${mid},${W + a * 2.2} ${xb},${W}`} fill="none" stroke="#E2E8F0" strokeWidth={1.2}><animate attributeName="opacity" values="1;0.2;1" dur="0.12s" repeatCount="indefinite" /></path>)}
      {res
        ? <path d={`M${mid + 30},${SN.top - 2} l8,-6 l8,6`} fill="none" stroke="#DC2626" strokeWidth={3} />
        : <path d={`M${mid - 6},${W + 1} l6,-9 l6,9`} fill="none" stroke="#DC2626" strokeWidth={3} />}
      <circle cx={444} cy={W + 10} r={11} fill="url(#bl-metal)" stroke="#334155" />
      <line x1={455} y1={W + 10} x2={455} y2={-62} stroke="#CBD5E1" strokeWidth={1.6} />
      <rect x={437} y={-62} width={36} height={48} rx={3} fill="url(#bl-brass)" stroke="#92400E" />
      <text x={455} y={-34} textAnchor="middle" fontSize={9} fontWeight={900} fill="#422006">{fmt(Number(p.m ?? 1))} kg</text>
      {res && <text x={mid} y={W - 26} textAnchor="middle" fontSize={12} fontWeight={900} fill="#FDE047">Resonance!</text>}
    </g>
  );
}

// ── Close-ups ──
export function instrumentCloseup(it: ItemView): Zoom | null {
  const p = it.props ?? {};
  switch (it.kind) {
    case "thermo-beaker": {
      const T = Number(p.T ?? 20);
      return { anchor: { x: it.x, y: it.y + thermoY(TB.bulb, T) }, title: "Close-up · the thermometer (°C)",
        draw: (cx, cy, r) => <ScaleZoom cx={cx} cy={cy} r={r} value={T} perUnit={9} minor={1} label={10} lo={-10} hi={110} liquid="#DC2626" unit="°C" /> };
    }
    case "dial-meter": {
      const max = Number(p.max ?? 1), value = Number(p.value ?? 0), a = ((value / max) * 100 - 50) * (Math.PI / 180);
      return { anchor: { x: it.x + 74 * Math.sin(a), y: it.y - 34 - 74 * Math.cos(a) }, title: `Close-up · the ${p.unit === "V" ? "voltmeter" : "ammeter"} (${p.unit})`, draw: (cx, cy, r) => <MeterZoom cx={cx} cy={cy} r={r} p={p} /> };
    }
    case "sonometer": {
      const L = Number(p.L ?? 30);
      return { anchor: { x: it.x + SN.x0 + L * SN.per, y: it.y + SN.top }, title: "Close-up · the scale at the movable bridge (cm)", draw: (cx, cy, r) => <SonoZoom cx={cx} cy={cy} r={r} L={L} /> };
    }
    default: return null;
  }
}

// The dial near the needle, turned so the needle stands upright.
function MeterZoom({ cx, cy, r, p }: { cx: number; cy: number; r: number; p: Record<string, any> }) {
  const max = Number(p.max ?? 1), value = Number(p.value ?? 0), minor = Number(p.minor ?? 0.02), major = Number(p.major ?? 0.1), every = Number(p.every ?? 0.2);
  const R = 300, py = cy + 250, per = (100 / max) * (Math.PI / 180), pt = (v: number, rr: number) => { const d = (v - value) * per; return [cx + rr * Math.sin(d), py - rr * Math.cos(d)] as const; };
  const near = ticksOf(max, minor).filter((v) => Math.abs((v - value) * per * R) < r + 30);
  return (
    <g>
      <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#F8FAF5" />
      <path d={`M${pt(value - 0.4 * max, R + 16).join(",")} A${R + 16},${R + 16} 0 0 1 ${pt(value + 0.4 * max, R + 16).join(",")}`} fill="none" stroke="#CBD5E1" strokeWidth={12} />
      {near.map((v) => { const big = isMult(v, major), lab = isMult(v, every), [x1, y1] = pt(v, R), [x2, y2] = pt(v, R - (lab ? 34 : big ? 26 : 15));
        return <g key={v}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={DARK} strokeWidth={lab ? 2.4 : big ? 2 : 1.3} />
          {(lab || (big && max <= 1)) && (() => { const [x, y] = pt(v, R - 52); return <text x={x} y={y + 6} textAnchor="middle" fontSize={lab ? 18 : 13} fontWeight={800} fill={lab ? DARK : "#64748B"}>{fmt(v)}</text>; })()}</g>; })}
      <line x1={cx} y1={py - R + 70} x2={cx} y2={py - R - 20} stroke="#DC2626" strokeWidth={3} />
      <text x={cx + r - 30} y={cy + r - 26} textAnchor="end" fontSize={20} fontWeight={900} fill={DARK}>{p.unit}</text>
    </g>
  );
}

// The sonometer's scale under the movable bridge.
function SonoZoom({ cx, cy, r, L }: { cx: number; cy: number; r: number; L: number }) {
  const per = 60, X = (c: number) => cx + (c - L) * per, top = cy, ticks: number[] = [];
  for (let mm = Math.ceil((L - r / per) * 10); mm <= Math.floor((L + r / per) * 10); mm++) if (mm >= 0) ticks.push(mm);
  return (
    <g>
      <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#A16207" />
      <rect x={cx - r} y={top} width={2 * r} height={70} fill="#F1E3BC" />
      {ticks.map((mm) => { const big = mm % 10 === 0, mid = mm % 5 === 0; return <g key={mm}>
        <line x1={X(mm / 10)} y1={top} x2={X(mm / 10)} y2={top + (big ? 28 : mid ? 18 : 10)} stroke="#3F3216" strokeWidth={big ? 2 : 1.1} />
        {big && <text x={X(mm / 10)} y={top + 48} textAnchor="middle" fontSize={17} fontWeight={800} fill="#3F3216">{mm / 10}</text>}
      </g>; })}
      <path d={`M${cx - 40},${top} L${cx},${top - 70} L${cx + 40},${top} Z`} fill="#FDE68A" fillOpacity=".85" stroke="#92400E" strokeWidth={2} />
      <line x1={cx - r} y1={top - 70} x2={cx + r} y2={top - 70} stroke="#E2E8F0" strokeWidth={2} />
    </g>
  );
}
