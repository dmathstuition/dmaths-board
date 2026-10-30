"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { BoardStats } from "@/lib/boardStats";
import type { BoardState } from "@/lib/boardPlan";

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const num = (n: number) => n.toLocaleString("en-NG");
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—");
const when = (iso: string) => {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)} h ago`;
  return day(iso);
};
const monthLabel = (m: string) => new Date(`${m}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "short" });

const STATE: Record<BoardState, { label: string; tone: string }> = {
  active: { label: "Paying", tone: "bg-emerald-50 text-emerald-800" },
  trial: { label: "On trial", tone: "bg-sky-50 text-sky-800" },
  expired: { label: "Lapsed", tone: "bg-amber-50 text-amber-800" },
  suspended: { label: "On hold", tone: "bg-red-50 text-red-700" },
  unverified: { label: "Email not confirmed", tone: "bg-slate-100 text-slate-600" },
};

// Admin overview of D-Maths Board: growth, money, use and who to follow up.
export default function AdminDashboard() {
  const [s, setS] = useState<BoardStats | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const r = await fetch("/api/board/admin/stats", { cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) { setErr(j.error ?? "Couldn't load the dashboard. Check your connection and try again."); return; }
    setErr(""); setS(j);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (err && !s) return (
    <div role="alert" className="rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-700">
      {err} <button type="button" onClick={load} className="ml-2 underline">Try again</button>
    </div>
  );
  if (!s) return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white ring-1 ring-dmb-rule" />)}</div>;

  const k = s.kpis;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-dmbDisplay text-3xl font-semibold text-dmb-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-dmb-muted">How D-Maths Board is doing. Updated {when(s.generatedAt)}.</p>
        </div>
        <button type="button" onClick={load} disabled={busy} className="dmb-btn !min-h-[40px] disabled:opacity-60">{busy ? "Refreshing…" : "Refresh"}</button>
      </div>

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Teachers" value={num(k.teachers)} note={`${num(k.activeTeachers30)} taught in the last 30 days`} />
        <Tile label="Paying now" value={num(k.byState.active)} note={`${num(k.byState.trial)} on trial · ${num(k.byState.expired)} lapsed`} />
        <Tile label="Revenue this month" value={naira(k.revenueThisMonth)} note={`${naira(k.revenueTotal)} all time`} />
        <Tile label="Live now" value={num(k.liveNow)} note={k.liveNow ? "classes running" : "no classes running"} live={k.liveNow > 0} />
        <Tile label="Classes · 30 days" value={num(k.classes30)} note={`${num(k.classesTotal)} in the last year`} />
        <Tile label="Students · 30 days" value={num(k.students30)} note={`${k.avgStudentsPerClass30} per class on average`} />
        <Tile label="Average class" value={k.avgMinutes30 ? `${k.avgMinutes30} min` : "—"} note="classes ended in the last 30 days" />
        <Tile label="Content" value={num(k.lessonsTotal)} note={`lessons prepared · ${num(k.quizzes30)} quizzes run in 30 days`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Chart title="New teachers" sub="Sign-ups per week, last 12 weeks" rows={s.weekly.map((w) => ({ label: day(w.start), value: w.signups }))} />
        <Chart title="Revenue" sub="Per month, last 12 months" rows={s.monthly.map((m) => ({ label: monthLabel(m.month), value: m.revenue, note: `${m.payments} payment${m.payments === 1 ? "" : "s"}` }))} money />
        <Chart title="Classes" sub="Classes started per week" rows={s.weekly.map((w) => ({ label: day(w.start), value: w.classes }))} />
        <Chart title="Students" sub="Students who joined a class, per week" rows={s.weekly.map((w) => ({ label: day(w.start), value: w.students }))} />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card title="From sign-up to paying" className="lg:col-span-2">
          <Funnel steps={[["Signed up", s.funnel.signedUp], ["Confirmed email", s.funnel.verified], ["Taught a class", s.funnel.ranClass], ["Paid", s.funnel.paid]]} />
        </Card>
        <Card title="Plans ending soon" className="lg:col-span-3" action={<Link href="/admin/board" className="text-sm font-bold text-dmb-board hover:underline">All teachers →</Link>}>
          {s.endingSoon.length ? (
            <ul className="divide-y divide-dmb-rule">
              {s.endingSoon.slice(0, 8).map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold text-dmb-ink">{t.name}</p><p className="truncate text-xs text-dmb-muted">{t.email}</p></div>
                  <Badge state={t.state} />
                  <span className="w-28 text-right text-sm font-semibold text-dmb-ink">{t.daysLeft <= 0 ? "ends today" : `${t.daysLeft} day${t.daysLeft === 1 ? "" : "s"} left`}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-dmb-muted">No trials or plans end in the next week.</p>}
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card title="Most active teachers · 30 days" className="lg:col-span-3">
          {s.topTeachers.length ? (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs font-bold uppercase tracking-wider text-dmb-muted">
                  <tr><th className="px-1 pb-2">Teacher</th><th className="px-1 pb-2 text-right">Classes</th><th className="px-1 pb-2 text-right">Students</th><th className="px-1 pb-2">Last class</th><th className="px-1 pb-2">Plan</th></tr>
                </thead>
                <tbody className="divide-y divide-dmb-rule">
                  {s.topTeachers.map((t) => (
                    <tr key={t.id}>
                      <td className="px-1 py-2"><p className="font-semibold text-dmb-ink">{t.name}</p><p className="text-xs text-dmb-muted">{t.school || t.email}</p></td>
                      <td className="px-1 py-2 text-right font-semibold tabular-nums text-dmb-ink">{t.classes30}</td>
                      <td className="px-1 py-2 text-right tabular-nums text-dmb-ink">{t.students30}</td>
                      <td className="px-1 py-2 text-dmb-muted">{day(t.lastClass)}</td>
                      <td className="px-1 py-2"><Badge state={t.state} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-dmb-muted">No classes in the last 30 days yet.</p>}
        </Card>
        <Card title="Recent activity" className="lg:col-span-2">
          {s.recent.length ? (
            <ul className="space-y-2.5">
              {s.recent.slice(0, 12).map((e, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.kind === "payment" ? "bg-emerald-600" : e.kind === "signup" ? "bg-dmb-pen" : "bg-dmb-board"}`} />
                  <p className="min-w-0 flex-1 text-dmb-ink">
                    <span className="sr-only">{e.kind === "payment" ? "Payment: " : e.kind === "signup" ? "Sign-up: " : "Class: "}</span>{e.text}
                    <span className="block text-xs text-dmb-muted">{when(e.at)}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-dmb-muted">Nothing yet.</p>}
        </Card>
      </section>
      {err && <p role="alert" className="text-sm font-semibold text-red-700">{err}</p>}
    </div>
  );
}

function Tile({ label, value, note, live = false }: { label: string; value: string; note: string; live?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white p-3 ring-1 ring-dmb-rule sm:p-4">
      <p className="flex items-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-dmb-muted">
        {live && <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-red-500" />}{label}
      </p>
      <p className="mt-1 truncate font-dmbDisplay text-2xl font-semibold tabular-nums text-dmb-ink sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-dmb-muted">{note}</p>
    </div>
  );
}

function Card({ title, children, className = "", action }: { title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={`min-w-0 rounded-2xl bg-white p-4 ring-1 ring-dmb-rule sm:p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-dmbDisplay text-lg font-semibold text-dmb-ink">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

function Badge({ state }: { state: BoardState }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${STATE[state].tone}`}>{STATE[state].label}</span>;
}

// One measure as columns. Every bar has a hover label (and a bigger invisible
// hit area); the latest and the highest values are written on the chart; a
// table copy is there for screen readers.
function Chart({ title, sub, rows, money = false }: { title: string; sub: string; rows: { label: string; value: number; note?: string }[]; money?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const fmt = (v: number) => (money ? naira(v) : num(v));
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((n, r) => n + r.value, 0);
  const peak = rows.reduce((b, r, i) => (r.value > rows[b].value ? i : b), 0);
  const W = 560, H = 200, top = 26, base = H - 30, gap = 2, bw = W / rows.length;
  const shown = hover ?? rows.length - 1;
  return (
    <Card title={title}>
      <p className="-mt-2 mb-2 text-xs text-dmb-muted">{sub} · total {fmt(total)}</p>
      <p className="mb-1 h-5 text-sm text-dmb-ink" aria-live="polite">
        <b className="tabular-nums">{fmt(rows[shown]?.value ?? 0)}</b> <span className="text-dmb-muted">{hover === null ? "latest" : ""} {rows[shown]?.label}{rows[shown]?.note ? ` · ${rows[shown].note}` : ""}</span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}: ${sub}. Highest ${fmt(rows[peak]?.value ?? 0)} (${rows[peak]?.label}); latest ${fmt(rows[rows.length - 1]?.value ?? 0)}.`} onMouseLeave={() => setHover(null)}>
        <line x1="0" x2={W} y1={base} y2={base} stroke="#DDE7E7" strokeWidth="1" />
        {rows.map((r, i) => {
          const h = r.value ? Math.max(3, ((base - top) * r.value) / max) : 0;
          const x = i * bw + gap, w = bw - gap * 2, y = base - h;
          const on = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${r.label}: ${fmt(r.value)}`}>
              <rect x={i * bw} y={top - 10} width={bw} height={base - top + 34} fill="transparent" />
              {h > 0 && <path d={`M${x},${base} V${y + 4} q0,-4 4,-4 h${w - 8} q4,0 4,4 V${base} Z`} fill={on ? "#0A4F52" : "#0E6E72"} opacity={hover === null || on ? 1 : 0.55} />}
              {(i === peak || i === rows.length - 1) && r.value > 0 && hover === null && (
                <text x={x + w / 2} y={y - 6} textAnchor="middle" fontSize="15" fontWeight="700" fill="#0F2326">{money ? `₦${Math.round(r.value / 1000)}k` : r.value}</text>
              )}
              {(rows.length - 1 - i) % 3 === 0 && <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize="15" fill="#556B6E">{r.label}</text>}
              <title>{`${r.label}: ${fmt(r.value)}${r.note ? ` · ${r.note}` : ""}`}</title>
            </g>
          );
        })}
      </svg>
      <table className="sr-only"><caption>{title}</caption><thead><tr><th>Period</th><th>Value</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}><td>{r.label}</td><td>{fmt(r.value)}</td></tr>)}</tbody></table>
    </Card>
  );
}

function Funnel({ steps }: { steps: [string, number][] }) {
  const first = Math.max(1, steps[0][1]);
  return (
    <ol className="space-y-3">
      {steps.map(([label, n], i) => (
        <li key={label}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-dmb-ink">{label}</span>
            <span className="tabular-nums text-dmb-ink"><b>{num(n)}</b> <span className="text-xs text-dmb-muted">{i ? `${Math.round((100 * n) / first)}%` : ""}</span></span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-dmb-mint" aria-hidden>
            <div className="h-full rounded-full bg-dmb-board" style={{ width: `${(100 * n) / first}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
