"use client";
import { useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { Floating } from "@/components/live/board/MathPanels";
import { localDelta } from "@/components/live/board/rotation";
import { BOARD_W } from "@/lib/whiteboard";
import {
  ALGEBRA_KINDS, BASE_TEN_KINDS, CHIP_COLOURS, FRACTION_KINDS, LINE_KINDS, MAX_BLOCKS,
  addBlock, algebraTotal, baseTenTotal, blockId, blockLabel, blockSize, denominator, isAlgebra, isBaseTen, isFraction, isLine,
  lineRange, markX, moveBlock, onLine, removeZeroPairs, snapChip, tidy,
  type Block, type BlockKind, type BlocksState,
} from "@/lib/mathBlocks";

// Maths blocks (lib/mathBlocks.ts): fraction bars, algebra tiles, base-ten
// blocks, number lines and counters that sit on the board. The teacher adds
// them from the tray and drags them; with "Learners can move them" on, every
// learner can drag them too (their moves go to the teacher, who shares them).
//
// Message: "blocks-move" (learner → teacher): { by, id, x, y, final }

const FRACTION_FILL: Record<number, string> = { 1: "#0E6E72", 2: "#C2451C", 3: "#7C3AED", 4: "#2563EB", 5: "#DB2777", 6: "#15803D", 8: "#F5B82E", 10: "#0891B2", 12: "#A3D13A" };
const LIGHT_FILL = new Set([8, 12]);
const TILE_FILL: Record<string, string> = { x2: "#2563EB", x: "#16A34A", u: "#F5C518", y2: "#7C3AED", y: "#EA580C", xy: "#0E6E72" };

export function BlocksLayer({ s, host, myId, boxW, onChange }: {
  s: BlocksState; host: boolean; myId: string; boxW: number; onChange: (s: BlocksState, final?: boolean) => void;
}) {
  const scale = boxW / BOARD_W;
  const sRef = useRef(s); sRef.current = s;
  const [sel, setSel] = useState<string | null>(null);
  const [mine, setMine] = useState<{ id: string; x: number; y: number } | null>(null); // a learner's piece while they drag it
  const send = useLive({
    "blocks-move": (p) => {
      if (!host || !sRef.current.share || typeof p?.id !== "string") return;
      const x = Number(p.x), y = Number(p.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      let next = moveBlock(sRef.current, p.id, x, y);
      if (p.final) next = { ...next, items: next.items.map((b) => (b.id === p.id ? snapChip(b, next.items) : b)) };
      onChange(next, !!p.final);
    },
  });
  const canMove = host || s.share;
  // Tapping anywhere else lets go of the chosen piece.
  useEffect(() => {
    if (!sel) return;
    const off = (e: PointerEvent) => { if (!(e.target as HTMLElement)?.closest?.("[data-block]")) setSel(null); };
    window.addEventListener("pointerdown", off);
    return () => window.removeEventListener("pointerdown", off);
  }, [sel]);

  function drag(e: React.PointerEvent, b: Block) {
    if (!canMove || (e.target as HTMLElement).closest("button")) return;
    const board = (e.currentTarget as HTMLElement).closest("[data-board]");
    if (!board) return;
    e.preventDefault(); e.stopPropagation();
    if (host) setSel(b.id);
    const sx = e.clientX, sy = e.clientY;
    const at = (ev: PointerEvent): [number, number] => { const [dx, dy] = localDelta(board, ev.clientX - sx, ev.clientY - sy); return [b.x + dx, b.y + dy]; };
    let last = 0;
    const put = (x: number, y: number, final: boolean) => {
      if (host) {
        let next = moveBlock(sRef.current, b.id, x, y);
        if (final) next = { ...next, items: next.items.map((it) => (it.id === b.id ? snapChip(it, next.items) : it)) };
        onChange(next, final);
      } else {
        setMine(final ? null : { id: b.id, x, y });
        send("blocks-move", { by: myId, id: b.id, x, y, final });
      }
    };
    const move = (ev: PointerEvent) => { const [x, y] = at(ev); if (!host) setMine({ id: b.id, x, y }); const n = Date.now(); if (n - last > 50) { last = n; put(x, y, false); } };
    const up = (ev: PointerEvent) => { const [x, y] = at(ev); put(x, y, true); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  // Keyboard: arrow keys move the piece (no dragging needed).
  function key(e: React.KeyboardEvent, b: Block) {
    if (!canMove) return;
    const d = e.shiftKey ? 0.05 : 0.01;
    const mv: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] };
    if (mv[e.key]) {
      e.preventDefault();
      const [dx, dy] = mv[e.key];
      if (host) onChange(moveBlock(sRef.current, b.id, b.x + dx, b.y + dy), true);
      else send("blocks-move", { by: myId, id: b.id, x: b.x + dx, y: b.y + dy, final: true });
    } else if (host && (e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); remove(b.id); }
  }
  const set = (items: Block[]) => onChange({ ...sRef.current, items }, true);
  const remove = (id: string) => { set(sRef.current.items.filter((b) => b.id !== id)); setSel(null); };
  const lines = s.items.filter((b) => isLine(b.k));
  const selected = host ? s.items.find((b) => b.id === sel) ?? null : null;

  // Number lines first (underneath), counters last (on top).
  const order = [...s.items].sort((a, b) => Number(b.k === "chip") - Number(a.k === "chip") || Number(isLine(b.k)) - Number(isLine(a.k))).reverse();
  return (
    <div className="pointer-events-none absolute inset-0 z-[14]">
      {order.map((b0) => {
        const b = mine?.id === b0.id ? { ...b0, x: mine.x, y: mine.y } : b0;
        const [w, h] = blockSize(b);
        const hit = b.k === "chip" ? onLine(b, lines) : null;
        return (
          <div key={b.id} data-block role="button" tabIndex={canMove ? 0 : -1} aria-label={`${blockLabel(b)}${hit ? ` at ${hit.value}` : ""}`} aria-pressed={host ? sel === b.id : undefined}
            onPointerDown={(e) => drag(e, b0)} onKeyDown={(e) => key(e, b0)} onFocus={() => host && setSel(b.id)}
            className={`absolute select-none ${canMove ? "pointer-events-auto cursor-grab touch-none active:cursor-grabbing" : ""} ${sel === b.id && host ? "outline outline-2 outline-offset-2 outline-[#0E6E72]" : ""} rounded-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0E6E72]`}
            style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: w * scale, height: h * scale, transform: "translate(-50%,-50%)" }}>
            <Piece b={b} />
            {hit && <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-md bg-[#0F2326] px-1.5 py-0.5 text-[11px] font-black text-white shadow" style={{ top: -22 }}>{hit.value}</span>}
          </div>
        );
      })}
      {selected && (() => {
        const [, h] = blockSize(selected);
        const b = "pointer-events-auto flex h-8 min-w-[32px] items-center justify-center rounded-full bg-white px-2 text-xs font-black text-ink shadow ring-1 ring-black/10 hover:bg-slate-50";
        return (
          <div data-block className="absolute z-[1] flex -translate-x-1/2 gap-1" style={{ left: `${selected.x * 100}%`, top: `calc(${selected.y * 100}% - ${(h * scale) / 2 + 42}px)` }} onPointerDown={(e) => e.stopPropagation()}>
            {!isLine(selected.k) && selected.k !== "chip" && <button type="button" className={b} aria-label="Turn it" onClick={() => set(s.items.map((x) => (x.id === selected.id ? { ...x, rot: !x.rot } : x)))}>⟳ Turn</button>}
            {isAlgebra(selected.k) && <button type="button" className={b} aria-label="Flip between positive and negative" onClick={() => set(s.items.map((x) => (x.id === selected.id ? { ...x, neg: !x.neg } : x)))}>± Flip</button>}
            {s.items.length < MAX_BLOCKS && <button type="button" className={b} aria-label="Copy it" onClick={() => { const c = { ...selected, id: blockId(), x: Math.min(1, selected.x + 0.03), y: Math.min(1, selected.y + 0.04) }; set([...s.items, c]); setSel(c.id); }}>Copy</button>}
            <button type="button" className={`${b} text-red-700`} aria-label="Remove it" onClick={() => remove(selected.id)}>✕</button>
          </div>
        );
      })()}
    </div>
  );
}

// One piece, drawn to fill its box.
function Piece({ b }: { b: Block }) {
  const [w, h] = blockSize(b);
  const label = blockLabel(b);
  if (isFraction(b.k)) {
    const d = denominator(b.k), fill = FRACTION_FILL[d] ?? "#0E6E72";
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="block h-full w-full" aria-hidden>
        <rect x="1" y="1" width={w - 2} height={h - 2} rx="4" fill={fill} stroke="#0F2326" strokeOpacity=".35" strokeWidth="2" />
        <text x={w / 2} y={h / 2 + 9} textAnchor="middle" fontSize={d >= 10 ? 22 : 28} fontWeight="800" fill={LIGHT_FILL.has(d) ? "#0F2326" : "#fff"}>{label}</text>
      </svg>
    );
  }
  if (isAlgebra(b.k)) {
    const fill = b.neg ? "#DC2626" : TILE_FILL[b.k];
    const dark = !b.neg && b.k === "u";
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="block h-full w-full" aria-hidden>
        <rect x="1" y="1" width={w - 2} height={h - 2} rx="3" fill={fill} stroke="#0F2326" strokeOpacity=".4" strokeWidth="2" />
        <text x={w / 2} y={h / 2 + 9} textAnchor="middle" fontSize="26" fontWeight="800" fill={dark ? "#0F2326" : "#fff"}>{label}</text>
      </svg>
    );
  }
  if (isBaseTen(b.k)) {
    const c = 28, cols = Math.round(w / c), rows = Math.round(h / c);
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="block h-full w-full" aria-hidden>
        <rect x="0" y="0" width={w} height={h} fill="#F5D38A" stroke="#8A5A0B" strokeWidth="2" />
        {Array.from({ length: cols - 1 }, (_, i) => <line key={`c${i}`} x1={(i + 1) * c} x2={(i + 1) * c} y1="0" y2={h} stroke="#B07A1E" strokeWidth="1.5" />)}
        {Array.from({ length: rows - 1 }, (_, i) => <line key={`r${i}`} y1={(i + 1) * c} y2={(i + 1) * c} x1="0" x2={w} stroke="#B07A1E" strokeWidth="1.5" />)}
      </svg>
    );
  }
  if (isLine(b.k)) {
    const r = lineRange(b.k), steps = Math.round((r.max - r.min) / r.step), mid = h * 0.28;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="block h-full w-full" aria-hidden>
        <rect x="0" y="0" width={w} height={h} rx="10" fill="#fff" fillOpacity=".92" stroke="#A9D6D3" strokeWidth="2" />
        <line x1="14" x2={w - 14} y1={mid} y2={mid} stroke="#0F2326" strokeWidth="3" />
        {Array.from({ length: steps + 1 }, (_, i) => {
          const x = markX(b.k, i), v = Math.round((r.min + i * r.step) * 10) / 10;
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={mid - 12} y2={mid + 12} stroke="#0F2326" strokeWidth="2.5" />
              <text x={x} y={mid + 44} textAnchor="middle" fontSize={steps > 12 ? 20 : 24} fontWeight="700" fill="#0F2326">{v < 0 ? `−${-v}` : v}</text>
            </g>
          );
        })}
      </svg>
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-full w-full" aria-hidden>
      <circle cx={w / 2} cy={h / 2} r={w / 2 - 2} fill={CHIP_COLOURS[b.c ?? 0]} stroke="#fff" strokeWidth="4" />
    </svg>
  );
}

// The tray: add pieces, see the totals, tidy up.
export function BlocksTray({ s, host, onChange }: { s: BlocksState; host: boolean; onChange: (s: BlocksState, final?: boolean) => void }) {
  const [neg, setNeg] = useState(false);
  const [folded, setFolded] = useState(false); // just the totals, so the tray doesn't cover the pieces
  const add = (k: BlockKind, opts?: { neg?: boolean; c?: number }) => onChange(addBlock(s, k, opts), true);
  const alg = algebraTotal(s.items), ten = baseTenTotal(s.items);
  const btn = "min-h-[36px] rounded-lg px-2 text-xs font-black ring-1 ring-slate-200 hover:ring-[#0E6E72] disabled:opacity-40";
  const full = s.items.length >= MAX_BLOCKS;
  return (
    <Floating p={s} host={host} title="Maths blocks" icon="blocks" width={300} onChange={onChange}>
      <div className="grid gap-3 p-3 text-sm">
        {(alg || ten != null) && (
          <div className="grid gap-1 rounded-xl bg-[#E2F3F2] p-2" aria-live="polite">
            {alg && <p className="font-black text-[#0A4F52]">Tiles show: <span className="font-mono text-base">{alg}</span></p>}
            {ten != null && <p className="font-black text-[#0A4F52]">Base ten shows: <span className="text-base">{ten}</span></p>}
          </div>
        )}
        {host && (
          <button type="button" onClick={() => setFolded(!folded)} aria-expanded={!folded} className="min-h-[36px] rounded-lg bg-slate-50 px-2 text-left text-xs font-black text-ink/70 ring-1 ring-slate-200">
            {folded ? "▸ Show the pieces to add" : "▾ Fold the tray"}
          </button>
        )}
        {host ? folded ? null : (
          <>
            <Section title="Fraction bars">
              {FRACTION_KINDS.map((k) => (
                <button key={k} type="button" disabled={full} onClick={() => add(k)} className={btn} style={{ background: FRACTION_FILL[denominator(k)], color: LIGHT_FILL.has(denominator(k)) ? "#0F2326" : "#fff" }} aria-label={`Add a ${blockLabel({ k })} bar`}>{blockLabel({ k })}</button>
              ))}
            </Section>
            <Section title="Algebra tiles">
              {ALGEBRA_KINDS.map((k) => (
                <button key={k} type="button" disabled={full} onClick={() => add(k, { neg })} className={btn} style={{ background: neg ? "#DC2626" : TILE_FILL[k], color: !neg && k === "u" ? "#0F2326" : "#fff" }} aria-label={`Add a ${blockLabel({ k, neg })} tile`}>{blockLabel({ k, neg })}</button>
              ))}
              <label className="flex min-h-[36px] items-center gap-1.5 rounded-lg bg-slate-50 px-2 text-xs font-black text-ink/70"><input type="checkbox" checked={neg} onChange={(e) => setNeg(e.target.checked)} className="h-4 w-4 accent-red-600" /> Negative</label>
            </Section>
            <Section title="Base ten">
              {BASE_TEN_KINDS.map((k) => <button key={k} type="button" disabled={full} onClick={() => add(k)} className={`${btn} bg-[#F5D38A] text-[#5B3A06]`} aria-label={`Add a ${k === "h" ? "hundred" : k === "t" ? "ten" : "one"}`}>{k === "h" ? "100" : k === "t" ? "10" : "1"}</button>)}
            </Section>
            <Section title="Number lines and counters">
              {LINE_KINDS.map((k) => { const r = lineRange(k); return <button key={k} type="button" disabled={full} onClick={() => add(k)} className={`${btn} bg-white`} aria-label={`Add a number line from ${r.min} to ${r.max}`}>{r.min}–{r.max}</button>; })}
              {CHIP_COLOURS.map((c, i) => <button key={c} type="button" disabled={full} onClick={() => add("chip", { c: i })} className="h-9 w-9 rounded-full ring-2 ring-white shadow disabled:opacity-40" style={{ background: c }} aria-label={`Add a counter (colour ${i + 1})`} />)}
            </Section>
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
              <button type="button" onClick={() => onChange({ ...s, items: tidy(s.items) }, true)} disabled={!s.items.length} className={`${btn} bg-white`}>Tidy up</button>
              {s.items.some((b) => b.neg) && <button type="button" onClick={() => onChange({ ...s, items: removeZeroPairs(s.items) }, true)} className={`${btn} bg-white`}>Remove zero pairs</button>}
              <button type="button" onClick={() => onChange({ ...s, items: [] }, true)} disabled={!s.items.length} className={`${btn} bg-white text-red-700`}>Clear all</button>
            </div>
            <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs font-black text-ink/75">
              <input type="checkbox" checked={s.share} onChange={(e) => onChange({ ...s, share: e.target.checked }, true)} className="h-4 w-4 accent-[#0E6E72]" /> Learners can move them
            </label>
            <p className="text-[11px] font-semibold text-ink/55">Drag pieces on the board. Tap one to turn, flip, copy or remove it. Counters click onto number lines.</p>
          </>
        ) : (
          <p className="text-xs font-bold text-ink/65">{s.share ? "You can drag the pieces on the board." : "Watch your teacher move the pieces."}</p>
        )}
      </div>
    </Floating>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1 text-[11px] font-black uppercase tracking-wider text-ink/50">{title}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}
