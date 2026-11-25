// Assignments (homework): work the teacher sets during or after a class, done
// on the learner's own phone through a personal link — no account. One
// assignment mixes any of these, in any order:
//   choice  — multiple choice, marked by itself
//   typed   — a short answer, marked by itself (alternatives with "|", ranges "a..b")
//   written — a longer answer the teacher marks (answer: the teacher's mark scheme)
//   page    — a page of an uploaded PDF the learner writes on (img: the page)
//   board   — a digital board to write their working on (img: an optional picture)
//   upload  — photos or a PDF of work done on paper
// The answers and worked solutions stay with the teacher until the work is
// marked and returned (and only then if the teacher chose to show them).
// Pure — shared by the server, the teacher's screen and the learner's page.
import { cleanAnswerStrokes } from "@/lib/answerBoards";
import { typedRight } from "@/lib/exams";
import { isSlideUrl, type Stroke } from "@/lib/whiteboard";
import type { PageNote } from "@/lib/examAnnotate";

export type AKind = "choice" | "typed" | "written" | "page" | "board" | "upload";
export type AItem = { kind: AKind; q: string; marks: number; options: string[]; answer: number | string; img?: string; why?: string };
export type Assignment = {
  id: string; sessionId: string; title: string; instructions: string; items: AItem[]; files: string[];
  forIds: string[] | null; dueAt: string | null; lateOk: boolean; review: boolean; status: "open" | "closed"; createdAt: string;
  remind?: boolean; remindedAt?: string | null; // the evening-before email to parents
};
export type Entry = {
  studentId: string; name: string; answers: Record<string, unknown>; marks: Record<string, number>; notes: Record<string, PageNote>;
  feedback: string; startedAt: string | null; submittedAt: string | null; returnedAt: string | null; tries: number; sentBack: boolean;
};
export type InkAnswer = { ink: Stroke[]; text: string };
export type UploadAnswer = { imgs: string[] };

export const KINDS: { kind: AKind; label: string; icon: string; hint: string }[] = [
  { kind: "choice", label: "Multiple choice", icon: "🔘", hint: "Marked for you" },
  { kind: "typed", label: "Short answer", icon: "⌨️", hint: "Marked for you" },
  { kind: "written", label: "Written answer", icon: "📝", hint: "You mark it" },
  { kind: "board", label: "Digital board", icon: "✏️", hint: "They write their working" },
  { kind: "page", label: "Write on a PDF", icon: "📄", hint: "One item per page" },
  { kind: "upload", label: "Upload work", icon: "📷", hint: "Photos or a PDF of paper work" },
];
export const MAX_ITEMS = 60, MAX_MARKS = 20, MAX_UPLOADS = 8, MAX_FILES = 20;
export const MAX_TITLE = 100, MAX_INSTRUCTIONS = 1500, MAX_WRITTEN_ANSWER = 3000, MAX_TYPED = 200, MAX_FEEDBACK = 1000;
export const AUTO: AKind[] = ["choice", "typed"];
export const isAuto = (it: Pick<AItem, "kind">) => AUTO.includes(it.kind);

const text = (v: unknown, n: number) => String(v ?? "").replace(/\r/g, "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ").slice(0, n);
const line = (v: unknown, n: number) => text(v, n).replace(/\s+/g, " ").trim();
const isKind = (v: unknown): v is AKind => KINDS.some((k) => k.kind === v);

export function cleanItems(v: unknown): AItem[] {
  const out: AItem[] = [];
  for (const x of (Array.isArray(v) ? v : []).slice(0, MAX_ITEMS) as any[]) {
    if (!isKind(x?.kind)) continue;
    const kind: AKind = x.kind;
    const q = text(x.q, 600).trim() || (kind === "upload" ? "Upload a photo of your work" : kind === "board" ? "Show your working on the board" : kind === "page" ? "Write your answers on the page" : "");
    if (!q) continue;
    const marks = Math.max(1, Math.min(MAX_MARKS, Math.round(Number(x.marks) || 1)));
    const img = isSlideUrl(x.img) ? x.img : undefined;
    const why = text(x.why, 700).trim() || undefined;
    const base = { kind, q, marks, options: [] as string[], answer: "" as number | string, ...(img ? { img } : {}), ...(why ? { why } : {}) };
    if (kind === "choice") {
      const options = (Array.isArray(x.options) ? x.options : []).map((o: unknown) => line(o, 150)).slice(0, 6);
      const answer = Math.round(Number(x.answer));
      if (options.length < 2 || options.some((o: string) => !o) || !(answer >= 0 && answer < options.length)) continue;
      out.push({ ...base, options, answer });
    } else if (kind === "typed") {
      const answer = line(x.answer, MAX_TYPED);
      if (!answer) continue;
      out.push({ ...base, answer });
    } else if (kind === "written") {
      out.push({ ...base, answer: text(x.answer, 1000).trim() }); // the mark scheme (optional)
    } else if (kind === "page") {
      if (!img) continue; // a page needs its picture
      out.push(base);
    } else out.push(base); // board, upload
  }
  return out;
}
export const cleanFiles = (v: unknown): string[] => [...new Set((Array.isArray(v) ? v : []).filter(isSlideUrl))].slice(0, MAX_FILES);

// What a learner may see of the items: never the answers or worked solutions,
// until their work has come back marked and the teacher chose to show them.
export function learnerItems(items: AItem[], reveal: boolean): AItem[] {
  if (reveal) return items;
  return items.map((it) => {
    const out: AItem = { ...it, answer: it.kind === "choice" ? -1 : "" };
    delete out.why;
    return out;
  });
}

// ── Answers ──
export function cleanAnswer(it: Pick<AItem, "kind" | "options">, v: unknown): unknown {
  switch (it.kind) {
    case "choice": { const n = Math.round(Number(v)); return v != null && v !== "" && n >= 0 && n < it.options.length ? n : null; }
    case "typed": return line(v, MAX_TYPED);
    case "written": return text(v, MAX_WRITTEN_ANSWER);
    case "page": case "board": {
      const x = (v && typeof v === "object" ? v : {}) as { ink?: unknown; text?: unknown };
      return { ink: cleanAnswerStrokes(x.ink), text: text(x.text, 1000) } satisfies InkAnswer;
    }
    case "upload": {
      const x = (v && typeof v === "object" ? v : {}) as { imgs?: unknown };
      return { imgs: [...new Set((Array.isArray(x.imgs) ? x.imgs : []).filter(isSlideUrl))].slice(0, MAX_UPLOADS) } satisfies UploadAnswer;
    }
  }
}
export function isBlank(it: Pick<AItem, "kind">, v: unknown): boolean {
  if (v == null) return true;
  switch (it.kind) {
    case "choice": return typeof v !== "number";
    case "typed": case "written": return !String(v).trim();
    case "page": case "board": { const p = v as Partial<InkAnswer>; return !(p.ink ?? []).some((s) => !s.erase) && !String(p.text ?? "").trim(); }
    case "upload": return !((v as Partial<UploadAnswer>).imgs ?? []).length;
  }
}
export const answeredCount = (items: AItem[], answers: Record<string, unknown>) => items.filter((it, n) => !isBlank(it, answers?.[String(n)])).length;

// ── Marking ──
// An item's mark: the teacher's, if they gave one (they can change an
// automatic mark too); else the automatic mark; else null (waiting for them).
// A blank answer scores 0 without waiting.
export function itemMark(it: AItem, v: unknown, teacher?: number): number | null {
  if (typeof teacher === "number") return Math.max(0, Math.min(it.marks, teacher));
  if (isBlank(it, v)) return 0;
  if (it.kind === "choice") return Number(v) === it.answer ? it.marks : 0;
  if (it.kind === "typed") return typedRight(String(v), String(it.answer)) ? it.marks : 0;
  return null;
}
export function scoreOf(items: AItem[], answers: Record<string, unknown>, marks: Record<string, number> = {}): { score: number; total: number; toMark: number[] } {
  let score = 0, total = 0;
  const toMark: number[] = [];
  items.forEach((it, n) => {
    total += it.marks;
    const m = itemMark(it, answers?.[String(n)], marks?.[String(n)]);
    if (m == null) toMark.push(n); else score += m;
  });
  return { score, total, toMark };
}
export function cleanMarks(items: AItem[], v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, m] of Object.entries(v && typeof v === "object" ? v as Record<string, unknown> : {})) {
    const it = items[Number(k)];
    if (!it || !/^\d+$/.test(k) || typeof m !== "number" || !Number.isFinite(m)) continue;
    out[k] = Math.max(0, Math.min(it.marks, Math.round(m)));
  }
  return out;
}
// The teacher's marking on a page, a board, or one uploaded picture ("n" or "n.i").
export const noteKeyFor = (n: number, i?: number) => (i == null ? String(n) : `${n}.${i}`);
export const isNoteKey = (k: string, items: AItem[]) => {
  const m = k.match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) return false;
  const it = items[Number(m[1])];
  if (!it || isAuto(it) || it.kind === "written") return false;
  return m[2] == null ? it.kind !== "upload" : it.kind === "upload" && Number(m[2]) < MAX_UPLOADS;
};

// ── Where a learner's work is ──
export type Status = "not-started" | "started" | "handed-in" | "late" | "returned" | "sent-back";
export const dueMs = (a: Pick<Assignment, "dueAt">) => (a.dueAt ? new Date(a.dueAt).getTime() : null);
export const isLate = (a: Pick<Assignment, "dueAt">, at: string | number | null) => { const d = dueMs(a); return d != null && at != null && new Date(at).getTime() > d; };
export function statusOf(a: Pick<Assignment, "dueAt">, e: Pick<Entry, "submittedAt" | "returnedAt" | "sentBack"> | null): Status {
  if (!e) return "not-started";
  if (e.returnedAt) return "returned";
  if (e.submittedAt) return isLate(a, e.submittedAt) ? "late" : "handed-in";
  if (e.sentBack) return "sent-back";
  return "started"; // their work is saved as soon as they begin
}
export const STATUS_LABEL: Record<Status, string> = {
  "not-started": "Not started", started: "Working on it", "handed-in": "Handed in", late: "Handed in late", returned: "Marked & returned", "sent-back": "Sent back to redo",
};
// May the learner still change their work?
export function canWork(a: Pick<Assignment, "status" | "dueAt" | "lateOk">, e: Pick<Entry, "submittedAt" | "returnedAt"> | null, now = Date.now()): { ok: boolean; why?: string } {
  if (a.status === "closed") return { ok: false, why: "Your teacher has closed this assignment." };
  if (e?.returnedAt) return { ok: false, why: "Your teacher has marked this." };
  if (e?.submittedAt) return { ok: false, why: "You've handed this in." };
  const d = dueMs(a);
  if (d != null && now > d && !a.lateOk) return { ok: false, why: "The due date has passed." };
  return { ok: true };
}
// Who it's for: everyone in the class, or the learners the teacher chose.
export const isFor = (a: Pick<Assignment, "forIds">, id: string) => !a.forIds || a.forIds.includes(id);

// "Due tomorrow", "Due in 3 days", "2 days late"… (the clock time is shown beside it).
export function dueWords(dueAt: string | null, now = Date.now()): string {
  if (!dueAt) return "No due date";
  const d = new Date(dueAt).getTime(), ms = d - now, day = 86_400_000;
  const startOf = (t: number) => { const x = new Date(t); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const days = Math.round((startOf(d) - startOf(now)) / day);
  if (ms < 0) {
    const late = Math.floor(-ms / day);
    return late >= 1 ? `Overdue by ${late} day${late === 1 ? "" : "s"}` : `Overdue by ${Math.max(1, Math.round(-ms / 3_600_000))} h`;
  }
  if (ms < 3_600_000) return `Due in ${Math.max(1, Math.round(ms / 60_000))} min`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}
// Quick due dates: at 6 pm (local time), so it reads like a teacher would say it.
export function duePreset(kind: "tomorrow" | "3days" | "week", now = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + (kind === "tomorrow" ? 1 : kind === "3days" ? 3 : 7));
  d.setHours(18, 0, 0, 0);
  return d;
}

// From the A.I. class work helper (lib/classWorkAi): short answers marked by
// themselves, or written answers the teacher marks with the answer as the scheme.
export function itemsFromAi(list: { q: string; a: string; w: string }[], as: "typed" | "written", marks = 1): AItem[] {
  return cleanItems(list.map((x) => as === "typed"
    ? { kind: "typed", q: x.q, answer: x.a, why: x.w, marks }
    : { kind: "written", q: x.q, answer: [x.a, x.w].filter(Boolean).join(" — "), why: x.w, marks }));
}

// A reminder for learners who haven't handed in, ready to paste into WhatsApp.
export function reminderText(title: string, dueAt: string | null, list: { name: string; link: string }[], dueClock = ""): string {
  const due = dueAt ? ` ${dueWords(dueAt).replace(/^Due/, "is due").replace(/^Overdue/, "is overdue")}${dueClock ? ` (${dueClock})` : ""}` : "";
  return [`📚 Reminder: "${title}"${due}.`, "", ...list.map((x) => `• ${x.name}: ${x.link}`), "", "Open your link, finish it and tap Hand in."].join("\n");
}

// ── Reminders (the evening before it's due) ──
// The daily job (lib/homeworkReminders.ts) picks homework due within the next
// REMIND_WINDOW_H hours, once per assignment, and emails each parent whose
// child hasn't handed it in yet.
export const REMIND_WINDOW_H = 30;
export const dueSoon = (dueAt: string | null, now = Date.now()) => {
  if (!dueAt) return false;
  const ms = new Date(dueAt).getTime() - now;
  return ms > 0 && ms <= REMIND_WINDOW_H * 3_600_000;
};
export function reminderTargets<G extends { id: string; removed?: boolean; email: string | null }>(
  a: Pick<Assignment, "forIds">, guests: G[], entries: { student_id: string; submitted_at: string | null; returned_at: string | null }[],
): G[] {
  const done = new Set(entries.filter((e) => e.submitted_at || e.returned_at).map((e) => e.student_id));
  return guests.filter((g) => !g.removed && !!g.email && isFor(a, g.id) && !done.has(g.id));
}
export function reminderEmail(o: { learner: string; title: string; dueAt: string; teacher: string; klass: string; link: string }): { title: string; body: string } {
  const when = new Date(o.dueAt).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });
  return {
    title: `Homework reminder: ${o.learner} — "${o.title}" is due ${when}`,
    body: `${o.learner}'s homework "${o.title}" from ${o.klass}${o.teacher ? ` with ${o.teacher}` : ""} is due ${when}, and it hasn't been handed in yet. `
      + `They can open it, finish it and tap "Hand in" from their own link — no account needed.`,
  };
}

