// Marking on a learner's paper: what the teacher writes on a page they handed
// in — red pen, ticks and crosses — and a comment for the learner. Kept with
// the page's mark (board_exam_entries.page_marks, key "t<page>"), so it needs
// no new table; the learner sees it on their marked page. Pure.
import type { Stroke } from "@/lib/whiteboard";
import { cleanAnswerStrokes } from "@/lib/answerBoards";

export type PageNote = { ink: Stroke[]; note: string };
export const MAX_NOTE = 300;
export const noteKey = (n: number) => `t${n}`;
export const TICK = "#16A34A", CROSS = "#DC2626", TEACHER_PENS = ["#DC2626", "#16A34A", "#1657C9"];

export function cleanPageNote(v: unknown): PageNote {
  const x = (v && typeof v === "object" ? v : {}) as { ink?: unknown; note?: unknown };
  return { ink: cleanAnswerStrokes(x.ink), note: String(x.note ?? "").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, MAX_NOTE) };
}
export const noteBlank = (p: PageNote | null | undefined) => !p || (!p.ink.length && !p.note);

// Every page's marking kept with the marks (the marks themselves are the number keys).
export function notesOf(pageMarks: unknown): Record<string, PageNote> {
  const out: Record<string, PageNote> = {};
  if (!pageMarks || typeof pageMarks !== "object") return out;
  for (const [k, v] of Object.entries(pageMarks as Record<string, unknown>)) {
    if (!/^t\d+$/.test(k)) continue;
    const p = cleanPageNote(v);
    if (!noteBlank(p)) out[k] = p;
  }
  return out;
}
// The page's marking, set (or taken away when there's nothing on it).
export function withNote(notes: Record<string, PageNote>, n: number, p: PageNote): Record<string, PageNote> {
  const out = { ...notes };
  if (noteBlank(p)) delete out[noteKey(n)]; else out[noteKey(n)] = p;
  return out;
}

// ── Ticks and crosses: stamped where the teacher taps ──
// Positions are fractions of the page (0–1); `ratio` is the page's height ÷ width, so a stamp isn't stretched.
const gid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const r4 = (v: number) => Math.round(v * 10_000) / 10_000;
export function tickStroke(x: number, y: number, ratio: number, by = "t", size = 0.035): Stroke {
  const s = size, v = size / Math.max(0.2, ratio);
  return { id: `tk-${gid()}`, by, color: TICK, w: 8, pts: [x - s * 0.55, y, x - s * 0.15, y + v * 0.45, x + s * 0.7, y - v * 0.55].map(r4), t: Date.now() } as Stroke;
}
export function crossStrokes(x: number, y: number, ratio: number, by = "t", size = 0.03): Stroke[] {
  const s = size, v = size / Math.max(0.2, ratio), g = gid();
  return [
    { id: `cx-${g}-a`, by, color: CROSS, w: 8, pts: [x - s * 0.5, y - v * 0.5, x + s * 0.5, y + v * 0.5].map(r4), t: Date.now() } as Stroke,
    { id: `cx-${g}-b`, by, color: CROSS, w: 8, pts: [x + s * 0.5, y - v * 0.5, x - s * 0.5, y + v * 0.5].map(r4), t: Date.now() } as Stroke,
  ];
}
export const countTicks = (ink: Stroke[]) => ink.filter((s) => String(s.id).startsWith("tk-")).length;
export const countCrosses = (ink: Stroke[]) => ink.filter((s) => /^cx-.*-a$/.test(String(s.id))).length;
// Undo: the last thing written goes — both strokes of a cross together.
export function undoInk(ink: Stroke[]): Stroke[] {
  const last = ink[ink.length - 1];
  if (!last) return ink;
  const m = String(last.id).match(/^(cx-.+)-[ab]$/);
  return m ? ink.filter((s) => !String(s.id).startsWith(m[1])) : ink.slice(0, -1);
}

// Comments a teacher writes again and again: one tap.
export const QUICK_COMMENTS = [
  "Well done — clear working.",
  "Show your working.",
  "Check your units.",
  "Read the question again.",
  "Careful with the arithmetic.",
  "Give your answer to the accuracy asked for.",
  "Good method — small slip at the end.",
  "See me about this one.",
];
