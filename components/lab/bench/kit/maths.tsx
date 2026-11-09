// Maths kit: paper (with drawings measured by ruler and protractor), dice and a
// tally chart, stacking cups, a tin can; and the close-ups that go with them.
import type { ReactNode } from "react";
import type { ItemView } from "@/lib/lab/bench/types";
import type { PaperZoom, Shape } from "@/lib/lab/bench/maths";
import { ScaleZoom } from "@/components/lab/bench/kit/parts";

type Zoom = { anchor: { x: number; y: number }; title: string; draw: (cx: number, cy: number, r: number) => ReactNode };

export const MATHS_SIZE: Record<string, [number, number]> = {
  launcher: [140, 120], "bead-bags": [300, 170], pulse: [260, 200], "step-box": [220, 200],
  paper: [640, 330], dice: [200, 70], "tally-chart": [300, 260], cups: [120, 380], can: [190, 250],
};
const NO_SHADOW_MATHS = ["paper"];
export const mathsShadow = (kind: string) => !NO_SHADOW_MATHS.includes(kind);
const R = (d: number) => (d * Math.PI) / 180;

function ShapeView({ s }: { s: Shape }) {
  switch (s.k) {
    case "line": return <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.c ?? "#1E293B"} strokeWidth={s.w ?? 2} strokeDasharray={s.dash ? "7 5" : undefined} strokeLinecap="round" />;
    case "poly": return <polygon points={s.pts.join(",")} fill={s.fill ?? "none"} stroke={s.c ?? "#1E293B"} strokeWidth={s.w ?? 2} strokeDasharray={s.dash ? "7 5" : undefined} strokeLinejoin="round" />;
    case "circle": return <circle cx={s.cx} cy={s.cy} r={s.r} fill={s.fill ?? "none"} stroke={s.c ?? "none"} strokeWidth={s.w ?? 2} />;
    case "rect": return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx ?? 0} fill={s.fill ?? "none"} stroke={s.c ?? "none"} strokeWidth={2} />;
    case "path": return <path d={s.d} fill={s.fill ?? "none"} stroke={s.c ?? "#1E293B"} strokeWidth={s.w ?? 2} />;
    case "text": return <text x={s.x} y={s.y} fontSize={s.size ?? 13} fontWeight={700} fill={s.c ?? "#1E293B"} textAnchor={s.anchor ?? "start"}>{s.t}</text>;
    case "dot": return <circle cx={s.x} cy={s.y} r={s.r ?? 4} fill={s.c ?? "#1E293B"} />;
    default: return null;
  }
}

type Grid = { unit: number; ox: number; oy: number; nx: number; ny: number };
function GridView({ g }: { g: Grid }) {
  const xs = Array.from({ length: 2 * g.nx + 1 }, (_, k) => k - g.nx), ys = Array.from({ length: 2 * g.ny + 1 }, (_, k) => k - g.ny);
  return (
    <g>
      {xs.map((i) => <line key={`x${i}`} x1={g.ox + i * g.unit} y1={g.oy - g.ny * g.unit} x2={g.ox + i * g.unit} y2={g.oy + g.ny * g.unit} stroke={i ? "#BFDBFE" : "#1E293B"} strokeWidth={i ? 1 : 2} />)}
      {ys.map((j) => <line key={`y${j}`} x1={g.ox - g.nx * g.unit} y1={g.oy - j * g.unit} x2={g.ox + g.nx * g.unit} y2={g.oy - j * g.unit} stroke={j ? "#BFDBFE" : "#1E293B"} strokeWidth={j ? 1 : 2} />)}
      {xs.filter((i) => i).map((i) => <text key={`lx${i}`} x={g.ox + i * g.unit} y={g.oy + 12} textAnchor="middle" fontSize={9.5} fontWeight={800} fill="#475569">{i}</text>)}
      {ys.filter((j) => j).map((j) => <text key={`ly${j}`} x={g.ox - 4} y={g.oy - j * g.unit + 3} textAnchor="end" fontSize={9.5} fontWeight={800} fill="#475569">{j}</text>)}
      <text x={g.ox - 6} y={g.oy + 13} textAnchor="end" fontSize={9} fontWeight={800} fill="#1E293B">O</text>
    </g>
  );
}

function PaperView({ p }: { p: Record<string, any> }) {
  const w = Number(p.w ?? 640), h = Number(p.h ?? 330), style = p.style ?? "paper";
  const bg = style === "cork" ? "#C08A55" : style === "board" ? "#F8FAFC" : style === "grass" ? "#4D7C0F" : "#FBFBF7";
  return (
    <g>
      {style === "board" && <rect x={-w / 2 - 8} y={-h - 8} width={w + 16} height={h + 8} rx={4} fill="#94A3B8" />}
      <rect x={-w / 2} y={-h} width={w} height={h} rx={style === "cork" ? 4 : 2} fill={bg} />
      {style === "grass" && Array.from({ length: 160 }, (_, k) => <path key={k} d={`M${-w / 2 + ((k * 89) % w)},${-((k * 53) % h)} l3,-8`} stroke="#65A30D" strokeWidth={1.5} />)}
      {style === "cork" && Array.from({ length: 90 }, (_, k) => <circle key={k} cx={-w / 2 + ((k * 73) % w)} cy={-h + ((k * 41) % h)} r={1.6} fill="#8B5E34" fillOpacity=".5" />)}
      {p.grid && <GridView g={p.grid as Grid} />}
      {((p.shapes as Shape[]) ?? []).map((s, i) => <ShapeView key={i} s={s} />)}
    </g>
  );
}

export function MathsKit({ it }: { it: ItemView }): ReactNode | null {
  const p = it.props ?? {};
  switch (it.kind) {
    case "paper": return <PaperView p={p} />;
    case "dice": {
      const f = Number(p.face ?? 1), PIPS: Record<number, [number, number][]> = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
      return (
        <g>
          <path d="M-100,0 L-90,-30 H90 L100,0 Z" fill="#14532D" />
          <rect x={-100} y={-6} width={200} height={6} fill="#052E16" />
          <g className={p.rolling ? "bench-shake" : undefined} key={p.n}>
            <rect x={-26} y={-62} width={52} height={52} rx={9} fill="#F8FAFC" stroke="#CBD5E1" strokeWidth={2} />
            {(PIPS[f] ?? []).map(([x, y], k) => <circle key={k} cx={x * 13} cy={-36 + y * 13} r={5} fill="#0F172A" />)}
          </g>
          <text x={0} y={-74} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">{p.n ? `${p.n} rolls` : ""}</text>
        </g>
      );
    }
    case "tally-chart": {
      const labels = (p.labels as string[]) ?? [], counts = (p.counts as number[]) ?? [], rowH = Math.min(34, 190 / Math.max(1, labels.length));
      return (
        <g>
          <rect x={-150} y={-260} width={300} height={260} rx={4} fill="#FBFBF7" />
          <text x={-130} y={-236} fontSize={12} fontWeight={800} fill="#1E293B">Outcome</text>
          <text x={-60} y={-236} fontSize={12} fontWeight={800} fill="#1E293B">Tally</text>
          <text x={130} y={-236} textAnchor="end" fontSize={12} fontWeight={800} fill="#1E293B">Freq.</text>
          <line x1={-142} y1={-228} x2={142} y2={-228} stroke="#94A3B8" />
          {labels.map((l, i) => {
            const y = -228 + (i + 1) * rowH, c = counts[i] ?? 0, groups = Math.min(Math.floor(c / 5), 9), rest = c >= 50 ? 0 : c % 5;
            return (
              <g key={l}>
                <text x={-120} y={y - rowH / 2 + 5} fontSize={14} fontWeight={800} fill="#1E293B">{l}</text>
                {Array.from({ length: groups }, (_, g) => <g key={g} stroke="#1E293B" strokeWidth={1.4}>{[0, 1, 2, 3].map((k) => <line key={k} x1={-60 + g * 18 + k * 3.5} y1={y - rowH + 8} x2={-60 + g * 18 + k * 3.5} y2={y - 6} />)}<line x1={-63 + g * 18} y1={y - 8} x2={-46 + g * 18} y2={y - rowH + 10} /></g>)}
                {c >= 50 && <text x={-60 + groups * 18 + 2} y={y - rowH / 2 + 5} fontSize={12} fontWeight={800} fill="#1E293B">…</text>}
                {Array.from({ length: rest }, (_, k) => <line key={`r${k}`} x1={-60 + groups * 18 + k * 3.5} y1={y - rowH + 8} x2={-60 + groups * 18 + k * 3.5} y2={y - 6} stroke="#1E293B" strokeWidth={1.4} />)}
                <text x={130} y={y - rowH / 2 + 5} textAnchor="end" fontSize={15} fontWeight={800} fontFamily="ui-monospace, monospace" fill="#1E293B">{c}</text>
                <line x1={-142} y1={y} x2={142} y2={y} stroke="#E2E8F0" />
              </g>
            );
          })}
          {p.total != null && <text x={130} y={-12} textAnchor="end" fontSize={12} fontWeight={800} fill="#475569">Total {p.total}</text>}
        </g>
      );
    }
    case "cups": {
      const n = Number(p.n ?? 0), H = Number(p.H ?? 10) * 20, d = Number(p.d ?? 1.3) * 20;
      return (
        <g>
          {Array.from({ length: n }, (_, k) => { const top = -H - k * d, bot = -k * d;
            return <g key={k}><path d={`M-34,${top} L-26,${bot} H26 L34,${top} Z`} fill="#F87171" fillOpacity=".92" stroke="#B91C1C" strokeWidth={1.5} /><rect x={-36} y={top - 4} width={72} height={8} rx={3} fill="#FCA5A5" stroke="#B91C1C" strokeWidth={1.2} /></g>; })}
          {p.ruler && <g>
            <rect x={60} y={-500} width={22} height={500} fill="#F1E3BC" stroke="#C8B07A" />
            {Array.from({ length: 26 }, (_, c) => <g key={c}><line x1={60} y1={-c * 20} x2={c % 5 ? 68 : 74} y2={-c * 20} stroke="#5B4A26" />{c % 5 === 0 && <text x={88} y={-c * 20 + 4} fontSize={9} fontWeight={800} fill="#E2E8F0">{c}</text>}</g>)}
            {n > 0 && <line x1={36} y1={-Number(p.h) * 20} x2={60} y2={-Number(p.h) * 20} stroke="#fff" strokeDasharray="3 3" />}
          </g>}
        </g>
      );
    }
    case "can": {
      const r = Number(p.r ?? 4) * 20, h = Number(p.h ?? 10) * 20;
      return (
        <g>
          <rect x={-r} y={-h} width={2 * r} height={h} fill="url(#bl-metal)" />
          <rect x={-r} y={-h * 0.72} width={2 * r} height={h * 0.45} fill="#DC2626" fillOpacity=".85" />
          <text x={0} y={-h * 0.48} textAnchor="middle" fontSize={14} fontWeight={900} fill="#fff">TOMATOES</text>
          <ellipse cx={0} cy={-h} rx={r} ry={10} fill={p.full ? "#93C5FD" : "#CBD5E1"} stroke="#94A3B8" strokeWidth={2} />
          {p.zoom === "d" && <rect x={-r - 10} y={-h - 26} width={2 * r + 30} height={14} fill="#F1E3BC" stroke="#C8B07A" />}
          {p.zoom === "h" && <rect x={r + 8} y={-h - 20} width={14} height={h + 20} fill="#F1E3BC" stroke="#C8B07A" />}
        </g>
      );
    }
    default: return ExtraKit({ it });
  }
}

// ── Close-ups ──────────────────────────────────────────────────────────────
// A ruler seen up close at the far end of what's being measured (its 0 is at the other end).
export function RulerZoom({ cx, cy, r, len }: { cx: number; cy: number; r: number; len: number }) {
  const per = 40, X = (v: number) => cx + (v - len) * per, ticks: number[] = [];
  for (let t = Math.max(0, Math.ceil((len - 3.2) * 10)); t <= Math.floor((len + 3.2) * 10); t++) ticks.push(t / 10);
  return (
    <g>
      <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#FBFBF7" />
      <line x1={cx - r} y1={cy - 18} x2={cx} y2={cy - 18} stroke="#1E293B" strokeWidth={5} />
      <line x1={cx} y1={cy - 34} x2={cx} y2={cy - 4} stroke="#DC2626" strokeWidth={2} />
      <rect x={cx - r} y={cy} width={2 * r} height={r} fill="#F1E3BC" />
      {ticks.map((t) => { const big = Math.abs(t - Math.round(t)) < 1e-6, mid = !big && Math.abs(t * 2 - Math.round(t * 2)) < 1e-6;
        return <g key={t}><line x1={X(t)} y1={cy} x2={X(t)} y2={cy + (big ? 24 : mid ? 16 : 10)} stroke="#3F3216" strokeWidth={big ? 2 : 1} />{big && <text x={X(t)} y={cy + 44} textAnchor="middle" fontSize={17} fontWeight={800} fill="#3F3216">{Math.round(t)}</text>}</g>; })}
      <text x={cx} y={cy + 72} textAnchor="middle" fontSize={11} fontWeight={700} fill="#5B4A26">cm</text>
    </g>
  );
}

// A protractor centred on the corner, its zero line along one arm.
export function ProtractorZoom({ cx, cy, base, ray }: { cx: number; cy: number; base: number; ray: number }) {
  let b = base, d = (ray - base + 720) % 360;
  if (d > 180) { b = ray; d = 360 - d; }
  const RR = 108, P = (a: number, rr: number) => ({ x: cx + rr * Math.cos(R(a)), y: cy - rr * Math.sin(R(a)) });
  const s = P(b, RR), e = P(b + 180, RR);
  return (
    <g>
      <rect x={cx - 130} y={cy - 130} width={260} height={260} fill="#FBFBF7" />
      <path d={`M${s.x},${s.y} A${RR},${RR} 0 0 0 ${e.x},${e.y} Z`} fill="#BAE6FD" fillOpacity=".45" stroke="#0369A1" strokeWidth={1.5} />
      {Array.from({ length: 181 }, (_, k) => { const a = P(b + k, RR), c = P(b + k, RR - (k % 10 ? (k % 5 ? 6 : 10) : 15)); return <line key={k} x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="#0C4A6E" strokeWidth={k % 10 ? 0.8 : 1.6} />; })}
      {Array.from({ length: 10 }, (_, k) => { const t = P(b + k * 20, RR - 28); return <text key={k} x={t.x} y={t.y + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0C4A6E">{k * 20}</text>; })}
      <line x1={cx} y1={cy} x2={P(b, 125).x} y2={P(b, 125).y} stroke="#1E293B" strokeWidth={4} />
      <line x1={cx} y1={cy} x2={P(b + d, 125).x} y2={P(b + d, 125).y} stroke="#DC2626" strokeWidth={4} />
      <circle cx={cx} cy={cy} r={4} fill="#0F172A" />
    </g>
  );
}

export function mathsCloseup(it: ItemView): Zoom | null {
  const p = it.props ?? {};
  switch (it.kind) {
    case "paper": {
      const z = p.zoom as PaperZoom | null;
      if (!z) return null;
      if (z.type === "ruler") return { anchor: { x: it.x + z.b[0], y: it.y + z.b[1] }, title: z.title ?? "Close-up · the ruler at the end (0 is at the other end)", draw: (cx, cy, r) => <RulerZoom cx={cx} cy={cy} r={r} len={z.len} /> };
      if (z.type === "protractor") return { anchor: { x: it.x + z.p[0], y: it.y + z.p[1] }, title: z.title ?? "Close-up · the protractor on the corner", draw: (cx, cy) => <ProtractorZoom cx={cx} cy={cy} base={z.base} ray={z.ray} /> };
      return { anchor: { x: it.x + z.at[0], y: it.y + z.at[1] }, title: z.title ?? "Close-up", draw: (cx, cy) => <g transform={`translate(${cx},${cy}) scale(${z.k}) translate(${-z.at[0]},${-z.at[1]})`}><PaperView p={p} /></g> };
    }
    case "tally-chart": {
      const labels = (p.labels as string[]) ?? [], counts = (p.counts as number[]) ?? [];
      return { anchor: { x: it.x + 110, y: it.y - 130 }, title: "Close-up · the frequencies",
        draw: (cx, cy, r) => (
          <g>
            <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#FBFBF7" />
            {labels.map((l, i) => { const y = cy - 80 + i * (160 / Math.max(1, labels.length - 1 || 1)); return <g key={l}><text x={cx - 50} y={y + 6} fontSize={18} fontWeight={800} fill="#475569">{l}</text><text x={cx + 60} y={y + 7} textAnchor="end" fontSize={22} fontWeight={800} fontFamily="ui-monospace, monospace" fill="#1E293B">{counts[i] ?? 0}</text></g>; })}
          </g>
        ) };
    }
    case "cups": {
      if (!p.ruler || !Number(p.n)) return null;
      const h = Number(p.h ?? 0);
      return { anchor: { x: it.x + 60, y: it.y - h * 20 }, title: "Close-up · the ruler at the top of the stack (cm)",
        draw: (cx, cy, r) => <ScaleZoom cx={cx} cy={cy} r={r} value={h} perUnit={40} minor={0.1} label={1} lo={0} hi={25} pointer="#DC2626" unit="cm" /> };
    }
    case "can": {
      const rr = Number(p.r ?? 4), h = Number(p.h ?? 10);
      if (p.zoom === "d") return { anchor: { x: it.x + rr * 20, y: it.y - h * 20 - 20 }, title: "Close-up · the ruler across the top (0 at the other side)", draw: (cx, cy, r) => <RulerZoom cx={cx} cy={cy} r={r} len={2 * rr} /> };
      if (p.zoom === "h") return { anchor: { x: it.x + rr * 20 + 15, y: it.y - h * 20 }, title: "Close-up · the ruler beside the tin (0 on the bench)", draw: (cx, cy, r) => <RulerZoom cx={cx} cy={cy} r={r} len={h} /> };
      return null;
    }
    default: return extraCloseup(it);
  }
}

// ── The last three practicals' kit: launcher, bead bags, pulse, step-up box ──
export const EXTRA_SIZE: Record<string, [number, number]> = { launcher: [140, 120], "bead-bags": [300, 170], pulse: [260, 200], "step-box": [220, 200] };
const LPX = 9; // launcher: px per cm along the bench
export function ExtraKit({ it }: { it: ItemView }): ReactNode | null {
  const p = it.props ?? {};
  switch (it.kind) {
    case "launcher": {
      const a = Number(p.angle ?? 45), R = p.landed as number | null, x1 = (R ?? 0) * LPX, top = (x1 * Math.tan(R2(a))) / 4;
      return (
        <g>
          <rect x={-10} y={-16} width={1110} height={16} fill="#F1E3BC" stroke="#C8B07A" />
          {Array.from({ length: 121 }, (_, c) => <g key={c}><line x1={c * LPX} y1={-16} x2={c * LPX} y2={-16 + (c % 10 ? (c % 5 ? 4 : 7) : 11)} stroke="#5B4A26" />{c % 10 === 0 && <text x={c * LPX} y={-1} textAnchor="middle" fontSize={8} fontWeight={800} fill="#3F3216">{c}</text>}</g>)}
          <rect x={560} y={-19} width={420} height={4} fill="#1F2937" fillOpacity=".75" />
          {R != null && <circle cx={x1} cy={-17} r={4} fill="#0F172A" />}
          <rect x={-40} y={-30} width={60} height={14} rx={3} fill="#334155" />
          <path d="M-10,-30 A40,40 0 0 1 30,-70" fill="none" stroke="#94A3B8" strokeWidth={2} />
          <g transform={`rotate(${-a} 0 -30)`}><rect x={-8} y={-40} width={70} height={20} rx={5} fill="#2563EB" /><rect x={50} y={-38} width={14} height={16} rx={3} fill="#1E3A8A" /></g>
          <text x={0} y={-80} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">{a}°</text>
          {R != null && (
            <g key={Number(p.shots)}>
              <path d={`M0,-30 Q${x1 / 2},${-30 - 2 * top} ${x1},-24`} fill="none" stroke="#fff" strokeOpacity=".35" strokeDasharray="4 6" />
              <circle r={7} fill="url(#bl-metal)" stroke="#1F2937">
                <animateMotion dur="0.9s" fill="freeze" path={`M0,-30 Q${x1 / 2},${-30 - 2 * top} ${x1},-24`} />
              </circle>
            </g>
          )}
        </g>
      );
    }
    case "bead-bags": {
      const last = p.last as [number, number] | null, col = (b: number) => (b ? "#8B5A2B" : "#3B82F6");
      const bag = (x: number, name: string) => (
        <g key={name}>
          <path d={`M${x - 55},0 C${x - 75},-60 ${x - 50},-120 ${x - 25},-130 L${x + 25},-130 C${x + 50},-120 ${x + 75},-60 ${x + 55},0 Z`} fill="#D6C3A0" stroke="#8B6B3E" strokeWidth={2} />
          <path d={`M${x - 28},-130 Q${x},-140 ${x + 28},-130`} fill="none" stroke="#8B6B3E" strokeWidth={4} />
          {Array.from({ length: 8 }, (_, k) => <circle key={k} cx={x - 21 + k * 6} cy={-132 + (k % 2) * 4} r={4} fill={col(k % 2)} />)}
          <text x={x} y={-60} textAnchor="middle" fontSize={13} fontWeight={900} fill="#5B4A26">{name}</text>
          <text x={x} y={-42} textAnchor="middle" fontSize={12} fontWeight={800} fill="#5B4A26">Bb</text>
        </g>
      );
      return (
        <g>
          {bag(-80, "Father")}{bag(80, "Mother")}
          <ellipse cx={0} cy={-6} rx={40} ry={9} fill="#E2E8F0" fillOpacity=".4" stroke="#fff" strokeOpacity=".8" />
          {last && <g key={Number(p.n)} className="bench-shake"><circle cx={-10} cy={-14} r={8} fill={col(last[0])} stroke="#fff" /><circle cx={10} cy={-14} r={8} fill={col(last[1])} stroke="#fff" /></g>}
        </g>
      );
    }
    case "pulse": {
      const rate = Number(p.bpm ?? 70);
      return (
        <g>
          <path d="M-130,-40 C-60,-70 40,-70 120,-50 L120,-10 C40,-20 -60,-20 -130,0 Z" fill="#C68B59" />
          <path d="M-10,-62 C10,-90 40,-92 60,-80 L56,-70 C40,-78 18,-76 4,-58 Z" fill="#B87A4B" />
          <path d="M10,-60 C30,-86 58,-86 74,-72 L70,-62 C56,-72 34,-70 22,-54 Z" fill="#B87A4B" />
          <g transform="translate(-60,-140)">
            <path className="bench-beat" style={{ animationDuration: `${60 / Math.max(30, rate)}s` }} d="M0,10 C-30,-14 -18,-36 0,-22 C18,-36 30,-14 0,10 Z" fill="#E11D48" />
          </g>
          <rect x={10} y={-176} width={110} height={56} rx={10} fill="#0B1220" />
          <text x={65} y={-156} textAnchor="middle" fontSize={10} fontWeight={800} fill="#94A3B8">BEATS</text>
          <text x={65} y={-130} textAnchor="middle" fontSize={22} fontWeight={700} fontFamily="ui-monospace, monospace" fill={p.counting ? "#F87171" : "#FCA5A5"}>{String(p.beats ?? 0)}</text>
        </g>
      );
    }
    case "step-box": return (
      <g>
        <rect x={-90} y={-70} width={180} height={70} rx={6} fill="#475569" />
        <rect x={-90} y={-76} width={180} height={10} rx={4} fill="#334155" />
        <g className={p.active ? "bench-step" : undefined}>
          <circle cx={0} cy={-185} r={14} fill="#F1C27D" />
          <path d="M0,-170 V-120 M0,-160 L-22,-136 M0,-160 L22,-136 M0,-120 L-14,-80 M0,-120 L16,-82" stroke="#1E3A8A" strokeWidth={8} strokeLinecap="round" fill="none" />
        </g>
      </g>
    );
    default: return null;
  }
}
const R2 = (d: number) => (d * Math.PI) / 180;
export function extraCloseup(it: ItemView): Zoom | null {
  const p = it.props ?? {};
  if (it.kind === "launcher" && p.landed != null) return { anchor: { x: it.x + Number(p.landed) * LPX, y: it.y - 17 }, title: "Close-up · the mark on the rule (cm)", draw: (cx, cy, r) => <RulerZoom cx={cx} cy={cy} r={r} len={Number(p.landed)} /> };
  if (it.kind === "pulse") return { anchor: { x: it.x + 65, y: it.y - 140 }, title: "Close-up · the beat counter", draw: (cx, cy) => <g><rect x={cx - 90} y={cy - 40} width={180} height={80} rx={10} fill="#0B1220" stroke="#475569" strokeWidth={3} /><text x={cx} y={cy + 16} textAnchor="middle" fontSize={44} fontWeight={700} fontFamily="ui-monospace, monospace" fill="#F87171">{String(p.beats ?? 0)}</text></g> };
  return null;
}
