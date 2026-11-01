// Class results: each learner's class-work marks (from answer boards) and
// live-quiz score, put together for the teacher at the end of a class.
// Each live-quiz question counts as one mark in the total; the quiz's speed
// points are shown alongside.

export type MarkRow = { round_id: string; student_id: string; name: string; question: string; mark: number | null; max_mark: number };
export type QuizInfo = { id: string; title: string; asked: number };
export type QuizAnswerRow = { quiz_id: string; student_id: string; correct: boolean; points: number };
export type ResultRow = {
  id: string; name: string;
  work: number; workMax: number;        // class-work marks
  quizCorrect: number; quizAsked: number; quizPoints: number;
  total: number; totalMax: number; percent: number | null;
};

// How many questions of a quiz were actually put to the class.
export function askedCount(q: { questions: unknown[]; status: string; current: number }): number {
  const n = Array.isArray(q.questions) ? q.questions.length : 0;
  if (q.status === "lobby") return 0;
  if (q.status === "ended") return n;
  return Math.max(0, Math.min(n, q.current + 1));
}

export function classResults(people: { id: string; name: string }[], allMarks: MarkRow[], quizzes: QuizInfo[], answers: QuizAnswerRow[]): ResultRow[] {
  const marks = allMarks.filter((m) => m.mark != null); // feedback without a mark doesn't count
  const rounds = new Map<string, number>(); // every round counts for everyone, marked or not
  for (const m of marks) rounds.set(m.round_id, Math.max(rounds.get(m.round_id) ?? 0, m.max_mark));
  const workMax = [...rounds.values()].reduce((a, b) => a + b, 0);
  const quizAsked = quizzes.reduce((a, q) => a + q.asked, 0);
  const names = new Map(people.map((p) => [p.id, p.name]));
  for (const m of marks) if (!names.has(m.student_id) && m.name) names.set(m.student_id, m.name);
  const ids = new Set([...people.map((p) => p.id), ...marks.map((m) => m.student_id), ...answers.map((a) => a.student_id)]);
  const rows: ResultRow[] = [...ids].map((id) => {
    const mine = marks.filter((m) => m.student_id === id);
    const qa = answers.filter((a) => a.student_id === id);
    const work = mine.reduce((a, m) => a + (m.mark ?? 0), 0);
    const quizCorrect = qa.filter((a) => a.correct).length;
    const total = work + quizCorrect, totalMax = workMax + quizAsked;
    return {
      id, name: names.get(id) ?? "A learner", work, workMax,
      quizCorrect, quizAsked, quizPoints: qa.reduce((a, x) => a + (x.points || 0), 0),
      total, totalMax, percent: totalMax ? Math.round((total / totalMax) * 100) : null,
    };
  });
  return rows.sort((a, b) => b.total - a.total || b.quizPoints - a.quizPoints || a.name.localeCompare(b.name));
}

// A spreadsheet of the results (opens in Excel / Google Sheets).
export function resultsCsv(rows: ResultRow[]): string {
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ["Learner", "Class work", "Class work out of", "Quiz correct", "Quiz questions", "Quiz points", "Total", "Total out of", "Percent"];
  return [head, ...rows.map((r) => [r.name, r.work, r.workMax, r.quizCorrect, r.quizAsked, r.quizPoints, r.total, r.totalMax, r.percent ?? ""])]
    .map((line) => line.map(esc).join(",")).join("\n");
}
