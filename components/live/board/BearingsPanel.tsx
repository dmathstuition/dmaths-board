"use client";
import { Floating } from "@/components/live/board/MathPanels";
import type { BearingState } from "@/lib/boardTools";
import { PRESETS, backBearing, backBearingLine, fromOnePoint, journey, norm, pad3, parts, r1, type Pt } from "@/lib/bearings";

// Bearings & distance on the board (lib/bearings.ts):
//   • Bearing — drag P round the compass: its bearing from O, the back
//     bearing, and the north/east parts of the distance;
//   • Journey — two legs (8 km on 040°, then 6 km on 120°): the diagram to
//     scale, and the working revealed one step at a time;
//   • From one point — two places from the same point (Activity B Q4).
// The teacher works it; learners see the same on their screens.

const TEAL = "#0E6E72", RED = "#C2451C", INK = "#0F2326", MUTED = "#64748B", GOLD = "#E8A317";
const rad = (d: number) => (d * Math.PI) / 180;
// A clockwise arc from bearing `from` to bearing `to`, around (cx, cy). Screen y points down.
function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const sweep = norm(to - from);
  if (sweep < 0.5) return "";
  const p = (b: number) => [cx + r * Math.sin(rad(b)), cy - r * Math.cos(rad(b))];
  const [x1, y1] = p(from), [x2, y2] = p(from + sweep);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}
const clampNum = (v: string, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

export function BearingsPanel({ s, host, boxW, onChange }: { s: BearingState; host: boolean; boxW: number; onChange: (s: BearingState, final?: boolean) => void }) {
  const width = Math.min(460, Math.max(320, boxW * 0.38));
  const set = (p: Partial<BearingState>, final = true) => onChange({ ...s, ...p }, final);
  const tab = (k: BearingState["mode"], label: string) => (
    <button type="button" role="tab" aria-selected={s.mode === k} onClick={() => set({ mode: k, step: 0 })} disabled={!host}
      className={`min-h-[34px] flex-1 rounded-lg px-2 text-[11px] font-black ${s.mode === k ? "bg-[#0E6E72] text-white" : "text-ink/70"}`}>{label}</button>
  );
  return (
    <Floating p={s} host={host} title="Bearings & distance" icon="compass" width={width} onChange={onChange}>
      <div className="grid gap-2 p-2 text-sm">
        <div role="tablist" aria-label="What to show" className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {tab("bearing", "Bearing")}{tab("journey", "Journey (2 legs)")}{tab("fan", "From one point")}
        </div>
        {s.mode === "bearing" ? <Compass s={s} host={host} set={set} onChange={onChange} /> : <Triangle s={s} host={host} set={set} />}
      </div>
    </Floating>
  );
}

// ── One bearing on a compass ──
function Compass({ s, host, set, onChange }: { s: BearingState; host: boolean; set: (p: Partial<BearingState>, final?: boolean) => void; onChange: (s: BearingState, final?: boolean) => void }) {
  const W = 300, C = 150, R = 112;
  const b = norm(s.b);
  const P = { x: C + R * Math.sin(rad(b)), y: C - R * Math.cos(rad(b)) };
  const back = backBearing(b);
  const pr = parts(s.d, b);
  function drag(e: React.PointerEvent<SVGSVGElement>) {
    if (!host) return;
    e.preventDefault();
    const svg = e.currentTarget, box = svg.getBoundingClientRect();
    const at = (ev: { clientX: number; clientY: number }) => {
      const x = ((ev.clientX - box.left) / box.width) * W - C, y = ((ev.clientY - box.top) / box.height) * W - C;
      return Math.round(norm((Math.atan2(x, -y) * 180) / Math.PI)) % 360;
    };
    let last = 0, cur = at(e);
    onChange({ ...s, b: cur });
    const move = (ev: PointerEvent) => { cur = at(ev); const n = Date.now(); if (n - last > 40) { last = n; onChange({ ...s, b: cur }); } };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); onChange({ ...s, b: cur }, true); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }
  // North/east parts drawn from O: along the north–south line, then across.
  const foot = { x: C, y: P.y };
  return (
    <>
      <svg viewBox={`0 0 ${W} ${W}`} className={`w-full rounded-xl bg-slate-50 ${host ? "cursor-pointer touch-none" : ""}`} onPointerDown={drag}
        role="img" aria-label={`Bearing of P from O is ${pad3(b)} degrees${host ? ". Drag round the circle to change it" : ""}`}>
        <circle cx={C} cy={C} r={R} fill="#fff" stroke="#CBD5E1" strokeWidth={2} />
        {Array.from({ length: 36 }, (_, i) => {
          const a = i * 10, long = a % 90 === 0, mid = a % 45 === 0;
          const r1v = R - (long ? 12 : mid ? 9 : 5);
          return <line key={a} x1={C + R * Math.sin(rad(a))} y1={C - R * Math.cos(rad(a))} x2={C + r1v * Math.sin(rad(a))} y2={C - r1v * Math.cos(rad(a))} stroke="#94A3B8" strokeWidth={long ? 2 : 1} />;
        })}
        {[["N", 0], ["E", 90], ["S", 180], ["W", 270]].map(([t, a]) => (
          <text key={t as string} x={C + (R + 16) * Math.sin(rad(a as number))} y={C - (R + 16) * Math.cos(rad(a as number)) + 5} textAnchor="middle" fontSize="15" fontWeight="800" fill={MUTED}>{t}</text>
        ))}
        <line x1={C} y1={C} x2={C} y2={C - R} stroke={MUTED} strokeWidth={1.5} strokeDasharray="5 4" />
        {s.parts && (
          <g>
            <line x1={C} y1={C} x2={foot.x} y2={foot.y} stroke={GOLD} strokeWidth={3} />
            <line x1={foot.x} y1={foot.y} x2={P.x} y2={P.y} stroke={GOLD} strokeWidth={3} strokeDasharray="6 4" />
            <text x={C + (P.x > C ? -6 : 6)} y={(C + foot.y) / 2} textAnchor={P.x > C ? "end" : "start"} fontSize="11" fontWeight="800" fill="#8A5A0B">{pr.ns} {r1(pr.nsLen)}</text>
            <text x={(C + P.x) / 2} y={foot.y + (P.y < C ? -6 : 14)} textAnchor="middle" fontSize="11" fontWeight="800" fill="#8A5A0B">{pr.ew} {r1(pr.ewLen)}</text>
          </g>
        )}
        <path d={arc(C, C, 34, 0, b)} fill="none" stroke={RED} strokeWidth={3} />
        <line x1={C} y1={C} x2={P.x} y2={P.y} stroke={TEAL} strokeWidth={4} strokeLinecap="round" />
        {s.back && (
          <g>
            <line x1={P.x} y1={P.y} x2={P.x} y2={P.y - 46} stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={P.x} y={P.y - 50} textAnchor="middle" fontSize="11" fontWeight="800" fill={MUTED}>N</text>
            <path d={arc(P.x, P.y, 22, 0, back)} fill="none" stroke="#7C3AED" strokeWidth={3} />
          </g>
        )}
        <circle cx={C} cy={C} r={6} fill={INK} />
        <text x={C - 10} y={C + 20} fontSize="14" fontWeight="800" fill={INK}>O</text>
        <circle cx={P.x} cy={P.y} r={9} fill={GOLD} stroke="#fff" strokeWidth={3} />
        <text x={P.x + (P.x >= C ? 12 : -24)} y={P.y + (P.y < C ? -8 : 18)} fontSize="14" fontWeight="800" fill={INK}>P</text>
        <text x={C + 40 * Math.sin(rad(Math.max(b, 30) / 2))} y={C - 46 * Math.cos(rad(Math.max(b, 30) / 2))} textAnchor="middle" fontSize="14" fontWeight="900" fill={RED}>{pad3(b)}°</text>
      </svg>
      <div className="grid gap-1 rounded-xl bg-[#E2F3F2] p-2 text-[13px] font-bold text-[#0A4F52]" aria-live="polite">
        <p>Bearing of P from O = <span className="font-black">{pad3(b)}°</span> <span className="font-semibold text-ink/60">— from North, clockwise, 3 figures</span></p>
        {s.back && <p className="text-[#5B21B6]">Back bearing (O from P) = {backBearingLine(b)}</p>}
        {s.parts && <>{pr.lines.map((l) => <p key={l} className="text-[#8A5A0B]">{l} {s.unit}</p>)}</>}
      </div>
      {host && (
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="flex items-center gap-1 text-xs font-black text-ink/70">Bearing
              <input type="number" min={0} max={359} value={b} onChange={(e) => set({ b: clampNum(e.target.value, 0, 359, b) })} className="w-16 rounded-lg bg-white px-2 py-1 text-sm ring-1 ring-slate-200" aria-label="Bearing in degrees" />°
            </label>
            {[50, 130, 220, 310].map((v) => <button key={v} type="button" onClick={() => set({ b: v })} className="min-h-[32px] rounded-lg bg-slate-100 px-2 text-[11px] font-black text-ink/70">{pad3(v)}°</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="flex min-h-[32px] items-center gap-1.5 rounded-lg bg-slate-50 px-2 text-xs font-black text-ink/75"><input type="checkbox" checked={s.back} onChange={(e) => set({ back: e.target.checked })} className="h-4 w-4 accent-violet-600" /> Back bearing</label>
            <label className="flex min-h-[32px] items-center gap-1.5 rounded-lg bg-slate-50 px-2 text-xs font-black text-ink/75"><input type="checkbox" checked={s.parts} onChange={(e) => set({ parts: e.target.checked })} className="h-4 w-4 accent-amber-500" /> North &amp; east parts</label>
            {s.parts && (
              <label className="flex items-center gap-1 text-xs font-black text-ink/70">Distance
                <input type="number" min={0.1} max={9999} step="any" value={s.d} onChange={(e) => set({ d: clampNum(e.target.value, 0.1, 9999, s.d) })} className="w-16 rounded-lg bg-white px-2 py-1 text-sm ring-1 ring-slate-200" aria-label="Distance" /> {s.unit}
              </label>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── A journey of two legs, or two places from one point ──
function Triangle({ s, host, set }: { s: BearingState; host: boolean; set: (p: Partial<BearingState>, final?: boolean) => void }) {
  const solved = s.mode === "journey" ? journey(s.d1, s.b1, s.d2, s.b2, s.names, s.unit) : fromOnePoint(s.d1, s.b1, s.d2, s.b2, s.names, s.unit);
  const [p0, p1, p2] = solved.pts;
  const [n0, n1, n2] = s.names;
  // Fit the three points into the picture (y up → screen y down).
  const W = 320, H = 250, pad = 34;
  const xs = solved.pts.map((p) => p.x), ys = solved.pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const k = Math.min((W - pad * 2) / Math.max(1e-6, maxX - minX), (H - pad * 2 - 20) / Math.max(1e-6, maxY - minY));
  const ox = (W - (maxX - minX) * k) / 2, oy = (H - (maxY - minY) * k) / 2 + 10;
  const sc = (p: Pt) => ({ x: ox + (p.x - minX) * k, y: oy + (maxY - p.y) * k });
  const [A, B, Cc] = solved.pts.map(sc);
  // The legs given, and the side asked for.
  const legs = s.mode === "journey" ? [[A, B, s.d1, s.b1], [B, Cc, s.d2, s.b2]] as const : [[A, B, s.d1, s.b1], [A, Cc, s.d2, s.b2]] as const;
  const asked = s.mode === "journey" ? [A, Cc] : [B, Cc];
  const northAt = s.mode === "journey" ? [A, B] : [A];
  const done = s.step >= solved.steps.length;
  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  // A length label beside its line, on the side away from the middle of the triangle.
  const G = { x: (A.x + B.x + Cc.x) / 3, y: (A.y + B.y + Cc.y) / 3 };
  const beside = (a: { x: number; y: number }, b: { x: number; y: number }, gap = 18) => {
    const m = mid(a, b), dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L;
    if ((m.x + nx - G.x) ** 2 + (m.y + ny - G.y) ** 2 < (m.x - nx - G.x) ** 2 + (m.y - ny - G.y) ** 2) { nx = -nx; ny = -ny; }
    return { x: m.x + nx * gap, y: m.y + ny * gap + 4 };
  };
  const label = (p: { x: number; y: number }, t: string) => <text x={p.x + (p.x > W / 2 ? 10 : -10)} y={p.y + (p.y > H / 2 ? 18 : -9)} textAnchor={p.x > W / 2 ? "start" : "end"} fontSize="14" fontWeight="900" fill={INK}>{t}</text>;
  const question = s.mode === "journey"
    ? `${n1} is ${r1(s.d1)} ${s.unit} from ${n0} on a bearing of ${pad3(s.b1)}°. ${n2} is ${r1(s.d2)} ${s.unit} from ${n1} on a bearing of ${pad3(s.b2)}°. Find ${n0}${n2} and the bearing of ${n2} from ${n0}.`
    : `${n1} is ${r1(s.d1)} ${s.unit} from ${n0} on a bearing of ${pad3(s.b1)}°. ${n2} is ${r1(s.d2)} ${s.unit} from ${n0} on a bearing of ${pad3(s.b2)}°. Find ${n1}${n2} and the bearing of ${n2} from ${n1}.`;
  const num = (key: "d1" | "b1" | "d2" | "b2", lab: string, lo: number, hi: number) => (
    <label className="flex items-center gap-1 text-[11px] font-black text-ink/70">{lab}
      <input type="number" min={lo} max={hi} step="any" value={s[key]} onChange={(e) => set({ [key]: clampNum(e.target.value, lo, hi, s[key]), step: 0 } as Partial<BearingState>)} className="w-[4.2rem] rounded-lg bg-white px-1.5 py-1 text-sm ring-1 ring-slate-200" aria-label={lab} />
    </label>
  );
  return (
    <>
      <p className="rounded-xl bg-slate-50 p-2 text-[13px] font-semibold leading-snug text-ink">{question}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-slate-50" role="img" aria-label={`Diagram: ${question}`}>
        {northAt.map((p, i) => (
          <g key={i}>
            <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 44} stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={p.x} y={p.y - 48} textAnchor="middle" fontSize="11" fontWeight="800" fill={MUTED}>N</text>
          </g>
        ))}
        {legs.map(([from, , , b], i) => <path key={`a${i}`} d={arc(from.x, from.y, 20 + i * 4, 0, b)} fill="none" stroke={RED} strokeWidth={2.5} />)}
        <line x1={asked[0].x} y1={asked[0].y} x2={asked[1].x} y2={asked[1].y} stroke={done ? INK : MUTED} strokeWidth={2} strokeDasharray="6 4" />
        {legs.map(([from, to, d], i) => (
          <g key={`l${i}`}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={TEAL} strokeWidth={3.5} strokeLinecap="round" />
            <text x={beside(from, to).x} y={beside(from, to).y} textAnchor="middle" fontSize="12" fontWeight="800" fill={TEAL}>{r1(d)} {s.unit}</text>
          </g>
        ))}
        {legs.map(([from, , , b], i) => { const r = 36 + i * 6, h = rad(Math.max(b, 24) / 2); return <text key={`b${i}`} x={from.x + r * Math.sin(h)} y={from.y - r * Math.cos(h) + 4} textAnchor="middle" fontSize="11" fontWeight="900" fill={RED}>{pad3(b)}°</text>; })}
        <text x={beside(asked[0], asked[1]).x} y={beside(asked[0], asked[1]).y} textAnchor="middle" fontSize="12" fontWeight="800" fill={done ? INK : MUTED}>{done ? `${r1(solved.length)} ${s.unit}` : "?"}</text>
        {[A, B, Cc].map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={5.5} fill={i === (s.mode === "journey" ? 2 : 2) ? GOLD : INK} />)}
        {label(A, n0)}{label(B, n1)}{label(Cc, n2)}
      </svg>
      <ol className="grid gap-1" aria-label="Working" aria-live="polite">
        {solved.steps.slice(0, s.step).map((t, i) => (
          <li key={i} className={`rounded-lg px-2 py-1.5 text-[13px] font-bold ${i === solved.steps.length - 1 ? "bg-[#0E6E72] text-white" : "bg-[#E2F3F2] text-[#0A4F52]"}`}><span className="mr-1 text-[11px] opacity-70">{i + 1}.</span>{t}</li>
        ))}
        {!s.step && <li className="text-xs font-semibold text-ink/55">{host ? "Ask the class first, then reveal the working one step at a time." : "Work it out — your teacher will show the steps."}</li>}
      </ol>
      {done && <p className="rounded-xl bg-[#C6F35C] px-2 py-1.5 text-[13px] font-black text-[#0F2326]">Answer: {solved.answer}</p>}
      {host && (
        <div className="grid gap-1.5 border-t border-slate-100 pt-2">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => set({ step: Math.min(solved.steps.length, s.step + 1) })} disabled={done} className="min-h-[36px] rounded-lg bg-[#0E6E72] px-3 text-xs font-black text-white disabled:opacity-40">Next step</button>
            <button type="button" onClick={() => set({ step: solved.steps.length })} disabled={done} className="min-h-[36px] rounded-lg bg-slate-100 px-3 text-xs font-black text-ink/70 disabled:opacity-40">Show all</button>
            <button type="button" onClick={() => set({ step: 0 })} disabled={!s.step} className="min-h-[36px] rounded-lg bg-slate-100 px-3 text-xs font-black text-ink/70 disabled:opacity-40">Hide working</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {num("d1", `${n0}${n1}`, 0.1, 9999)}{num("b1", "bearing", 0, 359)}{num("d2", s.mode === "journey" ? `${n1}${n2}` : `${n0}${n2}`, 0.1, 9999)}{num("b2", "bearing", 0, 359)}
          </div>
          <div className="flex flex-wrap gap-1" aria-label="Examples from the lesson">
            {PRESETS.filter((p) => p.kind === s.mode).map((p) => (
              <button key={p.id} type="button" onClick={() => set({ d1: p.d1, b1: p.b1, d2: p.d2, b2: p.b2, names: p.names, step: 0 })} className="min-h-[32px] rounded-lg bg-slate-100 px-2 text-[11px] font-black text-ink/70">{p.label}</button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
