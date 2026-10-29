// SERVER ONLY — daily D-Maths Board emails: "your trial ends soon" and
// "renew your month" (a few days before, and the day before). Nothing is ever charged
// automatically; these are the only nudges. Runs from the daily cron.
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { siteBaseUrl } from "@/lib/siteUrl";
import { BOARD_NAME, BOARD_PRICE_NGN, reminderDue, REMIND_EARLY_DAYS } from "@/lib/boardPlan";

const DAY = 86_400_000;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });

export async function sendBoardReminders(admin: SupabaseClient, now = Date.now()): Promise<number> {
  const soon = new Date(now + (REMIND_EARLY_DAYS + 1) * DAY).toISOString(), nowIso = new Date(now).toISOString();
  // Paid months ending within the reminder window, and trials ending within 2 days (unpaid).
  const [{ data: paid, error }, { data: trials }] = await Promise.all([
    admin.from("board_accounts").select("user_id, email_verified_at, trial_ends_at, paid_until, suspended, reminded_14_at, reminded_3_at").gt("paid_until", nowIso).lte("paid_until", soon).limit(1000),
    admin.from("board_accounts").select("user_id, trial_ends_at, paid_until, suspended, reminded_3_at").is("paid_until", null).gt("trial_ends_at", nowIso).lte("trial_ends_at", new Date(now + 2 * DAY).toISOString()).is("reminded_3_at", null).limit(1000),
  ]);
  if (error) return 0; // the board migration isn't in yet
  const due: { userId: string; kind: "early" | "last" | "trial"; until: string }[] = [];
  for (const a of paid ?? []) { const k = reminderDue(a, now); if (k) due.push({ userId: a.user_id, kind: k, until: a.paid_until }); }
  for (const a of trials ?? []) if (!a.suspended) due.push({ userId: a.user_id, kind: "trial", until: a.trial_ends_at });
  if (!due.length) return 0;

  const { data: people } = await admin.from("profiles").select("id, first_name, email").in("id", due.map((d) => d.userId));
  const who = new Map((people ?? []).map((p: any) => [p.id, p]));
  const price = `₦${BOARD_PRICE_NGN.toLocaleString("en-NG")}`;
  let sent = 0;
  for (const d of due) {
    const p = who.get(d.userId);
    if (!p?.email) continue;
    const title = d.kind === "trial" ? `Your ${BOARD_NAME} free trial ends on ${day(d.until)}` : `Your ${BOARD_NAME} subscription ends on ${day(d.until)}`;
    const body = d.kind === "trial"
      ? `Your free trial ends on ${day(d.until)}. Keep your board, lessons and quizzes for ${price} a month — any trial days left are added on. Pay securely with Paystack from the Billing page.`
      : `Your subscription ends on ${day(d.until)}. Renew for ${price} and another month is added to the end of this one — you don't lose any days. We never charge your card automatically.`;
    const ok = await sendEmail("notice", p.email, { firstName: p.first_name ?? "", title, body, loginUrl: `${siteBaseUrl()}/app/billing` }).catch(() => false);
    if (ok === false) continue;
    const field = d.kind === "early" ? "reminded_14_at" : "reminded_3_at";
    await admin.from("board_accounts").update({ [field]: nowIso }).eq("user_id", d.userId);
    sent++;
  }
  return sent;
}
