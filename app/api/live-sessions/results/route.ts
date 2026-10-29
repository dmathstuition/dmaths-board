import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionViewer } from "@/lib/sessionAccess";
import { rateLimit } from "@/lib/ratelimit";
import { askedCount } from "@/lib/classResults";

// Class results for the teacher (supabase/migration-class-marks.sql):
//   GET    ?id=          → class-work marks + the class's live quizzes and answers
//   POST   { id, action: "mark", roundId, question, studentId, name, mark, max }
//          { id, action: "unmark", roundId, studentId }
//   DELETE ?id=          → delete this class's marks and quiz results
// Only the class's host.
export const dynamic = "force-dynamic";
const MISSING = /live_class_marks/i;
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);

async function host(id: string) {
  const v = await sessionViewer(id).catch(() => null);
  return v?.host ? v : null;
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!(await host(id))) return bad("Only the class's teacher can see the results.", 403);
  const admin = supabaseAdmin();
  const [marksRes, quizRes] = await Promise.all([
    admin.from("live_class_marks").select("round_id, student_id, name, question, mark, max_mark").eq("session_id", id).limit(5000),
    admin.from("live_quizzes").select("id, title, questions, status, current").eq("session_id", id).order("created_at", { ascending: true }).limit(50),
  ]);
  const ready = !marksRes.error;
  const quizzes = (quizRes.data ?? []).map((q: any) => ({ id: q.id, title: q.title, asked: askedCount(q) })).filter((q) => q.asked > 0);
  let answers: unknown[] = [];
  if (quizzes.length) {
    const { data } = await admin.from("live_quiz_answers").select("quiz_id, student_id, correct, points").in("quiz_id", quizzes.map((q) => q.id)).limit(20000);
    answers = data ?? [];
  }
  return NextResponse.json({ ready, marks: marksRes.data ?? [], quizzes, answers }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  const v = await host(id);
  if (!v) return bad("Only the class's teacher can give marks.", 403);
  if (!rateLimit(`marks:${v.id}`, 600, 60_000)) return bad("Slow down a little.", 429);
  const roundId = clip(body?.roundId, 40), studentId = clip(body?.studentId, 60);
  if (!roundId || !studentId) return bad("Which answer?");
  const admin = supabaseAdmin();
  if (body?.action === "unmark") {
    const { error } = await admin.from("live_class_marks").delete().eq("session_id", id).eq("round_id", roundId).eq("student_id", studentId);
    if (error) return MISSING.test(error.message) ? bad("missing", 501) : bad(error.message, 500);
    return NextResponse.json({ ok: true });
  }
  const max = Math.max(1, Math.min(100, Math.round(Number(body?.max) || 1)));
  const mark = Math.max(0, Math.min(max, Math.round(Number(body?.mark) || 0)));
  const { error } = await admin.from("live_class_marks").upsert({
    session_id: id, round_id: roundId, student_id: studentId, name: clip(body?.name, 60), question: clip(body?.question, 200),
    mark, max_mark: max, marked_at: new Date().toISOString(),
  }, { onConflict: "session_id,round_id,student_id" });
  if (error) return MISSING.test(error.message) ? bad("missing", 501) : bad(error.message, 500);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!(await host(id))) return bad("Only the class's teacher can delete the results.", 403);
  const admin = supabaseAdmin();
  // Quiz answers go with their quizzes; marks are deleted directly.
  const [m, q] = await Promise.all([
    admin.from("live_class_marks").delete().eq("session_id", id),
    admin.from("live_quizzes").delete().eq("session_id", id),
  ]);
  if (q.error) return bad(q.error.message, 500);
  if (m.error && !MISSING.test(m.error.message)) return bad(m.error.message, 500);
  return NextResponse.json({ ok: true });
}
