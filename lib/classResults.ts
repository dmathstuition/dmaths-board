// Class results: each learner's class-work marks (from answer boards), live-quiz
// score and exam marks, put together for the teacher at the end of a class.
// Each live-quiz question counts as one mark in the total; the quiz's speed
// points are shown alongside.

export type MarkRow = { round_id: string; student_id: string; name: string; question: string; mark: number | null; max_mark: number };
export type QuizInfo = { id: string; title: string; asked: number };
export type QuizAnswerRow = { quiz_id: string; student_id: string; correct: boolean; points: number };
// Exams (Exam mode): total = the marks everyone's paper has; an entry's own total
// can be more (their personal spelling words).
export type ExamInfo = { id: string; title: string; total: number };
export type ExamEntryRow = { exam_id: string; student_id: string; name: string; score: number | null; total: number | null; submitted: boolean };
// Homework (assignments, lib/assignments.ts): it counts for a learner once it's
// marked and returned — or once the due date has passed without them handing
// it in (0). Work handed in and waiting to be marked doesn't count yet.
export type HwInfo = { id: string; title: string; total: number; dueAt: string | null; forIds: string[] | null };
export type HwEntryRow = { assignment_id: string; student_id: string; name: string; score: number | null; total: number | null; submitted: boolean; returned: boolean; submittedAt?: string | null };
// One piece of homework, for a learner's results and the parent report.
export type HwState = "marked" | "handed-in" | "late" | "missing" | "to-do";
export type HomeworkResult = { title: string; dueAt: string | null; state: HwState; score: number | null; total: number };
export function homeworkFor(id: string, homework: HwInfo[], entries: HwEntryRow[], now = Date.now()): HomeworkResult[] {
  return homework.filter((h) => !h.forIds || h.forIds.includes(id)).map((h) => {
    const e = entries.find((y) => y.assignment_id === h.id && y.student_id === id);
    const due = h.dueAt ? new Date(h.dueAt).getTime() : null;
    const state: HwState = e?.returned ? "marked"
      : e?.submitted ? (due != null && e.submittedAt && new Date(e.submittedAt).getTime() > due ? "late" : "handed-in")
      : due != null && now > due ? "missing" : "to-do";
    return { title: h.title, dueAt: h.dueAt, state, score: e?.returned ? Math.max(0, e.score ?? 0) : null, total: Math.max(h.total, e?.total ?? 0) };
  });
}
export const HW_STATE_LABEL: Record<HwState, string> = { marked: "Marked", "handed-in": "Handed in", late: "Handed in late", missing: "Not handed in", "to-do": "Not due yet" };
export function homeworkCounts(h: Pick<HwInfo, "dueAt">, e: Pick<HwEntryRow, "submitted" | "returned"> | null | undefined, now = Date.now()): boolean {
  if (e?.returned) return true;
  if (e?.submitted) return false;
  return !!h.dueAt && now > new Date(h.dueAt).getTime();
}
export type ResultRow = {
  id: string; name: string;
  work: number; workMax: number;        // class-work marks
  quizCorrect: number; quizAsked: number; quizPoints: number;
  exam: number; examMax: number;        // exam marks (papers handed in)
  hw: number; hwMax: number;            // homework marks (marked, or overdue)
  total: number; totalMax: number; percent: number | null;
};

// How many questions of a quiz were actually put to the class.
export function askedCount(q: { questions: unknown[]; status: string; current: number }): number {
  const n = Array.isArray(q.questions) ? q.questions.length : 0;
  if (q.status === "lobby") return 0;
  if (q.status === "ended") return n;
  return Math.max(0, Math.min(n, q.current + 1));
}

export function classResults(people: { id: string; name: string }[], allMarks: MarkRow[], quizzes: QuizInfo[], answers: QuizAnswerRow[], exams: ExamInfo[] = [], examEntries: ExamEntryRow[] = [],
  homework: HwInfo[] = [], hwEntries: HwEntryRow[] = [], now = Date.now()): ResultRow[] {
  const marks = allMarks.filter((m) => m.mark != null); // feedback without a mark doesn't count
  const rounds = new Map<string, number>(); // every round counts for everyone, marked or not
  for (const m of marks) rounds.set(m.round_id, Math.max(rounds.get(m.round_id) ?? 0, m.max_mark));
  const workMax = [...rounds.values()].reduce((a, b) => a + b, 0);
  const quizAsked = quizzes.reduce((a, q) => a + q.asked, 0);
  const names = new Map(people.map((p) => [p.id, p.name]));
  for (const m of marks) if (!names.has(m.student_id) && m.name) names.set(m.student_id, m.name);
  for (const e of examEntries) if (!names.has(e.student_id) && e.name) names.set(e.student_id, e.name);
  for (const e of hwEntries) if (!names.has(e.student_id) && e.name) names.set(e.student_id, e.name);
  const examIds = new Set(exams.map((x) => x.id));
  const entries = examEntries.filter((e) => examIds.has(e.exam_id));
  const ids = new Set([...people.map((p) => p.id), ...marks.map((m) => m.student_id), ...answers.map((a) => a.student_id), ...entries.map((e) => e.student_id)]);
  const rows: ResultRow[] = [...ids].map((id) => {
    const mine = marks.filter((m) => m.student_id === id);
    const qa = answers.filter((a) => a.student_id === id);
    const work = mine.reduce((a, m) => a + (m.mark ?? 0), 0);
    const quizCorrect = qa.filter((a) => a.correct).length;
    // Every exam counts for everyone (like a quiz); a paper's own total if it has one.
    let exam = 0, examMax = 0;
    for (const x of exams) {
      const e = entries.find((y) => y.exam_id === x.id && y.student_id === id);
      examMax += Math.max(x.total, e?.total ?? 0);
      if (e?.submitted) exam += Math.max(0, e.score ?? 0);
    }
    // Homework set for them: marked, or overdue and not handed in.
    let hw = 0, hwMax = 0;
    for (const h of homework) {
      if (h.forIds && !h.forIds.includes(id)) continue;
      const e = hwEntries.find((y) => y.assignment_id === h.id && y.student_id === id);
      if (!homeworkCounts(h, e, now)) continue;
      hwMax += Math.max(h.total, e?.total ?? 0);
      if (e?.returned) hw += Math.max(0, e.score ?? 0);
    }
    const total = work + quizCorrect + exam + hw, totalMax = workMax + quizAsked + examMax + hwMax;
    return {
      id, name: names.get(id) ?? "A learner", work, workMax,
      quizCorrect, quizAsked, quizPoints: qa.reduce((a, x) => a + (x.points || 0), 0), exam, examMax, hw, hwMax,
      total, totalMax, percent: totalMax ? Math.round((total / totalMax) * 100) : null,
    };
  });
  return rows.sort((a, b) => b.total - a.total || b.quizPoints - a.quizPoints || a.name.localeCompare(b.name));
}

// A spreadsheet of the results (opens in Excel / Google Sheets).
export function resultsCsv(rows: ResultRow[]): string {
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ["Learner", "Class work", "Class work out of", "Quiz correct", "Quiz questions", "Quiz points", "Exams", "Exams out of", "Homework", "Homework out of", "Total", "Total out of", "Percent"];
  return [head, ...rows.map((r) => [r.name, r.work, r.workMax, r.quizCorrect, r.quizAsked, r.quizPoints, r.exam, r.examMax, r.hw, r.hwMax, r.total, r.totalMax, r.percent ?? ""])]
    .map((line) => line.map(esc).join(",")).join("\n");
}
