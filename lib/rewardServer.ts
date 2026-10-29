import type { SupabaseClient } from "@supabase/supabase-js";
import { watDay } from "@/lib/dailyReward";
import { capAward, REWARD_RULES, type RewardSource } from "@/lib/rewardRules";

// Award reward points once per (learner, source, ref), within the source's
// daily cap, and add them to profiles.reward_points. Needs
// migration-reward-points.sql; until then nothing is awarded (so games and
// labs can't be farmed without the ledger) and `setup` says so.
export const LEDGER_MISSING = /reward_events/i;

export type Award = { awarded: number; total: number | null; setup?: boolean; duplicate?: boolean };

export async function addPoints(admin: SupabaseClient, studentId: string, points: number): Promise<number | null> {
  const rpc = await admin.rpc("add_reward_points", { p_student: studentId, p_points: points });
  if (!rpc.error && rpc.data !== null && rpc.data !== undefined) return Number(rpc.data);
  // Before the migration: read and write back.
  const { data: me } = await admin.from("profiles").select("reward_points").eq("id", studentId).maybeSingle();
  const total = Number(me?.reward_points ?? 0) + points;
  await admin.from("profiles").update({ reward_points: total }).eq("id", studentId);
  return total;
}

export async function awardPoints(admin: SupabaseClient, a: {
  studentId: string; source: RewardSource; ref: string; points: number; note?: string;
}): Promise<Award> {
  let points = Math.floor(a.points);
  if (points <= 0) return { awarded: 0, total: null };
  const day = watDay();
  const cap = a.source === "daily" ? Infinity : REWARD_RULES[a.source].dailyCap;
  if (Number.isFinite(cap)) {
    const { data: today, error } = await admin.from("reward_events").select("points").eq("student_id", a.studentId).eq("source", a.source).eq("day", day);
    if (error) return { awarded: 0, total: null, setup: LEDGER_MISSING.test(error.message) };
    points = capAward(points, (today ?? []).reduce((s: number, r: any) => s + Number(r.points), 0), cap);
    if (points <= 0) return { awarded: 0, total: null };
  }
  const { error } = await admin.from("reward_events").insert({ student_id: a.studentId, source: a.source, ref: a.ref.slice(0, 120), day, points, note: (a.note ?? "").slice(0, 120) });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { awarded: 0, total: null, duplicate: true };
    return { awarded: 0, total: null, setup: LEDGER_MISSING.test(error.message) };
  }
  const total = await addPoints(admin, a.studentId, points);
  return { awarded: points, total };
}
