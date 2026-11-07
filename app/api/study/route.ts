import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { readReport } from "@/lib/classReportLink";
import { rateLimit } from "@/lib/ratelimit";
import { flashcardsFor, practiceFor } from "@/lib/studyServer";
import { practiceStars } from "@/lib/practice";

// A learner's study tools, opened with their signed results link (?t=, the
// same as /report — it works at home, after the class has ended):
//   GET  ?t=&what=practice  → "Fix my mistakes": { learner, title, missed, items, ai }
//   GET  ?t=&what=cards     → revision flashcards: { title, cards, ai }
//   POST { t, right, total } → stars for a finished practice round (up to 3 rounds a class)
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const link = readReport(url.searchParams.get("t"));
  if (!link) return bad("This link isn't valid — open it again from your results.", 403);
  const what = url.searchParams.get("what") === "cards" ? "cards" : "practice";
  if (!rateLimit(`study:${link.s}:${link.g}:${what}`, 20, 60 * 60_000)) return bad("You've opened this a lot — try again in a while.", 429);
  if (what === "cards") {
    const r = await flashcardsFor(link.s).catch(() => null);
    return r ? NextResponse.json(r, { headers: { "Cache-Control": "no-store" } }) : bad("This class can't be found.", 404);
  }
  if (!link.g) return bad("Open this from your own results link.", 403);
  const r = await practiceFor(link.s, link.g).catch(() => null);
  return r ? NextResponse.json(r, { headers: { "Cache-Control": "no-store" } }) : bad("Your results can't be found.", 404);
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const link = readReport(b?.t);
  if (!link?.g) return bad("This link isn't valid.", 403);
  if (!rateLimit(`study-stars:${link.s}:${link.g}`, 10, 60 * 60_000)) return bad("Slow down a little.", 429);
  const total = Math.max(0, Math.min(20, Math.round(Number(b?.total) || 0)));
  const right = Math.max(0, Math.min(total, Math.round(Number(b?.right) || 0)));
  const admin = supabaseAdmin();
  const { data: guest } = await admin.from("live_session_guests").select("name").eq("id", link.g).eq("session_id", link.s).maybeSingle();
  if (!guest) return bad("Your results can't be found.", 404);
  const done = await admin.from("board_game_scores").select("id", { count: "exact", head: true }).eq("session_id", link.s).eq("student_id", link.g).eq("game_id", "practice");
  if (done.error) return bad("Stars aren't set up yet — ask your teacher.", 501);
  if ((done.count ?? 0) >= 3) return NextResponse.json({ ok: true, stars: 0, note: "You've already earned stars for practice in this class — keep practising anyway!" });
  const { error } = await admin.from("board_game_scores").insert({ session_id: link.s, student_id: link.g, name: String(guest.name ?? "").slice(0, 60), game_id: "practice", difficulty: "medium", score: right * 10, correct: right, attempts: total });
  if (error) return bad("Couldn't save your stars — try again.", 500);
  return NextResponse.json({ ok: true, stars: practiceStars(right) });
}
