"use client";
// The correction space on an answer-board round. For a learner whose answer was
// marked wrong (or missed), the teacher writes and/or draws the correct working
// here and sends it: to that learner, or to everyone who missed. It shows on
// the learner's board under their mark, and is kept with their mark.
//   • CorrectionEditor — the teacher's space (text, a pen on a board, the answer key to start from)
//   • CorrectionCard   — what the learner sees
import { useState } from "react";
import { AnnotatedPage } from "@/components/live/board/PageAnnotate";
import { TEACHER_PENS, undoInk } from "@/lib/examAnnotate";
import type { Stroke } from "@/lib/whiteboard";

export type Fix = { text: string; ink: Stroke[] };
export const MAX_FIX_TEXT = 500;
export const fixBlank = (f: Fix | null | undefined) => !f || (!f.text.trim() && !f.ink.some((s) => !s.erase));
const FRAME: [number, number] = [960, 600];

export function CorrectionEditor({ name, sent, missedCount, keyText, onSend, onSendMissed }: {
  name: string; sent: Fix | null; missedCount: number; keyText: string; onSend: (f: Fix) => void; onSendMissed: (f: Fix) => void;
}) {
  const [draft, setDraft] = useState<Fix>(sent ?? { text: "", ink: [] });
  const [colour, setColour] = useState(TEACHER_PENS[0]);
  const [note, setNote] = useState<string | null>(null);
  const blank = fixBlank(draft);
  const edited = JSON.stringify(draft) !== JSON.stringify(sent ?? { text: "", ink: [] });
  const say = (m: string) => { setNote(m); setTimeout(() => setNote(null), 3000); };
  return (
    <section aria-label="Correction space" className="mt-3 grid gap-2 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
      <p className="text-xs font-black text-amber-900">✏️ Correction space <span className="font-bold text-amber-900/60">— the right working for {name}; they see it under their mark</span></p>
      <label className="sr-only" htmlFor="fix-text">Correction for {name}</label>
      <textarea id="fix-text" value={draft.text} maxLength={MAX_FIX_TEXT} rows={3} onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        placeholder="Type the correct working, step by step — e.g. 3x = 12, so x = 12 ÷ 3 = 4"
        className="w-full rounded-lg bg-white p-2 text-sm font-semibold ring-1 ring-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500" />
      {keyText && !draft.text.trim() && (
        <button type="button" onClick={() => setDraft({ ...draft, text: keyText.slice(0, MAX_FIX_TEXT) })} className="justify-self-start rounded-lg bg-white px-2.5 py-1.5 text-xs font-black text-amber-900 ring-1 ring-amber-300">🔑 Start from my answer key</button>
      )}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Correction pen">
        <span className="text-xs font-black text-ink/55">Or write it:</span>
        {TEACHER_PENS.map((c) => <button key={c} type="button" aria-label={`Correction pen colour ${c}`} aria-pressed={colour === c} onClick={() => setColour(c)} className={`h-7 w-7 rounded-full ring-2 ${colour === c ? "ring-ink" : "ring-transparent"}`} style={{ background: c }} />)}
        <button type="button" onClick={() => setDraft({ ...draft, ink: undoInk(draft.ink) })} disabled={!draft.ink.length} className="h-8 rounded-lg px-2 text-xs font-black text-ink/70 disabled:opacity-40">↩ Undo</button>
        <button type="button" onClick={() => setDraft({ ...draft, ink: [] })} disabled={!draft.ink.length} className="h-8 rounded-lg px-2 text-xs font-black text-red-700 disabled:opacity-40">Clear</button>
      </div>
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-amber-200">
        <AnnotatedPage frame={FRAME} ink={[]} teacher={draft.ink} tool="pen" colour={colour} onTeacher={(ink) => setDraft({ ...draft, ink: ink.slice(-150) })} label={`Correction board for ${name}`} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { onSend(draft); say(`Sent to ${name} ✓`); }} disabled={blank || !edited && !!sent} className="min-h-[40px] rounded-xl bg-amber-600 px-4 text-sm font-black text-white disabled:opacity-40">
          {sent && !edited ? "✓ Sent" : sent ? "Update the correction" : `Send to ${name.split(" ")[0]}`}
        </button>
        {missedCount > 1 && (
          <button type="button" onClick={() => { onSendMissed(draft); say(`Sent to ${missedCount} learners ✓`); }} disabled={blank} className="min-h-[40px] rounded-xl bg-white px-3 text-sm font-black text-amber-900 ring-1 ring-amber-300 disabled:opacity-40">
            Send to all {missedCount} who missed
          </button>
        )}
        {note && <span role="status" className="text-xs font-black text-emerald-700">{note}</span>}
      </div>
    </section>
  );
}

export function CorrectionCard({ fix }: { fix: Fix }) {
  const drew = fix.ink.some((s) => !s.erase);
  return (
    <section aria-label="Correction from your tutor" className="grid gap-2 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
      <p className="text-[11px] font-black uppercase tracking-wider text-amber-800">✏️ Correction from your tutor</p>
      {fix.text.trim() && <p className="whitespace-pre-wrap text-sm font-bold text-ink">{fix.text}</p>}
      {drew && <div className="overflow-hidden rounded-lg bg-white ring-1 ring-amber-200"><AnnotatedPage frame={FRAME} ink={[]} teacher={fix.ink} label="Your tutor's correction" /></div>}
      <p className="text-[11px] font-bold text-ink/50">Read it, then check your own working against it.</p>
    </section>
  );
}
