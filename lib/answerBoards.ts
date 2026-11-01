// Learner answer boards: the tutor asks a question, every learner answers on
// their own small board, the tutor sees them all and can show one to the class.
// Rounds and answers travel over the class channel; these keep them tidy.
import { cleanStrokes, isSlideUrl, type Stroke } from "@/lib/whiteboard";

// How learners may answer: on their small board, by typing, or either.
export type AnswerMode = "both" | "draw" | "type";
// `max`: what the question is worth; `marks`: the tutor's mark for each learner
// (by learner id) — each learner's board shows them their own.
// `img`: a picture for everyone (a worksheet, a diagram); `per`: class work set
// for each learner — their own question and/or picture (by learner id).
export type Task = { q: string; img: string | null };
export type Shown = { strokes: Stroke[]; text: string; img?: string | null; bg?: string | null; name: string | null };
export type Round = {
  id: string; q: string; open: boolean; mode: AnswerMode; show: Shown | null; max: number; marks: Record<string, number>;
  img: string | null; per: Record<string, Task>;
};
export const MAX_PER = 60;
export const MARK_CHOICES = [1, 2, 5, 10] as const;
// `img`: a photo the learner took of their work.
export type Answer = { by: string; name: string; strokes: Stroke[]; text: string; img?: string | null; v: number; at: number };
export const cleanImg = (v: unknown): string | null => (isSlideUrl(v) ? v : null);

export const MAX_ANSWER_TEXT = 500;
// A typed answer: plain text, tidy line breaks, within the size limit.
export function cleanAnswerText(v: unknown): string {
  return typeof v === "string" ? v.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").slice(0, MAX_ANSWER_TEXT) : "";
}
const MODES: AnswerMode[] = ["both", "draw", "type"];

const MAX_ITEMS = 300, MAX_NUMBERS = 30_000;
// A learner's answer: drawn items only (pen, highlighter, rubber), within size limits.
export function cleanAnswerStrokes(v: unknown): Stroke[] {
  const out: Stroke[] = [];
  let numbers = 0;
  for (const s of cleanStrokes(v).slice(0, MAX_ITEMS)) {
    if (s.kind && s.kind !== "hl") continue;
    numbers += s.pts.length;
    if (numbers > MAX_NUMBERS) break;
    out.push(s);
  }
  return out;
}

export function cleanRound(v: unknown): Round | null {
  const r = v as any;
  if (!r || typeof r.id !== "string" || !r.id) return null;
  const show = r.show && typeof r.show === "object" ? { strokes: cleanAnswerStrokes(r.show.strokes), text: cleanAnswerText(r.show.text), img: cleanImg(r.show.img), bg: cleanImg(r.show.bg), name: typeof r.show.name === "string" ? r.show.name.slice(0, 60) : null } : null;
  const mode: AnswerMode = MODES.includes(r.mode) ? r.mode : "both"; // older boards sent no mode
  const max = Math.max(1, Math.min(10, Math.round(Number(r.max) || 1)));
  const marks: Record<string, number> = {};
  if (r.marks && typeof r.marks === "object") {
    for (const [who, m] of Object.entries(r.marks).slice(0, 500)) {
      const n = Math.round(Number(m));
      if (who && Number.isFinite(n)) marks[who.slice(0, 60)] = Math.max(0, Math.min(max, n));
    }
  }
  const per: Record<string, Task> = {};
  if (r.per && typeof r.per === "object") {
    for (const [who, t] of Object.entries(r.per).slice(0, MAX_PER)) {
      const q = String((t as any)?.q ?? "").slice(0, 300), img = cleanImg((t as any)?.img);
      if (who && (q.trim() || img)) per[who.slice(0, 60)] = { q, img };
    }
  }
  return { id: r.id.slice(0, 40), q: String(r.q ?? "").slice(0, 200), open: !!r.open, mode, show, max, marks, img: cleanImg(r.img), per };
}

// "Learner A", "Learner B"… — the same learner keeps the same letter in a round.
export function anonLabel(order: string[], by: string): string {
  const i = order.indexOf(by);
  if (i < 0) return "A learner";
  const letters = i < 26 ? String.fromCharCode(65 + i) : `${String.fromCharCode(65 + Math.floor(i / 26) - 1)}${String.fromCharCode(65 + (i % 26))}`;
  return `Learner ${letters}`;
}

// Has this learner given an answer — drawn, typed, or sent a photo?
export const hasAnswered = (a: Pick<Answer, "strokes" | "text" | "img">) => a.strokes.some((s) => !s.erase) || !!a.text.trim() || !!a.img;

// Who has answered and who hasn't yet.
export function answerSummary(answers: Answer[], online: { id: string; name: string }[]) {
  const done = new Set(answers.filter(hasAnswered).map((a) => a.by));
  return { answered: done.size, waiting: online.filter((p) => !done.has(p.id)).map((p) => p.name) };
}

// This learner's class work: their own question and picture where set, else the ones for everyone.
export function taskFor(r: Pick<Round, "q" | "img" | "per">, who: string): Task {
  const t = r.per[who];
  return { q: t?.q.trim() ? t.q : r.q, img: t?.img ?? r.img };
}

// Share a list of questions out across learners, in turn (one each, then round again).
export function shareOut(questions: string[], learners: string[]): Record<string, Task> {
  const qs = questions.map((q) => q.trim()).filter(Boolean);
  const out: Record<string, Task> = {};
  if (!qs.length) return out;
  learners.slice(0, MAX_PER).forEach((id, i) => { out[id] = { q: qs[i % qs.length].slice(0, 300), img: null }; });
  return out;
}
