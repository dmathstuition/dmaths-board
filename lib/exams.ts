// Exam mode: a timed test each learner takes on their own phone. Pure helpers
// shared by the server (marking — learners never receive the answers while
// the exam is open) and the teacher's screen (building the test).
import { question as numericQuestion, type Difficulty, type Skill } from "@/lib/games/generators";
import { choiceQuestion, type ChoiceSkill } from "@/lib/games/senior";
import { moreChoice, MORE_CHOICE, type MoreChoiceSkill } from "@/lib/games/moreMaths";
import { CLASS_GAMES } from "@/lib/games/catalog";

export type ExamQ = { q: string; kind: "choice" | "typed"; options: string[]; answer: number | string; marks: number };
export const MAX_EXAM_QUESTIONS = 60;
export const EXAM_MINUTES = [5, 10, 15, 20, 30, 45, 60, 90] as const;
// How long after the end an answer still counts (a slow connection).
export const GRACE_MS = 20_000;

const str = (v: unknown, n: number) => String(v ?? "").replace(/\r/g, "").slice(0, n);

export function cleanExamQuestions(v: unknown): ExamQ[] {
  if (!Array.isArray(v)) return [];
  const out: ExamQ[] = [];
  for (const raw of v.slice(0, MAX_EXAM_QUESTIONS)) {
    const x = raw as any;
    const q = str(x?.q, 400).trim();
    if (!q) continue;
    const marks = Math.max(1, Math.min(10, Math.round(Number(x?.marks) || 1)));
    if (x?.kind === "typed") {
      const answer = str(x?.answer, 120).trim();
      if (answer) out.push({ q, kind: "typed", options: [], answer, marks });
      continue;
    }
    const options = (Array.isArray(x?.options) ? x.options : []).map((o: unknown) => str(o, 160).trim()).filter(Boolean).slice(0, 6);
    const answer = Math.round(Number(x?.answer));
    if (options.length >= 2 && answer >= 0 && answer < options.length) out.push({ q, kind: "choice", options, answer, marks });
  }
  return out;
}

// ── Each learner gets the questions, and each question's options, in their own order ──
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number) { let a = seed || 1; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffled(n: number, r: () => number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// The order this learner sees: question numbers, and for each question the option numbers.
export function learnerOrder(examId: string, studentId: string, qs: Pick<ExamQ, "options">[]): { order: number[]; opts: number[][] } {
  const r = rng(hash(`${examId}|${studentId}`));
  return { order: shuffled(qs.length, r), opts: qs.map((q) => shuffled(q.options.length, r)) };
}

// What a learner's phone gets while the exam is open: no answers.
export type LearnerQ = { n: number; q: string; kind: ExamQ["kind"]; options: { i: number; text: string }[]; marks: number };
export function learnerPaper(examId: string, studentId: string, qs: ExamQ[]): LearnerQ[] {
  const { order, opts } = learnerOrder(examId, studentId, qs);
  return order.map((n) => ({ n, q: qs[n].q, kind: qs[n].kind, marks: qs[n].marks, options: opts[n].map((i) => ({ i, text: qs[n].options[i] })) }));
}

// ── Marking ──
// Typed answers: spaces, case and the minus sign don't matter; numbers are
// compared as numbers (0.50 = 0.5 = 1/2). A teacher's answer may list
// alternatives separated by | ("4 | four").
const tidy = (s: string) => s.toLowerCase().replace(/[−–]/g, "-").replace(/×/g, "*").replace(/\s+/g, "").replace(/^x=/, "").replace(/[.,]$/, "");
function asNumber(s: string): number | null {
  const t = tidy(s).replace(/,/g, "");
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  const f = t.match(/^(-?\d+)\/(\d+)$/);
  if (f && Number(f[2])) return Number(f[1]) / Number(f[2]);
  return null;
}
export function typedRight(given: string, answer: string): boolean {
  const g = tidy(given);
  if (!g) return false;
  return answer.split("|").some((alt) => {
    const a = tidy(alt);
    if (!a) return false;
    if (g === a) return true;
    const gn = asNumber(given), an = asNumber(alt);
    return gn != null && an != null && Math.abs(gn - an) < 1e-9 * Math.max(1, Math.abs(an));
  });
}
export const cleanGiven = (v: unknown): string | number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 10 ? v : typeof v === "string" ? v.slice(0, 120) : null;

export function isRight(q: ExamQ, given: unknown): boolean {
  if (given == null) return false;
  if (q.kind === "choice") return Number(given) === q.answer;
  return typedRight(String(given), String(q.answer));
}
export function markPaper(qs: ExamQ[], answers: Record<string, unknown>): { score: number; total: number; right: boolean[] } {
  const right = qs.map((q, i) => isRight(q, answers[String(i)]));
  return { score: qs.reduce((s, q, i) => s + (right[i] ? q.marks : 0), 0), total: qs.reduce((s, q) => s + q.marks, 0), right };
}

// ── Make questions from a maths topic (the arcade games' question makers) ──
export const EXAM_TOPICS = CLASS_GAMES.filter((g) => (g.subject ?? "maths") === "maths" && (g.kind === "quiz" || g.kind === "choice" || g.kind === "balloon"))
  .map((g) => ({ id: g.id, title: g.title, skill: g.skill, choice: g.kind === "choice", stage: g.stage }));

export function topicQuestions(topicId: string, d: Difficulty, count: number, r: () => number = Math.random): ExamQ[] {
  const t = EXAM_TOPICS.find((x) => x.id === topicId);
  if (!t) return [];
  const out: ExamQ[] = [], seen = new Set<string>();
  for (let guard = 0; out.length < count && guard < count * 20; guard++) {
    if (t.choice) {
      const c = MORE_CHOICE.includes(t.skill) ? moreChoice(t.skill as MoreChoiceSkill, d, r) : choiceQuestion(t.skill as ChoiceSkill, d, r);
      const q = [c.lead, c.prompt].filter((s) => s && s !== "?").join(": ");
      if (seen.has(q)) continue; seen.add(q);
      out.push({ q, kind: "choice", options: c.options, answer: c.options.indexOf(c.answer), marks: 1 });
    } else {
      const n = numericQuestion(t.skill as Skill, d, r);
      const q = n.ask ? `${n.prompt} — ${n.ask}` : n.prompt.includes("?") ? n.prompt : `${n.prompt} = ?`;
      if (seen.has(q)) continue; seen.add(q);
      out.push({ q, kind: "typed", options: [], answer: String(n.answer), marks: 1 });
    }
  }
  return out;
}

// "12:05" left.
export function clockLeft(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
