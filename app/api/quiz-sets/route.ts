import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireBoardOrStaff } from "@/lib/boardAccess";
import { limit } from "@/lib/ratelimit";
import { aiChat, aiErrorResponse, extractJson } from "@/lib/ai";
import { cleanQuestions, MAX_QUESTIONS } from "@/lib/liveQuiz";

// The quiz library: Kahoot-style quizzes prepared before class and launched
// during an interactive class. Tutors manage their own; admins see all.
//   GET            → list (no questions) · GET ?id= → one with questions
//   POST           → create { title, subject, questions } · { action: "ai", topic, subject, level, count } drafts questions
//   PATCH { id, … } → update · DELETE ?id= → delete
export const dynamic = "force-dynamic";

const MISSING = /quiz_sets/i;
const missing = () => NextResponse.json({ error: "The quiz library needs migration-live-sessions.sql — run it in Supabase." }, { status: 500 });
const fail = (m: string) => (MISSING.test(m) ? missing() : NextResponse.json({ error: m }, { status: 500 }));
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const clean = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

export async function GET(req: Request) {
  const staff = await requireBoardOrStaff();
  if (!staff) return bad("Staff only.", 403);
  const id = new URL(req.url).searchParams.get("id");
  const admin = supabaseAdmin();
  if (id) {
    const { data, error } = await admin.from("quiz_sets").select("*").eq("id", id).maybeSingle();
    if (error) return fail(error.message);
    if (!data || (staff.role !== "admin" && data.owner_id !== staff.id)) return bad("Quiz not found.", 404);
    return NextResponse.json({ set: data });
  }
  let q = admin.from("quiz_sets").select("id, title, subject, questions, owner_id, updated_at").order("updated_at", { ascending: false }).limit(200);
  if (staff.role !== "admin") q = q.eq("owner_id", staff.id);
  const { data, error } = await q;
  if (error) return fail(error.message);
  return NextResponse.json({
    sets: (data ?? []).map((s: any) => ({ id: s.id, title: s.title, subject: s.subject, count: Array.isArray(s.questions) ? s.questions.length : 0, mine: s.owner_id === staff.id, updatedAt: s.updated_at })),
  });
}

const AI_SYSTEM = `You write quick-fire classroom quiz questions for Nigerian learners (WAEC/NECO/JAMB/Common Entrance style).
Reply with JSON only: {"questions":[{"q":"...","options":["...","...","...","..."],"answer":0}]}
Rules: 4 options each, exactly one correct, "answer" is the 0-based index of the correct option, vary its position.
Questions must be short enough to read in a few seconds (max 120 characters); options max 60 characters.
No "all of the above". Use plain text (write x², √, π as characters).`;

export async function POST(req: Request) {
  const staff = await requireBoardOrStaff();
  if (!staff) return bad("Staff only.", 403);
  const body = await req.json().catch(() => null);

  if (body?.action === "ai") {
    if (!(await limit(`quiz-ai:${staff.id}`, 8, 60_000))) return bad("Give the A.I a minute.", 429);
    if (staff.role === "board_teacher" && !(await limit(`quiz-ai-day:${staff.id}`, 40, 86_400_000))) return bad("That's today's A.I limit — try again tomorrow.", 429);
    const topic = clean(body?.topic, 120);
    if (!topic) return bad("Say what the quiz is about.");
    const count = Math.max(3, Math.min(15, Math.round(Number(body?.count) || 8)));
    try {
      const text = await aiChat({
        system: AI_SYSTEM, maxTokens: 2500,
        user: `Subject: ${clean(body?.subject, 40) || "General"}. Level: ${clean(body?.level, 40) || "secondary school"}. Topic: ${topic}. Write ${count} questions.`,
      });
      const parsed = extractJson<{ questions?: unknown[] }>(text);
      const questions = cleanQuestions((parsed?.questions ?? []).map((x: any) => ({ ...x, seconds: Number(body?.seconds) || 20 })));
      if (!questions) return bad("The A.I reply wasn't usable — try again or rephrase the topic.", 502);
      return NextResponse.json({ questions });
    } catch (e) { return aiErrorResponse(e); }
  }

  const questions = cleanQuestions(body?.questions) ?? [];
  const { data, error } = await supabaseAdmin().from("quiz_sets").insert({
    owner_id: staff.id, title: clean(body?.title, 80) || "Untitled quiz", subject: clean(body?.subject, 40), questions,
  }).select("id").single();
  if (error) return fail(error.message);
  return NextResponse.json({ id: data.id });
}

async function editable(id: string, staff: { id: string; role: string }) {
  const { data, error } = await supabaseAdmin().from("quiz_sets").select("owner_id").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return !!data && (staff.role === "admin" || data.owner_id === staff.id);
}

export async function PATCH(req: Request) {
  const staff = await requireBoardOrStaff();
  if (!staff) return bad("Staff only.", 403);
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  try {
    if (!(await editable(id, staff))) return bad("Quiz not found.", 404);
  } catch (e: any) { return fail(e.message); }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body?.title !== undefined) patch.title = clean(body.title, 80) || "Untitled quiz";
  if (body?.subject !== undefined) patch.subject = clean(body.subject, 40);
  if (body?.questions !== undefined) {
    if (Array.isArray(body.questions) && body.questions.length > MAX_QUESTIONS) return bad(`A quiz can have up to ${MAX_QUESTIONS} questions.`);
    patch.questions = cleanQuestions(body.questions) ?? [];
  }
  const { error } = await supabaseAdmin().from("quiz_sets").update(patch).eq("id", id);
  if (error) return fail(error.message);
  return NextResponse.json({ ok: true, saved: Array.isArray(patch.questions) ? patch.questions.length : undefined });
}

export async function DELETE(req: Request) {
  const staff = await requireBoardOrStaff();
  if (!staff) return bad("Staff only.", 403);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  try {
    if (!(await editable(id, staff))) return bad("Quiz not found.", 404);
  } catch (e: any) { return fail(e.message); }
  const { error } = await supabaseAdmin().from("quiz_sets").delete().eq("id", id);
  if (error) return fail(error.message);
  return NextResponse.json({ ok: true });
}
