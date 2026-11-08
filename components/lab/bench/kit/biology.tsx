// Biology apparatus: lamp, pondweed, bubble counter, potometer, fan, light
// microscope and the kit for making a slide.
import type { ReactNode } from "react";
import type { ItemView } from "@/lib/lab/bench/types";
import { Clamp, Stand, digits } from "@/components/lab/bench/kit/parts";

type Zoom = { anchor: { x: number; y: number }; title: string; draw: (cx: number, cy: number, r: number) => ReactNode };

export const BIOLOGY_SIZE: Record<string, [number, number]> = {
  lamp: [140, 200], pondweed: [120, 270], tally: [70, 90], "spot-tile-20": [300, 62], fan: [120, 170], potometer: [520, 440],
  microscope: [200, 380], onion: [130, 70], forceps: [24, 120], slide: [130, 12], coverslip: [30, 6],
};

const POT = { zero: -100, per: 3, y: -60 }; // potometer scale: x of 0 mm; px per mm; capillary height

export function BiologyKit({ it }: { it: ItemView; flowing?: boolean }): ReactNode | null {
  const p = it.props ?? {};
  switch (it.kind) {
    case "lamp": {
      const on = !!p.on;
      return (
        <g transform={p.flip ? "scale(-1,1)" : undefined}>
          {on && <path d="M55,-192 L300,-290 L300,-30 L55,-128 Z" fill="#FEF3C7" fillOpacity=".13" />}
          <rect x={-40} y={-10} width={80} height={10} rx={4} fill="#1F2937" />
          <rect x={-4} y={-150} width={8} height={142} fill="url(#bl-metal)" />
          <path d="M-5,-172 L-5,-148 L55,-126 L55,-194 Z" fill="#0E7490" />
          <circle cx={50} cy={-160} r={14} fill={on ? "#FEF9C3" : "#94A3B8"} />
          {on && <circle cx={50} cy={-160} r={26} fill="#FEF3C7" fillOpacity=".3" />}
        </g>
      );
    }
    case "pondweed": {
      const rate = Number(p.rate ?? 0), dur = Math.max(0.6, 240 / Math.max(1, rate));
      return (
        <g>
          {p.ruler && <g><rect x={-520} y={-8} width={520} height={8} fill="#F1E3BC" />{Array.from({ length: 51 }, (_, c) => <g key={c}><line x1={-c * 10} y1={-8} x2={-c * 10} y2={c % 5 ? -5 : -1} stroke="#5B4A26" />{c % 10 === 0 && <text x={-c * 10} y={12} textAnchor="middle" fontSize={9} fontWeight={800} fill="#E2E8F0">{c}</text>}</g>)}</g>}
          <path d="M-55,-150 V-4 Q-55,0 -51,0 H51 Q55,0 55,-4 V-150" fill="#BFDBFE" fillOpacity=".25" />
          <rect x={-53} y={-130} width={106} height={128} fill="#93C5FD" fillOpacity=".3" />
          <rect x={-14} y={-262} width={28} height={244} rx={12} fill="#DBEAFE" fillOpacity=".45" />
          {[[-6, -200], [4, -190], [-2, -170], [6, -215]].map(([x, y], k) => <path key={k} d={`M0,-40 C${x},-90 ${-x},${y + 40} ${x * 1.5},${y}`} fill="none" stroke="#16A34A" strokeWidth={3} />)}
          {[-180, -150, -120, -90, -65].map((y, k) => <ellipse key={y} cx={k % 2 ? 6 : -6} cy={y} rx={6} ry={3} fill="#22C55E" transform={`rotate(${k % 2 ? 30 : -30} ${k % 2 ? 6 : -6} ${y})`} />)}
          {rate > 0 && Array.from({ length: 4 }, (_, k) => <circle key={k} className="elab-bubble" cx={0} cy={-200} r={3} fill="#fff" fillOpacity=".9" style={{ ["--dur" as string]: `${dur}s`, ["--dx" as string]: "0px", animationDelay: `${(k * dur) / 4}s` }} />)}
          <path d="M-14,-262 V-30 a14,14 0 0 0 28,0 V-262" fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".8" strokeWidth={1.6} />
          <path d="M-55,-150 V-4 Q-55,0 -51,0 H51 Q55,0 55,-4 V-150" fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".7" strokeWidth={2} />
        </g>
      );
    }
    case "tally": return (
      <g>
        <rect x={-4} y={-90} width={8} height={14} rx={3} fill="#94A3B8" />
        <rect x={-32} y={-78} width={64} height={70} rx={20} fill="url(#bl-metal)" />
        <rect x={-24} y={-58} width={48} height={20} rx={3} fill="#0F172A" />
        <text x={0} y={-43} textAnchor="middle" fontSize={14} fontWeight={700} fontFamily="ui-monospace, monospace" fill="#F8FAFC">{String(p.count ?? 0).padStart(4, "0")}</text>
        <circle cx={0} cy={-6} r={7} fill="none" stroke="#94A3B8" strokeWidth={3} />
      </g>
    );
    case "spot-tile-20": {
      const wells = (p.wells as string[]) ?? [];
      return (
        <g>
          <path d="M-150,-10 L-130,-62 H150 L130,-10 Z" fill="#F8FAFC" />
          <rect x={-150} y={-10} width={280} height={10} rx={2} fill="#E2E8F0" />
          {wells.map((c, k) => { const row = Math.floor(k / 5), col = k % 5, y = -54 + row * 12, x = -110 + col * 55 + (row - 1.5) * -5;
            return <g key={k}><ellipse cx={x} cy={y} rx={15} ry={4.2} fill="#CBD5E1" /><ellipse cx={x} cy={y + 0.4} rx={12} ry={3.2} fill={c} /></g>; })}
        </g>
      );
    }
    case "fan": {
      const on = !!p.on;
      return (
        <g>
          <rect x={-40} y={-10} width={80} height={10} rx={4} fill="#1F2937" />
          <rect x={-5} y={-70} width={10} height={60} fill="#334155" />
          <circle cx={0} cy={-110} r={50} fill="#E2E8F0" fillOpacity=".1" stroke="#CBD5E1" strokeWidth={3} />
          <g>
            {on && <animateTransform attributeName="transform" type="rotate" from="0 0 -110" to="360 0 -110" dur="0.25s" repeatCount="indefinite" />}
            {[0, 120, 240].map((a) => <ellipse key={a} cx={0} cy={-138} rx={11} ry={26} fill="#38BDF8" transform={`rotate(${a} 0 -110)`} />)}
          </g>
          <circle cx={0} cy={-110} r={8} fill="#334155" />
          {on && [-140, -110, -80].map((y) => <path key={y} d={`M60,${y} q20,-6 40,0 t40,0`} fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth={2} />)}
        </g>
      );
    }
    case "potometer": {
      const mm = Number(p.mm ?? 0), bx = POT.zero + mm * POT.per;
      return (
        <g>
          <Stand x={-230} top={-440} base={[-260, -180]} />
          <Clamp x={-230} y={-250} x2={-150} />
          {/* shoot */}
          <path d="M-150,-280 C-148,-330 -160,-380 -150,-430" fill="none" stroke="#15803D" strokeWidth={5} />
          {[[-150, -330, -30], [-152, -360, 35], [-156, -395, -35], [-150, -425, 25], [-148, -305, 30]].map(([x, y, a], k) => <ellipse key={k} cx={x + (a > 0 ? 24 : -24)} cy={y} rx={26} ry={10} fill="#22C55E" stroke="#15803D" transform={`rotate(${a} ${x + (a > 0 ? 24 : -24)} ${y})`} />)}
          {p.bag && <path d="M-215,-270 C-230,-360 -220,-450 -150,-455 C-80,-450 -70,-360 -85,-270 Z" fill="#E0F2FE" fillOpacity=".3" stroke="#fff" strokeOpacity=".6" strokeWidth={1.5} />}
          <rect x={-160} y={-286} width={20} height={14} rx={2} fill="#7F1D1D" />
          {/* tubes full of water */}
          <rect x={-157} y={-272} width={14} height={216} fill="#BFDBFE" fillOpacity=".55" stroke="#fff" strokeOpacity=".7" />
          <rect x={-143} y={POT.y - 4} width={385} height={8} fill="#BFDBFE" fillOpacity=".55" stroke="#fff" strokeOpacity=".7" />
          <rect x={bx} y={POT.y - 3} width={10} height={6} rx={3} fill="#F8FAFC" />
          {/* reservoir with a tap */}
          <path d="M-90,-250 L-110,-210 H-70 Z" fill="#BFDBFE" fillOpacity=".5" stroke="#fff" strokeOpacity=".7" />
          <rect x={-94} y={-210} width={8} height={146} fill="#BFDBFE" fillOpacity=".55" stroke="#fff" strokeOpacity=".7" />
          <rect x={-104} y={-150} width={28} height={8} rx={3} fill="#2563EB" />
          {/* scale */}
          <rect x={POT.zero - 10} y={POT.y + 8} width={320} height={22} fill="#F8FAFC" />
          {Array.from({ length: 101 }, (_, m) => <g key={m}><line x1={POT.zero + m * POT.per} y1={POT.y + 8} x2={POT.zero + m * POT.per} y2={POT.y + 8 + (m % 10 ? (m % 5 ? 4 : 7) : 10)} stroke="#0F172A" strokeWidth={m % 10 ? 0.6 : 1.2} />{m % 10 === 0 && <text x={POT.zero + m * POT.per} y={POT.y + 27} textAnchor="middle" fontSize={8} fontWeight={800} fill="#0F172A">{m}</text>}</g>)}
          {/* beaker at the end */}
          <path d="M200,-100 V-4 Q200,0 204,0 H276 Q280,0 280,-4 V-100" fill="#BFDBFE" fillOpacity=".25" stroke="#fff" strokeOpacity=".7" strokeWidth={2} />
          <rect x={202} y={-60} width={76} height={58} fill="#93C5FD" fillOpacity=".35" />
          <path d={`M242,${POT.y} V-30`} stroke="#BFDBFE" strokeWidth={8} />
        </g>
      );
    }
    case "microscope": {
      const light = !!p.light, focus = Number(p.focus ?? 0);
      return (
        <g>
          <path d="M-90,0 L-80,-30 H70 L80,0 Z" fill="#1F2937" />
          <circle cx={0} cy={-38} r={10} fill={light ? "#FEF9C3" : "#475569"} />
          {light && <path d="M-8,-48 L-14,-150 H14 L8,-48 Z" fill="#FEF3C7" fillOpacity=".25" />}
          <path d="M-70,-30 C-110,-120 -100,-260 -40,-320 L-20,-300 C-70,-250 -80,-140 -50,-30 Z" fill="#E5E7EB" stroke="#94A3B8" />
          <rect x={-60} y={-160} width={130} height={12} rx={3} fill="#1F2937" />
          <rect x={-40} y={-170} width={6} height={10} fill="#94A3B8" /><rect x={34} y={-170} width={6} height={10} fill="#94A3B8" />
          {p.slide && <><rect x={-48} y={-168} width={96} height={6} rx={1} fill="#E0F2FE" fillOpacity=".8" stroke="#fff" /><rect x={-14} y={-170} width={28} height={3} fill={p.stained ? "#D97706" : "#FEF3C7"} /></>}
          <path d="M-20,-300 L10,-300 L4,-215 L-14,-215 Z" fill="#E5E7EB" stroke="#94A3B8" />
          <rect x={-20} y={-215} width={30} height={14} rx={3} fill="#94A3B8" />
          <rect x={-12} y={-201} width={12} height={22 + (Number(p.obj ?? 4) >= 10 ? 8 : 0)} fill="#475569" />
          <rect x={-26} y={-338} width={20} height={42} rx={3} fill="#1F2937" transform="rotate(-12 -16 -317)" />
          <g transform={`translate(-58,-230) rotate(${focus * 3.6})`}><circle r={18} fill="#334155" stroke="#94A3B8" strokeWidth={2} /><rect x={-2} y={-16} width={4} height={10} fill="#E2E8F0" /></g>
        </g>
      );
    }
    case "onion": return (
      <g>
        <path d="M-60,0 C-62,-50 -20,-66 0,-66 C20,-66 62,-50 60,0 Z" fill="#E9D5B5" stroke="#B08962" strokeWidth={2} />
        {[48, 36, 24, 12].map((w) => <path key={w} d={`M${-w},0 C${-w},${-w * 1.05} ${w},${-w * 1.05} ${w},0`} fill="none" stroke="#C9A97B" strokeWidth={1.5} />)}
        <rect x={-62} y={-4} width={124} height={4} fill="#F5EBDC" />
      </g>
    );
    case "forceps": return (
      <g>
        <path d="M-2,-118 L-9,-6 L-6,-4 L0,-110 L6,-4 L9,-6 L2,-118 Z" fill="url(#bl-metal)" stroke="#475569" strokeWidth={0.8} />
        {p.skin && <path d="M-14,-6 q14,-10 28,0 q-14,8 -28,0 Z" fill="#FEF3C7" fillOpacity=".8" />}
      </g>
    );
    case "slide": return (
      <g>
        <path d="M-62,-6 L-56,-12 H66 L60,-6 Z" fill="#E0F2FE" fillOpacity=".7" stroke="#fff" strokeOpacity=".8" />
        <rect x={-62} y={-6} width={122} height={6} fill="#BAE6FD" fillOpacity=".6" />
        {p.skin && <ellipse cx={2} cy={-9} rx={20} ry={3} fill={p.stained ? "#D97706" : "#FEF3C7"} fillOpacity=".85" />}
        {p.covered && <path d="M-20,-10 L-16,-14 H24 L20,-10 Z" fill="#F0F9FF" fillOpacity=".85" stroke="#fff" />}
      </g>
    );
    case "coverslip": return <path d="M-16,0 L-12,-5 H18 L14,0 Z" fill="#F0F9FF" fillOpacity=".85" stroke="#fff" />;
    default: return null;
  }
}

export function biologyCloseup(it: ItemView): Zoom | null {
  const p = it.props ?? {};
  switch (it.kind) {
    case "tally": return { anchor: { x: it.x, y: it.y - 48 }, title: "Close-up · the bubble counter", draw: (cx, cy) => digits(cx + 20, cy, String(p.count ?? 0), "", "#F8FAFC") };
    case "potometer": {
      const mm = Number(p.mm ?? 0);
      return { anchor: { x: it.x + POT.zero + mm * POT.per, y: it.y + POT.y }, title: "Close-up · the bubble on the scale (mm)",
        draw: (cx, cy, r) => {
          const per = 8, X = (m: number) => cx + (m - mm) * per, ticks: number[] = [];
          for (let m = Math.max(0, Math.ceil(mm - 15)); m <= Math.min(100, Math.floor(mm + 15)); m++) ticks.push(m);
          return (
            <g>
              <rect x={cx - r} y={cy - 22} width={2 * r} height={30} fill="#BFDBFE" fillOpacity=".6" stroke="#fff" />
              <rect x={X(mm)} y={cy - 18} width={36} height={22} rx={11} fill="#F8FAFC" stroke="#94A3B8" />
              <rect x={cx - r} y={cy + 14} width={2 * r} height={60} fill="#F8FAFC" />
              {ticks.map((m) => <g key={m}><line x1={X(m)} y1={cy + 14} x2={X(m)} y2={cy + 14 + (m % 10 ? (m % 5 ? 10 : 16) : 24)} stroke="#0F172A" strokeWidth={m % 10 ? 1 : 2} />{m % 10 === 0 && <text x={X(m)} y={cy + 56} textAnchor="middle" fontSize={16} fontWeight={800} fill="#0F172A">{m}</text>}</g>)}
            </g>
          );
        } };
    }
    case "microscope": {
      const obj = Number(p.obj ?? 4), n = Number(p.n ?? 10), blur = Math.min(9, Math.abs(Number(p.focus ?? 0) - Number(p.best ?? 50)) * 0.3);
      return { anchor: { x: it.x - 18, y: it.y - 330 }, title: `View through the eyepiece (×${obj * 10})`,
        draw: (cx, cy, r) => {
          if (!p.slide || !p.light) return <g><rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#020617" /><text x={cx} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="#64748B">{p.slide ? "Switch on the light" : "No slide on the stage"}</text></g>;
          const across = obj >= 10 ? n : n * 2.5, L = (2 * r) / across, Hh = L / 2.2, cells: ReactNode[] = [];
          const rows = Math.ceil(r / Hh) + 1;
          for (let row = -rows; row <= rows; row++) {
            const off = row % 2 ? L / 2 : 0, y = cy + row * Hh - Hh / 2;
            for (let k = -1; k <= across + 1; k++) {
              const x = cx - r + k * L - off;
              cells.push(<g key={`${row}:${k}`}><rect x={x + 1} y={y + 1} width={L - 2} height={Hh - 2} rx={3} fill={p.stained ? "#F2D49B" : "#F4F1E4"} stroke={row === 0 ? "#7C2D12" : p.stained ? "#A16207" : "#CBD5E1"} strokeWidth={row === 0 ? 2.4 : 1.4} />
                <circle cx={x + L * (0.3 + ((k * 7 + row * 3) % 5) * 0.08)} cy={y + Hh / 2} r={Math.max(1.5, Hh * 0.17)} fill={p.stained ? "#7C2D12" : "#D6D3D1"} /></g>);
            }
          }
          const id = `bl-mic-${Math.round(blur * 10)}`;
          return (
            <g>
              <filter id={id}><feGaussianBlur stdDeviation={blur} /></filter>
              <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#FEFCE8" />
              <g filter={blur > 0.2 ? `url(#${id})` : undefined}>{cells}</g>
              <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#0F172A" strokeWidth={1.5} strokeDasharray="6 4" />
            </g>
          );
        } };
    }
    default: return null;
  }
}
