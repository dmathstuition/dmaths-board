// Topic practice: WAEC / NECO / IGCSE-style questions on one topic, marked the
// moment a learner checks each answer, with a worked solution — so practice
// teaches. It runs as an exam (lib/exams.ts) whose questions are `practice`:
// the server still keeps the answers until each is checked, and the results
// go into the class results and term progress like any test. Pure.
import { cleanAiExam, type ExamQ } from "@/lib/exams";

export const PRACTICE_SUBJECTS = ["Mathematics", "Further Mathematics", "Physics", "Chemistry", "Biology", "English Language", "Economics", "Geography", "Government", "Agricultural Science", "Computer Studies", "Literature in English", "Commerce", "Financial Accounting"] as const;
export type PracticeStyle = "waec" | "igcse";
export const PRACTICE_STYLES: Record<PracticeStyle, { label: string; level: string }> = {
  waec: { label: "WAEC / NECO (SSCE)", level: "SS1–SS3, WAEC/NECO SSCE standard" },
  igcse: { label: "Cambridge IGCSE", level: "Year 10–11, Cambridge IGCSE standard (Core and Extended)" },
};
export const PRACTICE_COUNTS = [5, 10, 15, 20] as const;
export const MAX_WHY = 700;

export const AI_PRACTICE_SYSTEM = `You are an experienced examiner writing practice questions in the style of past papers. British spelling.
Reply with JSON only, in exactly this shape:
{"questions":[{"q":"...","kind":"choice","options":["...","...","...","..."],"answer":0,"marks":1,"why":"..."},{"q":"...","kind":"typed","answer":"...","marks":2,"why":"..."}]}
Rules:
- Write questions the way that exam board sets them on this topic, from easy to harder.
- "choice": exactly 4 options (max 80 characters each), exactly one correct; "answer" is its 0-based index — vary its position; wrong options are the common mistakes.
- "typed": the answer is short (a number with no unit, a word, or a short expression, max 30 characters) so it can be marked automatically; if more than one form is right separate them with " | " (e.g. "0.5 | 1/2"). Say the unit to use in the question.
- "why": the worked solution a good teacher would write — the method in short numbered steps, the key fact or formula, and the final answer (max 600 characters). For a choice question, say briefly why the most tempting wrong option is wrong.
- Every answer must certainly be correct — check each one.
- Plain text only: write x², x³, √, π, ÷, ×, ≤, ≥, ½, °, Ω, → as characters. No LaTeX, no markdown, no emojis.`;

export function practicePrompt(o: { subject: string; topic: string; style: PracticeStyle; count: number; difficulty: string }): string {
  const s = PRACTICE_STYLES[o.style];
  return `Exam: ${s.label}. Level: ${s.level}. Subject: ${o.subject}. Topic: ${o.topic}. Write ${o.count} ${o.difficulty} questions — mostly multiple choice, with some short typed answers where a calculation suits it.`;
}

// What the A.I sent back, as practice questions: each marked as you go, with its worked solution and topic.
export function cleanPractice(raw: unknown, topic: string): ExamQ[] {
  const list = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.questions) ? (raw as any).questions : [];
  const qs = cleanAiExam(list.map((x: any) => ({ ...x, practice: true, topic, why: x?.why })));
  return qs.filter((q) => q.kind === "choice" || q.kind === "typed").map((q) => ({ ...q, practice: true, topic: topic.slice(0, 60), ...(q.why ? {} : { why: "" }) }));
}
export const practiceTitle = (subject: string, topic: string) => `${subject} practice — ${topic}`.slice(0, 120);
