// SERVER ONLY — Paystack helpers. Never import in a client component
// (this reads PAYSTACK_SECRET_KEY).
import { SUMMER_CAMP_TIERS, discountedNgn, depositNgn } from "@/lib/summerCamp";

export interface PaystackTxn {
  status: string;
  reference: string;
  amount: number;        // kobo
  currency: string;
  channel?: string;
  paid_at?: string;
  customer?: { email?: string };
  metadata?: { plan?: string; camp?: string; applicationId?: string;[k: string]: any };
}

export function paystackSecret(): string {
  return process.env.PAYSTACK_SECRET_KEY || "";
}

// Expected naira price for a camp package — the DISCOUNTED amount, since that
// is what the customer is charged. Returns 0 for non-camp payments (regular
// enrolments have no fixed server-side price).
export function expectedNgnForPlan(plan?: string | null): number {
  if (!plan) return 0;
  const tier = SUMMER_CAMP_TIERS.find((t) => t.id === plan);
  return tier ? discountedNgn(tier) : 0;
}

// Minimum acceptable payment for a camp package — the 50% deposit, since part
// payment is allowed. Used as the enforcement floor (verify / webhook / approval
// gate). Returns 0 for non-camp payments.
export function depositNgnForPlan(plan?: string | null): number {
  if (!plan) return 0;
  const tier = SUMMER_CAMP_TIERS.find((t) => t.id === plan);
  return tier ? depositNgn(tier) : 0;
}

// Ask Paystack's API whether a reference genuinely succeeded. The secret key
// never leaves the server, so this cannot be spoofed by the browser.
export async function verifyTransaction(
  reference: string,
): Promise<{ ok: boolean; data?: PaystackTxn; error?: string }> {
  const secret = paystackSecret();
  if (!secret) return { ok: false, error: "Payments not configured" };

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" },
  );
  const json = await res.json();

  if (!json.status || json.data?.status !== "success") {
    return { ok: false, error: "Payment not successful", data: json.data };
  }
  return { ok: true, data: json.data as PaystackTxn };
}

// Idempotent upsert into the authoritative ledger. Pass a service-role client.
// `studentId` links the payment to a learner (a portal fee payment) — pass it
// only after validating it's a real student, since it comes from client-set
// Paystack metadata.
export async function recordPayment(admin: any, data: PaystackTxn, studentId?: string | null): Promise<void> {
  const meta = data.metadata || {};
  const row: Record<string, any> = {
    reference: data.reference,
    email: (data.customer?.email ?? "").toLowerCase(),
    amount: (data.amount ?? 0) / 100,
    currency: data.currency ?? "NGN",
    channel: data.channel ?? "",
    plan: meta.plan ?? "",
    camp: meta.camp ?? "",
    status: data.status,
    paid_at: data.paid_at ?? null,
    raw: data as any,
  };
  if (studentId) row.student_id = studentId;

  const { error } = await admin.from("payments").upsert(row, { onConflict: "reference" });
  // Older database without the student_id column — record without the link.
  if (error && /student_id/i.test(error.message)) {
    const { student_id: _omit, ...withoutLink } = row;
    await admin.from("payments").upsert(withoutLink, { onConflict: "reference" });
  }
}

// Confirm a metadata-supplied studentId is actually a learner before trusting
// it to attribute money. Returns the id, or null.
export async function validStudentId(admin: any, id: unknown): Promise<string | null> {
  const studentId = typeof id === "string" ? id.trim() : "";
  if (!studentId) return null;
  const { data } = await admin.from("profiles").select("id, role").eq("id", studentId).maybeSingle();
  return data?.role === "student" ? data.id : null;
}
