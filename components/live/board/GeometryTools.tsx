"use client";
import { useRef, useState } from "react";
import { BOARD_H, BOARD_W } from "@/lib/whiteboard";
import { BOARD_CM, SOLIDS, netBounds, project, solidFacts, solidMesh, solidNet, type SolidKind } from "@/lib/solids";
import type { CompassState, SolidState } from "@/lib/boardTools";
import { Floating } from "@/components/live/board/MathPanels";
import { localPoint } from "@/components/live/board/rotation";

// What the compasses draw on the board: a whole circle, or an arc as a pen line.
export type GeoDraw = { kind: "ellipse" | "pen"; pts: number[] };

// ── Compasses ── The needle stays put; the pencil end opens them (the radius,
// in the ruler's centimetres) and turns. "Draw circle" draws the whole circle;
// with "Draw an arc" on, turning the pencil draws as it goes.
export function Compass({ c, host, onChange, onDraw }: { c: CompassState; host: boolean; onChange: (c: CompassState, final?: boolean) => void; onDraw: (s: GeoDraw) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const [arc, setArc] = useState(false);
  const nx = c.x * BOARD_W, ny = c.y * BOARD_H, d = c.r * BOARD_CM, t = (c.rot * Math.PI) / 180;
  const px = nx + d * Math.cos(t), py = ny + d * Math.sin(t);
  // The hinge sits above the middle, legs of a fixed length (longer if opened wide).
  const L = Math.max(d / 2 + 50, 9 * BOARD_CM), mx = (nx + px) / 2, my = (ny + py) / 2;
  let ux = -(py - ny), uy = px - nx; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul; if (uy > 0) { ux = -ux; uy = -uy; }
  const lift = Math.sqrt(Math.max(L * L - (d / 2) ** 2, 400)), hx = mx + ux * lift, hy = my + uy * lift;
  const at = (e: PointerEvent | React.PointerEvent) => { const [fx, fy] = localPoint(svg.current!, e.clientX, e.clientY); return [fx * BOARD_W, fy * BOARD_H] as const; };

  const drag = (which: "needle" | "pencil") => (e: React.PointerEvent) => {
    if (!host) return;
    e.preventDefault(); e.stopPropagation();
    const start = c, trail: number[] = [];
    let last = 0, cur = c;
    const step = (ev: PointerEvent) => {
      const [x, y] = at(ev);
      if (which === "needle") cur = { ...start, x: Math.min(1, Math.max(0, x / BOARD_W)), y: Math.min(1, Math.max(0, y / BOARD_H)) };
      else {
        const rot = ((Math.round((Math.atan2(y - ny, x - nx) * 180) / Math.PI) % 360) + 360) % 360;
        const r = arc ? start.r : Math.max(0.5, Math.min(20, Math.round((Math.hypot(x - nx, y - ny) / BOARD_CM) * 2) / 2));
        cur = { ...start, rot, r };
        if (arc) {
          const tt = (rot * Math.PI) / 180, R = start.r * BOARD_CM;
          trail.push(Math.round(((nx + R * Math.cos(tt)) / BOARD_W) * 10000) / 10000, Math.round(((ny + R * Math.sin(tt)) / BOARD_H) * 10000) / 10000);
        }
      }
      const n = Date.now(); if (n - last > 40) { last = n; onChange(cur); }
    };
    const up = () => {
      window.removeEventListener("pointermove", step); window.removeEventListener("pointerup", up);
      onChange(cur, true);
      if (arc && trail.length >= 4) onDraw({ kind: "pen", pts: trail });
    };
    window.addEventListener("pointermove", step); window.addEventListener("pointerup", up);
  };
  const circle = () => {
    const rx = d / BOARD_W, ry = d / BOARD_H;
    onDraw({ kind: "ellipse", pts: [c.x - rx, c.y - ry, c.x + rx, c.y + ry] });
  };
  const btn = "flex min-h-[34px] min-w-[34px] items-center justify-center rounded-lg bg-white px-2 text-xs font-black text-ink shadow ring-1 ring-black/10";
  return (
    <>
      <svg ref={svg} viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="pointer-events-none absolute inset-0 z-[16] h-full w-full" role="img" aria-label={`Compasses opened to ${c.r} centimetres`}>
        <line x1={nx} y1={ny} x2={px} y2={py} stroke="#1657C9" strokeWidth="2" strokeDasharray="8 6" opacity=".7" />
        <text x={mx + ux * 22} y={my + uy * 22} fontSize="22" fontWeight="800" fill="#1657C9" textAnchor="middle" fontFamily="Poppins, system-ui">r = {c.r} cm</text>
        <line x1={hx} y1={hy} x2={nx} y2={ny} stroke="#475569" strokeWidth="12" strokeLinecap="round" />
        <line x1={hx} y1={hy} x2={px} y2={py} stroke="#94A3B8" strokeWidth="12" strokeLinecap="round" />
        <polygon points={`${px - 7},${py - 16} ${px + 7},${py - 16} ${px},${py}`} fill="#F59E0B" transform={`rotate(${(Math.atan2(py - hy, px - hx) * 180) / Math.PI - 90} ${px} ${py})`} />
        <circle cx={hx} cy={hy} r="14" fill="#1E293B" />
        <circle cx={nx} cy={ny} r="5" fill="#DC2626" />
        {host && <circle cx={nx} cy={ny} r="26" fill="rgba(220,38,38,.12)" stroke="#DC2626" strokeWidth="2" className="pointer-events-auto cursor-move" onPointerDown={drag("needle")} aria-label="Move the compasses" />}
        {host && <circle cx={px} cy={py} r="26" fill={arc ? "rgba(245,158,11,.3)" : "rgba(22,87,201,.12)"} stroke={arc ? "#F59E0B" : "#1657C9"} strokeWidth="2" className="pointer-events-auto cursor-grab" onPointerDown={drag("pencil")} aria-label={arc ? "Turn to draw an arc" : "Open the compasses"} />}
      </svg>
      {host && (
        <div className="absolute left-1/2 top-12 z-[17] flex -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-xl bg-white/80 p-1 shadow ring-1 ring-black/10 backdrop-blur" role="toolbar" aria-label="Compasses">
          <span className="px-1 text-xs font-black text-ink/70">Compasses · {c.r} cm</span>
          <button type="button" className={btn} aria-label="Close the compasses a little" onClick={() => onChange({ ...c, r: Math.max(0.5, c.r - 0.5) }, true)}>−</button>
          <button type="button" className={btn} aria-label="Open the compasses a little" onClick={() => onChange({ ...c, r: Math.min(20, c.r + 0.5) }, true)}>+</button>
          <button type="button" className={btn} onClick={circle}>◯ Draw circle</button>
          <button type="button" className={`${btn} ${arc ? "!bg-amber-400" : ""}`} aria-pressed={arc} onClick={() => setArc(!arc)}>{arc ? "✏️ Drawing arcs" : "✏️ Draw an arc"}</button>
          <button type="button" className={btn} aria-label="Put the compasses away" onClick={() => onChange({ ...c, on: false }, true)}>✕</button>
        </div>
      )}
    </>
  );
}

// ── 3D shapes ── Turn it by dragging; change its size; see its net, volume and surface area.
const FACE = { fill: "#93C5FD", edge: "#1E3A8A" };
export function SolidPanel({ s, host, boxW, onChange }: { s: SolidState; host: boolean; boxW: number; onChange: (s: SolidState, final?: boolean) => void }) {
  const def = SOLIDS.find((x) => x.k === s.shape)!;
  const W = 320, H = 240;
  const width = Math.min(380, Math.max(300, boxW * 0.32));
  const facts = solidFacts(s.shape, s.a, s.b, s.c);
  const turn = (e: React.PointerEvent) => {
    if (!host) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, start = s;
    let last = 0, cur = s;
    const move = (ev: PointerEvent) => {
      cur = { ...start, yaw: ((Math.round(start.yaw + (ev.clientX - sx) * 0.7) % 360) + 360) % 360, pitch: Math.max(-89, Math.min(89, Math.round(start.pitch + (ev.clientY - sy) * 0.5))) };
      const n = Date.now(); if (n - last > 40) { last = n; onChange(cur); }
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); onChange(cur, true); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const chip = (on: boolean) => `min-h-[32px] rounded-lg px-2 text-[11px] font-black ${on ? "bg-[#1657C9] text-white" : "bg-slate-100 text-ink/70"}`;
  return (
    <Floating p={s} host={host} title="3D shapes" icon="solid" width={width} onChange={onChange}>
      <div className="grid gap-2 p-2">
        {host && (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Shape">
            {SOLIDS.map((x) => <button key={x.k} type="button" aria-pressed={s.shape === x.k} onClick={() => onChange({ ...s, shape: x.k as SolidKind, net: x.k === "sphere" ? false : s.net }, true)} className={chip(s.shape === x.k)}>{x.label}</button>)}
          </div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} className={`w-full rounded-xl bg-gradient-to-b from-slate-50 to-slate-100 ${host && !s.net ? "cursor-grab touch-none" : ""}`} onPointerDown={s.net ? undefined : turn}
          role="img" aria-label={s.net ? `The net of a ${def.label.toLowerCase()}` : `A ${def.label.toLowerCase()}${host ? " — drag to turn it" : ""}`}>
          {s.net ? <Net kind={s.shape} a={s.a} b={s.b} c={s.c} W={W} H={H} /> : <Solid3D s={s} W={W} H={H} />}
        </svg>
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          {def.dims.map((k) => (
            <label key={k} className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 ring-1 ring-slate-200">
              <span className="text-ink/60">{def.names[k]}</span>
              {host ? <input type="number" min={0.5} max={50} step={0.5} value={s[k]} aria-label={def.names[k]}
                onChange={(e) => { const v = Number(e.target.value); if (v >= 0.5 && v <= 50) onChange({ ...s, [k]: v }, true); }}
                className="w-14 rounded bg-white px-1 text-right font-black ring-1 ring-slate-200" /> : <span className="font-black">{s[k]}</span>}
              <span className="text-ink/45">cm</span>
            </label>
          ))}
        </div>
        {host && (
          <div className="flex flex-wrap gap-1">
            <button type="button" aria-pressed={s.net} disabled={s.shape === "sphere"} onClick={() => onChange({ ...s, net: !s.net }, true)} className={`${chip(s.net)} disabled:opacity-40`}>{s.net ? "Show it in 3D" : "Show the net"}</button>
            <button type="button" aria-pressed={s.facts} onClick={() => onChange({ ...s, facts: !s.facts }, true)} className={chip(s.facts)}>{s.facts ? "Hide the working" : "Volume & surface area"}</button>
          </div>
        )}
        {s.shape === "sphere" && s.net && <p className="text-xs font-bold text-ink/60">A sphere has no net — it can't be flattened.</p>}
        {s.facts && (
          <div className="rounded-xl bg-[#EEF6FF] p-2 font-mono text-[12px] font-bold leading-relaxed text-ink" aria-label="Volume and surface area">
            {facts.lines.map((l) => <p key={l}>{l}</p>)}
          </div>
        )}
      </div>
    </Floating>
  );
}

function Solid3D({ s, W, H }: { s: SolidState; W: number; H: number }) {
  const mesh = solidMesh(s.shape, s.a, s.b, s.c);
  const faces = mesh.map((f) => f.map((p) => project(p, s.yaw, s.pitch)));
  const all = faces.flat();
  const [x1, x2] = [Math.min(...all.map((p) => p[0])), Math.max(...all.map((p) => p[0]))];
  const [y1, y2] = [Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[1]))];
  const k = Math.min((W - 40) / (x2 - x1 || 1), (H - 40) / (y2 - y1 || 1));
  const X = (x: number) => W / 2 + (x - (x1 + x2) / 2) * k, Y = (y: number) => H / 2 + (y - (y1 + y2) / 2) * k;
  const curved = s.shape === "cylinder" || s.shape === "cone" || s.shape === "sphere";
  const order = faces.map((f, i) => ({ f, i, z: f.reduce((a, p) => a + p[2], 0) / f.length })).sort((a, b) => a.z - b.z);
  return (
    <g>
      {order.map(({ f, i }) => {
        // Light from the viewer: faces turned towards us are lighter.
        const [a, b, c] = [f[0], f[1], f[2]];
        const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        const len = Math.hypot(nz, 1e-9) || 1;
        const light = 0.55 + 0.45 * Math.min(1, Math.abs(nz) / (len * 1));
        const side = curved && f.length === 4 && !(s.shape === "sphere");
        const isCap = curved && f.length > 4;
        const fill = `rgba(147,197,253,${(0.55 * light + 0.25).toFixed(2)})`;
        return (
          <polygon key={i} points={f.map((p) => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ")}
            fill={fill} stroke={curved && !isCap ? fill : FACE.edge} strokeWidth={curved && !isCap ? 0.6 : 1.6} strokeLinejoin="round"
            opacity={side || s.shape === "sphere" ? 0.95 : 0.9} />
        );
      })}
    </g>
  );
}

function Net({ kind, a, b, c, W, H }: { kind: SolidKind; a: number; b: number; c: number; W: number; H: number }) {
  const parts = solidNet(kind, a, b, c);
  if (!parts.length) return <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="14" fontWeight="700" fill="#64748B">No net for a sphere</text>;
  const bb = netBounds(parts), k = Math.min((W - 20) / (bb.x2 - bb.x1 || 1), (H - 20) / (bb.y2 - bb.y1 || 1));
  const X = (x: number) => 10 + (x - bb.x1) * k + ((W - 20) - (bb.x2 - bb.x1) * k) / 2, Y = (y: number) => 10 + (y - bb.y1) * k + ((H - 20) - (bb.y2 - bb.y1) * k) / 2;
  return (
    <g fontFamily="Poppins, system-ui" fontSize="10" fontWeight="700" fill="#1E3A8A">
      {parts.map((p, i) => {
        if (p.kind === "poly") {
          const cx = p.pts.reduce((s, q) => s + q[0], 0) / p.pts.length, cy = p.pts.reduce((s, q) => s + q[1], 0) / p.pts.length;
          return <g key={i}><polygon points={p.pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")} fill="#BFDBFE" stroke={FACE.edge} strokeWidth="1.4" strokeDasharray={undefined} />{p.label && <text x={X(cx)} y={Y(cy) + 3} textAnchor="middle">{p.label}</text>}</g>;
        }
        if (p.kind === "circle") return <g key={i}><circle cx={X(p.cx)} cy={Y(p.cy)} r={p.r * k} fill="#BFDBFE" stroke={FACE.edge} strokeWidth="1.4" />{p.label && <text x={X(p.cx)} y={Y(p.cy) + 3} textAnchor="middle">{p.label}</text>}</g>;
        const r = p.r * k, f = (p.from * Math.PI) / 180, t = (p.to * Math.PI) / 180;
        const sx = X(p.cx) + r * Math.cos(f), sy = Y(p.cy) + r * Math.sin(f), ex = X(p.cx) + r * Math.cos(t), ey = Y(p.cy) + r * Math.sin(t);
        return <g key={i}><path d={`M ${X(p.cx)} ${Y(p.cy)} L ${sx} ${sy} A ${r} ${r} 0 ${p.to - p.from > 180 ? 1 : 0} 1 ${ex} ${ey} Z`} fill="#BFDBFE" stroke={FACE.edge} strokeWidth="1.4" />{p.label && <text x={X(p.cx)} y={Y(p.cy) + r * 0.6} textAnchor="middle">{p.label}</text>}</g>;
      })}
    </g>
  );
}
