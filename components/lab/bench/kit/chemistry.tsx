// Chemistry apparatus: Bunsen burner, nichrome loop, watch glasses, Boyle's law
// tube, electrolysis cell, chromatography paper, pH chart and meter.
import type { ReactNode } from "react";
import type { ItemView } from "@/lib/lab/bench/types";
import { Lead, ScaleZoom, digits } from "@/components/lab/bench/kit/parts";

type Zoom = { anchor: { x: number; y: number }; title: string; draw: (cx: number, cy: number, r: number) => ReactNode };

export const CHEMISTRY_SIZE: Record<string, [number, number]> = {
  bunsen: [100, 270], loop: [30, 175], dish: [80, 22], boyle: [220, 610], pump: [120, 90], electrode: [30, 150],
  "electrolysis-cell": [200, 260], "chroma-paper": [140, 330], "ph-chart": [420, 70], "ph-meter": [140, 110],
};
export const CHEMISTRY_FRONTS = ["beaker"];

const BOYLE = { top: -480, per: 6.8 };
const CHROMA = { line: -40, per: 30 };
const DYES = [{ c: "#DC2626", rf: 0.62 }, { c: "#2563EB", rf: 0.41 }, { c: "#EAB308", rf: 0.84 }, { c: "#7C3AED", rf: 0.22 }];
const PH_UI = ["#DC2626", "#EA580C", "#F97316", "#F59E0B", "#EAB308", "#A3E635", "#22C55E", "#14B8A6", "#0EA5E9", "#2563EB", "#4F46E5", "#6D28D9", "#7E22CE", "#86198F"];

export function ChemistryKit({ it }: { it: ItemView; flowing?: boolean }): ReactNode | null {
  const p = it.props ?? {};
  switch (it.kind) {
    case "bunsen": {
      const lit = !!p.lit, air = Number(p.air ?? 0), blue = air >= 50;
      return (
        <g>
          <path d="M-46,0 Q-46,-14 -30,-16 H30 Q46,-14 46,0 Z" fill="#334155" />
          <path d="M-40,-8 C-90,-8 -120,-30 -180,-20" fill="none" stroke="#F97316" strokeWidth={7} strokeLinecap="round" />
          <rect x={-9} y={-150} width={18} height={136} fill="url(#bl-metal)" />
          <rect x={-12} y={-50} width={24} height={18} rx={2} fill="#94A3B8" />
          <rect x={-5} y={-46} width={10} height={10} fill={air > 0 ? "#0F172A" : "#64748B"} />
          {lit && (
            <g className="bench-flicker">
              {blue ? <>
                <path d="M-11,-150 C-14,-180 -4,-215 0,-232 C4,-215 14,-180 11,-150 Z" fill="#60A5FA" fillOpacity=".55" />
                <path d="M-6,-150 C-7,-165 -2,-178 0,-186 C2,-178 7,-165 6,-150 Z" fill="#1D4ED8" fillOpacity=".85" />
              </> : <path d="M-12,-150 C-22,-190 -8,-235 2,-262 C10,-230 22,-190 12,-150 Z" fill="#FBBF24" fillOpacity=".9" />}
              {p.colour && <path d="M-13,-160 C-20,-190 -6,-228 0,-246 C6,-228 20,-190 13,-160 Z" fill={p.colour} fillOpacity=".8" />}
            </g>
          )}
        </g>
      );
    }
    case "loop": return (
      <g>
        <rect x={-5} y={-62} width={10} height={62} rx={3} fill="#1F2937" />
        <line x1={0} y1={-62} x2={0} y2={-158} stroke="#9CA3AF" strokeWidth={2} />
        <circle cx={0} cy={-165} r={6} fill="none" stroke="#9CA3AF" strokeWidth={2} />
        {p.salt && <circle cx={0} cy={-165} r={4} fill="#F8FAFC" />}
      </g>
    );
    case "dish": return (
      <g>
        <ellipse cx={0} cy={-6} rx={38} ry={8} fill="#E2E8F0" fillOpacity=".35" stroke="#fff" strokeOpacity=".8" />
        {p.piece === "powder" && <ellipse cx={0} cy={-10} rx={18} ry={6} fill={p.colour ?? "#F8FAFC"} />}
        {p.piece === "ribbon" && <path d="M-20,-10 q8,-10 16,0 t16,0 t12,-4" fill="none" stroke={p.colour} strokeWidth={4} strokeLinecap="round" />}
        {p.piece === "granules" && [-14, -4, 6, 14, 0].map((x, k) => <circle key={k} cx={x} cy={k === 4 ? -14 : -9} r={4.5} fill={p.colour} stroke="#1F2937" strokeOpacity=".3" />)}
        {p.piece === "turnings" && <path d="M-18,-9 c4,-8 8,8 12,0 c4,-8 8,8 12,0 c4,-8 8,8 10,-2" fill="none" stroke={p.colour} strokeWidth={3} />}
      </g>
    );
    case "boyle": {
      const V = Number(p.V ?? 40), pr = Number(p.p ?? 100), ly = BOYLE.top + V * BOYLE.per;
      return (
        <g>
          <rect x={-100} y={-14} width={200} height={14} rx={3} fill="#334155" />
          <rect x={-70} y={-520} width={140} height={506} rx={6} fill="#1E293B" />
          <rect x={-14} y={-490} width={28} height={360} rx={6} fill="#E2E8F0" fillOpacity=".1" />
          <rect x={-11} y={ly} width={22} height={-130 - ly} fill="#F59E0B" fillOpacity=".9" />
          <path d={`M-11,${ly + 3} Q0,${ly - 4} 11,${ly + 3}`} fill="none" stroke="#B45309" strokeWidth={1.5} />
          <rect x={-14} y={-490} width={28} height={360} rx={6} fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".85" strokeWidth={1.6} />
          <rect x={22} y={BOYLE.top - 6} width={34} height={50 * BOYLE.per + 12} fill="#F8FAFC" />
          {Array.from({ length: 51 }, (_, v) => <g key={v}><line x1={22} y1={BOYLE.top + v * BOYLE.per} x2={22 + (v % 5 ? 5 : 10)} y2={BOYLE.top + v * BOYLE.per} stroke="#0F172A" strokeWidth={v % 5 ? 0.7 : 1.3} />{v % 10 === 0 && <text x={36} y={BOYLE.top + v * BOYLE.per + 3} fontSize={8} fontWeight={800} fill="#0F172A">{v}</text>}</g>)}
          <rect x={-60} y={-130} width={120} height={60} rx={6} fill="url(#bl-metal)" />
          <g transform="translate(-30,-560)">
            <circle r={44} fill="#F8FAFC" stroke="#94A3B8" strokeWidth={5} />
            {Array.from({ length: 9 }, (_, k) => { const a = ((-135 + k * 33.75) * Math.PI) / 180; return <g key={k}><line x1={36 * Math.sin(a)} y1={-36 * Math.cos(a)} x2={42 * Math.sin(a)} y2={-42 * Math.cos(a)} stroke="#0F172A" /><text x={27 * Math.sin(a)} y={-27 * Math.cos(a) + 3} textAnchor="middle" fontSize={7} fontWeight={700} fill="#0F172A">{k * 50}</text></g>; })}
            <g style={{ transform: `rotate(${-135 + (pr / 400) * 270}deg)`, transition: "transform .5s" }}><rect x={-1.5} y={-38} width={3} height={42} fill="#DC2626" /></g>
            <circle r={4} fill="#0F172A" />
            <text y={22} textAnchor="middle" fontSize={8} fontWeight={800} fill="#334155">kPa</text>
          </g>
          <path d="M-30,-516 V-490" stroke="#94A3B8" strokeWidth={6} />
          <path d="M60,-100 C200,-100 260,-40 300,-30" fill="none" stroke="#1F2937" strokeWidth={6} />
        </g>
      );
    }
    case "pump": return (
      <g>
        <rect x={-55} y={-10} width={110} height={10} rx={3} fill="#1F2937" />
        <path d="M-50,-12 L40,-50 L46,-40 L-44,-4 Z" fill="#334155" />
        <rect x={-20} y={-80} width={18} height={68} rx={4} fill="url(#bl-metal)" />
      </g>
    );
    case "electrode": {
      const pl = Number(p.plated ?? 0);
      return (
        <g>
          <rect x={-12} y={-150} width={24} height={150} rx={2} fill="#B87333" />
          {pl > 0 && <rect x={-13} y={-90} width={26} height={90} rx={2} fill="#F0A47A" fillOpacity={0.4 + 0.5 * pl} />}
          <rect x={-12} y={-150} width={6} height={150} fill="#fff" fillOpacity=".2" />
        </g>
      );
    }
    case "electrolysis-cell": {
      const pl = Number(p.plated ?? 0), on = !!p.on;
      return (
        <g>
          <path d="M-80,-160 V-4 Q-80,0 -76,0 H76 Q80,0 80,-4 V-160" fill="#E2E8F0" fillOpacity=".08" />
          <rect x={-78} y={-115} width={156} height={113} fill="#3B82F6" fillOpacity=".55" />
          <rect x={-52} y={-230} width={18 - 8 * pl} height={200} rx={2} fill="#B87333" />
          {p.cathode && <><rect x={34} y={-230} width={24} height={200} rx={2} fill="#B87333" /><rect x={33} y={-115} width={26} height={85} rx={2} fill="#F0A47A" fillOpacity={0.3 + 0.6 * pl} /></>}
          <rect x={-90} y={-236} width={180} height={12} rx={3} fill="#475569" />
          <path d="M-80,-160 V-4 Q-80,0 -76,0 H76 Q80,0 80,-4 V-160" fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".8" strokeWidth={2} />
          <Lead x1={-44} y1={-236} x2={350} y2={-30} c="#DC2626" sag={-80} />
          {p.cathode && <Lead x1={46} y1={-236} x2={390} y2={-30} c="#111827" sag={-60} />}
          {on && <text x={0} y={-130} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">anode +   − cathode</text>}
        </g>
      );
    }
    case "chroma-paper": {
      const lanes = (p.lanes as number[][]) ?? [], front = Number(p.front ?? 8), prog = Number(p.progress ?? 0);
      const wet = -CHROMA.line + front * CHROMA.per * prog + 4;
      return (
        <g>
          <rect x={-70} y={-326} width={140} height={8} rx={3} fill="#8B5E34" />
          <rect x={-45} y={-318} width={90} height={318} fill="#FBFBF7" stroke="#E2E8F0" />
          {prog > 0 && <rect x={-45} y={-wet} width={90} height={wet} fill="#93C5FD" fillOpacity=".18" />}
          <line x1={-42} y1={CHROMA.line} x2={42} y2={CHROMA.line} stroke="#64748B" strokeWidth={1} />
          {p.out && <line x1={-42} y1={CHROMA.line - front * CHROMA.per} x2={42} y2={CHROMA.line - front * CHROMA.per} stroke="#64748B" strokeDasharray="4 3" />}
          {["A", "B", "C", "X"].map((l, k) => <text key={l} x={-33 + k * 22} y={CHROMA.line + 16} textAnchor="middle" fontSize={10} fontWeight={700} fill="#64748B">{l}</text>)}
          {p.spotted && lanes.map((dyes, k) => dyes.map((d) => <ellipse key={`${k}-${d}`} cx={-33 + k * 22} cy={CHROMA.line - DYES[d].rf * front * CHROMA.per * prog} rx={6} ry={4 + 3 * prog} fill={DYES[d].c} fillOpacity=".8" />))}
        </g>
      );
    }
    case "ph-chart": return (
      <g>
        <rect x={-210} y={-66} width={420} height={60} rx={6} fill="#F8FAFC" />
        {PH_UI.map((c, k) => <g key={k}><rect x={-200 + k * 28.5} y={-58} width={26} height={30} rx={3} fill={c} /><text x={-187 + k * 28.5} y={-14} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0F172A">{k + 1}</text></g>)}
        <rect x={-10} y={-6} width={20} height={6} fill="#94A3B8" />
      </g>
    );
    case "ph-meter": {
      const r = p.reading as number | null;
      return (
        <g>
          <rect x={-70} y={-110} width={140} height={110} rx={10} fill="url(#bl-case)" />
          <rect x={-58} y={-96} width={116} height={40} rx={4} fill="#0B1220" />
          <text x={50} y={-67} textAnchor="end" fontSize={22} fontWeight={700} fontFamily="ui-monospace, monospace" fill="#34D399">{r == null ? "--.-" : r.toFixed(1)}</text>
          <text x={-52} y={-82} fontSize={9} fontWeight={800} fill="#34D399">pH</text>
          {p.probe
            ? <><path d="M-70,-40 C-150,-40 -200,-160 -260,-130" fill="none" stroke="#1F2937" strokeWidth={4} /><rect x={-265} y={-132} width={10} height={100} rx={4} fill="#475569" /></>
            : <><path d="M60,-40 C110,-40 110,-120 90,-140" fill="none" stroke="#1F2937" strokeWidth={4} /><rect x={84} y={-170} width={10} height={100} rx={4} fill="#475569" /></>}
        </g>
      );
    }
    default: return null;
  }
}

// The beaker's glass in front of what stands in it.
export function ChemistryFront({ it }: { it: ItemView }): ReactNode | null {
  if (it.kind !== "beaker" || !it.props?.front) return null;
  return <path d="M-48,-112 V-4 Q-48,0 -44,0 H44 Q48,0 48,-4 V-120" fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".75" strokeWidth={2} />;
}

export function chemistryCloseup(it: ItemView): Zoom | null {
  const p = it.props ?? {};
  switch (it.kind) {
    case "flask": {
      if (!p.cross) return null;
      const cloud = Number(p.cloud ?? 0);
      return { anchor: { x: it.x, y: it.y - 60 }, title: "Looking down through the flask",
        draw: (cx, cy, r) => (
          <g>
            <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#F8FAFC" />
            <path d={`M${cx - 45},${cy - 45} L${cx + 45},${cy + 45} M${cx + 45},${cy - 45} L${cx - 45},${cy + 45}`} stroke="#0F172A" strokeWidth={14} strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={r * 0.9} fill="#FBF3D5" fillOpacity={Math.min(1, cloud * 1.02)} />
            <circle cx={cx} cy={cy} r={r * 0.9} fill="none" stroke="#CBD5E1" strokeWidth={4} />
          </g>
        ) };
    }
    case "boyle": {
      const V = Number(p.V ?? 40);
      return { anchor: { x: it.x + 22, y: it.y + BOYLE.top + V * BOYLE.per }, title: "Close-up · read the top of the oil (cm³)",
        draw: (cx, cy, r) => <ScaleZoom cx={cx} cy={cy} r={r} value={V} perUnit={22} minor={0.5} label={5} lo={0} hi={50} liquid="#F59E0B" down unit="cm³" /> };
    }
    case "ph-meter": return p.reading == null ? null : { anchor: { x: it.x, y: it.y - 76 }, title: "Close-up · the pH meter", draw: (cx, cy) => digits(cx, cy, Number(p.reading).toFixed(1), "pH", "#34D399") };
    case "chroma-paper": {
      if (!p.out) return null;
      const front = Number(p.front ?? 8), lanes = (p.lanes as number[][]) ?? [];
      const xd = lanes[3] ?? [], top = Math.max(...xd.map((d) => DYES[d].rf)) * front, at = p.focus === "spot" ? top : front;
      return { anchor: { x: it.x + 33, y: it.y + CHROMA.line - at * CHROMA.per }, title: p.focus === "spot" ? "Close-up · lane X against the ruler (cm)" : "Close-up · the solvent front against the ruler (cm)",
        draw: (cx, cy, r) => {
          const per = 40, Y = (d: number) => cy - (d - at) * per, ticks: number[] = [];
          for (let t = Math.max(0, Math.ceil((at - 3.2) * 10)); t <= Math.floor((at + 3.2) * 10); t++) ticks.push(t / 10);
          return (
            <g>
              <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#FBFBF7" />
              <line x1={cx - r} y1={Y(front)} x2={cx + r} y2={Y(front)} stroke="#64748B" strokeWidth={2} strokeDasharray="8 5" />
              <line x1={cx - r} y1={Y(0)} x2={cx + r} y2={Y(0)} stroke="#64748B" strokeWidth={2} />
              {xd.map((d) => <ellipse key={d} cx={cx + 40} cy={Y(DYES[d].rf * front)} rx={22} ry={14} fill={DYES[d].c} fillOpacity=".8" />)}
              <rect x={cx - 75} y={cy - r} width={44} height={2 * r} fill="#F1E3BC" />
              {ticks.map((t) => { const big = Math.abs(t - Math.round(t)) < 1e-6, mid = !big && Math.abs(t * 2 - Math.round(t * 2)) < 1e-6;
                return <g key={t}><line x1={cx - 31} y1={Y(t)} x2={cx - 31 - (big ? 22 : mid ? 15 : 9)} y2={Y(t)} stroke="#3F3216" strokeWidth={big ? 2 : 1} />{big && <text x={cx - 66} y={Y(t) + 5} fontSize={14} fontWeight={800} fill="#3F3216">{Math.round(t)}</text>}</g>; })}
            </g>
          );
        } };
    }
    default: return null;
  }
}
