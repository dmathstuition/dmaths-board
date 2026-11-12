// Measuring instruments: vernier callipers, micrometer screw gauge, outside and
// inside callipers with a half-metre rule, a spring balance and a eureka can.
// Each is drawn with the middle of its base at (0, 0); the close-ups show the
// scales big enough to read the way you would in the lab.
import type { ReactNode } from "react";
import type { ItemView } from "@/lib/lab/bench/types";
import { Clamp, ScaleZoom, Stand } from "@/components/lab/bench/kit/parts";
import { micrometerParts, vernierParts, LEFT_TIP } from "@/lib/lab/bench/measure";

type Zoom = { anchor: { x: number; y: number }; title: string; draw: (cx: number, cy: number, r: number) => ReactNode };

export const MEASURE_SIZE: Record<string, [number, number]> = {
  vernier: [700, 330], "v-object": [100, 280], micrometer: [480, 230], "wire-coil": [100, 60], pipe: [210, 170],
  "calliper-out": [80, 230], "calliper-in": [80, 230], "half-rule": [640, 60], "spring-balance": [220, 640], "eureka-can": [230, 430],
};

const VC = { x0: -250, per: 50, beam: -190, bot: -12 }; // vernier: 0 cm at x0, 50 px per cm
const MC = { anvil: -170, per: 30, axis: -120, zero: -40 }; // micrometer: px per mm; the sleeve's 0 at `zero`
const PIPE = 2.5; // px per tenth of a cm
const RULE = { x0: -300, per: 12 }; // half-metre rule: px per cm
const SB = { top: -628, zero: -618, per: 30 }; // spring balance: px per N
const STEEL = "#CBD5E1", DARK = "#1F2937";

export function MeasureKit({ it }: { it: ItemView }): ReactNode | null {
  const p = it.props ?? {};
  switch (it.kind) {
    case "vernier": return <Vernier h={Number(p.h ?? 0)} obj={p.obj ?? null} />;
    case "v-object": {
      const h = Number(p.h ?? 150);
      if (p.shape === "ball") { const r = (h / 100) * VC.per / 2; return <g><circle cx={0} cy={-r} r={r} fill="#7DD3FC" fillOpacity=".75" stroke="#0369A1" strokeWidth={2} /><circle cx={-r * 0.35} cy={-r * 1.35} r={r * 0.25} fill="#fff" fillOpacity=".7" /><path d={`M${-r * 0.6},${-r} q${r * 0.6},${-r * 0.5} ${r * 1.2},0`} fill="none" stroke="#F59E0B" strokeWidth={3} /></g>; }
      if (p.shape === "rod") { const L = (h / 100) * VC.per; return <g><rect x={-14} y={-L} width={28} height={L} rx={4} fill="url(#bl-brass)" stroke="#92400E" /><ellipse cx={0} cy={-L} rx={14} ry={5} fill="#FCD34D" stroke="#92400E" /></g>; }
      const w = (h / 100) * VC.per + 8;
      return <g><path d={`M${-w / 2},-210 V-24 a${w / 2},${w / 2} 0 0 0 ${w},0 V-210`} fill="#fff" fillOpacity=".25" stroke="#E2E8F0" strokeWidth={3} /><ellipse cx={0} cy={-210} rx={w / 2 + 2} ry={5} fill="none" stroke="#E2E8F0" strokeWidth={3} /></g>;
    }
    case "micrometer": return <Micrometer h={Number(p.h ?? 0)} wire={!!p.wire} />;
    case "wire-coil": return (
      <g>{[0, 1, 2, 3].map((k) => <ellipse key={k} cx={0} cy={-18 - k * 4} rx={40} ry={14} fill="none" stroke="#B45309" strokeWidth={3} />)}<path d="M38,-20 q30,10 46,-6" fill="none" stroke="#B45309" strokeWidth={3} /></g>
    );
    case "pipe": {
      const w = Number(p.D ?? 60) * PIPE, t = Number(p.t ?? 4) * PIPE;
      return (
        <g>
          <rect x={-w / 2} y={-150} width={w} height={150} fill="#E5E7EB" stroke="#94A3B8" strokeWidth={2} />
          <rect x={-w / 2} y={-150} width={w * 0.2} height={150} fill="#fff" fillOpacity=".5" />
          <ellipse cx={0} cy={0} rx={w / 2} ry={10} fill="#CBD5E1" />
          <ellipse cx={0} cy={-150} rx={w / 2} ry={16} fill="#E5E7EB" stroke="#94A3B8" strokeWidth={2} />
          <ellipse cx={0} cy={-150} rx={w / 2 - t} ry={16 - t / 3} fill="#334155" />
        </g>
      );
    }
    case "calliper-out": case "calliper-in": {
      const inside = it.kind === "calliper-in";
      if (!p.on) return <Calliper inside={inside} hingeY={-215} tips={[-16, 16]} tipY={-6} />;
      const w = Number(p.D ?? 60) * PIPE, t = Number(p.t ?? 4) * PIPE;
      return inside ? <Calliper inside hingeY={-300} tips={[-(w / 2 - t), w / 2 - t]} tipY={-152} /> : <Calliper inside={false} hingeY={-300} tips={[-w / 2, w / 2]} tipY={-80} bow={44} />;
    }
    case "half-rule": {
      const tips = p.tips as number | null;
      const X = (cm: number) => RULE.x0 + cm * RULE.per;
      return (
        <g>
          <rect x={RULE.x0 - 10} y={-30} width={50 * RULE.per + 20} height={30} rx={2} fill="#F1E3BC" stroke="#C8B07A" />
          {Array.from({ length: 501 }, (_, mm) => mm).filter((mm) => mm % 5 === 0).map((mm) => <line key={mm} x1={X(mm / 10)} y1={-30} x2={X(mm / 10)} y2={-30 + (mm % 10 ? 4 : mm % 50 ? 8 : 12)} stroke="#5B4A26" />)}
          {Array.from({ length: 11 }, (_, k) => <text key={k} x={X(k * 5)} y={-8} textAnchor="middle" fontSize={9} fontWeight={800} fill="#3F3216">{k * 5}</text>)}
          {tips != null && <Calliper inside={p.which === "in"} hingeY={-150} tips={[X(LEFT_TIP / 10), X((LEFT_TIP + tips) / 10)]} tipY={-31} bow={p.which === "in" ? 0 : 24} />}
        </g>
      );
    }
    case "spring-balance": {
      const N = Number(p.N ?? 0), py = SB.zero + N * SB.per;
      return (
        <g>
          <Stand x={-80} top={-640} base={[-110, 70]} />
          <Clamp x={-80} y={SB.top - 14} x2={0} />
          <rect x={-18} y={SB.top} width={36} height={172} rx={8} fill="#E2E8F0" stroke="#64748B" strokeWidth={2} />
          <rect x={-8} y={SB.zero - 6} width={16} height={5 * SB.per + 8} fill="#fff" stroke="#94A3B8" />
          {Array.from({ length: 21 }, (_, k) => <line key={k} x1={-8} y1={SB.zero + k * 0.25 * SB.per} x2={k % 4 ? -3 : 2} y2={SB.zero + k * 0.25 * SB.per} stroke={DARK} strokeWidth={0.8} />)}
          {[0, 1, 2, 3, 4, 5].map((n) => <text key={n} x={13} y={SB.zero + n * SB.per + 3} fontSize={8} fontWeight={800} fill={DARK}>{n}</text>)}
          <path d={`M-12,${py} L8,${py}`} stroke="#DC2626" strokeWidth={2.5} />
          <line x1={0} y1={SB.top + 172} x2={0} y2={SB.top + 187} stroke="#64748B" strokeWidth={3} />
          <path d={`M0,${SB.top + 187} q-8,6 0,12 q6,0 4,-6`} fill="none" stroke="#64748B" strokeWidth={2.5} />
          {p.stone && <g><line x1={0} y1={SB.top + 196} x2={0} y2={-300} stroke="#E2E8F0" strokeWidth={1.4} /><path d="M-28,-296 q-6,22 10,36 q22,10 40,-4 q12,-18 0,-32 q-24,-10 -50,0 Z" fill="#78716C" stroke="#44403C" /></g>}
        </g>
      );
    }
    case "eureka-can": {
      const full = !!p.full, lvl = -380;
      return (
        <g>
          <rect x={-60} y={-420} width={120} height={420} rx={6} fill="url(#bl-glass)" stroke="#E2E8F0" strokeWidth={3} />
          {full && <rect x={-56} y={lvl} width={112} height={-lvl - 4} fill="#BFDBFE" fillOpacity=".55" />}
          <path d="M58,-392 L146,-364 L142,-354 L58,-378 Z" fill="#CBD5E1" stroke="#94A3B8" />
          {p.stone && [0, 1, 2].map((k) => <circle key={k} cx={142} cy={-350} r={3.5} fill="#93C5FD"><animate attributeName="cy" values="-350;-300" dur="0.8s" begin={`${k * 0.27}s`} repeatCount="indefinite" /></circle>)}
        </g>
      );
    }
    default: return null;
  }
}

// Vernier callipers: the main beam, the sliding jaw and its vernier scale.
function Vernier({ h, obj }: { h: number; obj: string | null }) {
  const B = VC.beam, x0 = VC.x0, xs = x0 + (h / 100) * VC.per, mid = (x0 + xs) / 2;
  return (
    <g>
      {/* the object first, so the jaws grip it */}
      {obj === "ball" && <circle cx={mid} cy={-82} r={Math.max(0, xs - x0) / 2} fill="#7DD3FC" fillOpacity=".8" stroke="#0369A1" strokeWidth={2} />}
      {obj === "rod" && <rect x={x0} y={-102} width={Math.max(0, xs - x0)} height={36} rx={3} fill="url(#bl-brass)" stroke="#92400E" />}
      {obj === "tube" && <circle cx={mid} cy={B - 44} r={Math.max(0, xs - x0) / 2 + 3} fill="#fff" fillOpacity=".12" stroke="#E2E8F0" strokeWidth={5} />}
      {/* beam with the main scale */}
      <rect x={x0 - 44} y={B - 16} width={650} height={32} rx={3} fill="url(#bl-metal)" stroke="#475569" />
      {Array.from({ length: 111 }, (_, mm) => <line key={mm} x1={x0 + mm * 5} y1={B + 16} x2={x0 + mm * 5} y2={B + 16 - (mm % 10 ? (mm % 5 ? 5 : 8) : 12)} stroke={DARK} strokeWidth={0.8} />)}
      {Array.from({ length: 12 }, (_, c) => <text key={c} x={x0 + c * VC.per} y={B} textAnchor="middle" fontSize={9} fontWeight={800} fill={DARK}>{c}</text>)}
      {/* fixed jaws */}
      <path d={`M${x0 - 44},${B + 16} L${x0},${B + 16} L${x0},${VC.bot} L${x0 - 12},${VC.bot} L${x0 - 44},${B + 96} Z`} fill="url(#bl-metal)" stroke="#475569" />
      <path d={`M${x0},${B - 16} L${x0 + 8},${B - 16} L${x0 + 8},${B - 62} L${x0},${B - 74} Z`} fill="url(#bl-metal)" stroke="#475569" />
      {/* the slider: frame round the beam, vernier plate, jaws */}
      <rect x={xs - 22} y={B - 22} width={100} height={7} rx={2} fill="#94A3B8" stroke="#475569" />
      <rect x={xs - 22} y={B + 16} width={100} height={26} rx={2} fill="#E2E8F0" stroke="#475569" />
      {Array.from({ length: 11 }, (_, k) => <line key={k} x1={xs + k * 4.5} y1={B + 16} x2={xs + k * 4.5} y2={B + 16 + (k % 5 ? 6 : 10)} stroke={DARK} strokeWidth={0.8} />)}
      <path d={`M${xs},${B + 42} L${xs + 44},${B + 42} L${xs + 12},${VC.bot} L${xs},${VC.bot} Z`} fill="url(#bl-metal)" stroke="#475569" />
      <path d={`M${xs - 8},${B - 22} L${xs},${B - 22} L${xs},${B - 74} L${xs - 8},${B - 62} Z`} fill="url(#bl-metal)" stroke="#475569" />
      <rect x={xs + 30} y={B - 34} width={16} height={12} rx={3} fill="#64748B" />
    </g>
  );
}

// Micrometer: the C frame, anvil, spindle, sleeve (datum line) and thimble.
function Micrometer({ h, wire }: { h: number; wire: boolean }) {
  const A = MC.axis, xf = MC.anvil + (h / 100) * MC.per, xe = MC.zero + (h / 100) * MC.per, t = micrometerParts(h).thimble;
  return (
    <g>
      <path d={`M${MC.anvil - 14},${A} V-26 H${MC.zero - 30} V${A + 16}`} fill="none" stroke="#1E3A5F" strokeWidth={24} strokeLinejoin="round" />
      <rect x={MC.anvil - 26} y={A - 9} width={26} height={18} fill="url(#bl-metal)" stroke="#475569" />
      {wire && <circle cx={(MC.anvil + xf) / 2} cy={A} r={Math.max(2, (xf - MC.anvil) / 2)} fill="#D97706" stroke="#92400E" />}
      <rect x={xf} y={A - 8} width={Math.max(0, MC.zero - 40 - xf) + 40} height={16} fill="url(#bl-metal)" stroke="#475569" />
      <rect x={MC.zero - 30} y={A - 16} width={Math.max(30, xe - MC.zero + 34)} height={32} fill="#E5E7EB" stroke="#64748B" />
      <line x1={MC.zero - 30} y1={A} x2={xe} y2={A} stroke={DARK} strokeWidth={1} />
      {Array.from({ length: 21 }, (_, k) => k / 2).filter((mm) => MC.zero + mm * MC.per < xe - 1).map((mm) => <line key={mm} x1={MC.zero + mm * MC.per} y1={A} x2={MC.zero + mm * MC.per} y2={A + (Number.isInteger(mm) ? -8 : 6)} stroke={DARK} strokeWidth={0.9} />)}
      <rect x={xe} y={A - 26} width={130} height={52} rx={4} fill="#9CA3AF" stroke="#4B5563" />
      {Array.from({ length: 9 }, (_, k) => k * 13).map((dx) => <line key={dx} x1={xe + 30 + dx} y1={A - 26} x2={xe + 30 + dx} y2={A + 26} stroke="#6B7280" strokeWidth={2} />)}
      <rect x={xe} y={A - 26} width={22} height={52} fill="#D1D5DB" stroke="#4B5563" />
      {[-3, -2, -1, 0, 1, 2, 3].map((d) => <line key={d} x1={xe} y1={A - d * 6} x2={xe + ((t + d) % 5 ? 6 : 10)} y2={A - d * 6} stroke={DARK} strokeWidth={0.8} />)}
      <rect x={xe + 130} y={A - 15} width={40} height={30} rx={4} fill="#6B7280" stroke="#374151" />
      <text x={xe + 150} y={A + 32} textAnchor="middle" fontSize={9} fontWeight={800} fill="#E2E8F0">ratchet</text>
    </g>
  );
}

// Callipers: two legs from a hinge to the tips (outside ones bow outwards, inside ones have feet).
function Calliper({ inside, hingeY, tips, tipY, bow = 0 }: { inside: boolean; hingeY: number; tips: [number, number]; tipY: number; bow?: number }) {
  const hx = (tips[0] + tips[1]) / 2;
  const leg = (tx: number, side: number) => inside
    ? `M${hx},${hingeY} L${tx - side * 6},${tipY - 10} L${tx},${tipY}`
    : `M${hx},${hingeY} Q${tx + side * bow},${(hingeY + tipY) / 2} ${tx - side * 4},${tipY}`;
  return (
    <g>
      <path d={leg(tips[0], -1)} fill="none" stroke="#475569" strokeWidth={6} strokeLinecap="round" />
      <path d={leg(tips[1], 1)} fill="none" stroke="#64748B" strokeWidth={6} strokeLinecap="round" />
      <circle cx={hx} cy={hingeY} r={10} fill="url(#bl-metal)" stroke="#334155" strokeWidth={2} />
    </g>
  );
}

// ── Close-ups ──
export function measureCloseup(it: ItemView): Zoom | null {
  const p = it.props ?? {};
  switch (it.kind) {
    case "vernier": {
      const h = Number(p.h ?? 0);
      return { anchor: { x: it.x + VC.x0 + (h / 100) * VC.per, y: it.y + VC.beam + 16 }, title: "Close-up · main scale and vernier (cm)", draw: (cx, cy, r) => <VernierZoom cx={cx} cy={cy} r={r} h={h} /> };
    }
    case "micrometer": {
      const h = Number(p.h ?? 0);
      return { anchor: { x: it.x + MC.zero + (h / 100) * MC.per, y: it.y + MC.axis }, title: "Close-up · sleeve and thimble (mm)", draw: (cx, cy, r) => <MicrometerZoom cx={cx} cy={cy} r={r} h={h} /> };
    }
    case "half-rule": {
      const tips = p.tips as number | null;
      if (tips == null) return null;
      const at = (LEFT_TIP + tips) / 10;
      return { anchor: { x: it.x + RULE.x0 + at * RULE.per, y: it.y - 30 }, title: "Close-up · the right point on the rule (cm)", draw: (cx, cy, r) => <RuleZoom cx={cx} cy={cy} r={r} at={at} inside={p.which === "in"} /> };
    }
    case "spring-balance": {
      const N = Number(p.N ?? 0);
      if (!N) return null;
      return { anchor: { x: it.x, y: it.y + SB.zero + N * SB.per }, title: "Close-up · the spring balance (N)",
        draw: (cx, cy, r) => <ScaleZoom cx={cx} cy={cy} r={r} value={N} perUnit={240} minor={0.05} label={0.5} lo={0} hi={5} down pointer="#DC2626" unit="N" /> };
    }
    default: return null;
  }
}

// The vernier, twice: the zero against the main scale, then closer in where the lines match.
function VernierZoom({ cx, cy, r, h }: { cx: number; cy: number; r: number; h: number }) {
  const R = h / 100, { line } = vernierParts(h);
  const strip = (key: string, top: number, bottom: number, centre: number, per: number, every: boolean) => {
    const edge = every ? top + 38 : bottom - 40, X = (c: number) => cx + (c - centre) * per, half = r / per + 0.1;
    const mains: number[] = [];
    for (let mm = Math.ceil((centre - half) * 10); mm <= Math.floor((centre + half) * 10); mm++) mains.push(mm);
    const id = `vz-${key}-${Math.round(cx)}-${Math.round(cy)}`;
    return (
      <g>
        <clipPath id={id}><rect x={cx - r} y={top} width={2 * r} height={bottom - top} /></clipPath>
        <g clipPath={`url(#${id})`}>
          <rect x={cx - r} y={top} width={2 * r} height={edge - top} fill="#D7DEE7" />
          <rect x={cx - r} y={edge} width={2 * r} height={bottom - edge} fill="#F1F5F9" />
          {mains.map((mm) => { const big = mm % 10 === 0, mid = mm % 5 === 0; return <g key={mm}>
            <line x1={X(mm / 10)} y1={edge} x2={X(mm / 10)} y2={edge - (big ? 26 : mid ? 18 : 12)} stroke={DARK} strokeWidth={big ? 2 : 1.3} />
            {big && <text x={X(mm / 10)} y={edge - 30} textAnchor="middle" fontSize={15} fontWeight={800} fill={DARK}>{mm / 10}</text>}
            {mid && !big && !every && <text x={X(mm / 10)} y={edge - 22} textAnchor="middle" fontSize={10} fontWeight={700} fill="#64748B">{(mm / 10).toFixed(1)}</text>}
          </g>; })}
          {Array.from({ length: 11 }, (_, k) => k).map((k) => { const x = X(R + 0.09 * k), long = k % 5 === 0;
            return <g key={k}>
              <line x1={x} y1={edge} x2={x} y2={edge + (long ? 20 : 13)} stroke="#B91C1C" strokeWidth={1.4} />
              {(every || long) && <text x={x} y={edge + (long ? 34 : 27)} textAnchor="middle" fontSize={every ? 13 : 12} fontWeight={800} fill="#B91C1C">{k}</text>}
            </g>; })}
          <line x1={cx - r} y1={edge} x2={cx + r} y2={edge} stroke="#475569" strokeWidth={1} />
        </g>
      </g>
    );
  };
  const shift = ((((line * 7 + 3) % 5) - 2) * 0.09) / 2;
  return (
    <g>
      <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#0B1220" />
      {strip("a", cy - 84, cy - 4, R + 0.4, 120, false)}
      {strip("b", cy + 4, cy + 84, R + 0.09 * line + shift, 520, true)}
      <text x={cx - 84} y={cy + 18} fontSize={10} fontWeight={800} fill="#475569">closer</text>
    </g>
  );
}

// The sleeve (whole mm above the datum line, half mm below) and the thimble's edge.
function MicrometerZoom({ cx, cy, r, h }: { cx: number; cy: number; r: number; h: number }) {
  const H = h / 100, per = 70, xe = cx - 4, t = micrometerParts(h).thimble, sp = 15;
  const marks: number[] = [];
  for (let k = 0; k <= 50; k++) { const mm = k / 2, x = xe - (H - mm) * per; if (x < xe - 2 && x > cx - r - 5) marks.push(mm); }
  return (
    <g>
      <rect x={cx - r} y={cy - 46} width={xe - cx + r} height={92} fill="#E5E7EB" />
      <line x1={cx - r} y1={cy} x2={xe} y2={cy} stroke={DARK} strokeWidth={2} />
      {marks.map((mm) => { const x = xe - (H - mm) * per, whole = Number.isInteger(mm); return <g key={mm}>
        <line x1={x} y1={cy} x2={x} y2={cy + (whole ? -26 : 20)} stroke={DARK} strokeWidth={2} />
        {whole && <text x={x} y={cy - 32} textAnchor="middle" fontSize={16} fontWeight={800} fill={DARK}>{mm}</text>}
      </g>; })}
      <rect x={xe} y={cy - r} width={cx + r - xe} height={2 * r} fill="#9CA3AF" />
      <rect x={xe} y={cy - r} width={34} height={2 * r} fill="#D1D5DB" />
      {Array.from({ length: 17 }, (_, d) => d - 8).map((d) => { const k = t + d, y = cy - d * sp, v = ((k % 50) + 50) % 50, five = v % 5 === 0;
        return <g key={d}><line x1={xe} y1={y} x2={xe + (five ? 22 : 13)} y2={y} stroke={DARK} strokeWidth={1.6} />{five && <text x={xe + 40} y={y + 5} fontSize={14} fontWeight={800} fill={DARK}>{v}</text>}</g>; })}
      <line x1={xe} y1={cy - r} x2={xe} y2={cy + r} stroke="#4B5563" strokeWidth={2} />
      <text x={cx - 86} y={cy + 62} fontSize={11} fontWeight={800} fill="#CBD5E1">sleeve</text>
    </g>
  );
}

// The rule up close, under the calliper's right point.
function RuleZoom({ cx, cy, r, at, inside }: { cx: number; cy: number; r: number; at: number; inside: boolean }) {
  const per = 70, X = (c: number) => cx + (c - at) * per, top = cy + 6, ticks: number[] = [];
  for (let mm = Math.ceil((at - r / per) * 10); mm <= Math.floor((at + r / per) * 10); mm++) ticks.push(mm);
  return (
    <g>
      <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#22355F" />
      <rect x={cx - r} y={top} width={2 * r} height={r} fill="#F1E3BC" />
      {ticks.map((mm) => { const big = mm % 10 === 0, mid = mm % 5 === 0; return <g key={mm}>
        <line x1={X(mm / 10)} y1={top} x2={X(mm / 10)} y2={top + (big ? 30 : mid ? 20 : 12)} stroke="#3F3216" strokeWidth={big ? 2 : 1.2} />
        {big && <text x={X(mm / 10)} y={top + 50} textAnchor="middle" fontSize={17} fontWeight={800} fill="#3F3216">{mm / 10}</text>}
      </g>; })}
      {inside
        ? <path d={`M${cx - 60},${cy - r} L${cx - 8},${top - 14} L${cx},${top}`} fill="none" stroke="#64748B" strokeWidth={14} strokeLinecap="round" />
        : <path d={`M${cx - 30},${cy - r} Q${cx + 40},${cy - 40} ${cx},${top}`} fill="none" stroke="#64748B" strokeWidth={14} strokeLinecap="round" />}
      <circle cx={cx} cy={top} r={3} fill="#DC2626" />
    </g>
  );
}
