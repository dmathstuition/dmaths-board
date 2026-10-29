import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";
import { findExperiment } from "@/lib/lab/catalog";
import { LAB_MIN_SECONDS, labPoints, labRef } from "@/lib/rewardRules";
import { awardPoints, LEDGER_MISSING } from "@/lib/rewardServer";

// A learner completed an e-lab experiment → reward points: 15 the first time
// they complete that experiment, 3 for a repeat on a later day; one award per
// experiment per day, within the daily e-lab cap. POST { slug, seconds }
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!rateLimit(`lab-complete:${user.id}`, 20, 60_000)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  const b = await req.json().catch(() => null);
  const entry = findExperiment(String(b?.slug ?? ""));
  if (!entry || entry.status === "soon") return NextResponse.json({ error: "Unknown experiment." }, { status: 400 });
  if ((Number(b?.seconds) || 0) < LAB_MIN_SECONDS) {
    return NextResponse.json({ error: "Spend a little longer on the experiment first — try every step." }, { status: 400 });
  }
  const admin = supabaseAdmin();
  const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "student") return NextResponse.json({ error: "Only learners earn points." }, { status: 403 });

  const { data: before, error } = await admin.from("reward_events").select("id").eq("student_id", user.id).eq("source", "lab").like("ref", `${entry.slug}:%`).limit(1);
  if (error) return NextResponse.json({ error: LEDGER_MISSING.test(error.message) ? "Points for experiments are being switched on — check back soon." : error.message }, { status: 503 });
  const first = !before?.length;
  const r = await awardPoints(admin, { studentId: user.id, source: "lab", ref: labRef(entry.slug), points: labPoints(first), note: entry.title });
  return NextResponse.json({
    ok: true, points: r.awarded, total: r.total, first,
    message: r.duplicate ? "You've already earned points for this experiment today — try another one!"
      : r.awarded ? `+${r.awarded} reward points${first ? " for a new experiment" : ""}! 🪙`
      : "You've reached today's e-lab points limit — well done! Come back tomorrow.",
  });
}
