import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { limit } from "@/lib/ratelimit";
import { sendEmail } from "@/lib/email";
import { siteBaseUrl } from "@/lib/siteUrl";
import { currentBoardTeacher, hashSecret, randomCode, sameSecret } from "@/lib/boardAccess";
import { BOARD_NAME, BOARD_TRIAL_DAYS, BOARD_WHATSAPP_GROUP } from "@/lib/boardPlan";

// Confirm a board teacher's email with the 6-digit code (5 tries per code,
// 15 minutes each), or send a new code (at most once a minute).
//   POST { code } | { resend: true }
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const t = await currentBoardTeacher();
  if (!t) return bad("Sign in to your D-Maths Board account first.", 401);
  if (t.account.email_verified_at) return NextResponse.json({ ok: true, verified: true });
  if (!(await limit(`board-verify:${t.id}`, 15, 10 * 60_000))) return bad("Too many tries — wait a few minutes.", 429);
  const body = await req.json().catch(() => null);
  const admin = supabaseAdmin();
  const now = Date.now();

  if (body?.resend) {
    const last = t.account.verify_sent_at ? Date.parse(t.account.verify_sent_at) : 0;
    if (now - last < 60_000) return bad("Wait a minute before asking for another code.", 429);
    const code = randomCode();
    await admin.from("board_accounts").update({
      verify_code_hash: hashSecret(`${t.id}:${code}`), verify_expires_at: new Date(now + 15 * 60_000).toISOString(),
      verify_attempts: 0, verify_sent_at: new Date(now).toISOString(),
    }).eq("user_id", t.id);
    await sendEmail("notice", t.email, {
      firstName: t.firstName, title: `Your ${BOARD_NAME} code: ${code}`,
      body: `Enter this code to confirm your email: ${code}. It expires in 15 minutes.`, loginUrl: `${siteBaseUrl()}/verify`,
    }).catch(() => false);
    return NextResponse.json({ ok: true, sent: true });
  }

  const code = String(body?.code ?? "").replace(/\D/g, "");
  if (code.length !== 6) return bad("Enter the 6-digit code from the email.");
  if ((t.account.verify_attempts ?? 0) >= 5) return bad("Too many wrong codes — send yourself a new one.", 429);
  if (!t.account.verify_expires_at || Date.parse(t.account.verify_expires_at) < now) return bad("That code has expired — send yourself a new one.", 410);
  if (!sameSecret(`${t.id}:${code}`, t.account.verify_code_hash)) {
    await admin.from("board_accounts").update({ verify_attempts: (t.account.verify_attempts ?? 0) + 1 }).eq("user_id", t.id);
    return bad("That code isn't right — check the email and try again.");
  }
  const trialEnds = t.account.trial_ends_at ?? new Date(now + BOARD_TRIAL_DAYS * 86_400_000).toISOString();
  await admin.from("board_accounts").update({
    email_verified_at: new Date(now).toISOString(), trial_ends_at: trialEnds,
    verify_code_hash: null, verify_expires_at: null, verify_attempts: 0, updated_at: new Date(now).toISOString(),
  }).eq("user_id", t.id);
  // Sign-up is complete: the welcome email, with the teachers' WhatsApp group.
  await sendEmail("notice", t.email, {
    firstName: t.firstName, title: `Welcome to ${BOARD_NAME}`,
    body: `Hello ${t.firstName || "teacher"}, your email is confirmed and your ${BOARD_TRIAL_DAYS}-day free trial has started. `
      + `Join the ${BOARD_NAME} WhatsApp group for updates, help and complaints: ${BOARD_WHATSAPP_GROUP}`,
    loginUrl: `${siteBaseUrl()}/app`,
    linkUrl: BOARD_WHATSAPP_GROUP, linkText: "Join the WhatsApp group →",
  }).catch(() => false);
  return NextResponse.json({ ok: true, verified: true, trialEnds, whatsapp: BOARD_WHATSAPP_GROUP });
}
