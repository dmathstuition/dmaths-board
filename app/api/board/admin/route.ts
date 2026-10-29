import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BOARD_MIGRATION_MSG, BOARD_MISSING } from "@/lib/boardAccess";
import { boardAccess } from "@/lib/boardPlan";

// Admin oversight of D-Maths Board: every subscriber, their state and payments.
//   GET → { accounts, revenue }
//   POST { userId, action: "extend" (days) | "suspend" | "unsuspend" }
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function requireAdmin() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return null;
  const { data: p } = await supabaseAdmin().from("profiles").select("role").eq("id", user.id).maybeSingle();
  return p?.role === "admin" ? user.id : null;
}

export async function GET() {
  if (!(await requireAdmin())) return bad("Admins only.", 403);
  const admin = supabaseAdmin();
  const [{ data: accounts, error }, { data: payments }] = await Promise.all([
    admin.from("board_accounts").select("*").order("created_at", { ascending: false }).limit(1000),
    admin.from("board_payments").select("user_id, amount_ngn, paid_at").order("paid_at", { ascending: false }).limit(5000),
  ]);
  if (error) return BOARD_MISSING.test(error.message) ? bad(BOARD_MIGRATION_MSG, 500) : bad(error.message, 500);
  const ids = (accounts ?? []).map((a: any) => a.user_id);
  const { data: people } = ids.length ? await admin.from("profiles").select("id, first_name, last_name, email").in("id", ids) : { data: [] as any[] };
  const who = new Map((people ?? []).map((p: any) => [p.id, p]));
  const paid = new Map<string, number>();
  for (const p of payments ?? []) paid.set(p.user_id, (paid.get(p.user_id) ?? 0) + p.amount_ngn);
  return NextResponse.json({
    revenue: (payments ?? []).reduce((n: number, p: any) => n + p.amount_ngn, 0),
    accounts: (accounts ?? []).map((a: any) => {
      const p = who.get(a.user_id) ?? {};
      return { userId: a.user_id, name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(), email: p.email ?? "", school: a.school, phone: a.phone,
        joined: a.created_at, access: boardAccess(a), paidTotal: paid.get(a.user_id) ?? 0, suspended: a.suspended };
    }),
  });
}

export async function POST(req: Request) {
  const me = await requireAdmin();
  if (!me) return bad("Admins only.", 403);
  const body = await req.json().catch(() => null);
  const userId = String(body?.userId ?? "");
  const admin = supabaseAdmin();
  const { data: a } = await admin.from("board_accounts").select("*").eq("user_id", userId).maybeSingle();
  if (!a) return bad("No D-Maths Board account with that id.", 404);
  const now = Date.now();
  let patch: Record<string, unknown>;
  if (body?.action === "extend") {
    const days = Math.max(1, Math.min(400, Math.round(Number(body?.days) || 30)));
    const from = Math.max(now, a.paid_until ? Date.parse(a.paid_until) : 0);
    patch = { paid_until: new Date(from + days * 86_400_000).toISOString(), email_verified_at: a.email_verified_at ?? new Date(now).toISOString() };
  } else if (body?.action === "suspend" || body?.action === "unsuspend") {
    patch = { suspended: body.action === "suspend" };
  } else return bad("Unknown action.");
  const { error } = await admin.from("board_accounts").update({ ...patch, updated_at: new Date(now).toISOString() }).eq("user_id", userId);
  if (error) return bad(error.message, 500);
  await admin.from("audit_log").insert({ actor_id: me, action: `board_${body.action}`, detail: { userId, ...patch } });
  return NextResponse.json({ ok: true });
}
