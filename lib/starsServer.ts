// SERVER ONLY — gathers the rows for the class leaderboard (lib/stars.ts).
import { supabaseAdmin } from "@/lib/supabase/admin";
import { leaderboard, type Standing, type StarRows } from "@/lib/stars";

const rowsOf = async <T,>(p: PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> => { const { data, error } = await p; return error ? [] : data ?? []; };

// Stars for everyone in this class ("class"), or across the teacher's board classes of the last 6 months ("all").
export async function standings(hostId: string, sessionId: string, createdAt: string, scope: "class" | "all"): Promise<{ list: Standing[]; classes: number }> {
  const admin = supabaseAdmin();
  // All this teacher's board classes in the last 6 months (or just this one).
  const since = new Date(Date.now() - 183 * 86400_000).toISOString();
  const sessions = scope === "class" ? [{ id: sessionId, created_at: createdAt }]
    : await rowsOf<{ id: string; created_at: string }>(admin.from("live_sessions").select("id, created_at").eq("host_id", hostId).gte("created_at", since).order("created_at", { ascending: false }).limit(80));
  const ids = [...new Set([sessionId, ...sessions.map((s) => s.id)])];
  const [guests, marks, quizzes, exams, games] = await Promise.all([
    rowsOf<any>(admin.from("live_session_guests").select("id, session_id, name").in("session_id", ids).eq("removed", false).limit(10000)),
    rowsOf<any>(admin.from("live_class_marks").select("session_id, student_id, name, mark, max_mark").in("session_id", ids).limit(20000)),
    rowsOf<any>(admin.from("live_quizzes").select("id, session_id").in("session_id", ids).limit(2000)),
    rowsOf<any>(admin.from("board_exams").select("id, session_id").in("session_id", ids).limit(2000)),
    rowsOf<any>(admin.from("board_game_scores").select("session_id, student_id, name, correct").in("session_id", ids).limit(20000)),
  ]);
  const quizSession = new Map(quizzes.map((q: any) => [q.id, q.session_id]));
  const examSession = new Map(exams.map((e: any) => [e.id, e.session_id]));
  const [answers, entries] = await Promise.all([
    quizzes.length ? rowsOf<any>(admin.from("live_quiz_answers").select("quiz_id, student_id, correct").in("quiz_id", [...quizSession.keys()]).limit(50000)) : [],
    exams.length ? rowsOf<any>(admin.from("board_exam_entries").select("exam_id, student_id, name, score, total").in("exam_id", [...examSession.keys()]).limit(20000)) : [],
  ]);
  const rows: StarRows = {
    sessions: sessions.map((s) => ({ id: s.id, at: s.created_at })),
    guests, marks, games,
    quiz: answers.map((a: any) => ({ session_id: quizSession.get(a.quiz_id), student_id: a.student_id, correct: a.correct })),
    exams: entries.map((e: any) => ({ session_id: examSession.get(e.exam_id), student_id: e.student_id, name: e.name, score: e.score, total: e.total })),
  };
  return { list: leaderboard(rows, sessionId), classes: ids.length };
}
