"use client";
// A virtual practical: a lab bench with real apparatus, and a lab notebook
// that walks through the protocol. The learner does each step by hand — drag
// apparatus onto apparatus (pouring when it's a liquid), press switches, hold a
// burette tap, turn a dial, wait (fast-forwarded) and write readings in the
// notebook, which checks them. The practical itself is pure data
// (lib/lab/bench/practicals.ts).
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { Field, Graph, ItemView, Practical, Step } from "@/lib/lab/bench/types";
import { checkField, doStep } from "@/lib/lab/bench/run";
import { SUBJECTS } from "@/lib/lab/catalog";
import { Apparatus, BURETTE, BenchDefs, Front, Magnifier, Room, W, buretteY, dims, hasShadow, mouth } from "@/components/lab/bench/Apparatus";

type Run = { s: any; step: number; values: Record<string, string>; notes: Record<number, string>; shown: string[] };
type Move = { id: string; x: number; y: number; tilt: number; instant?: boolean };
// The part of the room shown: the top of the wall and most of the cupboards are left out.
const VIEW = { y: 24, h: 700 };
const fresh = (p: Practical): Run => ({ s: p.init(Math.random), step: 0, values: {}, notes: {}, shown: [] });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nameOf = (it?: ItemView) => String(it?.props?.name || it?.label || it?.id || "apparatus").replace(/\s*\(.*\)$/, "");
const lower = (s: string) => (/^[A-Z][a-z]/.test(s) && !/^(Benedict|Biuret|HCl|NaOH)/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

export default function BenchLab({ practical: p }: { practical: Practical }) {
  const [run, setRunState] = useState<Run>(() => fresh(p));
  const runRef = useRef(run);
  const setRun = (r: Run) => { runRef.current = r; setRunState(r); };
  const step: Step<any> | undefined = p.steps[run.step];
  const done = !step;
  const [move, setMove] = useState<Move | null>(null); // an item away from its place: dragged or pouring
  const [busy, setBusy] = useState(false);              // something is happening on the bench
  const [picked, setPicked] = useState(false);          // tapped the item: now tap where it goes
  const [pour, setPour] = useState<{ x: number; y: number; colour: string; drops: boolean } | null>(null);
  const [holding, setHolding] = useState(false);
  const [setVal, setSetVal] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [tab, setTab] = useState<"protocol" | "results" | "about">("protocol");
  const [sure, setSure] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; ox: number; oy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const raf = useRef(0);
  const holdingRef = useRef(false);
  const lastSet = useRef<Record<string, number>>({});
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; cancelAnimationFrame(raf.current); }; }, []);

  // A new step: clear what the last one left behind.
  useEffect(() => {
    setHint(null); setPicked(false);
    const a = p.steps[run.step]?.action;
    setSetVal(a?.type === "set" ? lastSet.current[a.item] ?? a.min : null);
    if (run.step >= p.steps.length) setTab("results");
  }, [run.step, p.steps]);

  // While a dial is being turned, the bench shows what it would do.
  const shownState = step?.action.type === "set" && setVal != null && step.apply ? step.apply(run.s, setVal) : run.s;
  const items = useMemo(() => p.layout(shownState, run.step), [p, shownState, run.step]);
  const byId = (id: string) => items.find((x) => x.id === id);
  const a = step?.action;
  const subject = SUBJECTS[p.subject];

  function finish(s2: any, values = runRef.current.values, shown: string[] = []) {
    const r = runRef.current, st = p.steps[r.step];
    if (!st) return;
    const note = st.note?.(s2) ?? null;
    setRun({ ...r, s: s2, values, step: r.step + 1, notes: note ? { ...r.notes, [r.step]: note } : r.notes, shown: [...r.shown, ...shown] });
  }

  // ── Dragging one thing onto another ──
  const toSvg = (e: { clientX: number; clientY: number }) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: VIEW.y + ((e.clientY - r.top) / r.height) * VIEW.h };
  };
  const hits = (t: ItemView, pt: { x: number; y: number }) => {
    const { w, h } = dims(t), cx = t.x, cy = t.y - h / 2;
    return (Math.abs(pt.x - cx) <= w / 2 + 40 && Math.abs(pt.y - cy) <= h / 2 + 40) || Math.hypot(pt.x - cx, pt.y - cy) <= (t.r ?? 110);
  };
  function down(e: ReactPointerEvent, it: ItemView) {
    if (busy || a?.type !== "drag" || a.item !== it.id) return;
    e.preventDefault();
    const pt = toSvg(e);
    drag.current = { id: it.id, ox: pt.x - it.x, oy: pt.y - it.y, sx: pt.x, sy: pt.y, moved: false };
    try { svg.current?.setPointerCapture(e.pointerId); } catch { /* not every pointer can be captured */ }
  }
  function moved(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    const pt = toSvg(e);
    if (!d.moved && Math.hypot(pt.x - d.sx, pt.y - d.sy) < 10) return;
    d.moved = true;
    setMove({ id: d.id, x: pt.x - d.ox, y: pt.y - d.oy, tilt: 0, instant: true });
  }
  function up(e: ReactPointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d || a?.type !== "drag") return;
    if (!d.moved) { setPicked((x) => !x); setHint(null); return; }
    const t = byId(a.onto), pt = toSvg(e);
    if (t && hits(t, pt)) void act({ x: pt.x - d.ox, y: pt.y - d.oy });
    else { setMove(null); setHint(`Not there — put it on the ${lower(nameOf(t))}.`); }
  }

  async function act(from?: { x: number; y: number }) {
    if (a?.type !== "drag" || busy) return;
    const it = byId(a.item), t = byId(a.onto);
    if (!it || !t) return;
    setPicked(false); setBusy(true); setHint(null);
    const { h } = dims(it), m = mouth(t);
    if (a.pour) {
      let pos: Move;
      if (it.kind === "pipette") pos = { id: it.id, x: m.x, y: m.y + 26, tilt: 0 };
      else {
        const tilt = it.x <= m.x ? 62 : -62, rad = (tilt * Math.PI) / 180;
        pos = { id: it.id, x: m.x - (h / 2) * Math.sin(rad), y: m.y - 12 + (h / 2) * Math.cos(rad) + h / 2, tilt };
      }
      setMove(pos);
      await wait(600);
      if (!alive.current) return;
      setPour({ x: m.x, y: it.kind === "pipette" ? m.y + 26 : m.y - 12, colour: String(it.props?.liquid ?? "#BFDBFE"), drops: it.kind !== "bottle" });
      await wait(1100);
      if (!alive.current) return;
      setPour(null);
    } else {
      setMove(from ? { id: it.id, ...from, tilt: 0, instant: true } : { id: it.id, x: t.x, y: Math.max(h + 10, t.y - dims(t).h * 0.35), tilt: 0 });
      await wait(from ? 250 : 650);
      if (!alive.current) return;
    }
    const r = runRef.current;
    finish(doStep(p.steps[r.step], r.s, r.values).s);
    setMove(null); setBusy(false);
  }

  // ── Holding a tap, waiting ──
  function startHold() {
    if (holdingRef.current || a?.type !== "hold" || busy) return;
    holdingRef.current = true; setHolding(true); setHint(null);
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const r = runRef.current, st = p.steps[r.step];
      if (!holdingRef.current || st?.action.type !== "hold" || !st.tick) return;
      setRun({ ...r, s: st.tick(r.s, dt * st.action.rate) });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  }
  function stopHold() {
    if (!holdingRef.current) return;
    holdingRef.current = false; setHolding(false);
    cancelAnimationFrame(raf.current);
    const r = runRef.current, st = p.steps[r.step];
    if (st?.finished?.(r.s)) finish(r.s);
  }
  function oneDrop() {
    const r = runRef.current, st = p.steps[r.step];
    if (st?.action.type !== "hold" || !st.tick) return;
    const s2 = st.tick(r.s, st.action.drop);
    if (st.finished?.(s2)) finish(s2); else setRun({ ...r, s: s2 });
  }
  function startWait() {
    if (busy || a?.type !== "wait") return;
    setBusy(true);
    let last = performance.now();
    const loop = (now: number) => {
      if (!alive.current) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const r = runRef.current, st = p.steps[r.step];
      if (!st?.tick) { setBusy(false); return; }
      const s2 = st.tick(r.s, dt);
      if (st.finished?.(s2) ?? true) { finish(s2); setBusy(false); return; }
      setRun({ ...r, s: s2 });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  }

  function setDone(v = setVal) {
    if (a?.type !== "set" || v == null) return;
    if (Math.abs(v - a.target) <= a.tolerance + 1e-9) { lastSet.current[a.item] = v; finish(step!.apply ? step!.apply(runRef.current.s, v) : runRef.current.s); }
    else setHint(`It's on ${v} ${a.unit} — turn it to ${a.target} ${a.unit}.`);
  }
  function tapIt() { if (a?.type === "tap" && !busy) finish(step!.apply ? step!.apply(runRef.current.s) : runRef.current.s); }

  // Do the step for the learner (and for a teacher showing the class).
  function doForMe() {
    if (!step || busy) return;
    const r = runRef.current;
    if (a?.type === "drag") return void act();
    if (a?.type === "wait") return startWait();
    if (a?.type === "set") { setSetVal(a.target); return setDone(a.target); }
    const out = doStep(step, r.s, r.values);
    finish(out.s, out.values, a?.type === "record" ? a.fields.map((f) => f.key) : []);
  }

  function restart() {
    if (!sure) { setSure(true); setTimeout(() => alive.current && setSure(false), 3500); return; }
    cancelAnimationFrame(raf.current); holdingRef.current = false;
    setSure(false); setHolding(false); setBusy(false); setMove(null); setPour(null); lastSet.current = {};
    setRun(fresh(p)); setTab("protocol");
  }

  // ── Drawing the bench ──
  const order = [...items].filter((x) => !x.hidden).sort((x, y) => (x.z ?? 0) - (y.z ?? 0));
  const target = a?.type === "drag" ? byId(a.onto) : undefined;
  const actor = a && "item" in a ? byId(a.item) : undefined;
  const mag = step?.magnify ? byId(step.magnify) : undefined;
  const magLevel = mag?.props?.level as number | null | undefined;
  const lastNote = run.notes[run.step - 1];
  const place = (it: ItemView) => (move?.id === it.id ? move : { x: it.x, y: it.y, tilt: it.tilt ?? 0, instant: false });
  const drawItem = (it: ItemView) => {
    const pos = place(it), { h } = dims(it);
    const draggable = !busy && a?.type === "drag" && a.item === it.id;
    const droppable = picked && target?.id === it.id;
    return (
      <g key={it.id} data-item={it.id}
        role={draggable || droppable ? "button" : undefined}
        tabIndex={draggable || droppable ? 0 : undefined}
        aria-label={draggable ? `Pick up the ${lower(nameOf(it))}` : droppable ? `Put it on the ${lower(nameOf(it))}` : undefined}
        onPointerDown={draggable ? (e) => down(e, it) : undefined}
        onClick={droppable ? () => void act() : undefined}
        onKeyDown={draggable || droppable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (droppable) void act(); else setPicked(true); } } : undefined}
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) translate(0px, ${-h / 2}px) rotate(${pos.tilt}deg) translate(0px, ${h / 2}px)`,
          transition: pos.instant ? "none" : "transform .55s cubic-bezier(.2,.8,.2,1)",
          cursor: draggable ? "grab" : droppable ? "pointer" : undefined,
          touchAction: draggable ? "none" : undefined, outline: "none",
        }}>
        {hasShadow(it.kind) && !(move?.id === it.id) && <ellipse cx={0} cy={1} rx={dims(it).w * 0.45} ry={6} fill="#000" fillOpacity=".22" />}
        <Apparatus it={it} flowing={holding && it.kind === "stand"} />
      </g>
    );
  };
  const ring = (it: ItemView | undefined, kind: "do" | "to") => {
    if (!it || it.kind === "wires") return null;
    const { w, h } = dims(it), pos = place(it);
    return <rect key={`${kind}-${it.id}`} x={pos.x - w / 2 - 14} y={pos.y - h - 14} width={w + 28} height={h + 28} rx={18}
      fill="none" stroke={kind === "do" ? "#FDE047" : "#34D399"} strokeWidth={3} strokeDasharray={kind === "to" ? "10 8" : undefined}
      className={kind === "do" ? "bench-pulse" : undefined} pointerEvents="none" />;
  };
  // Tap / hold steps: the apparatus itself is the button too.
  const zone = actor && (a?.type === "tap" || a?.type === "hold") ? (() => {
    const { w, h } = dims(actor);
    return <rect x={actor.x - w / 2 - 10} y={actor.y - h - 10} width={w + 20} height={h + 20} fill="transparent" style={{ cursor: "pointer", touchAction: "none" }}
      onClick={a.type === "tap" ? tapIt : undefined}
      onPointerDown={a.type === "hold" ? (e) => { e.preventDefault(); startHold(); } : undefined}
      onPointerUp={a.type === "hold" ? stopHold : undefined} onPointerLeave={a.type === "hold" ? stopHold : undefined} onPointerCancel={a.type === "hold" ? stopHold : undefined} />;
  })() : null;

  const graph = p.graph?.(run.s, run.values) ?? null;
  const progress = Math.round((Math.min(run.step, p.steps.length) / p.steps.length) * 100);

  return (
    <div className="bench-lab space-y-3 text-slate-900">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow ring-1 ring-slate-200">
        <span className="rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white" style={{ background: subject.color }}>{subject.label}</span>
        <h2 className="min-w-0 flex-1 truncate text-base font-black sm:text-lg">{p.title}</h2>
        <div className="flex items-center gap-2" aria-label={`Progress: ${progress}%`}>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200 sm:w-36"><div className="h-full rounded-full bg-[#0E6E72] transition-all" style={{ width: `${progress}%` }} /></div>
          <span className="text-xs font-black tabular-nums text-slate-500">{Math.min(run.step, p.steps.length)}/{p.steps.length}</span>
        </div>
        <button type="button" onClick={restart} className={`min-h-[40px] rounded-xl px-3 text-xs font-black ${sure ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
          {sure ? "Sure? Start again" : "Restart"}
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-3">
          <div className="elab-panel overflow-hidden" style={{ padding: 0 }}>
            <svg ref={svg} viewBox={`0 ${VIEW.y} ${W} ${VIEW.h}`} className="block h-auto w-full select-none" role="group" aria-label={`Lab bench: ${p.title}`}
              style={{ fontFamily: "system-ui, sans-serif" }} onPointerMove={moved} onPointerUp={up} onPointerCancel={() => { drag.current = null; setMove(null); }}>
              <BenchDefs />
              <Room />
              {order.filter((x) => move?.id !== x.id).map(drawItem)}
              {order.filter((x) => x.kind === "water-bath").map((x) => <g key={`front-${x.id}`} transform={`translate(${x.x},${x.y})`} pointerEvents="none"><Front it={x} /></g>)}
              {order.filter((x) => x.label && move?.id !== x.id).map((x) => (
                <g key={`tag-${x.id}`} transform={`translate(${x.x},${x.y + 26})`} pointerEvents="none">
                  <rect x={-(x.label!.length * 3.9 + 10)} y={-13} width={x.label!.length * 7.8 + 20} height={22} rx={11} fill="#0B1220" fillOpacity=".72" />
                  <text x={0} y={3} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">{x.label}</text>
                </g>
              ))}
              {!busy && !done && (a?.type === "drag" ? [ring(actor, "do"), ring(target, "to")] : ring(actor, "do"))}
              {zone}
              {order.filter((x) => move?.id === x.id).map(drawItem)}
              {pour && (pour.drops
                ? [0, 0.15, 0.3, 0.45].map((d) => <circle key={d} className="elab-drip" cx={pour.x} cy={pour.y} r={4} fill={pour.colour} style={{ animationDelay: `${d}s`, animationIterationCount: "infinite" }} />)
                : <path d={`M${pour.x},${pour.y} Q${pour.x + 2},${pour.y + 25} ${pour.x},${pour.y + 60}`} className="elab-flow" fill="none" stroke={pour.colour} strokeWidth={6} strokeLinecap="round" strokeDasharray="14 4" />)}
              {mag && magLevel != null && <Magnifier level={magLevel} liquid={String(mag.props?.liquid ?? "#BFDBFE")} at={{ x: mag.x + BURETTE.x, y: mag.y + buretteY(magLevel) }} />}
            </svg>
          </div>

          <section aria-live="polite" className="rounded-2xl bg-white p-3 shadow ring-1 ring-slate-200 sm:p-4">
            {done ? (
              <div>
                <p className="text-base font-black text-[#0A4F52]">✓ Practical complete</p>
                <p className="mt-1 text-sm text-slate-700">{p.conclusion(run.s, run.values)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setTab("results")} className="min-h-[44px] rounded-xl bg-[#0E6E72] px-4 text-sm font-black text-white">See the results</button>
                  <button type="button" onClick={restart} className="min-h-[44px] rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700">{sure ? "Sure? Start again" : "Do it again (new samples)"}</button>
                </div>
              </div>
            ) : step && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-[#0E6E72]">Step {run.step + 1} of {p.steps.length}</p>
                <h3 className="text-base font-black sm:text-lg">{step.title}</h3>
                <p className="mt-0.5 text-sm text-slate-600">{step.how}</p>
                <div className="mt-3">
                  {a?.type === "drag" && (
                    <p className="text-sm font-bold text-slate-700">
                      {picked ? <>Now tap the <span className="text-[#047857]">{lower(nameOf(target))}</span> (green outline). <button type="button" onClick={() => setPicked(false)} className="ml-1 underline">Cancel</button></>
                        : <>Drag the <span className="text-[#A16207]">{lower(nameOf(actor))}</span> (yellow outline) onto the <span className="text-[#047857]">{lower(nameOf(target))}</span> — or tap one, then the other.</>}
                    </p>
                  )}
                  {a?.type === "tap" && <button type="button" onClick={tapIt} className="min-h-[48px] rounded-xl bg-[#0E6E72] px-5 text-sm font-black text-white">{a.label}</button>}
                  {a?.type === "hold" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" aria-pressed={holding}
                        onPointerDown={(e) => { e.preventDefault(); startHold(); }} onPointerUp={stopHold} onPointerLeave={stopHold} onPointerCancel={stopHold}
                        onKeyDown={(e: ReactKeyboardEvent) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); startHold(); } }}
                        onKeyUp={(e: ReactKeyboardEvent) => { if (e.key === " " || e.key === "Enter") stopHold(); }}
                        onContextMenu={(e) => e.preventDefault()}
                        className={`min-h-[52px] select-none rounded-xl px-5 text-sm font-black text-white transition ${holding ? "scale-[.97] bg-[#0A4F52]" : "bg-[#0E6E72]"}`} style={{ touchAction: "none" }}>
                        {holding ? "Running… let go to close the tap" : a.label}
                      </button>
                      <button type="button" onClick={oneDrop} disabled={holding} className="min-h-[52px] rounded-xl bg-[#EEF7F6] px-4 text-sm font-black text-[#0A4F52] ring-1 ring-[#A9D6D3]">Add one drop</button>
                    </div>
                  )}
                  {a?.type === "set" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex min-w-[220px] flex-1 items-center gap-3">
                        <span className="sr-only">{a.label}</span>
                        <input type="range" min={a.min} max={a.max} step={a.step} value={setVal ?? a.min} onChange={(e) => { setSetVal(Number(e.target.value)); setHint(null); }}
                          className="h-10 flex-1 accent-[#0E6E72]" aria-label={a.label} />
                        <output className="w-24 text-right font-mono text-lg font-black tabular-nums">{(setVal ?? a.min).toFixed(a.step < 1 ? 1 : 0)} {a.unit}</output>
                      </label>
                      <button type="button" onClick={() => setDone()} className="min-h-[44px] rounded-xl bg-[#0E6E72] px-5 text-sm font-black text-white">Done</button>
                    </div>
                  )}
                  {a?.type === "wait" && (
                    <button type="button" onClick={startWait} disabled={busy} className="min-h-[48px] rounded-xl bg-[#0E6E72] px-5 text-sm font-black text-white disabled:opacity-70">
                      {busy ? `⏩ ${a.minutes} minutes passing…` : `▶ ${a.label}`}
                    </button>
                  )}
                  {a?.type === "record" && (
                    <RecordForm key={run.step} fields={a.fields} s={run.s} values={run.values} graph={graph}
                      onDone={(v, shown) => finish(run.s, { ...run.values, ...v }, shown)} />
                  )}
                </div>
                {hint && <p role="alert" className="mt-2 text-sm font-bold text-amber-700">{hint}</p>}
                {a?.type !== "record" && (
                  <button type="button" onClick={doForMe} disabled={busy || holding} className="mt-3 min-h-[36px] rounded-lg px-2 text-xs font-black text-slate-500 underline decoration-dotted hover:text-slate-800 disabled:opacity-50">
                    Do this step for me
                  </button>
                )}
              </div>
            )}
            {lastNote && !done && <p className="mt-3 rounded-xl bg-[#EEF7F6] p-2.5 text-sm text-[#0A4F52]"><b>What you see:</b> {lastNote}</p>}
          </section>
        </div>

        <Notebook p={p} run={run} tab={tab} setTab={setTab} graph={graph} />
      </div>
    </div>
  );
}

// ── Writing readings in the notebook ──
function RecordForm({ fields, s, values, graph, onDone }: {
  fields: Field[]; s: any; values: Record<string, string>; graph: Graph | null;
  onDone: (v: Record<string, string>, shown: string[]) => void;
}) {
  const [v, setV] = useState<Record<string, string>>({});
  const [state, setState] = useState<Record<string, { ok?: boolean; shown?: boolean; hint?: string; tries: number }>>({});
  const locked = (k: string) => !!(state[k]?.ok || state[k]?.shown);
  function check() {
    const next = { ...state }, vals = { ...v };
    for (const f of fields) {
      if (locked(f.key)) continue;
      const res = checkField(f, vals[f.key] ?? "", s, { ...values, ...vals });
      const tries = (next[f.key]?.tries ?? 0) + (res === true ? 0 : 1);
      if (res === true) next[f.key] = { ok: true, tries };
      else if (tries >= 3) { vals[f.key] = f.answer(s, { ...values, ...vals }); next[f.key] = { shown: true, tries, hint: res }; }
      else next[f.key] = { hint: res, tries };
    }
    setV(vals); setState(next);
    if (fields.every((f) => next[f.key]?.ok || next[f.key]?.shown)) {
      setTimeout(() => onDone(vals, fields.filter((f) => next[f.key]?.shown).map((f) => f.key)), 700);
    }
  }
  function showMe() {
    const vals = { ...v }, next = { ...state };
    for (const f of fields) if (!locked(f.key)) { vals[f.key] = f.answer(s, { ...values, ...vals }); next[f.key] = { shown: true, tries: 3 }; }
    setV(vals); setState(next);
    setTimeout(() => onDone(vals, fields.filter((f) => next[f.key]?.shown).map((f) => f.key)), 700);
  }
  const all = fields.every((f) => locked(f.key));
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!all) check(); }} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="space-y-2.5">
        {fields.map((f) => {
          const st = state[f.key];
          return (
            <div key={f.key}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-[120px] text-sm font-black text-slate-800">{f.label}</span>
                {f.options ? (
                  <div role="radiogroup" aria-label={f.label} className="flex flex-wrap gap-1.5">
                    {f.options.map((o) => (
                      <button key={o} type="button" role="radio" aria-checked={v[f.key] === o} disabled={locked(f.key)}
                        onClick={() => { setV({ ...v, [f.key]: o }); setState({ ...state, [f.key]: { tries: st?.tries ?? 0 } }); }}
                        className={`min-h-[40px] rounded-lg px-3 text-sm font-bold ring-1 ${v[f.key] === o ? "bg-[#0E6E72] text-white ring-[#0E6E72]" : "bg-white text-slate-700 ring-slate-300"} disabled:opacity-90`}>{o}</button>
                    ))}
                  </div>
                ) : (
                  <label className="flex items-center gap-1.5">
                    <span className="sr-only">{f.label}</span>
                    <input value={v[f.key] ?? ""} inputMode="decimal" autoComplete="off" disabled={locked(f.key)} aria-label={f.label}
                      onChange={(e) => { setV({ ...v, [f.key]: e.target.value }); setState({ ...state, [f.key]: { tries: st?.tries ?? 0 } }); }}
                      className="h-11 w-32 rounded-lg border border-slate-300 bg-white px-3 font-mono text-base font-bold text-slate-900 focus:border-[#0E6E72] focus:outline-none focus:ring-2 focus:ring-[#A9D6D3] disabled:bg-slate-50" />
                    {f.unit && <span className="text-sm font-bold text-slate-500">{f.unit}</span>}
                  </label>
                )}
                {st?.ok && <span className="text-sm font-black text-[#047857]">✓ Right</span>}
                {st?.shown && <span className="text-sm font-black text-amber-700">Answer shown</span>}
              </div>
              {st?.hint && !st.ok && <p className="mt-1 text-xs font-bold text-amber-700">{st.shown ? `${st.hint} The answer is filled in.` : `${st.hint} (${3 - st.tries} ${3 - st.tries === 1 ? "try" : "tries"} left)`}</p>}
            </div>
          );
        })}
        {!all && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="submit" className="min-h-[44px] rounded-xl bg-[#0E6E72] px-5 text-sm font-black text-white">Check</button>
            <button type="button" onClick={showMe} className="min-h-[44px] rounded-xl px-3 text-xs font-black text-slate-500 underline decoration-dotted">Show me the answer</button>
          </div>
        )}
      </div>
      {graph && <div className="rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200"><GraphView g={graph} /></div>}
    </form>
  );
}

// ── The lab notebook ──
function Notebook({ p, run, tab, setTab, graph }: { p: Practical; run: Run; tab: "protocol" | "results" | "about"; setTab: (t: "protocol" | "results" | "about") => void; graph: Graph | null }) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => { // keep the current step in view (without scrolling the page)
    const box = list.current, li = box?.querySelector<HTMLElement>("[data-current]");
    if (box && li) box.scrollTop = Math.max(0, li.offsetTop - box.offsetTop - 60);
  }, [run.step, tab]);
  const done = run.step >= p.steps.length;
  const tabs: [typeof tab, string][] = [["protocol", "Protocol"], ["results", "Results"], ["about", "Aim & safety"]];
  return (
    <aside className="flex max-h-[720px] min-h-[320px] flex-col overflow-hidden rounded-2xl bg-[#FFFDF7] shadow ring-1 ring-slate-200" aria-label="Lab notebook">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <p className="text-sm font-black text-slate-900">📓 Lab notebook</p>
      </div>
      <div role="tablist" aria-label="Notebook pages" className="flex gap-1 border-b border-slate-200 bg-white px-2 pt-1">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`min-h-[40px] rounded-t-lg px-3 text-xs font-black ${tab === k ? "bg-[#FFFDF7] text-[#0A4F52] ring-1 ring-slate-200 ring-b-0" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>
        ))}
      </div>
      {tab === "protocol" && (
        <ol ref={list} className="relative min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
          {p.steps.map((st, i) => {
            const isDone = i < run.step, cur = i === run.step;
            return (
              <li key={st.id} {...(cur ? { "data-current": "" } : {})}>
                {st.group && <p className={`mb-1 text-[11px] font-black uppercase tracking-wide text-slate-400 ${i ? "mt-3" : ""}`}>{st.group}</p>}
                <div className={`flex gap-2 rounded-xl p-2 ${cur ? "bg-[#EEF7F6] ring-2 ring-[#0E6E72]" : ""}`}>
                  <span aria-hidden className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${isDone ? "bg-[#0E6E72] text-white" : cur ? "bg-white text-[#0E6E72] ring-2 ring-[#0E6E72]" : "bg-slate-100 text-slate-400"}`}>{isDone ? "✓" : i + 1}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${isDone ? "text-slate-500" : cur ? "text-slate-900" : "text-slate-400"}`}>
                      <span className="sr-only">{isDone ? "Done: " : cur ? "Now: " : ""}</span>{st.title}
                    </p>
                    {cur && <p className="mt-0.5 text-xs text-slate-600">{st.how}</p>}
                    {isDone && st.action.type === "record" && (
                      <p className="mt-0.5 text-xs font-bold text-[#0A4F52]">
                        {st.action.fields.map((f) => `${f.label}: ${run.values[f.key] ?? "—"}${f.unit ? ` ${f.unit}` : ""}${run.shown.includes(f.key) ? " (shown)" : ""}`).join(" · ")}
                      </p>
                    )}
                    {isDone && run.notes[i] && <p className="mt-0.5 text-xs italic text-slate-500">{run.notes[i]}</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {tab === "results" && (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
          {p.results(run.s, run.values).map((t) => (
            <div key={t.title}>
              <p className="mb-1 text-sm font-black text-slate-900">{t.title}</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead><tr>{t.columns.map((c, i) => <th key={i} className="border border-slate-300 bg-slate-100 px-2 py-1 text-left font-black text-slate-700">{c}</th>)}</tr></thead>
                  <tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={`border border-slate-300 px-2 py-1 ${j ? "font-mono tabular-nums" : "font-bold"} text-slate-800`}>{c}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
          ))}
          {graph && <div><p className="mb-1 text-sm font-black text-slate-900">{graph.title}</p><GraphView g={graph} /></div>}
          <div>
            <p className="mb-1 text-sm font-black text-slate-900">Conclusion</p>
            <p className="text-sm text-slate-700">{done ? p.conclusion(run.s, run.values) : "Finish the protocol to write the conclusion."}</p>
          </div>
        </div>
      )}
      {tab === "about" && (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm text-slate-700">
          <div><p className="font-black text-slate-900">Aim</p><p>{p.aim}</p></div>
          <div><p className="font-black text-slate-900">Safety</p><ul className="list-disc space-y-1 pl-5">{p.safety.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <p className="text-xs text-slate-500">Every run uses new samples, so the readings — and the answers — change each time.</p>
        </div>
      )}
    </aside>
  );
}

// ── A graph, drawn the way it's drawn in an exercise book ──
function niceStep(x: number) { const k = 10 ** Math.floor(Math.log10(x)), f = x / k; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * k; }
const tidy = (v: number) => String(Number(v.toFixed(6)));
export function GraphView({ g }: { g: Graph }) {
  const w = 320, h = 220, m = { l: 46, r: 12, t: 10, b: 40 };
  const xs = [0, ...g.points.map((q) => q[0]), ...(g.line ?? []).map((q) => q[0])];
  const ys = [0, ...g.points.map((q) => q[1]), ...(g.line ?? []).map((q) => q[1])];
  const axis = (vals: number[]) => {
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi === lo) hi = lo + 1;
    const st = niceStep((hi - lo) / 5);
    return { lo: Math.floor(lo / st + 1e-9) * st, hi: Math.ceil(hi / st - 1e-9) * st, st };
  };
  const ax = axis(xs), ay = axis(ys);
  const X = (v: number) => m.l + ((v - ax.lo) / (ax.hi - ax.lo)) * (w - m.l - m.r);
  const Y = (v: number) => h - m.b - ((v - ay.lo) / (ay.hi - ay.lo)) * (h - m.t - m.b);
  const ticks = (a: { lo: number; hi: number; st: number }) => { const out: number[] = []; for (let v = a.lo; v <= a.hi + a.st / 2; v += a.st) out.push(Number(v.toFixed(9))); return out; };
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" role="img" aria-label={`${g.title}: ${g.points.map((q) => `(${tidy(q[0])}, ${tidy(q[1])})`).join(", ")}`} style={{ fontFamily: "system-ui, sans-serif" }}>
      <rect x={m.l} y={m.t} width={w - m.l - m.r} height={h - m.t - m.b} fill="#fff" />
      {ticks(ax).map((v) => <g key={`x${v}`}><line x1={X(v)} y1={m.t} x2={X(v)} y2={h - m.b} stroke="#CDE7E5" /><text x={X(v)} y={h - m.b + 14} textAnchor="middle" fontSize={10} fill="#475569">{tidy(v)}</text></g>)}
      {ticks(ay).map((v) => <g key={`y${v}`}><line x1={m.l} y1={Y(v)} x2={w - m.r} y2={Y(v)} stroke="#CDE7E5" /><text x={m.l - 5} y={Y(v) + 3} textAnchor="end" fontSize={10} fill="#475569">{tidy(v)}</text></g>)}
      <line x1={X(0)} y1={m.t} x2={X(0)} y2={h - m.b} stroke="#334155" strokeWidth={1.5} />
      <line x1={m.l} y1={Y(0)} x2={w - m.r} y2={Y(0)} stroke="#334155" strokeWidth={1.5} />
      {g.line && <line x1={X(g.line[0][0])} y1={Y(g.line[0][1])} x2={X(g.line[1][0])} y2={Y(g.line[1][1])} stroke="#0E6E72" strokeWidth={2} />}
      {g.points.map(([x, y], i) => <g key={i} stroke="#B91C1C" strokeWidth={2}><line x1={X(x) - 4} y1={Y(y) - 4} x2={X(x) + 4} y2={Y(y) + 4} /><line x1={X(x) - 4} y1={Y(y) + 4} x2={X(x) + 4} y2={Y(y) - 4} /></g>)}
      <text x={(m.l + w - m.r) / 2} y={h - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0F172A">{g.x}</text>
      <text transform={`translate(12,${(m.t + h - m.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0F172A">{g.y}</text>
    </svg>
  );
}
