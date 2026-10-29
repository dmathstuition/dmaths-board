import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { clientKey, limit } from "@/lib/ratelimit";
import { BOARD_MIGRATION_MSG, BOARD_MISSING, GUEST_COOKIE, GUEST_COOKIE_OPTIONS, guestCookieValue, hashSecret, randomToken, readGuestPass, sameSecret } from "@/lib/boardAccess";
import { cleanGuestName } from "@/lib/boardPlan";
import { cleanCode, isOpen } from "@/lib/liveSession";
import { cleanContact } from "@/lib/classReport";

// A student joins a D-Maths Board class with the PIN and their name — no
// account. They get a secret pass for this one class (an httpOnly cookie that
// scripts can't read; only its hash is stored), good for 12 hours.
//   POST { code, name, parent? } → { id }   (parent: optional email / WhatsApp for class reports)
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const MAX_GUESTS = 300;

export async function POST(req: Request) {
  if (!(await limit(clientKey(req, "board-join"), 15, 60_000))) return bad("Too many tries — wait a minute.", 429);
  const body = await req.json().catch(() => null);
  const code = cleanCode(body?.code);
  const name = cleanGuestName(body?.name);
  if (!code) return bad("Enter the 6-digit class PIN from your teacher.");
  if (name.length < 2) return bad("Enter your name so your teacher knows who you are.");
  const parentRaw = String(body?.parent ?? "").trim();
  const parent = cleanContact(parentRaw);
  if (parentRaw && !parent) return bad("Check the parent's email or WhatsApp number — or leave it empty.");
  const admin = supabaseAdmin();
  const { data: s, error } = await admin.from("live_sessions").select("id, status, created_at, kind").eq("code", code).eq("status", "live").maybeSingle();
  if (error) return BOARD_MISSING.test(error.message) ? bad(BOARD_MIGRATION_MSG, 500) : bad("Something went wrong — try again.", 500);
  if (!s || s.kind !== "board" || !isOpen(s)) return bad("No live class with that PIN. Check the number with your teacher.", 404);

  // Coming back on the same device: keep the same seat (and name change, if any).
  const pass = readGuestPass();
  if (pass?.sessionId === s.id) {
    const { data: g } = await admin.from("live_session_guests").select("id, token_hash, removed").eq("id", pass.guestId).eq("session_id", s.id).maybeSingle();
    if (g && sameSecret(pass.token, g.token_hash)) {
      if (g.removed) return bad("Your teacher removed you from this class.", 403);
      await admin.from("live_session_guests").update({ name, last_seen: new Date().toISOString() }).eq("id", g.id);
      if (parent) await admin.from("live_session_guests").update({ parent_contact: parent.value }).eq("id", g.id); // fine if the column isn't there yet
      return NextResponse.json({ id: s.id });
    }
  }
  const { count } = await admin.from("live_session_guests").select("id", { count: "exact", head: true }).eq("session_id", s.id);
  if ((count ?? 0) >= MAX_GUESTS) return bad("This class is full.", 409);
  const token = randomToken();
  const row: Record<string, unknown> = { session_id: s.id, name, token_hash: hashSecret(token) };
  let { data: g, error: insErr } = await admin.from("live_session_guests").insert(parent ? { ...row, parent_contact: parent.value } : row).select("id").single();
  // Before migration-class-reports.sql there's nowhere to keep the parent's contact: join without it.
  if (insErr && parent && /parent_contact/i.test(insErr.message)) ({ data: g, error: insErr } = await admin.from("live_session_guests").insert(row).select("id").single());
  if (insErr || !g) return bad("We couldn't add you to the class — try again.", 500);
  cookies().set(GUEST_COOKIE, guestCookieValue({ sessionId: s.id, guestId: g.id, token }), GUEST_COOKIE_OPTIONS);
  return NextResponse.json({ id: s.id });
}
