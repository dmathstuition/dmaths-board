// Kit for the extra practicals: wire board, electromagnet, kettle and lagged
// beakers, oil tube and lap timer, polystyrene cup, tripod, filter funnel and
// basin, gas flask and syringe, yeast tube, leaf, boiling beaker, ruler drop.
import type { ReactNode } from "react";
import type { ItemView } from "@/lib/lab/bench/types";
import { Clamp, Lead, ScaleZoom, Stand, Thermo, digits, thermoY } from "@/components/lab/bench/kit/parts";

type Zoom = { anchor: { x: number; y: number }; title: string; draw: (cx: number, cy: number, r: number) => ReactNode };

export const MORE2_SIZE: Record<string, [number, number]> = {
  "wire-board": [860, 40], electromagnet: [220, 420], kettle: [130, 150], "insulated-beaker": [130, 330], "oil-tube": [90, 520], "lap-timer": [190, 150],
  "poly-cup": [110, 330], tripod: [160, 250], filter: [140, 260], basin: [120, 40], "gas-flask": [130, 170], "gas-syringe": [320, 120],
  "yeast-tube": [260, 230], leaf: [120, 60], "boiling-beaker": [160, 170], "ruler-drop": [200, 620],
};
const WB = { x0: -400, per: 8 }; // wire board: 0 cm at x0, 8 px per cm
const TUBE = { top: -500, per: 4.5 }; // oil tube: px per cm, 0 cm at the top band

export function More2Kit({ it }: { it: ItemView }): ReactNode | null {
  const p = it.props ?? {};
  switch (it.kind) {
    case "wire-board": {
      const L = Number(p.L ?? 50), cx = WB.x0 + L * WB.per;
      return (
        <g>
          <rect x={WB.x0 - 20} y={-26} width={840} height={26} rx={3} fill="#8B5E34" />
          <rect x={WB.x0 - 10} y={-20} width={820} height={12} fill="#F1E3BC" />
          {Array.from({ length: 101 }, (_, c) => <g key={c}><line x1={WB.x0 + c * WB.per} y1={-20} x2={WB.x0 + c * WB.per} y2={-20 + (c % 10 ? 4 : 8)} stroke="#5B4A26" />{c % 10 === 0 && <text x={WB.x0 + c * WB.per} y={-10} textAnchor="middle" fontSize={7} fontWeight={800} fill="#3F3216">{c}</text>}</g>)}
          <line x1={WB.x0} y1={-24} x2={WB.x0 + 800} y2={-24} stroke="#CBD5E1" strokeWidth={1.6} />
          {p.on && <line x1={WB.x0} y1={-24} x2={cx} y2={-24} stroke="#FDE047" strokeWidth={2} className="elab-flow" strokeDasharray="4 8" />}
          <rect x={WB.x0 - 6} y={-30} width={12} height={10} rx={2} fill="#DC2626" />
          <g style={{ transform: `translateX(${cx}px)`, transition: "transform .4s" }}><path d="M-8,-34 L8,-34 L5,-22 L-5,-22 Z" fill="#111827" /><rect x={-2} y={-40} width={4} height={8} fill="#111827" /></g>
          <Lead x1={WB.x0} y1={-30} x2={-420} y2={-340} c="#DC2626" sag={-40} />
          <Lead x1={cx} y1={-38} x2={-20} y2={-330} c="#111827" sag={-30} />
          <Lead x1={WB.x0 + 4} y1={-30} x2={270} y2={-330} c="#DC2626" sag={-90} />
          <Lead x1={cx} y1={-38} x2={310} y2={-330} c="#111827" sag={-60} />
        </g>
      );
    }
    case "electromagnet": {
      const turns = Number(p.turns ?? 10), on = !!p.on, picked = p.picked as number | null, tip = -150;
      return (
        <g>
          <Stand x={-90} top={-420} base={[-120, 60]} />
          <Clamp x={-90} y={-380} x2={0} />
          <rect x={-5} y={-385} width={10} height={235} fill="url(#bl-metal)" />
          <path d={`M-5,${tip} L0,${tip + 14} L5,${tip}`} fill="#94A3B8" />
          {Array.from({ length: Math.round(turns / 2) }, (_, k) => <ellipse key={k} cx={0} cy={-350 + k * (180 / Math.max(1, Math.round(turns / 2)))} rx={12} ry={3} fill="none" stroke="#B45309" strokeWidth={2.4} />)}
          <Lead x1={-12} y1={-352} x2={-440} y2={-330} c="#DC2626" sag={-30} />
          <Lead x1={12} y1={-172} x2={-400} y2={-330} c="#111827" sag={30} />
          <ellipse cx={0} cy={-8} rx={70} ry={10} fill="#E2E8F0" fillOpacity=".4" stroke="#fff" strokeOpacity=".8" />
          {Array.from({ length: 12 }, (_, k) => <path key={k} d={`M${-50 + k * 9},-10 h6 a2,2 0 0 0 0,-4 h-6`} fill="none" stroke="#94A3B8" strokeWidth={1.5} />)}
          {on && picked != null && Array.from({ length: picked }, (_, k) => <rect key={k} x={-5 + (k % 2) * 3} y={tip + 14 + k * 11} width={10} height={14} rx={4} fill="none" stroke="#CBD5E1" strokeWidth={1.8} />)}
          <text x={30} y={-270} fontSize={11} fontWeight={800} fill="#fff">{turns} turns</text>
        </g>
      );
    }
    case "kettle": return (
      <g>
        <path d="M-50,0 V-110 Q-50,-130 -30,-130 H30 Q50,-130 50,-110 V0 Z" fill="url(#bl-metal)" />
        <path d="M50,-100 C80,-100 80,-60 50,-50" fill="none" stroke="#64748B" strokeWidth={8} />
        <path d="M-50,-90 L-80,-120 L-74,-126 L-44,-100" fill="#94A3B8" />
        <rect x={-20} y={-142} width={40} height={14} rx={6} fill="#1F2937" />
      </g>
    );
    case "insulated-beaker": {
      const mat = Number(p.mat ?? 0), T = Number(p.T ?? 22), wrap = mat === 1 ? "#E5E7EB" : mat === 2 ? "#FAFAF9" : null;
      return (
        <g>
          {wrap && <rect x={-62} y={-118} width={124} height={118} rx={10} fill={wrap} stroke={mat === 1 ? "#9CA3AF" : "#E7E5E4"} strokeDasharray={mat === 1 ? "6 3" : undefined} />}
          {mat === 1 && [-90, -60, -30].map((y) => <line key={y} x1={-56} y1={y} x2={56} y2={y + 6} stroke="#6B7280" strokeOpacity=".5" />)}
          {mat === 2 && Array.from({ length: 30 }, (_, k) => <circle key={k} cx={-55 + ((k * 37) % 110)} cy={-110 + ((k * 23) % 105)} r={7} fill="#fff" />)}
          {p.filled && <rect x={-44} y={-90} width={88} height={88} fill="#BFDBFE" fillOpacity=".6" />}
          <path d="M-46,-110 V-4 Q-46,0 -42,0 H42 Q46,0 46,-4 V-110" fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".7" strokeWidth={2} />
          <Thermo x={10} bulbY={-20} top={-320} T={T} lo={0} per={2.4} />
        </g>
      );
    }
    case "oil-tube": {
      const prog = Number(p.prog ?? 0), r = p.big ? 11 : 7, depth = prog * 80;
      return (
        <g>
          <rect x={-60} y={-12} width={120} height={12} rx={3} fill="#334155" />
          <rect x={-28} y={-520} width={56} height={508} rx={8} fill="#FCD34D" fillOpacity=".35" />
          {[0, 20, 40, 60, 80].map((c) => <g key={c}><rect x={-30} y={TUBE.top + c * TUBE.per - 2} width={60} height={4} fill="#DC2626" /><text x={-38} y={TUBE.top + c * TUBE.per + 4} textAnchor="end" fontSize={10} fontWeight={800} fill="#fff">{c}</text></g>)}
          {p.ball != null && <circle cx={0} cy={TUBE.top + depth * TUBE.per - r} r={r} fill="url(#bl-metal)" stroke="#1F2937" />}
          <rect x={-28} y={-520} width={56} height={508} rx={8} fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".8" strokeWidth={2} />
          <text x={36} y={TUBE.top - 6} fontSize={9} fontWeight={800} fill="#fff">cm</text>
        </g>
      );
    }
    case "lap-timer": {
      const laps = (p.laps as number[]) ?? [];
      return (
        <g>
          <rect x={-95} y={-150} width={190} height={150} rx={10} fill="url(#bl-case)" />
          <rect x={-82} y={-138} width={164} height={110} rx={5} fill="#0B1220" />
          {[0, 1, 2, 3].map((k) => <text key={k} x={-72} y={-114 + k * 26} fontSize={15} fontWeight={700} fontFamily="ui-monospace, monospace" fill={laps[k] != null ? "#34D399" : "#1E293B"}>{`L${k + 1}  ${laps[k] != null ? laps[k].toFixed(2) : "-.--"} s`}</text>)}
          <circle cx={0} cy={-14} r={9} fill="#475569" />
        </g>
      );
    }
    case "poly-cup": {
      const T = Number(p.T ?? 20), vol = Number(p.vol ?? 25);
      return (
        <g>
          <rect x={-52} y={-6} width={104} height={6} rx={2} fill="#94A3B8" />
          <path d="M-46,-120 L-36,-4 H36 L46,-120 Z" fill="#F8FAFC" stroke="#E2E8F0" />
          <rect x={-38} y={-60 - vol * 0.6} width={76} height={4} fill="#BFDBFE" />
          <rect x={-50} y={-126} width={100} height={8} rx={3} fill="#E5E7EB" />
          <Thermo x={12} bulbY={-30} top={-325} T={T} lo={0} per={6} />
        </g>
      );
    }
    case "tripod": return (
      <g>
        <path d="M-75,0 L-55,-240 M75,0 L55,-240" stroke="#334155" strokeWidth={5} />
        <rect x={-70} y={-246} width={140} height={6} fill="#475569" />
        {Array.from({ length: 8 }, (_, k) => <line key={k} x1={-63 + k * 18} y1={-246} x2={-63 + k * 18} y2={-240} stroke="#94A3B8" />)}
      </g>
    );
    case "filter": return (
      <g>
        <Stand x={-60} top={-260} base={[-90, 40]} />
        <Clamp x={-60} y={-200} x2={0} />
        <path d="M-50,-220 L50,-220 L8,-150 V-90 H-8 V-150 Z" fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".8" strokeWidth={2} />
        <path d="M-42,-216 L42,-216 L4,-156 H-4 Z" fill="#F8FAFC" fillOpacity=".9" />
        {p.used && <ellipse cx={0} cy={-170} rx={14} ry={6} fill="#111827" />}
      </g>
    );
    case "basin": {
      const evap = Number(p.evap ?? 0), cr = Number(p.crystals ?? 0);
      return (
        <g>
          <path d="M-58,-36 Q-50,0 0,0 Q50,0 58,-36 Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth={2} />
          {p.filled && <path d={`M${-50 + evap * 12},${-30 + evap * 14} Q0,${-4} ${50 - evap * 12},${-30 + evap * 14} Z`} fill="#2563EB" fillOpacity={0.6 + 0.3 * evap} />}
          {cr > 0 && Array.from({ length: Math.round(cr * 7) }, (_, k) => <path key={k} d={`M${-28 + k * 9},-14 l5,-7 l5,7 l-5,7 Z`} fill="#1D4ED8" stroke="#93C5FD" />)}
          {evap > 0 && evap < 1 && [-15, 10].map((x) => <path key={x} d={`M${x},-40 q-6,-12 0,-24 q6,-12 0,-24`} fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth={3} />)}
        </g>
      );
    }
    case "gas-flask": {
      const fizz = Number(p.fizz ?? 0);
      return (
        <g>
          <path d="M-58,-5 Q-60,0 -53,0 H53 Q60,0 58,-5 L16,-92 V-127 H-16 V-92 Z" fill="#E0F2FE" fillOpacity=".25" />
          <path d="M-50,-2 H50 L33,-40 H-33 Z" fill="#BFDBFE" fillOpacity=".6" />
          {p.solid != null && Array.from({ length: p.solid ? 14 : 6 }, (_, k) => <circle key={k} cx={-30 + k * (p.solid ? 4.5 : 11)} cy={-6} r={p.solid ? 2 : 5} fill="#F8FAFC" />)}
          {Array.from({ length: fizz * 3 }, (_, b) => <circle key={b} className="bench-fizz" cx={-25 + (b * 11) % 50} cy={-10} r={2} fill="#fff" style={{ animationDuration: `${1.4 / fizz}s`, animationDelay: `${(b * 0.17) % 1}s` }} />)}
          <path d="M-58,-5 Q-60,0 -53,0 H53 Q60,0 58,-5 L16,-92 V-127 H-16 V-92 Z" fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".75" strokeWidth={2} />
          <rect x={-18} y={-140} width={36} height={16} rx={3} fill="#7F1D1D" />
          <path d="M0,-140 V-170 H165 V-84" fill="none" stroke="#E2E8F0" strokeWidth={4} />
        </g>
      );
    }
    case "gas-syringe": {
      const V = Number(p.V ?? 0), per = 2.4, x0 = -140;
      return (
        <g>
          <rect x={-8} y={-70} width={16} height={70} fill="url(#bl-metal)" /><rect x={-40} y={-10} width={80} height={10} rx={3} fill="#334155" /><rect x={-26} y={-78} width={52} height={12} rx={3} fill="#475569" />
          <rect x={-170} y={-100} width={300} height={32} rx={8} fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".8" strokeWidth={2} />
          {Array.from({ length: 101 }, (_, v) => <g key={v}><line x1={x0 + v * per} y1={-100} x2={x0 + v * per} y2={-100 + (v % 10 ? (v % 5 ? 4 : 7) : 10)} stroke="#fff" strokeOpacity=".85" />{v % 20 === 0 && <text x={x0 + v * per} y={-108} textAnchor="middle" fontSize={9} fontWeight={800} fill="#fff">{v}</text>}</g>)}
          <g style={{ transform: `translateX(${V * per}px)`, transition: "transform .3s" }}>
            <rect x={x0 - 4} y={-98} width={8} height={28} fill="#1F2937" />
            <rect x={x0 + 4} y={-88} width={190} height={8} fill="#94A3B8" />
            <rect x={x0 + 190} y={-100} width={10} height={32} rx={3} fill="#64748B" />
          </g>
          <rect x={-175} y={-92} width={10} height={16} fill="#E2E8F0" />
        </g>
      );
    }
    case "yeast-tube": {
      const rate = Number(p.rate ?? 0), dur = Math.max(0.5, 240 / Math.max(1, rate)), cloudy = Number(p.cloudy ?? 0);
      return (
        <g>
          <path d="M-12,-200 V-20 a12,12 0 0 0 24,0 V-200" fill="#FEF3C7" fillOpacity=".7" stroke="#fff" strokeOpacity=".8" strokeWidth={1.6} />
          <rect x={-14} y={-210} width={28} height={12} rx={2} fill="#7F1D1D" />
          <path d="M0,-210 V-240 H150 V-60" fill="none" stroke="#E2E8F0" strokeWidth={3} />
          <path d="M138,-150 V-10 a12,12 0 0 0 24,0 V-150" fill="#F8FAFC" fillOpacity={0.35 + 0.55 * cloudy} stroke="#fff" strokeOpacity=".8" strokeWidth={1.6} />
          {rate > 0 && Array.from({ length: 4 }, (_, k) => <circle key={k} className="bench-fizz" cx={150} cy={-62} r={3} fill="#fff" style={{ animationDuration: `${dur}s`, animationDelay: `${(k * dur) / 4}s` }} />)}
          <text x={150} y={-160} textAnchor="middle" fontSize={10} fontWeight={800} fill="#fff">limewater</text>
        </g>
      );
    }
    case "leaf": {
      const st = Number(p.stage ?? 0), outer = st >= 5 ? "#C2731B" : st >= 2 ? "#FEF9C3" : "#F1F5F9", inner = st >= 5 ? "#1E1B4B" : st >= 2 ? "#FEF3C7" : st === 1 ? "#166534" : "#16A34A";
      const shape = (k: number) => `M${-55 * k},-28 C${-30 * k},${-60 * k - 28 * (1 - k)} ${30 * k},${-60 * k - 28 * (1 - k)} ${55 * k},-28 C${30 * k},${4 * k - 28 * (1 - k)} ${-30 * k},${4 * k - 28 * (1 - k)} ${-55 * k},-28 Z`;
      return (
        <g>
          <path d={shape(1)} fill={outer} stroke="#65A30D" strokeWidth={1.5} />
          <path d={shape(0.62)} fill={inner} />
          <path d="M-55,-28 H55 M55,-28 l12,4" stroke={st >= 2 ? "#CA8A04" : "#15803D"} strokeWidth={1.5} fill="none" />
        </g>
      );
    }
    case "boiling-beaker": return (
      <g>
        <rect x={-70} y={-40} width={140} height={40} rx={5} fill="url(#bl-case)" />
        <rect x={-55} y={-46} width={110} height={6} fill={p.on ? "#EF4444" : "#64748B"} />
        <path d="M-50,-160 V-50 H50 V-160" fill="#BFDBFE" fillOpacity=".3" stroke="#fff" strokeOpacity=".8" strokeWidth={2} />
        <rect x={-48} y={-130} width={96} height={80} fill="#93C5FD" fillOpacity=".45" />
        {p.on && Array.from({ length: 6 }, (_, k) => <circle key={k} className="bench-fizz" cx={-35 + k * 14} cy={-58} r={3} fill="#fff" style={{ animationDuration: "0.9s", animationDelay: `${k * 0.15}s` }} />)}
      </g>
    );
    case "ruler-drop": {
      const d = Number(p.d ?? 0), per = 9, fy = -300;
      return (
        <g>
          <g key={Number(p.drops)} className={Number(p.drops) ? "bench-drop" : undefined} style={{ transform: `translateY(${d * per}px)` }}>
            <rect x={-18} y={fy - 30 * per} width={36} height={30 * per} fill="#F1E3BC" stroke="#C8B07A" />
            {Array.from({ length: 31 }, (_, c) => <g key={c}><line x1={-18} y1={fy - c * per} x2={-18 + (c % 5 ? 7 : 12)} y2={fy - c * per} stroke="#5B4A26" />{c % 5 === 0 && <text x={8} y={fy - c * per + 3} fontSize={8} fontWeight={800} fill="#3F3216">{c}</text>}</g>)}
            <path d={`M-18,${fy - 30 * per} h36`} stroke="#5B4A26" />
          </g>
          {/* partner's hand above, catcher's finger and thumb below */}
          <path d={`M-40,${fy - 30 * per - 40} q20,-12 40,0 q20,12 40,0`} fill="none" stroke="#C68B59" strokeWidth={14} strokeLinecap="round" />
          <path d={`M-90,${fy + 30} C-60,${fy + 20} -40,${fy + 4} -26,${fy}`} fill="none" stroke="#C68B59" strokeWidth={14} strokeLinecap="round" />
          <path d={`M90,${fy + 30} C60,${fy + 20} 40,${fy + 4} 26,${fy}`} fill="none" stroke="#B87A4B" strokeWidth={12} strokeLinecap="round" />
          <rect x={-120} y={fy + 26} width={240} height={10} rx={4} fill="#475569" />
          <rect x={-120} y={-12} width={240} height={12} rx={3} fill="#334155" />
          <rect x={-6} y={fy + 36} width={12} height={-fy - 48} fill="#475569" />
        </g>
      );
    }
    default: return null;
  }
}

export function more2Closeup(it: ItemView): Zoom | null {
  const p = it.props ?? {};
  switch (it.kind) {
    case "meter": return p.on ? { anchor: { x: it.x, y: it.y - 116 }, title: `Close-up · the ${p.unit === "A" ? "ammeter" : "voltmeter"}`, draw: (cx, cy) => digits(cx, cy, String(p.reading), String(p.unit), "#C9D8B6") } : null;
    case "electromagnet": return p.on && p.picked != null ? { anchor: { x: it.x, y: it.y - 120 }, title: "Close-up · the paperclips",
      draw: (cx, cy, r) => <g><rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#22355F" /><rect x={cx - 7} y={cy - r} width={14} height={24} fill="#94A3B8" />{Array.from({ length: Number(p.picked) }, (_, k) => <rect key={k} x={cx - 12 + (k % 2) * 6} y={cy - r + 24 + k * (180 / Math.max(6, Number(p.picked)))} width={20} height={26} rx={8} fill="none" stroke="#E2E8F0" strokeWidth={3} />)}</g> } : null;
    case "insulated-beaker": { const T = Number(p.T ?? 22); return { anchor: { x: it.x + 10, y: it.y + thermoY(-20, T, 0, 2.4) }, title: "Close-up · the thermometer (°C)", draw: (cx, cy, r) => <ScaleZoom cx={cx} cy={cy} r={r} value={T} perUnit={18} minor={0.5} label={5} lo={0} hi={110} liquid="#DC2626" unit="°C" /> }; }
    case "poly-cup": { const T = Number(p.T ?? 20); return { anchor: { x: it.x + 12, y: it.y + thermoY(-30, T, 0, 6) }, title: "Close-up · the thermometer (°C)", draw: (cx, cy, r) => <ScaleZoom cx={cx} cy={cy} r={r} value={T} perUnit={50} minor={0.1} label={1} lo={0} hi={50} liquid="#DC2626" unit="°C" /> }; }
    case "lap-timer": { const laps = (p.laps as number[]) ?? []; return laps.length ? { anchor: { x: it.x, y: it.y - 80 }, title: "Close-up · the lap times",
      draw: (cx, cy) => <g><rect x={cx - 105} y={cy - 80} width={210} height={160} rx={8} fill="#0B1220" />{[0, 1, 2, 3].map((k) => <text key={k} x={cx - 90} y={cy - 46 + k * 36} fontSize={22} fontWeight={700} fontFamily="ui-monospace, monospace" fill="#34D399">{`L${k + 1} ${laps[k] != null ? laps[k].toFixed(2) : "-.--"}`}</text>)}</g> } : null; }
    case "gas-syringe": { const V = Number(p.V ?? 0); return { anchor: { x: it.x - 140 + V * 2.4, y: it.y - 84 }, title: "Close-up · the syringe at the plunger (cm³)",
      draw: (cx, cy, r) => { const per = 12, X = (v: number) => cx + (v - V) * per, ticks: number[] = []; for (let v = Math.max(0, Math.ceil(V - 10)); v <= Math.min(100, Math.floor(V + 10)); v++) ticks.push(v);
        return <g><rect x={cx - r} y={cy - 40} width={2 * r} height={60} fill="#E0F2FE" fillOpacity=".4" /><rect x={cx - 6} y={cy - 38} width={12} height={56} fill="#1F2937" /><rect x={cx + 6} y={cy - 8} width={r} height={14} fill="#94A3B8" />
          {ticks.map((v) => <g key={v}><line x1={X(v)} y1={cy - 40} x2={X(v)} y2={cy - 40 + (v % 10 ? (v % 5 ? 10 : 16) : 24)} stroke="#fff" strokeWidth={v % 10 ? 1 : 2} />{v % 10 === 0 && <text x={X(v)} y={cy - 48} textAnchor="middle" fontSize={16} fontWeight={800} fill="#fff">{v}</text>}</g>)}</g>; } }; }
    case "ruler-drop": { const d = Number(p.d ?? 0); return Number(p.drops) ? { anchor: { x: it.x + 26, y: it.y - 300 }, title: "Close-up · the ruler at the top of the thumb (cm)", draw: (cx, cy, r) => <ScaleZoom cx={cx} cy={cy} r={r} value={d} perUnit={30} minor={0.1} label={1} lo={0} hi={30} pointer="#C68B59" unit="cm" /> } : null; }
    default: return null;
  }
}
