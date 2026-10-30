import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireBoardAdmin } from "@/lib/boardAdmin";
import { buildBoardStats } from "@/lib/boardStats";

// GET → the admin dashboard's numbers (lib/boardStats.ts). Admins only.
export const dynamic = "force-dynamic";
const YEAR = 400 * 86_400_000;

export async function GET() {
  if (!(await requireBoardAdmin())) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const db = supabaseAdmin();
  const since = new Date(Date.now() - YEAR).toISOString();
  const [accounts, payments, sessions, lessons] = await Promise.all([
    db.from("board_accounts").select("user_id, created_at, email_verified_at, trial_ends_at, paid_until, suspended, school").limit(5000),
    db.from("board_payments").select("user_id, amount_ngn, paid_at").limit(20000),
    db.from("live_sessions").select("id, host_id, created_at, ended_at, status, title").gte("created_at", since).order("created_at", { ascending: false }).limit(10000),
    db.from("board_lessons").select("owner_id, created_at").limit(20000),
  ]);
  const failed = [accounts, payments, sessions, lessons].find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });

  const ids = (accounts.data ?? []).map((a) => a.user_id);
  const sessionIds = (sessions.data ?? []).map((s) => s.id);
  const chunks = <T,>(xs: T[], n = 300) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
  const [people, guests, quizzes] = await Promise.all([
    Promise.all(chunks(ids).map((c) => db.from("profiles").select("id, first_name, last_name, email").in("id", c))),
    Promise.all(chunks(sessionIds).map((c) => db.from("live_session_guests").select("session_id, joined_at").in("session_id", c).limit(50000))),
    db.from("live_quizzes").select("session_id, created_at").gte("created_at", since).limit(20000),
  ]);

  const stats = buildBoardStats({
    accounts: accounts.data ?? [],
    people: people.flatMap((r) => r.data ?? []),
    payments: payments.data ?? [],
    sessions: sessions.data ?? [],
    guests: guests.flatMap((r) => r.data ?? []),
    quizzes: quizzes.data ?? [],
    lessons: lessons.data ?? [],
  });
  return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
}
