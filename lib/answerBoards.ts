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
export type Shown = { strokes: Stroke[]; text: string; imgs?: string[]; bg?: string | null; name: string | null };
// Handing in: `closed` — the tutor has stopped answers changing; `endsAt` — a
// time limit (server time, lib/serverClock); `notes` — the tutor's feedback to
// each learner; `back` — work sent back to try again (a count per learner, so
// a learner sees each send-back once).
export type Round = {
  id: string; q: string; open: boolean; mode: AnswerMode; show: Shown | null; max: number; marks: Record<string, number>;
  img: string | null; per: Record<string, Task>;
  closed: boolean; endsAt: number | null; notes: Record<string, string>; back: Record<string, number>;
};
export const MAX_PHOTOS = 3;
export const MAX_NOTE = 200;
export const TIME_LIMITS = [0, 2, 5, 10, 15, 30] as const; // minutes (0 = no limit)
export const MAX_PER = 60;
export const MARK_CHOICES = [1, 2, 5, 10] as const;
// `imgs`: photos the learner took of their work (pages of it); `done`: handed in.
export type Answer = { by: string; name: string; strokes: Stroke[]; text: string; imgs?: string[]; done?: boolean; v: number; at: number };
export const cleanImg = (v: unknown): string | null => (isSlideUrl(v) ? v : null);
// Up to MAX_PHOTOS board pictures (an older board sent one, as `img`).
export function cleanImgs(v: unknown, old?: unknown): string[] {
  const list = Array.isArray(v) ? v : old != null ? [old] : [];
  return [...new Set(list.filter(isSlideUrl))].slice(0, MAX_PHOTOS);
}
export const cleanNote = (v: unknown) => (typeof v === "string" ? v.replace(/\r/g, "").slice(0, MAX_NOTE) : "");

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
  const show = r.show && typeof r.show === "object" ? { strokes: cleanAnswerStrokes(r.show.strokes), text: cleanAnswerText(r.show.text), imgs: cleanImgs(r.show.imgs, r.show.img), bg: cleanImg(r.show.bg), name: typeof r.show.name === "string" ? r.show.name.slice(0, 60) : null } : null;
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
  const notes: Record<string, string> = {};
  if (r.notes && typeof r.notes === "object") for (const [who, n] of Object.entries(r.notes).slice(0, 500)) { const t = cleanNote(n); if (who && t.trim()) notes[who.slice(0, 60)] = t; }
  const back: Record<string, number> = {};
  if (r.back && typeof r.back === "object") for (const [who, n] of Object.entries(r.back).slice(0, 500)) { const k = Math.round(Number(n)); if (who && k > 0 && k < 1000) back[who.slice(0, 60)] = k; }
  const endsAt = Number(r.endsAt) > 0 ? Math.round(Number(r.endsAt)) : null;
  return { id: r.id.slice(0, 40), q: String(r.q ?? "").slice(0, 200), open: !!r.open, mode, show, max, marks, img: cleanImg(r.img), per,
    closed: !!r.closed, endsAt, notes, back };
}

// "Learner A", "Learner B"… — the same learner keeps the same letter in a round.
export function anonLabel(order: string[], by: string): string {
  const i = order.indexOf(by);
  if (i < 0) return "A learner";
  const letters = i < 26 ? String.fromCharCode(65 + i) : `${String.fromCharCode(65 + Math.floor(i / 26) - 1)}${String.fromCharCode(65 + (i % 26))}`;
  return `Learner ${letters}`;
}

// Has this learner given an answer — drawn, typed, or sent a photo?
export const hasAnswered = (a: Pick<Answer, "strokes" | "text" | "imgs">) => a.strokes.some((s) => !s.erase) || !!a.text.trim() || !!a.imgs?.length;

// Who has answered and who hasn't yet.
export function answerSummary(answers: Answer[], online: { id: string; name: string }[]) {
  const done = new Set(answers.filter(hasAnswered).map((a) => a.by));
  return { answered: done.size, handedIn: answers.filter((a) => a.done).length, waiting: online.filter((p) => !done.has(p.id)).map((p) => p.name) };
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

// Can this learner still change their answer? Not once handed in, the tutor
// has closed answers, or time is up.
export const canEdit = (r: Pick<Round, "closed" | "endsAt">, done: boolean, now: number) => !done && !r.closed && !(r.endsAt && now >= r.endsAt);

// "4:05" left on the clock.
export function timeLeft(endsAt: number, now: number): string {
  const s = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
