import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { clientKey, limit } from "@/lib/ratelimit";
import { sendEmail } from "@/lib/email";
import { siteBaseUrl } from "@/lib/siteUrl";
import { BOARD_MIGRATION_MSG, BOARD_MISSING, hashSecret, randomCode } from "@/lib/boardAccess";
import { BOARD_NAME, cleanEmail, cleanName, passwordProblem, validEmail } from "@/lib/boardPlan";

// D-Maths Board sign-up (public). Creates a board_teacher account — which can't
// open any academy portal — and emails a 6-digit code to prove the address.
// The 7-day trial starts once the code is entered.
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  if (!(await limit(clientKey(req, "board-signup"), 5, 10 * 60_000))) return bad("Too many sign-ups from here — try again in a few minutes.", 429);
  const body = await req.json().catch(() => null);
  if (body?.website) return NextResponse.json({ ok: true }); // a bot filled the hidden field
  const firstName = cleanName(body?.firstName), lastName = cleanName(body?.lastName);
  const email = cleanEmail(body?.email), password = String(body?.password ?? "");
  const school = cleanName(body?.school, 120), phone = String(body?.phone ?? "").replace(/[^\d+ ]/g, "").slice(0, 20);
  if (!firstName || !lastName) return bad("Enter your first and last name.");
  if (!validEmail(email)) return bad("Enter a valid email address.");
  const weak = passwordProblem(password, email);
  if (weak) return bad(weak);
  if (body?.agree !== true) return bad("Please accept the terms to continue.");

  const admin = supabaseAdmin();
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    // app_metadata can only be set by the server: middleware uses it to keep board accounts to the board.
    app_metadata: { product: "dmaths-board" }, user_metadata: { product: "dmaths-board", first_name: firstName, last_name: lastName },
  });
  if (authErr || !created?.user) {
    return /already|registered|exists/i.test(authErr?.message ?? "")
      ? bad("An account with this email already exists — sign in instead.", 409)
      : bad("We couldn't create your account just now. Please try again.", 500);
  }
  const userId = created.user.id;
  const code = randomCode(), now = new Date();
  const { error: profErr } = await admin.from("profiles").insert({
    id: userId, role: "board_teacher", first_name: firstName, last_name: lastName, email, phone, is_active: true,
  });
  const { error: accErr } = profErr ? { error: null } : await admin.from("board_accounts").insert({
    user_id: userId, school, phone, verify_code_hash: hashSecret(`${userId}:${code}`),
    verify_expires_at: new Date(now.getTime() + 15 * 60_000).toISOString(), verify_sent_at: now.toISOString(),
  });
  if (profErr || accErr) {
    await admin.auth.admin.deleteUser(userId).catch(() => {}); // don't leave a half-made account behind
    const msg = (profErr ?? accErr)?.message ?? "";
    return BOARD_MISSING.test(msg) ? bad(BOARD_MIGRATION_MSG, 500) : bad("We couldn't create your account just now. Please try again.", 500);
  }
  await sendEmail("notice", email, {
    firstName, title: `Your ${BOARD_NAME} code: ${code}`,
    body: `Welcome to ${BOARD_NAME}! Enter this code to confirm your email and start your 7-day free trial: ${code}. It expires in 15 minutes. If you didn't sign up, ignore this email.`,
    loginUrl: `${siteBaseUrl()}/verify`,
  }).catch(() => false);
  await admin.from("audit_log").insert({ actor_id: userId, action: "board_signup", detail: { school } });
  return NextResponse.json({ ok: true });
}
