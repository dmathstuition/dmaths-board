"use client";
import { useRef, useState } from "react";
import { Floating } from "@/components/live/board/MathPanels";
import { ELEMENTS } from "@/lib/scienceTools";
import {
  GRID, KINDS, KIND_NAMES, MAX_CARDS, MAX_E, MAX_GROUPS, MAX_N, MAX_P, MIN_GROUPS, MIRRORS, SCALES, SHAPES, SHAPE_IDS, SORT_PRESETS, TURNS, atomFacts, buildSort, clampAt, commonN, describe,
  facts, imagePts, mirrorName, mixAgain, moveCard, num, objectPts, offGrid, parseCards, point, sortGroups, sortScore,
  type AtomState, type Mirror, type Pt, type SortState, type TransformState,
} from "@/lib/lessonTools";

// Three more tools that float over the board (lib/lessonTools.ts): the
// transformations grid, the atom builder and the card sort. The teacher works
// them; learners see every change live.

type P<T> = { s: T; host: boolean; boxW: number; onChange: (s: T, final?: boolean) => void };
const chip = "min-h-[32px] rounded-lg bg-slate-100 px-2.5 text-xs font-black text-ink hover:bg-slate-200 disabled:opacity-40";
const chipOn = "min-h-[32px] rounded-lg bg-[#0E6E72] px-2.5 text-xs font-black text-white";
const primary = "min-h-[32px] rounded-lg bg-[#0E6E72] px-3 text-xs font-black text-white hover:bg-[#0A4F52] disabled:opacity-40";
const field = "min-h-[32px] w-full rounded-lg bg-slate-50 px-2 text-xs font-bold text-ink ring-1 ring-slate-200";
const small = "text-[11px] font-black text-ink/60";
const FONT = "Poppins, system-ui, sans-serif";

export function Step({ label, value, min, max, onChange, show }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; show?: string }) {
  return (
    <span className={`flex items-center gap-1 ${small}`} role="group" aria-label={label}>
      <span className="min-w-[4.2rem]">{label}</span>
      <button type="button" className={`${chip} w-8 px-0`} aria-label={`${label}: one less`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <span className="w-7 text-center font-mono text-sm text-ink" aria-live="polite">{show ?? num(value)}</span>
      <button type="button" className={`${chip} w-8 px-0`} aria-label={`${label}: one more`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </span>
  );
}

// ── Transformations grid ─────────────────────────────────────────────────
const U = 22, PAD = 14, W = PAD * 2 + U * 2 * GRID;
const X = (x: number) => PAD + (x + GRID) * U, Y = (y: number) => PAD + (GRID - y) * U;
const LETTERS = "ABCDEF";
const path = (pts: Pt[]) => `${pts.map(([x, y], i) => `${i ? "L" : "M"}${X(x)},${Y(y)}`).join(" ")} Z`;
const MIRROR_CHIPS: Record<Mirror, string> = { x: "x-axis", y: "y-axis", "y=x": "y = x", "y=-x": "y = −x", "x=k": "x = a number", "y=k": "y = a number" };
function mirrorLine(m: Mirror, k: number): [Pt, Pt] {
  const G = GRID;
  return m === "x" ? [[-G, 0], [G, 0]] : m === "y" ? [[0, -G], [0, G]] : m === "y=x" ? [[-G, -G], [G, G]] : m === "y=-x" ? [[-G, G], [G, -G]] : m === "x=k" ? [[k, -G], [k, G]] : [[-G, k], [G, k]];
}
// Corner letters, set a little outside the shape.
function Corners({ pts, dash, fill }: { pts: Pt[]; dash: string; fill: string }) {
  const cx = pts.reduce((a, p) => a + X(p[0]), 0) / pts.length, cy = pts.reduce((a, p) => a + Y(p[1]), 0) / pts.length;
  return <>{pts.map((p, i) => {
    const dx = X(p[0]) - cx, dy = Y(p[1]) - cy, d = Math.hypot(dx, dy) || 1;
    return <text key={i} x={X(p[0]) + (dx / d) * 10} y={Y(p[1]) + (dy / d) * 10 + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill={fill} stroke="#fff" strokeWidth={3} paintOrder="stroke">{LETTERS[i]}{dash}</text>;
  })}</>;
}
export function TransformPanel({ s, host, boxW, onChange }: P<TransformState>) {
  const width = Math.max(360, Math.min(720, boxW * 0.76));
  const svg = useRef<SVGSVGElement>(null), live = useRef(s);
  live.current = s;
  const set = (t: Partial<TransformState>) => onChange({ ...live.current, ...t }, true);
  const obj = objectPts(s), img = imagePts(s), needsCentre = s.kind === "rotate" || s.kind === "enlarge";
  // Drag the shape, or the centre, across the grid: it snaps to whole squares.
  function drag(e: React.PointerEvent, what: "shape" | "centre") {
    if (!host || !svg.current) return;
    e.preventDefault();
    const cell = (svg.current.getBoundingClientRect().width / W) * U, sx = e.clientX, sy = e.clientY, start = what === "shape" ? s.at : s.centre;
    let last = start;
    const put = (ev: PointerEvent, final: boolean) => {
      const raw: Pt = [start[0] + Math.round((ev.clientX - sx) / cell), start[1] - Math.round((ev.clientY - sy) / cell)], cur = live.current;
      const p: Pt = what === "shape" ? clampAt(cur.shape, raw) : [Math.max(-GRID, Math.min(GRID, raw[0])), Math.max(-GRID, Math.min(GRID, raw[1]))];
      if (!final && p[0] === last[0] && p[1] === last[1]) return;
      last = p;
      onChange(what === "shape" ? { ...cur, at: p } : { ...cur, centre: p }, final);
    };
    const move = (ev: PointerEvent) => put(ev, false);
    const up = (ev: PointerEvent) => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); put(ev, true); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }
  const nudge = (dx: number, dy: number) => set({ at: clampAt(s.shape, [s.at[0] + dx, s.at[1] + dy]) });
  const [m1, m2] = mirrorLine(s.mirror, s.k);
  const ticks = Array.from({ length: 2 * GRID + 1 }, (_, i) => i - GRID);
  return (
    <Floating p={s} host={host} title="Transformations" icon="transform" width={width} onChange={onChange}>
      <div className="flex flex-wrap items-start gap-2.5 p-2.5">
        <div className="min-w-0 flex-[3_1_300px]">
          <svg ref={svg} viewBox={`0 0 ${W} ${W}`} className="block w-full rounded-xl bg-white ring-1 ring-slate-200" role="img" style={{ fontFamily: FONT }}
            aria-label={`Grid: ${SHAPES[s.shape].name.toLowerCase()} with corners ${obj.map(point).join(", ")}. ${describe(s)}.${s.show ? ` Image corners ${img.map(point).join(", ")}.` : " The image is hidden."}`}>
            {ticks.map((t) => <g key={t} stroke={t === 0 ? "#0B1220" : "#E2E8F0"} strokeWidth={t === 0 ? 1.6 : 1}><line x1={X(t)} y1={Y(-GRID)} x2={X(t)} y2={Y(GRID)} /><line x1={X(-GRID)} y1={Y(t)} x2={X(GRID)} y2={Y(t)} /></g>)}
            <line x1={X(0)} y1={Y(-GRID)} x2={X(0)} y2={Y(GRID)} stroke="#0B1220" strokeWidth={1.6} /><line x1={X(-GRID)} y1={Y(0)} x2={X(GRID)} y2={Y(0)} stroke="#0B1220" strokeWidth={1.6} />
            {ticks.filter((t) => t % 2 === 0 && t !== 0).map((t) => <g key={t} fontSize={8.5} fontWeight={700} fill="#64748B"><text x={X(t)} y={Y(0) + 11} textAnchor="middle">{num(t)}</text><text x={X(0) - 4} y={Y(t) + 3} textAnchor="end">{num(t)}</text></g>)}
            <text x={X(GRID) - 2} y={Y(0) - 5} textAnchor="end" fontSize={10} fontWeight={800} fontStyle="italic">x</text><text x={X(0) + 6} y={Y(GRID) + 8} fontSize={10} fontWeight={800} fontStyle="italic">y</text>
            {s.kind === "reflect" && <line x1={X(m1[0])} y1={Y(m1[1])} x2={X(m2[0])} y2={Y(m2[1])} stroke="#7C3AED" strokeWidth={2.6} strokeDasharray="8 5" />}
            {s.show && s.kind !== "reflect" && obj.map((p, i) => {
              const q = img[i], from = needsCentre ? s.centre : p;
              return <line key={i} x1={X(from[0])} y1={Y(from[1])} x2={X(q[0])} y2={Y(q[1])} stroke="#7C3AED" strokeWidth={1.1} strokeDasharray="4 4" opacity={needsCentre || i === 0 ? 0.8 : 0.35} />;
            })}
            {s.show && s.kind === "rotate" && obj.map((p, i) => <line key={i} x1={X(s.centre[0])} y1={Y(s.centre[1])} x2={X(p[0])} y2={Y(p[1])} stroke="#7C3AED" strokeWidth={1.1} strokeDasharray="4 4" opacity={0.8} />)}
            {s.show && <g><path d={path(img)} fill="#F97316" fillOpacity={0.3} stroke="#C2410C" strokeWidth={2.2} strokeLinejoin="round" /><Corners pts={img} dash="′" fill="#9A3412" /></g>}
            <path data-object d={path(obj)} fill="#3B82F6" fillOpacity={0.35} stroke="#1D4ED8" strokeWidth={2.2} strokeLinejoin="round" onPointerDown={(e) => drag(e, "shape")} style={{ cursor: host ? "grab" : undefined, touchAction: "none" }} />
            <Corners pts={obj} dash="" fill="#1E3A8A" />
            {needsCentre && <g onPointerDown={(e) => drag(e, "centre")} style={{ cursor: host ? "grab" : undefined, touchAction: "none" }}>
              <circle cx={X(s.centre[0])} cy={Y(s.centre[1])} r={11} fill="transparent" /><circle cx={X(s.centre[0])} cy={Y(s.centre[1])} r={4.5} fill="#7C3AED" stroke="#fff" strokeWidth={1.5} />
            </g>}
          </svg>
          <div className="mt-1.5 rounded-lg bg-slate-50 p-2 text-xs" aria-live="polite" aria-label="Description">
            <p className="font-black">{describe(s)}</p>
            <p className="mt-0.5 text-ink/65">{s.show ? facts(s) : "Where will the image be? Decide each corner, then show it."}{s.show && offGrid(s) ? " Part of the image is off the grid." : ""}</p>
          </div>
        </div>

        <div className="grid min-w-0 flex-[1_1_220px] gap-2">
          <table className="w-full text-xs" aria-label="Corners">
            <thead><tr className="text-left text-[10px] font-bold uppercase tracking-wide text-ink/45"><th className="font-bold">Corner</th><th className="font-bold text-[#1D4ED8]">Object</th><th className="font-bold text-[#C2410C]">Image</th></tr></thead>
            <tbody className="font-mono font-bold">{obj.map((p, i) => <tr key={i}><td className="font-sans font-black">{LETTERS[i]}</td><td>{point(p)}</td><td>{s.show ? point(img[i]) : "?"}</td></tr>)}</tbody>
          </table>
          {host && (
            <>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Transformation">
                {KINDS.map((k) => <button key={k} type="button" aria-pressed={s.kind === k} className={s.kind === k ? chipOn : chip} onClick={() => set({ kind: k })}>{KIND_NAMES[k]}</button>)}
              </div>
              {s.kind === "reflect" && (
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Mirror line">
                  <span className={`w-full ${small}`}>Mirror line</span>
                  {MIRRORS.map((m) => <button key={m} type="button" aria-pressed={s.mirror === m} className={s.mirror === m ? chipOn : chip} onClick={() => set({ mirror: m })}>{MIRROR_CHIPS[m]}</button>)}
                  {(s.mirror === "x=k" || s.mirror === "y=k") && <Step label={`${s.mirror[0]} =`} value={s.k} min={-GRID} max={GRID} onChange={(k) => set({ k })} />}
                </div>
              )}
              {s.kind === "rotate" && (
                <div className="flex flex-wrap gap-1" role="group" aria-label="Turn">
                  {TURNS.map((t) => <button key={t} type="button" aria-pressed={s.turn === t} className={s.turn === t ? chipOn : chip} onClick={() => set({ turn: t })}>{t === 90 ? "90° anticlockwise" : t === 180 ? "180°" : "90° clockwise"}</button>)}
                </div>
              )}
              {s.kind === "translate" && (
                <div className="grid gap-1" role="group" aria-label="Vector">
                  <Step label="Right" value={s.by[0]} min={-2 * GRID} max={2 * GRID} onChange={(v) => set({ by: [v, s.by[1]] })} />
                  <Step label="Up" value={s.by[1]} min={-2 * GRID} max={2 * GRID} onChange={(v) => set({ by: [s.by[0], v] })} />
                </div>
              )}
              {s.kind === "enlarge" && (
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Scale factor">
                  <span className={`w-full ${small}`}>Scale factor</span>
                  {SCALES.map((k) => <button key={k} type="button" aria-pressed={s.scale === k} className={s.scale === k ? chipOn : chip} onClick={() => set({ scale: k })}>×{num(k)}</button>)}
                </div>
              )}
              {needsCentre && (
                <div className="grid gap-1" role="group" aria-label="Centre">
                  <Step label="Centre x" value={s.centre[0]} min={-GRID} max={GRID} onChange={(v) => set({ centre: [v, s.centre[1]] })} />
                  <Step label="Centre y" value={s.centre[1]} min={-GRID} max={GRID} onChange={(v) => set({ centre: [s.centre[0], v] })} />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Shape">
                <select value={s.shape} aria-label="Shape" className={`${field} w-auto flex-1`} onChange={(e) => set({ shape: e.target.value as TransformState["shape"], at: clampAt(e.target.value as TransformState["shape"], s.at) })}>
                  {SHAPE_IDS.map((id) => <option key={id} value={id}>{SHAPES[id].name}</option>)}
                </select>
                {([["←", "left", -1, 0], ["↑", "up", 0, 1], ["↓", "down", 0, -1], ["→", "right", 1, 0]] as const).map(([a, word, dx, dy]) => <button key={word} type="button" className={`${chip} w-8 px-0`} aria-label={`Move the shape ${word}`} onClick={() => nudge(dx, dy)}>{a}</button>)}
              </div>
              <button type="button" aria-pressed={!s.show} className={s.show ? chip : chipOn} onClick={() => set({ show: !s.show })}>{s.show ? "Hide the image (predict first)" : "Show the image"}</button>
              <p className="text-[11px] font-bold text-ink/55">Drag the blue shape{needsCentre ? " or the purple centre" : ""} on the grid.</p>
            </>
          )}
        </div>
      </div>
    </Floating>
  );
}

// ── Atom builder ─────────────────────────────────────────────────────────
// Shell radii, spread to fill the picture however many shells are in use.
const RINGS = [[72], [60, 112], [48, 90, 132], [44, 73, 103, 132]];
export function AtomPanel({ s, host, boxW, onChange }: P<AtomState>) {
  const width = Math.max(340, Math.min(680, boxW * 0.72));
  const set = (a: Partial<AtomState>) => onChange({ ...s, ...a }, true);
  const f = atomFacts(s), N = s.p + s.n, cx = 170, cy = 140, rings = RINGS[Math.max(0, f.shells.length - 1)];
  // Protons and neutrons packed in a spiral, mixed evenly.
  const nucleons = Array.from({ length: N }, (_, i) => {
    const r = 3.7 * Math.sqrt(i + 0.5), a = i * 2.39996;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), proton: Math.floor(((i + 1) * s.p) / N) > Math.floor((i * s.p) / N) };
  });
  const row = "flex items-baseline justify-between gap-2";
  return (
    <Floating p={s} host={host} title="Atom builder" icon="atom" width={width} onChange={onChange}>
      <div className="flex flex-wrap items-start gap-2.5 p-2.5">
        <div className="min-w-0 flex-[3_1_270px]">
          <svg viewBox="0 0 340 292" className="block w-full rounded-xl bg-white ring-1 ring-slate-200" role="img" style={{ fontFamily: FONT }}
            aria-label={`Atom with ${s.p} proton${s.p === 1 ? "" : "s"}, ${s.n} neutron${s.n === 1 ? "" : "s"} and ${s.e} electron${s.e === 1 ? "" : "s"}${f.shells.length ? ` in shells ${f.shells.join(", ")}` : ""}`}>
            {f.shells.map((m, k) => (
              <g key={k}>
                <circle cx={cx} cy={cy} r={rings[k]} fill="none" stroke="#94A3B8" strokeWidth={1.3} />
                {Array.from({ length: m }, (_, j) => {
                  const a = -Math.PI / 2 + (j * 2 * Math.PI) / m, x = cx + rings[k] * Math.cos(a), y = cy + rings[k] * Math.sin(a);
                  return <g key={j}><circle cx={x} cy={y} r={6.5} fill="#2563EB" stroke="#fff" strokeWidth={1.5} /><line x1={x - 3} y1={y} x2={x + 3} y2={y} stroke="#fff" strokeWidth={1.6} /></g>;
                })}
              </g>
            ))}
            <circle cx={cx} cy={cy} r={3.7 * Math.sqrt(N) + 7} fill="#FEF3C7" stroke="#F59E0B" strokeWidth={1} />
            {nucleons.map((q, i) => <circle key={i} cx={q.x} cy={q.y} r={4.3} fill={q.proton ? "#EF4444" : "#94A3B8"} stroke="#fff" strokeWidth={0.8} />)}
            <g fontSize={10.5} fontWeight={700} fill="#334155">
              <circle cx={14} cy={282} r={5} fill="#EF4444" /><text x={23} y={286}>Proton +</text>
              <circle cx={96} cy={282} r={5} fill="#94A3B8" /><text x={105} y={286}>Neutron 0</text>
              <circle cx={184} cy={282} r={5} fill="#2563EB" /><text x={193} y={286}>Electron −</text>
            </g>
          </svg>
        </div>

        <div className="grid min-w-0 flex-[1_1_230px] gap-2">
          <div className="rounded-xl bg-slate-50 p-2.5" aria-live="polite" aria-label="About this atom">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 ring-2 ring-slate-300" aria-label={`Nuclear symbol: mass number ${f.mass}, atomic number ${s.p}${s.hide ? "" : `, ${f.el.symbol}`}${f.charge ? `, charge ${f.chargeText}` : ""}`}>
                <span className="grid text-right font-mono text-xs font-black leading-tight" aria-hidden><span>{f.mass}</span><span>{s.p}</span></span>
                <span className="text-3xl font-black leading-none" aria-hidden>{s.hide ? "?" : f.el.symbol}</span>
                {f.charge !== 0 && <sup className="-ml-0.5 self-start font-mono text-sm font-black" aria-hidden>{f.chargeText}</sup>}
              </span>
              <p className="min-w-0 text-base font-black leading-tight">{s.hide ? "Which element is this?" : f.isotope}</p>
            </div>
            <dl className="mt-2 grid gap-0.5 text-xs">
              <div className={row}><dt className="text-ink/60">Atomic number (protons)</dt><dd className="font-mono font-black">{s.p}</dd></div>
              <div className={row}><dt className="text-ink/60">Mass number</dt><dd className="font-mono font-black">{s.p} + {s.n} = {f.mass}</dd></div>
              <div className={row}><dt className="text-ink/60">Electron shells</dt><dd className="font-mono font-black">{f.shells.length ? f.shells.join(", ") : "none"}</dd></div>
              <div className={row}><dt className="text-ink/60">Charge</dt><dd className="font-mono font-black">{f.charge === 0 ? "0" : f.chargeText}</dd></div>
            </dl>
            <p className="mt-1.5 text-xs font-bold">{f.kind}.</p>
            {f.fullOuter && <p className="text-xs text-ink/70">Its outer shell is full, so it is stable like a noble gas.</p>}
            <p className={`text-xs ${f.stable ? "text-ink/70" : "font-bold text-amber-700"}`}>{f.stable ? "This isotope is stable." : "This isotope is unstable: it is radioactive."}</p>
          </div>
          {host && (
            <div className="grid gap-1.5">
              <Step label="Protons" value={s.p} min={1} max={MAX_P} onChange={(p) => set({ p })} />
              <Step label="Neutrons" value={s.n} min={0} max={MAX_N} onChange={(n) => set({ n })} />
              <Step label="Electrons" value={s.e} min={0} max={MAX_E} onChange={(e) => set({ e })} />
              <select value="" aria-label="Jump to an element" className={field} onChange={(e) => { const p = Number(e.target.value); if (p) set({ p, n: commonN(p), e: p }); }}>
                <option value="">Jump to an element…</option>
                {ELEMENTS.slice(0, MAX_P).map((el) => <option key={el.z} value={el.z}>{el.z}. {el.name}</option>)}
              </select>
              <div className="flex flex-wrap gap-1">
                <button type="button" className={chip} disabled={f.charge === 0} onClick={() => set({ e: s.p })}>Make it neutral</button>
                <button type="button" className={chip} disabled={s.n === commonN(s.p)} onClick={() => set({ n: commonN(s.p) })}>Usual neutrons</button>
                <button type="button" aria-pressed={s.hide} className={s.hide ? chipOn : chip} onClick={() => set({ hide: !s.hide })}>{s.hide ? "Quiz on — show the name" : "Hide the name (quiz)"}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Floating>
  );
}

// ── Card sort ────────────────────────────────────────────────────────────
type Draft = { title: string; groups: { name: string; text: string }[] };
export function SortPanel({ s, host, boxW, onChange }: P<SortState>) {
  const width = Math.max(340, Math.min(700, boxW * 0.7));
  const [picked, setPicked] = useState<number | null>(null); // tapped: tap a heading to put it there
  const [ghost, setGhost] = useState<{ t: string; x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);     // writing a new set
  const [error, setError] = useState("");
  const live = useRef(s);
  live.current = s;
  const score = sortScore(s), chosen = picked != null ? s.cards[picked] : undefined;
  const put = (i: number, g: number) => { onChange(moveCard(live.current, i, g), true); setPicked(null); };
  // Drag a card onto a heading — or tap it, then tap the heading.
  function grab(e: React.PointerEvent, i: number) {
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, t = s.cards[i].t;
    let moved = false;
    const move = (ev: PointerEvent) => { if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return; moved = true; setGhost({ t, x: ev.clientX, y: ev.clientY }); };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); setGhost(null);
      if (!moved) return setPicked((p) => (p === i ? null : i));
      const bin = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-bin]");
      if (bin) put(i, Number(bin.getAttribute("data-bin")));
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }
  const card = (i: number) => {
    const c = s.cards[i], marked = s.check && c.g >= 0, ok = c.g === c.a;
    const look = `inline-flex min-h-[30px] items-center gap-1 rounded-lg px-2 text-xs font-black ring-1 ${marked ? (ok ? "bg-emerald-50 text-emerald-800 ring-emerald-500" : "bg-red-50 text-red-800 ring-red-500") : picked === i ? "bg-[#0E6E72] text-white ring-[#0E6E72]" : "bg-white text-ink ring-slate-300"}`;
    const mark = marked ? <span aria-label={ok ? "correct" : "wrong"}>{ok ? "✓" : "✗"}</span> : null;
    return (
      <li key={`${c.t}-${i}`}>
        {host ? <button type="button" aria-pressed={picked === i} onPointerDown={(e) => grab(e, i)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPicked(picked === i ? null : i); } }}
          className={`${look} touch-none select-none`} style={{ cursor: "grab" }}>{c.t}{mark}</button> : <span className={look}>{c.t}{mark}</span>}
      </li>
    );
  };
  const where = (g: number) => s.cards.map((c, i) => (c.g === g ? i : -1)).filter((i) => i >= 0);
  const start = () => {
    const next = draft && buildSort(draft.title, draft.groups.map((g) => ({ name: g.name, cards: parseCards(g.text) })));
    if (!next) return setError("Give at least two headings, and type some cards under them.");
    setDraft(null); setError(""); setPicked(null); onChange({ ...live.current, ...next }, true);
  };
  const edit = (d: Partial<Draft>) => { setError(""); setDraft((cur) => (cur ? { ...cur, ...d } : cur)); };
  const editGroup = (i: number, g: Partial<Draft["groups"][number]>) => edit({ groups: draft!.groups.map((x, k) => (k === i ? { ...x, ...g } : x)) });
  const typed = draft ? draft.groups.reduce((n, g) => n + parseCards(g.text).length, 0) : 0;

  return (
    <Floating p={s} host={host} title="Card sort" icon="sort" width={width} onChange={onChange}>
      {host && draft ? (
        <form className="grid gap-2 p-2.5" onSubmit={(e) => { e.preventDefault(); start(); }} aria-label="Write your own card sort">
          <label className={`grid gap-0.5 ${small}`}>Question<input className={field} value={draft.title} maxLength={60} placeholder="e.g. Acid or alkali?" onChange={(e) => edit({ title: e.target.value })} /></label>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${draft.groups.length}, minmax(0, 1fr))` }}>
            {draft.groups.map((g, i) => (
              <div key={i} className="grid content-start gap-1">
                <input className={field} value={g.name} maxLength={22} aria-label={`Heading ${i + 1}`} placeholder={`Heading ${i + 1}`} onChange={(e) => editGroup(i, { name: e.target.value })} />
                <textarea className={`${field} py-1.5 font-semibold`} style={{ minHeight: 104 }} rows={5} value={g.text} aria-label={`Cards for heading ${i + 1}`} placeholder="One card per line" onChange={(e) => editGroup(i, { text: e.target.value })} />
                {draft.groups.length > MIN_GROUPS && <button type="button" className={chip} aria-label={`Remove heading ${i + 1}`} onClick={() => edit({ groups: draft.groups.filter((_, k) => k !== i) })}>Remove</button>}
              </div>
            ))}
          </div>
          <p className="text-[11px] font-bold text-ink/55">Type each card under the heading it belongs to. {typed} of {MAX_CARDS} cards.</p>
          {error && <p role="alert" className="text-xs font-black text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-1">
            <button type="submit" className={primary}>Start sorting</button>
            {draft.groups.length < MAX_GROUPS && <button type="button" className={chip} onClick={() => edit({ groups: [...draft.groups, { name: "", text: "" }] })}>+ Heading</button>}
            <button type="button" className={chip} onClick={() => edit({ title: "", groups: [{ name: "", text: "" }, { name: "", text: "" }] })}>Clear all</button>
            <button type="button" className={chip} onClick={() => { setDraft(null); setError(""); }}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="grid gap-2 p-2.5">
          <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-black">{s.title || "Sort the cards"}
            <span className="text-[11px] font-bold text-ink/55" aria-label="Score" aria-live="polite">{s.check ? `${score.right} of ${score.total} right${score.allRight ? " — all correct!" : ""}` : `${score.placed} of ${score.total} sorted`}</span>
          </p>
          <div data-bin={-1} className="min-h-[46px] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-1.5" role="group" aria-label="Cards to sort">
            {where(-1).length ? <ul className="flex flex-wrap gap-1">{where(-1).map(card)}</ul> : <p className="py-1.5 text-center text-xs font-bold text-ink/50">Every card is sorted.{!s.check && host ? " Tap “Check answers”." : ""}</p>}
            {host && chosen && chosen.g >= 0 && <button type="button" className={`${chip} mt-1`} onClick={() => put(picked!, -1)}>Put “{chosen.t}” back in the pile</button>}
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${s.groups.length}, minmax(0, 1fr))` }}>
            {s.groups.map((name, g) => (
              <div key={g} data-bin={g} role="group" aria-label={name} className={`min-h-[110px] rounded-xl p-1.5 ring-2 ${chosen && host ? "bg-[#EEF7F6] ring-[#0E6E72]" : "bg-white ring-slate-200"}`}>
                <p className="mb-1 text-xs font-black text-[#0A4F52]">{name}</p>
                {host && chosen && chosen.g !== g && <button type="button" className={`${primary} mb-1 w-full`} onClick={() => put(picked!, g)} aria-label={`Put ${chosen.t} under ${name}`}>Put “{chosen.t}” here</button>}
                <ul className="flex flex-wrap gap-1">{where(g).map(card)}</ul>
              </div>
            ))}
          </div>
          {host && (
            <div className="flex flex-wrap items-center gap-1">
              <button type="button" aria-pressed={s.check} className={s.check ? chipOn : primary} onClick={() => onChange({ ...s, check: !s.check }, true)}>{s.check ? "Hide the marks" : "Check answers"}</button>
              <button type="button" className={chip} onClick={() => { setPicked(null); onChange(mixAgain(s), true); }}>Mix them up again</button>
              <select value="" aria-label="Ready-made set" className={`${field} w-auto flex-1`} onChange={(e) => { const p = SORT_PRESETS[Number(e.target.value)]; if (e.target.value && p) { setPicked(null); onChange({ ...s, ...buildSort(p.title, p.groups)! }, true); } }}>
                <option value="">Ready-made sets…</option>
                {SORT_PRESETS.map((p, i) => <option key={p.title} value={i}>{p.title}</option>)}
              </select>
              <button type="button" className={chip} onClick={() => { setPicked(null); setDraft({ title: s.title, groups: sortGroups(s).map((g) => ({ name: g.name, text: g.cards.join("\n") })) }); }}>Write my own</button>
              <p className="w-full text-[11px] font-bold text-ink/55">{chosen ? `Now tap the heading “${chosen.t}” belongs under.` : "Drag a card onto a heading — or tap it, then tap the heading."}</p>
            </div>
          )}
          {ghost && <div aria-hidden className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[#0E6E72] px-3 py-1.5 text-xs font-black text-white shadow-xl" style={{ left: ghost.x, top: ghost.y }}>{ghost.t}</div>}
        </div>
      )}
    </Floating>
  );
}
