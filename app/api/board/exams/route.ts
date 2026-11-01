import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionViewer } from "@/lib/sessionAccess";
import { rateLimit } from "@/lib/ratelimit";
import { AI_EXAM_SYSTEM, GRACE_MS, aiExamPrompt, cleanAiExam, cleanExamQuestions, cleanGiven, learnerPaper, markPaper, type ExamQ } from "@/lib/exams";
import { aiChat, aiErrorResponse, extractJson } from "@/lib/ai";

// Exam mode (supabase/migration-exams-stars.sql). Each learner takes the test
// on their own phone, in their own order; the answers stay on the server
// until the exam ends, and marking happens here.
//   GET  ?sessionId=                → the class's exam: the teacher gets everything and every
//                                     learner's progress; a learner gets their own paper
//   POST { action: "create", sessionId, title, minutes, review, questions }   (teacher)
//        { action: "close" | "extend", examId, minutes? }                      (teacher)
//        { action: "ai", sessionId, topic, level, count, kind, difficulty }     (teacher: the A.I writes questions → { questions })
//        { action: "start" | "submit", examId }                                (learner)
//        { action: "answer", examId, n, value }   n = question number          (learner)
//        { action: "flag", examId, reason }       left the exam page            (learner)
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const MISSING = /board_exam/i;
const dbFail = (msg: string) => MISSING.test(msg) ? bad("Exam mode needs supabase/migration-exams-stars.sql — run it in Supabase.", 501) : bad(msg, 500);

type ExamRow = { id: string; session_id: string; title: string; questions: ExamQ[]; minutes: number; review: boolean; status: "open" | "closed"; created_at: string; ends_at: string; closed_at: string | null };
type EntryRow = { exam_id: string; student_id: string; name: string; answers: Record<string, unknown>; flags: number; flag_log: { at: string; reason: string }[]; started_at: string; submitted_at: string | null; score: number | null; total: number | null };

const over = (e: ExamRow, now = Date.now()) => e.status === "closed" || now > new Date(e.ends_at).getTime() + GRACE_MS;

async function latestExam(sessionId: string): Promise<ExamRow | null> {
  const { data, error } = await supabaseAdmin().from("board_exams").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data as ExamRow | null;
}
async function examById(id: string): Promise<ExamRow | null> {
  const { data, error } = await supabaseAdmin().from("board_exams").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as ExamRow | null;
}
// Mark every unsubmitted paper when time is up or the teacher ends the exam.
async function closeExam(e: ExamRow) {
  const admin = supabaseAdmin();
  if (e.status !== "closed") await admin.from("board_exams").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", e.id);
  const { data } = await admin.from("board_exam_entries").select("*").eq("exam_id", e.id).is("submitted_at", null);
  for (const row of (data ?? []) as EntryRow[]) {
    const m = markPaper(e.questions, row.answers ?? {});
    await admin.from("board_exam_entries").update({ submitted_at: new Date().toISOString(), score: m.score, total: m.total }).eq("exam_id", e.id).eq("student_id", row.student_id);
  }
  e.status = "closed";
}

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId") ?? "";
  const v = await sessionViewer(sessionId).catch(() => null);
  if (!v) return bad("Join the class first.", 403);
  try {
    const e = await latestExam(sessionId);
    if (!e) return NextResponse.json({ exam: null });
    if (e.status === "open" && over(e)) await closeExam(e);
    const admin = supabaseAdmin();
    const meta = { id: e.id, title: e.title, minutes: e.minutes, review: e.review, status: e.status, endsAt: new Date(e.ends_at).getTime(), count: e.questions.length, total: e.questions.reduce((s, q) => s + q.marks, 0) };
    if (v.host) {
      const { data } = await admin.from("board_exam_entries").select("*").eq("exam_id", e.id).limit(500);
      const entries = ((data ?? []) as EntryRow[]).map((r) => ({
        id: r.student_id, name: r.name, answered: Object.values(r.answers ?? {}).filter((x) => x != null && x !== "").length,
        flags: r.flags, flagLog: (r.flag_log ?? []).slice(-10), submitted: !!r.submitted_at, score: r.score, total: r.total,
        live: r.submitted_at ? null : markPaper(e.questions, r.answers ?? {}).score, // what they'd get now
      }));
      return NextResponse.json({ exam: { ...meta, questions: e.questions }, entries }, { headers: { "Cache-Control": "no-store" } });
    }
    const { data: mine } = await admin.from("board_exam_entries").select("*").eq("exam_id", e.id).eq("student_id", v.id).maybeSingle();
    const entry = mine as EntryRow | null;
    // An exam that ended more than 2 hours ago and they never started: nothing to show.
    if (!entry && e.status === "closed") return NextResponse.json({ exam: null });
    const out: any = { exam: meta, entry: entry ? { started: true, submitted: !!entry.submitted_at, answers: entry.answers ?? {}, flags: entry.flags, score: entry.score, total: entry.total } : null };
    if (entry && !entry.submitted_at && e.status === "open") out.paper = learnerPaper(e.id, v.id, e.questions);
    // Once it's over (and the teacher allows it): their answers against the right ones.
    if (entry && e.status === "closed" && e.review) {
      const m = markPaper(e.questions, entry.answers ?? {});
      out.review = e.questions.map((q, i) => ({ q: q.q, kind: q.kind, options: q.options, answer: q.answer, given: (entry.answers ?? {})[String(i)] ?? null, right: m.right[i], marks: q.marks }));
    }
    return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) { return dbFail(String(err?.message ?? err)); }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");
  const admin = supabaseAdmin();
  try {
    if (action === "ai") {
      const v = await sessionViewer(String(body?.sessionId ?? "")).catch(() => null);
      if (!v?.host) return bad("Only the class's teacher can set an exam.", 403);
      const topic = String(body?.topic ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
      if (topic.length < 3) return bad("Say what the questions should be on, e.g. \"Simultaneous equations\".");
      if (!rateLimit(`exam-ai:${v.id}`, 6, 60_000)) return bad("Give the A.I a minute before asking again.", 429);
      if (!rateLimit(`exam-ai-day:${v.id}`, 60, 86_400_000)) return bad("That's today's A.I question limit — try again tomorrow.", 429);
      const kind = ["choice", "typed"].includes(body?.kind) ? body.kind : "mixed";
      const ask = { topic, level: String(body?.level ?? "").slice(0, 60), count: Math.max(1, Math.min(30, Math.round(Number(body?.count) || 10))), kind,
        difficulty: ["easy", "medium", "hard"].includes(body?.difficulty) ? body.difficulty : "medium" } as const;
      let questions: ExamQ[];
      try {
        const reply = await aiChat({ system: AI_EXAM_SYSTEM, user: aiExamPrompt(ask), maxTokens: Math.min(6000, 400 + ask.count * 220) });
        questions = cleanAiExam(extractJson(reply), kind).slice(0, ask.count);
      } catch (err) { return aiErrorResponse(err); }
      if (!questions.length) return bad("The A.I reply wasn't usable — try again, or word the topic differently.", 502);
      return NextResponse.json({ questions });
    }
    if (action === "create") {
      const sessionId = String(body?.sessionId ?? "");
      const v = await sessionViewer(sessionId).catch(() => null);
      if (!v?.host) return bad("Only the class's teacher can set an exam.", 403);
      if (v.session.status !== "live") return bad("This class has ended.", 409);
      if (!rateLimit(`exam-create:${v.id}`, 10, 60_000)) return bad("Wait a moment and try again.", 429);
      const questions = cleanExamQuestions(body?.questions);
      if (!questions.length) return bad("Add at least one question.");
      const minutes = Math.max(1, Math.min(180, Math.round(Number(body?.minutes) || 20)));
      const open = await latestExam(sessionId);
      if (open?.status === "open") await closeExam(open); // one exam at a time
      const { data, error } = await admin.from("board_exams").insert({
        session_id: sessionId, host_id: v.id, title: String(body?.title ?? "Class test").slice(0, 120) || "Class test",
        questions, minutes, review: body?.review !== false, status: "open", ends_at: new Date(Date.now() + minutes * 60_000).toISOString(),
      }).select("id").single();
      if (error) return dbFail(error.message);
      return NextResponse.json({ id: data.id });
    }

    const e = await examById(String(body?.examId ?? ""));
    if (!e) return bad("That exam isn't there any more.", 404);
    const v = await sessionViewer(e.session_id).catch(() => null);
    if (!v) return bad("Join the class first.", 403);

    if (action === "close" || action === "extend") {
      if (!v.host) return bad("Only the teacher can do that.", 403);
      if (action === "close") { await closeExam(e); return NextResponse.json({ ok: true }); }
      if (e.status !== "open") return bad("This exam has ended.", 409);
      const add = Math.max(1, Math.min(60, Math.round(Number(body?.minutes) || 5)));
      const ends = Math.max(Date.now(), new Date(e.ends_at).getTime()) + add * 60_000;
      const { error } = await admin.from("board_exams").update({ ends_at: new Date(ends).toISOString(), minutes: Math.min(180, e.minutes + add) }).eq("id", e.id);
      if (error) return dbFail(error.message);
      return NextResponse.json({ ok: true });
    }

    if (v.host) return bad("The teacher doesn't take the exam.", 403);
    if (!rateLimit(`exam:${v.id}`, 240, 60_000)) return bad("Slow down a little.", 429);
    const { data: row } = await admin.from("board_exam_entries").select("*").eq("exam_id", e.id).eq("student_id", v.id).maybeSingle();
    const entry = row as EntryRow | null;

    if (action === "start") {
      if (over(e)) return bad("This exam has ended.", 409);
      if (!entry) {
        const { error } = await admin.from("board_exam_entries").insert({ exam_id: e.id, student_id: v.id, name: v.name.slice(0, 60) });
        if (error && !/duplicate/i.test(error.message)) return dbFail(error.message);
      }
      return NextResponse.json({ ok: true });
    }
    if (!entry) return bad("Start the exam first.", 409);

    if (action === "flag") {
      const reason = String(body?.reason ?? "left the exam page").slice(0, 60);
      if (entry.submitted_at || e.status !== "open") return NextResponse.json({ ok: true });
      const log = [...(entry.flag_log ?? []), { at: new Date().toISOString(), reason }].slice(-50);
      await admin.from("board_exam_entries").update({ flags: entry.flags + 1, flag_log: log }).eq("exam_id", e.id).eq("student_id", v.id);
      return NextResponse.json({ ok: true });
    }
    if (entry.submitted_at) return bad("You've already handed in this exam.", 409);
    if (over(e)) { await closeExam(e); return bad("Time's up — your answers have been handed in.", 409); }

    if (action === "answer") {
      const n = Math.round(Number(body?.n));
      if (!(n >= 0 && n < e.questions.length)) return bad("Which question?");
      const answers = { ...(entry.answers ?? {}), [String(n)]: cleanGiven(body?.value) };
      const { error } = await admin.from("board_exam_entries").update({ answers }).eq("exam_id", e.id).eq("student_id", v.id);
      if (error) return dbFail(error.message);
      return NextResponse.json({ ok: true });
    }
    if (action === "submit") {
      const m = markPaper(e.questions, entry.answers ?? {});
      const { error } = await admin.from("board_exam_entries").update({ submitted_at: new Date().toISOString(), score: m.score, total: m.total }).eq("exam_id", e.id).eq("student_id", v.id);
      if (error) return dbFail(error.message);
      return NextResponse.json({ ok: true, score: m.score, total: m.total });
    }
    return bad("Unknown request.");
  } catch (err: any) { return dbFail(String(err?.message ?? err)); }
}
