"use client";
import type { HostBase } from "@/lib/liveSession";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCode } from "@/lib/liveSession";

type Row = { id: string; code: string; title: string; status: "live" | "ended"; subject: string | null; createdAt: string; mine: boolean };
type ClassOpt = { id: string; label: string };

const when = (iso: string) => {
  const d = new Date(iso);
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()];
  return `${d.getUTCDate()} ${m}`;
};

// Tutor/admin home for interactive classes: start one (optionally for a
// class, which notifies its learners), reopen live ones, see past boards.
export default function LiveHub({ base, classes }: { base: HostBase; classes: ClassOpt[] }) {
  const router = useRouter();
  const board = base === "/app";
  const params = useSearchParams();
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState(params.get("classId") ?? "");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [delErr, setDelErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(board ? "/api/live-sessions?board=1" : "/api/live-sessions").then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErr(j.error ?? null);
      setRows(j.sessions ?? []);
    }).catch(() => setRows([]));
  }, [board]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await fetch("/api/live-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", title, classId: board ? null : classId || null, notify, board }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setBusy(false); setErr(j.error ?? "Couldn't start the class."); return; }
    router.push(`${base}/live/${j.session.id}`);
  }

  async function remove(r: Row) {
    if (!confirm(`Delete "${r.title}"? Its saved board, quizzes and attendance list will be removed for good.`)) return;
    setDeleting(r.id); setDelErr(null);
    const res = await fetch("/api/live-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id: r.id }) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setDeleting(null);
    if (!res?.ok) { setDelErr(j.error ?? "Couldn't delete that class — try again."); return; }
    setRows((rs) => (rs ?? []).filter((x) => x.id !== r.id));
  }

  const [reopening, setReopening] = useState<string | null>(null);
  // Carry on with a past class (e.g. one left running and closed without "End class").
  async function reopen(r: Row) {
    setReopening(r.id); setDelErr(null);
    const res = await fetch("/api/live-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reopen", id: r.id }) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { setReopening(null); setDelErr(j.error ?? "Couldn't continue that class — try again."); return; }
    router.push(`${base}/live/${r.id}`);
  }

  const live = (rows ?? []).filter((r) => r.status === "live");
  const past = (rows ?? []).filter((r) => r.status === "ended");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <form onSubmit={start} className="card space-y-4 p-5 sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#1657C9]">Start an interactive class</p>
            <p className="mt-1 text-sm text-ink/60">{board ? "You get a board and live quizzes here. Share your screen in your usual call (or project it in class), then give students the PIN — they join on their phones with just their name." : "You get a board and live quizzes here. Share your screen in your usual call, then send learners the PIN or link — they join from their portal."}</p>
          </div>
          <label className="block text-sm font-bold text-ink/80">Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. SS2 Maths — Quadratic equations" className="field mt-1" maxLength={80} />
          </label>
          {!board && <label className="block text-sm font-bold text-ink/80">Class (optional)
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="field mt-1">
              <option value="">No class — anyone with the PIN</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>}
          {classId && (
            <label className="flex items-center gap-2 text-sm text-ink/75">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-[#1657C9]" />
              Notify the class with the PIN and link
            </label>
          )}
          {err && <p className="text-sm font-semibold text-red-600" role="alert">{err}</p>}
          <button type="submit" disabled={busy} className="btn-gold w-full !min-h-[52px] text-base">{busy ? "Starting…" : "▶ Start interactive class"}</button>
          <p className="text-center text-xs text-ink/55">Before class: <Link href="/check" className="font-bold text-[#1657C9] underline">check my class</Link> — tests the live board, PDFs and uploads on this device.</p>
        </form>

        <div className="quiz-stage rounded-[1.75rem] p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[.18em] text-white/70">Live quiz library</p>
          <p className="mt-2 font-display text-2xl font-black">Prepare quizzes before class</p>
          <p className="mt-2 text-sm text-white/80">Build Kahoot-style quizzes ahead of time — type them, pull from the question bank or let the A.I draft them. During class, launch one in a click.</p>
          <Link href={`${base}/quizzes`} className="mt-5 inline-flex min-h-[48px] items-center rounded-2xl bg-white px-5 font-black text-violet-800">Open quiz library →</Link>
        </div>
      </div>

      {live.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-lg font-black text-ink">Running now</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {live.map((r) => (
              <li key={r.id} className="card flex items-center gap-3 p-4">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{r.title}</p>
                  <p className="text-xs text-ink/55">PIN {formatCode(r.code)}{r.subject ? ` · ${r.subject}` : ""}{r.mine ? "" : " · another host"}</p>
                </div>
                <Link href={`${base}/live/${r.id}`} className="btn-gold !min-h-[44px]">Open</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-display text-lg font-black text-ink">Past classes</h2>
        {delErr && <p className="mb-2 text-sm font-semibold text-red-600" role="alert">{delErr}</p>}
        {rows === null ? <div className="card h-24 animate-pulse" /> : past.length ? (
          <ul className="card divide-y divide-line">
            {past.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{r.title}</p>
                  <p className="text-xs text-ink/55">{when(r.createdAt)}{r.subject ? ` · ${r.subject}` : ""}</p>
                </div>
                <Link href={`${base}/live/${r.id}`} className="text-sm font-bold text-[#1657C9] hover:underline">View board</Link>
                {r.mine && (
                  <button type="button" onClick={() => reopen(r)} disabled={reopening === r.id} aria-label={`Continue ${r.title}`}
                    className="min-h-[36px] rounded-lg px-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">{reopening === r.id ? "Opening…" : "Continue class"}</button>
                )}
                {(r.mine || base === "/admin") && (
                  <button type="button" onClick={() => remove(r)} disabled={deleting === r.id} aria-label={`Delete ${r.title}`}
                    className="min-h-[36px] rounded-lg px-3 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">{deleting === r.id ? "Deleting…" : "Delete"}</button>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink/55">No past interactive classes yet.</p>}
      </section>
    </div>
  );
}
