// One learner's results from one class, question by question (server only):
// their class-work marks with the tutor's feedback and what they handed in,
// each live-quiz question with their choice and the right answer, and how the
// class did overall. Used by "My results" (the learner) and the parent report.
import { supabaseAdmin } from "@/lib/supabase/admin";
import { askedCount, classResults, type MarkRow } from "@/lib/classResults";
import { learnerReport, type LearnerReport } from "@/lib/classReportData";
import { cleanAnswerText, cleanImgs } from "@/lib/answerBoards";

export type WorkItem = { question: string; mark: number | null; max: number; feedback: string; answer: { text: string; imgs: string[] } | null };
export type QuizItem = { q: string; options: string[]; answer: number; choice: number | null; correct: boolean };
export type QuizResult = { title: string; items: QuizItem[] };
export type ExamResult = { title: string; score: number | null; total: number | null; submitted: boolean };
export type LearnerDetail = LearnerReport & { work: WorkItem[]; quizzes: QuizResult[]; exams: ExamResult[]; classAverage: number | null; live: boolean };

const asItem = (m: any): WorkItem => ({
  question: String(m.question ?? ""), mark: m.mark ?? null, max: Number(m.max_mark) || 1, feedback: String(m.feedback ?? ""),
  answer: m.answer && typeof m.answer === "object" ? { text: cleanAnswerText(m.answer.text), imgs: cleanImgs(m.answer.imgs) } : null,
});

export async function learnerDetail(sessionId: string, studentId: string): Promise<LearnerDetail | null> {
  const report = await learnerReport(sessionId, studentId);
  if (!report) return null;
  const admin = supabaseAdmin();
  const cols = "round_id, student_id, name, question, mark, max_mark, marked_at";
  let mine = await admin.from("live_class_marks").select(`${cols}, feedback, answer`).eq("session_id", sessionId).eq("student_id", studentId).order("marked_at").limit(500);
  if (mine.error) mine = await admin.from("live_class_marks").select(cols).eq("session_id", sessionId).eq("student_id", studentId).order("marked_at").limit(500) as any;
  const [allMarks, quizRes, sessionRes] = await Promise.all([
    admin.from("live_class_marks").select("round_id, student_id, name, question, mark, max_mark").eq("session_id", sessionId).not("mark", "is", null).limit(5000),
    admin.from("live_quizzes").select("id, title, questions, status, current").eq("session_id", sessionId).order("created_at", { ascending: true }).limit(50),
    admin.from("live_sessions").select("status").eq("id", sessionId).maybeSingle(),
  ]);
  const quizzes = (quizRes.data ?? []).map((q: any) => ({ ...q, asked: askedCount(q) })).filter((q: any) => q.asked > 0);
  let answers: any[] = [];
  if (quizzes.length) {
    const { data } = await admin.from("live_quiz_answers").select("quiz_id, idx, student_id, choice, correct, points").in("quiz_id", quizzes.map((q: any) => q.id)).limit(20000);
    answers = data ?? [];
  }
  // The class average (everyone who took part), to compare with.
  const ids = new Set([...(allMarks.data ?? []).map((m: any) => m.student_id), ...answers.map((a) => a.student_id)]);
  const rows = classResults([...ids].map((id) => ({ id, name: "" })), (allMarks.data ?? []) as MarkRow[], quizzes.map((q: any) => ({ id: q.id, title: q.title, asked: q.asked })), answers);
  const pcts = rows.map((r) => r.percent).filter((p): p is number => p != null);
  const classAverage = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;

  const myAnswers = answers.filter((a) => a.student_id === studentId);
  // Exams (supabase/migration-exams-stars.sql; none before it's run).
  const examRows = await admin.from("board_exams").select("id, title, created_at").eq("session_id", sessionId).order("created_at").limit(20);
  let exams: ExamResult[] = [];
  if (!examRows.error && examRows.data?.length) {
    const { data: es } = await admin.from("board_exam_entries").select("exam_id, score, total, submitted_at").eq("student_id", studentId).in("exam_id", examRows.data.map((e: any) => e.id));
    exams = examRows.data.map((e: any) => { const m: any = (es ?? []).find((x: any) => x.exam_id === e.id); return m ? { title: String(e.title), score: m.score, total: m.total, submitted: !!m.submitted_at } : null; }).filter(Boolean) as ExamResult[];
  }
  return {
    ...report,
    live: sessionRes.data?.status === "live",
    work: (mine.data ?? []).map(asItem),
    quizzes: quizzes.map((q: any) => ({
      title: String(q.title ?? "Live quiz"),
      items: (Array.isArray(q.questions) ? q.questions : []).slice(0, q.asked).map((x: any, idx: number) => {
        const a = myAnswers.find((y) => y.quiz_id === q.id && y.idx === idx);
        return { q: String(x?.q ?? ""), options: Array.isArray(x?.options) ? x.options.map(String) : [], answer: Number(x?.answer) || 0, choice: a ? a.choice : null, correct: !!a?.correct };
      }),
    })),
    exams,
    classAverage,
  };
}
