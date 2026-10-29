import { NextResponse } from "next/server";
import crypto from "crypto";
import { limit } from "@/lib/ratelimit";
import { siteBaseUrl } from "@/lib/siteUrl";
import { paystackSecret } from "@/lib/paystack";
import { currentBoardTeacher } from "@/lib/boardAccess";
import { BOARD_NAME, BOARD_PAYMENT_KIND, BOARD_PRICE_NGN } from "@/lib/boardPlan";

// Start a monthly payment (BOARD_PRICE_NGN). The amount, who it's for and where Paystack
// returns to are all set here on the server — the browser only gets the
// Paystack checkout link. Access is added only after Paystack confirms it
// (POST /api/board/pay/verify, or the signed webhook).
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST() {
  const t = await currentBoardTeacher();
  if (!t) return bad("Sign in to your D-Maths Board account.", 401);
  if (!t.account.email_verified_at) return bad("Confirm your email first.", 403);
  if (t.access.state === "suspended") return bad("This account is on hold — contact support@dmaths.academy.", 403);
  if (!(await limit(`board-pay:${t.id}`, 6, 10 * 60_000))) return bad("Too many tries — wait a few minutes.", 429);
  const secret = paystackSecret();
  if (!secret) return bad("Payments aren't set up yet — contact support@dmaths.academy.", 503);
  const reference = `dmb-${crypto.randomUUID()}`;
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: t.email, amount: BOARD_PRICE_NGN * 100, currency: "NGN", reference,
      callback_url: `${siteBaseUrl()}/app/billing`,
      metadata: { kind: BOARD_PAYMENT_KIND, userId: t.id, custom_fields: [{ display_name: "Product", variable_name: "product", value: `${BOARD_NAME} — 1 year` }] },
    }),
  }).catch(() => null);
  const j = res ? await res.json().catch(() => null) : null;
  if (!j?.status || !j.data?.authorization_url) return bad("We couldn't reach Paystack — please try again.", 502);
  return NextResponse.json({ url: j.data.authorization_url, reference });
}
