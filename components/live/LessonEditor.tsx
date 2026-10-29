"use client";
import type { HostBase } from "@/lib/liveSession";
import Link from "next/link";
import { useEffect, useState } from "react";
import Whiteboard from "@/components/live/Whiteboard";

// Preparing one lesson board before class (no class running: the board saves to the lesson).
export default function LessonEditor({ id, base, myId }: { id: string; base: HostBase; myId: string }) {
  const [meta, setMeta] = useState<{ title: string; subject: string; shared: boolean; canEdit: boolean; mine: boolean } | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  useEffect(() => {
    fetch(`/api/board-lessons?id=${id}`).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Couldn't open that lesson");
      setMeta({ title: j.lesson.title, subject: j.lesson.subject, shared: j.lesson.shared, canEdit: j.lesson.canEdit, mine: j.lesson.mine });
    }).catch((e) => setError(e.message));
  }, [id]);
  async function save(patch: Partial<{ title: string; subject: string; shared: boolean }>) {
    if (!meta) return;
    setMeta({ ...meta, ...patch }); setSaved("Saving…");
    const r = await fetch("/api/board-lessons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", id, ...patch }) });
    setSaved(r.ok ? "Saved" : ((await r.json().catch(() => ({}))).error ?? "Couldn't save"));
  }
  if (error) return <div className="space-y-3"><p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700" role="alert">{error}</p><Link href={`${base}/lessons`} className="btn-ghost">← All lessons</Link></div>;
  if (!meta) return <div className="card h-64 animate-pulse" />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-line">
        <Link href={`${base}/lessons`} className="btn-ghost !min-h-[40px] !px-3">← Lessons</Link>
        {meta.canEdit ? (
          <>
            <input defaultValue={meta.title} maxLength={100} aria-label="Lesson title" onBlur={(e) => e.target.value !== meta.title && save({ title: e.target.value })} className="field min-w-[200px] flex-1 !w-auto !font-black" />
            <input defaultValue={meta.subject} maxLength={60} placeholder="Subject" aria-label="Subject" onBlur={(e) => e.target.value !== meta.subject && save({ subject: e.target.value })} className="field !w-36" />
            {base !== "/app" && <label className="flex items-center gap-1.5 text-xs font-black text-ink/70"><input type="checkbox" checked={meta.shared} onChange={(e) => save({ shared: e.target.checked })} className="h-4 w-4 accent-[#1657C9]" /> Share with tutors</label>}
            <span className="text-xs font-bold text-ink/50" aria-live="polite">{saved}</span>
          </>
        ) : (
          <p className="flex-1 font-black text-ink">{meta.title} <span className="text-sm font-semibold text-ink/50">— shared by another tutor. Copy it to your lessons to change it.</span></p>
        )}
      </div>
      <p className="text-xs text-ink/55">Your board saves as you work. In class, press <b>Lessons</b> on the interactive board and choose this lesson.</p>
      <Whiteboard sessionId="" lessonId={id} host myId={myId} canDraw={meta.canEdit} writers="all" readOnly={!meta.canEdit} />
    </div>
  );
}
