"use client";
// "Try it": every piece of apparatus in the lab room does what the real one
// does — read its scale, pour into it, put it in a circuit, shine light through
// it, test a substance with it, label it, change its measurements…
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as E from "@/lib/lab/room/engines";
import { Bulb, Burner, Motor, Thermometer, Vessel } from "@/components/lab/room/Anim";
import { ROOMS, type Item } from "@/lib/lab/room/inventory";

const num = (v: string) => { const n = Number(String(v).replace(/,/g, "").trim()); return String(v).trim() !== "" && Number.isFinite(n) ? n : null; };
const f = (x: number, dp = 2) => (Number.isFinite(x) ? Number(x.toFixed(dp)).toString() : "—");
const card = "rounded-xl bg-white/5 p-3 ring-1 ring-white/10";
const btn = "min-h-[40px] rounded-xl bg-[#38BDF8] px-3 text-sm font-black text-[#0B1220] disabled:opacity-40";
const soft = "min-h-[36px] rounded-lg bg-white/10 px-3 text-xs font-black text-white hover:bg-white/15";
const pickR = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const shuffle = <T,>(xs: T[]) => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map((p) => p[1]);

export function Slider({ label, value, min, max, step, unit = "", onChange }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs font-black text-white/70">
      <span className="flex justify-between"><span>{label}</span><output className="font-mono text-white">{f(value, 3)} {unit}</output></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[#38BDF8]" aria-label={label} />
    </label>
  );
}
const Out = ({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "good" | "bad" }) => (
  <p role="status" className={`mt-2 rounded-lg px-3 py-2 text-sm font-bold ${tone === "good" ? "bg-emerald-500/15 text-emerald-200" : tone === "bad" ? "bg-red-500/15 text-red-200" : "bg-[#38BDF8]/10 text-[#BAE6FD]"}`}>{children}</p>
);
const Row = ({ k, v }: { k: string; v: ReactNode }) => <div className="flex justify-between gap-3 border-b border-white/5 py-1 text-sm"><span className="text-white/60">{k}</span><span className="text-right font-bold">{v}</span></div>;

export default function TryIt({ item }: { item: Item }) {
  const s = item.spec;
  switch (s.e) {
    case "scale": return <ScaleTry item={item} s={s} />;
    case "vessel": return <VesselTry s={s} />;
    case "timer": return <TimerTry s={s} />;
    case "heater": return <HeaterTry s={s} />;
    case "circuit": return <CircuitTry s={s} />;
    case "optic": return <OpticTry s={s} />;
    case "spring": return <SpringTry s={s} />;
    case "magnet": return <MagnetTry s={s} />;
    case "radiation": return <RadiationTry s={s} />;
    case "wave": return <WaveTry s={s} />;
    case "reagent": return <ReagentTry s={s} />;
    case "indicator": return <IndicatorTry s={s} />;
    case "specimen": return <SpecimenTry item={item} s={s} />;
    case "model": return <ModelTry s={s} />;
    case "safety": return <SafetyTry s={s} />;
    case "shape": return <ShapeTry s={s} />;
    case "solid": return <SolidTry s={s} />;
    case "random": return <RandomTry s={s} />;
    case "money": return <MoneyTry s={s} />;
    case "graph": return <GraphTry s={s} />;
    case "stats": return <StatsTry />;
    case "microscope": return <MicroTry s={s} />;
    case "tool": return <ToolTry item={item} />;
  }
}

// ── Read the scale ──
function ScaleTry({ item, s }: { item: Item; s: Extract<E.Spec, { e: "scale" }> }) {
  const [v, setV] = useState(() => E.scaleValue(s, Math.random));
  const [ans, setAns] = useState(""), [res, setRes] = useState<null | boolean>(null);
  const digital = item.props.some(([k, x]) => k === "Display" && x === "Digital");
  const dp = E.decimals(s.lc);
  return (
    <div className={card}>
      <p className="text-xs font-black uppercase tracking-wide text-white/50">Read it</p>
      {digital
        ? <div className="mt-2 rounded-lg bg-[#0B1220] p-3 text-center font-mono text-3xl font-black text-[#34D399] ring-1 ring-white/10" aria-label="Display">{v.toFixed(dp)} <span className="text-base">{s.unit}</span></div>
        : <ScaleStrip v={v} s={s} />}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input value={ans} onChange={(e) => { setAns(e.target.value); setRes(null); }} inputMode="decimal" aria-label="Your reading" placeholder={`Your reading (${s.unit})`} className="h-10 w-40 rounded-lg bg-white/10 px-3 text-sm font-bold text-white placeholder:text-white/40" />
        <button type="button" className={btn} onClick={() => { const n = num(ans); setRes(n != null && E.readsRight(n, v, s.lc)); }}>Check</button>
        <button type="button" className={soft} onClick={() => { setV(E.scaleValue(s, Math.random)); setAns(""); setRes(null); }}>New reading</button>
      </div>
      {res != null && <Out tone={res ? "good" : "bad"}>{res ? `✓ ${v.toFixed(dp)} ${s.unit} ± ${f(E.uncertainty(s.lc, digital), dp + 1)} ${s.unit} — a ${f(E.percentError(v, s.lc, digital), 1)}% uncertainty.` : `Not quite — it reads ${v.toFixed(dp)} ${s.unit}. Count the small divisions (${s.lc} ${s.unit} each) from the last number.`}</Out>}
    </div>
  );
}
function ScaleStrip({ v, s }: { v: number; s: { min: number; max: number; lc: number; unit: string } }) {
  const W = 320, per = 22, mid = W / 2, k0 = Math.round((v - s.min) / s.lc), marks: number[] = [];
  for (let k = k0 - 8; k <= k0 + 8; k++) { const x = s.min + k * s.lc; if (x >= s.min - 1e-9 && x <= s.max + 1e-9) marks.push(k); }
  return (
    <svg viewBox={`0 0 ${W} 70`} className="mt-2 w-full rounded-lg bg-[#F1E3BC]" role="img" aria-label="The scale, close up">
      {marks.map((k) => { const x = mid + (k - k0) * per, big = k % 10 === 0, half = k % 5 === 0; const val = s.min + k * s.lc;
        return <g key={k}><line x1={x} y1={0} x2={x} y2={big ? 26 : half ? 18 : 11} stroke="#3F3216" strokeWidth={big ? 2 : 1} />{big && <text x={x} y={42} textAnchor="middle" fontSize={13} fontWeight={800} fill="#3F3216">{Number(val.toFixed(6))}</text>}</g>; })}
      <path d={`M${mid},70 L${mid - 7},54 L${mid + 7},54 Z`} fill="#DC2626" /><line x1={mid} y1={54} x2={mid} y2={0} stroke="#DC2626" strokeWidth={1.5} />
    </svg>
  );
}

function VesselTry({ s }: { s: Extract<E.Spec, { e: "vessel" }> }) {
  const [p, setP] = useState(Math.round(s.cap * 0.6)), [pouring, setPouring] = useState(0), r = E.vesselFill(s.cap, p, s.tol), pct = r.inside / s.cap;
  useEffect(() => { if (!pouring) return; const t = setTimeout(() => setPouring(0), 700); return () => clearTimeout(t); }, [pouring]);
  return (
    <div className={card}>
      <Slider label="Pour in" value={p} min={0} max={Math.round(s.cap * 1.3)} step={Math.max(0.5, s.cap / 200)} unit="cm³" onChange={(v) => { if (v > p) setPouring(Date.now()); setP(v); }} />
      <div className="mt-2 flex items-end gap-4">
        <div className="relative">
          {pouring > 0 && <svg className="absolute -top-6 left-1/2 h-14 w-6 -translate-x-1/2" viewBox="0 0 10 60" aria-hidden><line x1={5} y1={0} x2={5} y2={60} stroke="#93C5FD" strokeWidth={4} className="lr-pour" /></svg>}
          <Vessel shape={/tube/i.test(String(s.cap)) ? "tube" : s.graduated ? "cylinder" : "beaker"} level={pct * 0.92} colour="#BFDBFE" size={70} />
        </div>
        <div className="text-sm"><Row k="In the vessel" v={`${f(r.inside, 1)} ± ${s.tol} cm³`} /><Row k="Uncertainty" v={`${f(r.percent, 1)}%`} /></div>
      </div>
      {r.overflow > 0 && <Out tone="bad">It overflows: {f(r.overflow, 1)} cm³ spills — it only holds {s.cap} cm³.</Out>}
      {!s.graduated && <Out>For an accurate volume use a pipette (± 0.06 cm³), burette (± 0.05 cm³) or measuring cylinder.</Out>}
    </div>
  );
}
function TimerTry({ s }: { s: { lc: number } }) {
  const [t0, setT0] = useState<number | null>(null), [t, setT] = useState<number | null>(null), [now, setNow] = useState(0);
  useEffect(() => { if (t0 == null) return; let raf = 0; const go = () => { setNow(performance.now()); raf = requestAnimationFrame(go); }; raf = requestAnimationFrame(go); return () => cancelAnimationFrame(raf); }, [t0]);
  const dp = Math.min(3, E.decimals(s.lc)), shown = t != null ? t : t0 != null ? Math.max(0, (now - t0) / 1000) : 0;
  return (
    <div className={card}>
      <div className={`rounded-lg bg-[#C9D8B6] p-3 text-center font-mono text-3xl font-black text-[#111827] ${t0 != null ? "lr-glow" : ""}`} aria-label="Display">{(Math.floor(shown / s.lc) * s.lc).toFixed(dp)} s</div>
      <div className="mt-2 flex gap-2">
        <button type="button" className={btn} onClick={() => { if (t0 == null) { setT0(performance.now()); setT(null); } else { setT((performance.now() - t0) / 1000); setT0(null); } }}>{t0 == null ? "Start" : "Stop"}</button>
        <button type="button" className={soft} onClick={() => { setT0(null); setT(null); }}>Reset</button>
      </div>
      <Out>Your reaction time (about {E.reaction(Math.random)} s) at the start and stop is far bigger than the {s.lc} s resolution — time long events, or many repeats, to make it a small fraction.</Out>
    </div>
  );
}
function HeaterTry({ s }: { s: { power: number } }) {
  const [m, setM] = useState(0.25), [sec, setSec] = useState(0), [on, setOn] = useState(false), P = s.power || 50, r = E.heatWater(P, sec, m);
  useEffect(() => { if (!on) return; const t = setInterval(() => setSec((x) => Math.min(3600, x + 10)), 100); return () => clearInterval(t); }, [on]);
  return (
    <div className={card}>
      <div className="flex items-end justify-center gap-3">
        <div className="flex flex-col items-center"><Vessel shape="beaker" level={0.55} colour="#BFDBFE" boiling={r.boiling} fizz={r.T > 80 && !r.boiling} size={64} /><Burner on={on} kind={P >= 1000 ? "bunsen" : "plate"} size={46} /></div>
        <Thermometer T={r.T} size={110} />
        <div className="text-sm"><Row k="Time" v={`${sec} s`} /><Row k="Energy (Pt)" v={`${r.energy} J`} /><Row k="Water" v={`${r.T} °C`} /></div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => setOn(!on)}>{on ? "Turn it off" : "🔥 Heat it"}</button>
        <button type="button" className={soft} onClick={() => { setOn(false); setSec(0); }}>Fresh cold water</button>
      </div>
      <Slider label="Mass of water" value={m} min={0.1} max={2} step={0.05} unit="kg" onChange={setM} />
      {r.boiling ? <Out>It is boiling: the extra energy now changes water to steam (latent heat) — the temperature stays at 100 °C.</Out> : <Out>Q = Pt × 80% = mcΔT: with {f(m, 2)} kg of water (c = 4200 J/kg °C), each minute raises it {f((P * 60 * 0.8) / (m * 4200), 1)} °C.</Out>}
    </div>
  );
}
function CircuitTry({ s }: { s: Extract<E.Spec, { e: "circuit" }> }) {
  const [V, setV] = useState(s.part === "cell" || s.part === "supply" ? 0 : 3), [T, setT] = useState(25), [lux, setLux] = useState(100), [R, setR] = useState(s.value || 10), [Ns, setNs] = useState(120);
  const x = { V, T, lux, R, Np: 240, Ns }, r = E.current(s.part, s.value ?? 0, x);
  const curve = useMemo(() => Array.from({ length: 41 }, (_, i) => { const v = -4 + i * 0.4; return [v, E.current(s.part, s.value ?? 0, { ...x, V: v }).I] as const; }), [s.part, s.value, T, lux, R]); // eslint-disable-line react-hooks/exhaustive-deps
  const maxI = Math.max(1e-6, ...curve.map((c) => Math.abs(c[1])));
  const ivPart = !["cell", "supply", "capacitor", "transformer", "switch", "solar"].includes(s.part);
  return (
    <div className={card}>
      {s.part !== "cell" && s.part !== "supply" && s.part !== "switch" && <Slider label={s.part === "transformer" ? "Primary p.d. (a.c.)" : "p.d. across it"} value={V} min={s.part === "transformer" ? 0 : -4} max={s.part === "transformer" ? 240 : 12} step={0.1} unit="V" onChange={setV} />}
      {s.part === "thermistor" && <Slider label="Temperature" value={T} min={0} max={100} step={1} unit="°C" onChange={setT} />}
      {(s.part === "ldr" || s.part === "solar") && <Slider label="Light" value={lux} min={1} max={2000} step={1} unit="lux" onChange={setLux} />}
      {(s.part === "rheostat" || s.part === "cell" || s.part === "supply" || s.part === "capacitor") && <Slider label={s.part === "rheostat" ? "Slider position (resistance in use)" : "Resistance of the circuit"} value={R} min={0.5} max={s.part === "rheostat" ? s.value ?? 20 : 10_000} step={0.5} unit="Ω" onChange={setR} />}
      {s.part === "transformer" && <Slider label="Turns on the secondary (240 on the primary)" value={Ns} min={10} max={960} step={10} onChange={setNs} />}
      <MiniCircuit part={s.part} I={r.I} glow={s.part === "lamp" ? Math.min(1, Math.abs(r.I) / 0.5) : s.part === "led" ? (r.I > 0 ? 1 : 0) : 0} />
      {s.part === "switch"
        ? <SwitchTry />
        : <>{s.part !== "capacitor" && s.part !== "transformer" && <Row k="Current" v={`${f(r.I * 1000, 1)} mA`} />}{r.R != null && <Row k="Resistance" v={`${f(r.R, 1)} Ω`} />}<Out>{r.note}</Out></>}
      {ivPart && (
        <svg viewBox="0 0 200 120" className="mt-2 w-full rounded-lg bg-[#0B1220]" role="img" aria-label="Current against p.d.">
          <line x1={100} y1={0} x2={100} y2={120} stroke="#475569" /><line x1={0} y1={60} x2={200} y2={60} stroke="#475569" />
          <polyline fill="none" stroke="#38BDF8" strokeWidth={2} points={curve.map(([v, i]) => `${100 + v * 25},${60 - (i / maxI) * 55}`).join(" ")} />
          {V >= -4 && V <= 4 && <circle cx={100 + V * 25} cy={60 - (r.I / maxI) * 55} r={4} fill="#FDE047" />}
          <text x={196} y={56} textAnchor="end" fontSize={9} fill="#94A3B8">V</text><text x={104} y={10} fontSize={9} fill="#94A3B8">I</text>
        </svg>
      )}
    </div>
  );
}
function MiniCircuit({ part, I, glow }: { part: E.CircuitPart; I: number; glow: number }) {
  const flowing = Math.abs(I) > 1e-5, dur = `${Math.max(0.25, Math.min(3, 0.15 / Math.max(1e-4, Math.abs(I))))}s`;
  return (
    <div className="relative my-2 flex items-center justify-center">
      <svg viewBox="0 0 240 90" className="w-full max-w-xs" aria-hidden>
        <rect x={20} y={15} width={200} height={60} rx={8} fill="none" stroke="#DC2626" strokeWidth={3} />
        {flowing && <rect x={20} y={15} width={200} height={60} rx={8} fill="none" stroke="#FDE047" strokeWidth={2.4} className="lr-flow" style={{ animationDuration: dur, animationDirection: I < 0 ? "reverse" : "normal" }} />}
        <rect x={8} y={36} width={24} height={18} rx={3} fill="#334155" stroke="#94A3B8" /><text x={20} y={49} textAnchor="middle" fontSize={9} fontWeight={900} fill="#FDE047">+ −</text>
      </svg>
      <div className="absolute left-1/2 top-0 -translate-x-1/2">{part === "lamp" || part === "led" ? <Bulb glow={glow} led={part === "led"} size={46} /> : part === "motor" ? <Motor spin={flowing} size={46} /> : <span className="rounded bg-[#0B1220] px-2 py-1 text-[10px] font-black text-white ring-1 ring-white/20">{part}</span>}</div>
    </div>
  );
}
function SwitchTry() { const [on, setOn] = useState(false); return <><button type="button" className={btn} aria-pressed={on} onClick={() => setOn(!on)}>{on ? "Switch off" : "Switch on"}</button><Out>{on ? "Closed: the circuit is complete and the current flows." : "Open: there's a gap, so no current flows anywhere in a series circuit."}</Out></>; }

function OpticTry({ s }: { s: Extract<E.Spec, { e: "optic" }> }) {
  const [u, setU] = useState(30), [i, setI] = useState(40), [lam, setLam] = useState(600), [ang, setAng] = useState(0);
  if (s.f != null) {
    const im = E.image(s.f, u), W = 300, sc = 3, cx = W / 2, ox = cx - u * sc, ix = cx + (Number.isFinite(im.v) ? im.v : 999) * sc * (s.part.includes("mirror") ? -1 : 1), oh = 26, ih = oh * (Number.isFinite(im.m) ? im.m : 0);
    return (
      <div className={card}>
        <Slider label="Object distance u" value={u} min={2} max={80} step={1} unit="cm" onChange={setU} />
        <svg viewBox={`0 0 ${W} 120`} className="mt-2 w-full rounded-lg bg-[#0B1220]" role="img" aria-label="Ray diagram">
          <line x1={0} y1={60} x2={W} y2={60} stroke="#475569" />
          {s.part.includes("mirror") ? <path d={`M${cx},10 Q${cx + (s.f > 0 ? -12 : 12)},60 ${cx},110`} fill="none" stroke="#E2E8F0" strokeWidth={3} /> : <ellipse cx={cx} cy={60} rx={s.f > 0 ? 6 : 3} ry={50} fill="#BFE3F2" fillOpacity=".4" stroke="#E2E8F0" />}
          {[-1, 1].map((k) => <circle key={k} cx={cx + k * Math.abs(s.f!) * sc} cy={60} r={2.5} fill="#FDE047" />)}
          <line x1={ox} y1={60} x2={ox} y2={60 - oh} stroke="#F87171" strokeWidth={3} markerEnd="" /><circle cx={ox} cy={60 - oh} r={3} fill="#F87171" />
          {Number.isFinite(im.v) && Math.abs(ix) < 2000 && <><line x1={ix} y1={60} x2={ix} y2={60 - ih} stroke="#34D399" strokeWidth={3} strokeDasharray={im.real ? "" : "4 3"} /><circle cx={ix} cy={60 - ih} r={3} fill="#34D399" /></>}
        </svg>
        <Row k="Image distance v" v={Number.isFinite(im.v) ? `${f(im.v, 1)} cm` : "at infinity"} /><Row k="Magnification" v={Number.isFinite(im.m) ? f(Math.abs(im.m), 2) : "—"} />
        <Out>{im.nature}</Out>
      </div>
    );
  }
  if (s.part === "grating") { const th = E.gratingAngle(300, lam); return <div className={card}><Slider label="Wavelength" value={lam} min={380} max={750} step={5} unit="nm" onChange={setLam} /><Row k="1st order angle (300 lines/mm)" v={th == null ? "none" : `${f(th, 1)}°`} /><Out>d sin θ = nλ: red light (longer λ) is spread further than blue.</Out></div>; }
  if (s.part === "polariser") return <div className={card}><Slider label="Angle between the filters" value={ang} min={0} max={90} step={1} unit="°" onChange={setAng} /><Row k="Light through" v={`${f(100 * Math.cos(ang * E.DEG) ** 2, 0)}%`} /><Out>Crossed at 90°, no light gets through: light is a transverse wave.</Out></div>;
  if (s.part === "filter") return <FilterTry />;
  if (s.part === "pinhole") return <div className={card}><Slider label="Distance from source to obstacle" value={u} min={5} max={80} step={1} unit="cm" onChange={setU} /><Row k="Shadow size on a screen 100 cm away (obstacle 4 cm)" v={`${f((4 * 100) / u, 1)} cm`} /><Out>Similar triangles: light travels in straight lines.</Out></div>;
  if (s.part === "plane") return <div className={card}><Slider label="Angle of incidence" value={i} min={0} max={85} step={1} unit="°" onChange={setI} /><Row k="Angle of reflection" v={`${i}°`} /><Row k="Image distance" v="as far behind as the object is in front" /><Out>The angle of incidence equals the angle of reflection (both measured from the normal).</Out></div>;
  const n = s.n ?? 1.5, r = E.refract(i, n), c = E.criticalAngle(n);
  return (
    <div className={card}>
      <Slider label="Angle of incidence (air to glass)" value={i} min={0} max={89} step={1} unit="°" onChange={setI} />
      <Row k="Angle of refraction" v={`${f(r, 1)}°`} /><Row k="Critical angle (glass to air)" v={`${f(c, 1)}°`} />
      {s.part === "prism" && <Row k="Minimum deviation (60° prism)" v={`${f(E.minDeviation(n), 1)}°`} />}
      <Out>{s.part === "fibre" ? `Light hitting the inside of the fibre at more than ${f(c, 1)}° is totally internally reflected, so it stays in the fibre.` : `n = sin i ÷ sin r = ${n}: light slows down and bends towards the normal entering glass.`}</Out>
    </div>
  );
}
function FilterTry() {
  const [c, setC] = useState("red"), [light, setLight] = useState("white");
  const passes = light === "white" || light === c;
  return <div className={card}><div className="flex flex-wrap gap-1.5">{["red", "green", "blue"].map((x) => <button key={x} type="button" aria-pressed={c === x} onClick={() => setC(x)} className={soft}>{x} filter</button>)}</div>
    <div className="mt-2 flex flex-wrap gap-1.5">{["white", "red", "green", "blue"].map((x) => <button key={x} type="button" aria-pressed={light === x} onClick={() => setLight(x)} className={soft}>{x} light</button>)}</div>
    <Out>{passes ? `${c[0].toUpperCase()}${c.slice(1)} light comes through; the filter absorbs the other colours.` : `Nothing comes through — a ${c} filter absorbs ${light} light. It looks black.`}</Out></div>;
}

function SpringTry({ s }: { s: { k: number; limit: number } }) {
  const [F, setF] = useState(2), r = E.stretch(s.k, s.limit, F), len = 40 + Math.min(150, r.x * 100 * 6), coils = 12;
  const zig = Array.from({ length: coils + 1 }, (_, k) => `${k ? "L" : "M"}${k === 0 || k === coils ? 30 : k % 2 ? 20 : 40},${10 + (len * k) / coils}`).join(" ");
  return <div className={card}><div className="flex items-start gap-4"><svg viewBox="0 0 60 230" className="h-48 w-12" aria-hidden><rect x={5} y={2} width={50} height={6} fill="#64748B" /><path className="lr-fill" d={zig} fill="none" stroke="#CBD5E1" strokeWidth={2.5} /><g className="lr-move" style={{ transform: `translateY(${len}px)` }}><line x1={30} y1={10} x2={30} y2={18} stroke="#94A3B8" strokeWidth={2} />{Array.from({ length: Math.min(8, Math.ceil(F)) }, (_, k) => <rect key={k} x={18} y={18 + k * 6} width={24} height={5} rx={1} fill="#D97706" />)}</g></svg>
    <div className="flex-1"><Slider label="Load" value={F} min={0} max={s.limit * 1.6} step={0.1} unit="N" onChange={setF} /><Row k="Extension" v={`${f(r.x * 100, 1)} cm`} /><Out tone={r.past ? "bad" : "info"}>{r.past ? "Past the limit of proportionality: extension is no longer proportional to force, and it won't go back to its length." : `F = kx: ${f(F, 1)} N ÷ ${s.k} N/m = ${f(r.x, 3)} m.`}</Out></div></div></div>;
}
function MagnetTry({ s }: { s: { strength: number } }) {
  const [d, setD] = useState(10), turn = E.compassTurn(s.strength, d);
  return <div className={card}><svg viewBox="0 0 240 80" className="w-full" aria-hidden><rect x={10} y={28} width={40} height={24} fill="#DC2626" /><rect x={50} y={28} width={40} height={24} fill="#2563EB" /><text x={30} y={45} textAnchor="middle" fontSize={12} fontWeight={900} fill="#fff">N</text><text x={70} y={45} textAnchor="middle" fontSize={12} fontWeight={900} fill="#fff">S</text>
    <g transform={`translate(${Math.min(225, 100 + d * 3.2)},40)`}><circle r={16} fill="#F8FAFC" stroke="#94A3B8" /><g className="lr-move" style={{ transform: `rotate(${-turn}deg)` }}><path d="M0,-13 L4,0 L0,13 L-4,0 Z" fill="#DC2626" /><path d="M0,0 L4,0 L0,13 L-4,0 Z" fill="#334155" /></g></g></svg>
    <Slider label="Compass distance from the pole" value={d} min={2} max={40} step={1} unit="cm" onChange={setD} /><Row k="Field (roughly)" v={`${f(E.fieldAt(s.strength, d), 0)} μT`} /><Row k="Compass turns from north" v={`${f(turn, 0)}°`} /><Out>Double the distance and the field is about eight times weaker — far away, the compass just points north (Earth's field).</Out></div>;
}
function RadiationTry({ s }: { s: Extract<E.Spec, { e: "radiation" }> }) {
  const [kind, setKind] = useState<"alpha" | "beta" | "gamma">(s.kind === "alpha" || s.kind === "beta" || s.kind === "gamma" ? s.kind : "beta");
  const [abs, setAbs] = useState<E.Absorber>("none"), [d, setD] = useState(3), [res, setRes] = useState<ReturnType<typeof E.countRate> | null>(null);
  const [counting, setCounting] = useState<{ to: ReturnType<typeof E.countRate>; n: number } | null>(null);
  const [dice, setDice] = useState<number[]>([]);
  if (s.kind === "halflife") {
    const throwAll = () => setDice((h) => { const left = h.length ? h[h.length - 1] : 100; let n = 0; for (let k = 0; k < left; k++) if (Math.random() >= 1 / 6) n++; return [...(h.length ? h : [100]), n]; });
    const series = dice.length ? dice : [100];
    return <div className={card}><div className="flex gap-2"><button type="button" className={btn} onClick={throwAll} disabled={series[series.length - 1] === 0}>Throw the dice</button><button type="button" className={soft} onClick={() => setDice([])}>Start again (100 dice)</button></div>
      <svg viewBox="0 0 220 100" className="mt-2 w-full rounded-lg bg-[#0B1220]" role="img" aria-label="Dice left against throws">{series.map((n, k) => <rect key={k} x={4 + k * 14} y={96 - n * 0.9} width={10} height={n * 0.9} fill="#38BDF8" />)}</svg>
      <Out>Left: {series[series.length - 1]} after {series.length - 1} throws. Each die has a 1 in 6 chance of "decaying" — about half are left every 3.8 throws (the half-life).</Out></div>;
  }
  return (
    <div className={card}>
      {s.kind === "detector" && <div className="flex gap-1.5">{(["alpha", "beta", "gamma"] as const).map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={soft}>{k} source</button>)}</div>}
      <div className="mt-2 flex flex-wrap gap-1.5">{(["none", "paper", "aluminium", "lead"] as const).map((a) => <button key={a} type="button" aria-pressed={abs === a} onClick={() => setAbs(a)} className={soft}>{a === "none" ? "No absorber" : a === "aluminium" ? "3 mm aluminium" : a === "lead" ? "2 cm lead" : "Paper"}</button>)}</div>
      <Slider label="Distance from the detector" value={d} min={1} max={30} step={1} unit="cm" onChange={setD} />
      <button type="button" className={`${btn} mt-2`} onClick={() => { const r = E.countRate(kind, abs, d, Math.random); setRes(null); setCounting({ to: r, n: 0 }); }} disabled={!!counting}>Count for 10 s</button>
      {counting && <Counting c={counting} onDone={(r) => { setCounting(null); setRes(r); }} onTick={(n) => setCounting((c) => (c ? { ...c, n } : c))} />}
      {res && <><Row k="Counts in 10 s" v={res.counts} /><Row k="Count rate" v={`${res.perSecond} /s`} /><Row k={`Corrected (− ${E.BACKGROUND}/s background)`} v={`${res.corrected} /s`} /></>}
      <Out>Decay is random: count again and you'll get a slightly different number — take several counts and average them.</Out>
    </div>
  );
}
function Counting({ c, onDone, onTick }: { c: { to: ReturnType<typeof E.countRate>; n: number }; onDone: (r: ReturnType<typeof E.countRate>) => void; onTick: (n: number) => void }) {
  useEffect(() => {
    const t0 = performance.now(), T = 2000;
    const t = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / T); onTick(Math.round(c.to.counts * k)); if (k >= 1) { clearInterval(t); onDone(c.to); } }, 60);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="mt-2 flex items-center gap-3 rounded-lg bg-black/40 p-2"><span key={c.n} className="lr-flash inline-block h-3 w-3 rounded-full bg-[#34D399]" /><span className="font-mono text-2xl font-black text-[#34D399]" aria-label="Counter">{String(c.n).padStart(4, "0")}</span><span className="text-xs text-white/60">counting… (sped up)</span></div>;
}
function WaveTry({ s }: { s: Extract<E.Spec, { e: "wave" }> }) {
  const [fq, setF] = useState(s.f ?? 256), [T, setT] = useState(20), [ten, setTen] = useState(20);
  if (s.part === "string") return <div className={card}><Slider label="Tension" value={ten} min={2} max={60} step={1} unit="N" onChange={setTen} /><Slider label="Vibrating length" value={fq > 100 ? 0.3 : 0.3} min={0.3} max={0.3} step={0.1} unit="m" onChange={() => {}} /><Row k="Frequency (μ = 0.8 g/m, L = 0.30 m)" v={`${f(E.stringFrequency(0.3, ten, 0.0008), 0)} Hz`} /><Out>f = (1/2L)√(T/μ): four times the tension doubles the frequency.</Out></div>;
  const v = s.part === "ripple" ? 0.24 : s.part === "slinky" ? 2 : E.soundSpeed(T);
  return (
    <div className={card}>
      <Slider label="Frequency" value={fq} min={s.part === "ripple" || s.part === "slinky" ? 1 : 20} max={s.part === "ripple" || s.part === "slinky" ? 20 : 2000} step={1} unit="Hz" onChange={setF} />
      {s.part !== "ripple" && s.part !== "slinky" && <Slider label="Air temperature" value={T} min={0} max={40} step={1} unit="°C" onChange={setT} />}
      <TravellingWave lambda={E.wavelength(v, fq)} />
      <Row k="Wave speed" v={`${f(v, 2)} m/s`} /><Row k="Wavelength (v ÷ f)" v={`${f(E.wavelength(v, fq) * 100, 1)} cm`} />
      {s.part === "tube" && <Row k="First resonance length (λ/4 − end correction)" v={`${f(E.firstResonance(fq, T) * 100, 1)} cm`} />}
      <Out>{s.part === "fork" ? "Higher frequency, shorter wavelength — the speed stays the same in the same medium." : "v = fλ."}</Out>
    </div>
  );
}

function TravellingWave({ lambda }: { lambda: number }) {
  const px = Math.max(14, Math.min(240, lambda * 120)), pts = Array.from({ length: 121 }, (_, i) => `${i * 2.5},${40 - 22 * Math.sin((2 * Math.PI * i * 2.5) / px)}`).join(" ");
  return (
    <svg viewBox="0 0 300 80" className="mt-2 w-full overflow-hidden rounded-lg bg-[#0B1220]" aria-hidden>
      <g><animateTransform attributeName="transform" type="translate" from="0 0" to={`${-px} 0`} dur="1s" repeatCount="indefinite" /><polyline points={pts} fill="none" stroke="#38BDF8" strokeWidth={2.5} transform={`translate(0,0)`} /><polyline points={pts} fill="none" stroke="#38BDF8" strokeWidth={2.5} transform="translate(300,0)" /></g>
      <line x1={10} y1={72} x2={10 + px} y2={72} stroke="#FDE047" strokeWidth={2} /><text x={14 + px} y={75} fontSize={9} fill="#FDE047">λ</text>
    </svg>
  );
}
function ReagentTry({ s }: { s: Extract<E.Spec, { e: "reagent" }> }) {
  const [t, setT] = useState<E.TestName | null>(null), [k, setK] = useState(0), c = E.indicatorColour("universal", s.pH);
  const tests = E.TESTS.filter((x) => (s.kind === "gas" ? ["limewater", "glowing splint", "lighted splint", "damp litmus paper", "bromine water"].includes(x) : !["limewater", "glowing splint", "lighted splint"].includes(x) || s.gas));
  const seen = t ? E.observe(s, t) : "";
  const look = lookOf(seen, s);
  return (
    <div className={card}>
      <p className="flex items-center gap-2 text-sm font-bold"><span className="h-5 w-5 rounded-full ring-1 ring-white/30" style={{ background: c.hex }} />pH {s.pH} · {E.strength(s.pH)}</p>
      <div className="mt-2 flex items-end justify-center gap-4">
        {t === "flame test"
          ? <div className="relative"><Burner on kind="bunsen" flame={look.flame ?? "#3B82F6"} size={96} /><svg viewBox="0 0 60 40" className="absolute -right-10 top-0 h-10 w-16" aria-hidden><path d="M58,4 L14,30" stroke="#CBD5E1" strokeWidth={1.6} /><circle cx={12} cy={31} r={3} fill="none" stroke="#CBD5E1" strokeWidth={1.4} /></svg></div>
          : t && /splint/.test(t) ? <Splint glow={/relights|brightly/.test(seen)} pop={/pop/.test(seen)} out={/goes out/.test(seen)} k={k} />
          : <Vessel key={t ?? "none"} shape="tube" size={56} level={0.5} colour={look.colour ?? (s.formula === "CuSO4" ? "#60A5FA" : "#E0F2FE")} ppt={look.ppt} fizz={look.fizz} milky={look.milky} drop={t ? { colour: "#E2E8F0", key: k } : null} />}
      </div>
      <p className="mt-2 text-xs font-black uppercase tracking-wide text-white/50">Test it with…</p>
      <div className="mt-1 flex flex-wrap gap-1.5">{tests.map((x) => <button key={x} type="button" aria-pressed={t === x} onClick={() => { setT(x); setK(Date.now()); }} className={soft}>{x}</button>)}</div>
      {t && <Out>{seen}</Out>}
    </div>
  );
}
// What the observation looks like, for the drawing.
function lookOf(seen: string, s: Extract<E.Spec, { e: "reagent" }>): { colour?: string; ppt?: string; fizz?: boolean; milky?: boolean; flame?: string } {
  const out: ReturnType<typeof lookOf> = {};
  if (/precipitate/.test(seen) && !/No precipitate/.test(seen)) out.ppt = /light blue/.test(seen) ? "#7DD3FC" : /green/.test(seen) ? "#4D7C0F" : /red-brown/.test(seen) ? "#9A3412" : /cream/.test(seen) ? "#FEF3C7" : /yellow/.test(seen) ? "#FDE047" : "#F8FAFC";
  if (/deep blue solution/.test(seen)) out.colour = "#1D4ED8";
  if (/Effervescence|Bubbles|fizz/i.test(seen)) out.fizz = true;
  if (/milky/.test(seen)) out.milky = true;
  if (/Turns (\w+)/.test(seen)) out.colour = E.indicatorColour("universal", s.pH).hex;
  if (/blue-black/.test(seen)) out.colour = "#1E1B4B";
  if (/Decolourised/.test(seen)) out.colour = "#E0F2FE";
  const flame: [RegExp, string][] = [[/yellow-orange/, "#FB923C"], [/lilac/, "#C084FC"], [/brick-red/, "#DC2626"], [/blue-green/, "#14B8A6"], [/crimson/, "#BE123C"], [/apple-green/, "#84CC16"], [/white glow/, "#F8FAFC"]];
  for (const [re, c] of flame) if (re.test(seen)) out.flame = c;
  return out;
}
function Splint({ glow, pop, out, k }: { glow: boolean; pop: boolean; out: boolean; k: number }) {
  return (
    <svg key={k} viewBox="0 0 120 90" className="h-24 w-32" aria-hidden>
      <path d="M50,88 V20 a10,10 0 0 1 20,0 V88" fill="#ffffff14" stroke="#E2E8F0" strokeWidth={2} transform="rotate(180 60 54)" />
      <line x1={10} y1={10} x2={58} y2={60} stroke="#D6B47A" strokeWidth={4} strokeLinecap="round" />
      {!out && <circle cx={58} cy={60} r={glow ? 7 : 4} fill={glow ? "#FDE047" : "#F97316"} className={glow ? "lr-glow" : ""} />}
      {pop && <text x={60} y={30} textAnchor="middle" fontSize={16} fontWeight={900} fill="#FDE047" className="lr-pop">POP!</text>}
      {out && <path d="M58,58 q4,-10 -2,-18" fill="none" stroke="#94A3B8" strokeWidth={2} className="lr-steam" />}
    </svg>
  );
}
function IndicatorTry({ s }: { s: { ind: E.IndicatorId } }) {
  const [pH, setPH] = useState(7), c = E.indicatorColour(s.ind, pH);
  return <div className={card}><Slider label="pH of the solution" value={pH} min={0} max={14} step={0.5} onChange={setPH} /><div className="mt-2 flex items-center gap-3"><Vessel shape="tube" level={0.6} colour={c.hex} size={44} /><p className="text-sm font-bold">Turns <b>{c.name}</b> at pH {pH} ({E.strength(pH)}).</p></div>
    <div className="mt-2 flex h-4 overflow-hidden rounded-full">{Array.from({ length: 29 }, (_, k) => <span key={k} className="flex-1" style={{ background: E.indicatorColour(s.ind, k / 2).hex }} />)}</div></div>;
}
function SpecimenTry({ item, s }: { item: Item; s: Extract<E.Spec, { e: "specimen" }> }) {
  const others = useMemo(() => ROOMS.biology.filter((x) => x.spec.e === "specimen" && x.id !== item.id && (x.spec as typeof s).group !== s.group).flatMap((x) => (x.spec as typeof s).features), [item.id, s.group]);
  const [q, setQ] = useState(() => mk()), [got, setGot] = useState<string | null>(null);
  function mk() { const right = pickR(s.features); return { right, opts: shuffle([right, ...shuffle(others.length ? others : ["Has feathers", "Has gills", "Has a shell"]).slice(0, 3)]) }; }
  return (
    <div className={card}>
      <Row k="Group" v={s.group} /><Row k="Habitat" v={s.habitat} />
      <p className="mt-2 text-sm font-black">Which of these is a feature of the {item.name.toLowerCase()}?</p>
      <div className="mt-1 grid gap-1.5">{q.opts.map((o) => <button key={o} type="button" onClick={() => setGot(o)} className={`${soft} text-left ${got && o === q.right ? "bg-emerald-600" : got === o ? "bg-red-600" : ""}`}>{o}</button>)}</div>
      {got && <Out tone={got === q.right ? "good" : "bad"}>{got === q.right ? "✓ Right." : `No — ${q.right.toLowerCase()} is.`} Its features: {s.features.join("; ")}.</Out>}
      {got && <button type="button" className={`${soft} mt-2`} onClick={() => { setQ(mk()); setGot(null); }}>Another one</button>}
    </div>
  );
}
function ModelTry({ s }: { s: { parts: [string, string][] } }) {
  const [k, setK] = useState(() => Math.floor(Math.random() * s.parts.length)), [got, setGot] = useState<string | null>(null), [all, setAll] = useState(false);
  const choices = useMemo(() => shuffle([s.parts[k][0], ...shuffle(s.parts.filter((_, i) => i !== k).map((p) => p[0])).slice(0, 3)]), [k, s.parts]);
  return (
    <div className={card}>
      <p className="text-sm font-black">Which part: “{s.parts[k][1]}”?</p>
      <div className="mt-1 grid grid-cols-2 gap-1.5">{choices.map((o) => <button key={o} type="button" onClick={() => setGot(o)} className={`${soft} ${got && o === s.parts[k][0] ? "bg-emerald-600" : got === o ? "bg-red-600" : ""}`}>{o}</button>)}</div>
      {got && <Out tone={got === s.parts[k][0] ? "good" : "bad"}>{got === s.parts[k][0] ? "✓ Right." : `It's the ${s.parts[k][0].toLowerCase()}.`}</Out>}
      <div className="mt-2 flex gap-2">{got && <button type="button" className={soft} onClick={() => { setK((k + 1) % s.parts.length); setGot(null); }}>Next part</button>}<button type="button" className={soft} onClick={() => setAll(!all)}>{all ? "Hide" : "Show"} every part</button></div>
      {all && <div className="mt-2">{s.parts.map(([p, fn]) => <Row key={p} k={p} v={fn} />)}</div>}
    </div>
  );
}
function SafetyTry({ s }: { s: { protects: E.Hazard[] } }) {
  const ALL: E.Hazard[] = ["corrosive", "irritant", "toxic", "flammable", "oxidising", "hot", "sharp", "biological", "glass", "radiation"];
  const [h, setH] = useState<E.Hazard>(() => pickR(ALL)), [got, setGot] = useState<boolean | null>(null), right = s.protects.includes(h);
  return <div className={card}><Row k="Protects against" v={s.protects.join(", ")} /><p className="mt-2 text-sm font-black">A {h} hazard: does this help?</p><div className="mt-1 flex gap-2"><button type="button" className={soft} onClick={() => setGot(true)}>Yes</button><button type="button" className={soft} onClick={() => setGot(false)}>No</button></div>
    {got != null && <Out tone={got === right ? "good" : "bad"}>{got === right ? "✓ Right." : "Think again."} {right ? "It does." : "It isn't the main protection for that."}</Out>}{got != null && <button type="button" className={`${soft} mt-2`} onClick={() => { setH(pickR(ALL)); setGot(null); }}>Another hazard</button>}</div>;
}

const DIMS: Partial<Record<E.ShapeKind | E.SolidKind, (keyof E.Dims)[]>> = {
  square: ["a"], rectangle: ["a", "b"], parallelogram: ["a", "b", "h"], rhombus: ["a", "h"], trapezium: ["a", "b", "h"], kite: ["a", "b"], circle: ["r"], semicircle: ["r"], sector: ["r", "angle"], segment: ["r", "angle"], polygon: ["a", "n"],
  right: ["a", "b"], equilateral: ["a"], isosceles: ["a", "b"], scalene: ["a", "b", "c"], triangle: ["a", "b", "c"],
  cube: ["a"], cuboid: ["a", "b", "c"], sphere: ["r"], hemisphere: ["r"], cylinder: ["r", "h"], "hollow-cylinder": ["r", "a", "h"], cone: ["r", "h"], "square-pyramid": ["a", "h"], "tri-pyramid": ["a", "h"], "tri-prism": ["a", "h"], "prism-n": ["a", "h", "n"],
  tetrahedron: ["a"], octahedron: ["a"], dodecahedron: ["a"], icosahedron: ["a"], "frustum-cone": ["r", "a", "h"], "frustum-pyramid": ["a", "b", "h"],
};
const LABEL: Record<keyof E.Dims, string> = { a: "a (side)", b: "b", c: "c", h: "height h", r: "radius r", n: "number of sides n", angle: "angle θ" };
function useDims(kind: E.ShapeKind | E.SolidKind, sides?: number) {
  const [d, setD] = useState<E.Dims>({ a: 6, b: 4, c: 5, h: 5, r: 4, n: sides ?? 6, angle: 60 });
  const keys = DIMS[kind] ?? ["a"];
  const fixed = (d0: E.Dims): E.Dims => (kind === "equilateral" ? { ...d0, b: d0.a, c: d0.a } : kind === "isosceles" ? { ...d0, c: d0.b } : d0);
  return [fixed(d), keys.filter((k) => !(sides && k === "n")).map((k) => <Slider key={k} label={LABEL[k]} value={d[k]} min={k === "n" ? 3 : k === "angle" ? 1 : 1} max={k === "n" ? 20 : k === "angle" ? 359 : 20} step={k === "n" || k === "angle" ? 1 : 0.5} unit={k === "n" ? "" : k === "angle" ? "°" : "cm"} onChange={(v) => setD({ ...d, [k]: v })} />)] as const;
}
function ShapeTry({ s }: { s: Extract<E.Spec, { e: "shape" }> }) {
  const [d, sliders] = useDims(s.kind, s.sides), r = E.shape(s.kind, d);
  return <div className={card}>{sliders}<Row k="Area" v={`${f(r.area, 2)} cm²`} /><Row k="Perimeter" v={`${f(r.perimeter, 2)} cm`} /><Row k="Angles add up to" v={`${r.angleSum}°`} /><Out>{r.note}</Out></div>;
}
function SolidTry({ s }: { s: Extract<E.Spec, { e: "solid" }> }) {
  const [d, sliders] = useDims(s.kind, s.sides), r = E.solid(s.kind, d);
  return <div className={card}>{sliders}<Row k="Volume" v={`${f(r.V, 2)} cm³`} /><Row k="Surface area" v={`${f(r.SA, 2)} cm²`} /><Row k="Faces · edges · vertices" v={`${r.F} · ${r.E} · ${r.Vx}`} />
    {r.E > 0 && <Out>Euler: F + V − E = {r.F} + {r.Vx} − {r.E} = {r.F + r.Vx - r.E}.</Out>}</div>;
}
function RandomTry({ s }: { s: Extract<E.Spec, { e: "random" }> }) {
  const [n, setN] = useState(0), [roll, setRoll] = useState(0), [res0, setRes] = useState<ReturnType<typeof E.throwsOf> | null>(null);
  const [last, setLast] = useState(0);
  const res = res0 ? { ...res0, last } : null;
  const k = s.kind === "coin" ? 2 : s.kind === "cards" ? 4 : s.sides ?? 6;
  const names = s.kind === "coin" ? ["Heads", "Tails"] : s.kind === "cards" ? ["♠", "♥", "♦", "♣"] : s.kind === "balls" ? ["Red", "Blue", "Green", "Yellow", "White"].slice(0, k) : Array.from({ length: k }, (_, i) => String(i + 1));
  return (
    <div className={card}>
      <div className="mb-2 flex justify-center"><span key={roll} className={`inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white text-2xl font-black text-[#0B1220] shadow-lg ${roll ? "lr-shake" : ""}`} aria-label="Last result">{res ? names[res.last] : s.kind === "coin" ? "🪙" : "🎲"}</span></div>
      <div className="flex flex-wrap gap-1.5">{[1, 10, 100, 1000].map((t) => <button key={t} type="button" className={soft} onClick={() => { setN(t); setRoll(Date.now()); setLast(Math.floor(Math.random() * k)); setRes(E.throwsOf(s.kind, k, t, Math.random)); }}>{s.kind === "coin" ? "Toss" : s.kind === "cards" ? "Draw" : s.kind === "spinner" ? "Spin" : "Roll"} ×{t}</button>)}</div>
      {res && <>
        <div className="mt-2 grid gap-1">{res.tally.map((t, i) => <div key={i} className="flex items-center gap-2 text-xs"><span className="w-12 font-black">{names[i]}</span><span className="h-3 rounded bg-[#38BDF8]" style={{ width: `${Math.max(2, res.relative[i] * 100 * (k / 2))}%` }} /><span className="font-mono">{t} ({f(res.relative[i], 3)})</span></div>)}</div>
        <Out>{n} trials. Theory: each is {f(res.theory, 3)}. The more trials, the closer the relative frequencies get to it.</Out>
      </>}
    </div>
  );
}
function MoneyTry({ s }: { s: { calc: E.MoneyCalc } }) {
  const lab: Record<E.MoneyCalc, [string, string, string]> = { simple: ["Principal (₦)", "Rate (% a year)", "Years"], compound: ["Principal (₦)", "Rate (% a year)", "Years"], discount: ["Price (₦)", "Discount (%)", ""], profit: ["Cost price (₦)", "Profit (%)", ""], tax: ["Amount (₦)", "Tax rate (%)", ""], exchange: ["Amount (₦)", "₦ per unit of the other currency", ""], depreciation: ["Value when new (₦)", "Depreciation (% a year)", "Years"], loan: ["Loan (₦)", "Interest (% a year)", "Years"], change: ["Price (₦)", "Amount paid (₦)", ""], budget: ["Income (₦)", "Spending (₦)", ""] };
  const [P, setP] = useState(10000), [r, setR] = useState(s.calc === "exchange" ? 1500 : s.calc === "change" || s.calc === "budget" ? 12000 : 10), [y, setY] = useState(2);
  const L = lab[s.calc], out = E.money(s.calc, P, r, y);
  const box = (label: string, v: number, set: (n: number) => void) => <label className="block text-xs font-black text-white/70">{label}<input inputMode="decimal" value={v} onChange={(e) => set(Number(e.target.value) || 0)} aria-label={label} className="mt-1 h-10 w-full rounded-lg bg-white/10 px-3 text-sm font-bold text-white" /></label>;
  return <div className={`${card} grid gap-2`}>{box(L[0], P, setP)}{box(L[1], r, setR)}{L[2] && box(L[2], y, setY)}<Out>{out.line}</Out></div>;
}
function GraphTry({ s }: { s: Extract<E.Spec, { e: "graph" }> }) {
  const [a, setA] = useState(1), [b, setB] = useState(s.fn === "sin" || s.fn === "cos" || s.fn === "tan" ? 1 : 0), [c, setC] = useState(s.fn === "circle" ? 0 : -2), [x0, setX0] = useState(1), [x1, setX1] = useState(3);
  const trig = s.fn === "sin" || s.fn === "cos" || s.fn === "tan", X = trig ? 360 : 6, fn = (x: number) => E.fnValue(s.fn, s.fn === "circle" ? Math.max(1, a * 4) : a, b, c, x);
  const pts = Array.from({ length: 241 }, (_, i) => -X + (i * 2 * X) / 240).map((x) => [x, fn(x)] as const).filter(([, y]) => Number.isFinite(y) && Math.abs(y) < 50);
  const Y = Math.max(2, ...pts.map((p) => Math.abs(p[1]))) * 1.1, W = 300, Hh = 160, sx = (x: number) => W / 2 + (x / X) * (W / 2), sy = (y: number) => Hh / 2 - (y / Y) * (Hh / 2);
  const g = E.gradientAt(fn, x0), area = E.areaUnder(fn, Math.min(x0, x1), Math.max(x0, x1));
  const stat = useMemo(() => { const out: number[] = []; for (let x = -X; x < X; x += X / 300) { const g1 = E.gradientAt(fn, x), g2 = E.gradientAt(fn, x + X / 300); if (g1 === 0 || g1 * g2 < 0) out.push(x + X / 600); } return out.slice(0, 4); }, [a, b, c, s.fn]); // eslint-disable-line react-hooks/exhaustive-deps
  const coef = s.fn === "line" ? ["gradient m", "intercept c", ""] : s.fn === "quadratic" ? ["a (x²)", "b (x)", "c"] : s.fn === "cubic" ? ["a (x³)", "b (x²)", "c (x)"] : trig ? ["amplitude", "frequency", "shift up"] : s.fn === "circle" ? ["radius ÷ 4", "", ""] : s.fn === "exp" ? ["a", "k (eᵏˣ)", "c"] : ["k (k/x)", "", "c"];
  return (
    <div className={card}>
      {coef[0] && <Slider label={coef[0]} value={a} min={-5} max={5} step={0.5} onChange={setA} />}
      {coef[1] && <Slider label={coef[1]} value={b} min={trig ? 0.5 : -5} max={trig ? 4 : 5} step={0.5} onChange={setB} />}
      {coef[2] && <Slider label={coef[2]} value={c} min={-5} max={5} step={0.5} onChange={setC} />}
      {s.calculus && s.calculus !== "stationary" && <Slider label={s.calculus === "area" ? "From x =" : "At x ="} value={x0} min={-X} max={X} step={trig ? 5 : 0.5} onChange={setX0} />}
      {s.calculus === "area" && <Slider label="To x =" value={x1} min={-X} max={X} step={trig ? 5 : 0.5} onChange={setX1} />}
      <svg viewBox={`0 0 ${W} ${Hh}`} className="mt-2 w-full rounded-lg bg-[#0B1220]" role="img" aria-label="Graph">
        <line x1={0} y1={Hh / 2} x2={W} y2={Hh / 2} stroke="#475569" /><line x1={W / 2} y1={0} x2={W / 2} y2={Hh} stroke="#475569" />
        {s.calculus === "area" && <path d={`M${sx(Math.min(x0, x1))},${sy(0)} ${pts.filter(([x]) => x >= Math.min(x0, x1) && x <= Math.max(x0, x1)).map(([x, y]) => `L${sx(x)},${sy(y)}`).join(" ")} L${sx(Math.max(x0, x1))},${sy(0)} Z`} fill="#38BDF8" fillOpacity=".25" />}
        <polyline fill="none" stroke="#38BDF8" strokeWidth={2} points={pts.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ")} />
        {s.calculus === "gradient" && Number.isFinite(fn(x0)) && <line x1={sx(x0 - X / 3)} y1={sy(fn(x0) - g * X / 3)} x2={sx(x0 + X / 3)} y2={sy(fn(x0) + g * X / 3)} stroke="#FDE047" strokeWidth={1.5} />}
        {s.calculus === "stationary" && stat.map((x) => <circle key={x} cx={sx(x)} cy={sy(fn(x))} r={4} fill="#FDE047" />)}
        <text x={W - 4} y={Hh / 2 - 4} textAnchor="end" fontSize={9} fill="#94A3B8">{trig ? "x°" : "x"}</text>
      </svg>
      {s.calculus === "gradient" && <Out>Gradient at x = {x0}: dy/dx ≈ {f(g, 3)} (the slope of the tangent).</Out>}
      {s.calculus === "area" && <Out>Area from {Math.min(x0, x1)} to {Math.max(x0, x1)} ≈ {f(area, 3)} square units (area below the x-axis counts as negative).</Out>}
      {s.calculus === "stationary" && <Out>{stat.length ? `Stationary points (gradient = 0) near x = ${stat.map((x) => f(x, 2)).join(", ")}.` : "No stationary points in view."}</Out>}
    </div>
  );
}
function StatsTry() {
  const [t, setT] = useState("12, 15, 11, 15, 18, 14, 13, 15, 20, 12"), r = E.stats(t.split(/[\s,;]+/).map(Number).filter((x) => Number.isFinite(x)));
  return <div className={card}><label className="block text-xs font-black text-white/70">Your data<textarea value={t} onChange={(e) => setT(e.target.value)} rows={2} aria-label="Your data" className="mt-1 w-full rounded-lg bg-white/10 p-2 text-sm font-bold text-white" /></label>
    {r ? <><Row k="Number of values" v={r.n} /><Row k="Mean" v={f(r.mean, 3)} /><Row k="Median" v={f(r.median, 3)} /><Row k="Mode" v={r.modes.length ? r.modes.join(", ") : "none"} /><Row k="Range" v={f(r.range, 3)} /><Row k="Lower · upper quartile" v={`${f(r.q1, 2)} · ${f(r.q3, 2)}`} /><Row k="Standard deviation" v={f(r.sd, 3)} />
      <svg viewBox="0 0 300 40" className="mt-2 w-full rounded-lg bg-[#0B1220]" role="img" aria-label="Box plot">{(() => { const span = Math.max(1e-9, r.max - r.min), X = (v: number) => 15 + ((v - r.min) / span) * 270; return <g stroke="#38BDF8" strokeWidth={2} fill="none"><line x1={X(r.min)} y1={20} x2={X(r.q1)} y2={20} /><rect x={X(r.q1)} y={8} width={X(r.q3) - X(r.q1)} height={24} /><line x1={X(r.median)} y1={8} x2={X(r.median)} y2={32} stroke="#FDE047" /><line x1={X(r.q3)} y1={20} x2={X(r.max)} y2={20} /></g>; })()}</svg></> : <Out>Type some numbers.</Out>}</div>;
}
function MicroTry({ s }: { s: { eyepiece: number; objectives: number[] } }) {
  const [o, setO] = useState(s.objectives[0]), [img, setImg] = useState(20), mag = E.magnification(s.eyepiece, o);
  return <div className={card}><div className="flex flex-wrap gap-1.5">{s.objectives.map((x) => <button key={x} type="button" aria-pressed={o === x} onClick={() => setO(x)} className={soft}>×{x} objective</button>)}</div>
    <svg viewBox="0 0 120 120" className="mx-auto mt-2 h-36 w-36" role="img" aria-label="What you see"><defs><clipPath id="mv"><circle cx={60} cy={60} r={56} /></clipPath></defs><circle cx={60} cy={60} r={58} fill="#0B1220" /><g clipPath="url(#mv)"><rect width={120} height={120} fill="#FEF9C3" /><g className="lr-move" style={{ transform: `scale(${Math.min(4, o / 4)})`, transformOrigin: "60px 60px" }}>{Array.from({ length: 16 }, (_, k) => <g key={k}><rect x={(k % 4) * 30 + 2} y={Math.floor(k / 4) * 30 + 2} width={27} height={27} fill="#FDE68A" stroke="#A16207" strokeWidth={1} /><circle cx={(k % 4) * 30 + 12} cy={Math.floor(k / 4) * 30 + 14} r={4} fill="#92400E" fillOpacity=".7" /></g>)}</g></g></svg>
    <Slider label="Size of the cell in your drawing" value={img} min={5} max={100} step={1} unit="mm" onChange={setImg} />
    <Row k="Total magnification" v={`×${mag}`} /><Row k="Real size of the cell" v={`${f(E.actualSize(img, mag), 1)} μm`} /><Row k="Field of view" v={`${f(E.fieldOfView(o), 2)} mm across`} />
    <Out>Actual size = image size ÷ magnification. Higher power: more detail, but you see a smaller area and it's darker.</Out></div>;
}
function ToolTry({ item }: { item: Item }) {
  const pool = useMemo(() => ROOMS[item.subject].filter((x) => x.spec.e === "tool" && x.id !== item.id).map((x) => (x.spec as { use: string }).use), [item]);
  const right = (item.spec as { use: string }).use;
  const opts = useRef(shuffle([right, ...shuffle(pool).slice(0, 3)]));
  const [got, setGot] = useState<string | null>(null);
  return <div className={card}><p className="text-sm font-black">What is the {item.name.toLowerCase()} for?</p><div className="mt-1 grid gap-1.5">{opts.current.map((o) => <button key={o} type="button" onClick={() => setGot(o)} className={`${soft} text-left ${got && o === right ? "bg-emerald-600" : got === o ? "bg-red-600" : ""}`}>{o}</button>)}</div>
    {got && <Out tone={got === right ? "good" : "bad"}>{got === right ? "✓ Right." : `No — ${right}`}</Out>}</div>;
}
