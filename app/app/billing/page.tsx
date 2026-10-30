import { Suspense } from "react";
import Link from "next/link";
import BoardBilling from "@/components/board/BoardBilling";
import { boardPage } from "@/lib/boardPages";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BOARD_PRICE_NGN } from "@/lib/boardPlan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Billing" };

export default async function BoardBillingPage() {
  const t = await boardPage({ billing: true });
  if (t.isAdmin) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dmb-rule bg-dmb-sheet p-6">
        <h1 className="font-dmbDisplay text-2xl font-bold text-dmb-ink">You&apos;re signed in as an admin</h1>
        <p className="mt-2 text-dmb-muted">Admins use D-Maths Board free — there&apos;s nothing to pay. Teachers&apos; subscriptions, payments and revenue are on the subscribers page.</p>
        <Link href="/admin" className="dmb-btn mt-5">Open the admin dashboard</Link>
      </div>
    );
  }
  const { data: payments } = await supabaseAdmin().from("board_payments").select("reference, amount_ngn, paid_at, paid_until").eq("user_id", t.id).order("paid_at", { ascending: false }).limit(20);
  return (
    <Suspense fallback={<div className="card mx-auto h-64 max-w-3xl animate-pulse" />}>
      <BoardBilling access={t.access} price={BOARD_PRICE_NGN} payments={payments ?? []} />
    </Suspense>
  );
}
