"use client";
import { useCallback, useEffect, useState } from "react";
import ResultsBreakdown from "@/components/live/ResultsBreakdown";
import type { LearnerDetail } from "@/lib/learnerResults";

// "My results" for a learner: their own marks, feedback and quiz answers from
// this class, with a link to keep (their report page).
export default function MyResults({ sessionId, ended }: { sessionId: string; ended: boolean }) {
  const [d, setD] = useState<LearnerDetail | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch(`/api/live-sessions/my-results?id=${encodeURIComponent(sessionId)}`, { cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) { setD(j.detail); setLink(j.link); setErr(null); } else setErr(j.error ?? "Couldn't load your results — check the internet.");
  }, [sessionId]);
  useEffect(() => { load(); }, [load]);

  const full = link && typeof window !== "undefined" ? new URL(link, window.location.origin).toString() : "";
  return (
    <section aria-label="My results" className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#1657C9]">{ended ? "Class finished" : "So far"}</p>
          <h2 className="font-display text-2xl font-black text-ink">My results</h2>
        </div>
        <button type="button" onClick={load} className="min-h-[40px] rounded-xl bg-ink/5 px-3 text-xs font-black text-ink/70 hover:bg-ink/10">Refresh</button>
      </div>
      {err && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{err}</p>}
      {!d && !err && <div className="mt-3 h-40 animate-pulse rounded-xl bg-slate-100" />}
      {d && <div className="mt-3"><ResultsBreakdown d={d} /></div>}
      {d && full && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="min-w-0 flex-1 text-xs font-bold text-ink/65">Keep your results: this link opens them any time — share it with a parent too.</p>
          <a href={full} target="_blank" rel="noreferrer" className="min-h-[40px] rounded-xl bg-[#1657C9] px-3 py-2.5 text-xs font-black text-white">Open my report</a>
          <button type="button" onClick={() => navigator.clipboard?.writeText(full).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {})}
            className="min-h-[40px] rounded-xl bg-white px-3 text-xs font-black text-ink/75 ring-1 ring-slate-200">{copied ? "Copied ✓" : "Copy link"}</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`My class results: ${full}`)}`} target="_blank" rel="noreferrer" className="min-h-[40px] rounded-xl bg-[#25D366] px-3 py-2.5 text-xs font-black text-white">WhatsApp</a>
        </div>
      )}
    </section>
  );
}
