// Tell every admin when a learner finishes something that is marked — a game,
// quiz, CBT, mock exam, mental-maths or times-table check, practice, and so on.
//
// Every result goes to the admins' notification bell. Phone (push)
// notifications are capped at one per learner every few minutes, so a learner
// playing round after round doesn't buzz the admin's phone each time — the
// bell still lists every result. Never throws: a score is always saved even if
// telling the admins fails. Server only.
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push/send";
import { rateLimit } from "@/lib/ratelimit";

export type MarkedActivity = {
  studentId: string;
  activity: string;          // e.g. "Times-table speed test", "Game: Fraction Frenzy"
  score?: string;            // e.g. "18/20", "450 points"
  percent?: number | null;   // when it makes sense
  detail?: string;           // anything else worth a glance
};

const PUSH_EVERY_MS = 10 * 60_000;
let adminCache: { ids: string[]; at: number } | null = null;

async function adminIds(db: SupabaseClient): Promise<string[]> {
  if (adminCache && Date.now() - adminCache.at < 5 * 60_000) return adminCache.ids;
  const { data } = await db.from("profiles").select("id").eq("role", "admin");
  adminCache = { ids: (data ?? []).map((a: { id: string }) => a.id), at: Date.now() };
  return adminCache.ids;
}

// "Ada Obi scored 18/20 (90%) in Times-table speed test"
export function activityTitle(name: string, a: Pick<MarkedActivity, "activity" | "score" | "percent">): string {
  const pct = a.percent != null && Number.isFinite(a.percent) ? ` (${Math.round(a.percent)}%)` : "";
  return a.score ? `${name} scored ${a.score}${pct} in ${a.activity}` : `${name} finished ${a.activity}`;
}

export async function notifyAdminsOfActivity(db: SupabaseClient, a: MarkedActivity): Promise<void> {
  try {
    const ids = await adminIds(db);
    if (!ids.length || !a.studentId) return;
    const { data: p } = await db.from("profiles").select("first_name, last_name, role").eq("id", a.studentId).maybeSingle();
    if (p && p.role && p.role !== "student") return; // staff trying things out
    const name = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "A learner" : "A learner";
    const title = `🎯 ${activityTitle(name, a)}`.slice(0, 200);
    const body = a.detail ? a.detail.slice(0, 300) : null;
    const link = `/admin/students/${a.studentId}`;
    await db.from("notifications").insert(ids.map((user_id) => ({ user_id, title, body, link })));
    if (rateLimit(`admin-activity-push:${a.studentId}`, 1, PUSH_EVERY_MS)) {
      await Promise.all(ids.map((id) => sendPush(db, id, { title, body: body ?? undefined, url: link }).catch(() => {})));
    }
  } catch (e) {
    console.warn("admin activity notification failed", e);
  }
}
