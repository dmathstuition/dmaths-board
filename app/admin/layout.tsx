import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminNav from "@/components/board/AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s · Admin · D-Maths Board" }, robots: { index: false } };

// Admins only (the middleware checks too).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) redirect("/login");
  const { data: p } = await supabaseAdmin().from("profiles").select("role, first_name, last_name").eq("id", user.id).maybeSingle();
  if (p?.role !== "admin") redirect("/app");
  return (
    <div className="min-h-dvh bg-dmb-paper">
      <AdminNav name={`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()} />
      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-4">{children}</main>
    </div>
  );
}
