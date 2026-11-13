// JAMB UTME practice on the CBT screen: four subjects — Use of English and
// three more — each a "section" of an exam (ExamQ.sec). The real exam is 60
// English questions and 40 in each other subject, two hours, every subject
// scored out of 100 (so out of 400). Pure: the subjects, the sizes, the score.
import { isRight, type ExamQ } from "@/lib/exams";

export const JAMB_ENGLISH = "Use of English";
export const JAMB_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Government", "Literature in English", "Commerce",
  "Financial Accounting", "Geography", "Agricultural Science", "Christian Religious Studies", "Islamic Studies", "History",
  "Civic Education", "Computer Studies", "Further Mathematics",
] as const;
export type JambSize = "full" | "short";
export const JAMB_SIZES: Record<JambSize, { label: string; english: number; other: number; minutes: number }> = {
  full: { label: "Full UTME — 180 questions, 2 hours", english: 60, other: 40, minutes: 120 },
  short: { label: "Short practice — 45 questions, 30 minutes", english: 15, other: 10, minutes: 30 },
};
export const cbtTitle = (subjects: string[]) => `JAMB UTME practice — ${[JAMB_ENGLISH, ...subjects].join(", ")}`;

// The sections of a paper, in order.
export function sectionsOf(qs: Pick<ExamQ, "sec">[]): string[] {
  const out: string[] = [];
  for (const q of qs) if (q.sec && !out.includes(q.sec)) out.push(q.sec);
  return out;
}
export const isCbt = (qs: Pick<ExamQ, "sec">[]) => qs.length > 0 && qs.every((q) => !!q.sec);

// JAMB-style result: each subject out of 100, and the total (out of 100 × subjects).
export type SectionScore = { sec: string; right: number; of: number; score: number };
export function sectionScores(qs: ExamQ[], answers: Record<string, unknown>): { sections: SectionScore[]; total: number; outOf: number } {
  const sections = sectionsOf(qs).map((sec) => {
    const idx = qs.map((q, i) => (q.sec === sec ? i : -1)).filter((i) => i >= 0);
    const right = idx.filter((i) => isRight(qs[i], answers?.[String(i)])).length;
    return { sec, right, of: idx.length, score: idx.length ? Math.round((right / idx.length) * 100) : 0 };
  });
  return { sections, total: sections.reduce((a, s) => a + s.score, 0), outOf: sections.length * 100 };
}

// How the A.I is asked for one subject's questions, in batches it can manage.
export function cbtBatches(subject: string, count: number, size = 25): { topic: string; level: string; count: number }[] {
  const out: { topic: string; level: string; count: number }[] = [];
  for (let left = count, k = 0; left > 0; k++) {
    const n = Math.min(size, left); left -= n;
    out.push({ topic: `JAMB UTME ${subject} past-question style — mix the syllabus topics (set ${k + 1}), four options A–D`, level: "SS3 / UTME candidates", count: n });
  }
  return out;
}
