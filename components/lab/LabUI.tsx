"use client";
import Link from "next/link";
import { useId, type ReactNode } from "react";
import { SUBJECTS, type LabEntry } from "@/lib/lab/catalog";
import { guideFor } from "@/lib/lab/guides";
import VoiceTutor from "@/components/lab/VoiceTutor";
import LabComplete from "@/components/lab/LabComplete";

// Building blocks shared by every e-lab experiment, all in the e-lab's own
// dark "lab console" style (see `.elab` in globals.css).

export function LabShell({ entry, base, children }: { entry: LabEntry; base: string; children: ReactNode }) {
  const s = SUBJECTS[entry.subject];
  const guide = guideFor(entry.slug);
  return (
    <div className="elab -mx-4 -mt-4 min-h-[calc(100vh-4rem)] px-4 pb-16 pt-5 sm:-mx-7 sm:px-7 lg:mx-0 lg:mt-0 lg:rounded-[2rem] lg:px-8 lg:pt-7">
      <div className="mx-auto max-w-6xl">
        <Link href={base} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white">
          ← E-Laboratory
        </Link>
        <header className="mt-5 flex flex-wrap items-center gap-4">
          <span className="elab-glow flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-4xl" style={{ ["--c" as any]: s.color }} aria-hidden>
            {entry.emoji}
          </span>
          <div className="min-w-0">
            <span className="text-[11px] font-extrabold uppercase tracking-[.2em]" style={{ color: s.color }}>{s.label} · {entry.level}</span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{entry.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/60">{entry.blurb}</p>
          </div>
        </header>
        {guide && <div className="mt-5"><VoiceTutor key={entry.slug} slug={entry.slug} guide={guide} color={s.color} /></div>}
        <div className="mt-6">{children}</div>
        {base.startsWith("/portal") && <LabComplete key={entry.slug} slug={entry.slug} color={s.color} />}
      </div>
    </div>
  );
}

export function Panel({ title, children, className = "", right }: { title?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`elab-panel p-5 ${className}`}>
      {(title || right) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[11px] font-extrabold uppercase tracking-[.18em] text-white/50">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Slider({
  label, value, min, max, step = 1, unit = "", color = "#38BDF8", onChange, format,
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; color?: string;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-white/75">{label}</label>
        <span className="font-mono text-sm font-bold" style={{ color }}>{format ? format(value) : value}{unit}</span>
      </div>
      <input id={id} type="range" className="elab-range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--p" as any]: `${pct}%`, ["--c" as any]: color }} />
    </div>
  );
}

export function Readout({ label, value, unit, color = "#38BDF8", big = false }: { label: string; value: string | number; unit?: string; color?: string; big?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-white/45">{label}</p>
      <p className={`mt-0.5 font-mono font-bold tabular-nums ${big ? "text-3xl" : "text-xl"}`} style={{ color }}>
        {value}{unit && <span className="ml-1 text-sm text-white/45">{unit}</span>}
      </p>
    </div>
  );
}

export function LabButton({
  children, onClick, variant = "solid", color = "#38BDF8", disabled, className = "",
}: {
  children: ReactNode; onClick: () => void; variant?: "solid" | "ghost"; color?: string; disabled?: boolean; className?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${
        variant === "solid" ? "text-[#070B1A] hover:brightness-110" : "border border-white/15 bg-white/5 text-white/85 hover:bg-white/10"
      } ${className}`}
      style={variant === "solid" ? { background: color, boxShadow: `0 8px 24px -8px ${color}` } : undefined}>
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  options, value, onChange, color = "#38BDF8", label,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; color?: string; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-black/25 p-1.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold transition ${on ? "text-[#070B1A]" : "text-white/65 hover:bg-white/5 hover:text-white"}`}
            style={on ? { background: color } : undefined}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Insight({ children, color = "#38BDF8", title = "What's happening?" }: { children: ReactNode; color?: string; title?: string }) {
  return (
    <div className="rounded-2xl border p-4 text-sm leading-relaxed text-white/75" style={{ borderColor: `${color}55`, background: `${color}12` }}>
      <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[.16em]" style={{ color }}>💡 {title}</p>
      {children}
    </div>
  );
}

export function Challenge({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-relaxed text-amber-50/90">
      <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[.16em] text-amber-300">🎯 Try this</p>
      {children}
    </div>
  );
}

// ── A small dependency-free SVG chart (lines and/or dots) ──────────────────
export type Series = { points: [number, number][]; color: string; kind?: "line" | "dots"; dashed?: boolean; label?: string };

export function Chart({
  series, xMax, yMax, xMin = 0, yMin = 0, xLabel, yLabel, height = 220, markerX, xTicks = 5, yTicks = 4, title,
}: {
  series: Series[]; xMax: number; yMax: number; xMin?: number; yMin?: number;
  xLabel: string; yLabel: string; height?: number; markerX?: number; xTicks?: number; yTicks?: number; title: string;
}) {
  const W = 520, H = height, L = 46, R = 14, T = 12, B = 34;
  const sx = (x: number) => L + ((x - xMin) / (xMax - xMin || 1)) * (W - L - R);
  const sy = (y: number) => H - B - ((y - yMin) / (yMax - yMin || 1)) * (H - T - B);
  const fmt = (v: number) => (Math.abs(v) >= 100 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title}>
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const v = yMin + ((yMax - yMin) * i) / yTicks;
        return (
          <g key={`y${i}`}>
            <line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} stroke="rgba(255,255,255,.08)" />
            <text x={L - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,.45)">{fmt(v)}</text>
          </g>
        );
      })}
      {Array.from({ length: xTicks + 1 }, (_, i) => {
        const v = xMin + ((xMax - xMin) * i) / xTicks;
        return <text key={`x${i}`} x={sx(v)} y={H - B + 16} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,.45)">{fmt(v)}</text>;
      })}
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="rgba(255,255,255,.25)" />
      <line x1={L} x2={L} y1={T} y2={H - B} stroke="rgba(255,255,255,.25)" />
      <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="rgba(255,255,255,.6)">{xLabel}</text>
      <text x={12} y={(T + H - B) / 2} textAnchor="middle" fontSize="11" fontWeight="700" fill="rgba(255,255,255,.6)" transform={`rotate(-90 12 ${(T + H - B) / 2})`}>{yLabel}</text>
      {markerX !== undefined && (
        <line x1={sx(markerX)} x2={sx(markerX)} y1={T} y2={H - B} stroke="rgba(255,255,255,.35)" strokeDasharray="4 4" />
      )}
      {series.map((s, k) => (
        <g key={k}>
          {(s.kind ?? "line") === "line" && s.points.length > 1 && (
            <polyline fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={s.dashed ? "6 5" : undefined}
              points={s.points.map(([x, y]) => `${sx(x)},${sy(Math.max(yMin, Math.min(yMax, y)))}`).join(" ")} />
          )}
          {s.kind === "dots" && s.points.map(([x, y], i) => (
            <circle key={i} cx={sx(x)} cy={sy(y)} r="5" fill={s.color} stroke="#070B1A" strokeWidth="2" />
          ))}
        </g>
      ))}
    </svg>
  );
}
