// D-Maths Board — the interactive board sold on its own to teachers outside
// the academy. Pure rules (no database): what a subscription allows, renewal
// dates, reminders and account checks. Tested in tests/unit/boardPlan.test.ts.

export const BOARD_NAME = "D-Maths Board";
export const BOARD_PRICE_NGN = 5000;   // per month
export const BOARD_TRIAL_DAYS = 7;
// The D-Maths Board teachers' WhatsApp group: updates, help and complaints.
// Shown when sign-up is complete and sent in the welcome email.
export const BOARD_WHATSAPP_GROUP = "https://chat.whatsapp.com/HpP2Hmvd2jP6zNxV5BoE3Y";
export const BOARD_PERIOD_MONTHS = 1;  // what one payment buys
export const BOARD_PAYMENT_KIND = "dmaths-board"; // Paystack metadata.kind
export const BOARD_HOME = "/app";

const DAY = 86_400_000;
export type BoardAccountRow = {
  email_verified_at: string | null; trial_ends_at: string | null; paid_until: string | null; suspended?: boolean | null;
};
export type BoardState = "unverified" | "trial" | "active" | "expired" | "suspended";
export type BoardAccess = { state: BoardState; until: string | null; daysLeft: number; canUse: boolean };

const time = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0);

// What this account may do right now.
export function boardAccess(a: BoardAccountRow | null, now = Date.now()): BoardAccess {
  if (!a) return { state: "unverified", until: null, daysLeft: 0, canUse: false };
  if (a.suspended) return { state: "suspended", until: null, daysLeft: 0, canUse: false };
  if (!a.email_verified_at) return { state: "unverified", until: null, daysLeft: 0, canUse: false };
  const paid = time(a.paid_until), trial = time(a.trial_ends_at);
  const days = (t: number) => Math.max(0, Math.ceil((t - now) / DAY));
  if (paid > now) return { state: "active", until: a.paid_until, daysLeft: days(paid), canUse: true };
  if (trial > now) return { state: "trial", until: a.trial_ends_at, daysLeft: days(trial), canUse: true };
  const last = Math.max(paid, trial);
  return { state: "expired", until: last ? new Date(last).toISOString() : null, daysLeft: 0, canUse: false };
}

// A month's payment starts when the current access ends (unused trial or paid
// days are never lost), or now if access has already ended.
export function newPaidUntil(a: Pick<BoardAccountRow, "paid_until" | "trial_ends_at"> | null, paidAt = Date.now(), months = BOARD_PERIOD_MONTHS): string {
  const from = new Date(Math.max(paidAt, time(a?.paid_until), time(a?.trial_ends_at)));
  from.setUTCMonth(from.getUTCMonth() + months);
  return from.toISOString();
}

// Is a payment the full price of a period? (Paystack amounts are in kobo.)
export const coversPeriod = (amountKobo: number, currency = "NGN") => currency === "NGN" && amountKobo >= BOARD_PRICE_NGN * 100;
// How many months a payment buys: one per full price paid (so paying more is
// never lost — e.g. an old ₦10,000 checkout gives two months), up to a year.
export const monthsFor = (amountKobo: number) => Math.max(1, Math.min(12, Math.floor(amountKobo / (BOARD_PRICE_NGN * 100))));

// Renewal reminders before a paid month runs out, once each: an early one and
// a last one. (They're recorded in the reminded_14_at / reminded_3_at columns,
// named when the plan was yearly.)
export const REMIND_EARLY_DAYS = 5;
export const REMIND_LAST_DAYS = 1;
export function reminderDue(a: BoardAccountRow & { reminded_14_at?: string | null; reminded_3_at?: string | null }, now = Date.now()): "early" | "last" | null {
  const paid = time(a.paid_until);
  if (!paid || paid <= now || a.suspended) return null;
  const left = (paid - now) / DAY;
  if (left <= REMIND_LAST_DAYS && !(a.reminded_3_at && time(a.reminded_3_at) > paid - (REMIND_LAST_DAYS + 1) * DAY)) return "last";
  if (left <= REMIND_EARLY_DAYS && left > REMIND_LAST_DAYS && !(a.reminded_14_at && time(a.reminded_14_at) > paid - (REMIND_EARLY_DAYS + 1) * DAY)) return "early";
  return null;
}

// ── Account checks ──
const COMMON = ["password", "123456", "qwerty", "letmein", "welcome", "admin", "iloveyou", "dmaths", "teacher", "nigeria"];
export function passwordProblem(pw: string, email = ""): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 128) return "That password is too long.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Use letters and at least one number.";
  const low = pw.toLowerCase(), user = email.split("@")[0]?.toLowerCase() ?? "";
  if (user.length >= 4 && low.includes(user)) return "Don't use your email name in your password.";
  if (COMMON.some((c) => low.includes(c))) return "That password is too easy to guess.";
  return null;
}
export const cleanEmail = (v: unknown) => String(v ?? "").trim().toLowerCase().slice(0, 200);
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e);
export const cleanName = (v: unknown, max = 60) => String(v ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
// A student's display name in a class: letters, numbers, spaces and simple punctuation.
export const cleanGuestName = (v: unknown) => String(v ?? "").replace(/[^\p{L}\p{N} .'\-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 40);
