"use client";
import { useCallback, useEffect, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { BoardIcon } from "@/components/live/board/BoardIcons";
import { BADGES, cleanShown, shownBoard, type Shown, type Standing } from "@/lib/stars";

// The class leaderboard: stars and badges from quizzes, class work, exams and
// games, for this class or across all the teacher's classes (lib/stars.ts).
// The teacher can put it on everyone's screen.
// Message: "lb-show" (teacher → all, signed): { shown } or { shown: null }, re-sent while showing.
const MEDAL = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ sessionId, host, myName, open, onClose }: { sessionId: string; host: boolean; myName: string; open: boolean; onClose: () => void }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const [hidden, setHidden] = useState(false);
  const send = useLive({ "lb-show": (p) => { if (host || !p?.host) return; const s = cleanShown(p.shown); setShown((cur) => { if (s && JSON.stringify(s) !== JSON.stringify(cur)) setHidden(false); return s; }); } });

  // Teacher
  const [scope, setScope] = useState<"class" | "all">("all");
  const [list, setList] = useState<Standing[] | null>(null);
  const [classes, setClasses] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch(`/api/board/stars?sessionId=${encodeURIComponent(sessionId)}&scope=${scope}`, { cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) { setList(j.list); setClasses(j.classes ?? 0); } else setErr(j.error ?? "Couldn't load the leaderboard — check the internet.");
  }, [sessionId, scope]);
  useEffect(() => { if (host && open) load(); }, [host, open, load]);
  useEffect(() => {
    if (!host || !shown) return;
    send("lb-show", { host: true, shown });
    const t = setInterval(() => send("lb-show", { host: true, shown }), 5000);
    return () => clearInterval(t);
  }, [host, shown, send]);
  const stop = () => { setShown(null); send("lb-show", { host: true, shown: null }); };

  if (!host) {
    if (!shown || hidden) return null;
    return (
      <div role="dialog" aria-label={shown.title} className="fixed inset-x-0 bottom-0 z-[97] mx-auto max-w-md p-3">
        <div className="rounded-2xl bg-[#1E1B4B] p-4 text-white shadow-2xl ring-1 ring-white/10">
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-black">🏆 {shown.title}</p>
            <button type="button" onClick={() => setHidden(true)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-black">Close</button>
          </div>
          <Rows rows={shown.rows} me={myName} />
        </div>
      </div>
    );
  }
  if (!open) return null;
  const toShow = list ? shownBoard(list, scope) : null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Leaderboard" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-3">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[#1E1B4B] text-white shadow-2xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"><BoardIcon name="trophy" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black">Leaderboard</p>
            <p className="text-xs font-bold text-white/60">{scope === "all" ? `Across your last ${classes} class${classes === 1 ? "" : "es"} — learners matched by name` : "Stars earned in this class"}</p>
          </div>
          <div role="tablist" className="flex gap-1 rounded-xl bg-white/10 p-1">
            {([["class", "This class"], ["all", "All my classes"]] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={scope === k} onClick={() => setScope(k)} className={`min-h-[36px] rounded-lg px-3 text-xs font-black ${scope === k ? "bg-white text-[#1E1B4B]" : "text-white/75"}`}>{l}</button>
            ))}
          </div>
          <button type="button" onClick={onClose} aria-label="Close the leaderboard" className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10"><BoardIcon name="close" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {err && <p role="alert" className="rounded-lg bg-red-500/20 px-3 py-2 text-sm font-bold">{err}</p>}
          {!list && !err && <div className="h-40 animate-pulse rounded-xl bg-white/5" />}
          {list && !list.length && <p className="p-6 text-center text-sm font-bold text-white/60">No stars yet — they come from quizzes, class work, exams and games.</p>}
          {list && list.length > 0 && (
            <ol className="grid gap-1.5">
              {(scope === "class" ? [...list].filter((p) => p.classStars > 0).sort((a, b) => b.classStars - a.classStars) : list).map((p, i) => (
                <li key={p.key} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
                  <span className="w-7 text-center text-lg font-black">{MEDAL[i] ?? i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-black">{p.name}</span>
                    <span className="block text-[11px] font-bold text-white/55" title="Where the stars came from">
                      {[["coming", p.parts.attend], ["quiz", p.parts.quiz], ["class work", p.parts.work], ["exams", p.parts.exams], ["games", p.parts.games]].filter(([, n]) => Number(n) > 0).map(([l, n]) => `${l} ⭐${n}`).join(" · ") || "—"}
                      {scope === "all" && ` · in ${p.classes} class${p.classes === 1 ? "" : "es"}`}
                    </span>
                  </span>
                  <span className="flex gap-0.5" aria-label={p.badges.map((b) => b.label).join(", ") || "No badges yet"}>{p.badges.map((b) => <span key={b.id} title={b.label}>{b.icon}</span>)}</span>
                  <span className="min-w-[4rem] text-right text-lg font-black text-amber-300">⭐ {scope === "class" ? p.classStars : p.stars}</span>
                </li>
              ))}
            </ol>
          )}
          <details className="mt-3 text-xs text-white/65">
            <summary className="cursor-pointer font-black text-white/80">How stars and badges are earned</summary>
            <p className="mt-1">⭐ 1 for coming to a class · 1 for each quiz question right · 1 for each class-work mark · up to 5 for an exam (1 per 20%) · up to 3 for a game round (1 per 5 right).</p>
            <p className="mt-1">{Object.values(BADGES).map((b) => `${b.icon} ${b.label}`).join(" · ")}</p>
          </details>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-white/10 p-3">
          {shown
            ? <button type="button" onClick={stop} className="min-h-[44px] rounded-xl bg-white/15 px-4 text-sm font-black">Stop showing</button>
            : <button type="button" disabled={!toShow?.rows.length} onClick={() => toShow && setShown(toShow)} className="min-h-[44px] rounded-xl bg-amber-400 px-4 text-sm font-black text-[#1E1B4B] disabled:opacity-40">Show on everyone’s screen</button>}
          <button type="button" onClick={load} className="min-h-[44px] rounded-xl bg-white/10 px-4 text-sm font-black">Refresh</button>
        </div>
      </div>
    </div>
  );
}

function Rows({ rows, me }: { rows: Shown["rows"]; me: string }) {
  return (
    <ol className="mt-2 grid gap-1">
      {rows.map((r, i) => {
        const mine = r.name.trim().toLowerCase() === me.trim().toLowerCase();
        return (
          <li key={i} className={`flex items-center gap-2 rounded-xl px-3 py-1.5 ${mine ? "bg-amber-400 text-[#1E1B4B]" : "bg-white/5"}`}>
            <span className="w-6 text-center font-black">{MEDAL[i] ?? i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-black">{r.name}{mine ? " (you)" : ""}</span>
            <span>{r.badges.join("")}</span>
            <span className="font-black">⭐ {r.stars}</span>
          </li>
        );
      })}
    </ol>
  );
}
