"use client";
import { useEffect, useState } from "react";
import { BoardIcon } from "@/components/live/board/BoardIcons";
import { cleanBoard, type Board } from "@/lib/whiteboard";
import { cleanWidgets, type Widgets } from "@/lib/boardTools";

type Row = { id: string; title: string; subject: string; shared: boolean; pages: number; items: number; updated_at: string; ownerName?: string };

// In class: open a lesson from the library, or keep this board as a lesson.
export default function LessonPicker({ current, onOpen, onClose, notify }: {
  current: () => { board: Board; widgets: Widgets }; onOpen: (board: Board, widgets: Widgets | null, title: string) => void;
  onClose: () => void; notify: (msg: string) => void;
}) {
  const [tab, setTab] = useState<"mine" | "shared">("mine");
  const [lists, setLists] = useState<{ mine: Row[]; shared: Row[] } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [title, setTitle] = useState("");
  const [shared, setShared] = useState(false);

  useEffect(() => {
    fetch("/api/board-lessons").then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Couldn't load your lessons");
      setLists({ mine: j.mine ?? [], shared: j.shared ?? [] });
    }).catch((e) => setError(e.message));
  }, []);

  async function open(id: string) {
    setBusy(id);
    try {
      const r = await fetch(`/api/board-lessons?id=${id}`); const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Couldn't open that lesson");
      onOpen(cleanBoard(j.lesson.board), j.lesson.widgets ? cleanWidgets(j.lesson.widgets) : null, j.lesson.title);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't open that lesson"); } finally { setBusy(""); }
  }
  async function saveAsLesson() {
    setBusy("save");
    try {
      const { board, widgets } = current();
      const r = await fetch("/api/board-lessons", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", title: title || "Lesson from class", shared, board, widgets }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Couldn't save the lesson");
      notify("Saved to your lesson library ✓"); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save the lesson"); } finally { setBusy(""); }
  }
  const rows = lists ? lists[tab] : [];
  return (
    <div role="dialog" aria-modal="true" aria-label="Lesson library" className="fixed inset-0 z-[97] flex items-center justify-center bg-black/60 p-3">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF6FF] text-[#1657C9]"><BoardIcon name="library" /></span>
          <p className="flex-1 text-base font-black">Lesson library</p>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5"><BoardIcon name="close" /></button>
        </div>
        <div className="flex gap-1 px-3 pt-3" role="tablist">
          {(["mine", "shared"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-2 text-xs font-black ${tab === t ? "bg-[#1657C9] text-white" : "bg-ink/5 text-ink/70"}`}>
              {t === "mine" ? `My lessons${lists ? ` (${lists.mine.length})` : ""}` : `Shared by tutors${lists ? ` (${lists.shared.length})` : ""}`}
            </button>
          ))}
        </div>
        <div className="min-h-[160px] flex-1 overflow-y-auto p-3">
          {error && <p className="mb-2 rounded-lg bg-red-50 p-2 text-sm font-bold text-red-700">{error}</p>}
          {!lists && !error && <p className="p-4 text-center text-sm font-bold text-ink/50">Loading…</p>}
          {lists && !rows.length && <p className="p-4 text-center text-sm font-bold text-ink/50">{tab === "mine" ? "No lessons yet — prepare one under Lesson boards, or save this board below." : "No tutor has shared a lesson yet."}</p>}
          <ul className="grid gap-2">
            {rows.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-xl p-2.5 ring-1 ring-line">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{l.title}</p>
                  <p className="truncate text-xs font-semibold text-ink/55">{[l.subject, `${l.pages} page${l.pages === 1 ? "" : "s"}`, l.ownerName].filter(Boolean).join(" · ")}</p>
                </div>
                <button type="button" onClick={() => open(l.id)} disabled={!!busy} className="rounded-xl bg-[#1657C9] px-3 py-2 text-xs font-black text-white disabled:opacity-50">{busy === l.id ? "Opening…" : "Open in class"}</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-2 border-t border-line bg-slate-50 p-3">
          <p className="text-xs font-black text-ink/60">Keep this board for another class</p>
          <div className="flex flex-wrap items-center gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Lesson title" aria-label="Lesson title"
              className="min-w-[160px] flex-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1657C9]" />
            <label className="flex items-center gap-1.5 text-xs font-black text-ink/70"><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="h-4 w-4 accent-[#1657C9]" /> Share with tutors</label>
            <button type="button" onClick={saveAsLesson} disabled={!!busy} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{busy === "save" ? "Saving…" : "Save as a lesson"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
