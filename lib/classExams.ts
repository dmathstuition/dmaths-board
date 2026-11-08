// SERVER ONLY — a class's exams and every learner's mark in them, for the class
// results (teacher), "My results" (learner) and the parent report.
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ExamInfo, ExamEntryRow } from "@/lib/classResults";
import type { ExamQ } from "@/lib/exams";

export type ClassExam = ExamInfo & { review: boolean; questions: ExamQ[]; createdAt: string };
export async function classExams(sessionId: string): Promise<{ exams: ClassExam[]; entries: ExamEntryRow[] }> {
  const admin = supabaseAdmin();
  const { data, error } = await admin.from("board_exams").select("id, title, questions, review, created_at").eq("session_id", sessionId).order("created_at").limit(20);
  if (error || !data?.length) return { exams: [], entries: [] }; // none, or exams aren't set up yet
  const exams: ClassExam[] = data.map((e: any) => {
    const questions: ExamQ[] = Array.isArray(e.questions) ? e.questions : [];
    return { id: e.id, title: String(e.title ?? "Exam"), total: questions.reduce((a, q) => a + (Number(q.marks) || 0), 0), review: e.review !== false, questions, createdAt: String(e.created_at ?? "") };
  });
  const { data: es } = await admin.from("board_exam_entries").select("exam_id, student_id, name, score, total, submitted_at").in("exam_id", exams.map((e) => e.id)).limit(10_000);
  const entries: ExamEntryRow[] = (es ?? []).map((r: any) => ({ exam_id: r.exam_id, student_id: r.student_id, name: String(r.name ?? ""), score: r.score, total: r.total, submitted: !!r.submitted_at }));
  return { exams, entries };
}
