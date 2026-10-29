// One learner's class report, read fresh from the class (server only):
// the class title and date, the teacher, the learner's name and their
// results (class-work marks + live quiz), out of what the whole class was set.
import { supabaseAdmin } from "@/lib/supabase/admin";
import { askedCount, classResults, type ResultRow } from "@/lib/classResults";

export type LearnerReport = { title: string; date: string; teacher: string; learner: string; board: boolean; row: ResultRow };

export const reportDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });

export async function learnerReport(sessionId: string, studentId: string): Promise<LearnerReport | null> {
  if (!sessionId || !studentId) return null;
  const admin = supabaseAdmin();
  const { data: s } = await admin.from("live_sessions").select("id, title, host_id, created_at, kind").eq("id", sessionId).maybeSingle();
  if (!s) return null;
  const board = s.kind === "board";
  const [hostRes, learnerRes, marksRes, quizRes] = await Promise.all([
    admin.from("profiles").select("first_name, last_name").eq("id", s.host_id).maybeSingle(),
    board
      ? admin.from("live_session_guests").select("name").eq("id", studentId).eq("session_id", sessionId).maybeSingle()
      : admin.from("profiles").select("first_name, last_name").eq("id", studentId).maybeSingle(),
    admin.from("live_class_marks").select("round_id, student_id, name, question, mark, max_mark").eq("session_id", sessionId).limit(5000),
    admin.from("live_quizzes").select("id, title, questions, status, current").eq("session_id", sessionId).limit(50),
  ]);
  const l: any = learnerRes.data;
  if (!l) return null;
  const learner = board ? String(l.name ?? "") : `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim();
  const quizzes = (quizRes.data ?? []).map((q: any) => ({ id: q.id, title: q.title, asked: askedCount(q) })).filter((q) => q.asked > 0);
  let answers: any[] = [];
  if (quizzes.length) {
    const { data } = await admin.from("live_quiz_answers").select("quiz_id, student_id, correct, points").in("quiz_id", quizzes.map((q) => q.id)).eq("student_id", studentId).limit(5000);
    answers = data ?? [];
  }
  const rows = classResults([{ id: studentId, name: learner || "Learner" }], (marksRes.data ?? []) as any, quizzes, answers);
  const row = rows.find((r) => r.id === studentId);
  if (!row) return null;
  const h: any = hostRes.data;
  return {
    title: s.title || "Interactive class", date: reportDate(s.created_at), board,
    teacher: h ? `${h.first_name ?? ""} ${h.last_name ?? ""}`.trim() : "", learner: learner || "Learner", row,
  };
}
