import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { currentBoardTeacher } from "@/lib/boardAccess";
import { BOARD_PRICE_NGN } from "@/lib/boardPlan";

// The signed-in board teacher's account: subscription state and payments.
export const dynamic = "force-dynamic";

export async function GET() {
  const t = await currentBoardTeacher();
  if (!t) return NextResponse.json({ error: "Sign in to your D-Maths Board account." }, { status: 401 });
  const { data: payments } = await supabaseAdmin().from("board_payments").select("reference, amount_ngn, paid_at, paid_until").eq("user_id", t.id).order("paid_at", { ascending: false }).limit(20);
  return NextResponse.json({
    name: `${t.firstName} ${t.lastName}`.trim(), firstName: t.firstName, email: t.email, school: t.account.school ?? "",
    access: t.access, verified: !!t.account.email_verified_at, price: BOARD_PRICE_NGN, payments: payments ?? [],
  });
}
