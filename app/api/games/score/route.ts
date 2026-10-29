import { notifyAdminsOfActivity } from "@/lib/adminActivity";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";
import { findGame, MAX_SCORE } from "@/lib/games/catalog";
import { cleanTags, gameStat, type Round } from "@/lib/games/performance";
import { ADVENTURE_CHAPTER_POINTS, gamePoints } from "@/lib/rewardRules";
import { adventureProgress, findStop, stageOfLevel, type StopRound } from "@/lib/games/adventure";
import { starsFor } from "@/lib/games/catalog";
import { awardPoints } from "@/lib/rewardServer";
import { maxRoundScore } from "@/lib/games/powerups";

// A learner finished a round of a class game. Only counts if the game is
// pushed to the learner's class; the difficulty comes from that assignment,
// never from the client. POST { gameId, score, correct, attempts, avgMs?, tags? }
// Replies with the learner's updated rating and tier for this game.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!rateLimit(`game-score:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const game = findGame(String(body?.gameId ?? ""));
  if (!game) return NextResponse.json({ error: "Unknown game." }, { status: 400 });

  const attempts = Math.max(0, Math.min(1000, Math.round(Number(body?.attempts) || 0)));
  const correct = Math.max(0, Math.min(attempts, Math.round(Number(body?.correct) || 0)));
  const score = Math.max(0, Math.min(MAX_SCORE, Math.round(Number(body?.score) || 0)));
  // Each correct answer is worth at most 30 points (10 + max combo bonus), doubled
  // on a lightning or comeback question, plus a bonus chest every 10.
  if (score > maxRoundScore(correct)) return NextResponse.json({ error: "That score doesn't add up." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: me } = await admin.from("profiles").select("role, level").eq("id", user.id).maybeSingle();
  if (me?.role !== "student") return NextResponse.json({ error: "Only learners' scores are saved." }, { status: 403 });
  const level = String(me?.level ?? "");

  // An Adventure-map stop sets its own difficulty and must be unlocked;
  // otherwise the game has to be pushed to the learner's class.
  const stopId = typeof body?.stopId === "string" ? body.stopId : "";
  let assignment: { difficulty: string } | null = null;
  let adventureBefore: ReturnType<typeof adventureProgress> | null = null;
  let adventureRounds: StopRound[] = [];
  const found = stopId ? findStop(stopId) : null;
  if (stopId) {
    if (!found || found.stop.gameId !== game.id || found.stage !== stageOfLevel(level)) return NextResponse.json({ error: "That adventure stop isn't on your map." }, { status: 400 });
    const { data: rounds, error: rErr } = await admin.from("game_scores").select("stop_id, correct, attempts").eq("student_id", user.id).not("stop_id", "is", null);
    if (rErr) return NextResponse.json({ error: /stop_id/i.test(rErr.message) ? "The Adventure map needs migration-game-modes.sql — run it in Supabase." : rErr.message }, { status: 500 });
    adventureRounds = (rounds ?? []) as StopRound[];
    adventureBefore = adventureProgress(found.stage, adventureRounds);
    const here = adventureBefore.flatMap((c) => c.stops).find((s) => s.id === stopId);
    if (!here?.unlocked) return NextResponse.json({ error: "Clear the stops before this one first." }, { status: 403 });
    assignment = { difficulty: found.stop.difficulty };
  } else {
    const { data, error: aErr } = await admin.from("game_assignments")
      .select("difficulty").eq("game_id", game.id).eq("level", level).maybeSingle();
    if (aErr) return NextResponse.json({ error: "Class games aren't set up yet." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "This game isn't switched on for your class." }, { status: 403 });
    assignment = data;
  }

  const avgMs = Math.max(0, Math.min(600_000, Math.round(Number(body?.avgMs) || 0))) || null;
  const tags = cleanTags(body?.tags);

  // Recent rounds of this game, for the best score and the before/after rating.
  const { data: recent } = await admin.from("game_scores").select("score, correct, attempts, created_at")
    .eq("student_id", user.id).eq("game_id", game.id)
    .order("created_at", { ascending: false }).limit(30);
  const { data: top } = await admin.from("game_scores").select("score")
    .eq("student_id", user.id).eq("game_id", game.id)
    .order("score", { ascending: false }).limit(1).maybeSingle();
  const best = Number(top?.score ?? 0);

  const row = { student_id: user.id, game_id: game.id, level, difficulty: assignment.difficulty, score, correct, attempts };
  const stopCol = stopId ? { stop_id: stopId } : {};
  let { error } = await admin.from("game_scores").insert({ ...row, ...stopCol, avg_ms: avgMs, tags });
  // Before migration-game-stats.sql the extra columns don't exist — save the basics.
  if (error && /avg_ms|tags/i.test(error.message)) ({ error } = await admin.from("game_scores").insert({ ...row, ...stopCol }));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Adventure: did this round clear the stop, or finish the chapter?
  let adventure: Record<string, unknown> = {};
  if (found && adventureBefore) {
    const after = adventureProgress(found.stage, [...adventureRounds, { stop_id: stopId, correct, attempts }]);
    const chBefore = adventureBefore.find((c) => c.id === found.chapter.id)!;
    const chAfter = after.find((c) => c.id === found.chapter.id)!;
    const stopBefore = chBefore.stops.find((x) => x.id === stopId)!;
    adventure = { stars: starsFor(correct, attempts, game.seconds), stopNeed: found.stop.need, stopCleared: !stopBefore.cleared && chAfter.stops.find((x) => x.id === stopId)!.cleared };
    if (!chBefore.complete && chAfter.complete) {
      const bonus = await awardPoints(admin, { studentId: user.id, source: "adventure", ref: found.chapter.id, points: ADVENTURE_CHAPTER_POINTS, note: found.chapter.title }).catch(() => ({ awarded: 0 }));
      adventure.chapterComplete = { id: found.chapter.id, title: `${found.chapter.emoji} ${found.chapter.title}`, points: bonus.awarded };
    }
  }

  const past = (recent ?? []) as Round[];
  const before = past.length ? gameStat(game, past.map((r) => ({ ...r, game_id: game.id }))) : null;
  const after = gameStat(game, [...past, { ...row, created_at: new Date().toISOString() }].map((r) => ({ ...r, game_id: game.id })));

  await notifyAdminsOfActivity(admin, {
    studentId: user.id, activity: `Game: ${game.title}`, score: `${correct}/${attempts} correct`,
    percent: attempts ? (correct / attempts) * 100 : null, detail: `${score} points${score > best ? " — a new personal best" : ""}.`,
  });
  // Reward points for the round (capped per day — lib/rewardRules.ts).
  const reward = await awardPoints(admin, {
    studentId: user.id, source: "game", ref: `${game.id}:${Date.now()}`, points: gamePoints({ correct, attempts }), note: game.title,
  }).catch(() => ({ awarded: 0, total: null }));

  return NextResponse.json({
    ok: true, best: Math.max(best, score), newBest: score > best,
    pointsEarned: reward.awarded, pointsTotal: reward.total, ...adventure,
    rating: after.rating, tier: after.tier, ratingChange: before ? after.rating - before.rating : null,
    tierUp: !!before && before.tier !== after.tier && after.rating > before.rating,
  });
}
