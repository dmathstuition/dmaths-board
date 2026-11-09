import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionViewer } from "@/lib/sessionAccess";
import { rateLimit } from "@/lib/ratelimit";
import { REWARD_GAME_ID, cleanReason } from "@/lib/buzzRewards";

// Rewards the teacher hands out in class (lib/buzzRewards.ts). Each one is a
// row in board_game_scores with game_id "reward", so it's a star on the
// leaderboard and on the learner's term page.
//   GET  ?sessionId=                       → { counts: { [learnerId]: n } }   (teacher)
//   POST { sessionId, to: string[], reason } → { ok, counts }                   (teacher)
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function counts(sessionId: string) {
  const { data } = await supabaseAdmin().from("board_game_scores").select("student_id").eq("session_id", sessionId).eq("game_id", REWARD_GAME_ID).limit(20000);
  const out: Record<string, number> = {};
  for (const r of data ?? []) out[r.student_id] = (out[r.student_id] ?? 0) + 1;
  return out;
}

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId") ?? "";
  const v = await sessionViewer(sessionId).catch(() => null);
  if (!v?.host) return bad("Only the teacher can see rewards.", 403);
  return NextResponse.json({ counts: await counts(sessionId) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const sessionId = String(b?.sessionId ?? "");
  const v = await sessionViewer(sessionId).catch(() => null);
  if (!v?.host) return bad("Only the teacher can give rewards.", 403);
  if (v.session.status !== "live") return bad("This class has ended.", 409);
  if (!rateLimit(`reward:${v.id}`, 40, 60_000)) return bad("That's a lot of rewards — wait a moment.", 429);
  const ids = [...new Set((Array.isArray(b?.to) ? b.to : []).filter((x: unknown) => typeof x === "string" && x).map((x: string) => x.slice(0, 80)))].slice(0, 300) as string[];
  if (!ids.length) return bad("Who is the reward for?");
  const admin = supabaseAdmin();
  // Only learners who joined this class.
  const { data: guests } = await admin.from("live_session_guests").select("id, name").eq("session_id", sessionId).eq("removed", false).in("id", ids);
  if (!guests?.length) return bad("Those learners aren't in this class.", 404);
  const reason = cleanReason(b?.reason);
  const { error } = await admin.from("board_game_scores").insert(guests.map((g) => ({
    session_id: sessionId, student_id: g.id, name: String(g.name ?? "").slice(0, 60), game_id: REWARD_GAME_ID,
    difficulty: "easy", score: 1, correct: 1, attempts: 1,
  })));
  if (error) return /board_game/i.test(error.message) ? bad("Run supabase/migration-exams-stars.sql to keep reward stars.", 501) : bad(error.message, 500);
  return NextResponse.json({ ok: true, reason, given: guests.map((g) => g.id), counts: await counts(sessionId) });
}
