// SERVER ONLY — who may use the D-Maths Board app pages (/app/...):
// board teachers, and academy admins (to run board classes and see what
// teachers see — no subscription needed).
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { currentBoardTeacher, type BoardTeacher } from "@/lib/boardAccess";

export type BoardViewer = BoardTeacher & { isAdmin: boolean };

export async function currentBoardViewer(): Promise<BoardViewer | null> {
  const t = await currentBoardTeacher();
  if (t) return { ...t, isAdmin: false };
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return null;
  const { data: p } = await supabaseAdmin().from("profiles").select("role, first_name, last_name, email").eq("id", user.id).maybeSingle();
  if (p?.role !== "admin") return null;
  return {
    id: user.id, email: p.email ?? user.email ?? "", firstName: p.first_name ?? "", lastName: p.last_name ?? "", isAdmin: true,
    account: { email_verified_at: new Date().toISOString(), trial_ends_at: null, paid_until: null },
    access: { state: "active", until: null, daysLeft: 365, canUse: true },
  };
}

// The viewer, or a redirect: to sign in, to confirm their email, or (unless
// `billing`) to the billing page once a teacher's trial or year is over.
export async function boardPage(opts: { billing?: boolean } = {}): Promise<BoardViewer> {
  const t = await currentBoardViewer();
  if (!t) redirect("/login");
  if (t.access.state === "unverified") redirect("/verify");
  if (!t.access.canUse && !opts.billing) redirect("/app/billing");
  return t;
}
