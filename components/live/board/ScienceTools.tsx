"use client";
import { useRef, useState } from "react";
import { Floating } from "@/components/live/board/MathPanels";
import {
  CELL_VOLTS, DIAGRAMS, DIAGRAM_IDS, ELEMENTS, FAMILIES, MAX_BRANCHES, MAX_CELLS, METAL_COLOURS, PART_NAMES, STATE_COLOURS, canAdd, element, elementColour, labelRows,
  labelShown, metalKind, nextHidden, shells, solveCircuit, tidy, voltTargets,
  type CircuitState, type DiagramId, type LabelState, type PColour, type PTableState, type Part, type PartKind,
} from "@/lib/scienceTools";

// Three science tools that float over the board (lib/scienceTools.ts): the
// periodic table, the circuit builder and label-the-diagram. The teacher works
// them; learners see every change live.

type P<T> = { s: T; host: boolean; boxW: number; onChange: (s: T, final?: boolean) => void };
const chip = "min-h-[32px] rounded-lg bg-slate-100 px-2.5 text-xs font-black text-ink hover:bg-slate-200 disabled:opacity-40";
const chipOn = "min-h-[32px] rounded-lg bg-[#0E6E72] px-2.5 text-xs font-black text-white";
const primary = "min-h-[32px] rounded-lg bg-[#0E6E72] px-3 text-xs font-black text-white hover:bg-[#0A4F52] disabled:opacity-40";
const FONT = "Poppins, system-ui, sans-serif";

// ── Periodic table ───────────────────────────────────────────────────────
const COLOURS: [PColour, string][] = [["family", "Families"], ["state", "Solid, liquid, gas"], ["metal", "Metals"], ["none", "Plain"]];
export function PeriodicPanel({ s, host, boxW, onChange }: P<PTableState>) {
  const width = Math.max(420, Math.min(900, boxW * 0.9));
  const cw = 40, ch = 44, top = 16, W = 18 * cw + 2, H = top + 9 * ch + 16;
  const X = (col: number) => 1 + (col - 1) * cw, Y = (row: number) => top + (row - 1) * ch + (row > 7 ? 14 : 0);
  const set = (p: Partial<PTableState>) => onChange({ ...s, ...p }, true);
  const sel = element(s.sel), secret = s.hide && !s.reveal;
  const legend: [string, string][] = s.colour === "family" ? Object.values(FAMILIES).map((f) => [f.name, f.colour])
    : s.colour === "state" ? [["Solid", STATE_COLOURS.solid], ["Liquid", STATE_COLOURS.liquid], ["Gas", STATE_COLOURS.gas]]
      : s.colour === "metal" ? Object.entries(METAL_COLOURS) : [];
  const sh = sel ? shells(sel.z) : null;
  return (
    <Floating p={s} host={host} title="Periodic table" icon="ptable" width={width} onChange={onChange}>
      <div className="flex flex-wrap items-start gap-2.5 p-2.5">
        <div className="min-w-0 flex-[3_1_360px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="group" aria-label="Periodic table of the elements" style={{ fontFamily: FONT }}>
          {Array.from({ length: 18 }, (_, i) => <text key={i} x={X(i + 1) + cw / 2} y={11} textAnchor="middle" fontSize={10} fontWeight={700} fill="#64748B">{i + 1}</text>)}
          {[[6, "57–71"], [7, "89–103"]].map(([row, t]) => <text key={t} x={X(3) + cw / 2} y={Y(row as number) + ch / 2 + 3} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#94A3B8">{t}</text>)}
          {ELEMENTS.map((e) => {
            const on = s.sel === e.z, show = !s.hide || (on && s.reveal);
            return (
              <g key={e.z} transform={`translate(${X(e.col)},${Y(e.row)})`} role={host ? "button" : "img"} tabIndex={host ? 0 : undefined}
                aria-label={show ? `${e.name}, ${e.symbol}, atomic number ${e.z}` : `Atomic number ${e.z}`} aria-pressed={host ? on : undefined} style={{ cursor: host ? "pointer" : undefined, outline: "none" }}
                onClick={host ? () => set({ sel: on ? 0 : e.z, reveal: false }) : undefined}
                onKeyDown={host ? (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); set({ sel: on ? 0 : e.z, reveal: false }); } } : undefined}>
                <rect x={1} y={1} width={cw - 2} height={ch - 2} rx={4} fill={elementColour(e, s.colour)} stroke={on ? "#0B1220" : "#94A3B8"} strokeWidth={on ? 3 : 0.8} />
                <text x={4} y={11} fontSize={8.5} fontWeight={700} fill="#334155">{e.z}</text>
                <text x={cw / 2} y={ch / 2 + 9} textAnchor="middle" fontSize={show ? 16 : 15} fontWeight={800} fill={show ? "#0B1220" : "#94A3B8"}>{show ? e.symbol : "?"}</text>
              </g>
            );
          })}
        </svg>

        {legend.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-bold text-ink/70" aria-label="Key">
            {legend.map(([name, c]) => <li key={name} className="flex items-center gap-1"><span aria-hidden className="h-3 w-3 rounded-sm ring-1 ring-slate-300" style={{ background: c }} />{name}</li>)}
          </ul>
        )}
        </div>

        <div className="grid min-w-0 flex-[1_1_210px] gap-2">
        <div className="min-h-[64px] rounded-xl bg-slate-50 p-2.5" aria-live="polite" aria-label="Element details">
          {!sel ? <p className="py-3 text-center text-xs font-bold text-ink/50">{host ? "Tap an element to see its details." : "Your teacher will pick an element."}</p> : secret ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl font-black text-ink/40 ring-2 ring-slate-300">?</span>
              <div className="min-w-0 flex-[1_1_120px]">
                <p className="text-sm font-black">Which element is this?</p>
                <p className="text-xs text-ink/70">Atomic number <b>{sel.z}</b> · {sel.group ? `group ${sel.group}, ` : ""}period {sel.period}{sh ? ` · electrons ${sh.join(", ")}` : ""}</p>
              </div>
              {host && <button type="button" className={primary} onClick={() => set({ reveal: true })}>Reveal</button>}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ring-2 ring-slate-400" style={{ background: elementColour(sel, s.colour === "none" ? "family" : s.colour) }}>
                  <span className="text-[10px] font-bold leading-none">{sel.z}</span><span className="text-lg font-black leading-tight">{sel.symbol}</span>
                </span>
                <p className="min-w-0 text-base font-black leading-tight">{sel.name}</p>
              </div>
              <div>
                <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {([["Atomic number", sel.z], ["Relative atomic mass", tidy(sel.mass, 3)], ["Group", sel.group ?? "—"], ["Period", sel.period], ["Family", FAMILIES[sel.family].name],
                    ["At room temperature", sel.state], ["Kind", metalKind(sel)], ["Protons / electrons", `${sel.z} / ${sel.z}`], ...(sh ? [["Electron shells", sh.join(", ")]] : [])] as [string, string | number][])
                    .map(([k, v]) => <div key={k}><dt className="text-[10px] font-bold uppercase tracking-wide text-ink/45">{k}</dt><dd className="font-bold first-letter:uppercase">{v}</dd></div>)}
                </dl>
              </div>
            </div>
          )}
        </div>

        {host && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="w-full text-[11px] font-black text-ink/60">Colour by</span>
            {COLOURS.map(([c, label]) => <button key={c} type="button" aria-pressed={s.colour === c} className={s.colour === c ? chipOn : chip} onClick={() => set({ colour: c })}>{label}</button>)}
            <button type="button" aria-pressed={s.hide} className={s.hide ? chipOn : chip} onClick={() => set({ hide: !s.hide, reveal: false })}>{s.hide ? "Quiz on — show names" : "Hide names (quiz)"}</button>
            {s.hide && <button type="button" className={chip} onClick={() => set({ sel: 1 + Math.floor(Math.random() * 36), reveal: false })} title="A random element from the first 36">Random element</button>}
          </div>
        )}
        </div>
      </div>
    </Floating>
  );
}

// ── Circuit builder ──────────────────────────────────────────────────────
const PALETTE: PartKind[] = ["bulb", "resistor", "switch", "ammeter"];
const GLOW = { off: 0, dim: 0.3, normal: 0.6, bright: 0.85, "very bright": 1 } as const;
const BRANCH_X = [[310], [280, 410], [250, 360, 470]];
function PartSymbol({ p, glow, reading }: { p: Part; glow: number; reading?: string }) {
  // Drawn on a wire running down the page, centred on (0, 0).
  if (p.kind === "bulb") return <g>{glow > 0 && <circle r={24} fill="#FACC15" opacity={glow * 0.75} />}<circle r={13} fill={glow > 0 ? "#FEF9C3" : "#fff"} stroke="#0B1220" strokeWidth={2.2} /><path d="M-9,-9 L9,9 M9,-9 L-9,9" stroke="#0B1220" strokeWidth={2} /></g>;
  if (p.kind === "resistor") return <rect x={-8} y={-18} width={16} height={36} fill="#fff" stroke="#0B1220" strokeWidth={2.2} />;
  if (p.kind === "ammeter") return <g><circle r={13} fill="#fff" stroke="#0B1220" strokeWidth={2.2} /><text y={5} textAnchor="middle" fontSize={14} fontWeight={800} fill="#0B1220">A</text>{reading && <text x={-19} y={4} textAnchor="end" fontSize={11} fontWeight={800} fill="#0E6E72">{reading}</text>}</g>;
  return <g><rect x={-6} y={-16} width={12} height={32} fill="#fff" /><circle cy={-15} r={3} fill="#0B1220" /><circle cy={15} r={3} fill="#0B1220" /><path d={p.open ? "M0,15 L14,-11" : "M0,15 L0,-15"} stroke="#0B1220" strokeWidth={2.6} strokeLinecap="round" /></g>;
}
function Voltmeter({ at, a, b, volts }: { at: [number, number]; a: [number, number]; b: [number, number]; volts: number }) {
  return (
    <g>
      <path d={`M${a[0]},${a[1]} L${at[0]},${a[1]} L${at[0]},${at[1] - 13} M${b[0]},${b[1]} L${at[0]},${b[1]} L${at[0]},${at[1] + 13}`} fill="none" stroke="#7C3AED" strokeWidth={1.6} strokeDasharray="4 3" />
      <circle cx={at[0]} cy={at[1]} r={13} fill="#F5F3FF" stroke="#7C3AED" strokeWidth={2.2} />
      <text x={at[0]} y={at[1] + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill="#5B21B6">V</text>
      <text x={at[0] + 18} y={at[1] + 4} fontSize={11} fontWeight={800} fill="#5B21B6">{tidy(volts)} V</text>
    </g>
  );
}
export function CircuitPanel({ s, host, boxW, onChange }: P<CircuitState>) {
  const width = host ? Math.max(360, Math.min(840, boxW * 0.84)) : Math.max(320, Math.min(560, boxW * 0.5));
  const [picked, setPicked] = useState<PartKind | null>(null);          // tapped in the tray: tap a branch to put it there
  const [sel, setSel] = useState<string | null>(null);                  // "branch.part"
  const [ghost, setGhost] = useState<{ kind: PartKind; x: number; y: number } | null>(null);
  const live = useRef(s); live.current = s;
  const r = solveCircuit(s);
  const W = 580, H = 286, top = 38, bottom = 252, railX = 66, mid = (top + bottom) / 2;
  const xs = BRANCH_X[s.branches.length - 1], lastX = xs[xs.length - 1];
  const partY = (n: number, k: number) => top + ((k + 1) * (bottom - top)) / (n + 1);
  const set = (c: Partial<CircuitState>) => onChange({ ...live.current, ...c }, true);
  function add(i: number, kind: PartKind) {
    const cur = live.current;
    if (i === cur.branches.length && cur.branches.length < MAX_BRANCHES) set({ branches: [...cur.branches, [kind === "switch" ? { kind, open: false } : { kind }]] });
    else if (cur.branches[i] && canAdd(cur.branches[i], kind)) set({ branches: cur.branches.map((b, j) => (j === i ? [...b, kind === "switch" ? { kind, open: false } : { kind }] : b)) });
    setPicked(null);
  }
  // Drag a part from the tray onto a branch — or tap it, then tap the branch.
  function grab(e: React.PointerEvent, kind: PartKind) {
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    let moved = false;
    const move = (ev: PointerEvent) => { if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return; moved = true; setGhost({ kind, x: ev.clientX, y: ev.clientY }); };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); setGhost(null);
      if (!moved) return setPicked((p) => (p === kind ? null : kind));
      const zone = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-branch]");
      if (zone) add(Number(zone.getAttribute("data-branch")), kind);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }
  const [si, sj] = sel ? sel.split(".").map(Number) : [-1, -1], chosen = s.branches[si]?.[sj];
  const removePart = () => { const branches = s.branches.map((b, i) => (i === si ? b.filter((_, j) => j !== sj) : b)); setSel(null); set({ branches, volt: "" }); };
  const cellsTop = mid - (s.cells * 16) / 2;
  const flowing = (amps: number) => amps > 0.0001;
  const vm = s.volt, vb = vm.match(/^b(\d)$/), vp = vm.match(/^p(\d)\.(\d)$/);
  const liveBranches = r.branches.filter((b) => b.amps > 0).length, seriesParts = s.branches.length === 1 ? s.branches[0].filter((p) => p.kind === "bulb" || p.kind === "resistor").length : 0;
  return (
    <Floating p={s} host={host} title="Circuit builder" icon="circuit" width={width} onChange={onChange}>
      <div className="flex flex-wrap items-start gap-2.5 p-2.5">
        <div className="min-w-0 flex-[3_1_320px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-xl bg-white ring-1 ring-slate-200" role="group" aria-label={`Circuit: ${s.cells} cell${s.cells === 1 ? "" : "s"}, ${s.branches.length} branch${s.branches.length === 1 ? "" : "es"}`} style={{ fontFamily: FONT }}>
          {/* The main loop: battery on the left, switch and ammeter along the top */}
          <path d={`M${railX},${cellsTop} V${top} H${lastX} M${railX},${cellsTop + s.cells * 16} V${bottom} H${lastX}`} fill="none" stroke="#0B1220" strokeWidth={2.2} />
          {flowing(r.total) && <path className="circuit-flow" d={`M${railX},${cellsTop} V${top} H${lastX}`} fill="none" stroke="#F59E0B" strokeWidth={3} />}
          {Array.from({ length: s.cells }, (_, k) => (
            <g key={k} transform={`translate(${railX},${cellsTop + k * 16})`}><line x1={-15} y1={3} x2={15} y2={3} stroke="#0B1220" strokeWidth={2} /><line x1={-8} y1={11} x2={8} y2={11} stroke="#0B1220" strokeWidth={5} /></g>
          ))}
          <text x={railX - 30} y={cellsTop + 8} fontSize={14} fontWeight={800} fill="#B91C1C">+</text>
          <text x={railX - 9} y={cellsTop + s.cells * 16 + 20} textAnchor="end" fontSize={11} fontWeight={800} fill="#0E6E72">{tidy(r.volts)} V</text>
          {/* Main switch */}
          <g transform={`translate(124,${top})`} role={host ? "button" : undefined} tabIndex={host ? 0 : undefined} aria-label={`Main switch, ${s.closed ? "closed" : "open"}`} style={{ cursor: host ? "pointer" : undefined, outline: "none" }}
            onClick={host ? () => set({ closed: !s.closed }) : undefined} onKeyDown={host ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set({ closed: !s.closed }); } } : undefined}>
            <rect x={-26} y={-24} width={52} height={36} fill="transparent" /><rect x={-19} y={-5} width={38} height={10} fill="#fff" />
            <circle cx={-19} r={3.2} fill="#0B1220" /><circle cx={19} r={3.2} fill="#0B1220" />
            <path d={s.closed ? "M-19,0 L19,0" : "M-19,0 L14,-18"} stroke="#0B1220" strokeWidth={2.6} strokeLinecap="round" />
          </g>
          {/* Main ammeter */}
          <g transform={`translate(198,${top})`}><circle r={14} fill="#fff" stroke="#0B1220" strokeWidth={2.2} /><text y={5} textAnchor="middle" fontSize={14} fontWeight={800}>A</text><text y={-20} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0E6E72">{r.short ? "—" : `${tidy(r.total)} A`}</text></g>
          {/* Branches */}
          {s.branches.map((b, i) => {
            const x = xs[i], br = r.branches[i];
            return (
              <g key={i} data-branch={host ? i : undefined}>
                <line x1={x} y1={top} x2={x} y2={bottom} stroke={b.length ? "#0B1220" : "#CBD5E1"} strokeWidth={2.2} strokeDasharray={b.length ? undefined : "6 6"} />
                {flowing(br.amps) && <line className="circuit-flow" x1={x} y1={top} x2={x} y2={bottom} stroke="#F59E0B" strokeWidth={3} />}
                {!b.length && <text x={x + 8} y={mid + 4} fontSize={10.5} fontWeight={700} fill="#94A3B8">empty</text>}
                {host && <rect data-branch={i} x={x - 44} y={top + 4} width={88} height={bottom - top - 8} rx={10} fill={picked && canAdd(b, picked) ? "#0E6E72" : "transparent"} fillOpacity={0.08}
                  stroke={picked && canAdd(b, picked) ? "#0E6E72" : "none"} strokeDasharray="6 5" role={picked ? "button" : undefined} aria-label={picked ? `Put the ${picked} on branch ${i + 1}` : undefined}
                  style={{ cursor: picked ? "copy" : undefined }} onClick={picked ? () => add(i, picked) : undefined} />}
                {b.map((p, j) => {
                  const y = partY(b.length, j), id = `${i}.${j}`, pr = br.parts[j];
                  return (
                    <g key={j} transform={`translate(${x},${y})`} role={host ? "button" : "img"} tabIndex={host ? 0 : undefined} aria-pressed={host ? sel === id : undefined}
                      aria-label={`${PART_NAMES[p.kind]}${p.kind === "switch" ? (p.open ? ", open" : ", closed") : p.kind === "bulb" ? `, ${pr.brightness}` : ""}${s.branches.length > 1 ? `, branch ${i + 1}` : ""}`}
                      style={{ cursor: host ? "pointer" : undefined, outline: "none", pointerEvents: picked ? "none" : undefined }} onClick={host ? (e) => { e.stopPropagation(); setSel(sel === id ? null : id); } : undefined}
                      onKeyDown={host ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(sel === id ? null : id); } } : undefined}>
                      {sel === id && <rect x={-28} y={-26} width={56} height={52} rx={8} fill="none" stroke="#0E6E72" strokeWidth={2} strokeDasharray="5 4" />}
                      <PartSymbol p={p} glow={GLOW[pr.brightness]} reading={p.kind === "ammeter" ? `${tidy(br.amps)} A` : undefined} />
                    </g>
                  );
                })}
              </g>
            );
          })}
          {host && s.branches.length < MAX_BRANCHES && (
            <g data-branch={s.branches.length} role={picked ? "button" : undefined} aria-label={picked ? `Put the ${picked} on a new branch` : undefined} style={{ cursor: picked ? "copy" : undefined }} onClick={picked ? () => add(s.branches.length, picked) : undefined}>
              <rect x={lastX + 52} y={top + 30} width={W - lastX - 60} height={bottom - top - 60} rx={10} fill={picked ? "#0E6E72" : "#F8FAFC"} fillOpacity={picked ? 0.08 : 1} stroke={picked ? "#0E6E72" : "#CBD5E1"} strokeDasharray="6 5" />
              <text x={lastX + 52 + (W - lastX - 60) / 2} y={mid - 2} textAnchor="middle" fontSize={10} fontWeight={800} fill="#64748B">new</text>
              <text x={lastX + 52 + (W - lastX - 60) / 2} y={mid + 12} textAnchor="middle" fontSize={10} fontWeight={800} fill="#64748B">branch</text>
            </g>
          )}
          {/* Voltmeter */}
          {r.voltmeter != null && vm === "battery" && <Voltmeter at={[railX + 46, mid]} a={[railX, cellsTop - 8]} b={[railX, cellsTop + s.cells * 16 + 8]} volts={r.voltmeter} />}
          {r.voltmeter != null && vb && <Voltmeter at={[xs[+vb[1]] + 44, mid]} a={[xs[+vb[1]], top + 8]} b={[xs[+vb[1]], bottom - 8]} volts={r.voltmeter} />}
          {r.voltmeter != null && vp && (() => { const x = xs[+vp[1]], y = partY(s.branches[+vp[1]].length, +vp[2]); return <Voltmeter at={[x + 44, y]} a={[x, y - 22]} b={[x, y + 22]} volts={r.voltmeter!} />; })()}
        </svg>

        <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs" aria-live="polite" aria-label="Readings">
          {r.short ? <p className="font-black text-red-700" role="alert">⚠ Short circuit! A branch has nothing to resist the current. Put a bulb or resistor on it.</p> : (
            <>
              <p className="flex flex-wrap gap-x-4 gap-y-0.5 font-bold">
                <span>Battery <b className="font-mono text-sm">{tidy(r.volts)} V</b></span><span>Current from the battery <b className="font-mono text-sm">{tidy(r.total)} A</b></span>
                {r.voltmeter != null && <span>Voltmeter <b className="font-mono text-sm">{tidy(r.voltmeter)} V</b></span>}
              </p>
              {s.branches.length > 1 && <p className="mt-0.5 flex flex-wrap gap-x-4 text-ink/75">{r.branches.map((b, i) => <span key={i}>Branch {i + 1}: <b className="font-mono">{b.empty ? "empty" : b.open ? "switch open, 0 A" : `${tidy(b.amps)} A`}</b></span>)}</p>}
              {s.branches.some((b) => b.some((p) => p.kind === "bulb")) && <p className="mt-0.5 text-ink/75">Bulbs: {s.branches.flatMap((b, i) => b.map((p, j) => (p.kind === "bulb" ? r.branches[i].parts[j].brightness : null))).filter(Boolean).join(", ")}</p>}
              <p className="mt-1 text-[11px] text-ink/55">{!s.closed ? "The main switch is open, so no current flows anywhere." : liveBranches > 1 ? "In parallel: every branch gets the full battery voltage, and the branch currents add up to the current from the battery."
                : seriesParts > 1 ? "In series: the same current flows through every part, and they share the battery's voltage." : `Each cell gives ${CELL_VOLTS} V. Current = voltage ÷ resistance.`}</p>
            </>
          )}
        </div>
        </div>

        {host && (
          <div className="grid min-w-0 flex-[1_1_220px] gap-2">
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Parts tray">
              {PALETTE.map((k) => (
                <button key={k} type="button" aria-pressed={picked === k} onPointerDown={(e) => grab(e, k)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPicked(picked === k ? null : k); } }}
                  className={`${picked === k ? chipOn : chip} touch-none select-none`} style={{ cursor: "grab" }}>{PART_NAMES[k]}</button>
              ))}
              <span className="w-full text-[11px] font-bold text-ink/55">{picked ? `Now tap a branch to put the ${picked} there.` : "Drag a part onto a branch — or tap it, then tap the branch. Tap a part on the circuit to change it."}</span>
            </div>
            {chosen && (
              <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#EEF7F6] p-1.5" role="group" aria-label="Chosen part">
                <span className="px-1 text-[11px] font-black text-[#0A4F52]">{PART_NAMES[chosen.kind]}{s.branches.length > 1 ? ` on branch ${si + 1}` : ""}</span>
                {chosen.kind === "switch" && <button type="button" className={primary} onClick={() => set({ branches: s.branches.map((b, i) => (i === si ? b.map((p, j) => (j === sj ? { ...p, open: !p.open } : p)) : b)) })}>{chosen.open ? "Close the switch" : "Open the switch"}</button>}
                <button type="button" className={chip} onClick={() => set({ volt: s.volt === `p${si}.${sj}` ? "" : `p${si}.${sj}` })}>{s.volt === `p${si}.${sj}` ? "Take the voltmeter off" : "Voltmeter across it"}</button>
                <button type="button" className={chip} onClick={removePart}>Remove</button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1">
              <span className="flex items-center gap-1 text-[11px] font-black text-ink/60">Cells
                <button type="button" className={`${chip} w-8 px-0`} aria-label="Fewer cells" disabled={s.cells <= 1} onClick={() => set({ cells: s.cells - 1 })}>−</button>
                <span className="w-5 text-center font-mono text-sm text-ink">{s.cells}</span>
                <button type="button" className={`${chip} w-8 px-0`} aria-label="More cells" disabled={s.cells >= MAX_CELLS} onClick={() => set({ cells: s.cells + 1 })}>+</button>
              </span>
              <label className="text-[11px] font-black text-ink/60">Voltmeter across <select value={s.volt} onChange={(e) => set({ volt: e.target.value })} aria-label="Voltmeter across" className="ml-1 min-h-[32px] rounded-lg bg-slate-50 px-1.5 text-xs font-bold text-ink ring-1 ring-slate-200">
                <option value="">nothing</option>{voltTargets(s).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="w-full text-[11px] font-black text-ink/60">Start from</span>
              <button type="button" className={chip} onClick={() => { setSel(null); set({ cells: 2, closed: true, branches: [[{ kind: "bulb" }, { kind: "bulb" }]], volt: "" }); }}>Two bulbs in series</button>
              <button type="button" className={chip} onClick={() => { setSel(null); set({ cells: 2, closed: true, branches: [[{ kind: "bulb" }], [{ kind: "bulb" }]], volt: "" }); }}>Two bulbs in parallel</button>
              {s.branches.length > 1 && <button type="button" className={chip} onClick={() => { setSel(null); set({ branches: s.branches.slice(0, -1), volt: "" }); }}>Remove last branch</button>}
              <button type="button" className={chip} onClick={() => { setSel(null); set({ branches: [[]], volt: "" }); }}>Clear</button>
            </div>
          </div>
        )}
        {ghost && <div aria-hidden className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[#0E6E72] px-3 py-1.5 text-xs font-black text-white shadow-xl" style={{ left: ghost.x, top: ghost.y }}>{PART_NAMES[ghost.kind]}</div>}
      </div>
    </Floating>
  );
}

// ── Label the diagram ────────────────────────────────────────────────────
function Drawing({ id }: { id: DiagramId }) {
  if (id === "animal-cell") return (
    <g>
      <path d="M300,72 C372,66 428,118 424,182 C420,250 366,290 296,286 C226,282 176,240 178,176 C180,112 232,78 300,72 Z" fill="#FFEDD5" stroke="#C2410C" strokeWidth={4} />
      <circle cx={290} cy={178} r={34} fill="#DDD6FE" stroke="#6D28D9" strokeWidth={3} /><circle cx={297} cy={171} r={10} fill="#6D28D9" />
      {[[372, 158, -25], [236, 238, 20], [352, 214, 35]].map(([x, y, a], i) => <g key={i} transform={`translate(${x},${y}) rotate(${a})`}><ellipse rx={22} ry={11} fill="#FDBA74" stroke="#C2410C" strokeWidth={2} /><path d="M-14,0 L-9,-5 L-4,5 L1,-5 L6,5 L11,-5 L14,0" fill="none" stroke="#C2410C" strokeWidth={1.5} /></g>)}
      {[[338, 246], [325, 258], [352, 258], [318, 240], [270, 262], [300, 108], [345, 104], [215, 190]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2.6} fill="#7C2D12" />)}
    </g>
  );
  if (id === "plant-cell") return (
    <g>
      <rect x={180} y={56} width={240} height={250} rx={14} fill="#DCFCE7" stroke="#15803D" strokeWidth={10} />
      <rect x={190} y={66} width={220} height={230} rx={9} fill="#ECFCCB" stroke="#CA8A04" strokeWidth={2.5} />
      <rect x={238} y={112} width={128} height={150} rx={40} fill="#BAE6FD" stroke="#0284C7" strokeWidth={2.5} />
      <circle cx={224} cy={108} r={20} fill="#DDD6FE" stroke="#6D28D9" strokeWidth={3} /><circle cx={228} cy={104} r={6} fill="#6D28D9" />
      {[[388, 104, -20], [384, 268, 25], [216, 262, -30], [300, 282, 0]].map(([x, y, a], i) => <g key={i} transform={`translate(${x},${y}) rotate(${a})`}><ellipse rx={16} ry={9} fill="#4ADE80" stroke="#166534" strokeWidth={2} /><path d="M-9,0 H9 M-5,-4 V4 M0,-5 V5 M5,-4 V4" stroke="#166534" strokeWidth={1.2} /></g>)}
      <g transform="translate(391,226) rotate(15)"><ellipse rx={13} ry={7} fill="#FDBA74" stroke="#C2410C" strokeWidth={2} /><path d="M-8,0 L-4,-3 L0,3 L4,-3 L8,0" fill="none" stroke="#C2410C" strokeWidth={1.3} /></g>
    </g>
  );
  if (id === "heart") return (
    <g>
      <rect x={214} y={40} width={22} height={104} rx={4} fill="#93C5FD" stroke="#1E3A8A" strokeWidth={2} />
      <rect x={263} y={30} width={22} height={114} rx={4} fill="#93C5FD" stroke="#1E3A8A" strokeWidth={2} />
      <path d="M319,144 V52 C319,22 374,22 374,52 V68 H354 V54 C354,44 341,44 341,54 V144 Z" fill="#F87171" stroke="#7F1D1D" strokeWidth={2} />
      <rect x={375} y={74} width={22} height={74} rx={4} fill="#F87171" stroke="#7F1D1D" strokeWidth={2} />
      <path d="M300,128 C272,96 196,104 196,176 C196,244 262,292 300,330 Z" fill="#BFDBFE" stroke="#1E3A8A" strokeWidth={3} />
      <path d="M300,128 C328,96 404,104 404,176 C404,244 338,292 300,330 Z" fill="#FECACA" stroke="#7F1D1D" strokeWidth={3} />
      <line x1={300} y1={128} x2={300} y2={328} stroke="#7F1D1D" strokeWidth={6} />
      {[[200, 292, "#1E3A8A"], [308, 400, "#7F1D1D"]].map(([a, b, c], i) => { const m = ((a as number) + (b as number)) / 2; return <g key={i} stroke={c as string} strokeWidth={3} fill="none"><path d={`M${a},196 H${m - 12} M${m + 12},196 H${b}`} /><path d={`M${m - 12},196 L${m},210 L${m + 12},196`} /></g>; })}
    </g>
  );
  if (id === "flower") {
    const petal = "M286,290 C230,280 176,230 172,150 C170,120 190,104 206,120 C236,150 262,220 290,282 Z", sepal = "M282,296 C250,300 228,286 222,266 C246,268 270,278 286,290 Z";
    return (
      <g>
        <line x1={300} y1={354} x2={300} y2={296} stroke="#15803D" strokeWidth={8} strokeLinecap="round" />
        {[1, -1].map((k) => <g key={k} transform={k === 1 ? undefined : "translate(600,0) scale(-1,1)"}><path d={petal} fill="#FBCFE8" stroke="#BE185D" strokeWidth={2.5} /><path d={sepal} fill="#86EFAC" stroke="#15803D" strokeWidth={2} />
          <path d="M290,286 C270,240 252,190 246,158" fill="none" stroke="#A16207" strokeWidth={3} /><ellipse cx={246} cy={148} rx={8} ry={13} fill="#FACC15" stroke="#A16207" strokeWidth={2} /></g>)}
        <ellipse cx={300} cy={296} rx={26} ry={10} fill="#4ADE80" stroke="#15803D" strokeWidth={2} />
        <line x1={300} y1={228} x2={300} y2={126} stroke="#15803D" strokeWidth={5} />
        <ellipse cx={300} cy={256} rx={20} ry={30} fill="#BBF7D0" stroke="#15803D" strokeWidth={2.5} />
        {[244, 262, 278].map((y) => <circle key={y} cx={300} cy={y} r={5} fill="#FEF9C3" stroke="#A16207" strokeWidth={1.5} />)}
        <ellipse cx={300} cy={120} rx={10} ry={6} fill="#FDE047" stroke="#A16207" strokeWidth={2} />
      </g>
    );
  }
  return (
    <g>
      <rect x={196} y={296} width={94} height={12} rx={6} fill="#F59E0B" stroke="#92400E" strokeWidth={1.5} />
      <path d="M232,332 L368,332 L352,306 L248,306 Z" fill="#64748B" stroke="#1E293B" strokeWidth={2} />
      <rect x={286} y={150} width={28} height={156} fill="#CBD5E1" stroke="#475569" strokeWidth={2} />
      <rect x={281} y={254} width={38} height={34} rx={3} fill="#94A3B8" stroke="#334155" strokeWidth={2} /><circle cx={300} cy={272} r={6} fill="#0B1220" />
      <path d="M286,150 C276,110 292,70 300,44 C308,70 324,110 314,150 Z" fill="#93C5FD" fillOpacity={0.8} stroke="#3B82F6" strokeWidth={2} />
      <path d="M291,150 C290,132 296,116 300,104 C304,116 310,132 309,150 Z" fill="#1D4ED8" />
    </g>
  );
}
export function LabelPanel({ s, host, boxW, onChange }: P<LabelState>) {
  const width = host ? Math.max(380, Math.min(860, boxW * 0.86)) : Math.max(340, Math.min(600, boxW * 0.56));
  const d = DIAGRAMS[s.diagram], rows = labelRows(s.diagram), next = nextHidden(s);
  const set = (l: Partial<LabelState>) => onChange({ ...s, ...l }, true);
  const toggle = (i: number) => set({ shown: s.shown.includes(i) ? s.shown.filter((k) => k !== i) : [...s.shown, i] });
  const bw = 142, bh = 24, hiddenCount = s.hide ? d.labels.length - s.shown.length : 0;
  return (
    <Floating p={s} host={host} title="Label the diagram" icon="label" width={width} onChange={onChange}>
      <div className="flex flex-wrap items-start gap-2.5 p-2.5">
        <div className="min-w-0 flex-[3_1_340px]">
        <p className="mb-1 flex items-baseline justify-between gap-2 text-sm font-black">{d.title} <span className="text-[11px] font-bold text-ink/50">{d.subject}{s.hide ? ` · ${hiddenCount} to name` : ""}</span></p>
        <svg viewBox="0 0 600 360" className="block w-full rounded-xl bg-white ring-1 ring-slate-200" role="group" aria-label={`${d.title}, with ${d.labels.length} labels`} style={{ fontFamily: FONT }}>
          <Drawing id={s.diagram} />
          {d.labels.map((l, i) => {
            const y = rows[i], left = l.side === "l", bx = left ? 4 : 600 - 4 - bw, edge = left ? bx + bw : bx, shown = labelShown(s, i);
            return (
              <g key={`${s.diagram}-${i}`}>
                <line x1={edge} y1={y} x2={l.at[0]} y2={l.at[1]} stroke="#0B1220" strokeWidth={1.3} /><circle cx={l.at[0]} cy={l.at[1]} r={3.2} fill="#0B1220" />
                <g role={host && s.hide ? "button" : "img"} tabIndex={host && s.hide ? 0 : undefined} aria-label={shown ? `Label ${i + 1}: ${l.name}` : `Label ${i + 1}, covered`} style={{ cursor: host && s.hide ? "pointer" : undefined, outline: "none" }}
                  onClick={host && s.hide ? () => toggle(i) : undefined} onKeyDown={host && s.hide ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(i); } } : undefined}>
                  <rect x={bx} y={y - bh / 2} width={bw} height={bh} rx={6} fill={shown ? "#fff" : "#FEF3C7"} stroke={shown ? "#0E6E72" : "#D97706"} strokeWidth={1.8} />
                  <circle cx={bx + 13} cy={y} r={8.5} fill={shown ? "#0E6E72" : "#D97706"} /><text x={bx + 13} y={y + 4} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#fff">{i + 1}</text>
                  <text x={bx + 27} y={y + 4.5} fontSize={12} fontWeight={800} fill={shown ? "#0B1220" : "#92400E"}>{shown ? l.name : "?"}</text>
                </g>
              </g>
            );
          })}
        </svg>
        {s.diagram === "heart" && <p className="mt-1 text-[11px] text-ink/55">Blue: blood low in oxygen. Red: blood rich in oxygen. Drawn as if the person is facing you, so the heart&apos;s right side is on the left of the picture.</p>}

        {s.notes && (
          <ol className="mt-2 grid gap-x-3 gap-y-0.5 rounded-lg bg-slate-50 p-2 text-xs sm:grid-cols-2" aria-label="What each part does" aria-live="polite">
            {d.labels.map((l, i) => (labelShown(s, i)
              ? <li key={i}><b>{i + 1}. {l.name}</b> — {l.note}</li>
              : <li key={i} className="text-ink/45"><b>{i + 1}.</b> ?</li>))}
          </ol>
        )}
        </div>

        {host && (
          <div className="grid min-w-0 flex-[1_1_190px] gap-2">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Diagram">
              {DIAGRAM_IDS.map((id) => <button key={id} type="button" aria-pressed={s.diagram === id} className={s.diagram === id ? chipOn : chip} onClick={() => set({ diagram: id, shown: [] })}>{DIAGRAMS[id].title}</button>)}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <button type="button" aria-pressed={s.hide} className={s.hide ? chipOn : chip} onClick={() => set({ hide: !s.hide, shown: [] })}>{s.hide ? "Quiz on — show all names" : "Hide the names (quiz)"}</button>
              {s.hide && <button type="button" className={primary} disabled={next == null} onClick={() => next != null && set({ shown: [...s.shown, next] })}>Reveal the next one</button>}
              {s.hide && s.shown.length > 0 && <button type="button" className={chip} onClick={() => set({ shown: [] })}>Cover them all again</button>}
              <button type="button" aria-pressed={s.notes} className={s.notes ? chipOn : chip} onClick={() => set({ notes: !s.notes })}>What each part does</button>
            </div>
            {s.hide && <p className="text-[11px] font-bold text-ink/55">Ask the class to name a number, then tap its box to uncover it.</p>}
          </div>
        )}
      </div>
    </Floating>
  );
}
