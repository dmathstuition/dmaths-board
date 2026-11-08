// Physics apparatus: pendulum, spring, measuring cylinder, metre rule on a
// pivot, ray box, optical bench, hotplate, aluminium block, drop rig, ripple tank…
import type { ReactNode } from "react";
import type { ItemView } from "@/lib/lab/bench/types";
import { Clamp, Lead, ScaleZoom, Stand, Thermo, digits, thermoY } from "@/components/lab/bench/kit/parts";

type Zoom = { anchor: { x: number; y: number }; title: string; draw: (cx: number, cy: number, r: number) => ReactNode };
const R = (d: number) => (d * Math.PI) / 180;

export const PHYSICS_SIZE: Record<string, [number, number]> = {
  pendulum: [220, 600], stopwatch: [100, 110], "spring-stand": [220, 580], masses: [70, 80], "measuring-cylinder": [80, 345],
  stone: [60, 40], beam: [860, 230], "mass-hanger": [50, 120], "ray-sheet": [640, 330], "optical-bench": [920, 250],
  heating: [240, 380], thermometer: [30, 310], "metal-block": [150, 180], heater: [40, 160], joulemeter: [170, 100],
  "drop-rig": [200, 600], ball: [26, 26], timer: [180, 90], "ripple-tank": [560, 480], "signal-gen": [200, 100],
};

const PEND = { x: 40, y: -552, px: 420 }; // pivot (split cork); 420 px per metre
const SPRING = { top: -550, perCm: 10, rule: 49 };
const CYL = { zero: -20, per: 3 };
const PIVOT = -200;
const TANK = { x0: -230, perCm: 520 / 30 };
const bench = (u: number) => -450 + u * 9; // optical bench: cm mark → x
export const fmtWatch = (t: number) => (t < 60 ? t.toFixed(2) : `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`);

export function PhysicsKit({ it }: { it: ItemView }): ReactNode | null {
  const p = it.props ?? {};
  switch (it.kind) {
    case "pendulum": {
      const L = Number(p.L ?? 0.5) * PEND.px, period = Number(p.period ?? 1.4);
      return (
        <g>
          <Stand x={-40} top={-600} base={[-80, 110]} />
          <Clamp x={-40} y={PEND.y - 8} x2={PEND.x} />
          {/* metre rule hanging beside the string */}
          <rect x={60} y={PEND.y} width={16} height={PEND.px} fill="#F1E3BC" stroke="#C8B07A" />
          {Array.from({ length: 21 }, (_, k) => <g key={k}><line x1={60} y1={PEND.y + k * 21} x2={k % 2 ? 66 : 70} y2={PEND.y + k * 21} stroke="#5B4A26" />{k % 2 === 0 && <text x={78} y={PEND.y + k * 21 + 3} fontSize={8} fontWeight={700} fill="#E2E8F0">{(k * 5) / 100}</text>}</g>)}
          <g>
            {p.swinging && <animateTransform attributeName="transform" type="rotate" values={`-7 ${PEND.x} ${PEND.y};7 ${PEND.x} ${PEND.y};-7 ${PEND.x} ${PEND.y}`} keyTimes="0;0.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" dur={`${Math.max(0.25, period / 5)}s`} repeatCount="indefinite" />}
            <line x1={PEND.x} y1={PEND.y} x2={PEND.x} y2={PEND.y + L - 12} stroke="#E2E8F0" strokeWidth={1.4} />
            <circle cx={PEND.x} cy={PEND.y + L} r={13} fill="url(#bl-metal)" stroke="#334155" />
          </g>
        </g>
      );
    }
    case "stopwatch": return (
      <g>
        <rect x={-8} y={-110} width={16} height={12} rx={3} fill="#94A3B8" />
        <circle cx={0} cy={-52} r={48} fill="#1F2937" stroke="#94A3B8" strokeWidth={3} />
        <rect x={-38} y={-68} width={76} height={28} rx={4} fill="#C9D8B6" />
        <text x={33} y={-47} textAnchor="end" fontSize={17} fontWeight={700} fontFamily="ui-monospace, monospace" fill="#111827">{fmtWatch(Number(p.t ?? 0))}</text>
        {[-20, 20].map((x) => <circle key={x} cx={x} cy={-22} r={7} fill="#475569" />)}
      </g>
    );
    case "spring-stand": {
      const yp = SPRING.top + Number(p.pos ?? 10) * SPRING.perCm, n = Number(p.n ?? 0), coils = 16, top = SPRING.top + 6;
      const zig = Array.from({ length: coils + 1 }, (_, k) => `${k ? "L" : "M"}${k === 0 || k === coils ? 0 : k % 2 ? -9 : 9},${top + ((yp - 8 - top) * k) / coils}`).join(" ");
      return (
        <g>
          <Stand x={-70} top={-600} base={[-100, 90]} />
          <Clamp x={-70} y={SPRING.top - 12} x2={0} />
          <rect x={SPRING.rule - 9} y={SPRING.top} width={18} height={450} fill="#F1E3BC" stroke="#C8B07A" />
          {Array.from({ length: 46 }, (_, c) => <g key={c}><line x1={SPRING.rule - 9} y1={SPRING.top + c * 10} x2={SPRING.rule - 9 + (c % 5 ? 5 : 9)} y2={SPRING.top + c * 10} stroke="#5B4A26" />{c % 5 === 0 && <text x={SPRING.rule + 12} y={SPRING.top + c * 10 + 3} fontSize={9} fontWeight={700} fill="#E2E8F0">{c}</text>}</g>)}
          <path d={zig} fill="none" stroke="#CBD5E1" strokeWidth={3} strokeLinejoin="round" />
          <line x1={0} y1={yp - 8} x2={0} y2={yp + 22} stroke="#94A3B8" strokeWidth={3} />
          <line x1={0} y1={yp} x2={SPRING.rule - 9} y2={yp} stroke="#DC2626" strokeWidth={2.5} />
          {Array.from({ length: n }, (_, k) => <g key={k}><rect x={-20} y={yp + 22 + k * 11} width={40} height={10} rx={2} fill="url(#bl-brass)" /></g>)}
          <rect x={-22} y={yp + 22 + n * 11} width={44} height={5} rx={2} fill="#64748B" />
        </g>
      );
    }
    case "masses": return (
      <g>
        <rect x={-30} y={-8} width={60} height={8} rx={2} fill="#475569" />
        {Array.from({ length: Number(p.left ?? 0) }, (_, k) => <g key={k}><rect x={-22} y={-20 - k * 12} width={44} height={11} rx={2} fill="url(#bl-brass)" /><rect x={-2} y={-20 - k * 12} width={4} height={6} fill="#5B4A26" /></g>)}
        {Number(p.left ?? 0) > 0 && <text x={0} y={-24 - Number(p.left ?? 0) * 12} textAnchor="middle" fontSize={10} fontWeight={800} fill="#fff">1 N each</text>}
      </g>
    );
    case "measuring-cylinder": {
      const vol = Number(p.vol ?? 0), ly = CYL.zero - vol * CYL.per;
      return (
        <g>
          <path d="M-40,0 L-34,-10 H34 L40,0 Z" fill="#CBD5E1" fillOpacity=".7" />
          {vol > 0 && <><rect x={-21} y={ly} width={42} height={-10 - ly} fill={p.liquid ?? "#BFDBFE"} fillOpacity=".75" /><path d={`M-21,${ly - 3} Q0,${ly + 4} 21,${ly - 3}`} fill="none" stroke="#1E3A8A" strokeOpacity=".5" strokeWidth={1.5} /></>}
          {p.stone && <path d="M-14,-12 L-16,-26 L-4,-36 L10,-32 L16,-18 L8,-11 Z" fill="#6B7280" stroke="#374151" />}
          <path d="M-24,-10 V-338 Q-24,-344 -30,-346 H24 V-10" fill="url(#bl-glass)" stroke="#fff" strokeOpacity=".85" strokeWidth={2} />
          {Array.from({ length: 101 }, (_, v) => { const y = CYL.zero - v * CYL.per; return <g key={v}><line x1={-24} y1={y} x2={-24 + (v % 10 ? (v % 5 ? 5 : 8) : 13)} y2={y} stroke="#fff" strokeOpacity=".75" strokeWidth={v % 10 ? 0.8 : 1.4} />{v % 10 === 0 && v > 0 && <text x={-8} y={y + 3} fontSize={8} fontWeight={700} fill="#fff">{v}</text>}</g>; })}
          <text x={0} y={-330} textAnchor="middle" fontSize={8} fontWeight={800} fill="#fff" fillOpacity=".8">cm³</text>
        </g>
      );
    }
    case "stone": return (
      <g>
        <line x1={0} y1={-34} x2={0} y2={-80} stroke="#E2E8F0" strokeWidth={1.2} />
        <path d="M-26,-4 L-30,-22 L-12,-38 L14,-34 L28,-18 L20,-2 Z" fill="#6B7280" stroke="#374151" strokeWidth={2} />
        <path d="M-18,-24 L-6,-32 L8,-28" fill="none" stroke="#9CA3AF" strokeWidth={2} />
      </g>
    );
    case "beam": return (
      <g>
        <rect x={-40} y={PIVOT + 30} width={80} height={-PIVOT - 30} rx={4} fill="#8B5E34" />
        <path d={`M-22,${PIVOT + 30} L0,${PIVOT} L22,${PIVOT + 30} Z`} fill="url(#bl-metal)" />
        <g style={{ transform: `rotate(${Number(p.tilt ?? 0)}deg)`, transformBox: "fill-box", transformOrigin: "50% 100%", transition: "transform .6s cubic-bezier(.3,1.4,.5,1)" }}>
          <rect x={-400} y={PIVOT - 22} width={800} height={22} fill="#F1E3BC" stroke="#C8B07A" />
          {Array.from({ length: 101 }, (_, c) => <g key={c}><line x1={-400 + c * 8} y1={PIVOT - 22} x2={-400 + c * 8} y2={PIVOT - 22 + (c % 10 ? (c % 5 ? 4 : 7) : 10)} stroke="#5B4A26" strokeWidth={c % 10 ? 0.8 : 1.3} />{c % 10 === 0 && <text x={-400 + c * 8} y={PIVOT - 4} textAnchor="middle" fontSize={8} fontWeight={800} fill="#3F3216">{c}</text>}</g>)}
        </g>
      </g>
    );
    case "mass-hanger": {
      const n = p.big ? 3 : 2, w = p.big ? 40 : 32;
      return (
        <g>
          <circle cx={0} cy={-116} r={5} fill="none" stroke="#CBD5E1" strokeWidth={2} />
          <line x1={0} y1={-111} x2={0} y2={-4 - n * 12} stroke="#CBD5E1" strokeWidth={2} />
          {Array.from({ length: n }, (_, k) => <rect key={k} x={-w / 2} y={-14 - k * 12} width={w} height={11} rx={2} fill={p.big ? "url(#bl-metal)" : "url(#bl-brass)"} />)}
          <rect x={-w / 2 - 2} y={-4} width={w + 4} height={4} rx={2} fill="#475569" />
          <text x={0} y={-20 - n * 12} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff">{p.text}</text>
        </g>
      );
    }
    case "ray-sheet": {
      const P = { x: 0, y: -190 }, on = !!p.on, i = Number(p.i ?? 10), n = Number(p.n ?? 1.5);
      const r = Math.asin(Math.sin(R(i)) / n), S = { x: P.x - 120 * Math.sin(R(i)), y: P.y - 120 * Math.cos(R(i)) };
      const E = { x: P.x + (110 / Math.cos(r)) * Math.sin(r), y: P.y + 110 };
      return (
        <g>
          <rect x={-320} y={-330} width={640} height={330} rx={4} fill="#FBFBF7" />
          <rect x={-130} y={-190} width={260} height={110} fill="#BFE3F2" fillOpacity=".55" stroke="#475569" strokeWidth={1.5} />
          <line x1={P.x} y1={-325} x2={P.x} y2={-10} stroke="#334155" strokeDasharray="6 5" strokeWidth={1.2} />
          <text x={P.x + 6} y={-318} fontSize={10} fill="#334155">normal</text>
          {Array.from({ length: 36 }, (_, k) => { const a = R(k * 10); return <line key={k} x1={P.x + 54 * Math.sin(a)} y1={P.y + 54 * Math.cos(a)} x2={P.x + 60 * Math.sin(a)} y2={P.y + 60 * Math.cos(a)} stroke="#94A3B8" />; })}
          {on && <>
            <line x1={S.x} y1={S.y} x2={P.x} y2={P.y} stroke="#F59E0B" strokeWidth={3.5} />
            <line x1={P.x} y1={P.y} x2={E.x} y2={E.y} stroke="#F59E0B" strokeWidth={3.5} />
            <line x1={E.x} y1={E.y} x2={E.x + 70 * Math.sin(R(i))} y2={E.y + 70 * Math.cos(R(i))} stroke="#F59E0B" strokeWidth={3.5} />
          </>}
          <g transform={`translate(${S.x},${S.y}) rotate(${-i})`}>
            <rect x={-20} y={-44} width={40} height={50} rx={5} fill="#1F2937" />
            <rect x={-6} y={4} width={12} height={4} fill={on ? "#FDE68A" : "#475569"} />
          </g>
          <text x={-310} y={-12} fontSize={11} fontWeight={700} fill="#64748B">i = {on ? `${i}°` : "—"}</text>
        </g>
      );
    }
    case "optical-bench": {
      const u = Number(p.u ?? 50), s = Number(p.s ?? 95), f = Number(p.f ?? 12), on = !!p.on, cy = -150;
      const xu = bench(u), xs = bench(s), sharp = u + (u * f) / (u - f), blur = Math.min(10, Math.abs(s - sharp) * 1.3);
      return (
        <g>
          <rect x={-460} y={-16} width={920} height={16} fill="#F1E3BC" stroke="#C8B07A" />
          {Array.from({ length: 101 }, (_, c) => <g key={c}><line x1={bench(c)} y1={-16} x2={bench(c)} y2={-16 + (c % 10 ? (c % 5 ? 4 : 7) : 10)} stroke="#5B4A26" />{c % 10 === 0 && <text x={bench(c)} y={-2} textAnchor="middle" fontSize={8} fontWeight={800} fill="#3F3216">{c}</text>}</g>)}
          {/* lamp box with the object */}
          <rect x={-520} y={-210} width={70} height={130} rx={6} fill="#334155" />
          <rect x={-454} y={-170} width={6} height={40} fill={on ? "#FEF3C7" : "#64748B"} />
          {on && <path d={`M${-450},${cy - 20} L${xu},${cy - 50} L${xu},${cy + 50} L${-450},${cy + 20} Z M${xu},${cy - 50} L${xs},${cy} L${xu},${cy + 50} Z`} fill="#FDE68A" fillOpacity=".12" />}
          <rect x={-500} y={-80} width={30} height={64} fill="#475569" />
          {/* lens */}
          <rect x={xu - 3} y={-100} width={6} height={84} fill="#64748B" />
          <ellipse cx={xu} cy={cy} rx={8} ry={56} fill="#BFE3F2" fillOpacity=".45" stroke="#fff" strokeOpacity=".9" strokeWidth={1.5} />
          {/* screen */}
          <rect x={xs - 3} y={-80} width={6} height={64} fill="#64748B" />
          <rect x={xs - 34} y={cy - 85} width={68} height={160} rx={3} fill="#F8FAFC" stroke="#CBD5E1" />
          {on && <ImageF x={xs} y={cy} size={Math.min(70, 26 * (sharp - u) / u)} blur={blur} id={`ob${Math.round(blur * 10)}`} />}
        </g>
      );
    }
    case "heating": {
      const T = Number(p.T ?? 0), on = !!p.on, min = Number(p.min ?? 0), a = -Number(p.T0 ?? -8) / 4, melt = Number(p.melt ?? 6);
      const ice = T < 0 ? 1 : T === 0 && min < a + melt ? Math.max(0, 1 - (min - a) / melt) : 0, boiling = T >= 100;
      return (
        <g>
          <Stand x={110} top={-370} base={[60, 140]} />
          <Clamp x={110} y={-300} x2={0} />
          <rect x={-90} y={-40} width={180} height={40} rx={5} fill="url(#bl-case)" />
          <rect x={-70} y={-46} width={140} height={6} rx={2} fill={on ? "#EF4444" : "#64748B"} />
          <circle cx={60} cy={-20} r={9} fill="#1F2937" stroke="#94A3B8" />
          <circle cx={-60} cy={-20} r={4} fill={on ? "#22C55E" : "#475569"} />
          <path d="M-62,-46 V-190 H62 V-46 Z" fill="#E2E8F0" fillOpacity=".1" />
          <rect x={-58} y={-140} width={116} height={92} fill="#BFDBFE" fillOpacity={0.35 + 0.35 * (1 - ice)} />
          {Array.from({ length: Math.round(10 * ice) }, (_, k) => <rect key={k} x={-52 + (k % 5) * 21} y={-138 + Math.floor(k / 5) * 22} width={18} height={18} rx={4} fill="#fff" fillOpacity=".75" stroke="#BAE6FD" />)}
          {boiling && Array.from({ length: 8 }, (_, k) => <circle key={k} className="elab-bubble" cx={-45 + k * 13} cy={-52} r={3 + (k % 3)} fill="#fff" fillOpacity=".8" style={{ ["--dur" as string]: `${0.7 + (k % 4) * 0.2}s`, ["--dx" as string]: "0px", animationDelay: `${k * 0.15}s` }} />)}
          {boiling && [-30, 10, 40].map((x) => <path key={x} d={`M${x},-200 q-8,-16 0,-32 q8,-16 0,-32`} fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth={3} strokeLinecap="round" />)}
          <path d="M-62,-190 V-46 M62,-46 V-190" stroke="#fff" strokeOpacity=".8" strokeWidth={2} />
          <Thermo x={0} bulbY={-62} top={-340} T={T} />
        </g>
      );
    }
    case "thermometer": return <g><rect x={-12} y={-8} width={24} height={8} rx={2} fill="#475569" /><Thermo x={0} bulbY={-22} top={-300} T={Number(p.T ?? 20)} /></g>;
    case "metal-block": return (
      <g>
        <rect x={-72} y={-160} width={144} height={160} rx={6} fill="url(#bl-metal)" />
        <ellipse cx={0} cy={-160} rx={72} ry={14} fill="#E5E9EF" stroke="#94A3B8" />
        <ellipse cx={-26} cy={-160} rx={11} ry={4} fill="#1F2937" />
        <ellipse cx={30} cy={-160} rx={5} ry={2.5} fill="#1F2937" />
        {p.heater && <g><rect x={-33} y={-232} width={14} height={74} fill="#1F2937" /><Lead x1={-26} y1={-232} x2={340} y2={-30} c="#DC2626" sag={-60} /><Lead x1={-24} y1={-232} x2={380} y2={-30} c="#111827" sag={-40} /></g>}
        {p.thermo && <Thermo x={30} bulbY={-140} top={-420} T={Number(p.T ?? 20)} />}
        {p.on && <circle cx={-26} cy={-240} r={4} fill="#F87171" />}
      </g>
    );
    case "heater": return (
      <g>
        <rect x={-7} y={-112} width={14} height={112} rx={3} fill="url(#bl-metal)" />
        <rect x={-11} y={-150} width={22} height={40} rx={3} fill="#1F2937" />
        <path d="M-4,-150 C-4,-175 20,-170 18,-150 M4,-150 C6,-180 30,-176 26,-150" fill="none" stroke="#DC2626" strokeWidth={3} />
      </g>
    );
    case "joulemeter": return (
      <g>
        <rect x={-85} y={-100} width={170} height={100} rx={8} fill="url(#bl-case)" />
        <rect x={-72} y={-86} width={144} height={36} rx={4} fill="#0B1220" />
        <text x={50} y={-60} textAnchor="end" fontSize={20} fontWeight={700} fontFamily="ui-monospace, monospace" fill={p.on ? "#F87171" : "#FCA5A5"}>{String(p.J ?? 0)}</text>
        <text x={56} y={-60} fontSize={12} fontWeight={800} fill="#FCA5A5">J</text>
        <text x={0} y={-30} textAnchor="middle" fontSize={9} fontWeight={800} fill="#475569">JOULEMETER</text>
        {[-50, -20, 20, 50].map((x, k) => <circle key={x} cx={x} cy={-14} r={6} fill={k % 2 ? "#111827" : "#DC2626"} />)}
      </g>
    );
    case "drop-rig": {
      const my = -40 - Number(p.h ?? 0.5) * 400;
      return (
        <g>
          <Stand x={-80} top={-600} base={[-110, 70]} />
          <Clamp x={-80} y={my - 18} x2={0} />
          <rect x={-18} y={my - 34} width={36} height={34} rx={4} fill="#B45309" />
          {[0, 1, 2, 3, 4].map((k) => <line key={k} x1={-18} y1={my - 30 + k * 7} x2={18} y2={my - 30 + k * 7} stroke="#7C2D12" strokeWidth={2} />)}
          {p.magnet && <circle cx={0} cy={my - 17} r={4} fill="#F87171" />}
          <rect x={-40} y={-30} width={80} height={30} rx={4} fill="#334155" />
          <rect x={-30} y={-40} width={60} height={10} rx={2} fill="#94A3B8" />
          <rect x={44} y={-520} width={14} height={480} fill="#F1E3BC" stroke="#C8B07A" />
          {Array.from({ length: 13 }, (_, k) => <g key={k}><line x1={44} y1={-40 - k * 40} x2={52} y2={-40 - k * 40} stroke="#5B4A26" /><text x={62} y={-37 - k * 40} fontSize={9} fontWeight={700} fill="#E2E8F0">{(k / 10).toFixed(1)}</text></g>)}
          <Lead x1={18} y1={my - 20} x2={330} y2={-40} c="#DC2626" sag={40} />
          <Lead x1={40} y1={-15} x2={360} y2={-40} c="#111827" sag={20} />
        </g>
      );
    }
    case "ball": return <g><circle cx={0} cy={-13} r={13} fill="url(#bl-metal)" stroke="#1F2937" /><circle cx={-4} cy={-17} r={4} fill="#fff" fillOpacity=".6" /></g>;
    case "timer": return (
      <g>
        <rect x={-90} y={-90} width={180} height={90} rx={8} fill="url(#bl-case)" />
        <rect x={-76} y={-76} width={152} height={38} rx={4} fill="#0B1220" />
        <text x={50} y={-48} textAnchor="end" fontSize={22} fontWeight={700} fontFamily="ui-monospace, monospace" fill="#F87171">{Number(p.t ?? 0).toFixed(3)}</text>
        <text x={56} y={-48} fontSize={12} fontWeight={800} fill="#FCA5A5">s</text>
        <text x={0} y={-16} textAnchor="middle" fontSize={9} fontWeight={800} fill="#475569">TIMER</text>
      </g>
    );
    case "ripple-tank": {
      const on = !!p.on, lam = Number(p.lambda ?? 2) * TANK.perCm;
      return (
        <g>
          {/* tank on legs, lamp above, paper below */}
          <rect x={-250} y={-470} width={8} height={160} fill="url(#bl-metal)" />
          <rect x={-250} y={-470} width={250} height={8} fill="url(#bl-metal)" />
          <circle cx={0} cy={-450} r={16} fill={on ? "#FEF3C7" : "#94A3B8"} />
          {on && <path d="M-14,-440 L-260,-300 H260 L14,-440 Z" fill="#FEF3C7" fillOpacity=".08" />}
          {[-250, 250].map((x) => <rect key={x} x={x - 4} y={-300} width={8} height={170} fill="#64748B" />)}
          <clipPath id="bl-tank"><rect x={-260} y={-312} width={520} height={18} /></clipPath>
          <clipPath id="bl-paper"><rect x={-260} y={-120} width={520} height={90} /></clipPath>
          <rect x={-260} y={-312} width={520} height={18} fill="#93C5FD" fillOpacity=".55" stroke="#fff" strokeOpacity=".8" />
          {on && <g clipPath="url(#bl-tank)">{Array.from({ length: 30 }, (_, k) => <line key={k} x1={-230 + k * lam * 0.5} y1={-311} x2={-230 + k * lam * 0.5} y2={-301} stroke="#fff" strokeOpacity={k % 2 ? 0.1 : 0.6} strokeWidth={2} />)}</g>}
          <rect x={-250} y={-334} width={14} height={30} fill="#1F2937" />
          <rect x={-240} y={-322} width={10} height={12} fill="#475569" />
          {/* the paper and ruler underneath */}
          <rect x={-260} y={-120} width={520} height={110} fill="#F8FAFC" />
          {on && <g clipPath="url(#bl-paper)">{Array.from({ length: Math.ceil(490 / lam) + 1 }, (_, k) => <rect key={k} x={TANK.x0 + k * lam - lam * 0.18} y={-118} width={lam * 0.36} height={88} fill="#0F172A" fillOpacity=".55" />)}
          {Array.from({ length: Math.ceil(490 / lam) + 1 }, (_, k) => <line key={`b${k}`} x1={TANK.x0 + (k + 0.5) * lam} y1={-118} x2={TANK.x0 + (k + 0.5) * lam} y2={-30} stroke="#fff" strokeWidth={Math.max(1.5, lam * 0.18)} />)}</g>}
          <rect x={-260} y={-30} width={520} height={20} fill="#F1E3BC" stroke="#C8B07A" />
          {Array.from({ length: 29 }, (_, c) => <g key={c}><line x1={TANK.x0 + c * TANK.perCm} y1={-30} x2={TANK.x0 + c * TANK.perCm} y2={-22} stroke="#5B4A26" />{c % 5 === 0 && <text x={TANK.x0 + c * TANK.perCm} y={-12} textAnchor="middle" fontSize={8} fontWeight={800} fill="#3F3216">{c}</text>}</g>)}
        </g>
      );
    }
    case "signal-gen": return (
      <g>
        <rect x={-100} y={-100} width={200} height={100} rx={8} fill="url(#bl-case)" />
        <rect x={-86} y={-86} width={100} height={36} rx={4} fill="#0B1220" />
        <text x={0} y={-60} textAnchor="end" fontSize={20} fontWeight={700} fontFamily="ui-monospace, monospace" fill={p.on ? "#34D399" : "#334155"}>{p.on ? `${p.f}` : "--"}</text>
        <text x={4} y={-60} fontSize={11} fontWeight={800} fill="#34D399">Hz</text>
        <g transform={`translate(55,-62) rotate(${(Number(p.f ?? 5) / 25) * 270 - 135})`}><circle r={20} fill="#1F2937" stroke="#94A3B8" strokeWidth={2} /><rect x={-2} y={-18} width={4} height={10} rx={2} fill="#fff" /></g>
        <rect x={-86} y={-36} width={36} height={22} rx={4} fill={p.on ? "#16A34A" : "#B91C1C"} />
        <text x={-68} y={-21} textAnchor="middle" fontSize={10} fontWeight={800} fill="#fff">{p.on ? "ON" : "OFF"}</text>
      </g>
    );
    default: return null;
  }
}

// An "F"-shaped object's image on the screen: upside down, blurred when out of focus.
function ImageF({ x, y, size, blur, id }: { x: number; y: number; size: number; blur: number; id: string }) {
  const s = Math.max(6, size);
  return (
    <g>
      <filter id={id} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={blur} /></filter>
      <g filter={blur > 0.15 ? `url(#${id})` : undefined} transform={`translate(${x},${y}) rotate(180)`}>
        <path d={`M${-s * 0.25},${-s / 2} V${s / 2} M${-s * 0.25},${-s / 2} H${s * 0.3} M${-s * 0.25},0 H${s * 0.15}`} stroke="#B45309" strokeWidth={Math.max(2, s * 0.12)} fill="none" strokeLinecap="square" />
      </g>
    </g>
  );
}

export function physicsCloseup(it: ItemView): Zoom | null {
  const p = it.props ?? {};
  switch (it.kind) {
    case "stopwatch": return { anchor: { x: it.x, y: it.y - 54 }, title: "Close-up · the stopwatch", draw: (cx, cy) => digits(cx, cy, fmtWatch(Number(p.t ?? 0)), "s", "#111827") };
    case "timer": return { anchor: { x: it.x, y: it.y - 57 }, title: "Close-up · the timer", draw: (cx, cy) => digits(cx, cy, Number(p.t ?? 0).toFixed(3), "s") };
    case "joulemeter": return { anchor: { x: it.x, y: it.y - 68 }, title: "Close-up · the joulemeter", draw: (cx, cy) => digits(cx - 10, cy, String(p.J ?? 0), "J") };
    case "spring-stand": {
      const pos = Number(p.pos ?? 10);
      return { anchor: { x: it.x + SPRING.rule, y: it.y + SPRING.top + pos * SPRING.perCm }, title: "Close-up · read the pointer (cm)",
        draw: (cx, cy, r) => <ScaleZoom cx={cx} cy={cy} r={r} value={pos} perUnit={40} minor={0.1} label={1} lo={0} hi={45} down pointer="#DC2626" unit="cm" /> };
    }
    case "measuring-cylinder": {
      const vol = Number(p.vol ?? 0);
      if (!vol) return null;
      return { anchor: { x: it.x, y: it.y + CYL.zero - vol * CYL.per }, title: "Close-up · read the bottom of the meniscus",
        draw: (cx, cy, r) => <ScaleZoom cx={cx} cy={cy} r={r} value={vol} perUnit={14} minor={1} label={10} lo={0} hi={100} liquid={String(p.liquid ?? "#BFDBFE")} unit="cm³" /> };
    }
    case "heating": {
      const T = Number(p.T ?? 0);
      return { anchor: { x: it.x, y: it.y + thermoY(-62, T) }, title: "Close-up · the thermometer (°C)",
        draw: (cx, cy, r) => <ScaleZoom cx={cx} cy={cy} r={r} value={T} perUnit={9} minor={1} label={10} lo={-10} hi={110} liquid="#DC2626" unit="°C" /> };
    }
    case "metal-block": {
      if (!p.thermo) return null;
      const T = Number(p.T ?? 20);
      return { anchor: { x: it.x + 30, y: it.y + thermoY(-140, T) }, title: "Close-up · the thermometer (°C)",
        draw: (cx, cy, r) => <ScaleZoom cx={cx} cy={cy} r={r} value={T} perUnit={18} minor={0.5} label={5} lo={-10} hi={110} liquid="#DC2626" unit="°C" /> };
    }
    case "ray-sheet": {
      if (!p.on) return null;
      const n = Number(p.n ?? 1.5), i = Number(p.i ?? 10), r = Math.asin(Math.sin(R(i)) / n);
      return { anchor: { x: it.x, y: it.y - 190 }, title: "Close-up · the protractor below the normal",
        draw: (cx, cy) => {
          const ox = cx - 45, oy = cy - 92, RR = 190;
          return (
            <g>
              <rect x={cx - 130} y={oy} width={260} height={240} fill="#BFE3F2" fillOpacity=".5" />
              <rect x={cx - 130} y={cy - 130} width={260} height={oy - cy + 130} fill="#FBFBF7" />
              <line x1={cx - 130} y1={oy} x2={cx + 130} y2={oy} stroke="#475569" strokeWidth={2} />
              <line x1={ox} y1={cy - 130} x2={ox} y2={cy + 130} stroke="#334155" strokeDasharray="8 6" strokeWidth={1.5} />
              {Array.from({ length: 56 }, (_, d) => { const a = R(d), l = d % 10 ? (d % 5 ? 8 : 13) : 20;
                return <g key={d}><line x1={ox + RR * Math.sin(a)} y1={oy + RR * Math.cos(a)} x2={ox + (RR - l) * Math.sin(a)} y2={oy + (RR - l) * Math.cos(a)} stroke="#0F172A" strokeWidth={d % 10 ? 1 : 1.8} />
                  {d % 10 === 0 && d > 0 && <text x={ox + (RR - 34) * Math.sin(a)} y={oy + (RR - 34) * Math.cos(a) + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill="#0F172A">{d}</text>}</g>; })}
              <line x1={ox} y1={oy} x2={ox + 170 * Math.sin(r)} y2={oy + 170 * Math.cos(r)} stroke="#F59E0B" strokeWidth={4} />
              <line x1={ox} y1={oy} x2={ox - 120 * Math.sin(R(i))} y2={oy - 120 * Math.cos(R(i))} stroke="#F59E0B" strokeWidth={4} />
            </g>
          );
        } };
    }
    case "hotspot": return p.screen ? screenCloseup(it) : null;
    case "ripple-tank": {
      if (!p.on) return null;
      const lam = Number(p.lambda ?? 2), L = 10 * lam;
      return { anchor: { x: it.x + TANK.x0 + L * TANK.perCm, y: it.y - 40 }, title: "Close-up · the 10th bright line on the ruler",
        draw: (cx, cy, r) => {
          const per = 40, X = (c: number) => cx + (c - L) * per, ticks: number[] = [];
          for (let t = Math.ceil((L - 3.2) * 10); t <= Math.floor((L + 3.2) * 10); t++) ticks.push(t / 10);
          return (
            <g>
              <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#F8FAFC" />
              {Array.from({ length: 13 }, (_, k) => k - 6).map((d) => { const k = 10 + Math.round(d), x = X(k * lam); return <g key={d}><rect x={X((k + 0.5) * lam) - lam * per * 0.18} y={cy - r} width={lam * per * 0.36} height={r + 30} fill="#0F172A" fillOpacity=".55" /><line x1={x} y1={cy - r} x2={x} y2={cy + 30} stroke="#FDE68A" strokeWidth={3} />{k > 0 && <text x={x} y={cy - 60} textAnchor="middle" fontSize={12} fontWeight={800} fill="#B45309">{k}</text>}</g>; })}
              <rect x={cx - r} y={cy + 30} width={2 * r} height={r} fill="#F1E3BC" />
              {ticks.map((t) => { const big = Math.abs(t - Math.round(t)) < 1e-6, mid = !big && Math.abs(t * 2 - Math.round(t * 2)) < 1e-6;
                return <g key={t}><line x1={X(t)} y1={cy + 30} x2={X(t)} y2={cy + 30 + (big ? 22 : mid ? 15 : 9)} stroke="#3F3216" strokeWidth={big ? 2 : 1} />{big && <text x={X(t)} y={cy + 72} textAnchor="middle" fontSize={16} fontWeight={800} fill="#3F3216">{Math.round(t)}</text>}</g>; })}
            </g>
          );
        } };
    }
    default: return null;
  }
}

// The screen, up close: how sharp the image is (the screen's hotspot carries the bench's settings).
function screenCloseup(it: ItemView): Zoom | null {
  const p = it.props ?? {};
  if (!p.on) return null;
  const u = Number(p.u), s = Number(p.s), f = Number(p.f), sharp = u + (u * f) / (u - f), blur = Math.min(14, Math.abs(s - sharp) * 2.4);
  return { anchor: { x: it.x, y: it.y - 130 }, title: "Close-up · the image on the screen",
    draw: (cx, cy) => <g><rect x={cx - 90} y={cy - 110} width={180} height={220} fill="#F8FAFC" /><ImageF x={cx} y={cy} size={Math.min(150, 90 * (sharp - u) / u)} blur={blur} id={`sc${Math.round(blur * 10)}`} /></g> };
}
