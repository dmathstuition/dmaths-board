// SERVER ONLY — D-Maths Board accounts, access checks, payments and guest passes.
import crypto from "crypto";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { boardAccess, coversPeriod, monthsFor, newPaidUntil, BOARD_PAYMENT_KIND, BOARD_PRICE_NGN, type BoardAccess, type BoardAccountRow } from "@/lib/boardPlan";
import type { PaystackTxn } from "@/lib/paystack";

export const BOARD_MISSING = /board_accounts|board_payments|live_session_guests|board_teacher|column .*kind/i;
export const BOARD_MIGRATION_MSG = "D-Maths Board needs migration-dmaths-board.sql — run it in Supabase.";

// One-way hash for secrets we must check but never store (email codes, guest passes).
function pepper() { return process.env.BOARD_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dmaths-board"; }
export const hashSecret = (value: string) => crypto.createHmac("sha256", pepper()).update(value).digest("hex");
export function sameSecret(value: string, hash: string | null | undefined): boolean {
  if (!hash) return false;
  const a = Buffer.from(hashSecret(value)), b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export const randomToken = () => crypto.randomBytes(32).toString("base64url");
export const randomCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

export type BoardTeacher = { id: string; email: string; firstName: string; lastName: string; account: BoardAccountRow & Record<string, any>; access: BoardAccess };

// The signed-in board teacher (any subscription state), or null.
export async function currentBoardTeacher(): Promise<BoardTeacher | null> {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return null;
  const admin = supabaseAdmin();
  const { data: p } = await admin.from("profiles").select("role, first_name, last_name, email, is_active").eq("id", user.id).maybeSingle();
  if (!p || p.role !== "board_teacher" || p.is_active === false) return null;
  const { data: account } = await admin.from("board_accounts").select("*").eq("user_id", user.id).maybeSingle();
  const row = (account ?? { email_verified_at: null, trial_ends_at: null, paid_until: null }) as BoardAccountRow & Record<string, any>;
  return { id: user.id, email: p.email ?? user.email ?? "", firstName: p.first_name ?? "", lastName: p.last_name ?? "", account: row, access: boardAccess(row) };
}

// Who may use the board tools (lesson library, quiz library, slides):
// academy staff, or a board teacher whose trial or paid month is running.
export type BoardUser = { id: string; role: "admin" | "tutor" | "board_teacher" };
export async function requireBoardOrStaff(): Promise<BoardUser | null> {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return null;
  const admin = supabaseAdmin();
  const { data: p } = await admin.from("profiles").select("role, is_active").eq("id", user.id).maybeSingle();
  if (p?.role === "admin" || p?.role === "tutor") return { id: user.id, role: p.role };
  if (p?.role !== "board_teacher" || p.is_active === false) return null;
  const { data: account } = await admin.from("board_accounts").select("email_verified_at, trial_ends_at, paid_until, suspended").eq("user_id", user.id).maybeSingle();
  return boardAccess(account as BoardAccountRow | null).canUse ? { id: user.id, role: "board_teacher" } : null;
}
export async function boardTeacherCanUse(userId: string): Promise<boolean> {
  const { data: account } = await supabaseAdmin().from("board_accounts").select("email_verified_at, trial_ends_at, paid_until, suspended").eq("user_id", userId).maybeSingle();
  return boardAccess(account as BoardAccountRow | null).canUse;
}

// Record a confirmed monthly payment (BOARD_PRICE_NGN) and add a month — once per Paystack
// reference, however many times it's reported (browser return + webhook).
export async function applyBoardPayment(data: PaystackTxn): Promise<{ ok: boolean; paidUntil?: string; error?: string }> {
  const meta = data.metadata ?? {};
  if (meta.kind !== BOARD_PAYMENT_KIND || typeof meta.userId !== "string") return { ok: false, error: "Not a D-Maths Board payment." };
  if (data.status !== "success" || !coversPeriod(data.amount ?? 0, data.currency ?? "NGN")) return { ok: false, error: `The payment wasn't the full ₦${BOARD_PRICE_NGN.toLocaleString("en-NG")}.` };
  const admin = supabaseAdmin();
  const { data: done } = await admin.from("board_payments").select("paid_until").eq("reference", data.reference).maybeSingle();
  if (done) return { ok: true, paidUntil: done.paid_until };
  const { data: prof } = await admin.from("profiles").select("role").eq("id", meta.userId).maybeSingle();
  if (prof?.role !== "board_teacher") return { ok: false, error: "That account isn't a D-Maths Board account." };
  const { data: account } = await admin.from("board_accounts").select("paid_until, trial_ends_at").eq("user_id", meta.userId).maybeSingle();
  const paidAt = data.paid_at ? Date.parse(data.paid_at) || Date.now() : Date.now();
  const paidUntil = newPaidUntil(account, Math.min(paidAt, Date.now()), monthsFor(data.amount ?? 0));
  // The reference is the primary key: if two reports race, only one gets in and extends the subscription.
  const { error } = await admin.from("board_payments").insert({
    reference: data.reference, user_id: meta.userId, amount_ngn: Math.round((data.amount ?? 0) / 100), channel: data.channel ?? null,
    paid_at: new Date(paidAt).toISOString(), paid_until: paidUntil,
  });
  if (error) {
    if (error.code === "23505") {
      const { data: again } = await admin.from("board_payments").select("paid_until").eq("reference", data.reference).maybeSingle();
      return { ok: true, paidUntil: again?.paid_until };
    }
    return { ok: false, error: error.message };
  }
  await admin.from("board_accounts").update({ paid_until: paidUntil, reminded_14_at: null, reminded_3_at: null, updated_at: new Date().toISOString() }).eq("user_id", meta.userId);
  await admin.from("audit_log").insert({ actor_id: meta.userId, action: "board_payment", detail: { reference: data.reference, amount: (data.amount ?? 0) / 100, paidUntil } });
  return { ok: true, paidUntil };
}

// ── Guest passes for students in a board class ──
export const GUEST_COOKIE = "dmb_guest";
export type GuestPass = { sessionId: string; guestId: string; token: string };
export function readGuestPass(): GuestPass | null {
  try {
    const raw = cookies().get(GUEST_COOKIE)?.value ?? "";
    const [sessionId, guestId, token] = raw.split(".");
    if (!/^[0-9a-f-]{36}$/i.test(sessionId ?? "") || !/^[0-9a-f-]{36}$/i.test(guestId ?? "") || !token || token.length < 30) return null;
    return { sessionId, guestId, token };
  } catch { return null; }
}
export const guestCookieValue = (p: GuestPass) => `${p.sessionId}.${p.guestId}.${p.token}`;
export const GUEST_COOKIE_OPTIONS = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 12 * 3600 };
