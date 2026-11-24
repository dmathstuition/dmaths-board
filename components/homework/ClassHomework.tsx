"use client";
// In class: the learner's homework for this class, with their own link to it —
// it shows the moment the teacher sets one, and keeps working after the class.
import { useCallback, useEffect, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { dueWords, type Status } from "@/lib/assignments";

type Listed = { id: string; title: string; dueAt: string | null; state: Status; score: number | null; total: number | null };

export default function ClassHomework({ sessionId }: { sessionId: string }) {
  const [d, setD] = useState<{ link: string; assignments: Listed[] } | null>(null);
  const [fresh, setFresh] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch(`/api/board/assignments?sessionId=${sessionId}`, { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return; // not set up yet, or offline: nothing to show
    const j = await r.json().catch(() => null);
    if (j?.assignments) setD(j);
  }, [sessionId]);
  useEffect(() => { void load(); }, [load]);
  useLive({ assign: (p) => { if (p?.host) { setFresh(true); void load(); } } });
  if (!d?.assignments.length) return null;
  const todo = d.assignments.filter((a) => a.state === "not-started" || a.state === "started" || a.state === "sent-back");
  const top = todo[0] ?? d.assignments[0];
  return (
    <section aria-label="Homework" className={`flex flex-wrap items-center gap-3 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-fuchsia-200 ${fresh ? "animate-[tourIn_.4s_ease-out]" : ""}`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-100 text-2xl" aria-hidden>📚</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black uppercase tracking-wider text-fuchsia-700">{fresh ? "New homework!" : "Homework"}{todo.length ? ` · ${todo.length} to do` : " · all done 🎉"}</p>
        <p className="truncate text-sm font-black text-ink">{top.title} <span className="font-bold text-ink/50">· {dueWords(top.dueAt)}</span></p>
      </div>
      <a href={`${d.link}${todo.length === 1 ? `&id=${top.id}` : ""}`} target="_blank" rel="noopener" onClick={() => setFresh(false)}
        className="flex min-h-[44px] items-center rounded-2xl bg-fuchsia-600 px-4 text-sm font-black text-white">Open my homework</a>
    </section>
  );
}
