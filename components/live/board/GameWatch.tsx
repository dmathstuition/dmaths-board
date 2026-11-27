"use client";
// For the teacher while a game is out on the phones (lib/games/watch.ts):
//   • Live — everyone's score, accuracy, streak and time left, ranked; tap 👁 Watch
//   • Watching one learner — their game as it happens: the clock, score, the question on
//     their screen, and every answer as it lands — plus their earlier rounds
//   • Scores — every learner's saved rounds in this class
import { useMemo, useState } from "react";
import { findGame } from "@/lib/games/catalog";
import { findUKSet } from "@/lib/ukPrimary";
import { PHASE_LABEL, accuracy, isStale, rankLive, summarise, type Live, type RoundRow } from "@/lib/games/watch";

type P = { id: string; name: string };
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" }) : "—");
const titleOf = (id: string) => findGame(id)?.title ?? findUKSet(id)?.title ?? id;

export default function GameWatch({ live, people, watching, onWatch, rounds, roundsErr, onRefresh, onClose }: {
  live: Record<string, Live>; people: P[]; watching: string | null; onWatch: (id: string | null) => void;
  rounds: RoundRow[] | null; roundsErr: string | null; onRefresh: () => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<"live" | "scores">("live");
  const [who, setWho] = useState<string | null>(null); // a learner opened on Scores
  const now = Date.now();
  const ranked = useMemo(() => rankLive(Object.values(live)), [live]);
  const playing = ranked.filter((l) => l.phase !== "over" && !isStale(l, now)).length;
  const summary = useMemo(() => summarise(rounds ?? []), [rounds]);
  const watched = watching ? live[watching] : null;
  const watchedName = watching ? people.find((p) => p.id === watching)?.name ?? live[watching]?.name ?? "Learner" : "";
  const chip = (on: boolean) => `min-h-[36px] rounded-full px-3 text-xs font-black ${on ? "bg-white text-[#0A3B3E]" : "bg-white/10 text-white/80"}`;

  return (
    <aside aria-label="Learners playing" className="fixed right-2 top-14 z-[97] flex max-h-[calc(100%-4rem)] w-[min(26rem,calc(100%-1rem))] flex-col overflow-hidden rounded-2xl bg-[#0F2A2D] text-white shadow-2xl ring-1 ring-white/15">
      <div className="flex items-center gap-1.5 border-b border-white/10 p-2">
        <p className="mr-auto pl-1 text-sm font-black">👀 Learners playing <span className="text-white/50">· {playing}</span></p>
        <button type="button" role="tab" aria-selected={tab === "live"} onClick={() => setTab("live")} className={chip(tab === "live")}>Live</button>
        <button type="button" role="tab" aria-selected={tab === "scores"} onClick={() => { setTab("scores"); onRefresh(); }} className={chip(tab === "scores")}>Scores</button>
        <button type="button" onClick={onClose} aria-label="Close the learners panel" className="h-8 w-8 rounded-lg text-white/60 hover:bg-white/10">✕</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {tab === "live" && !watching && (
          ranked.length === 0 ? (
            <p className="p-4 text-center text-sm font-semibold text-white/60">Nobody is playing yet. Tick <b>Let learners play</b> and their scores appear here as they start.</p>
          ) : (
            <table className="w-full text-left text-xs" aria-label="Live scores">
              <thead><tr className="text-[10px] uppercase tracking-wider text-white/45"><th className="py-1 pr-1">#</th><th className="pr-1">Learner</th><th className="pr-1">Score</th><th className="pr-1">Right</th><th className="pr-1">⏱</th><th /></tr></thead>
              <tbody>
                {ranked.map((l, i) => {
                  const stale = isStale(l, now), acc = accuracy(l);
                  return (
                    <tr key={l.by} className="border-t border-white/10">
                      <td className="py-1.5 pr-1 font-black text-white/45">{i + 1}</td>
                      <td className="pr-1"><span className="block max-w-[7rem] truncate text-sm font-black">{l.name}</span><span className="block text-[10px] font-bold text-white/50">{stale ? "away" : PHASE_LABEL[l.phase]}{l.streak >= 3 ? ` · 🔥${l.streak}` : ""}</span></td>
                      <td className="pr-1 text-sm font-black tabular-nums text-amber-300">{l.score}</td>
                      <td className="pr-1 tabular-nums text-white/75">{l.attempts ? `${l.correct}/${l.attempts}${acc != null ? ` · ${acc}%` : ""}` : "—"}</td>
                      <td className="pr-1 tabular-nums text-white/60">{l.phase === "playing" ? `${l.left}s` : ""}</td>
                      <td className="text-right"><button type="button" onClick={() => onWatch(l.by)} aria-label={`Watch ${l.name} play`} className="min-h-[32px] rounded-lg bg-amber-400 px-2 text-xs font-black text-[#0A3B3E]">👁 Watch</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}

        {tab === "live" && watching && (
          <div aria-label={`Watching ${watchedName}`} role="region" className="grid gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onWatch(null)} className="min-h-[32px] rounded-lg bg-white/10 px-2 text-xs font-black">← Everyone</button>
              <p className="min-w-0 flex-1 truncate text-sm font-black">{watchedName}</p>
              {watched && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black">{isStale(watched, now) ? "away" : PHASE_LABEL[watched.phase]}</span>}
            </div>
            {!watched ? (
              <p className="rounded-xl bg-white/5 p-4 text-center text-sm font-semibold text-white/60">Waiting for {watchedName} to start the game…</p>
            ) : (
              <>
                <p className="text-[11px] font-bold text-white/55">{titleOf(watched.game.split(":")[1] ?? watched.game)}{watched.game.includes(":") ? ` · ${watched.game.split(":")[2] ?? ""}` : ""}</p>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {[["Score", watched.score], ["Right", `${watched.correct}/${watched.attempts}`], ["Streak", watched.streak >= 2 ? `🔥${watched.streak}` : watched.streak], ["Time", watched.phase === "playing" ? `${watched.left}s` : "—"]].map(([k, v]) => (
                    <div key={k as string} className="rounded-xl bg-white/10 p-2"><p className="text-lg font-black tabular-nums text-amber-300">{v as string | number}</p><p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{k as string}</p></div>
                  ))}
                </div>
                <div className="rounded-xl bg-white p-3 text-[#0B1220]" aria-label="On their screen now">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#0E6E72]">On their screen now</p>
                  {watched.now ? (
                    <>
                      {watched.now.lead && <p className="text-xs font-bold text-slate-500">{watched.now.lead}</p>}
                      <p className="font-display text-xl font-black leading-snug">{watched.now.prompt}</p>
                      {watched.now.options && <p className="mt-1 flex flex-wrap gap-1">{watched.now.options.map((o) => <span key={o} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold">{o}</span>)}</p>}
                      {watched.now.status && <p className="mt-1 text-[11px] font-bold text-slate-500">{watched.now.status}</p>}
                    </>
                  ) : <p className="text-sm font-semibold text-slate-400">{watched.phase === "over" ? "Round finished." : "Between questions…"}</p>}
                </div>
                <ol className="grid gap-1" aria-label="Their answers">
                  {watched.feed.length === 0 && <li className="text-xs font-semibold text-white/45">No answers yet.</li>}
                  {watched.feed.map((f) => (
                    <li key={`${f.n}-${f.prompt}`} className={`flex items-start gap-2 rounded-lg px-2 py-1 text-xs font-bold ${f.ok ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"}`}>
                      <span aria-hidden>{f.ok ? "✓" : "✗"}</span><span className="min-w-0 flex-1 break-words">{f.prompt}{!f.ok && f.answer ? ` → ${f.answer}` : ""}</span><span className="text-white/40">#{f.n}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <RoundList title={`${watchedName}'s rounds in this class`} rows={(rounds ?? []).filter((r) => r.student_id === watching)} err={roundsErr} />
          </div>
        )}

        {tab === "scores" && (
          who ? (
            <div className="grid gap-2">
              <button type="button" onClick={() => setWho(null)} className="justify-self-start rounded-lg bg-white/10 px-2 py-1.5 text-xs font-black">← Everyone</button>
              <RoundList title={`${summary.find((s) => s.id === who)?.name ?? "Learner"}'s rounds`} rows={(rounds ?? []).filter((r) => r.student_id === who)} err={roundsErr} />
            </div>
          ) : roundsErr ? <p role="alert" className="p-3 text-sm font-bold text-red-200">{roundsErr}</p>
            : rounds == null ? <p className="p-4 text-center text-sm text-white/60">Loading scores…</p>
              : summary.length === 0 ? <p className="p-4 text-center text-sm font-semibold text-white/60">No finished rounds in this class yet. Scores are saved when a learner finishes a game round.</p>
                : (
                  <table className="w-full text-left text-xs" aria-label="Saved scores">
                    <thead><tr className="text-[10px] uppercase tracking-wider text-white/45"><th className="py-1 pr-1">Learner</th><th className="pr-1">Rounds</th><th className="pr-1">Best</th><th className="pr-1">Total</th><th className="pr-1">Right</th></tr></thead>
                    <tbody>
                      {summary.map((s) => (
                        <tr key={s.id} className="border-t border-white/10">
                          <td className="py-1.5 pr-1"><button type="button" onClick={() => setWho(s.id)} className="max-w-[7rem] truncate text-left text-sm font-black underline decoration-white/30" aria-label={`See ${s.name}'s rounds`}>{s.name}</button></td>
                          <td className="pr-1 tabular-nums">{s.rounds}</td><td className="pr-1 tabular-nums text-amber-300">{s.best}</td><td className="pr-1 tabular-nums">{s.total}</td><td className="pr-1 tabular-nums">{s.accuracy != null ? `${s.accuracy}%` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
        )}
      </div>
    </aside>
  );
}

function RoundList({ title, rows, err }: { title: string; rows: RoundRow[]; err: string | null }) {
  return (
    <section aria-label={title} className="mt-1">
      <p className="text-[10px] font-black uppercase tracking-wider text-white/45">{title}</p>
      {err ? <p className="text-xs font-bold text-red-200">{err}</p> : rows.length === 0 ? <p className="text-xs font-semibold text-white/45">No finished rounds yet.</p> : (
        <ul className="mt-1 grid gap-1">
          {rows.slice(0, 15).map((r, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 text-xs font-bold">
              <span className="min-w-0 flex-1 truncate">{titleOf(r.game_id)} <span className="text-white/45">· {r.difficulty}</span></span>
              <span className="tabular-nums text-amber-300">{r.score}</span><span className="tabular-nums text-white/60">{r.correct}/{r.attempts}</span><span className="text-white/40">{when(r.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
