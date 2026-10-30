// SERVER ONLY — the signed-in user's id if they are an admin, else null.
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function requireBoardAdmin(): Promise<string | null> {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return null;
  const { data: p } = await supabaseAdmin().from("profiles").select("role").eq("id", user.id).maybeSingle();
  return p?.role === "admin" ? user.id : null;
}
