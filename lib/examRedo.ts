import { markPaper, workingKey, type ExamQ } from "@/lib/exams";

// Sending a learner back to try an exam again — no new tables: each earlier
// try is kept inside their answers, under TRIES_KEY, so the teacher can see how
// they did before. "fresh": the paper starts empty. "wrong": the questions they
// got right are kept (and locked); only the others are cleared.

export const TRIES_KEY = "_tries";
export type RedoMode = "fresh" | "wrong";
export type ExamTry = { at: string; score: number; total: number; flags: number; mode: RedoMode; keep: number[] };
export const MAX_TRIES = 10;
export const REDO_MINUTES = [5, 10, 15, 20, 30, 45, 60] as const;
export const MAX_SAY = 200;

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// The earlier tries saved with a learner's answers (oldest first).
export function triesOf(answers: unknown): ExamTry[] {
  const raw = answers && typeof answers === "object" ? (answers as Record<string, unknown>)[TRIES_KEY] : null;
  if (!Array.isArray(raw)) return [];
  return raw.slice(-MAX_TRIES).filter((t) => t && typeof t === "object").map((t: any) => ({
    at: String(t.at ?? ""), score: Math.max(0, Math.round(num(t.score))), total: Math.max(0, Math.round(num(t.total))), flags: Math.max(0, Math.round(num(t.flags))),
    mode: t.mode === "wrong" ? "wrong" : "fresh",
    keep: Array.isArray(t.keep) ? [...new Set(t.keep.map((n: unknown) => Math.round(num(n))).filter((n: number) => n >= 0 && n < 500))] as number[] : [],
  }));
}
// The answers without the tries (what the marking and the screens use).
export function withoutTries(answers: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const { [TRIES_KEY]: _t, ...rest } = answers ?? {};
  return rest;
}
// Questions this learner already got right and keeps this time (locked).
export function keptOf(answers: unknown): number[] {
  const t = triesOf(answers);
  const last = t[t.length - 1];
  return last?.mode === "wrong" ? last.keep : [];
}
// Which try this is: 1 the first time, 2 after one redo…
export const attemptOf = (answers: unknown) => triesOf(answers).length + 1;

// A handed-in paper, set up again for another try.
export function redoPaper(qs: ExamQ[], answers: Record<string, unknown> | null | undefined, marks: Record<string, number>, mode: RedoMode, at: string, flags = 0):
  { answers: Record<string, unknown>; marks: Record<string, number>; tries: ExamTry[]; keep: number[] } {
  const given = withoutTries(answers);
  const m = markPaper(qs, given, marks);
  const keep = mode === "wrong" ? qs.map((_, i) => i).filter((i) => m.right[i]) : [];
  const next: Record<string, unknown> = {}, nextMarks: Record<string, number> = {};
  for (const i of keep) {
    if (given[String(i)] !== undefined) next[String(i)] = given[String(i)];
    if (given[workingKey(i)] !== undefined) next[workingKey(i)] = given[workingKey(i)];
    if (marks[String(i)] != null) nextMarks[String(i)] = marks[String(i)];
  }
  const tries = [...triesOf(answers), { at, score: m.score, total: m.total, flags: Math.max(0, Math.round(num(flags))), mode, keep }].slice(-MAX_TRIES);
  next[TRIES_KEY] = tries;
  return { answers: next, marks: nextMarks, tries, keep };
}

// The learner's own time for the new try: `minutes` from now (25% more if they
// have extra time), as extra time on top of the exam's end. Never less than the
// extra time they already had while the exam is still running.
export function redoExtraMs(now: number, minutes: number, endsAt: number, hadExtraMs = 0): number {
  const want = now + minutes * 60_000 * (hadExtraMs > 0 ? 1.25 : 1) - endsAt;
  return Math.max(0, Math.round(want), endsAt > now ? Math.max(0, Math.round(hadExtraMs)) : 0);
}
export const cleanRedoMinutes = (v: unknown, fallback: number) => {
  const n = Math.round(Number(v));
  return Math.max(1, Math.min(180, Number.isFinite(n) && n > 0 ? n : Math.round(fallback) || 20));
};
// A message to everyone taking the exam: one line of plain text.
export const cleanSay = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_SAY);

type Marked = { id: string; submitted: boolean; score: number | null; total: number | null; answers?: Record<string, unknown>; pageMarks?: Record<string, number> };
// Handed-in learners under the pass mark (in %).
export const belowMark = (entries: Marked[], pass: number) =>
  entries.filter((e) => e.submitted && e.total && ((e.score ?? 0) / e.total) * 100 < pass).map((e) => e.id);

// Question by question across the class: how many handed-in papers got each one
// right, and who got it wrong — hardest first.
export function questionBreakdown(qs: ExamQ[], entries: Marked[]): { n: number; q: string; right: number; of: number; pct: number; wrong: string[] }[] {
  const done = entries.filter((e) => e.submitted);
  if (!done.length) return [];
  const rights = done.map((e) => ({ id: e.id, right: markPaper(qs, withoutTries(e.answers), e.pageMarks ?? {}).right }));
  return qs.map((x, n) => {
    const wrong = rights.filter((r) => !r.right[n]).map((r) => r.id);
    const right = done.length - wrong.length;
    return { n, q: x.q, right, of: done.length, pct: Math.round((right / done.length) * 100), wrong };
  }).filter((r) => qs[r.n].marks > 0).sort((a, b) => a.pct - b.pct || a.n - b.n);
}
