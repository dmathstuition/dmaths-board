"use client";
// Marking on a learner's page (lib/examAnnotate.ts).
//   • AnnotatedPage — the page, the learner's writing, and on top the
//     teacher's: a pen, or a tick / cross stamped where they tap.
//   • MarkTools — the teacher's tools, the tick count and the comment.
//   • MarkedPage — the learner's own page back, with the teacher's marking.
import { useEffect, useRef, useState } from "react";
import { drawStrokes, roundPt, type Stroke } from "@/lib/whiteboard";
import { localPoint } from "@/components/live/board/rotation";
import { MAX_NOTE, QUICK_COMMENTS, TEACHER_PENS, countCrosses, countTicks, crossStrokes, tickStroke, undoInk, type PageNote } from "@/lib/examAnnotate";

export type MarkTool = "pen" | "tick" | "cross" | "move";
type Api = (body: unknown) => Promise<{ ok: boolean; j: any }>;
const BLANK: [number, number] = [1200, 800];

export function AnnotatedPage({ src, ink, teacher, zoom = 1, tool, colour = TEACHER_PENS[0], onTeacher, label }: {
  src?: string | null; ink: Stroke[]; teacher: Stroke[]; zoom?: number; label: string;
  tool?: MarkTool; colour?: string; onTeacher?: (ink: Stroke[]) => void; // none: just looking
}) {
  const theirs = useRef<HTMLCanvasElement>(null), mine = useRef<HTMLCanvasElement>(null);
  const live = useRef<Stroke | null>(null);
  const [size, setSize] = useState<[number, number]>(src ? [1240, 1754] : BLANK);
  useEffect(() => { const c = theirs.current; if (c) drawStrokes(c.getContext("2d")!, ink, c.width, c.height); });
  const paint = () => { const c = mine.current; if (c) drawStrokes(c.getContext("2d")!, live.current ? [...teacher, live.current] : teacher, c.width, c.height); };
  useEffect(paint);
  const pt = (e: React.PointerEvent) => localPoint(mine.current!, e.clientX, e.clientY).map(roundPt) as [number, number];
  const marking = !!onTeacher && !!tool && tool !== "move", ratio = size[1] / size[0];
  return (
    <div className="relative bg-white" style={{ width: `${zoom * 100}%` }}>
      {src ? <img src={src} alt={label} className="block w-full select-none" draggable={false}
        onLoad={(e) => { const i = e.currentTarget; if (i.naturalWidth) { const w = Math.min(1600, i.naturalWidth); setSize([w, Math.round(w * (i.naturalHeight / i.naturalWidth))]); } }} />
        : <div aria-hidden className="w-full" style={{ aspectRatio: `${BLANK[0]} / ${BLANK[1]}`, backgroundImage: "linear-gradient(#E6EEF0 1px, transparent 1px), linear-gradient(90deg, #E6EEF0 1px, transparent 1px)", backgroundSize: "24px 24px" }} />}
      <canvas ref={theirs} width={size[0]} height={size[1]} role="img" aria-label="Their writing" className="pointer-events-none absolute inset-0 h-full w-full" />
      <canvas ref={mine} width={size[0]} height={size[1]} role="img" aria-label={onTeacher ? "Mark on the page" : "The teacher's marking"}
        className={`absolute inset-0 h-full w-full ${marking ? "touch-none" : "pointer-events-none"}`} style={{ cursor: marking ? "crosshair" : undefined }}
        onPointerDown={marking ? (e) => {
          const [x, y] = pt(e);
          if (tool === "tick") return onTeacher!([...teacher, tickStroke(x, y, ratio)]);
          if (tool === "cross") return onTeacher!([...teacher, ...crossStrokes(x, y, ratio)]);
          e.currentTarget.setPointerCapture(e.pointerId);
          live.current = { id: `tp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`, by: "t", color: colour, w: 5, pts: [x, y] };
          paint();
        } : undefined}
        onPointerMove={marking ? (e) => {
          const s = live.current; if (!s || !e.buttons) return;
          const [x, y] = pt(e), L = s.pts.length;
          if (Math.hypot(x - s.pts[L - 2], y - s.pts[L - 1]) < 0.0015) return;
          s.pts.push(x, y); paint();
        } : undefined}
        onPointerUp={marking ? () => { const s = live.current; live.current = null; if (s && s.pts.length >= 2) onTeacher!([...teacher, s.pts.length === 2 ? { ...s, pts: [...s.pts, s.pts[0] + 0.001, s.pts[1] + 0.001] } : s]); } : undefined}
        onPointerCancel={marking ? () => { live.current = null; paint(); } : undefined} />
    </div>
  );
}

// The teacher's tools for a page, the tick count, and the comment.
export function MarkTools({ note, tool, setTool, colour, setColour, max, name, saved, onChange, onUse }: {
  note: PageNote; tool: MarkTool; setTool: (t: MarkTool) => void; colour: string; setColour: (c: string) => void;
  max: number; name: string; saved: "saved" | "saving" | "unsaved" | null; onChange: (p: PageNote) => void; onUse: (mark: number) => void;
}) {
  const ticks = countTicks(note.ink), crosses = countCrosses(note.ink);
  const b = (on: boolean) => `flex h-10 min-w-[40px] items-center justify-center rounded-lg px-2 text-sm font-black ${on ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-orange-200"}`;
  return (
    <div className="grid gap-2 rounded-xl bg-white p-2 ring-1 ring-orange-200" aria-label="Mark on the page">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Marking tools">
        <button type="button" aria-pressed={tool === "tick"} onClick={() => setTool("tick")} className={b(tool === "tick")} title="Tap the page to put a tick"><span className="text-[#16A34A]">✓</span>&nbsp;Tick</button>
        <button type="button" aria-pressed={tool === "cross"} onClick={() => setTool("cross")} className={b(tool === "cross")} title="Tap the page to put a cross"><span className="text-[#DC2626]">✗</span>&nbsp;Cross</button>
        <button type="button" aria-pressed={tool === "pen"} onClick={() => setTool("pen")} className={b(tool === "pen")} title="Write on the page">🖊 Pen</button>
        {tool === "pen" && TEACHER_PENS.map((c) => <button key={c} type="button" aria-label={`Pen colour ${c}`} aria-pressed={colour === c} onClick={() => setColour(c)} className={`h-7 w-7 rounded-full ring-2 ${colour === c ? "ring-ink" : "ring-transparent"}`} style={{ background: c }} />)}
        <button type="button" aria-pressed={tool === "move"} onClick={() => setTool("move")} className={b(tool === "move")} title="Move around the page without marking">✋ Move</button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" disabled={!note.ink.length} onClick={() => onChange({ ...note, ink: undoInk(note.ink) })} className="h-8 rounded-lg bg-slate-100 px-2 text-xs font-black disabled:opacity-40">↩ Undo</button>
        <button type="button" disabled={!note.ink.length} onClick={() => onChange({ ...note, ink: [] })} className="h-8 rounded-lg px-2 text-xs font-black text-red-700 disabled:opacity-40">Clear my marking</button>
        {saved && <span role="status" className="ml-auto text-[11px] font-bold text-ink/50">{saved === "saved" ? "Saved ✓" : saved === "saving" ? "Saving…" : "Not saved yet"}</span>}
      </div>
      {(ticks > 0 || crosses > 0) && (
        <p className="flex flex-wrap items-center gap-2 text-xs font-black text-ink/70" aria-label="Tick count">
          <span><span className="text-[#16A34A]">✓ {ticks}</span>{crosses ? <span className="text-[#DC2626]"> · ✗ {crosses}</span> : null}</span>
          {ticks <= max && <button type="button" onClick={() => onUse(ticks)} className="h-8 rounded-lg bg-emerald-600 px-2.5 text-xs font-black text-white">Give {ticks} mark{ticks === 1 ? "" : "s"} (one per tick)</button>}
          {ticks > max && <span className="text-amber-800">More ticks than the {max} mark{max === 1 ? "" : "s"} for this page.</span>}
        </p>
      )}
      <label className="text-[11px] font-black uppercase tracking-wide text-ink/50">Comment for {name.split(" ")[0]}
        <textarea value={note.note} maxLength={MAX_NOTE} rows={2} onChange={(e) => onChange({ ...note, note: e.target.value })} placeholder="They see this on their marked page"
          className="mt-1 w-full rounded-lg bg-slate-50 px-2 py-1.5 text-sm font-semibold normal-case tracking-normal text-ink ring-1 ring-slate-200" />
      </label>
      <details>
        <summary className="cursor-pointer text-[11px] font-black text-ink/60">Quick comments</summary>
        <div className="mt-1 flex flex-wrap gap-1" role="group" aria-label="Quick comments">
          {QUICK_COMMENTS.map((c) => <button key={c} type="button" onClick={() => onChange({ ...note, note: (note.note.trim() ? `${note.note.trim()} ${c}` : c).slice(0, MAX_NOTE) })} className="rounded-md bg-slate-100 px-1.5 py-1 text-[11px] font-bold text-ink/75 hover:bg-slate-200">{c}</button>)}
        </div>
      </details>
    </div>
  );
}

// A learner's own page back: their writing, the teacher's marking, the mark and the comment.
export function MarkedPage({ examId, n, api, onClose }: { examId: string; n: number; api: Api; onClose: () => void }) {
  const [v, setV] = useState<{ img: string | null; title: string; ink: Stroke[]; text: string; mark: number | null; marks: number; teacher: PageNote } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    let gone = false;
    api({ action: "my-page", examId, n }).then(({ ok, j }) => { if (gone) return; if (ok) setV({ ...j, teacher: j.teacher ?? { ink: [], note: "" } }); else setErr(j?.error ?? "Couldn't open your page — try again."); });
    return () => { gone = true; };
  }, [examId, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div role="dialog" aria-modal="true" aria-label="Your marked page" className="fixed inset-0 z-[160] flex flex-col bg-black/70 p-2 sm:p-4">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-2xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <p className="min-w-0 flex-1 text-sm font-black">{v?.title ?? "Your page"}{v && <span className="ml-2 rounded-md bg-orange-50 px-2 py-0.5 text-[#C2451C]">{v.mark == null ? "not marked yet" : `${v.mark} / ${v.marks}`}</span>}</p>
          <div className="flex gap-1" role="group" aria-label="Zoom the page">{[1, 1.5, 2].map((z) => <button key={z} type="button" onClick={() => setZoom(z)} aria-pressed={zoom === z} className={`h-9 rounded-lg px-2 text-xs font-black ${zoom === z ? "bg-ink text-white" : "bg-slate-100"}`}>{z}×</button>)}</div>
          <button type="button" onClick={onClose} className="min-h-[40px] rounded-xl bg-[#C2451C] px-3 text-xs font-black text-white">Close</button>
        </div>
        {v?.teacher.note && <p className="border-b border-line bg-[#FFF7ED] px-3 py-2 text-sm font-bold text-ink" aria-label="Your teacher's comment">💬 Your teacher: {v.teacher.note}</p>}
        <div className="min-h-0 flex-1 overflow-auto bg-slate-100">
          {err ? <p className="p-6 text-center text-sm font-bold text-red-700">{err}</p>
            : !v ? <p className="p-6 text-center text-sm font-bold text-ink/55">Opening your page…</p>
            : <AnnotatedPage src={v.img} ink={v.ink} teacher={v.teacher.ink} zoom={zoom} label={v.title} />}
        </div>
        {v?.text?.trim() && <p className="border-t border-line p-3 text-sm font-semibold"><span className="block text-[10px] font-black uppercase text-ink/45">You typed</span>{v.text}</p>}
      </div>
    </div>
  );
}
