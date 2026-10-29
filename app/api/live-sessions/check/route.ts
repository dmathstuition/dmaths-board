import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/sessionAccess";
import { clientKey, rateLimit } from "@/lib/ratelimit";

// For the "Check my class" page (/check).
//   GET  → is the server answering, and are the database updates the live
//          classes need in place (each one named so the owner can run it)?
//   POST { action: "upload" } → a teacher gets one signed slot to upload a tiny
//          test picture, proving slides can be stored. Old test pictures are
//          cleared each time.
export const dynamic = "force-dynamic";
const TEACHERS = new Set(["admin", "tutor", "board_teacher"]);

async function tableReady(table: string) {
  const { error } = await supabaseAdmin().from(table).select("*", { head: true, count: "exact" }).limit(1);
  return !error;
}

export async function GET(req: Request) {
  if (!rateLimit(clientKey(req, "live-check"), 20, 60_000)) return NextResponse.json({ error: "Wait a minute." }, { status: 429 });
  const [sessions, guests, lessons, inbox, marks] = await Promise.all([
    tableReady("live_sessions"), tableReady("live_session_guests"), tableReady("board_lessons"), tableReady("live_board_inbox"), tableReady("live_class_marks"),
  ]);
  return NextResponse.json({
    ok: true, now: Date.now(),
    database: [
      { name: "Interactive classes", file: "migration-live-sessions.sql", ready: sessions },
      { name: "Lesson library", file: "migration-board-lessons.sql", ready: lessons },
      { name: "D-Maths Board (guests & payments)", file: "migration-dmaths-board.sql", ready: guests },
      { name: "Backup route for writing", file: "migration-board-inbox.sql", ready: inbox },
      { name: "Class-work marks and results", file: "migration-class-marks.sql", ready: marks },
    ],
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const me = await currentUser().catch(() => null);
  if (!me || !TEACHERS.has(me.role)) return NextResponse.json({ error: "Sign in as a teacher to test uploads." }, { status: 403 });
  if (!rateLimit(`live-check-upload:${me.id}`, 6, 60 * 60_000)) return NextResponse.json({ error: "Try again later." }, { status: 429 });
  const store = supabaseAdmin().storage.from("materials");
  const { data: old } = await store.list("slides/_check", { limit: 100 });
  if (old?.length) await store.remove(old.map((f) => `slides/_check/${f.name}`)).catch(() => {});
  const path = `slides/_check/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { data, error } = await store.createSignedUploadUrl(path);
  if (error || !data?.token) return NextResponse.json({ error: `Storage refused: ${error?.message ?? "no ticket"}` }, { status: 500 });
  return NextResponse.json({ path, token: data.token, url: store.getPublicUrl(path).data.publicUrl });
}
