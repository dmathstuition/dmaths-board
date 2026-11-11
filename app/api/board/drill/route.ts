import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionViewer } from "@/lib/sessionAccess";
import { rateLimit } from "@/lib/ratelimit";
import { DRILL_GAME_ID } from "@/lib/tablesDrill";

// A finished times-table drill (lib/tablesDrill.ts). The teacher's screen did
// the marking, so the teacher's screen saves it: one row in board_game_scores,
// which counts for stars like a game round.
//   POST { sessionId, student, correct, attempts } → { ok }   (teacher)
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const whole = (x: unknown, hi: number) => { const n = Math.round(Number(x)); return Number.isFinite(n) ? Math.min(hi, Math.max(0, n)) : 0; };

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const sessionId = String(b?.sessionId ?? ""), student = String(b?.student ?? "").slice(0, 80);
  const v = await sessionViewer(sessionId).catch(() => null);
  if (!v?.host) return bad("Only the teacher can save a drill.", 403);
  if (v.session.status !== "live") return bad("This class has ended.", 409);
  if (!rateLimit(`drill:${v.id}`, 120, 60_000)) return bad("Too many drills at once — wait a moment.", 429);
  const attempts = whole(b?.attempts, 60), correct = Math.min(attempts, whole(b?.correct, 60));
  if (!student || !attempts) return bad("Whose drill is it?");
  const admin = supabaseAdmin();
  const { data: guest } = await admin.from("live_session_guests").select("id, name").eq("session_id", sessionId).eq("removed", false).eq("id", student).maybeSingle();
  if (!guest) return bad("That learner isn't in this class.", 404);
  const { error } = await admin.from("board_game_scores").insert({
    session_id: sessionId, student_id: guest.id, name: String(guest.name ?? "").slice(0, 60), game_id: DRILL_GAME_ID, difficulty: "easy", score: correct, correct, attempts,
  });
  if (error) return /board_game/i.test(error.message) ? bad("Run supabase/migration-exams-stars.sql to keep drill stars.", 501) : bad(error.message, 500);
  return NextResponse.json({ ok: true });
}
