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
export type ResultRow = {
  id: string; name: string;
  work: number; workMax: number;        // class-work marks
  quizCorrect: number; quizAsked: number; quizPoints: number;
  exam: number; examMax: number;        // exam marks (papers handed in)
  total: number; totalMax: number; percent: number | null;
};

// How many questions of a quiz were actually put to the class.
export function askedCount(q: { questions: unknown[]; status: string; current: number }): number {
  const n = Array.isArray(q.questions) ? q.questions.length : 0;
  if (q.status === "lobby") return 0;
  if (q.status === "ended") return n;
  return Math.max(0, Math.min(n, q.current + 1));
}

export function classResults(people: { id: string; name: string }[], allMarks: MarkRow[], quizzes: QuizInfo[], answers: QuizAnswerRow[], exams: ExamInfo[] = [], examEntries: ExamEntryRow[] = []): ResultRow[] {
  const marks = allMarks.filter((m) => m.mark != null); // feedback without a mark doesn't count
  const rounds = new Map<string, number>(); // every round counts for everyone, marked or not
  for (const m of marks) rounds.set(m.round_id, Math.max(rounds.get(m.round_id) ?? 0, m.max_mark));
  const workMax = [...rounds.values()].reduce((a, b) => a + b, 0);
  const quizAsked = quizzes.reduce((a, q) => a + q.asked, 0);
  const names = new Map(people.map((p) => [p.id, p.name]));
  for (const m of marks) if (!names.has(m.student_id) && m.name) names.set(m.student_id, m.name);
  for (const e of examEntries) if (!names.has(e.student_id) && e.name) names.set(e.student_id, e.name);
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
    const total = work + quizCorrect + exam, totalMax = workMax + quizAsked + examMax;
    return {
      id, name: names.get(id) ?? "A learner", work, workMax,
      quizCorrect, quizAsked, quizPoints: qa.reduce((a, x) => a + (x.points || 0), 0), exam, examMax,
      total, totalMax, percent: totalMax ? Math.round((total / totalMax) * 100) : null,
    };
  });
  return rows.sort((a, b) => b.total - a.total || b.quizPoints - a.quizPoints || a.name.localeCompare(b.name));
}

// A spreadsheet of the results (opens in Excel / Google Sheets).
export function resultsCsv(rows: ResultRow[]): string {
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ["Learner", "Class work", "Class work out of", "Quiz correct", "Quiz questions", "Quiz points", "Exams", "Exams out of", "Total", "Total out of", "Percent"];
  return [head, ...rows.map((r) => [r.name, r.work, r.workMax, r.quizCorrect, r.quizAsked, r.quizPoints, r.exam, r.examMax, r.total, r.totalMax, r.percent ?? ""])]
    .map((line) => line.map(esc).join(",")).join("\n");
}
