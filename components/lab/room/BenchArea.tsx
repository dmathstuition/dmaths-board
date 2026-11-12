"use client";
// The free experiment bench: the apparatus a learner picked, set out on a bench.
// Drag one onto another (or tap one, then the other) and they act on each other;
// time runs (faster if you like) so things heat up, boil and change colour; what
// happens is written in the notebook underneath.
import { useEffect, useRef, useState } from "react";
import type { Item } from "@/lib/lab/room/inventory";
import { circuitNote, circuitState, colourOf, combine, emptyBench, partOf, tick, type BenchState, type Fx } from "@/lib/lab/room/bench";
import { Bulb, Burner, Dial, Motor, Thermometer, Vessel, shapeOf } from "@/components/lab/room/Anim";
import { ItemPic } from "@/components/lab/room/ItemPic";

type Pos = Record<string, { x: number; y: number }>;
const isVessel = (it: Item) => it.spec.e === "vessel" || /tube|flask|beaker|dish|jar|bottle|calorimeter|trough|cylinder/i.test(it.name);
const DROP: Record<string, string> = { "#E0F2FE": "#BAE6FD" };

export default function BenchArea({ items, pos, bench, onMove, onRemove, onOpen, onBench }: {
  items: Item[]; pos: Pos; bench: BenchState; onMove: (id: string, p: { x: number; y: number }) => void; onRemove: (id: string) => void; onOpen: (id: string) => void; onBench: (b: BenchState) => void;
}) {
  const box = useRef<HTMLDivElement>(null), drag = useRef<{ id: string; dx: number; dy: number; moved: boolean; x0: number; y0: number } | null>(null);
  const [sel, setSel] = useState<string | null>(null), [flash, setFlash] = useState<{ id: string; fx: Fx; k: number; colour?: string } | null>(null);
  const [speed, setSpeed] = useState(5), [paused, setPaused] = useState(false), [last, setLast] = useState<{ text: string; ok: boolean } | null>(null);
  const benchRef = useRef(bench); benchRef.current = bench;
  // New pieces stand on the worktop, then on the shelf above it.
  const at = (it: Item, i: number) => pos[it.id] ?? { x: 2 + (i % 7) * 14, y: i < 7 ? 38 : 2 + Math.floor((i - 7) / 7) * 16 };
  // Time runs while something is heating or a circuit is joined.
  const busy = Object.values(bench.slots).some((s) => s.heat) || bench.wires.length > 1;
  useEffect(() => {
    if (!busy || paused) return;
    const t = setInterval(() => onBench(tick(benchRef.current, items, 0.25 * speed)), 250);
    return () => clearInterval(t);
  }, [busy, paused, speed, items, onBench]);

  function act(aId: string, bId: string) {
    const a = items.find((x) => x.id === aId), b = items.find((x) => x.id === bId);
    if (!a || !b || a.id === b.id) return;
    const r = combine(a, b, benchRef.current);
    const st = circuitState(r.st, items);
    onBench(st); setSel(null);
    // Assemble it: a vessel heated sits on the burner; a thermometer stands in the vessel.
    const where = (it: Item) => at(it, items.indexOf(it));
    if (r.fx === "heat" && r.ok) { const v = isVessel(a) ? a : b, h = v === a ? b : a, hp = where(h); onMove(v.id, { x: hp.x, y: Math.max(0, hp.y - 24) }); }
    if (a.spec.e === "scale" && a.spec.unit === "°C" && isVessel(b)) { const vp = where(b); onMove(a.id, { x: Math.min(90, vp.x + 9), y: Math.max(0, vp.y - 6) }); }
    const target = isVessel(b) ? b : isVessel(a) ? a : b;
    setFlash({ id: target.id, fx: r.fx, k: Date.now(), colour: a.spec.e === "reagent" || a.spec.e === "indicator" ? colourGuess(a) : undefined });
    setLast({ text: r.note, ok: r.ok });
  }
  const hit = (x: number, y: number, not: string) => {
    for (const el of box.current?.querySelectorAll<HTMLElement>("[data-bench-item]") ?? []) {
      if (el.dataset.benchItem === not) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return el.dataset.benchItem!;
    }
    return null;
  };
  const note = circuitNote(bench, items);
  const wired = items.filter((x) => bench.wires.includes(x.id));

  return (
    <div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Bench controls">
        <span className="text-xs font-black text-white/60">Time:</span>
        <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} className="min-h-[34px] rounded-lg bg-white/10 px-2.5 text-xs font-black">{paused ? "▶ Resume" : "⏸ Pause"}</button>
        {[1, 5, 20].map((s) => <button key={s} type="button" aria-pressed={speed === s} onClick={() => setSpeed(s)} className={`min-h-[34px] rounded-lg px-2.5 text-xs font-black ${speed === s ? "bg-white text-[#0B1220]" : "bg-white/10"}`}>×{s}</button>)}
        <button type="button" onClick={() => { onBench(emptyBench()); setLast(null); }} className="ml-auto min-h-[34px] rounded-lg bg-white/10 px-2.5 text-xs font-black">↺ Clean the bench</button>
      </div>
      <p className="mt-1 text-xs text-white/55">{sel ? <>Now tap what to put the <b>{items.find((x) => x.id === sel)?.name.toLowerCase()}</b> on (or into). <button type="button" className="underline" onClick={() => setSel(null)}>Cancel</button></> : "Drag one piece onto another — or tap one, then the other. Tap ⓘ to look at it."}</p>
      <div ref={box} aria-label="My bench" className="relative mt-1 h-80 overflow-hidden rounded-2xl ring-1 ring-white/15 sm:h-96" style={{ background: "linear-gradient(#1E293B 0 33%, #8B5E34 33% 34.5%, #5B3A1A 34.5% 35.5%, #1E293B 35.5% 74%, #CBD5E1 74% 75.5%, #64748B 75.5%)", touchAction: "none" }}>
        {/* wires between the circuit's parts */}
        {wired.length > 1 && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            {wired.map((it, i) => { if (!i) return null; const p = at(wired[i - 1], items.indexOf(wired[i - 1])), q = at(it, items.indexOf(it)); const flowing = wired.some((w) => (bench.slots[w.id]?.glow ?? 0) > 0 || bench.slots[w.id]?.spin || /A$/.test(bench.slots[w.id]?.reading ?? ""));
              return <g key={it.id}><line x1={`${p.x + 6}%`} y1={`${p.y + 14}%`} x2={`${q.x + 6}%`} y2={`${q.y + 14}%`} stroke="#DC2626" strokeWidth={3} strokeLinecap="round" />{flowing && <line x1={`${p.x + 6}%`} y1={`${p.y + 14}%`} x2={`${q.x + 6}%`} y2={`${q.y + 14}%`} stroke="#FDE047" strokeWidth={2} className="lr-flow" />}</g>; })}
          </svg>
        )}
        {!items.length && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/60">Your bench is empty — go back to the shelves and pick the apparatus you need.</p>}
        {items.map((it, i) => { const p = at(it, i), s = bench.slots[it.id] ?? {}, picked = sel === it.id, f = flash?.id === it.id ? flash : null; return (
          <div key={it.id} data-bench-item={it.id} className={`group absolute flex w-[100px] cursor-grab select-none flex-col items-center rounded-xl p-1 transition-shadow ${picked ? "bg-[#38BDF8]/20 ring-2 ring-[#38BDF8]" : "hover:bg-white/5"}`} style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: s.inside ? 3 : s.heat ? 2 : 1 }}
            onPointerDown={(e) => { if ((e.target as HTMLElement).closest("button")) return; const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); drag.current = { id: it.id, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false, x0: e.clientX, y0: e.clientY }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => { const d = drag.current, b = box.current?.getBoundingClientRect(); if (!d || d.id !== it.id || !b) return; if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 6) d.moved = true; if (!d.moved) return;
              onMove(it.id, { x: Math.max(0, Math.min(90, ((e.clientX - d.dx - b.left) / b.width) * 100)), y: Math.max(0, Math.min(62, ((e.clientY - d.dy - b.top) / b.height) * 100)) }); }}
            onPointerUp={(e) => { const d = drag.current; drag.current = null; if (!d) return;
              if (d.moved) { const target = hit(e.clientX, e.clientY, it.id); if (target) act(it.id, target); return; }
              if (sel && sel !== it.id) act(sel, it.id); else setSel(sel === it.id ? null : it.id); }}>
            <TileArt it={it} s={s} fx={f} />
            <span className="line-clamp-2 rounded bg-black/45 px-1 text-center text-[10px] font-black leading-tight">{it.name}</span>
            {s.reading && <span className="mt-0.5 rounded bg-black/50 px-1 font-mono text-[10px] font-bold text-[#34D399]">{s.reading}</span>}
            {s.liquid && <span className="mt-0.5 font-mono text-[9px] text-white/60">{Math.round(s.liquid.T)} °C</span>}
            <div className={`absolute -right-1.5 -top-1.5 flex gap-0.5 ${picked ? "" : "opacity-60 group-hover:opacity-100"}`}>
              <button type="button" onClick={() => onOpen(it.id)} aria-label={`About the ${it.name}`} className="h-6 w-6 rounded-full bg-white/80 text-[11px] font-black text-[#0B1220]">i</button>
              <button type="button" onClick={() => onRemove(it.id)} aria-label={`Take the ${it.name} off the bench`} className="h-6 w-6 rounded-full bg-red-500 text-xs font-black">×</button>
            </div>
            {partOf(it) === "switch" && <button type="button" onClick={() => onBench(circuitState({ ...bench, slots: { ...bench.slots, [it.id]: { ...s, on: !s.on } } }, items))} className="mt-1 rounded bg-white/15 px-1.5 text-[10px] font-black" aria-pressed={!!s.on}>{s.on ? "Open it" : "Close it"}</button>}
            {s.heat && <button type="button" onClick={() => onBench({ ...bench, slots: { ...bench.slots, [it.id]: { ...s, heat: null, boiling: false }, ...(s.heat ? { [s.heat]: { ...bench.slots[s.heat], on: false } } : {}) } })} className="mt-1 rounded bg-white/15 px-1.5 text-[10px] font-black">Off the heat</button>}
            {s.liquid && !s.heat && <button type="button" onClick={() => onBench({ ...bench, slots: { ...bench.slots, [it.id]: { ...s, liquid: undefined, boiling: false } } })} className="mt-1 rounded bg-white/15 px-1.5 text-[10px] font-black">Empty it</button>}
          </div>
        ); })}
      </div>
      {note && <p role="status" className="mt-2 rounded-lg bg-[#38BDF8]/10 px-3 py-2 text-sm font-bold text-[#BAE6FD]">⚡ {note}</p>}
      {last && <p role="status" aria-label="What happened" className={`lr-pop mt-2 rounded-lg px-3 py-2 text-sm font-bold ${last.ok ? "bg-emerald-500/15 text-emerald-100" : "bg-amber-500/15 text-amber-100"}`}>{last.ok ? "👀 " : "💡 "}{last.text}</p>}
      {bench.log.length > 0 && (
        <section aria-label="My observations" className="mt-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <p className="text-sm font-black">📓 My observations</p>
          <ol className="mt-1 grid gap-1 text-sm text-white/80">{bench.log.slice(-12).map((l, i) => <li key={`${l.at}-${i}`}>{new Date(l.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — {l.text}</li>)}</ol>
        </section>
      )}
    </div>
  );
}

function colourGuess(it: Item) {
  if (it.spec.e === "indicator") return "#A78BFA";
  const f = it.spec.e === "reagent" ? it.spec.formula : "";
  return ({ CuSO4: "#60A5FA", FeSO4: "#BEF264", FeCl3: "#D97706", KMnO4: "#7E22CE", "I2/KI": "#92400E", "Br2(aq)": "#EA580C" } as Record<string, string>)[f] ?? DROP["#E0F2FE"];
}

// What a tile looks like now: liquid in glassware, a lit burner, a glowing bulb…
function TileArt({ it, s, fx }: { it: Item; s: BenchState["slots"][string]; fx: { fx: Fx; k: number; colour?: string } | null }) {
  const part = partOf(it);
  if (isVessel(it) && it.spec.e !== "scale") {
    const l = s.liquid;
    return <Vessel shape={shapeOf(it.name)} size={62} level={l ? Math.min(0.85, 0.25 + l.vol / 60) : 0} colour={l ? colourOf(l) : undefined} ppt={l?.ppt?.colour} fizz={!!l?.gas && fx?.fx !== "none" ? true : !!l?.gas} boiling={!!s.boiling} milky={l?.milky}
      drop={fx && (fx.fx === "pour" || fx.fx === "drop" || fx.fx === "colour" || fx.fx === "ppt" || fx.fx === "fizz") ? { colour: fx.colour ?? "#BAE6FD", key: fx.k } : null} />;
  }
  if (it.spec.e === "heater" && it.spec.power > 0) return <Burner on={!!s.on} kind={/plate|mantle|bath|furnace|oven|ceramic/i.test(it.name) ? "plate" : /spirit|lamp/i.test(it.name) ? "lamp" : "bunsen"} size={56} />;
  if (it.spec.e === "scale" && it.spec.unit === "°C") return <Thermometer T={parseFloat(s.reading ?? "25")} size={58} />;
  if (part === "lamp" || part === "led") return <Bulb glow={s.glow ?? 0} led={part === "led"} size={48} />;
  if (part === "motor" || part === "bell") return <div className={s.spin && part === "bell" ? "lr-ring" : ""}><Motor spin={s.spin && part === "motor"} size={48} /></div>;
  if (part === "ammeter" || part === "voltmeter") { const v = parseFloat(s.reading ?? "0"); return <Dial value={v} max={part === "ammeter" ? 1 : 12} unit={part === "ammeter" ? "A" : "V"} size={60} />; }
  if (part === "fuse" && s.blown) return <span className="text-3xl" aria-label="Blown">💥</span>;
  return <div className={fx?.fx === "click" ? "lr-bump" : ""} key={fx?.k}><ItemPic item={it} size={48} /></div>;
}
