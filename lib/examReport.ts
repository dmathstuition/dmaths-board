// One learner's exam result and analysis, and the class's, for the reports
// the teacher downloads (lib/examPdf.ts). Pure.
import { markPaper, type ExamQ } from "@/lib/exams";

export type ReportEntry = {
  id: string; name: string; answers: Record<string, unknown>; flags: number; flagLog: { at: string; reason: string }[];
  startedAt: string | null; submittedAt: string | null;
};
export type ReportItem = { n: number; q: string; given: string; correct: string; right: boolean; blank: boolean; marks: number; classRight: number | null };
export type LearnerReport = {
  id: string; name: string; score: number; total: number; percent: number; grade: string; position: number | null; of: number;
  classAverage: number | null; best: number | null; right: number; wrong: number; blank: number;
  minutes: number | null; flags: number; flagLog: { at: string; reason: string }[]; submitted: boolean;
  items: ReportItem[]; remark: string; focus: string[];
};
export type ClassReport = {
  takers: number; average: number | null; best: number | null; lowest: number | null; passed: number;
  grades: { grade: string; count: number }[];
  items: { n: number; q: string; correct: string; classRight: number | null }[]; // how the class did on each question
  learners: LearnerReport[]; // best first
};

// WAEC grades.
export const GRADES: [number, string][] = [[75, "A1"], [70, "B2"], [65, "B3"], [60, "C4"], [55, "C5"], [50, "C6"], [45, "D7"], [40, "E8"], [0, "F9"]];
export const gradeOf = (pct: number) => GRADES.find(([min]) => pct >= min)![1];
const PASS = 50; // C6 or better is a credit pass

const answerText = (q: ExamQ, v: unknown): string => {
  if (v == null || v === "") return "";
  if (q.kind === "choice") { const i = Number(v); return Number.isInteger(i) && q.options[i] != null ? q.options[i] : ""; }
  return String(v).slice(0, 200);
};
const correctText = (q: ExamQ) => (q.kind === "choice" ? q.options[Number(q.answer)] ?? "" : String(q.answer));

function remarkFor(pct: number, avg: number | null, blank: number, flags: number): string {
  const lead = pct >= 75 ? "Excellent work." : pct >= 60 ? "Good work." : pct >= 50 ? "A fair result — a credit pass." : pct >= 40 ? "Nearly there — more practice is needed." : "This topic needs more work.";
  const vsClass = avg == null ? "" : pct > avg + 5 ? " Above the class average." : pct < avg - 5 ? " Below the class average." : " Around the class average.";
  const left = blank > 0 ? ` ${blank} question${blank === 1 ? " was" : "s were"} left unanswered — attempt every question.` : "";
  const away = flags > 0 ? ` Left the exam page ${flags} time${flags === 1 ? "" : "s"}.` : "";
  return `${lead}${vsClass}${left}${away}`.trim();
}

export function examReports(questions: ExamQ[], entries: ReportEntry[]): ClassReport {
  const marked = entries.map((e) => ({ e, m: markPaper(questions, e.answers ?? {}) }));
  const total = questions.reduce((s, q) => s + q.marks, 0);
  const pct = (score: number) => (total ? Math.round((score / total) * 100) : 0);
  const n = marked.length;
  // How many of the class got each question right.
  const classRight = questions.map((_, i) => (n ? Math.round((marked.filter(({ m }) => m.right[i]).length / n) * 100) : null));
  const scores = marked.map(({ m }) => m.score);
  const average = n ? Math.round(scores.reduce((a, b) => a + pct(b), 0) / n) : null;
  const best = n ? pct(Math.max(...scores)) : null, lowest = n ? pct(Math.min(...scores)) : null;

  const learners: LearnerReport[] = marked.map(({ e, m }) => {
    const items: ReportItem[] = questions.map((q, i) => {
      const given = answerText(q, e.answers?.[String(i)]);
      return { n: i + 1, q: q.q, given, correct: correctText(q), right: m.right[i], blank: !given, marks: q.marks, classRight: classRight[i] };
    });
    const right = items.filter((x) => x.right).length, blank = items.filter((x) => x.blank).length;
    const p = pct(m.score);
    const minutes = e.startedAt && e.submittedAt ? Math.max(0, Math.round((Date.parse(e.submittedAt) - Date.parse(e.startedAt)) / 60_000)) : null;
    // What to work on: the questions they got wrong that most of the class got right first.
    const focus = items.filter((x) => !x.right).sort((a, b) => (b.classRight ?? 0) - (a.classRight ?? 0)).slice(0, 3).map((x) => `Q${x.n}: ${x.q}`);
    return {
      id: e.id, name: e.name || "Learner", score: m.score, total, percent: p, grade: gradeOf(p), position: null, of: n, classAverage: average, best,
      right, wrong: items.length - right - blank, blank, minutes, flags: e.flags || 0, flagLog: (e.flagLog ?? []).slice(-10),
      submitted: !!e.submittedAt, items, remark: remarkFor(p, average, blank, e.flags || 0), focus,
    };
  });
  // Position: equal scores share a place (1, 2, 2, 4).
  learners.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  learners.forEach((l) => { l.position = learners.findIndex((x) => x.score === l.score) + 1; });

  return {
    takers: n, average, best, lowest, passed: learners.filter((l) => l.percent >= PASS).length,
    grades: GRADES.map(([, g]) => ({ grade: g, count: learners.filter((l) => l.grade === g).length })),
    items: questions.map((q, i) => ({ n: i + 1, q: q.q, correct: correctText(q), classRight: classRight[i] })),
    learners,
  };
}

export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
