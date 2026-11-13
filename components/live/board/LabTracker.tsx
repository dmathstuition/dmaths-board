"use client";
// The teacher's view of a practical the learners are trying on their own
// devices: a card for each learner — which step they're on, their readings and
// observations, and whether they're stuck. Stuck learners come first. Open a
// card to see everything they've written and send them a word of help.
// (lib/lab/labTrack.ts)
import { useEffect, useState } from "react";
import type { Nudge } from "@/lib/lab/demo";
import { STUCK_MISSES, STUCK_SECONDS, sortEntries, statusOf, summary, type LabEntry, type LabStatus } from "@/lib/lab/labTrack";

const LOOK: Record<LabStatus, { ring: string; badge: string; label: string }> = {
  stuck: { ring: "ring-2 ring-[#F87171]", badge: "bg-[#FEE2E2] text-[#991B1B]", label: "Stuck" },
  working: { ring: "ring-1 ring-white/15", badge: "bg-[#E0F2FE] text-[#075985]", label: "Working" },
  done: { ring: "ring-1 ring-[#4ADE80]/60", badge: "bg-[#DCFCE7] text-[#166534]", label: "Finished" },
  away: { ring: "ring-1 ring-white/10 opacity-60", badge: "bg-white/15 text-white/80", label: "Away" },
};

export function useNow(ms = 5000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export default function LabTracker({ entries, quiet, onClose, onHelp, sent = {}, quick = [], licensed }: {
  entries: LabEntry[]; quiet: number; onClose: () => void;
  onHelp?: (to: string, text: string) => void; sent?: Record<string, Nudge>; quick?: string[];
  licensed?: Record<string, { name: string; score: number; of: number }>; // the safety licence, when it's needed
}) {
  const now = useNow();
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const list = sortEntries(entries, now, quiet), sum = summary(entries, now, quiet);
  return (
    <div role="region" aria-label="Learners' progress" className="absolute inset-0 z-20 flex flex-col bg-[#060B16] text-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <p className="text-sm font-black">👥 Learners&apos; progress</p>
        <p className="text-xs font-bold text-white/60">
          {sum.total ? <>{sum.total} trying · <span className={sum.stuck ? "text-[#FCA5A5]" : ""}>{sum.stuck} stuck</span> · {sum.done} finished{sum.away ? ` · ${sum.away} away` : ""}</> : "Waiting for learners to open it…"}
        </p>
        {licensed && <p className="text-xs font-bold text-emerald-300" title={Object.values(licensed).map((l) => `${l.name} · ${l.score}/${l.of}`).join("\n")}>🪪 {Object.keys(licensed).length} with a safety licence</p>}
        <button type="button" onClick={onClose} className="ml-auto min-h-[40px] rounded-xl bg-white px-3 text-xs font-black text-[#0B1220]">Back to the experiment</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {!list.length ? (
          <p className="mx-auto mt-10 max-w-md text-center text-sm text-white/60">When learners open the practical on their phones, each one appears here with the step they&apos;re on, their readings, and a warning if they get stuck.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((e) => {
              const st = statusOf(e, now, quiet), look = LOOK[st.status], pct = Math.round((e.step / e.total) * 100), more = open === e.by;
              const last = e.readings.slice(-3), obs = e.obs ?? [], unclear = obs.filter((o) => !o.ok).length;
              return (
                <li key={e.by} className={`rounded-2xl bg-white/5 p-3 ${look.ring}`}>
                  <button type="button" onClick={() => setOpen(more ? null : e.by)} aria-expanded={more} className="block w-full text-left">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-black">{e.name}{licensed?.[e.by] && <span className="ml-1" title={`Safety licence · ${licensed[e.by].score}/${licensed[e.by].of}`} aria-label="has a safety licence">🪪</span>}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ${look.badge}`}>{look.label}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${st.status === "done" ? "bg-[#4ADE80]" : st.status === "stuck" ? "bg-[#F87171]" : "bg-[#38BDF8]"}`} style={{ width: `${pct}%` }} /></div>
                      <span className="text-[11px] font-black tabular-nums text-white/60">{Math.min(e.step, e.total)}/{e.total}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-white/85">{e.done ? "✓ All steps done" : <>Step {e.step + 1}: <b>{e.title}</b></>}</p>
                    <p className={`mt-0.5 text-[11px] font-bold ${st.status === "stuck" ? "text-[#FCA5A5]" : "text-white/50"}`}>{st.why}{e.shown ? ` · ${e.shown} answer${e.shown === 1 ? "" : "s"} shown` : ""}</p>
                    {obs.length > 0 && <p className="mt-0.5 text-[11px] font-bold text-white/70">📝 {obs.length} observation{obs.length === 1 ? "" : "s"}{unclear ? <span className="text-[#FCD34D]"> · {unclear} to improve</span> : ""}</p>}
                    {last.length > 0 && !more && (
                      <ul className="mt-2 space-y-0.5 border-t border-white/10 pt-1.5 text-[11px]">
                        {last.map((r, i) => <li key={i} className="flex gap-2"><span className="min-w-0 flex-1 truncate text-white/55">{r.l}</span><span className={`shrink-0 font-mono font-bold ${r.s ? "text-[#FCD34D]" : "text-white"}`}>{r.v}</span></li>)}
                      </ul>
                    )}
                  </button>
                  {more && (
                    <div className="mt-2 border-t border-white/10 pt-2">
                      <p className="text-[11px] font-black uppercase tracking-wide text-white/50">All readings</p>
                      {e.readings.length ? (
                        <ul className="mt-1 space-y-0.5 text-[11px]">
                          {e.readings.map((r, i) => <li key={i} className="flex gap-2"><span className="min-w-0 flex-1 text-white/60">{r.l}</span><span className={`shrink-0 font-mono font-bold ${r.s ? "text-[#FCD34D]" : "text-white"}`}>{r.v}{r.s ? " (shown)" : ""}</span></li>)}
                        </ul>
                      ) : <p className="mt-1 text-[11px] text-white/50">No readings yet.</p>}
                      <p className="mt-2 text-[11px] font-black uppercase tracking-wide text-white/50">Observations</p>
                      {obs.length ? (
                        <ul className="mt-1 space-y-1 text-[11px]">{obs.map((o, i) => <li key={i} className={o.ok ? "text-white/85" : "text-[#FCD34D]"}>{o.ok ? "✓ " : "💡 "}{o.t}</li>)}</ul>
                      ) : <p className="mt-1 text-[11px] text-white/50">None written yet.</p>}
                      {onHelp && (
                        <div className="mt-2 border-t border-white/10 pt-2">
                          <p className="text-[11px] font-black uppercase tracking-wide text-white/50">Send {e.name.split(" ")[0]} help</p>
                          <div className="mt-1 flex flex-wrap gap-1">{quick.map((q) => <button key={q} type="button" onClick={() => onHelp(e.by, q)} className="rounded-lg bg-white/10 px-2 py-1 text-left text-[11px] font-bold hover:bg-white/20">{q}</button>)}</div>
                          <form onSubmit={(ev) => { ev.preventDefault(); const t = (draft[e.by] ?? "").trim(); if (t) { onHelp(e.by, t); setDraft({ ...draft, [e.by]: "" }); } }} className="mt-1.5 flex gap-1">
                            <input value={draft[e.by] ?? ""} onChange={(ev) => setDraft({ ...draft, [e.by]: ev.target.value })} maxLength={300} aria-label={`Message to ${e.name}`} placeholder="Or write your own…"
                              className="h-9 min-w-0 flex-1 rounded-lg bg-white/10 px-2 text-xs text-white placeholder:text-white/35" />
                            <button type="submit" className="min-h-[36px] rounded-lg bg-[#38BDF8] px-2.5 text-xs font-black text-[#0B1220]">Send</button>
                          </form>
                          {sent[e.by] && <p className="mt-1 text-[11px] text-white/50">Sent: “{sent[e.by].text}”</p>}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="border-t border-white/10 px-3 py-1.5 text-[11px] text-white/45">Stuck: {STUCK_MISSES} wrong tries on a step, or {STUCK_SECONDS / 60} minutes on it. Readings in yellow were shown to them.</p>
    </div>
  );
}
