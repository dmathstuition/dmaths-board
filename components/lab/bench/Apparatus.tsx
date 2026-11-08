// The lab room and every piece of apparatus, drawn in SVG. Each piece is drawn
// with the middle of its base at (0, 0), going up (negative y); BenchLab moves
// it into place. Bench: 1400 × 800, shelf top at y = 300, bench top at y = 640.
import type { ItemView } from "@/lib/lab/bench/types";

export const W = 1400, H = 800, SHELF_Y = 300, BENCH_Y = 640;

// Width and height of each kind (for highlights, drop targets and pouring).
const SIZE: Record<string, [number, number]> = {
  bottle: [76, 128], dropper: [54, 108], stand: [170, 600], hotspot: [60, 470], tile: [140, 12], flask: [120, 132],
  pipette: [60, 340], beaker: [100, 120], rack: [214, 150], "spot-tile": [240, 18], "water-bath": [240, 130],
  clock: [100, 70], "power-supply": [220, 120], resistor: [140, 40], slot: [110, 150], meter: [110, 150],
  wires: [0, 0], potato: [140, 68], borer: [48, 110], balance: [180, 60], towel: [180, 20], cylinders: [120, 30],
};
export function dims(it: ItemView): { w: number; h: number } {
  let [w, h] = SIZE[it.kind] ?? [100, 100];
  if (it.kind === "rack") w = ((it.props?.tubes as unknown[] | undefined)?.length ?? 4) * 46 + 30;
  if (it.kind === "tile" && it.props?.long) w = 260;
  return { w: Number(it.props?.w ?? w), h: Number(it.props?.h ?? h) };
}
// The point liquid is poured into (the mouth of the target).
export const mouth = (it: ItemView) => ({ x: it.x, y: it.y - dims(it).h });
export const hasShadow = (kind: string) => !["wires", "hotspot", "slot", "cylinders", "towel"].includes(kind);

export function BenchDefs() {
  return (
    <defs>
      <linearGradient id="bl-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2A3F6E" /><stop offset="1" stopColor="#15213F" /></linearGradient>
      <linearGradient id="bl-bench" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C9D2DF" /><stop offset="1" stopColor="#E9EDF3" /></linearGradient>
      <linearGradient id="bl-glass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset=".22" stopColor="#fff" stopOpacity=".1" />
        <stop offset=".7" stopColor="#fff" stopOpacity=".06" /><stop offset="1" stopColor="#fff" stopOpacity=".4" />
      </linearGradient>
      <linearGradient id="bl-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5B6473" /><stop offset=".45" stopColor="#E5E9EF" /><stop offset=".7" stopColor="#A3ADBB" /><stop offset="1" stopColor="#4B5563" /></linearGradient>
      <linearGradient id="bl-brass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8A6A1E" /><stop offset=".45" stopColor="#F3D77A" /><stop offset="1" stopColor="#8A6A1E" /></linearGradient>
      <linearGradient id="bl-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F4F6F9" /><stop offset="1" stopColor="#AEB8C6" /></linearGradient>
      <linearGradient id="bl-case" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EEF1F5" /><stop offset="1" stopColor="#C3CBD6" /></linearGradient>
      <radialGradient id="bl-potato" cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#E3C38E" /><stop offset="1" stopColor="#A47B45" /></radialGradient>
      <radialGradient id="bl-lamp" cx=".5" cy="0" r=".9"><stop offset="0" stopColor="#fff" stopOpacity=".16" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
    </defs>
  );
}

// The room: a wall with a shelf, and a bench with cupboards.
export function Room() {
  return (
    <g aria-hidden>
      <rect width={W} height={H} fill="url(#bl-wall)" />
      <ellipse cx={700} cy={0} rx={760} ry={420} fill="url(#bl-lamp)" />
      {Array.from({ length: 13 }, (_, i) => <line key={i} x1={i * 112 + 30} y1={0} x2={i * 112 + 30} y2={585} stroke="#fff" strokeOpacity=".035" strokeWidth={2} />)}
      <line x1={0} y1={150} x2={W} y2={150} stroke="#fff" strokeOpacity=".03" strokeWidth={2} />
      {/* shelf */}
      {[110, 700, 1290].map((x) => <path key={x} d={`M${x - 6},${SHELF_Y + 14} h12 v40 l-12,-8 z`} fill="#3B4C72" />)}
      <rect x={40} y={SHELF_Y} width={1320} height={14} rx={3} fill="#D7DEE8" />
      <rect x={40} y={SHELF_Y + 10} width={1320} height={6} fill="#8492AB" />
      {/* bench: worktop, front edge, cupboards */}
      <rect x={0} y={585} width={W} height={77} fill="url(#bl-bench)" />
      <rect x={0} y={585} width={W} height={3} fill="#AAB5C5" />
      <rect x={0} y={660} width={W} height={14} fill="#F4F6F9" />
      <rect x={0} y={674} width={W} height={126} fill="#1C2C50" />
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i}>
          <rect x={i * 200 + 10} y={684} width={180} height={116} rx={6} fill="#22355F" stroke="#fff" strokeOpacity=".06" />
          <rect x={i * 200 + 70} y={698} width={60} height={6} rx={3} fill="#94A3B8" />
        </g>
      ))}
    </g>
  );
}

const lines = (t: unknown) => String(t ?? "").split("\n");
const Glass = ({ d }: { d: string }) => (<><path d={d} fill="#E2E8F0" fillOpacity=".14" /><path d={d} fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".7" strokeWidth={2} /></>);

// One piece of apparatus.
export function Apparatus({ it, flowing }: { it: ItemView; flowing?: boolean }) {
  const p = it.props ?? {};
  switch (it.kind) {
    case "bottle": return (
      <g>
        <path d="M-36,-4 Q-36,0 -32,0 H32 Q36,0 36,-4 V-84 Q36,-98 18,-102 H14 V-114 H-14 V-102 H-18 Q-36,-98 -36,-84 Z" fill="#E2E8F0" fillOpacity=".12" />
        <path d="M-33,-3 H33 V-74 H-33 Z" fill={p.liquid} fillOpacity=".8" />
        <path d="M-33,-74 H33" stroke="#fff" strokeOpacity=".6" strokeWidth={2} />
        <path d="M-36,-4 Q-36,0 -32,0 H32 Q36,0 36,-4 V-84 Q36,-98 18,-102 H14 V-114 H-14 V-102 H-18 Q-36,-98 -36,-84 Z" fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".75" strokeWidth={2} />
        <rect x={-28} y={-66} width={56} height={42} rx={3} fill="#fff" stroke="#CBD5E1" />
        {lines(p.text).map((t, i) => <text key={i} x={0} y={-51 + i * 13} textAnchor="middle" fontSize={i ? 8.5 : 10} fontWeight={i ? 600 : 800} fill="#0F172A">{t}</text>)}
        <rect x={-27} y={-94} width={5} height={84} rx={2.5} fill="#fff" fillOpacity=".4" />
        {p.open
          ? <rect x={42} y={-14} width={30} height={14} rx={3} fill={p.cap} />
          : <><rect x={-16} y={-128} width={32} height={16} rx={3} fill={p.cap} />{[-10, -4, 2, 8].map((x) => <rect key={x} x={x} y={-126} width={2} height={12} fill="#000" fillOpacity=".2" />)}</>}
      </g>
    );
    case "dropper": return (
      <g>
        <path d="M-26,-4 Q-26,0 -22,0 H22 Q26,0 26,-4 V-56 Q26,-66 12,-68 H-12 Q-26,-66 -26,-56 Z" fill={p.amber ? "#92400E" : "#E2E8F0"} fillOpacity={p.amber ? 0.5 : 0.12} />
        <path d="M-23,-3 H23 V-50 H-23 Z" fill={p.liquid} fillOpacity=".75" />
        <path d="M-26,-4 Q-26,0 -22,0 H22 Q26,0 26,-4 V-56 Q26,-66 12,-68 H-12 Q-26,-66 -26,-56 Z" fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".7" strokeWidth={2} />
        <rect x={-20} y={-46} width={40} height={30} rx={2} fill="#fff" stroke="#CBD5E1" />
        {lines(p.text).map((t, i) => <text key={i} x={0} y={-34 + i * 10} textAnchor="middle" fontSize={7.5} fontWeight={i ? 600 : 800} fill="#0F172A">{t}</text>)}
        <rect x={-12} y={-78} width={24} height={11} rx={2} fill="#1F2937" />
        <ellipse cx={0} cy={-94} rx={9} ry={17} fill="#111827" />
        <ellipse cx={-3} cy={-99} rx={2.5} ry={7} fill="#fff" fillOpacity=".25" />
      </g>
    );
    case "stand": return <Burette p={p} flowing={flowing} />;
    case "hotspot": return null;
    case "tile": {
      const w = p.long ? 260 : 140;
      return (
        <g>
          <path d={`M${-w / 2},-12 L${-w / 2 + 10},-16 H${w / 2 + 10} L${w / 2},-12 Z`} fill="#fff" />
          <rect x={-w / 2} y={-12} width={w} height={12} rx={2} fill="#E9EEF4" stroke="#CBD5E1" />
          {p.long && <g>{Array.from({ length: 21 }, (_, i) => <line key={i} x1={-120 + i * 12} y1={-12} x2={-120 + i * 12} y2={i % 5 ? -8 : -4} stroke="#475569" strokeWidth={1} />)}</g>}
        </g>
      );
    }
    case "flask": {
      const vol = Number(p.vol ?? 0), h = vol ? Math.min(86, 8 + vol * 0.7) : 0, wh = 56 - (40 * h) / 92;
      const d = "M-58,-5 Q-60,0 -53,0 H53 Q60,0 58,-5 L16,-92 V-127 H-16 V-92 Z";
      return (
        <g>
          <path d={d} fill="#E2E8F0" fillOpacity=".12" />
          {h > 0 && <><path d={`M-55,-2 H55 L${wh},${-h} H${-wh} Z`} fill={p.colour} fillOpacity=".9" /><ellipse cx={0} cy={-h} rx={wh} ry={3} fill="#fff" fillOpacity=".45" /></>}
          <path d={d} fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".75" strokeWidth={2} />
          <rect x={-19} y={-132} width={38} height={6} rx={3} fill="#fff" fillOpacity=".55" />
          {[30, 50, 70].map((y, i) => <g key={y}><line x1={-8} y1={-y} x2={8} y2={-y} stroke="#fff" strokeOpacity=".6" /><text x={12} y={-y + 3} fontSize={7} fill="#fff" fillOpacity=".6">{(i + 1) * 50}</text></g>)}
          <path d="M-46,-12 L-12,-84" stroke="#fff" strokeOpacity=".35" strokeWidth={4} strokeLinecap="round" />
        </g>
      );
    }
    case "pipette": {
      const full = Number(p.fill ?? 0) > 0;
      return (
        <g>
          <rect x={-30} y={-10} width={60} height={10} rx={3} fill="#475569" />
          <rect x={-4} y={-120} width={8} height={110} fill="#64748B" />
          <rect x={-14} y={-124} width={28} height={8} rx={2} fill="#334155" />
          {full && <><rect x={-1.5} y={-200} width={3} height={186} fill={p.liquid} /><ellipse cx={0} cy={-165} rx={9.5} ry={36} fill={p.liquid} /><rect x={-1.5} y={-262} width={3} height={64} fill={p.liquid} /></>}
          <path d="M-1.5,-14 L-2.5,-127 Q-11,-130 -11,-165 Q-11,-200 -2.5,-203 V-300 H2.5 V-203 Q11,-200 11,-165 Q11,-130 2.5,-127 L1.5,-14 Z" fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".8" strokeWidth={1.6} />
          <line x1={-6} y1={-262} x2={6} y2={-262} stroke="#fff" strokeWidth={1.5} />
          <text x={0} y={-160} textAnchor="middle" fontSize={7} fontWeight={800} fill="#fff" fillOpacity=".8">25</text>
          <rect x={-12} y={-342} width={24} height={44} rx={11} fill="#16A34A" />
          <rect x={-5} y={-316} width={4} height={14} rx={2} fill="#fff" fillOpacity=".3" />
        </g>
      );
    }
    case "beaker": {
      const h = (Number(p.vol ?? 0) / Number(p.max ?? 250)) * 112;
      const d = "M-50,-122 Q-56,-124 -52,-118 L-48,-112 V-4 Q-48,0 -44,0 H44 Q48,0 48,-4 V-120";
      return (
        <g>
          <path d={`${d} Z`} fill="#E2E8F0" fillOpacity=".1" />
          {h > 0 && <path d={`M-46,-2 H46 V${-h} H-46 Z`} fill={p.colour} fillOpacity=".75" />}
          <path d={d} fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".75" strokeWidth={2} />
          {[25, 50, 75, 100].map((y) => <line key={y} x1={22} y1={-y} x2={40} y2={-y} stroke="#fff" strokeOpacity=".55" />)}
        </g>
      );
    }
    case "rack": {
      const tubes = (p.tubes as { label: string; level: number; colour: string }[]) ?? [];
      const w = tubes.length * 46 + 30, x0 = -w / 2 + 38;
      return (
        <g>
          <rect x={-w / 2} y={-10} width={w} height={10} rx={2} fill="#B9C3D0" />
          <rect x={-w / 2 + 4} y={-80} width={8} height={72} fill="#9AA6B6" />
          <rect x={w / 2 - 12} y={-80} width={8} height={72} fill="#9AA6B6" />
          {tubes.map((t, i) => {
            const x = x0 + i * 46, top = -150, bot = -16, lh = (bot - top) * t.level;
            return (
              <g key={i}>
                <path d={`M${x - 10},${bot - lh} V${bot - 10} a10,10 0 0 0 20,0 V${bot - lh} Z`} fill={t.colour} fillOpacity=".92" />
                {p.potato && <rect x={x - 6} y={bot - 40} width={12} height={28} rx={3} fill="#F3E3B3" stroke="#D6B76A" />}
                <path d={`M${x - 11},${top} V${bot - 10} a11,11 0 0 0 22,0 V${top}`} fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".8" strokeWidth={1.6} />
                <ellipse cx={x} cy={top} rx={11} ry={2.5} fill="none" stroke="#fff" strokeOpacity=".7" />
              </g>
            );
          })}
          <rect x={-w / 2} y={-86} width={w} height={14} rx={3} fill="#E3E8EF" />
          {tubes.map((t, i) => <text key={i} x={x0 + i * 46} y={-75} textAnchor="middle" fontSize={10} fontWeight={800} fill="#1E293B">{t.label}</text>)}
        </g>
      );
    }
    case "spot-tile": {
      const wells = (p.wells as string[]) ?? [];
      return (
        <g>
          <path d="M-120,-16 L-110,-20 H130 L120,-16 Z" fill="#fff" />
          <rect x={-120} y={-16} width={240} height={16} rx={3} fill="#E9EEF4" stroke="#CBD5E1" />
          {wells.map((c, i) => (
            <g key={i}>
              <ellipse cx={-84 + i * 56} cy={-17} rx={21} ry={6} fill="#CBD5E1" />
              <ellipse cx={-84 + i * 56} cy={-16.5} rx={17} ry={4.5} fill={c} />
              <text x={-84 + i * 56} y={-4} textAnchor="middle" fontSize={8} fontWeight={800} fill="#64748B">{"ABCD"[i]}</text>
            </g>
          ))}
        </g>
      );
    }
    case "water-bath": return (
      <g>
        <rect x={-120} y={-130} width={240} height={130} rx={8} fill="url(#bl-steel)" />
        <rect x={-108} y={-130} width={216} height={10} rx={3} fill="#60A5FA" fillOpacity=".75" />
        {Number(p.temp) > 55 && [-60, 0, 60].map((x) => <path key={x} d={`M${x},-140 q-8,-14 0,-28 q8,-14 0,-28`} fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth={3} strokeLinecap="round" />)}
      </g>
    );
    case "clock": {
      const m = Number(p.minutes ?? 0);
      return (
        <g>
          <rect x={-50} y={-70} width={100} height={70} rx={12} fill="url(#bl-case)" />
          <rect x={-40} y={-60} width={80} height={30} rx={4} fill="#0F172A" />
          <text x={0} y={-38} textAnchor="middle" fontSize={19} fontWeight={700} fontFamily="ui-monospace, monospace" fill="#FBBF24">{String(Math.floor(m)).padStart(2, "0")}:00</text>
          {[-24, 0, 24].map((x) => <rect key={x} x={x - 9} y={-22} width={18} height={10} rx={3} fill="#64748B" />)}
        </g>
      );
    }
    case "power-supply": {
      const on = !!p.on, v = Number(p.volts ?? 0);
      return (
        <g>
          <path d="M-110,-120 L-100,-128 H118 L110,-120 Z" fill="#F4F6F9" />
          <rect x={-110} y={-120} width={220} height={120} rx={8} fill="url(#bl-case)" />
          <rect x={-94} y={-106} width={92} height={38} rx={4} fill="#0B1220" />
          <text x={-10} y={-79} textAnchor="end" fontSize={22} fontWeight={700} fontFamily="ui-monospace, monospace" fill={on ? "#F87171" : "#334155"}>{on ? v.toFixed(1) : "0.0"} V</text>
          <g transform={`translate(54,-84) rotate(${(v / 6) * 270 - 135})`}>
            <circle r={22} fill="#1F2937" stroke="#94A3B8" strokeWidth={2} /><rect x={-2} y={-20} width={4} height={12} rx={2} fill="#F8FAFC" />
          </g>
          <text x={54} y={-52} textAnchor="middle" fontSize={8} fontWeight={700} fill="#475569">VOLTAGE</text>
          <rect x={-94} y={-50} width={40} height={24} rx={4} fill={on ? "#16A34A" : "#B91C1C"} />
          <text x={-74} y={-34} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">{on ? "ON" : "OFF"}</text>
          <circle cx={-40} cy={-38} r={4} fill={on ? "#4ADE80" : "#475569"} />
          <circle cx={40} cy={-30} r={9} fill="#DC2626" stroke="#7F1D1D" strokeWidth={2} />
          <circle cx={80} cy={-30} r={9} fill="#111827" stroke="#000" strokeWidth={2} />
          <text x={40} y={-10} textAnchor="middle" fontSize={10} fontWeight={800} fill="#B91C1C">+</text>
          <text x={80} y={-10} textAnchor="middle" fontSize={10} fontWeight={800} fill="#111827">−</text>
          <text x={-20} y={-10} textAnchor="middle" fontSize={8} fontWeight={700} fill="#475569">DC 0–6 V</text>
        </g>
      );
    }
    case "resistor": return (
      <g>
        <path d="M-70,-16 L-62,-22 H78 L70,-16 Z" fill="#64748B" />
        <rect x={-70} y={-16} width={140} height={16} rx={3} fill="#475569" />
        <line x1={-55} y1={-26} x2={55} y2={-26} stroke="#CBD5E1" strokeWidth={2.5} />
        <rect x={-26} y={-35} width={52} height={18} rx={8} fill="#D9C59D" />
        {[["-16", "#7C2D12"], ["-6", "#111827"], ["4", "#EA580C"], ["16", "#CA8A04"]].map(([x, c]) => <rect key={x} x={Number(x)} y={-35} width={5} height={18} fill={c} />)}
        {[-55, 55].map((x) => <g key={x}><rect x={x - 7} y={-30} width={14} height={14} rx={3} fill="url(#bl-brass)" /><circle cx={x} cy={-30} r={5} fill="#B08A2E" /></g>)}
      </g>
    );
    case "slot": return p.show ? (
      <g>
        <rect x={-55} y={-150} width={110} height={150} rx={14} fill="#fff" fillOpacity=".05" stroke="#fff" strokeOpacity=".5" strokeWidth={2} strokeDasharray="9 7" />
        <text x={0} y={-68} textAnchor="middle" fontSize={34} fontWeight={800} fill="#fff" fillOpacity=".45">{p.label}</text>
        <text x={0} y={-40} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff" fillOpacity=".5">{p.label === "A" ? "ammeter here" : "voltmeter here"}</text>
      </g>
    ) : null;
    case "meter": {
      const on = !!p.on;
      return (
        <g>
          <rect x={-55} y={-150} width={110} height={150} rx={14} fill="#F2B705" />
          <rect x={-45} y={-140} width={90} height={128} rx={9} fill="#1F2937" />
          <rect x={-38} y={-133} width={76} height={34} rx={3} fill={on ? "#C9D8B6" : "#7B8577"} />
          <text x={34} y={-108} textAnchor="end" fontSize={18} fontWeight={700} fontFamily="ui-monospace, monospace" fill="#111827">{on ? p.reading : ""}</text>
          <text x={-34} y={-123} fontSize={8} fontWeight={800} fill="#111827" fillOpacity=".7">{on ? p.unit : ""}</text>
          <g transform={`translate(0,-66) rotate(${p.unit === "A" ? -30 : 30})`}><circle r={19} fill="#111827" stroke="#94A3B8" strokeWidth={2} /><rect x={-2} y={-17} width={4} height={11} rx={2} fill="#F8FAFC" /></g>
          <text x={0} y={-30} textAnchor="middle" fontSize={15} fontWeight={900} fill="#fff">{p.unit}</text>
          <circle cx={-20} cy={-17} r={5.5} fill="#111827" stroke="#9CA3AF" />
          <circle cx={20} cy={-17} r={5.5} fill="#DC2626" stroke="#FCA5A5" />
        </g>
      );
    }
    case "wires": return <Wires p={p} />;
    case "potato": return (
      <g>
        <ellipse cx={0} cy={-32} rx={70} ry={33} fill="url(#bl-potato)" />
        {[[-30, -42], [12, -24], [36, -46], [-8, -54]].map(([x, y]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx={4} ry={2.5} fill="#7C5A2E" fillOpacity=".7" />)}
      </g>
    );
    case "borer": return (
      <g>
        <rect x={-6} y={-98} width={12} height={98} rx={2} fill="url(#bl-brass)" />
        <rect x={-24} y={-110} width={48} height={14} rx={7} fill="#7C4A1E" />
        <ellipse cx={0} cy={0} rx={6} ry={2} fill="#4B3A12" />
      </g>
    );
    case "balance": {
      const r = Number(p.reading ?? 0);
      return (
        <g>
          <path d="M-90,-50 L-80,-56 H98 L90,-50 Z" fill="#F4F6F9" />
          <rect x={-90} y={-50} width={180} height={50} rx={8} fill="url(#bl-case)" />
          <rect x={-74} y={-40} width={92} height={26} rx={3} fill="#0B1220" />
          <text x={12} y={-21} textAnchor="end" fontSize={16} fontWeight={700} fontFamily="ui-monospace, monospace" fill="#34D399">{r.toFixed(2)} g</text>
          <rect x={34} y={-36} width={36} height={16} rx={4} fill="#64748B" /><text x={52} y={-25} textAnchor="middle" fontSize={8} fontWeight={800} fill="#fff">TARE</text>
          <rect x={-8} y={-62} width={16} height={8} fill="#94A3B8" />
          <rect x={-64} y={-68} width={128} height={7} rx={3.5} fill="url(#bl-metal)" />
        </g>
      );
    }
    case "towel": return (
      <g>
        <path d="M-90,-2 L-70,-18 H90 L70,-2 Z" fill="#F8FAFC" stroke="#E2E8F0" />
        {Array.from({ length: 6 }, (_, i) => <line key={i} x1={-60 + i * 26} y1={-15} x2={-74 + i * 26} y2={-4} stroke="#E2E8F0" />)}
      </g>
    );
    case "cylinders": return (
      <g>
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i} transform={`translate(${-48 + i * 24},0)`}>
            <rect x={-7} y={-30} width={14} height={30} rx={3} fill="#F3E3B3" stroke="#D6B76A" />
            <ellipse cx={0} cy={-30} rx={7} ry={2.4} fill="#FAF0CF" stroke="#D6B76A" />
          </g>
        ))}
      </g>
    );
    default: return <rect x={-40} y={-60} width={80} height={60} rx={8} fill="#94A3B8" />;
  }
}

// What stands in front of the things put inside it (the water bath's front).
export function Front({ it }: { it: ItemView }) {
  if (it.kind !== "water-bath") return null;
  const t = Number(it.props?.temp ?? 20);
  return (
    <g>
      <rect x={-120} y={-96} width={240} height={96} rx={8} fill="url(#bl-steel)" />
      <rect x={-120} y={-96} width={240} height={4} fill="#fff" fillOpacity=".6" />
      <rect x={-102} y={-82} width={84} height={32} rx={4} fill="#0B1220" />
      <text x={-24} y={-59} textAnchor="end" fontSize={18} fontWeight={700} fontFamily="ui-monospace, monospace" fill={it.props?.on ? "#34D399" : "#334155"}>{t.toFixed(0)} °C</text>
      <circle cx={-6} cy={-66} r={4} fill={it.props?.on ? "#22C55E" : "#475569"} />
      <g transform={`translate(66,-58) rotate(${((t - 20) / 80) * 270 - 135})`}><circle r={20} fill="#1F2937" stroke="#94A3B8" strokeWidth={2} /><rect x={-2} y={-18} width={4} height={11} rx={2} fill="#F8FAFC" /></g>
      <text x={-60} y={-24} textAnchor="middle" fontSize={9} fontWeight={800} fill="#475569">WATER BATH</text>
    </g>
  );
}

// Burette scale: 0 at the top, 50 cm³ near the tap.
export const BURETTE = { x: 30, top: -590, y0: -570, y50: -210, tip: -120 };
export const buretteY = (v: number) => BURETTE.y0 + ((BURETTE.y50 - BURETTE.y0) * v) / 50;

function Burette({ p, flowing }: { p: Record<string, any>; flowing?: boolean }) {
  const bx = BURETTE.x, level = p.level as number | null;
  const ly = level == null ? null : buretteY(level);
  return (
    <g>
      {/* retort stand */}
      <rect x={-82} y={-12} width={164} height={12} rx={3} fill="#334155" />
      <rect x={-82} y={-12} width={164} height={3} fill="#475569" />
      <rect x={-64} y={-600} width={9} height={590} rx={3} fill="url(#bl-metal)" />
      <rect x={-70} y={-482} width={22} height={18} rx={3} fill="#475569" />
      <rect x={-50} y={-477} width={bx + 40} height={8} rx={3} fill="url(#bl-metal)" />
      <rect x={bx - 14} y={-486} width={28} height={26} rx={4} fill="#64748B" />
      {/* burette */}
      {ly != null && <>
        <rect x={bx - 7.5} y={ly} width={15} height={-176 - ly} fill={p.liquid} fillOpacity=".85" />
        <path d={`M${bx - 7.5},${ly - 3} Q${bx},${ly + 4} ${bx + 7.5},${ly - 3}`} fill="none" stroke="#1E3A8A" strokeOpacity=".55" strokeWidth={1.5} />
        <path d={`M${bx - 2},-150 L${bx - 1},${BURETTE.tip} H${bx + 1} L${bx + 2},-150 Z`} fill={p.liquid} />
      </>}
      <path d={`M${bx - 9},${BURETTE.top} V-176 L${bx - 4},-168 H${bx + 4} L${bx + 9},-176 V${BURETTE.top}`} fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".85" strokeWidth={1.6} />
      <ellipse cx={bx} cy={BURETTE.top} rx={9} ry={2.2} fill="none" stroke="#fff" strokeOpacity=".8" />
      {Array.from({ length: 51 }, (_, v) => {
        const y = buretteY(v);
        return <g key={v}><line x1={bx - 9} y1={y} x2={bx - 9 + (v % 5 ? 4 : v % 10 ? 7 : 10)} y2={y} stroke="#fff" strokeOpacity=".8" strokeWidth={1} />
          {v % 10 === 0 && <text x={bx - 13} y={y + 3} textAnchor="end" fontSize={10} fontWeight={700} fill="#E2E8F0">{v}</text>}</g>;
      })}
      {/* tap and jet */}
      <rect x={bx - 8} y={-168} width={16} height={16} rx={3} fill="#E2E8F0" />
      <g transform={`translate(${bx},-160) rotate(${flowing ? 90 : 0})`}><rect x={-3} y={-4} width={30} height={8} rx={4} fill="#2563EB" /></g>
      <path d={`M${bx - 3},-152 L${bx - 1.5},${BURETTE.tip} H${bx + 1.5} L${bx + 3},-152 Z`} fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".8" />
      {flowing && level != null && [0, 0.2, 0.4].map((d) => <circle key={d} className="elab-drip" cx={bx} cy={BURETTE.tip + 4} r={2.6} fill={p.liquid} style={{ animationDelay: `${d}s`, animationIterationCount: "infinite" }} />)}
    </g>
  );
}

// The circuit's leads, between the power supply (x 260), the ammeter's place
// (x 520), the resistor (x 760) and the voltmeter's place (x 1040).
function Wires({ p }: { p: Record<string, any> }) {
  const B = BENCH_Y;
  const lead = (d: string, c: string, k: string) => <g key={k}><path d={d} fill="none" stroke={c} strokeWidth={5} strokeLinecap="round" /><path d={d} fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth={1.4} strokeLinecap="round" /></g>;
  const clip = (x: number, y: number, c: string, k: string) => <g key={k}><rect x={x - 8} y={y - 4} width={16} height={8} rx={2} fill={c} /><rect x={x + 6} y={y - 2} width={8} height={4} fill="#CBD5E1" /></g>;
  const curve = (x1: number, y1: number, x2: number, y2: number, sag = 30) => `M${x1},${y1} C${x1},${y1 + sag} ${x2},${y2 + sag} ${x2},${y2}`;
  const psuPlus = [300, B - 30], psuMinus = [340, B - 30], aL = [500, B - 17], aR = [540, B - 17], rL = [705, B - 30], rR = [815, B - 30], vL = [1020, B - 17], vR = [1060, B - 17];
  const series = [curve(psuPlus[0], psuPlus[1], aL[0], aL[1], 40), curve(aR[0], aR[1], rL[0], rL[1], 30), curve(rR[0], rR[1], psuMinus[0], psuMinus[1], 22)];
  return (
    <g>
      {lead(series[0], "#DC2626", "a")}
      {p.ammeter ? lead(series[1], "#DC2626", "b") : <>{lead(curve(aR[0] - 40, B - 6, rL[0], rL[1], 20), "#DC2626", "b")}{clip(aR[0] - 40, B - 6, "#DC2626", "bc")}</>}
      {lead(series[2], "#111827", "c")}
      {p.voltmeter
        ? <>{lead(curve(rL[0], rL[1], vR[0], vR[1], 18), "#DC2626", "v1")}{lead(curve(rR[0], rR[1], vL[0], vL[1], 10), "#111827", "v2")}</>
        : <>{lead(curve(rL[0], rL[1], 960, B - 4, 16), "#DC2626", "v1")}{clip(960, B - 4, "#DC2626", "v1c")}{lead(curve(rR[0], rR[1], 990, B + 2, 8), "#111827", "v2")}{clip(990, B + 2, "#111827", "v2c")}</>}
      {p.on && p.ammeter && series.map((d, i) => <path key={i} d={d} className="elab-flow" fill="none" stroke="#FDE047" strokeOpacity=".75" strokeWidth={2} strokeDasharray="4 10" />)}
    </g>
  );
}

// A close-up of the burette scale around the liquid level, for reading it.
export function Magnifier({ level, liquid, at }: { level: number; liquid: string; at: { x: number; y: number } }) {
  const cx = 1020, cy = 175, r = 115, k = 44; // 44 px per cm³ (six times the burette)
  const y = (v: number) => cy + (v - level) * k;
  const marks: number[] = [];
  for (let t = Math.max(0, Math.ceil((level - 3) * 10)); t <= Math.min(500, Math.floor((level + 3) * 10)); t++) marks.push(t / 10);
  const x0 = cx - 34, x1 = cx + 34, ly = y(level);
  return (
    <g aria-label={`Close-up of the burette`}>
      <line x1={cx - r * 0.95} y1={cy + r * 0.3} x2={at.x} y2={at.y} stroke="#fff" strokeOpacity=".35" strokeWidth={2} strokeDasharray="5 5" />
      <circle cx={at.x} cy={at.y} r={12} fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth={2} />
      <clipPath id="bl-mag"><circle cx={cx} cy={cy} r={r} /></clipPath>
      <circle cx={cx} cy={cy} r={r + 6} fill="#0B1220" stroke="#E2E8F0" strokeWidth={4} />
      <g clipPath="url(#bl-mag)">
        <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#22355F" />
        <path d={`M${x0},${ly - 12} Q${cx},${ly + 12} ${x1},${ly - 12} V${cy + r} H${x0} Z`} fill={liquid} fillOpacity=".85" />
        <path d={`M${x0},${ly - 12} Q${cx},${ly + 12} ${x1},${ly - 12}`} fill="none" stroke="#1E3A8A" strokeWidth={2.5} />
        <rect x={x0} y={cy - r} width={x1 - x0} height={2 * r} fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".9" strokeWidth={2} />
        {marks.map((v) => {
          const whole = Math.abs(v - Math.round(v)) < 1e-6, half = Math.abs(v * 2 - Math.round(v * 2)) < 1e-6;
          return <g key={v}>
            <line x1={x0} y1={y(v)} x2={x0 + (whole ? 30 : half ? 20 : 11)} y2={y(v)} stroke="#fff" strokeWidth={whole ? 2 : 1.2} />
            {whole && <text x={x0 - 8} y={y(v) + 6} textAnchor="end" fontSize={17} fontWeight={800} fill="#fff">{Math.round(v)}</text>}
          </g>;
        })}
      </g>
      <text x={cx} y={cy - r - 14} textAnchor="middle" fontSize={14} fontWeight={800} fill="#fff">Close-up · read the bottom of the meniscus</text>
    </g>
  );
}
