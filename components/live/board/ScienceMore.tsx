"use client";
import { useMemo, useRef, useState } from "react";
import { Floating } from "@/components/live/board/MathPanels";
import { Step } from "@/components/live/board/LessonTools";
import {
  DEFAULT_BALANCER, EQUATIONS, FOCALS, H_MAX, H_MIN, MAX_COEF, OPTICS, OPTIC_NAMES, U_MAX, U_MIN, WEBS, WEB_IDS, checkBalance, describeImage, effectsOf, formulaParts, formulaText, imageOf, isMirror,
  layoutWeb, organism, parseEquation, raySegments, roleOf, signedF, solveEquation, speciesOf, tryLink, usable, whereText,
  type BalancerState, type FoodWebState, type RayState, type WebId,
} from "@/lib/scienceMore";

// Three more science tools that float over the board (lib/scienceMore.ts): the
// equation balancer, ray diagrams and the food web builder. The teacher works
// them; learners see every change live.

type P<T> = { s: T; host: boolean; boxW: number; onChange: (s: T, final?: boolean) => void };
const chip = "min-h-[32px] rounded-lg bg-slate-100 px-2.5 text-xs font-black text-ink hover:bg-slate-200 disabled:opacity-40";
const chipOn = "min-h-[32px] rounded-lg bg-[#0E6E72] px-2.5 text-xs font-black text-white";
const primary = "min-h-[32px] rounded-lg bg-[#0E6E72] px-3 text-xs font-black text-white hover:bg-[#0A4F52] disabled:opacity-40";
const field = "min-h-[32px] rounded-lg bg-slate-50 px-2 text-xs font-bold text-ink ring-1 ring-slate-200";
const small = "text-[11px] font-black text-ink/60";
const FONT = "Poppins, system-ui, sans-serif";

// ── Equation balancer ────────────────────────────────────────────────────
const Formula = ({ f }: { f: string }) => <>{formulaParts(f).map((p, i) => (p.sub ? <sub key={i} className="text-[0.62em]">{p.t}</sub> : <span key={i}>{p.t}</span>))}</>;
export function BalancerPanel({ s, host, boxW, onChange }: P<BalancerState>) {
  const width = Math.max(340, Math.min(700, boxW * 0.7));
  const eq = useMemo(() => parseEquation(s.text) ?? parseEquation(DEFAULT_BALANCER.text)!, [s.text]);
  const answer = useMemo(() => solveEquation(eq), [eq]);
  const [typed, setTyped] = useState(""), [error, setError] = useState("");
  const sp = speciesOf(eq), chk = checkBalance(eq, s.coef), nLeft = eq.left.length;
  const set = (b: Partial<BalancerState>) => onChange({ ...s, ...b }, true);
  const setCoef = (i: number, k: number) => set({ coef: s.coef.map((c, j) => (j === i ? Math.max(1, Math.min(MAX_COEF, k)) : c)) });
  const load = (text: string) => { const e = usable(text); if (!e) return false; set({ text, coef: speciesOf(e).map(() => 1) }); return true; };
  const off = chk.elements.filter((el) => chk.left[el] !== chk.right[el]);
  const g = s.coef.reduce((a: number, b: number): number => { while (b) [a, b] = [b, a % b]; return a; }, 0);
  const most = Math.max(1, ...chk.elements.flatMap((el) => [chk.left[el], chk.right[el]]));
  const preset = EQUATIONS.findIndex((e) => e.text === s.text);
  return (
    <Floating p={s} host={host} title="Balance the equation" icon="balancer" width={width} onChange={onChange}>
      <div className="grid gap-2 p-2.5">
        <div className="flex flex-wrap items-end justify-center gap-x-2 gap-y-3 rounded-xl bg-slate-50 px-2 py-3" role="group" aria-label={`Equation: ${sp.map((x, i) => `${i === nLeft ? "gives " : i ? "plus " : ""}${s.coef[i]} ${x.formula}`).join(" ")}`}>
          {sp.map((x, i) => (
            <div key={`${x.formula}-${i}`} className="flex items-end gap-2">
              {i > 0 && <span className="pb-9 text-2xl font-black text-ink/50" aria-hidden>{i === nLeft ? "→" : "+"}</span>}
              <div className="grid justify-items-center gap-1" role="group" aria-label={x.formula}>
                <p className="whitespace-nowrap text-2xl font-black leading-none"><span className={`mr-1 font-mono ${s.coef[i] === 1 ? "text-ink/25" : "text-[#C2451C]"}`} aria-label={`${s.coef[i]}`}>{s.coef[i]}</span><Formula f={x.formula} /></p>
                {host ? (
                  <span className="flex gap-1">
                    <button type="button" className={`${chip} w-8 px-0`} aria-label={`Fewer ${x.formula}`} disabled={s.coef[i] <= 1} onClick={() => setCoef(i, s.coef[i] - 1)}>−</button>
                    <button type="button" className={`${chip} w-8 px-0`} aria-label={`More ${x.formula}`} disabled={s.coef[i] >= MAX_COEF} onClick={() => setCoef(i, s.coef[i] + 1)}>+</button>
                  </span>
                ) : <span className="h-1" />}
              </div>
            </div>
          ))}
        </div>

        <p role="status" className={`rounded-lg px-2.5 py-1.5 text-sm font-black ${chk.balanced ? (chk.simplest ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800") : "bg-red-50 text-red-800"}`}>
          {chk.balanced ? (chk.simplest ? "✓ Balanced! Every atom on the left is also on the right." : `Balanced — but divide every number by ${g} to get the smallest whole numbers.`)
            : `Not balanced yet: the ${off.join(", ")} atoms don't match.`}
        </p>

        {s.counts && (
          <table className="w-full text-xs" aria-label="Atom count">
            <thead><tr className="text-left text-[10px] font-bold uppercase tracking-wide text-ink/45"><th className="w-14 font-bold">Atom</th><th className="font-bold">Left side</th><th className="font-bold">Right side</th><th className="w-8" /></tr></thead>
            <tbody>
              {chk.elements.map((el) => {
                const l = chk.left[el], r = chk.right[el], ok = l === r, bar = (n: number) => <span className="flex items-center gap-1.5"><b className="w-6 text-right font-mono text-sm">{n}</b><span aria-hidden className="h-2.5 rounded-full" style={{ width: `${(n / most) * 70}%`, background: ok ? "#16A34A" : "#F59E0B" }} /></span>;
                return <tr key={el}><th scope="row" className="py-0.5 text-left text-sm font-black">{el}</th><td>{bar(l)}</td><td>{bar(r)}</td><td className={`text-center text-sm font-black ${ok ? "text-emerald-700" : "text-red-700"}`}>{ok ? "✓" : "✗"}</td></tr>;
              })}
            </tbody>
          </table>
        )}

        {host && (
          <div className="grid gap-1.5">
            <div className="flex flex-wrap gap-1">
              <button type="button" className={chip} onClick={() => set({ coef: s.coef.map(() => 1) })}>Start again</button>
              {answer && <button type="button" className={chip} onClick={() => set({ coef: answer })}>Show the answer</button>}
              <button type="button" aria-pressed={!s.counts} className={s.counts ? chip : chipOn} onClick={() => set({ counts: !s.counts })}>{s.counts ? "Hide the atom count" : "Show the atom count"}</button>
              <select value={preset < 0 ? "" : preset} aria-label="Equation" className={`${field} flex-1`} onChange={(e) => { if (e.target.value !== "") load(EQUATIONS[Number(e.target.value)].text); }}>
                {preset < 0 && <option value="">Your own equation</option>}
                {EQUATIONS.map((e, i) => <option key={e.text} value={i}>{e.name}</option>)}
              </select>
            </div>
            <form className="flex flex-wrap items-center gap-1" onSubmit={(e) => { e.preventDefault(); if (load(typed.trim())) { setTyped(""); setError(""); } else setError("I can't use that. Type it like  Mg + HCl -> MgCl2 + H2  with the same elements on both sides."); }}>
              <input value={typed} onChange={(e) => { setTyped(e.target.value); setError(""); }} aria-label="Type your own equation" placeholder="Your own: Mg + HCl -> MgCl2 + H2" maxLength={80} className={`${field} min-w-0 flex-1 font-mono`} />
              <button type="submit" className={primary} disabled={!typed.trim()}>Use it</button>
              {error && <p role="alert" className="w-full text-xs font-black text-red-700">{error}</p>}
            </form>
          </div>
        )}
      </div>
    </Floating>
  );
}

// ── Ray diagrams ─────────────────────────────────────────────────────────
const RW = 620, RH = 296, K = 4; // K pixels to the centimetre
const RAY_COLOURS = ["#DC2626", "#059669"];
function ArrowHead({ a, b, at, colour }: { a: [number, number]; b: [number, number]; at: number; colour: string }) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  if (len < 24) return null;
  const d = Math.min(len * 0.5, at), x = a[0] + (dx / len) * d, y = a[1] + (dy / len) * d;
  return <path d="M-6,-4 L3,0 L-6,4 Z" fill={colour} transform={`translate(${x},${y}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})`} />;
}
export function RayPanel({ s, host, boxW, onChange }: P<RayState>) {
  const width = Math.max(360, Math.min(860, boxW * 0.88));
  const svg = useRef<SVGSVGElement>(null), live = useRef(s);
  live.current = s;
  const set = (r: Partial<RayState>) => onChange({ ...live.current, ...r }, true);
  const mirror = isMirror(s.optic), ox = mirror ? 420 : RW / 2, oy = RH / 2, X = (cm: number) => ox + cm * K, Y = (cm: number) => oy - cm * K;
  const im = imageOf(s), f = signedF(s), thing = mirror ? "mirror" : "lens", top = Y(34), bottom = Y(-34);
  const pt = (p: [number, number]): [number, number] => [X(p[0]), Y(p[1])];
  function drag(e: React.PointerEvent) {
    if (!host || !svg.current) return;
    e.preventDefault();
    const perCm = (svg.current.getBoundingClientRect().width / RW) * K, sx = e.clientX, start = s.u;
    let last = start;
    const put = (ev: PointerEvent, final: boolean) => {
      const u = Math.max(U_MIN, Math.min(U_MAX, Math.round(start - (ev.clientX - sx) / perCm)));
      if (!final && u === last) return;
      last = u; onChange({ ...live.current, u }, final);
    };
    const move = (ev: PointerEvent) => put(ev, false);
    const up = (ev: PointerEvent) => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); put(ev, true); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }
  // Focal points: both sides of a lens; in front of a concave mirror, behind a convex one.
  const marks: [number, string][] = s.optic === "plane" ? [] : mirror ? [[-f, "F"], [-2 * f, "C"]] : [[-s.f, "F"], [s.f, "F"], [-2 * s.f, "2F"], [2 * s.f, "2F"]];
  const where = s.optic === "plane" || f < 0 ? "" : s.u > 2 * s.f ? `beyond ${mirror ? "C" : "2F"}` : s.u === 2 * s.f ? `at ${mirror ? "C" : "2F"}` : s.u > s.f ? `between F and ${mirror ? "C" : "2F"}` : s.u === s.f ? "at F" : "inside F";
  const arrow = (x: number, h: number, colour: string, dashed: boolean) => (
    <g stroke={colour} fill={colour}>
      <line x1={X(x)} y1={Y(0)} x2={X(x)} y2={Y(h) + (h > 0 ? 8 : -8)} strokeWidth={3.2} strokeDasharray={dashed ? "6 4" : undefined} />
      <path d={`M${X(x) - 6},${Y(h) + (h > 0 ? 10 : -10)} L${X(x)},${Y(h)} L${X(x) + 6},${Y(h) + (h > 0 ? 10 : -10)} Z`} stroke="none" fillOpacity={dashed ? 0.55 : 1} />
    </g>
  );
  return (
    <Floating p={s} host={host} title="Ray diagrams" icon="rays" width={width} onChange={onChange}>
      <div className="flex flex-wrap items-start gap-2.5 p-2.5">
        <div className="min-w-0 flex-[3_1_340px]">
          <svg ref={svg} viewBox={`0 0 ${RW} ${RH}`} className="block w-full rounded-xl bg-white ring-1 ring-slate-200" role="img" style={{ fontFamily: FONT }}
            aria-label={`${OPTIC_NAMES[s.optic]}, focal length ${s.f} cm. Object ${s.u} cm away, ${s.h} cm tall. ${s.show ? `${describeImage(s)}. ${whereText(s)}` : "The image is hidden."}`}>
            <line x1={0} y1={oy} x2={RW} y2={oy} stroke="#64748B" strokeWidth={1.2} />
            {marks.map(([cm, name], i) => <g key={i}><line x1={X(cm)} y1={oy - 5} x2={X(cm)} y2={oy + 5} stroke="#0B1220" strokeWidth={1.6} /><text x={X(cm)} y={oy + 17} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0B1220">{name}</text></g>)}
            {/* The lens or mirror */}
            {s.optic === "convex" && <g><ellipse cx={ox} cy={oy} rx={10} ry={136} fill="#BAE6FD" fillOpacity={0.6} stroke="#0284C7" strokeWidth={1.5} /><path d={`M${ox - 6},${top + 8} L${ox},${top - 2} L${ox + 6},${top + 8} M${ox - 6},${bottom - 8} L${ox},${bottom + 2} L${ox + 6},${bottom - 8}`} fill="none" stroke="#0369A1" strokeWidth={2} /></g>}
            {s.optic === "concave" && <g><path d={`M${ox - 11},${top} Q${ox - 2},${oy} ${ox - 11},${bottom} L${ox + 11},${bottom} Q${ox + 2},${oy} ${ox + 11},${top} Z`} fill="#BAE6FD" fillOpacity={0.6} stroke="#0284C7" strokeWidth={1.5} /></g>}
            {mirror && (
              <g>
                {Array.from({ length: 14 }, (_, i) => { const y = top + 6 + i * 20; return <line key={i} x1={ox + 3} y1={y} x2={ox + 13} y2={y - 9} stroke="#94A3B8" strokeWidth={1.4} />; })}
                <path d={s.optic === "plane" ? `M${ox},${top} V${bottom}` : s.optic === "concave-mirror" ? `M${ox - 9},${top} Q${ox + 9},${oy} ${ox - 9},${bottom}` : `M${ox + 9},${top} Q${ox - 9},${oy} ${ox + 9},${bottom}`} fill="none" stroke="#0B1220" strokeWidth={3.2} />
              </g>
            )}
            {/* Rays */}
            {s.show && raySegments(s).map((g, i) => {
              const a = pt(g.a), b = pt(g.b), colour = RAY_COLOURS[g.ray];
              return <g key={i}><line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={colour} strokeWidth={g.dashed ? 1.4 : 2} strokeDasharray={g.dashed ? "5 5" : undefined} opacity={g.dashed ? 0.75 : 1} />{!g.dashed && <ArrowHead a={a} b={b} at={46} colour={colour} />}</g>;
            })}
            {/* Image, then object on top */}
            {s.show && !im.atInfinity && <g>{arrow(im.x, im.hi, "#EA580C", !im.real)}<text x={X(im.x)} y={Y(im.hi) + (im.hi > 0 ? -6 : 14)} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#C2410C" stroke="#fff" strokeWidth={3} paintOrder="stroke">image</text></g>}
            <g onPointerDown={drag} style={{ cursor: host ? "ew-resize" : undefined, touchAction: "none" }} data-object>
              <rect x={X(-s.u) - 14} y={Y(s.h) - 6} width={28} height={s.h * K + 28} fill="transparent" />
              {arrow(-s.u, s.h, "#1D4ED8", false)}
              <text x={X(-s.u)} y={Y(s.h) - 6} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#1D4ED8" stroke="#fff" strokeWidth={3} paintOrder="stroke">object</text>
            </g>
          </svg>
          <div className="mt-1.5 rounded-lg bg-slate-50 p-2 text-xs" aria-live="polite" aria-label="Image">
            {s.show ? (
              <>
                <p className="text-sm font-black">{describeImage(s)}</p>
                <p className="text-ink/75">{whereText(s)}</p>
                <p className="mt-0.5 font-mono text-[11px] text-ink/60">{formulaText(s)}</p>
              </>
            ) : <p className="text-sm font-black">Where will the image be? Real or virtual, upright or inverted, bigger or smaller?</p>}
          </div>
        </div>

        <div className="grid min-w-0 flex-[1_1_210px] gap-2">
          <p className="rounded-lg bg-[#EEF7F6] p-2 text-xs font-bold" aria-label="Object">Object {s.u} cm from the {thing}{where ? `: ${where}` : ""}. Focal length {s.optic === "plane" ? "none (flat)" : `${s.f} cm`}.</p>
          {host && (
            <>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Lens or mirror">
                {OPTICS.map((o) => <button key={o} type="button" aria-pressed={s.optic === o} className={s.optic === o ? chipOn : chip} onClick={() => set({ optic: o })}>{OPTIC_NAMES[o]}</button>)}
              </div>
              <Step label="Distance" value={s.u} min={U_MIN} max={U_MAX} onChange={(u) => set({ u })} />
              <Step label="Height" value={s.h} min={H_MIN} max={H_MAX} onChange={(h) => set({ h })} />
              {s.optic !== "plane" && (
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Focal length">
                  <span className={`w-full ${small}`}>Focal length</span>
                  {FOCALS.map((n) => <button key={n} type="button" aria-pressed={s.f === n} className={s.f === n ? chipOn : chip} onClick={() => set({ f: n })}>{n} cm</button>)}
                </div>
              )}
              <button type="button" aria-pressed={!s.show} className={s.show ? chip : chipOn} onClick={() => set({ show: !s.show })}>{s.show ? "Hide the image (predict first)" : "Show the image"}</button>
              <p className="text-[11px] font-bold text-ink/55">Drag the blue object along the line.</p>
            </>
          )}
          <p className="flex flex-wrap gap-x-3 text-[11px] font-bold text-ink/60" aria-hidden><span style={{ color: RAY_COLOURS[0] }}>— parallel ray, then through F</span><span style={{ color: RAY_COLOURS[1] }}>— ray to the centre</span></p>
        </div>
      </div>
    </Floating>
  );
}

// ── Food web builder ─────────────────────────────────────────────────────
const NW = 104, NH = 40;
export function FoodWebPanel({ s, host, boxW, onChange }: P<FoodWebState>) {
  const width = Math.max(360, Math.min(880, boxW * 0.9));
  const web = WEBS[s.web], pos = useMemo(() => layoutWeb(web), [web]);
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (w: Partial<FoodWebState>) => onChange({ ...s, ...w }, true);
  const fx = effectsOf(web, s.removed), gone = (id: string) => s.removed.includes(id);
  function tap(id: string) {
    if (!sel) { setSel(id); setNote(null); return; }
    if (sel === id) { setSel(null); return; }
    const r = tryLink(web, sel, id);
    if ("index" in r) { if (!s.drawn.includes(r.index)) set({ drawn: [...s.drawn, r.index] }); setNote({ ok: true, text: `Yes: ${organism(web, id).name.toLowerCase()} eats ${organism(web, sel).name.toLowerCase()}.` }); }
    else setNote({ ok: false, text: r.why });
    setSel(null);
  }
  const chosen = sel ? organism(web, sel) : null;
  const shortRole = (id: string) => roleOf(web, id).split(" (")[0].toLowerCase();
  return (
    <Floating p={s} host={host} title="Food web" icon="foodweb" width={width} onChange={onChange}>
      <div className="flex flex-wrap items-start gap-2.5 p-2.5">
        <div className="min-w-0 flex-[3_1_340px]">
          <svg viewBox="0 0 600 340" className="block w-full rounded-xl bg-[#F8FAF5] ring-1 ring-slate-200" role="group" aria-label={`${web.name} food web: ${s.drawn.length} of ${web.links.length} arrows drawn`} style={{ fontFamily: FONT }}>
            <defs><marker id="fw-arrow" viewBox="0 0 10 10" refX={8.5} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="context-stroke" /></marker></defs>
            {s.drawn.map((k) => {
              const [food, eater] = web.links[k], a = pos[food], b = pos[eater], faded = gone(food) || gone(eater);
              return <line key={k} x1={a[0]} y1={a[1] - NH / 2} x2={b[0]} y2={b[1] + NH / 2 + 3} stroke={faded ? "#CBD5E1" : "#334155"} strokeWidth={1.8} strokeDasharray={faded ? "5 5" : undefined} markerEnd="url(#fw-arrow)" />;
            })}
            {web.organisms.map((x) => {
              const [cx, cy] = pos[x.id], out = gone(x.id), e = fx[x.id], on = sel === x.id;
              return (
                <g key={x.id} transform={`translate(${cx - NW / 2},${cy - NH / 2})`} role={host ? "button" : "img"} tabIndex={host ? 0 : undefined} aria-pressed={host ? on : undefined}
                  aria-label={`${x.name}${out ? ", taken out" : e ? `, ${e.sure ? "will" : "may"} ${e.dir === "up" ? "rise" : "fall"}` : ""}`} style={{ cursor: host ? "pointer" : undefined, outline: "none" }}
                  onClick={host ? () => tap(x.id) : undefined} onKeyDown={host ? (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tap(x.id); } } : undefined}>
                  <rect width={NW} height={NH} rx={10} fill={out ? "#F1F5F9" : on ? "#FEF3C7" : "#fff"} stroke={on ? "#D97706" : out ? "#CBD5E1" : x.row === 0 ? "#16A34A" : "#0E6E72"} strokeWidth={on ? 3 : 1.8} strokeDasharray={out ? "5 4" : undefined} />
                  <text x={NW / 2} y={s.roles ? 17 : NH / 2 + 4.5} textAnchor="middle" fontSize={12} fontWeight={800} fill={out ? "#94A3B8" : "#0B1220"} textDecoration={out ? "line-through" : undefined}>{x.emoji} {x.name}</text>
                  {s.roles && <text x={NW / 2} y={31} textAnchor="middle" fontSize={9} fontWeight={700} fill="#64748B">{shortRole(x.id)}</text>}
                  {e && !out && <g transform={`translate(${NW - 4},2)`}><circle r={10} fill={e.dir === "up" ? "#16A34A" : "#DC2626"} stroke="#fff" strokeWidth={1.5} /><path d={e.dir === "up" ? "M0,-5 L5,3 L-5,3 Z" : "M0,5 L5,-3 L-5,-3 Z"} fill="#fff" /></g>}
                </g>
              );
            })}
          </svg>
          <p className="mt-1 text-[11px] text-ink/55">An arrow points from the food to the animal that eats it: it shows which way the energy goes.</p>
        </div>

        <div className="grid min-w-0 flex-[1_1_210px] gap-2">
          <p className="text-xs font-black" aria-label="Arrows">{s.drawn.length} of {web.links.length} arrows drawn{s.drawn.length === web.links.length ? " — the web is complete" : ""}</p>
          {s.removed.length > 0 && (
            <div className="rounded-xl bg-slate-50 p-2" aria-live="polite" aria-label="What happens">
              <p className="text-xs font-black">Without the {s.removed.map((id) => organism(web, id).name.toLowerCase()).join(" and the ")}:</p>
              <ul className="mt-1 grid gap-1 text-xs">
                {Object.entries(fx).map(([id, e]) => (
                  <li key={id}><b className={e.dir === "up" ? "text-emerald-700" : "text-red-700"}>{e.dir === "up" ? "▲" : "▼"} {organism(web, id).name} {e.sure ? "will" : "may"} {e.dir === "up" ? "rise" : "fall"}.</b> {e.why}</li>
                ))}
                {!Object.keys(fx).length && <li className="text-ink/60">Nothing else in this web depends on it.</li>}
              </ul>
            </div>
          )}
          {host && (
            <>
              {note && <p role="status" className={`rounded-lg px-2 py-1.5 text-xs font-black ${note.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{note.text}</p>}
              {chosen ? (
                <div className="grid gap-1 rounded-xl bg-amber-50 p-2" role="group" aria-label="Chosen">
                  <p className="text-xs font-black">{chosen.emoji} {chosen.name}: now tap what eats it.</p>
                  <button type="button" className={chip} onClick={() => { set({ removed: gone(chosen.id) ? s.removed.filter((id) => id !== chosen.id) : [...s.removed, chosen.id] }); setSel(null); setNote(null); }}>
                    {gone(chosen.id) ? `Put the ${chosen.name.toLowerCase()} back` : `Take the ${chosen.name.toLowerCase()} out`}
                  </button>
                </div>
              ) : <p className="text-[11px] font-bold text-ink/55">Tap a food, then tap what eats it, to draw an arrow. Or tap one and take it out to see what happens.</p>}
              <div className="flex flex-wrap gap-1">
                <button type="button" className={chip} disabled={s.drawn.length === web.links.length} onClick={() => { setNote(null); setSel(null); set({ drawn: web.links.map((_, i) => i) }); }}>Draw every arrow</button>
                <button type="button" className={chip} disabled={!s.drawn.length} onClick={() => { setNote(null); setSel(null); set({ drawn: [] }); }}>Rub out the arrows</button>
                {s.removed.length > 0 && <button type="button" className={chip} onClick={() => set({ removed: [] })}>Put everything back</button>}
                <button type="button" aria-pressed={s.roles} className={s.roles ? chipOn : chip} onClick={() => set({ roles: !s.roles })}>Name the feeding levels</button>
              </div>
              <label className={`flex items-center gap-1.5 ${small}`}>Habitat
                <select value={s.web} aria-label="Habitat" className={`${field} flex-1`} onChange={(e) => { setSel(null); setNote(null); set({ web: e.target.value as WebId, drawn: [], removed: [] }); }}>
                  {WEB_IDS.map((id) => <option key={id} value={id}>{WEBS[id].name}</option>)}
                </select>
              </label>
            </>
          )}
        </div>
      </div>
    </Floating>
  );
}
