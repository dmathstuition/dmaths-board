import { NextResponse } from "next/server";
import { limit } from "@/lib/ratelimit";
import { verifyTransaction } from "@/lib/paystack";
import { applyBoardPayment, currentBoardTeacher } from "@/lib/boardAccess";
import { boardAccess } from "@/lib/boardPlan";

// After Paystack sends the teacher back: ask Paystack (with our secret key)
// whether the payment really succeeded, and only then add the year.
//   POST { reference }
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const t = await currentBoardTeacher();
  if (!t) return bad("Sign in to your D-Maths Board account.", 401);
  if (!(await limit(`board-pay-verify:${t.id}`, 20, 10 * 60_000))) return bad("Too many tries — wait a few minutes.", 429);
  const body = await req.json().catch(() => null);
  const reference = String(body?.reference ?? "").trim();
  if (!/^dmb-[0-9a-f-]{36}$/i.test(reference)) return bad("That isn't a D-Maths Board payment reference.");
  const v = await verifyTransaction(reference);
  if (!v.ok || !v.data) return bad(v.error === "Payments not configured" ? "Payments aren't set up yet." : "Paystack hasn't confirmed this payment (yet). If you were charged, it will show here shortly.", 402);
  if (v.data.metadata?.userId !== t.id) return bad("This payment belongs to a different account.", 403);
  const r = await applyBoardPayment(v.data);
  if (!r.ok) return bad(r.error ?? "We couldn't apply this payment.", 400);
  return NextResponse.json({ ok: true, paidUntil: r.paidUntil, access: boardAccess({ ...t.account, paid_until: r.paidUntil ?? t.account.paid_until }) });
}
