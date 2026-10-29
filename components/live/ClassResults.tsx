"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { classResults, resultsCsv, type MarkRow, type QuizAnswerRow, type QuizInfo } from "@/lib/classResults";

type Person = { id: string; name: string };

// The teacher's class results: each learner's class-work marks (answer boards)
// plus their live-quiz score, with a total. Download as a spreadsheet, and
// delete once the class is over.
export default function ClassResults({ sessionId, people, ended }: { sessionId: string; people: Person[]; ended: boolean }) {
  const [data, setData] = useState<{ ready: boolean; marks: MarkRow[]; quizzes: QuizInfo[]; answers: QuizAnswerRow[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/live-sessions/results?id=${sessionId}`, { cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) { setErr(j.error ?? "Couldn't load the results — check the internet."); return; }
    setErr(null); setData(j);
  }, [sessionId]);
  useEffect(() => {
    load();
    if (ended) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 10_000);
    return () => clearInterval(t);
  }, [load, ended]);

  const rows = useMemo(() => (data ? classResults(people, data.marks, data.quizzes, data.answers) : []), [data, people]);
  const hasAny = !!data && (data.marks.length > 0 || data.quizzes.length > 0);

  function download() {
    const blob = new Blob(["﻿" + resultsCsv(rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `class-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function remove() {
    if (!confirm("Delete this class's results — every class-work mark and live-quiz score? This can't be undone. (Download them first if you want a copy.)")) return;
    setDeleting(true);
    const r = await fetch(`/api/live-sessions/results?id=${sessionId}`, { method: "DELETE" }).catch(() => null);
    setDeleting(false);
    if (!r?.ok) { setErr("Couldn't delete the results — try again."); return; }
    setDeleted(true); load();
  }

  const workMax = rows[0]?.workMax ?? 0, quizAsked = rows[0]?.quizAsked ?? 0;
  return (
    <section className="card p-5 sm:p-6" aria-label="Class results">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">Class results</p>
          <h2 className="mt-1 font-display text-2xl font-black text-ink">{ended ? "How everyone did" : "Scores so far"}</h2>
          <p className="mt-1 text-sm text-ink/60">
            Class work (marks you gave on answer boards{workMax ? ` — ${workMax} in all` : ""}) plus the live quiz (1 mark per question{quizAsked ? ` — ${quizAsked} asked` : ""}).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} className="btn-ghost !min-h-[44px]">Refresh</button>
          <button type="button" onClick={download} disabled={!rows.length || !hasAny} className="btn-ghost !min-h-[44px] disabled:opacity-40">Download (Excel)</button>
          <button type="button" onClick={remove} disabled={deleting || !hasAny}
            className="min-h-[44px] rounded-xl bg-red-50 px-4 text-sm font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-40">{deleting ? "Deleting…" : "Delete results"}</button>
        </div>
      </div>
      {data && !data.ready && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">Class-work marks can&apos;t be kept yet — run <code>supabase/migration-class-marks.sql</code> in Supabase. Live-quiz scores still show below.</p>
      )}
      {err && <p className="mt-4 text-sm font-semibold text-red-600" role="alert">{err}</p>}
      {deleted && !hasAny && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">Results deleted.</p>}
      {!data && !err && <div className="mt-4 h-32 animate-pulse rounded-2xl bg-ink/5" />}
      {data && !hasAny && !deleted && (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-ink/60">No scores yet. Mark answers on the answer boards (✓ / ✗ or a mark), or run a live quiz, and they&apos;ll add up here.</p>
      )}
      {hasAny && rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wider text-ink/45">
                <th className="pb-2 pr-3">#</th>
                <th className="pb-2 pr-3">Learner</th>
                <th className="pb-2 pr-3">Class work</th>
                <th className="pb-2 pr-3">Quiz</th>
                <th className="pb-2 pr-3">Quiz points</th>
                <th className="pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b border-line/60">
                  <td className="py-2.5 pr-3 font-black text-ink/40">{i + 1}</td>
                  <td className="py-2.5 pr-3 font-bold text-ink">{r.name}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.workMax ? `${r.work} / ${r.workMax}` : "—"}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{r.quizAsked ? `${r.quizCorrect} / ${r.quizAsked}` : "—"}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-ink/60">{r.quizAsked ? r.quizPoints.toLocaleString("en-NG") : "—"}</td>
                  <td className="py-2.5 tabular-nums">
                    <span className="font-black text-ink">{r.total} / {r.totalMax}</span>
                    {r.percent != null && <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-black ${r.percent >= 70 ? "bg-emerald-100 text-emerald-800" : r.percent >= 40 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>{r.percent}%</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
