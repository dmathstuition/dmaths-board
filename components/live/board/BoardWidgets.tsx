"use client";
import { useEffect, useRef, useState } from "react";
import { useServerClock } from "@/lib/serverClock";
import { BOARD_W } from "@/lib/whiteboard";
import {
  fmtClock, pauseTimer, pickName, resumeTimer, rollDice, startStopwatch, startTimer, timerRunning, timerShows,
  type Placed, type SpotState, type Widgets,
} from "@/lib/boardTools";
import { play } from "@/lib/games/fx";
import { CalcPanel, GraphPanel, NumberLinePanel } from "@/components/live/board/MathPanels";
import { localDelta, localPoint } from "@/components/live/board/rotation";
import { ClockPanel, FractionPanel, GroupsPanel, HundredPanel, PlaceValuePanel, SentencePanel, SpellPanel, WordCardPanel } from "@/components/live/board/MorePanels";
import { BoardIcon } from "@/components/live/board/BoardIcons";

// The class tools that sit on top of the board: timer, dice, name picker,
// screen shade, ruler and protractor. Only the host can change them; every
// learner sees the same thing. `boxW` is the board's width in CSS pixels.
export default function BoardWidgets({ w, host, onChange, boxW, names }: {
  w: Widgets; host: boolean; onChange: (next: Widgets, final?: boolean) => void; boxW: number; names: string[];
}) {
  const scale = boxW / BOARD_W;
  return (
    <>
      {w.shade.on && <Shade pct={w.shade.pct} host={host} onChange={(pct, final) => onChange({ ...w, shade: { on: true, pct } }, final)} onClose={() => onChange({ ...w, shade: { ...w.shade, on: false } }, true)} />}
      {w.ruler.on && <Ruler p={w.ruler} scale={scale} host={host} onChange={(ruler, final) => onChange({ ...w, ruler }, final)} />}
      {w.graph.on && <GraphPanel g={w.graph} host={host} boxW={boxW} onChange={(graph, final) => onChange({ ...w, graph }, final)} />}
      {w.calc.on && <CalcPanel c={w.calc} host={host} onChange={(calc, final) => onChange({ ...w, calc }, final)} />}
      {w.numberLine.on && <NumberLinePanel l={w.numberLine} host={host} boxW={boxW} onChange={(numberLine, final) => onChange({ ...w, numberLine }, final)} />}
      {w.hundred.on && <HundredPanel s={w.hundred} host={host} boxW={boxW} onChange={(hundred, final) => onChange({ ...w, hundred }, final)} />}
      {w.fractions.on && <FractionPanel s={w.fractions} host={host} boxW={boxW} onChange={(fractions, final) => onChange({ ...w, fractions }, final)} />}
      {w.placeValue.on && <PlaceValuePanel s={w.placeValue} host={host} boxW={boxW} onChange={(placeValue, final) => onChange({ ...w, placeValue }, final)} />}
      {w.clock.on && <ClockPanel s={w.clock} host={host} boxW={boxW} onChange={(clock, final) => onChange({ ...w, clock }, final)} />}
      {w.wordCard.on && <WordCardPanel s={w.wordCard} host={host} boxW={boxW} onChange={(wordCard, final) => onChange({ ...w, wordCard }, final)} />}
      {w.sentence.on && <SentencePanel s={w.sentence} host={host} boxW={boxW} onChange={(sentence, final) => onChange({ ...w, sentence }, final)} />}
      {w.spell.on && <SpellPanel s={w.spell} host={host} boxW={boxW} onChange={(spell, final) => onChange({ ...w, spell }, final)} />}
      {w.groups.on && <GroupsPanel s={w.groups} host={host} boxW={boxW} names={names} onChange={(groups, final) => onChange({ ...w, groups }, final)} />}
      {w.spotlight.on && <Spotlight s={w.spotlight} host={host} boxW={boxW} onChange={(spotlight, final) => onChange({ ...w, spotlight }, final)} />}
      {w.protractor.on && <Protractor p={w.protractor} scale={scale} host={host} onChange={(protractor, final) => onChange({ ...w, protractor }, final)} />}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-2">
        <div className="flex flex-col gap-2">
          {w.dice && <Dice values={w.dice.values} at={w.dice.at} host={host} onRoll={(n) => onChange({ ...w, dice: { values: rollDice(n), at: Date.now() } }, true)} onClose={() => onChange({ ...w, dice: null }, true)} />}
        </div>
        <div className="flex flex-col items-end gap-2">
          {w.timer && <TimerCard w={w} host={host} onChange={onChange} />}
        </div>
      </div>
      {w.picker && <Picker name={w.picker.name} at={w.picker.at} host={host} onPick={() => onChange({ ...w, picker: { name: pickName(names, w.picker?.name ?? null) ?? "No learners here yet", at: Date.now() } }, true)} onClose={() => onChange({ ...w, picker: null }, true)} />}
    </>
  );
}

const card = "pointer-events-auto rounded-2xl bg-white/95 p-3 text-ink shadow-xl ring-1 ring-black/10 backdrop-blur";
const mini = "min-h-[36px] rounded-lg px-2.5 text-xs font-black transition";

function TimerCard({ w, host, onChange }: { w: Widgets; host: boolean; onChange: (n: Widgets, f?: boolean) => void }) {
  const t = w.timer!;
  // Server time, not this device's clock: the teacher's and learners' phones
  // can disagree by minutes (lib/serverClock).
  const clock = useServerClock();
  const [now, setNow] = useState(clock());
  const rang = useRef(false);
  useEffect(() => { const id = setInterval(() => setNow(clock()), 250); return () => clearInterval(id); }, []);
  const secs = timerShows(t, now);
  const done = t.mode === "down" && secs === 0 && timerRunning(t);
  useEffect(() => { if (done && !rang.current) { rang.current = true; play("finish"); } if (!done) rang.current = false; }, [done]);
  const set = (timer: Widgets["timer"]) => onChange({ ...w, timer }, true);
  return (
    <div className={`${card} min-w-[180px] text-center ${done ? "animate-pulse ring-4 ring-red-400" : ""}`} role="timer" aria-live="off">
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-ink/50">{t.mode === "up" ? "Stopwatch" : done ? "Time's up!" : "Timer"}</p>
      <p className={`font-mono text-5xl font-black tabular-nums ${done ? "text-red-600" : secs <= 10 && t.mode === "down" ? "text-amber-600" : "text-ink"}`}>{fmtClock(secs)}</p>
      {host && (
        <div className="mt-2 space-y-1.5">
          {!timerRunning(t) && t.left == null && t.mode === "down" && (
            <div className="flex flex-wrap justify-center gap-1">
              {[30, 60, 120, 300, 600].map((s) => <button key={s} type="button" onClick={() => set({ ...t, seconds: s })} className={`${mini} ${t.seconds === s ? "bg-[#1657C9] text-white" : "bg-ink/5"}`}>{s < 60 ? `${s}s` : `${s / 60}m`}</button>)}
            </div>
          )}
          <div className="flex justify-center gap-1">
            {timerRunning(t) ? <button type="button" onClick={() => set(pauseTimer(t, clock()))} className={`${mini} bg-amber-400`}>Pause</button>
              : t.left != null ? <button type="button" onClick={() => set(resumeTimer(t, clock()))} className={`${mini} bg-emerald-500 text-white`}>Resume</button>
                : <button type="button" onClick={() => set(t.mode === "up" ? startStopwatch(clock()) : startTimer(t.seconds, clock()))} className={`${mini} bg-emerald-500 text-white`}>Start</button>}
            <button type="button" onClick={() => set(t.mode === "up" ? { ...t, startedAt: null, left: null } : { ...t, endsAt: null, left: null })} className={`${mini} bg-ink/5`}>Reset</button>
            <button type="button" onClick={() => set({ seconds: 60, endsAt: null, left: null, startedAt: null, mode: t.mode === "up" ? "down" : "up" })} className={`${mini} bg-ink/5`}>{t.mode === "up" ? "Timer" : "Stopwatch"}</button>
            <button type="button" onClick={() => set(null)} aria-label="Close timer" className={`${mini} bg-ink/5`}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[25, 25], [50, 50], [75, 75]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]], 6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};
function Dice({ values, at, host, onRoll, onClose }: { values: number[]; at: number; host: boolean; onRoll: (n: number) => void; onClose: () => void }) {
  const [shown, setShown] = useState(values);
  useEffect(() => {
    // A short tumble before landing on the real result (skipped under reduced motion).
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setShown(values); return; }
    let n = 0;
    const id = setInterval(() => { n++; setShown(values.map(() => 1 + Math.floor(Math.random() * 6))); if (n > 7) { clearInterval(id); setShown(values); } }, 70);
    return () => clearInterval(id);
  }, [at, values]);
  return (
    <div className={card}>
      <div className="flex gap-2" aria-label={`Dice show ${values.join(" and ")}`}>
        {shown.map((v, i) => (
          <svg key={i} viewBox="0 0 100 100" className="h-16 w-16 drop-shadow"><rect x="4" y="4" width="92" height="92" rx="18" fill="#fff" stroke="#CBD5E1" strokeWidth="4" />
            {PIPS[v].map(([cx, cy], k) => <circle key={k} cx={cx} cy={cy} r="9" fill="#1E1B4B" />)}</svg>
        ))}
      </div>
      {values.length > 1 && <p className="mt-1 text-center text-sm font-black">Total {values.reduce((a, b) => a + b, 0)}</p>}
      {host && (
        <div className="mt-2 flex justify-center gap-1">
          {[1, 2, 3].map((n) => <button key={n} type="button" onClick={() => onRoll(n)} className={`${mini} bg-[#1657C9] text-white`}>Roll {n}</button>)}
          <button type="button" onClick={onClose} aria-label="Close dice" className={`${mini} bg-ink/5`}>✕</button>
        </div>
      )}
    </div>
  );
}

function Picker({ name, at, host, onPick, onClose }: { name: string; at: number; host: boolean; onPick: () => void; onClose: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div key={at} className={`${card} arcade-pop px-8 py-5 text-center`}>
        <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#1657C9]">🎯 It&apos;s your turn</p>
        <p className="mt-1 font-display text-4xl font-black text-ink">{name}</p>
        {host && (
          <div className="mt-3 flex justify-center gap-1.5">
            <button type="button" onClick={onPick} className={`${mini} bg-[#1657C9] text-white`}>Pick again</button>
            <button type="button" onClick={onClose} className={`${mini} bg-ink/5`}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Shade({ pct, host, onChange, onClose }: { pct: number; host: boolean; onChange: (pct: number, final?: boolean) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = (e: React.PointerEvent) => {
    if (!host) return;
    const board = ref.current?.parentElement;
    if (!board) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const at = (ev: PointerEvent) => Math.round(Math.min(95, Math.max(5, localPoint(board, ev.clientX, ev.clientY)[1] * 100)));
    const move = (ev: PointerEvent) => onChange(at(ev));
    const up = (ev: PointerEvent) => { onChange(at(ev), true); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div ref={ref} className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-slate-800 to-slate-700" style={{ height: `${pct}%` }} aria-label="Screen shade covering part of the board">
      <p className="absolute inset-x-0 bottom-10 text-center text-sm font-black text-white/50">Screen shade</p>
      {host && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 pb-1.5">
          <button type="button" onPointerDown={drag} aria-label="Drag to reveal more or less" className="min-h-[34px] cursor-ns-resize touch-none rounded-full bg-white px-4 text-xs font-black text-ink shadow">↕ Drag to reveal</button>
          <button type="button" onClick={onClose} className="min-h-[34px] rounded-full bg-white/20 px-3 text-xs font-black text-white">Remove</button>
        </div>
      )}
    </div>
  );
}

// Drag a ruler/protractor by its body (host only); rotate with the buttons.
function useDrag(p: Placed, host: boolean, onChange: (p: Placed, final?: boolean) => void) {
  return (e: React.PointerEvent) => {
    if (!host || (e.target as HTMLElement).closest("button")) return;
    const board = (e.currentTarget as HTMLElement).parentElement;
    if (!board) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, start = p;
    const at = (ev: PointerEvent): Placed => {
      const [dx, dy] = localDelta(board, ev.clientX - sx, ev.clientY - sy);
      return { ...start, x: Math.min(1, Math.max(0, start.x + dx)), y: Math.min(1, Math.max(0, start.y + dy)) };
    };
    let last = 0;
    const move = (ev: PointerEvent) => { const n = Date.now(); if (n - last > 40) { last = n; onChange(at(ev)); } };
    const up = (ev: PointerEvent) => { onChange(at(ev), true); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
}
function Rotate({ p, onChange }: { p: Placed; onChange: (p: Placed, final?: boolean) => void }) {
  const b = "flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-black text-ink shadow ring-1 ring-black/10";
  return (
    <span className="absolute -top-10 left-1/2 flex -translate-x-1/2 gap-1" style={{ transform: `translateX(-50%) rotate(${-p.rot}deg)` }}>
      <button type="button" onClick={() => onChange({ ...p, rot: (p.rot + 345) % 360 }, true)} aria-label="Rotate left 15 degrees" className={b}>⟲</button>
      <span className="flex h-8 items-center rounded-full bg-white px-2 text-xs font-black shadow ring-1 ring-black/10">{p.rot}°</span>
      <button type="button" onClick={() => onChange({ ...p, rot: (p.rot + 15) % 360 }, true)} aria-label="Rotate right 15 degrees" className={b}>⟳</button>
      <button type="button" onClick={() => onChange({ ...p, on: false }, true)} aria-label="Put away" className={b}>✕</button>
    </span>
  );
}

function Ruler({ p, scale, host, onChange }: { p: Placed; scale: number; host: boolean; onChange: (p: Placed, final?: boolean) => void }) {
  const W = 1000, H = 90; // board units: a 30 cm ruler
  const drag = useDrag(p, host, onChange);
  return (
    <div onPointerDown={drag} className={`absolute z-[15] ${host ? "cursor-move touch-none" : "pointer-events-none"}`}
      style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: W * scale, height: H * scale, transform: `translate(-50%,-50%) rotate(${p.rot}deg)` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full drop-shadow-lg" role="img" aria-label="Ruler, 30 centimetres">
        <rect x="0" y="0" width={W} height={H} rx="8" fill="rgba(254,240,138,.82)" stroke="#CA8A04" strokeWidth="2" />
        {Array.from({ length: 301 }, (_, i) => {
          const x = 20 + i * ((W - 40) / 300), len = i % 10 === 0 ? 34 : i % 5 === 0 ? 24 : 14;
          return <line key={i} x1={x} x2={x} y1="0" y2={len} stroke="#713F12" strokeWidth={i % 10 === 0 ? 2 : 1} />;
        })}
        {Array.from({ length: 31 }, (_, i) => <text key={i} x={20 + i * ((W - 40) / 30)} y="56" fontSize="17" textAnchor="middle" fill="#713F12" fontWeight="700">{i}</text>)}
        <text x={W - 26} y="80" fontSize="13" textAnchor="end" fill="#713F12">cm</text>
      </svg>
      {host && <Rotate p={p} onChange={onChange} />}
    </div>
  );
}

function Protractor({ p, scale, host, onChange }: { p: Placed; scale: number; host: boolean; onChange: (p: Placed, final?: boolean) => void }) {
  const R = 320, W = R * 2 + 40, H = R + 50;
  const drag = useDrag(p, host, onChange);
  const cx = W / 2, cy = R + 20;
  return (
    <div onPointerDown={drag} className={`absolute z-[15] ${host ? "cursor-move touch-none" : "pointer-events-none"}`}
      style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: W * scale, height: H * scale, transform: `translate(-50%,-72%) rotate(${p.rot}deg)`, transformOrigin: `50% ${(cy / H) * 100}%` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full drop-shadow-lg" role="img" aria-label="Protractor, 0 to 180 degrees">
        <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy} Z`} fill="rgba(186,230,253,.72)" stroke="#0369A1" strokeWidth="2" />
        {Array.from({ length: 181 }, (_, d) => {
          const a = (Math.PI * d) / 180, len = d % 10 === 0 ? 30 : d % 5 === 0 ? 20 : 10;
          const x1 = cx - R * Math.cos(a), y1 = cy - R * Math.sin(a), x2 = cx - (R - len) * Math.cos(a), y2 = cy - (R - len) * Math.sin(a);
          return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#075985" strokeWidth={d % 10 === 0 ? 2 : 1} />;
        })}
        {Array.from({ length: 19 }, (_, k) => {
          const d = k * 10, a = (Math.PI * d) / 180;
          return (
            <g key={d}>
              <text x={cx - (R - 50) * Math.cos(a)} y={cy - (R - 50) * Math.sin(a) + 6} fontSize="16" textAnchor="middle" fill="#075985" fontWeight="700">{d}</text>
              <text x={cx - (R - 78) * Math.cos(a)} y={cy - (R - 78) * Math.sin(a) + 5} fontSize="12" textAnchor="middle" fill="#0284C7">{180 - d}</text>
            </g>
          );
        })}
        <line x1={cx - R} x2={cx + R} y1={cy} y2={cy} stroke="#075985" strokeWidth="2" />
        <circle cx={cx} cy={cy} r="6" fill="#DC2626" />
        <line x1={cx} x2={cx} y1={cy} y2={cy - 40} stroke="#DC2626" strokeWidth="2" />
      </svg>
      {host && <Rotate p={p} onChange={onChange} />}
    </div>
  );
}

// Spotlight: darkens the board except a circle the host moves around. The
// dark layer lets touches through, so the host can still write in the circle.
function Spotlight({ s, host, boxW, onChange }: { s: SpotState; host: boolean; boxW: number; onChange: (s: SpotState, final?: boolean) => void }) {
  const rPx = s.r * boxW;
  const drag = (e: React.PointerEvent) => {
    if (!host) return;
    const board = (e.currentTarget as HTMLElement).closest("[data-board]");
    if (!board) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, start = s;
    const at = (ev: PointerEvent): SpotState => {
      const [dx, dy] = localDelta(board, ev.clientX - sx, ev.clientY - sy);
      return { ...start, x: Math.min(1, Math.max(0, start.x + dx)), y: Math.min(1, Math.max(0, start.y + dy)) };
    };
    let last = 0;
    const move = (ev: PointerEvent) => { const n = Date.now(); if (n - last > 40) { last = n; onChange(at(ev)); } };
    const up = (ev: PointerEvent) => { onChange(at(ev), true); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const resize = (k: number) => onChange({ ...s, r: Math.min(0.45, Math.max(0.05, Math.round(s.r * k * 100) / 100)) }, true);
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-[12]" aria-hidden
        style={{ background: `radial-gradient(circle ${rPx}px at ${s.x * 100}% ${s.y * 100}%, transparent ${rPx - 1}px, rgba(2,6,23,.88) ${rPx}px)` }} />
      {host && (
        <div className="absolute z-[13] flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/95 p-1 shadow-lg ring-1 ring-black/10"
          style={{ left: `${s.x * 100}%`, top: `calc(${s.y * 100}% + ${Math.min(rPx + 8, 9999)}px)` }}>
          <button type="button" onPointerDown={drag} aria-label="Drag the spotlight" title="Drag to move" className="flex h-8 cursor-move touch-none items-center gap-1 rounded-full bg-[#1657C9] px-2.5 text-xs font-black text-white">
            <BoardIcon name="spotlight" className="h-4 w-4" /> Move
          </button>
          <button type="button" onClick={() => resize(0.8)} aria-label="Smaller spotlight" className="h-8 w-8 rounded-full text-base font-black text-ink hover:bg-slate-100">−</button>
          <button type="button" onClick={() => resize(1.25)} aria-label="Bigger spotlight" className="h-8 w-8 rounded-full text-base font-black text-ink hover:bg-slate-100">+</button>
          <button type="button" onClick={() => onChange({ ...s, on: false }, true)} aria-label="Turn off spotlight" className="flex h-8 w-8 items-center justify-center rounded-full text-ink/60 hover:bg-slate-100"><BoardIcon name="close" className="h-4 w-4" /></button>
        </div>
      )}
    </>
  );
}
