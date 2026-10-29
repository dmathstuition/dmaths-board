import { notifyAdminsOfActivity } from "@/lib/adminActivity";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionViewer, type SessionViewer } from "@/lib/sessionAccess";
import { rateLimit } from "@/lib/ratelimit";
import { isBoardSession, isOpen, shortName } from "@/lib/liveSession";
import { canAnswer, cleanQuestions, leaderboard, nextPatch, revealDue, scoreAnswer, streakBefore, viewFor, type AnswerRow, type QuizRow } from "@/lib/liveQuiz";
import { liveQuizPoints } from "@/lib/rewardRules";
import { awardPoints } from "@/lib/rewardServer";

// Kahoot-style live quiz inside an interactive class session.
//   GET ?sessionId= → the session's current quiz as this viewer may see it
//   POST { action } → launch (host, from a quiz set or typed questions) ·
//                     next · reveal · end (host) · answer (learner)
// Clients refetch when a realtime "quiz-changed" ping arrives, and poll as a fallback.
export const dynamic = "force-dynamic";

const MISSING = /live_quiz|live_session|quiz_sets|session_id|streak/i;
const missing = () => NextResponse.json({ error: "Live quizzes need migration-live-sessions.sql — run it in Supabase." }, { status: 500 });
const fail = (msg: string) => (MISSING.test(msg) ? missing() : NextResponse.json({ error: msg }, { status: 500 }));
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function currentQuiz(sessionId: string): Promise<QuizRow | null> {
  const { data, error } = await supabaseAdmin().from("live_quizzes").select("*")
    .eq("session_id", sessionId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  // Keep a finished quiz's podium up for a while, then clear the stage.
  if (data && data.status === "ended" && Date.now() - new Date(data.ended_at ?? data.created_at).getTime() > 2 * 3600_000) return null;
  return data as QuizRow | null;
}

// In a big class every phone asks for the quiz every few seconds. The part
// they all share (answers, names, head count) is read once and reused for a
// moment by this server; each person's own view is still built just for them.
type Shared = { answers: AnswerRow[]; names: Map<string, string>; count: number };
const SHARED_MS = 1500;
const shared = new Map<string, { at: number; data: Promise<Shared> }>();
function forgetShared(quizId: string) { shared.delete(quizId); }

async function loadShared(quiz: QuizRow, v: SessionViewer): Promise<Shared> {
  const admin = supabaseAdmin();
  const [{ data: answers }, count] = await Promise.all([
    admin.from("live_quiz_answers").select("idx, student_id, choice, correct, ms, points, streak").eq("quiz_id", quiz.id),
    rosterCount(v.session.id),
  ]);
  const ids = [...new Set((answers ?? []).map((a: any) => a.student_id))];
  const [{ data: people }, { data: guests }] = await Promise.all([
    ids.length ? admin.from("profiles").select("id, first_name, last_name").in("id", ids) : Promise.resolve({ data: [] as any[] }),
    ids.length && isBoardSession(v.session) ? admin.from("live_session_guests").select("id, name").in("id", ids) : Promise.resolve({ data: [] as any[] }),
  ]);
  const names = new Map<string, string>([...(people ?? []).map((p: any) => [p.id, shortName(p)] as [string, string]), ...(guests ?? []).map((g: any) => [g.id, g.name] as [string, string])]);
  return { answers: (answers ?? []) as AnswerRow[], names, count };
}

async function snapshot(quiz: QuizRow, v: SessionViewer) {
  const hit = shared.get(quiz.id);
  let data: Promise<Shared>;
  if (hit && Date.now() - hit.at < SHARED_MS) data = hit.data;
  else {
    data = loadShared(quiz, v);
    shared.set(quiz.id, { at: Date.now(), data });
    data.catch(() => forgetShared(quiz.id));
    if (shared.size > 300) for (const [k, e] of shared) if (Date.now() - e.at > SHARED_MS) shared.delete(k);
  }
  const { answers, names, count } = await data;
  return viewFor(quiz, answers, names, { host: v.host, id: v.id }, count);
}

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId") ?? "";
  try {
    const v = await sessionViewer(sessionId);
    if (!v) return bad("You're not in this class.", 403);
    const quiz = await currentQuiz(sessionId);
    return NextResponse.json({ quiz: quiz ? await snapshot(quiz, v) : null, host: v.host, serverNow: Date.now() });
  } catch (e: any) { return fail(e?.message ?? String(e)); }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");
  const admin = supabaseAdmin();
  try {
    if (action === "launch") {
      const sessionId = String(body?.sessionId ?? "");
      const v = await sessionViewer(sessionId);
      if (!v?.host) return bad("Only the host can launch a quiz.", 403);
      if (!isOpen(v.session)) return bad("This class has ended.", 409);
      let title = String(body?.title ?? "").trim().slice(0, 80);
      let questions = cleanQuestions(body?.questions);
      const setId = body?.setId ? String(body.setId) : null;
      if (setId) {
        const { data: set, error } = await admin.from("quiz_sets").select("title, questions").eq("id", setId).maybeSingle();
        if (error) throw new Error(error.message);
        if (!set) return bad("That quiz was deleted.", 404);
        questions = cleanQuestions(set.questions);
        title = title || set.title;
      }
      if (!questions) return bad("That quiz has no complete questions yet — each needs 2–4 options and a correct answer.");
      // One quiz on stage at a time.
      const now = new Date().toISOString();
      await admin.from("live_quizzes").update({ status: "ended", ended_at: now }).eq("session_id", sessionId).neq("status", "ended");
      const { data, error } = await admin.from("live_quizzes").insert({
        session_id: sessionId, class_id: v.session.class_id, set_id: setId, host_id: v.id, title: title || "Quick quiz", questions,
      }).select("*").single();
      if (error) throw new Error(error.message);
      await admin.from("audit_log").insert({ actor_id: v.id, action: "live_quiz_created", detail: { sessionId, classId: v.session.class_id, quizId: data.id, setId, questions: questions.length } });
      return NextResponse.json({ quiz: await snapshot(data as QuizRow, v) });
    }

    const quizId = String(body?.quizId ?? "");
    const { data: quiz, error } = await admin.from("live_quizzes").select("*").eq("id", quizId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!quiz?.session_id) return bad("Quiz not found.", 404);
    const v = await sessionViewer(quiz.session_id);
    if (!v) return bad("You're not in this class.", 403);
    const q = quiz as QuizRow;

    if (action === "answer") {
      if (v.host) return bad("Hosts don't answer.");
      if (!rateLimit(`live-quiz:${v.id}`, 30, 60_000)) return bad("Slow down a little.", 429);
      const idx = Math.round(Number(body?.idx)), choice = Math.round(Number(body?.choice));
      if (!canAnswer(q, idx)) return bad("Time's up for that question.", 409);
      const question = q.questions[idx];
      if (!(choice >= 0 && choice < question.options.length)) return bad("Pick one of the options.");
      const ms = Math.max(0, Date.now() - new Date(q.started_at!).getTime());
      const correct = choice === question.answer;
      const { data: prior } = await admin.from("live_quiz_answers").select("idx, student_id, correct").eq("quiz_id", q.id).eq("student_id", v.id);
      const scored = scoreAnswer(correct, ms, question.seconds, streakBefore((prior ?? []) as AnswerRow[], v.id, idx));
      const { error: insErr } = await admin.from("live_quiz_answers").insert({
        quiz_id: q.id, idx, student_id: v.id, choice, correct, ms, points: scored.points, streak: scored.streak,
      });
      if (insErr && insErr.code === "23505") return bad("You've already answered.", 409);
      forgetShared(q.id); // so this answer shows straight away
      if (insErr) throw new Error(insErr.message);
      return NextResponse.json({ ok: true, quiz: await snapshot(q, v) });
    }

    if (!v.host) return bad("Only the host can do that.", 403);
    const now = new Date().toISOString();
    let patch: Partial<QuizRow> | null = null;
    if (action === "next") patch = nextPatch(q, now);
    else if (action === "reveal") {
      // An automatic reveal only goes through once the timer has really run
      // out (server clock) or everyone has answered; "Skip timer" is manual.
      if (q.status === "question" && body?.auto && !revealDue(q, await answeredCount(q.id, q.current), await rosterCount(v.session.id))) {
        return NextResponse.json({ quiz: await snapshot(q, v) });
      }
      patch = q.status === "question" ? { status: "reveal" } : null;
    }
    else if (action === "end") patch = { status: "ended", ended_at: now };
    if (!patch) return NextResponse.json({ quiz: await snapshot(q, v) });

    // Only move on from the phase the host was looking at, so a double-click
    // (or the auto-reveal racing a click) can't skip a question.
    const { data: updated, error: upErr } = await admin.from("live_quizzes").update(patch)
      .eq("id", q.id).eq("status", q.status).eq("current", q.current).select("*").maybeSingle();
    if (upErr) throw new Error(upErr.message);
    if (!updated) {
      const { data: fresh } = await admin.from("live_quizzes").select("*").eq("id", q.id).maybeSingle();
      return NextResponse.json({ quiz: await snapshot((fresh ?? q) as QuizRow, v) });
    }
    // Reward points are an academy thing — D-Maths Board guests have no account to add them to.
    if ((updated as QuizRow).status === "ended" && !isBoardSession(v.session)) await rewardPlayers(q.id);
    return NextResponse.json({ quiz: await snapshot(updated as QuizRow, v) });
  } catch (e: any) { return fail(e?.message ?? String(e)); }
}

// Reward points when a quiz ends: podium places, and a little for everyone who
// got at least one right (lib/rewardRules.ts). Once per learner per quiz.
async function rewardPlayers(quizId: string) {
  try {
    const admin = supabaseAdmin();
    const { data: answers } = await admin.from("live_quiz_answers").select("idx, student_id, correct, points").eq("quiz_id", quizId);
    const board = leaderboard((answers ?? []) as AnswerRow[], new Map());
    await Promise.all(board.map((s, i) => awardPoints(admin, {
      studentId: s.studentId, source: "live_quiz", ref: quizId, points: liveQuizPoints(i + 1, s.correct), note: i < 3 ? `Place ${i + 1}` : "Took part",
    }).catch(() => null)));
    const { data: quiz } = await admin.from("live_quizzes").select("title, questions").eq("id", quizId).maybeSingle();
    const asked = Array.isArray(quiz?.questions) ? quiz!.questions.length : 0;
    for (const [i, st] of board.entries()) {
      await notifyAdminsOfActivity(admin, { studentId: st.studentId, activity: `Live quiz: ${quiz?.title ?? "class quiz"}`, score: `${st.correct}/${asked || st.answered}`,
        percent: asked ? (st.correct / asked) * 100 : null, detail: `Place ${i + 1} of ${board.length} · ${st.points} points.` });
    }
  } catch { /* points are a bonus — never fail the quiz over them */ }
}

async function answeredCount(quizId: string, idx: number) {
  const { count } = await supabaseAdmin().from("live_quiz_answers").select("student_id", { count: "exact", head: true }).eq("quiz_id", quizId).eq("idx", idx);
  return count ?? 0;
}
// Learners in the class: academy learners, or guests in a D-Maths Board class.
async function rosterCount(sessionId: string) {
  const admin = supabaseAdmin();
  const [a, g] = await Promise.all([
    admin.from("live_session_participants").select("student_id", { count: "exact", head: true }).eq("session_id", sessionId).eq("removed", false),
    admin.from("live_session_guests").select("id", { count: "exact", head: true }).eq("session_id", sessionId).eq("removed", false),
  ]);
  return (a.count ?? 0) + (g.error ? 0 : g.count ?? 0);
}
