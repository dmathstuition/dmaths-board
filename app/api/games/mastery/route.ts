import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";
import { findGame } from "@/lib/games/catalog";
import { fixPoints } from "@/lib/rewardRules";
import { awardPoints } from "@/lib/rewardServer";

// "Fix my mistakes" finished → the topics count as mastered, plus a few
// reward points. POST { gameId, tags[], fixed, firstTry, attempts }
export const dynamic = "force-dynamic";
const MISSING = /game_mastery/i;

export async function POST(req: Request) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!rateLimit(`mastery:${user.id}`, 20, 60_000)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  const b = await req.json().catch(() => null);
  const game = findGame(String(b?.gameId ?? ""));
  const tags: string[] = [...new Set<string>((Array.isArray(b?.tags) ? b.tags : []).map((t: unknown) => String(t).trim().slice(0, 60)).filter(Boolean))].slice(0, 8);
  if (!game || !tags.length) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  const admin = supabaseAdmin();
  const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "student") return NextResponse.json({ ok: true, points: 0 });

  const { data: existing, error } = await admin.from("game_mastery").select("tag, fixes, first_try").eq("student_id", user.id).in("tag", tags);
  if (error) return NextResponse.json({ error: MISSING.test(error.message) ? "Mastery needs migration-game-modes.sql — run it in Supabase." : error.message }, { status: 500 });
  const now = new Date().toISOString();
  const firstTry = Math.max(0, Math.min(tags.length, Math.round(Number(b?.firstTry) || 0)));
  const rows = tags.map((tag) => {
    const e = (existing ?? []).find((x: any) => x.tag === tag);
    return { student_id: user.id, tag, game_id: game.id, fixes: (e?.fixes ?? 0) + 1, first_try: (e?.first_try ?? 0) + (firstTry > 0 ? 1 : 0), last_fixed_at: now };
  });
  const { error: upErr } = await admin.from("game_mastery").upsert(rows, { onConflict: "student_id,tag" });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  const reward = await awardPoints(admin, { studentId: user.id, source: "game", ref: `fix:${game.id}:${Date.now()}`, points: fixPoints(Number(b?.fixed) || tags.length), note: `Fixed mistakes · ${game.title}` }).catch(() => ({ awarded: 0, total: null }));
  return NextResponse.json({ ok: true, mastered: tags, points: reward.awarded, total: reward.total });
}
