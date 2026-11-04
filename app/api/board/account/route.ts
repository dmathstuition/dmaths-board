import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { currentBoardTeacher } from "@/lib/boardAccess";
import { BOARD_PRICE_NGN } from "@/lib/boardPlan";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { limit } from "@/lib/ratelimit";
import { deleteBoardTeacher } from "@/lib/boardDelete";

// The signed-in board teacher's account: subscription state and payments.
//   DELETE { password, confirm: "DELETE" } → delete my account for good (lib/boardDelete.ts)
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

// Delete my own account. The password is checked again (an unlocked laptop
// isn't enough), and the teacher types DELETE.
export async function DELETE(req: Request) {
  const t = await currentBoardTeacher();
  if (!t) return NextResponse.json({ error: "Sign in to your D-Maths Board account." }, { status: 401 });
  if (!(await limit(`account-delete:${t.id}`, 5, 10 * 60_000))) return NextResponse.json({ error: "Too many tries — wait 10 minutes." }, { status: 429 });
  const body = await req.json().catch(() => null);
  if (String(body?.confirm ?? "").trim().toUpperCase() !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
  const password = String(body?.password ?? "");
  if (!password) return NextResponse.json({ error: "Enter your password." }, { status: 400 });
  const check = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await check.auth.signInWithPassword({ email: t.email, password });
  if (error || data?.user?.id !== t.id) return NextResponse.json({ error: "That password isn't right." }, { status: 403 });
  await check.auth.signOut().catch(() => {});
  const r = await deleteBoardTeacher(t.id, t.id, { self: true });
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  await supabaseServer().auth.signOut().catch(() => {}); // clear this browser's sign-in
  return NextResponse.json(r);
}
