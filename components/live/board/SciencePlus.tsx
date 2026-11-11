"use client";
import { useEffect, useRef } from "react";
import { Floating } from "@/components/live/board/MathPanels";
import { Step } from "@/components/live/board/LessonTools";
import {
  CURVE, DIRS, F_MAX, INDICATORS, INDICATOR_NAMES, MATTER_FACTS, MATTER_NAMES, M_MAX, PH_ITEMS, SCENES, SUBSTANCES, curvePoint, energyAt, indicatorColour, itemsNear, matterAt, motionText, neat, phClass,
  resultant, scene, sceneState, strengthText, substance, tempRange, workingText,
  type Dir, type ForceState, type Matter, type ParticleState, type PhState,
} from "@/lib/sciencePlus";

// Three more science tools that float over the board (lib/sciencePlus.ts): the
// particle model, the pH scale and forces. The teacher works them; learners
// see every change live.

type P<T> = { s: T; host: boolean; boxW: number; onChange: (s: T, final?: boolean) => void };
const chip = "min-h-[32px] rounded-lg bg-slate-100 px-2.5 text-xs font-black text-ink hover:bg-slate-200 disabled:opacity-40";
const chipOn = "min-h-[32px] rounded-lg bg-[#0E6E72] px-2.5 text-xs font-black text-white";
const field = "min-h-[32px] rounded-lg bg-slate-50 px-2 text-xs font-bold text-ink ring-1 ring-slate-200";
const small = "text-[11px] font-black text-ink/60";
const FONT = "Poppins, system-ui, sans-serif";

// ── Particle model ───────────────────────────────────────────────────────
// Forty particles in a box. Each screen runs its own copy of the motion; only
// the substance and the temperature travel over the class channel.
const BW = 300, BH = 220, R = 7, COUNT = 40, GAP = 15.5;
type Dot = { x: number; y: number; vx: number; vy: number };
const siteOf = (i: number): [number, number] => [BW / 2 + ((i % 8) - 3.5) * GAP, BH - R - 2 - Math.floor(i / 8) * GAP];
const startDots = (): Dot[] => Array.from({ length: COUNT }, (_, i) => { const [x, y] = siteOf(i); return { x, y, vx: 0, vy: 0 }; });
// What each particle is doing: 0 held in place, 1 sliding, 2 flying free.
const modeOf = (m: Matter, i: number) => (m === "solid" ? 0 : m === "melting" ? (i < COUNT / 2 ? 0 : 1) : m === "liquid" ? 1 : m === "boiling" ? (i < COUNT * 0.65 ? 1 : 2) : 2);
function stepDots(dots: Dot[], m: Matter, k: number, t: number) {
  dots.forEach((p, i) => {
    const mode = modeOf(m, i);
    if (mode === 0) {
      const [sx, sy] = siteOf(i), amp = 0.6 + 2.6 * k * 2.2;
      p.x += (sx + amp * Math.sin(t * 0.35 + i * 1.7) - p.x) * 0.25; p.y += (sy + amp * Math.cos(t * 0.41 + i * 2.3) - p.y) * 0.25; p.vx = p.vy = 0;
      return;
    }
    if (mode === 1) {
      const kick = 0.35 + 0.9 * k;
      p.vx = (p.vx + (Math.random() - 0.5) * kick * 2.2) * 0.94; p.vy = (p.vy + 0.32 + (Math.random() - 0.5) * kick) * 0.92;
    } else {
      const want = 2.2 + 3.4 * k; let sp = Math.hypot(p.vx, p.vy);
      if (sp < 0.2) { const a = Math.random() * Math.PI * 2; p.vx = Math.cos(a); p.vy = Math.sin(a); sp = 1; }
      const f = 1 + (want / sp - 1) * 0.12; p.vx *= f; p.vy *= f;
    }
    p.x += p.vx; p.y += p.vy;
    if (p.x < R) { p.x = R; p.vx = Math.abs(p.vx); } else if (p.x > BW - R) { p.x = BW - R; p.vx = -Math.abs(p.vx); }
    if (p.y < R) { p.y = R; p.vy = Math.abs(p.vy); } else if (p.y > BH - R) { p.y = BH - R; p.vy = -Math.abs(p.vy) * (mode === 1 ? 0.3 : 1); }
  });
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < COUNT; i++) for (let j = i + 1; j < COUNT; j++) {
    const a = dots[i], b = dots[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= 2 * R || d === 0) continue;
    const nx = dx / d, ny = dy / d, over = 2 * R - d, fa = modeOf(m, i) > 0, fb = modeOf(m, j) > 0;
    if (!fa && !fb) continue;
    const sa = fa ? (fb ? 0.5 : 1) : 0, sb = fb ? (fa ? 0.5 : 1) : 0;
    a.x -= nx * over * sa; a.y -= ny * over * sa; b.x += nx * over * sb; b.y += ny * over * sb;
    const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rel < 0) { if (fa) { a.vx += rel * nx * (fb ? 1 : 2); a.vy += rel * ny * (fb ? 1 : 2); } if (fb) { b.vx -= rel * nx * (fa ? 1 : 2); b.vy -= rel * ny * (fa ? 1 : 2); } }
  }
}
export function ParticlePanel({ s, host, boxW, onChange }: P<ParticleState>) {
  const width = Math.max(340, Math.min(760, boxW * 0.8));
  const sub = substance(s.sub), [lo, hi] = tempRange(sub), m = matterAt(sub, s.temp), k = energyAt(sub, s.temp);
  const canvas = useRef<HTMLCanvasElement>(null), dots = useRef<Dot[]>(startDots()), live = useRef({ m, k, colour: sub.colour });
  live.current = { m, k, colour: sub.colour };
  const set = (p: Partial<ParticleState>, final = true) => onChange({ ...s, ...p }, final);
  useEffect(() => {
    const c = canvas.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = BW * dpr; c.height = BH * dpr;
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, BW, BH);
      ctx.fillStyle = live.current.colour; ctx.strokeStyle = "rgba(11,18,32,.55)"; ctx.lineWidth = 1.2;
      for (const p of dots.current) { ctx.beginPath(); ctx.arc(p.x, p.y, R - 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    };
    let t = 0, raf = 0;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { for (let i = 0; i < 240; i++) stepDots(dots.current, live.current.m, live.current.k, t++); draw(); return; }
    const frame = () => { stepDots(dots.current, live.current.m, live.current.k, t++); draw(); raf = requestAnimationFrame(frame); };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [m, s.sub]);
  const [cx, cy] = curvePoint(sub, s.temp), gx = (x: number) => 30 + x * 200, gy = (y: number) => 92 - y * 78;
  return (
    <Floating p={s} host={host} title="Particle model" icon="particles" width={width} onChange={onChange}>
      <div className="flex flex-wrap items-start gap-2.5 p-2.5">
        <div className="min-w-0 flex-[3_1_280px]">
          <canvas ref={canvas} className="mx-auto block w-full max-w-[350px] rounded-xl bg-white ring-2 ring-slate-400" style={{ aspectRatio: `${BW} / ${BH}` }} role="img"
            aria-label={`Particles of ${sub.name.toLowerCase()} at ${neat(s.temp)} °C: ${MATTER_NAMES[m].toLowerCase()}. ${MATTER_FACTS[m][0]} ${MATTER_FACTS[m][1]}`} />
          <div className="mt-1.5 rounded-lg bg-slate-50 p-2" aria-live="polite" aria-label="State">
            <p className="text-base font-black"><span style={{ color: sub.colour }}>{MATTER_NAMES[m]}</span> <span className="font-mono text-sm text-ink/70">{neat(s.temp)} °C</span></p>
            <ul className="mt-0.5 list-disc pl-4 text-xs font-bold text-ink/80">{MATTER_FACTS[m].map((f) => <li key={f}>{f}</li>)}</ul>
          </div>
        </div>

        <div className="grid min-w-0 flex-[1_1_240px] gap-2">
          <svg viewBox="0 0 240 112" className="block w-full rounded-xl bg-white ring-1 ring-slate-200" role="img" style={{ fontFamily: FONT }} aria-label={`Heating curve for ${sub.name.toLowerCase()}: melts at ${neat(sub.melt)} °C, boils at ${neat(sub.boil)} °C`}>
            <path d="M30,8 V96 H236" fill="none" stroke="#94A3B8" strokeWidth={1.5} />
            <text x={8} y={56} fontSize={8} fontWeight={700} fill="#64748B" transform="rotate(-90 8 56)" textAnchor="middle">temperature</text><text x={133} y={108} fontSize={8} fontWeight={700} fill="#64748B" textAnchor="middle">heat added →</text>
            {[[0.3, sub.melt, "melts"], [0.7, sub.boil, "boils"]].map(([y, t, w]) => <g key={w as string}><line x1={30} x2={236} y1={gy(y as number)} y2={gy(y as number)} stroke="#CBD5E1" strokeDasharray="3 3" /><text x={34} y={gy(y as number) - 3} fontSize={8} fontWeight={700} fill="#64748B">{w} at {neat(t as number)} °C</text></g>)}
            <polyline points={CURVE.map(([x, y]) => `${gx(x)},${gy(y)}`).join(" ")} fill="none" stroke={sub.colour} strokeWidth={2.5} strokeLinejoin="round" />
            <circle cx={gx(cx)} cy={gy(cy)} r={5.5} fill="#0B1220" stroke="#fff" strokeWidth={2} />
          </svg>
          {host && (
            <>
              <label className={`grid gap-0.5 ${small}`}>Temperature
                <input type="range" min={lo} max={hi} step={1} value={s.temp} aria-label="Temperature slider" className="w-full accent-[#0E6E72]"
                  onChange={(e) => set({ temp: Number(e.target.value) }, false)} onPointerUp={() => onChange(s, true)} onKeyUp={() => onChange(s, true)} />
              </label>
              <Step label="Temperature" value={s.temp} min={lo} max={hi} onChange={(temp) => set({ temp })} show={`${neat(s.temp)}°`} />
              <div className="flex flex-wrap gap-1">
                <button type="button" className={chip} onClick={() => set({ temp: sub.melt })}>Melting point</button>
                <button type="button" className={chip} onClick={() => set({ temp: sub.boil })}>Boiling point</button>
                <button type="button" className={chip} disabled={s.temp <= lo} onClick={() => set({ temp: Math.max(lo, s.temp - Math.max(5, Math.round((hi - lo) / 20))) })}>Cool it</button>
                <button type="button" className={chip} disabled={s.temp >= hi} onClick={() => set({ temp: Math.min(hi, s.temp + Math.max(5, Math.round((hi - lo) / 20))) })}>Heat it</button>
              </div>
              <label className={`flex items-center gap-1.5 ${small}`}>Substance
                <select value={s.sub} aria-label="Substance" className={`${field} flex-1`} onChange={(e) => { const next = substance(e.target.value), [a] = tempRange(next); set({ sub: next.id, temp: Math.round(a + (next.melt - a) / 2) }); }}>
                  {SUBSTANCES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
            </>
          )}
        </div>
      </div>
    </Floating>
  );
}

// ── pH scale ─────────────────────────────────────────────────────────────
export function PhPanel({ s, host, boxW, onChange }: P<PhState>) {
  const width = Math.max(340, Math.min(760, boxW * 0.8));
  const set = (p: Partial<PhState>) => onChange({ ...s, ...p }, true);
  const shade = indicatorColour(s.ind, s.ph), near = itemsNear(s.ph), cell = 36, x0 = 30;
  return (
    <Floating p={s} host={host} title="pH scale" icon="ph" width={width} onChange={onChange}>
      <div className="grid gap-2 p-2.5">
        <svg viewBox="0 0 600 112" className="block w-full" role="group" style={{ fontFamily: FONT }} aria-label={`pH scale from 0 to 14, coloured for ${INDICATOR_NAMES[s.ind].toLowerCase()}`}>
          {Array.from({ length: 15 }, (_, k) => {
            const c = indicatorColour(s.ind, k), on = !s.hide && Math.round(s.ph) === k && Number.isInteger(s.ph);
            return (
              <g key={k} transform={`translate(${x0 + k * cell},30)`} role={host ? "button" : "img"} tabIndex={host ? 0 : undefined} aria-label={`pH ${k}: ${c.name}`} aria-pressed={host ? on : undefined} style={{ cursor: host ? "pointer" : undefined, outline: "none" }}
                onClick={host ? () => set({ ph: k, item: "" }) : undefined} onKeyDown={host ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set({ ph: k, item: "" }); } } : undefined}>
                <rect width={cell} height={44} fill={c.colour} stroke="#0B1220" strokeWidth={1} />
                <text x={cell / 2} y={28} textAnchor="middle" fontSize={15} fontWeight={800} fill={c.name === "colourless" || c.name === "yellow" ? "#0B1220" : "#fff"}>{k}</text>
              </g>
            );
          })}
          {!s.hide && <path d={`M${x0 + s.ph * cell + cell / 2 - 9},8 h18 l-9,18 Z`} fill="#0B1220" stroke="#fff" strokeWidth={1.5} />}
          <g fontSize={11} fontWeight={800} fill="#475569"><text x={x0} y={94}>← more acidic</text><text x={x0 + 7.5 * cell} y={94} textAnchor="middle">neutral</text><text x={x0 + 15 * cell} y={94} textAnchor="end">more alkaline →</text></g>
        </svg>

        <div className="flex flex-wrap items-start gap-2.5">
          <div className="flex min-w-0 flex-[1_1_240px] items-center gap-3 rounded-xl bg-slate-50 p-2.5" aria-live="polite" aria-label="Reading">
            <svg viewBox="0 0 90 110" className="w-[86px] shrink-0" role="img" aria-label={`A beaker of ${shade.name} liquid`}>
              <path d="M16,42 H74 V96 Q74,104 66,104 H24 Q16,104 16,96 Z" fill={shade.colour} fillOpacity={shade.name === "colourless" ? 0.9 : 0.85} />
              <path d="M12,8 H20 V96 Q20,104 28,104 H62 Q70,104 70,96 V8 H78" fill="none" stroke="#0B1220" strokeWidth={3} strokeLinejoin="round" transform="translate(0,0)" />
              <path d="M16,42 H74" stroke="#0B1220" strokeWidth={1} opacity={0.4} />
            </svg>
            <div className="min-w-0">
              <p className="text-2xl font-black leading-tight">pH {s.hide ? "?" : neat(s.ph)}</p>
              <p className="text-sm font-black" style={{ color: s.hide ? undefined : "#0A4F52" }}>{s.hide ? "Acid, alkali or neutral?" : phClass(s.ph)}</p>
              <p className="text-xs font-bold text-ink/75">{s.item ? `${s.item}: ` : ""}{INDICATOR_NAMES[s.ind].toLowerCase()} {shade.name === "colourless" ? "stays colourless" : `turns ${shade.name}`}.</p>
            </div>
          </div>
          <div className="min-w-0 flex-[1_1_240px] text-xs">
            {!s.hide && <p className="font-bold" aria-label="Strength">{strengthText(s.ph)}</p>}
            {!s.hide && near.length > 0 && <p className="mt-1 text-ink/70" aria-label="Examples">About this pH: {near.map((i) => `${i.name.toLowerCase()} (${neat(i.ph)})`).join(", ")}.</p>}
            {s.hide && <p className="font-bold">Look at the colour and read the pH off the scale.</p>}
          </div>
        </div>

        {host && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Step label="pH" value={s.ph} min={0} max={14} by={0.5} onChange={(ph) => set({ ph, item: "" })} show={neat(s.ph)} />
            <select value={s.item} aria-label="Put in the beaker" className={field} onChange={(e) => { const it = PH_ITEMS.find((i) => i.name === e.target.value); if (it) set({ ph: it.ph, item: it.name }); }}>
              <option value="">Put in the beaker…</option>{PH_ITEMS.map((i) => <option key={i.name} value={i.name}>{i.name}</option>)}
            </select>
            <button type="button" aria-pressed={s.hide} className={s.hide ? chipOn : chip} onClick={() => set({ hide: !s.hide })}>{s.hide ? "Quiz on — show the pH" : "Hide the pH (quiz)"}</button>
            <div className="flex w-full flex-wrap gap-1" role="group" aria-label="Indicator">
              {INDICATORS.map((i) => <button key={i} type="button" aria-pressed={s.ind === i} className={s.ind === i ? chipOn : chip} onClick={() => set({ ind: i })}>{INDICATOR_NAMES[i]}</button>)}
            </div>
          </div>
        )}
      </div>
    </Floating>
  );
}

// ── Forces ───────────────────────────────────────────────────────────────
const ARROW: Record<Dir, string> = { up: "↑", down: "↓", left: "←", right: "→" };
const UNIT: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export function ForcesPanel({ s, host, boxW, onChange }: P<ForceState>) {
  const width = Math.max(350, Math.min(800, boxW * 0.84));
  const sc = scene(s.scene), r = resultant(s), most = Math.max(1, s.up, s.down, s.left, s.right), set = (f: Partial<ForceState>) => onChange({ ...s, ...f }, true);
  const cx = 260, cy = 150, hw = 46, hh = 31, len = (n: number) => 26 + (84 * n) / most;
  const rl = Math.min(120, len(r.size)), ux = r.size ? r.x / r.size : 0, uy = r.size ? -r.y / r.size : 0;
  return (
    <Floating p={s} host={host} title="Forces" icon="forces" width={width} onChange={onChange}>
      <div className="flex flex-wrap items-start gap-2.5 p-2.5">
        <div className="min-w-0 flex-[3_1_320px]">
          <svg viewBox="0 0 520 300" className="block w-full rounded-xl bg-white ring-1 ring-slate-200" role="img" style={{ fontFamily: FONT }}
            aria-label={`${sc.name}: ${DIRS.filter((d) => s[d] > 0).map((d) => `${sc.names[d]} ${neat(s[d])} newtons ${d}`).join(", ") || "no forces"}.${s.show ? ` ${r.balanced ? "Balanced." : `Resultant ${neat(r.size)} newtons ${r.where}.`}` : ""}`}>
            <defs><marker id="fc-arrow" viewBox="0 0 10 10" refX={7} refY={5} markerWidth={5} markerHeight={5} orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="context-stroke" /></marker></defs>
            {sc.ground && <g><line x1={30} y1={cy + hh + 1} x2={490} y2={cy + hh + 1} stroke="#64748B" strokeWidth={2} />{Array.from({ length: 23 }, (_, i) => <line key={i} x1={36 + i * 20} y1={cy + hh + 2} x2={28 + i * 20} y2={cy + hh + 10} stroke="#CBD5E1" strokeWidth={1.5} />)}</g>}
            <rect x={cx - hw} y={cy - hh} width={hw * 2} height={hh * 2} rx={12} fill="#F1F5F9" stroke="#0B1220" strokeWidth={2.5} />
            <text x={cx} y={cy + 13} textAnchor="middle" fontSize={36}>{sc.emoji}</text>
            {DIRS.filter((d) => s[d] > 0).map((d) => {
              const [dx, dy] = UNIT[d], sx = cx + dx * hw, sy = cy + dy * hh, ex = sx + dx * len(s[d]), ey = sy + dy * len(s[d]), side = d === "left" ? "end" : d === "right" ? "start" : "start";
              const tx = d === "left" ? ex - 6 : d === "right" ? ex + 6 : ex + 9, ty = d === "up" ? ey + 6 : d === "down" ? ey - 8 : ey - 6;
              return (
                <g key={d}>
                  <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={d === "up" || d === "down" ? "#1D4ED8" : "#C2410C"} strokeWidth={4.5} markerEnd="url(#fc-arrow)" />
                  <text x={tx} y={ty} textAnchor={side} fontSize={11.5} fontWeight={800} fill="#0B1220" stroke="#fff" strokeWidth={3} paintOrder="stroke">{sc.names[d]}</text>
                  <text x={tx} y={ty + 14} textAnchor={side} fontSize={12} fontWeight={800} fill={d === "up" || d === "down" ? "#1D4ED8" : "#C2410C"} stroke="#fff" strokeWidth={3} paintOrder="stroke">{neat(s[d])} N</text>
                </g>
              );
            })}
            {s.show && !r.balanced && <g><line x1={cx} y1={cy} x2={cx + ux * rl} y2={cy + uy * rl} stroke="#7C3AED" strokeWidth={6} strokeDasharray="9 5" markerEnd="url(#fc-arrow)" opacity={0.9} /></g>}
            {s.show && <text x={12} y={22} fontSize={13} fontWeight={800} fill={r.balanced ? "#15803D" : "#6D28D9"}>{r.balanced ? "Balanced: resultant 0 N" : `Resultant ${neat(r.size)} N ${r.x && r.y ? "" : r.where}`}</text>}
          </svg>
          <div className="mt-1.5 rounded-lg bg-slate-50 p-2 text-xs" aria-live="polite" aria-label="Resultant">
            {s.show ? (
              <>
                <ul className="font-mono font-bold text-ink/75">{workingText(s).map((w) => <li key={w}>{w}</li>)}</ul>
                <p className="mt-1 text-sm font-bold leading-snug">{motionText(s)}</p>
              </>
            ) : <p className="text-sm font-black">What is the resultant force? Which way will it move, if at all?</p>}
          </div>
        </div>

        {host && (
          <div className="grid min-w-0 flex-[1_1_230px] gap-2">
            <label className={`flex items-center gap-1.5 ${small}`}>Scene
              <select value={s.scene} aria-label="Scene" className={`${field} flex-1`} onChange={(e) => set(sceneState(e.target.value))}>{SCENES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            </label>
            {DIRS.map((d) => <Step key={d} label={`${ARROW[d]} ${sc.names[d]}`} value={s[d]} min={0} max={F_MAX} by={sc.by} onChange={(v) => set({ [d]: v } as Partial<ForceState>)} show={`${neat(s[d])}`} />)}
            <Step label="Mass (kg)" value={s.mass} min={1} max={M_MAX} by={sc.mass >= 100 ? 50 : 1} onChange={(mass) => set({ mass })} show={`${s.mass}`} />
            <div className="flex flex-wrap gap-1">
              <button type="button" className={chip} onClick={() => set({ left: s.right, down: s.up })}>Balance them</button>
              <button type="button" aria-pressed={!s.show} className={s.show ? chip : chipOn} onClick={() => set({ show: !s.show })}>{s.show ? "Hide the resultant (predict first)" : "Show the resultant"}</button>
            </div>
            <p className="text-[11px] font-bold text-ink/55">Weight = mass × 10 N/kg. Forces are in newtons (N).</p>
          </div>
        )}
      </div>
    </Floating>
  );
}
