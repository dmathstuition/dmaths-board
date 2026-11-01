import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionViewer } from "@/lib/sessionAccess";
import { rateLimit } from "@/lib/ratelimit";
import { standings } from "@/lib/starsServer";
import { findGame } from "@/lib/games/catalog";

// The class leaderboard (lib/stars.ts):
//   GET  ?sessionId=&scope=class|all → { list }   (the teacher: this class, or all their classes)
//   POST { sessionId, gameId, difficulty, score, correct, attempts }  (a learner finished a game round)
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId") ?? "";
  const scope = url.searchParams.get("scope") === "class" ? "class" : "all";
  const v = await sessionViewer(sessionId).catch(() => null);
  if (!v?.host) return bad("Only the teacher can open the leaderboard.", 403);
  if (!rateLimit(`stars:${v.id}`, 30, 60_000)) return bad("Wait a moment and try again.", 429);
  const { list, classes } = await standings(v.session.host_id ?? v.id, sessionId, v.session.created_at, scope);
  return NextResponse.json({ list, classes }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const sessionId = String(b?.sessionId ?? "");
  const v = await sessionViewer(sessionId).catch(() => null);
  if (!v || v.host) return bad("Join the class first.", 403);
  if (v.session.status !== "live") return bad("This class has ended.", 409);
  if (!rateLimit(`game-score:${v.id}`, 20, 60_000)) return bad("Slow down a little.", 429);
  const game = findGame(String(b?.gameId ?? ""));
  if (!game) return bad("Which game?");
  const n = (x: unknown, hi: number) => Math.max(0, Math.min(hi, Math.round(Number(x) || 0)));
  const correct = n(b?.correct, 200), attempts = Math.max(correct, n(b?.attempts, 400));
  const { error } = await supabaseAdmin().from("board_game_scores").insert({
    session_id: sessionId, student_id: v.id, name: v.name.slice(0, 60), game_id: game.id,
    difficulty: ["easy", "medium", "hard"].includes(b?.difficulty) ? b.difficulty : "easy",
    score: n(b?.score, 10_000), correct, attempts,
  });
  if (error) return /board_game/i.test(error.message) ? bad("Run supabase/migration-exams-stars.sql to keep game stars.", 501) : bad(error.message, 500);
  return NextResponse.json({ ok: true });
}
